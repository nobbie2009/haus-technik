"""Real installation/upgrade smoke test, using only disposable Docker resources."""
import json
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.request
import uuid

VERSION = json.loads(Path('package.json').read_text())['version']
IMAGE = 'home-technik:' + VERSION
NAME = 'home-technik-test-' + uuid.uuid4().hex[:12]
VOLUME = NAME + '-data'


def docker(*args, **kwargs):
    return subprocess.check_output(['docker', *args], text=True, **kwargs).strip()


def start():
    docker('run', '-d', '--name', NAME, '-p', '127.0.0.1::8080', '-v', VOLUME + ':/data', IMAGE)
    port = docker('port', NAME, '8080/tcp').rsplit(':', 1)[1]
    base = 'http://127.0.0.1:' + port
    for _ in range(60):
        try:
            with urllib.request.urlopen(base + '/version.json', timeout=2) as response:
                assert json.load(response)['version'] == VERSION
            docker('exec', NAME, 'python', '/app/start.py', '--healthcheck')
            return base
        except (OSError, subprocess.CalledProcessError):
            time.sleep(1)
    raise RuntimeError('Container wird nicht betriebsbereit')


def request(path, token=None, data=None, headers=None):
    values = dict(headers or {})
    if token:
        values['Authorization'] = 'Bearer ' + token
    if data is not None:
        values['Content-Type'] = 'application/json'
    req = urllib.request.Request(base + path, data=json.dumps(data).encode() if data is not None else None,
                                 headers=values, method='PUT' if data is not None else 'GET')
    try:
        response = urllib.request.urlopen(req, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        return response.status, response.headers, response.read()


try:
    docker('volume', 'create', VOLUME)
    base = start()
    status, _, html = request('/')
    assert status == 200
    assert request('/handbuch/index.html')[0] == 200
    for asset in re.findall(r'(?:src|href)="(/assets/[^\"]+)"', html.decode()):
        assert request(asset)[0] == 200
    workers = docker('exec', NAME, 'sh', '-c', 'find /app/www/assets -name "*.mjs"').splitlines()
    assert workers, 'PDF-Worker fehlt'
    for worker in workers:
        status, headers, _ = request(worker.removeprefix('/app/www'))
        assert status == 200 and 'javascript' in headers['Content-Type']
    assert json.loads(request('/api/home-technik-update')[2])['supported'] is False
    api = '/api/home-technik-projects'
    assert request(api)[0] == 401
    assert request('/auth.json')[0] == 404
    assert request('/assets/missing.js')[0] == 404
    # Exercise the actual interactive key setup without exposing any credentials.
    token = uuid.uuid4().hex
    docker('exec', '-i', NAME, 'python', '/app/start.py', '--set-key', input=token + '\n' + token + '\n')
    docker('rm', '-f', NAME)
    base = start()
    assert request(api, token)[0] == 200
    assert request(api, 'wrong-key')[0] == 401
    assert request(api, token, headers={'Origin': 'https://foreign.example'})[0] == 403
    assert request(api, token, headers={'Origin': base})[0] == 200
    key = str(uuid.uuid4())
    project = {'id': key, 'schemaVersion': 10, 'name': 'Container-Testhaus', 'version': 1,
               **{field: {} for field in ('floors', 'points', 'walls', 'rooms', 'layers', 'electrical', 'metadata')}}
    path = api + '/' + key
    assert request(path, token, project, {'If-None-Match': '*'})[0] == 200
    assert request(path, token, project, {'If-None-Match': '*'})[0] == 412
    # Replace the container, not just its process, to verify persistent storage.
    docker('stop', '-t', '10', NAME)
    assert docker('inspect', '-f', '{{.State.ExitCode}}', NAME) == '0'
    docker('rm', NAME)
    base = start()
    assert json.loads(request(path, token)[2]) == project
    new_token = uuid.uuid4().hex
    docker('exec', '-i', NAME, 'python', '/app/start.py', '--set-key', input=new_token + '\n' + new_token + '\n')
    docker('restart', NAME)
    time.sleep(2)
    assert request(api, token)[0] == 401
    assert json.loads(request(path, new_token)[2]) == project
    print('Docker-Installation, Zugriffsschutz, Schlüsselwechsel und persistente Projekte erfolgreich geprüft.')
finally:
    subprocess.run(['docker', 'logs', '--tail', '30', NAME], check=False)
    subprocess.run(['docker', 'rm', '-f', NAME], check=False)
    subprocess.run(['docker', 'volume', 'rm', VOLUME], check=False)
