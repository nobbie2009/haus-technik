"""Unprivileged container supervisor; credentials and SQLite stay in /data."""
import getpass
import hashlib
import json
import os
from pathlib import Path
import secrets
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request

DATA = Path('/data')


def set_key():
    key = getpass.getpass('Neuer Projektschlüssel (12–256 Zeichen): ')
    if not 12 <= len(key) <= 256 or key != getpass.getpass('Wiederholen: '):
        raise SystemExit('Schlüssel zu kurz, zu lang oder Eingaben unterschiedlich.')
    salt = secrets.token_hex(16)
    config = {'tokenSalt': salt, 'tokenHash': hashlib.pbkdf2_hmac(
        'sha256', key.encode(), bytes.fromhex(salt), 600000).hex()}
    temp = DATA / 'auth.json.tmp'
    temp.write_text(json.dumps(config))
    temp.replace(DATA / 'auth.json')
    print('Projektschlüssel gespeichert. Container neu starten und Geräte verbinden.')


def healthcheck():
    with urllib.request.urlopen('http://127.0.0.1:8080/version.json', timeout=3) as response:
        assert 'version' in json.load(response)
    try:
        urllib.request.urlopen('http://127.0.0.1:8080/api/home-technik-projects', timeout=3)
    except urllib.error.HTTPError as error:
        if error.code == 401:
            return
        raise
    raise RuntimeError('Projektdienst verlangt keinen Schlüssel')


def run():
    DATA.mkdir(exist_ok=True)
    if not (DATA / 'auth.json').exists():
        # Start locked; never put a usable credential into logs or environment.
        with (DATA / 'auth.json').open('x') as output:
            json.dump({'tokenHash': hashlib.sha256(secrets.token_bytes(32)).hexdigest()}, output)
        print('Bitte Projektschlüssel mit python /app/start.py --set-key einrichten.', flush=True)
    children = []
    stopping = False

    def stop(*_):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        children.append(subprocess.Popen([sys.executable, '/app/project_api.py', '--data', str(DATA)]))
        children.append(subprocess.Popen(['nginx', '-c', '/app/nginx.conf', '-g', 'daemon off;']))
        while not stopping and all(child.poll() is None for child in children):
            time.sleep(0.25)
        return 0 if stopping else 1
    finally:
        for child in children:
            if child.poll() is None:
                child.terminate()
        for child in children:
            try:
                child.wait(timeout=5)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == '__main__':
    os.umask(0o077)
    if '--set-key' in sys.argv:
        set_key()
    elif '--healthcheck' in sys.argv:
        healthcheck()
    else:
        sys.exit(run())
