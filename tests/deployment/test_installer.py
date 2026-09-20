"""Exercise prompts with fake Proxmox commands; never create a real container."""
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


@unittest.skipIf(sys.platform == 'win32', 'Bash/root command sandbox runs on Linux CI')
class InstallerTests(unittest.TestCase):
    def execute(self, confirm, occupied=False, download=False, invalid=False, empty=False, fail_download=False):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); log=root/'calls'
            fixture = r'''#!/bin/bash
printf "%s\n" "$(basename "$0") $*" >> "$CALL_LOG"
case "$(basename "$0") $1" in
  'pct status') exit "$OCCUPIED_EXIT" ;;
  'pvesh get') echo 203 ;;
  'pvesm status')
    echo 'Name Type Status Total Used Available %'
    [[ $EMPTY == 1 ]] && exit 0
    if [[ $3 == rootdir ]]; then echo 'local-lvm lvmthin active 8388608 0 8388608 0%'; else echo 'local dir active 8388608 0 8388608 0%'; fi
    echo 'offline dir inactive 8388608 0 8388608 0%' ;;
  'pveam list') echo 'local:vztmpl/debian-13-standard_test_amd64.tar.zst 100'; echo 'local:vztmpl/ubuntu-test.tar.zst 100' ;;
  'pveam available') echo 'system debian-13-standard_test_amd64.tar.zst' ;;
  'pveam download') [[ $FAIL_DOWNLOAD == 1 ]] && exit 1 ;;
  'ip -j') echo '[{"ifname":"vmbr0"}]' ;;
esac
exit 0
'''
            for name in ['pct','pvesm','pveam','ip','pvesh']:
                path=root/name
                path.write_text(fixture)
                path.chmod(0o755)
            env=dict(os.environ,PATH=f'{tmp}:/usr/bin:/bin',CALL_LOG=str(log),OCCUPIED_EXIT='0' if occupied else '1',EMPTY='1' if empty else '0',FAIL_DOWNLOAD='1' if fail_download else '0')
            command=['bash',str(Path('.agents/skills/home-technik-proxmox-lxc/scripts/install.sh').resolve())]
            if os.geteuid()!=0:
                if not shutil.which('sudo'): self.skipTest('No root/sudo available')
                command=['sudo','-n','env',f'PATH={env["PATH"]}',f'CALL_LOG={log}',f'OCCUPIED_EXIT={env["OCCUPIED_EXIT"]}',f'EMPTY={env["EMPTY"]}',f'FAIL_DOWNLOAD={env["FAIL_DOWNLOAD"]}',*command]
            answers=['','','1','1','2' if download else '1']
            if download: answers+=['1']
            answers+=['1','','dhcp','','','','','','test-password-123','test-password-123',confirm]
            if invalid: answers[2:2]=['99','abc']
            result=subprocess.run(command,input='\n'.join(answers)+'\n',text=True,capture_output=True,env=env,timeout=15)
            return result, log.read_text() if log.exists() else ''

    def test_cancel_does_not_create_container(self):
        result,calls=self.execute('nein')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertNotIn('pct create',calls)

    def test_existing_ct_is_never_recreated(self):
        result,calls=self.execute('ja',True)
        self.assertNotEqual(result.returncode,0)
        self.assertIn('bereits belegt',result.stdout)
        self.assertNotIn('pct create',calls)

    def test_defaults_generate_unprivileged_container_and_update_link(self):
        result,calls=self.execute('ja')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('--unprivileged 1',calls)
        self.assertIn('--rootfs local-lvm:4',calls)
        self.assertIn('--net0 name=eth0,bridge=vmbr0,ip=dhcp,firewall=1',calls)
        self.assertIn('ln -s /opt/home-technik/update.py /usr/local/bin/Update',calls)
        self.assertIn('pct exec 203 -- /usr/local/bin/Update --yes',calls)

    def test_invalid_menu_answer_retries(self):
        result,calls=self.execute('ja',invalid=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('Bitte eine Nummer',result.stdout)
        self.assertIn('--rootfs local-lvm:4',calls)
        self.assertNotIn('offline',result.stdout)
        self.assertNotIn('ubuntu',result.stdout)

    def test_download_after_confirmation(self):
        result,calls=self.execute('ja',download=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('pveam download local debian-13-standard_test_amd64.tar.zst',calls)
        self.assertLess(calls.index('pveam download'),calls.index('pct create'))

    def test_cancel_download_does_not_download_or_create(self):
        result,calls=self.execute('nein',download=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertNotIn('pveam download',calls)
        self.assertNotIn('pct create',calls)

    def test_empty_storage_stops(self):
        result,calls=self.execute('ja',empty=True)
        self.assertNotEqual(result.returncode,0)
        self.assertIn('Keine Auswahl',result.stderr)
        self.assertNotIn('pct create',calls)

    def test_failed_download_does_not_create(self):
        result,calls=self.execute('ja',download=True,fail_download=True)
        self.assertNotEqual(result.returncode,0)
        self.assertNotIn('pct create',calls)
