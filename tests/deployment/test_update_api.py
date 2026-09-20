import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.request
import urllib.error
from unittest.mock import patch

spec=importlib.util.spec_from_file_location('api',Path('.agents/skills/home-technik-proxmox-lxc/scripts/update_api.py'))
api=importlib.util.module_from_spec(spec); spec.loader.exec_module(api)


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.auth=Path(self.tmp.name)/'auth.json'
        salt=b'salt-for-test'
        self.auth.write_text(json.dumps({'salt':salt.hex(),'hash':hashlib.pbkdf2_hmac('sha256',b'correct-password',salt,600000).hex()}))
        self.auth_patch=patch.object(api,'AUTH',self.auth); self.auth_patch.start()
        self.state_patch=patch.object(api,'STATE_FILE',Path(self.tmp.name)/'state.json'); self.state_patch.start()
        api.STATUS={'state':'idle','message':'Bereit'}; api.FAILURES.clear()
        self.server=api.ThreadingHTTPServer(('127.0.0.1',0),api.Handler)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True); self.thread.start()
        self.url=f'http://127.0.0.1:{self.server.server_port}/api/home-technik-update'

    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()
        self.auth_patch.stop(); self.state_patch.stop(); self.tmp.cleanup()

    def post(self,password='correct-password',headers=None):
        request=urllib.request.Request(self.url,data=json.dumps({'password':password}).encode(),headers=headers or {'Content-Type':'application/json','X-Home-Technik-Update':'1'})
        try:
            with urllib.request.urlopen(request,timeout=5) as response: return response.status,json.load(response)
        except urllib.error.HTTPError as error: return error.code,json.load(error)

    def test_wrong_password_never_starts_update_and_is_rate_limited(self):
        with patch.object(api,'execute_update') as execute:
            for _ in range(5): self.assertEqual(self.post('wrong-password')[0],401)
            self.assertEqual(self.post()[0],429)
            execute.assert_not_called()

    def test_cross_origin_is_rejected(self):
        self.assertEqual(self.post(headers={'Content-Type':'application/json','X-Home-Technik-Update':'1','Origin':'https://example.org'})[0],403)

    def test_valid_request_starts_once_and_prevents_parallel_update(self):
        # Keep the real HTTP request thread, but replace the worker target.
        blocker=threading.Event()
        with patch.object(api,'execute_update',side_effect=lambda: blocker.wait(5)) as execute:
            try:
                self.assertEqual(self.post()[0],202)
                self.assertEqual(self.post()[0],409)
                self.assertEqual(execute.call_count,1)
                with urllib.request.urlopen(self.url) as response:
                    self.assertEqual(json.load(response)['state'],'running')
            finally: blocker.set()
