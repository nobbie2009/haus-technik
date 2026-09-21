#!/usr/bin/python3
"""Home-Technik release installer; invoked through /usr/local/bin/Update inside LXC."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.request
import getpass
import secrets

ROOT = Path('/var/www/home-technik')
STATE = Path('/var/lib/home-technik')
REPO = 'https://github.com/nobbie2009/haus-technik'
API = 'https://api.github.com/repos/nobbie2009/haus-technik/releases/latest'


def version(value):
    if not isinstance(value, str) or not re.fullmatch(r'(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)', value):
        raise ValueError('Ungültige Versionsnummer')
    return tuple(map(int, value.split('.')))


def download(url, limit):
    request = urllib.request.Request(url, headers={'User-Agent': 'Home-Technik-Updater'})
    with urllib.request.urlopen(request, timeout=45) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Download überschreitet Größenlimit')
    return data


def latest():
    data = json.loads(download(API, 2_000_000))
    tag = data.get('tag_name', '')
    if not tag.startswith('v') or data.get('draft') or data.get('prerelease'):
        raise ValueError('Kein stabiles Release')
    number = tag[1:]
    version(number)
    name = f'home-technik-{number}.tar.gz'
    expected = f'{REPO}/releases/download/{tag}/{name}'
    assets = {a['name']: a['browser_download_url'] for a in data.get('assets', [])}
    if assets.get(name) != expected or assets.get(name + '.sha256') != expected + '.sha256':
        raise ValueError('Release besitzt noch kein vollständiges Installationspaket')
    return number, expected


def extract_verified(archive, checksum, dest):
    parts = checksum.decode('ascii').split()
    if not parts or not re.fullmatch('[0-9a-f]{64}', parts[0]):
        raise ValueError('Ungültige SHA-256-Datei')
    if hashlib.sha256(archive).hexdigest() != parts[0]:
        raise ValueError('SHA-256 stimmt nicht überein; Installation abgebrochen')
    import io
    with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as tar:
        members = tar.getmembers()
        if sum(m.size for m in members) > 150_000_000:
            raise ValueError('Archiv zu groß')
        for member in members:
            path = Path(member.name)
            if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] not in ('dist', 'deploy'):
                raise ValueError('Unzulässiger Archivpfad')
            if not (member.isfile() or member.isdir()):
                raise ValueError('Links und Sonderdateien im Archiv nicht erlaubt')
        # All paths/types checked before writing anything; no ownership from archive.
        for member in members:
            target = dest / member.name
            if member.isdir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                with tar.extractfile(member) as source, target.open('wb') as out:
                    shutil.copyfileobj(source, out)
                target.chmod(0o644)
        # The API service uses umask 0077; Nginx still needs directory traversal.
        for directory in dest.rglob('*'):
            if directory.is_dir():
                directory.chmod(0o755)


def run(*args):
    subprocess.run(args, check=True)


def same_tree(a, b):
    def files(root):
        result = {}
        for path in root.rglob('*'):
            if path.is_symlink():
                raise ValueError('Unerwarteter Symlink im Release')
            if path.is_file():
                result[str(path.relative_to(root))] = hashlib.sha256(path.read_bytes()).hexdigest()
        return result
    return files(a) == files(b)


def active():
    link = ROOT / 'current'
    if link.exists() and not link.is_symlink():
        raise ValueError('current ist kein verwalteter Symlink')
    if not link.is_symlink():
        return None
    path = link.resolve(strict=True)
    if path.parent != (ROOT / 'releases').resolve():
        raise ValueError('Release außerhalb des verwalteten Verzeichnisses')
    return path


def switch(target):
    temp = ROOT / '.current-next'
    if temp.exists() or temp.is_symlink():
        raise ValueError('Unvollständiger Linkwechsel vorhanden; .current-next prüfen')
    temp.symlink_to(target)
    os.replace(temp, ROOT / 'current')


def activate(target):
    previous = active()
    run('nginx', '-t')
    switch(target)
    try:
        run('systemctl', 'enable', '--now', 'nginx')
        run('systemctl', 'reload', 'nginx')
        served = download('http://127.0.0.1/version.json', 4096)
        if json.loads(served) != json.loads((target / 'version.json').read_text()):
            raise ValueError('HTTP-Prüfung liefert nicht das neue Release')
    except Exception:
        if previous:
            switch(previous)
            run('systemctl', 'reload', 'nginx')
        else:
            (ROOT / 'current').unlink()
        raise
    if previous:
        (STATE / 'previous').write_text(previous.name)


def setup_web():
    cache = Path('/opt/home-technik')
    config = Path('/etc/nginx/sites-available/home-technik')
    if not config.is_file() or not (cache / 'home-technik.conf').is_file():
        raise ValueError('Zuerst mit Update das aktuelle Release installieren; verwaltete Nginx-Site erforderlich')
    print('Richtet den lokalen Update-Dienst ein und ersetzt die Home-Technik-Nginx-Site durch die aktuelle Vorlage.')
    if input('Fortfahren? [ja/NEIN] ') != 'ja':
        return
    auth = STATE / 'update-auth.json'
    if not auth.exists():
        password = getpass.getpass('Neues Update-Passwort (mindestens 12 Zeichen): ')
        if not 12 <= len(password) <= 1024 or password != getpass.getpass('Passwort wiederholen: '):
            raise ValueError('Passwörter stimmen nicht überein oder Länge ungültig')
        salt = secrets.token_bytes(32)
        value = {'salt': salt.hex(), 'hash': hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 600000).hex()}
        fd = os.open(auth, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream)
    backup = config.read_bytes()
    config.with_name('home-technik.before-web-' + str(time.time_ns())).write_bytes(backup)
    try:
        shutil.copyfile(cache / 'home-technik.conf', config)
        run('nginx', '-t')
    except Exception:
        config.write_bytes(backup)
        raise
    shutil.copyfile(cache / 'home-technik-update.service', '/etc/systemd/system/home-technik-update.service')
    run('systemctl', 'daemon-reload')
    run('systemctl', 'enable', '--now', 'home-technik-update.service')
    run('systemctl', 'reload', 'nginx')
    print('Direkte Updates sind eingerichtet. In der App die Versionsanzeige öffnen.')


def ensure_project_assets(cache):
    names = ('project_api.py', 'home-technik-projects.service')
    if all((cache / name).is_file() for name in names):
        return
    # Older updaters copy only their known deployment files. Fetch the exact
    # installed release, without a latest-API lookup, on first-time migration.
    current = active()
    if not current:
        raise ValueError('Zuerst das aktuelle Release mit Update installieren.')
    number = json.loads((current / 'version.json').read_text())['version']
    if version(number) < (0, 48, 0):
        raise ValueError('Der Projektdienst benötigt mindestens Version 0.48.0.')
    url = f'{REPO}/releases/download/v{number}/home-technik-{number}.tar.gz'
    with tempfile.TemporaryDirectory(prefix='home-technik-projects-') as tmp:
        staged = Path(tmp)
        extract_verified(download(url, 60_000_000), download(url + '.sha256', 1024), staged)
        if json.loads((staged / 'dist/version.json').read_text()).get('version') != number:
            raise ValueError('Projektdienst-Paket passt nicht zur installierten Version.')
        if not all((staged / 'deploy' / name).is_file() for name in names):
            raise ValueError('Projektdienst-Dateien fehlen im Release.')
        for name in names:
            shutil.copyfile(staged / 'deploy' / name, cache / name)
            (cache / name).chmod(0o644)


def setup_projects(reset_key=False):
    import pwd
    cache = Path('/opt/home-technik')
    config = Path('/etc/nginx/sites-available/home-technik')
    if not config.is_file():
        raise ValueError('Zuerst das aktuelle Release mit Update installieren.')
    ensure_project_assets(cache)
    try:
        account = pwd.getpwnam('home-technik-projects')
    except KeyError:
        run('useradd', '--system', '--user-group', '--no-create-home', '--shell', '/usr/sbin/nologin', 'home-technik-projects')
        account = pwd.getpwnam('home-technik-projects')
    data = Path('/var/lib/home-technik-projects')
    data.mkdir(mode=0o700, exist_ok=True)
    data.chmod(0o700)
    os.chown(data, account.pw_uid, account.pw_gid)
    auth = data / 'auth.json'
    if not auth.exists() or reset_key:
        key = secrets.token_urlsafe(32)
        auth.write_text(json.dumps({'tokenHash': hashlib.sha256(key.encode()).hexdigest()}))
        auth.chmod(0o600)
        os.chown(auth, account.pw_uid, account.pw_gid)
        print('Projektdienst-Zugriffsschlüssel (jetzt sicher aufbewahren): ' + key)
    backup = config.read_bytes()
    config.with_name('home-technik.before-projects-' + str(time.time_ns())).write_bytes(backup)
    try:
        shutil.copyfile(cache / 'home-technik.conf', config)
        run('nginx', '-t')
    except Exception:
        config.write_bytes(backup)
        raise
    shutil.copyfile(cache / 'home-technik-projects.service', '/etc/systemd/system/home-technik-projects.service')
    run('systemctl', 'daemon-reload')
    (cache / 'project_api.py').chmod(0o644)
    run('systemctl', 'enable', 'home-technik-projects.service')
    run('systemctl', 'restart', 'home-technik-projects.service')
    run('systemctl', 'reload', 'nginx')
    print('Projektdienst eingerichtet. Hausakte → Gemeinsame Projekte öffnen. Vorhandene Schlüssel bleiben unverändert.')


def main():
    parser = argparse.ArgumentParser(description='Home-Technik im LXC aktualisieren')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--check', action='store_true', help='Nur auf neue Version prüfen')
    group.add_argument('--rollback', action='store_true', help='Vorheriges Release aktivieren')
    group.add_argument('--setup-web', action='store_true', help='Update aus der App einrichten')
    group.add_argument('--setup-projects', action='store_true', help='Gemeinsamen Projektdienst einrichten')
    group.add_argument('--reset-project-key', action='store_true', help='Projektschlüssel widerrufen und neuen erzeugen')
    parser.add_argument('--yes', action='store_true', help='Installation ohne Rückfrage')
    args = parser.parse_args()
    if os.geteuid() != 0:
        raise ValueError('Bitte im LXC als root ausführen')
    if not (STATE / 'managed').is_file():
        raise ValueError('Dieser Container wurde nicht mit dem Home-Technik-Installer eingerichtet')
    with (STATE / 'update.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if args.setup_web:
            setup_web()
            return
        if args.setup_projects or args.reset_project_key:
            setup_projects(args.reset_project_key)
            return
        current = active()
        current_version = json.loads((current / 'version.json').read_text())['version'] if current else '0.0.0'
        version(current_version)
        if args.rollback:
            name = (STATE / 'previous').read_text().strip()
            version(name)
            target = ROOT / 'releases' / name
            if not (target / 'index.html').is_file():
                raise ValueError('Vorheriges Release fehlt')
            if not args.yes and input(f'App von {current_version} auf {name} zurücksetzen? [ja/NEIN] ') != 'ja':
                return
            activate(target)
            print(f'Rollback auf {name} erfolgreich. Browser neu laden; Hausdaten wurden nicht zurückgesetzt.')
            return
        number, url = latest()
        print(f'Installiert: {current_version}; verfügbar: {number}')
        if version(number) <= version(current_version):
            print('Kein neueres Release verfügbar.')
            return
        if args.check:
            print('Update verfügbar. Zum Installieren: Update')
            return
        print('Vorher offene Eingaben speichern und eine Projektdatei im Browser sichern.')
        if not args.yes and input(f'Version {number} jetzt installieren? [ja/NEIN] ') != 'ja':
            return
        target = ROOT / 'releases' / number
        with tempfile.TemporaryDirectory(prefix='home-technik-') as tmp:
            staged = Path(tmp)
            extract_verified(download(url, 60_000_000), download(url + '.sha256', 1024), staged)
            data = json.loads((staged / 'dist/version.json').read_text())
            if data.get('version') != number or not (staged / 'dist/index.html').is_file():
                raise ValueError('Release-Inhalt passt nicht zur Versionsnummer')
            updater = staged / 'deploy/update.py'
            if not updater.is_file():
                raise ValueError('Updater im Release fehlt')
            (ROOT / 'releases').mkdir(parents=True, exist_ok=True)
            if target.exists():
                if target.is_symlink() or not same_tree(staged / 'dist', target):
                    raise ValueError(f'Vorhandenes Release weicht ab: {target}; Zustand manuell prüfen')
            else:
                shutil.copytree(staged / 'dist', target)
            shutil.copytree(target / 'assets', ROOT / 'assets', dirs_exist_ok=True)
            activate(target)
            installed_updater = Path('/opt/home-technik/update.py')
            next_updater = installed_updater.with_suffix('.next')
            shutil.copyfile(updater, next_updater)
            next_updater.chmod(0o755)
            os.replace(next_updater, installed_updater)
            api_source = staged / 'deploy/update_api.py'
            if api_source.is_file():
                api_next = Path('/opt/home-technik/update_api.next')
                shutil.copyfile(api_source, api_next)
                api_next.chmod(0o755)
                os.replace(api_next, Path('/opt/home-technik/update_api.py'))
            for name in ('home-technik.conf', 'home-technik-update.service', 'project_api.py', 'home-technik-projects.service'):
                source = staged / 'deploy' / name
                if source.is_file():
                    shutil.copyfile(source, Path('/opt/home-technik') / name)
                    if name == 'project_api.py':
                        (Path('/opt/home-technik') / name).chmod(0o644)
        if Path('/etc/systemd/system/home-technik-projects.service').is_file():
            run('systemctl', 'try-restart', 'home-technik-projects.service')
        if not os.environ.get('HOME_TECHNIK_WEB_UPDATE') and Path('/etc/systemd/system/home-technik-update.service').is_file():
            run('systemctl', 'try-restart', 'home-technik-update.service')
        print(f'Version {number} installiert. Browser neu laden. Rückweg: Update --rollback')


if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        print(f'Abgebrochen: {error}', file=sys.stderr)
        sys.exit(1)
