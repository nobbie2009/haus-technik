import hashlib
import importlib.util
import io
import os
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import types
import unittest
from unittest.mock import patch

# Windows can verify pure functions; Linux CI uses the real POSIX module.
try:
    import fcntl
except ImportError:
    sys.modules['fcntl'] = types.SimpleNamespace()
spec = importlib.util.spec_from_file_location('updater', Path(__file__).resolve().parents[2] / '.agents/skills/home-technik-proxmox-lxc/scripts/update.py')
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


def archive(name='dist/index.html', link=False):
    out = io.BytesIO()
    with tarfile.open(fileobj=out, mode='w:gz') as tar:
        item = tarfile.TarInfo(name)
        if link:
            item.type = tarfile.SYMTYPE
            item.linkname = '/etc/passwd'
            tar.addfile(item)
        else:
            data = b'house'
            item.size = len(data)
            tar.addfile(item, io.BytesIO(data))
    return out.getvalue()


class UpdateTests(unittest.TestCase):
    def test_first_project_setup_recovers_files_not_copied_by_old_updater(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            current = root / 'current'; current.mkdir()
            cache = root / 'cache'; cache.mkdir()
            (current / 'version.json').write_text('{"version":"0.48.0"}')
            out = io.BytesIO()
            with tarfile.open(fileobj=out, mode='w:gz') as tar:
                for name, text in [('dist/version.json', '{"version":"0.48.0"}'), ('deploy/project_api.py', '# test'), ('deploy/home-technik-projects.service', '# test')]:
                    data = text.encode(); item = tarfile.TarInfo(name); item.size = len(data)
                    tar.addfile(item, io.BytesIO(data))
            data = out.getvalue()
            with patch.object(updater, 'active', return_value=current), patch.object(updater, 'download', side_effect=[data, hashlib.sha256(data).hexdigest().encode()]) as fetch:
                updater.ensure_project_assets(cache)
                self.assertIn('/releases/download/v0.48.0/', fetch.call_args_list[0].args[0])
                self.assertEqual((cache / 'project_api.py').read_text(), '# test')
                updater.ensure_project_assets(cache)
                self.assertEqual(fetch.call_count, 2)

    def test_versions(self):
        self.assertGreater(updater.version('0.22.0'), updater.version('0.9.9'))
        for value in ['../etc', 'v1.0.0', '01.0.0', '1.0.0-beta']:
            with self.assertRaises(ValueError): updater.version(value)

    def test_valid_extract_and_checksum(self):
        data = archive()
        with tempfile.TemporaryDirectory() as tmp:
            updater.extract_verified(data, hashlib.sha256(data).hexdigest().encode(), Path(tmp))
            self.assertEqual((Path(tmp)/'dist/index.html').read_text(), 'house')
            with self.assertRaises(ValueError): updater.extract_verified(data, b'0'*64, Path(tmp))

    @unittest.skipIf(sys.platform == 'win32', 'POSIX permissions')
    def test_service_umask_keeps_web_files_readable(self):
        data=archive('dist/assets/app.js')
        with tempfile.TemporaryDirectory() as tmp:
            mask=os.umask(0o077)
            try: updater.extract_verified(data,hashlib.sha256(data).hexdigest().encode(),Path(tmp))
            finally: os.umask(mask)
            self.assertEqual((Path(tmp)/'dist/assets').stat().st_mode & 0o777,0o755)
            self.assertEqual((Path(tmp)/'dist/assets/app.js').stat().st_mode & 0o777,0o644)

    def test_reject_paths_and_links_before_writing(self):
        for name, link in [('dist/../../etc/passwd',False),('/etc/passwd',False),('deploy/evil',True),('other/data',False)]:
            data = archive(name, link)
            with tempfile.TemporaryDirectory() as tmp:
                with self.assertRaises(ValueError): updater.extract_verified(data, hashlib.sha256(data).hexdigest().encode(), Path(tmp))
                self.assertEqual(list(Path(tmp).iterdir()), [])

    def test_release_requires_matching_assets(self):
        data = {'tag_name':'v0.22.0','assets':[]}
        with patch.object(updater,'download',return_value=json.dumps(data).encode()):
            with self.assertRaises(ValueError): updater.latest()

    def test_existing_release_must_match_all_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            a=Path(tmp)/'a'; b=Path(tmp)/'b'; a.mkdir(); b.mkdir()
            (a/'index.html').write_text('same'); (b/'index.html').write_text('same')
            self.assertTrue(updater.same_tree(a,b))
            (b/'extra.js').write_text('stale')
            self.assertFalse(updater.same_tree(a,b))

    @unittest.skipIf(sys.platform == 'win32', 'Symlink integration runs in Linux CI')
    def test_activation_saves_rollback_target(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            old=root/'releases/0.21.0'; old.mkdir(parents=True)
            new=root/'releases/0.22.0'; new.mkdir()
            (new/'version.json').write_text('{"version":"0.22.0"}')
            (root/'current').symlink_to(old)
            with patch.object(updater,'ROOT',root), patch.object(updater,'STATE',root), patch.object(updater,'run'), patch.object(updater,'download',return_value=b'{"version":"0.22.0"}'):
                updater.activate(new)
                self.assertEqual((root/'current').resolve(),new)
                self.assertEqual((root/'previous').read_text(),'0.21.0')

    @unittest.skipIf(sys.platform == 'win32', 'Symlink integration runs in Linux CI')
    def test_http_failure_restores_previous_release(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            old=root/'releases/0.21.0'; old.mkdir(parents=True)
            new=root/'releases/0.22.0'; new.mkdir()
            (new/'version.json').write_text('{"version":"0.22.0"}')
            (root/'current').symlink_to(old)
            with patch.object(updater,'ROOT',root), patch.object(updater,'STATE',root), patch.object(updater,'run'), patch.object(updater,'download',side_effect=OSError('offline')):
                with self.assertRaises(OSError): updater.activate(new)
                self.assertEqual((root/'current').resolve(),old)

if __name__ == '__main__': unittest.main()
