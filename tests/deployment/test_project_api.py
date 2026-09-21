import concurrent.futures
import hashlib
import http.client
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
import uuid

path = Path(__file__).resolve().parents[2] / '.agents/skills/home-technik-proxmox-lxc/scripts/project_api.py'
spec = importlib.util.spec_from_file_location('project_api_test', path)
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)


class ProjectApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = api.Store(Path(self.temp.name) / 'test.sqlite3')
        self.token = uuid.uuid4().hex
        self.server = api.Server(('127.0.0.1', 0), self.store, hashlib.sha256(self.token.encode()).hexdigest())
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.key = str(uuid.uuid4())
        self.project = {'id': self.key, 'schemaVersion': 10, 'name': 'Testhaus', 'version': 1, **{k: {} for k in ('floors', 'points', 'walls', 'rooms', 'layers', 'electrical', 'metadata')}}

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, method, suffix='', body=None, headers=None, auth=True):
        connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        values = {'Authorization': 'Bearer ' + self.token} if auth else {}
        if body is not None:
            values['Content-Type'] = 'application/json'
            body = json.dumps(body).encode()
        values.update(headers or {})
        connection.request(method, '/api/home-technik-projects' + suffix, body=body, headers=values)
        response = connection.getresponse()
        result = (response.status, dict(response.getheaders()), json.loads(response.read()))
        connection.close()
        return result

    def test_auth_origin_and_input(self):
        self.assertEqual(self.request('GET', auth=False)[0], 401)
        self.assertEqual(self.request('GET', headers={'Origin': 'https://foreign.example'})[0], 403)
        self.assertEqual(self.request('PUT', '/' + self.key, self.project)[0], 428)
        self.assertEqual(self.request('PUT', '/' + self.key, {'id': self.key}, {'If-None-Match': '*'})[0], 400)
        self.assertEqual(self.request('GET', '/../auth.json')[0], 404)
        self.assertEqual(self.store.list(), [])

    def test_requests_are_rate_limited_before_authentication(self):
        self.server.rate_limit = 2
        self.assertEqual(self.request('GET', auth=False)[0], 401)
        self.assertEqual(self.request('GET', auth=False)[0], 401)
        self.assertEqual(self.request('GET')[0], 429)
        self.assertEqual(self.request('GET', headers={'X-Real-IP': '192.0.2.1'})[0], 200)

    def test_two_devices_compare_and_swap_without_data_loss(self):
        status, headers, _ = self.request('PUT', '/' + self.key, self.project, {'If-None-Match': '*'})
        self.assertEqual(status, 200)
        tag = headers['ETag']
        self.assertEqual(self.request('PUT', '/' + self.key, self.project, {'If-None-Match': '*'})[0], 412)
        barrier = threading.Barrier(2)

        def change(name):
            barrier.wait()
            return self.request('PUT', '/' + self.key, {**self.project, 'name': name}, {'If-Match': tag})[0]

        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            results = list(pool.map(change, ['PC-Entwurf', 'iPad-Entwurf']))
        self.assertEqual(sorted(results), [200, 412])
        status, current_headers, current = self.request('GET', '/' + self.key)
        self.assertEqual(status, 200)
        self.assertIn(current['name'], ['PC-Entwurf', 'iPad-Entwurf'])
        self.assertNotEqual(current_headers['ETag'], tag)
        with self.store.connect() as db:
            self.assertEqual(json.loads(db.execute('SELECT body FROM history WHERE id=?', (self.key,)).fetchone()[0])['name'], 'Testhaus')

    def test_retention_and_persistence(self):
        tag = self.store.put(self.key, self.project, None, True)
        for i in range(24):
            tag = self.store.put(self.key, {**self.project, 'name': f'Revision {i}'}, tag, False)
        with self.store.connect() as db:
            self.assertEqual(db.execute('SELECT count(*) FROM history').fetchone()[0], 20)
        reopened = api.Store(Path(self.temp.name) / 'test.sqlite3')
        self.assertEqual(json.loads(reopened.get(self.key)[0])['name'], 'Revision 23')


if __name__ == '__main__':
    unittest.main()
