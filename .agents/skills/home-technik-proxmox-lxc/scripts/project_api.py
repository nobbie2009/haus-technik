#!/usr/bin/python3
"""Authenticated, same-origin project storage with atomic compare-and-swap revisions."""
import argparse
from contextlib import contextmanager
from collections import deque
import hashlib
import hmac
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import sqlite3
import threading
import time
from urllib.parse import urlsplit
import uuid

MAX_BODY = 24_000_000


class Store:
    def __init__(self, path):
        self.path = str(path)
        with self.connect() as db:
            db.execute('PRAGMA journal_mode=WAL')
            db.execute('CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT NOT NULL, etag TEXT NOT NULL, body TEXT NOT NULL, saved TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)')
            db.execute('CREATE TABLE IF NOT EXISTS history (seq INTEGER PRIMARY KEY, id TEXT NOT NULL, body TEXT NOT NULL, saved TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=15)
        try:
            with db:
                yield db
        finally:
            db.close()

    def list(self):
        with self.connect() as db:
            return [dict(zip(('id', 'name', 'etag', 'saved'), row)) for row in db.execute('SELECT id,name,etag,saved FROM projects ORDER BY saved DESC')]

    def get(self, key):
        with self.connect() as db:
            return db.execute('SELECT body,etag FROM projects WHERE id=?', (key,)).fetchone()

    def put(self, key, project, match, create):
        if not isinstance(project, dict) or project.get('id') != key or project.get('schemaVersion') != 10:
            raise ValueError('Ungültiges Projekt oder nicht unterstützte Dateiversion.')
        if not isinstance(project.get('name'), str) or not 1 <= len(project['name'].strip()) <= 150:
            raise ValueError('Projektname fehlt oder ist zu lang.')
        if not isinstance(project.get('version'), int) or isinstance(project['version'], bool) or project['version'] < 1:
            raise ValueError('Ungültige Projektrevision.')
        for field in ('floors', 'points', 'walls', 'rooms', 'layers', 'electrical', 'metadata'):
            if not isinstance(project.get(field), dict):
                raise ValueError('Unvollständiges Projekt.')
        body = json.dumps(project, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
        tag = '"' + hashlib.sha256(body.encode()).hexdigest() + '"'
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            old = db.execute('SELECT body,etag FROM projects WHERE id=?', (key,)).fetchone()
            if (old is None and not create) or (old is not None and (create or match != old[1])):
                return None
            if old and old[0] != body:
                db.execute('INSERT INTO history(id,body) VALUES (?,?)', (key, old[0]))
                db.execute('DELETE FROM history WHERE id=? AND seq NOT IN (SELECT seq FROM history WHERE id=? ORDER BY seq DESC LIMIT 20)', (key, key))
            db.execute('INSERT INTO projects(id,name,etag,body) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,etag=excluded.etag,body=excluded.body,saved=CURRENT_TIMESTAMP', (key, project['name'], tag, body))
        return tag


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, store, token_hash):
        self.store, self.token_hash = store, token_hash
        self.slots = threading.BoundedSemaphore(16)
        self.rate_lock = threading.Lock()
        self.requests = {}
        self.rate_limit = 100
        super().__init__(address, Handler)

    def allowed(self, address):
        now = time.monotonic()
        with self.rate_lock:
            self.requests = {key: values for key, values in self.requests.items() if values and values[-1] > now - 60}
            if address not in self.requests and len(self.requests) >= 1024:
                return False
            values = self.requests.setdefault(address, deque())
            while values and values[0] <= now - 60:
                values.popleft()
            if len(values) >= self.rate_limit:
                return False
            values.append(now)
            return True

    def process_request(self, request, address):
        if not self.slots.acquire(blocking=False):
            request.close()
            return
        try:
            super().process_request(request, address)
        except Exception:
            self.slots.release()
            raise

    def process_request_thread(self, request, address):
        try:
            super().process_request_thread(request, address)
        finally:
            self.slots.release()


class Handler(BaseHTTPRequestHandler):
    server_version = 'Home-Technik'
    sys_version = ''

    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def log_message(self, *_args):
        pass  # No tokens, project contents or request URLs in logs.

    def reply(self, code, body, etag=None):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if etag:
            self.send_header('ETag', etag)
        self.end_headers()
        self.wfile.write(data)

    def handle_request(self, write=False):
        # Only the loopback reverse proxy is reachable; it replaces X-Real-IP.
        address = self.headers.get('X-Real-IP') or self.client_address[0]
        if not self.server.allowed(address):
            self.reply(429, {'error': 'Zu viele Anfragen. Bitte kurz warten.'})
            return
        auth = self.headers.get('Authorization', '')
        supplied = hashlib.sha256(auth.removeprefix('Bearer ').encode()).hexdigest()
        if not auth.startswith('Bearer ') or not hmac.compare_digest(supplied, self.server.token_hash):
            self.reply(401, {'error': 'Zugriffsschlüssel fehlt oder ist ungültig.'})
            return
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            self.reply(403, {'error': 'Fremde Herkunft ist nicht erlaubt.'})
            return
        path = urlsplit(self.path).path.rstrip('/')
        prefix = '/api/home-technik-projects'
        if path == prefix and not write:
            self.reply(200, {'projects': self.server.store.list()})
            return
        key = path.removeprefix(prefix + '/')
        try:
            if path != prefix + '/' + str(uuid.UUID(key)):
                raise ValueError()
        except ValueError:
            self.reply(404, {'error': 'Projektpfad nicht gefunden.'})
            return
        if not write:
            row = self.server.store.get(key)
            if row:
                self.reply(200, json.loads(row[0]), row[1])
            else:
                self.reply(404, {'error': 'Projekt nicht gefunden.'})
            return
        if self.headers.get('Content-Type', '').split(';')[0] != 'application/json' or self.headers.get('Transfer-Encoding'):
            self.reply(415, {'error': 'JSON mit fester Inhaltslänge erforderlich.'})
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= MAX_BODY:
                self.reply(413, {'error': 'Projekt überschreitet das Größenlimit.'})
                return
            match, create = self.headers.get('If-Match'), self.headers.get('If-None-Match') == '*'
            if not match and not create:
                self.reply(428, {'error': 'Versionsvergleich erforderlich.'})
                return
            raw = self.rfile.read(length)
            if len(raw) != length:
                raise ValueError('Unvollständige Übertragung.')
            data = json.loads(raw, parse_constant=lambda value: (_ for _ in ()).throw(ValueError('Ungültige Zahl.')))
            tag = self.server.store.put(key, data, match, create)
            if tag is None:
                self.reply(412, {'error': 'Serverstand wurde zwischenzeitlich geändert. Lokale Änderungen bleiben erhalten.'})
            else:
                self.reply(200, {'etag': tag}, tag)
        except (ValueError, UnicodeError, RecursionError):
            self.reply(400, {'error': 'Ungültige Projektdaten.'})
        except sqlite3.Error:
            self.reply(503, {'error': 'Projektspeicher derzeit nicht verfügbar.'})

    def do_GET(self):
        try:
            self.handle_request()
        except sqlite3.Error:
            self.reply(503, {'error': 'Projektspeicher derzeit nicht verfügbar.'})

    def do_PUT(self):
        self.handle_request(True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', default='/var/lib/home-technik-projects')
    parser.add_argument('--port', type=int, default=9088)
    args = parser.parse_args()
    os.umask(0o077)
    directory = Path(args.data)
    config = json.loads((directory / 'auth.json').read_text())
    Server(('127.0.0.1', args.port), Store(directory / 'projects.sqlite3'), config['tokenHash']).serve_forever()
