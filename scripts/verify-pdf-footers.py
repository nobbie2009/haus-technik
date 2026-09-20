"""Check every page of all generated E2E PDF formats against the build version."""
import json
from pathlib import Path
from pypdf import PdfReader

version = json.loads(Path('package.json').read_text())['version']
files = ['housebook-plan.pdf', 'housebook-inventory.pdf', 'Sicherungskasten-Aushang.pdf',
         'Haus-Schnelluebersicht.pdf', 'Hausakte-QR-Aufkleber.pdf']
pages = 0
for name in files:
    reader = PdfReader(Path('test-results') / name)
    assert len(reader.pages), f'{name}: keine Seiten'
    for index, page in enumerate(reader.pages, 1):
        text = page.extract_text()
        for expected in ['Home-Technik', f'Version {version}', 'Copyright by nobbie2009', f'{index}/{len(reader.pages)}']:
            assert expected in text, f'{name}, Seite {index}: {expected} fehlt'
        pages += 1
print(f'Footer auf allen {pages} Seiten aus {len(files)} PDF-Ausgaben geprüft: Version {version}')
