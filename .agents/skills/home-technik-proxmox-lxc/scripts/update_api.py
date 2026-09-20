#!/usr/bin/python3
"""Loopback-only update control; Nginx exposes the fixed API in the home network."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import threading
import time
from urllib.parse import urlsplit

AUTH = Path('/var/lib/home-technik/update-auth.json')
LOCK = threading.Lock()
STATUS = {'state': 'idle', 'message': 'Bereit'}
STATE_FILE = Path('/var/lib/home-technik/update-status.json')
FAILURES = []


def valid_password(password):
    if not isinstance(password, str) or not 12 <= len(password) <= 1024:
        return False
    auth = json.loads(AUTH.read_text())
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(auth['salt']), 600000).hex()
    return hmac.compare_digest(digest, auth['hash'])


def execute_update():
    global STATUS
    try:
        with Path('/var/log/home-technik-update.log').open('w') as log:
            result = subprocess.run(['/usr/bin/python3', '/opt/home-technik/update.py', '--yes'], stdout=log, stderr=subprocess.STDOUT, timeout=1200, env=dict(os.environ, HOME_TECHNIK_WEB_UPDATE='1'))
        with LOCK:
            STATUS = {'state': 'success' if result.returncode == 0 else 'failed', 'message': 'Update abgeschlossen. Serverversion prüfen und Seite neu laden.' if result.returncode == 0 else 'Update fehlgeschlagen. Der bisherige Stand wird soweit möglich weiterverwendet; Details im LXC-Protokoll.'}
            STATE_FILE.write_text(json.dumps(STATUS))
        if result.returncode == 0:
            subprocess.run(['systemctl', '--no-block', 'restart', 'home-technik-update.service'], check=True)
    except Exception:
        with LOCK:
            STATUS = {'state': 'failed', 'message': 'Update konnte nicht abgeschlossen werden. LXC-Protokoll prüfen.'}


class Handler(BaseHTTPRequestHandler):
    def reply(self, code, data):
        encoded = json.dumps(data).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        if self.path != '/api/home-technik-update':
            return self.reply(404, {'message': 'Nicht gefunden'})
        with LOCK:
            result = dict(STATUS, supported=True)
        self.reply(200, result)

    def do_POST(self):
        global STATUS
        if self.path != '/api/home-technik-update':
            return self.reply(404, {'message': 'Nicht gefunden'})
        # JSON + custom header force browser preflight cross-origin. No CORS is enabled.
        origin = self.headers.get('Origin')
        if self.headers.get('X-Home-Technik-Update') != '1' or self.headers.get('Content-Type') != 'application/json':
            return self.reply(403, {'message': 'Anfrage nicht erlaubt'})
        if origin and (urlsplit(origin).scheme not in ('http','https') or urlsplit(origin).netloc != self.headers.get('Host')):
            return self.reply(403, {'message': 'Fremder Ursprung nicht erlaubt'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 1 <= length <= 2048:
                return self.reply(400, {'message': 'Ungültige Anfrage'})
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                return self.reply(400, {'message': 'Ungültige Anfrage'})
            with LOCK:
                now = time.monotonic()
                FAILURES[:] = [stamp for stamp in FAILURES if now - stamp < 60]
                if len(FAILURES) >= 5:
                    return self.reply(429, {'message': 'Zu viele Versuche. Bitte eine Minute warten.'})
                if not valid_password(data.get('password')):
                    FAILURES.append(now)
                    return self.reply(401, {'message': 'Update-Passwort ist nicht korrekt.'})
                if STATUS['state'] == 'running':
                    return self.reply(409, {'message': 'Es läuft bereits ein Update.'})
                next_status = {'state': 'running', 'message': 'Release wird geprüft und installiert …'}
                STATE_FILE.write_text(json.dumps(next_status))
                STATUS = next_status
                # The active API remains in memory; new API code starts on the next service restart.
                threading.Thread(target=execute_update, daemon=True).start()
            self.reply(202, {'state': 'running', 'message': 'Update gestartet'})
        except Exception:
            self.reply(503, {'message': 'Update-Dienst ist nicht bereit. Konfiguration im LXC prüfen.'})

    def log_message(self, *_args):
        pass  # Do not log request bodies or passwords.


if __name__ == '__main__':
    try:
        stored = json.loads(STATE_FILE.read_text())
        if stored.get('state') in ('success', 'failed'):
            STATUS = stored
        elif stored.get('state') == 'running':
            STATUS = {'state': 'failed', 'message': 'Update-Dienst wurde während eines Updates neu gestartet. Installierten Stand und Protokoll prüfen.'}
    except (OSError, ValueError):
        pass
    ThreadingHTTPServer(('127.0.0.1', 9087), Handler).serve_forever()
