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
    def execute(self, confirm, occupied=False):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); log=root/'calls'
            for command in ['pct','pvesm','pveam','ip']:
                path=root/command
                path.write_text('#!/bin/bash\nprintf "%s\\n" "$(basename "$0") $*" >> "$CALL_LOG"\nif [[ $(basename "$0") == pct && ${1:-} == status ]]; then exit "$OCCUPIED_EXIT"; fi\nexit 0\n')
                path.chmod(0o755)
            env=dict(os.environ,PATH=f'{tmp}:/usr/bin:/bin',CALL_LOG=str(log),OCCUPIED_EXIT='0' if occupied else '1')
            command=['bash',str(Path('.agents/skills/home-technik-proxmox-lxc/scripts/install.sh').resolve())]
            if os.geteuid()!=0:
                if not shutil.which('sudo'): self.skipTest('No root/sudo available')
                command=['sudo','-n','env',f'PATH={env["PATH"]}',f'CALL_LOG={log}',f'OCCUPIED_EXIT={env["OCCUPIED_EXIT"]}',*command]
            answers=['203','','local-lvm','local','local:vztmpl/debian-13-standard_test_amd64.tar.zst','','','dhcp','','','','','',confirm]
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
