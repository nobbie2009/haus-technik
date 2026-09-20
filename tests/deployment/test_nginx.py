"""Real Nginx smoke test on Linux CI, isolated from the system service."""
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import time
import unittest
import urllib.request
import urllib.error


@unittest.skipUnless(shutil.which('nginx'), 'Nginx is tested on Linux CI')
class NginxTests(unittest.TestCase):
    def test_static_release_mime_cache_and_404(self):
        template = Path('.agents/skills/home-technik-proxmox-lxc/assets/home-technik.conf').read_text()
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp); base.chmod(0o755)
            www = base/'www'; current = www/'current'; current.mkdir(parents=True)
            assets = www/'assets'; assets.mkdir()
            (current/'index.html').write_text('HOME TECHNIK')
            (current/'version.json').write_text('{"version":"0.22.0"}')
            (assets/'worker.mjs').write_text('export {};')
            with socket.socket() as sock:
                sock.bind(('127.0.0.1', 0)); port=sock.getsockname()[1]
            template=template.replace('listen 80;',f'listen 127.0.0.1:{port};').replace('listen [::]:80;','').replace('/var/www/home-technik',str(www))
            config=base/'nginx.conf'
            config.write_text(f'daemon off; pid {base}/nginx.pid; error_log stderr; events {{}} http {{ access_log off; {template} }}')
            process=subprocess.Popen(['nginx','-p',tmp,'-c',str(config)],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            try:
                url=f'http://127.0.0.1:{port}'
                for attempt in range(100):
                    if process.poll() is not None:
                        self.fail(process.communicate()[1].decode())
                    try:
                        with urllib.request.urlopen(url+'/',timeout=1) as response:
                            self.assertEqual(response.read(),b'HOME TECHNIK')
                        break
                    except OSError:
                        time.sleep(.05)
                else: self.fail('Nginx did not start')
                with urllib.request.urlopen(url+'/assets/worker.mjs') as response:
                    self.assertIn('application/javascript', response.headers['Content-Type'])
                    self.assertIn('immutable', response.headers['Cache-Control'])
                with urllib.request.urlopen(url+'/version.json') as response:
                    self.assertEqual(response.headers['Cache-Control'],'no-cache')
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(url+'/assets/missing.js')
                self.assertEqual(error.exception.code,404)
            finally:
                process.terminate()
                try: process.communicate(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill(); process.communicate()
