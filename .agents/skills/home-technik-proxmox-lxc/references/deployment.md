# Deployment und Betrieb

Die Befehle sind Vorlagen für die jeweils bezeichnete Shell. Werte aus der tatsächlichen Umgebung setzen.
Bei einem Fehler stoppen und den erreichten Zustand prüfen; keine folgenden Mutationen blind fortsetzen.
Hostzugang und Containerparameter gehören in den aktuellen Auftrag, nicht in die veröffentlichten Skill-Dateien.

## 1. Proxmox-Host prüfen und Container vorbereiten

Auf dem Proxmox-Host als berechtigter Administrator:

```bash
pveversion
pct list
pvesm status
ip -brief address
ip -brief link
pveam list "$TEMPLATE_STORAGE"
```

`TEMPLATE_STORAGE` muss vorher aus den vorhandenen Storages gewählt sein. Bei Bedarf `pveam update`
und `pveam available --section system` ausführen. Ein aktuelles unterstütztes Debian-Standardtemplate
passend zur Hostarchitektur auswählen, dessen **exakten** Namen verwenden und herunterladen:

```bash
pveam download "$TEMPLATE_STORAGE" "$TEMPLATE_NAME"
```

Vor Erstellung freie CT-ID prüfen; Storage muss Container-Root-Dateisysteme unterstützen.
`TEMPLATE_VOL` ist die von `pveam list` angezeigte Volume-ID. `NET0` enthält die tatsächlich ausgewählte
Konfiguration, etwa `name=eth0,bridge=BRIDGE,ip=dhcp` mit anschließend fester DHCP-Reservierung.
Für statische Adressen auch CIDR und Gateway angeben, für VLANs den ermittelten Tag ergänzen.
Alle Variablen vorab setzen; diese Prüfung verhindert Ausführung mit fehlenden Parametern:

```bash
: "${CTID:?}" "${TEMPLATE_VOL:?}" "${ROOT_STORAGE:?}" "${NET0:?}"
pct create "$CTID" "$TEMPLATE_VOL" \
  --hostname home-technik --unprivileged 1 \
  --cores 1 --memory 512 --swap 256 \
  --rootfs "${ROOT_STORAGE}:4" --net0 "$NET0" --onboot 1
pct start "$CTID"
pct exec "$CTID" -- ip -brief address
pct exec "$CTID" -- bash -lc 'apt-get update && apt-get install -y nginx curl ca-certificates'
```

Containerverwaltung über `pct exec`/`pct push` braucht keinen SSH-Dienst im Container.
Bestehende Proxmox-/Gast-Firewalls beibehalten; benötigten HTTP-Zugriff gezielt aus dem Heimnetz erlauben.
DNS und Paketquellen müssen erreichbar sein. Keine globalen Firewall- oder Repository-Umschaltungen vornehmen.

## 2. Reproduzierbaren Build erstellen

Auf einem separaten Build-Rechner einen sauberen Checkout des ausgewählten vollständigen Commit-SHA verwenden.
Bei uncommittierten Änderungen zuerst klären, welcher Stand tatsächlich ausgeliefert werden soll.
Node aus `.nvmrc`/`package.json` bereitstellen. In PowerShell jeden Exitcode beachten:

```powershell
npm ci
if ($LASTEXITCODE -ne 0) { throw 'npm ci fehlgeschlagen' }
npm run check
if ($LASTEXITCODE -ne 0) { throw 'Projektprüfung fehlgeschlagen' }
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build fehlgeschlagen' }
$releaseId = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0) { throw 'Git-Commit nicht ermittelbar' }
New-Item -ItemType Directory -Force exports | Out-Null
tar -czf "exports/home-technik-$releaseId.tar.gz" -C dist .
if ($LASTEXITCODE -ne 0) { throw 'Archivierung fehlgeschlagen' }
Get-FileHash "exports/home-technik-$releaseId.tar.gz" -Algorithm SHA256
```

`exports/` ist im Projekt ignoriert. Archiv nur aus diesem eigenen Build beziehen; keine fremden Archive als
root entpacken. Archiv und `assets/home-technik.conf` dieses Skills über den vorhandenen SSH-Zugang mit `scp`
auf den Proxmox-Host übertragen. Hostschlüssel prüfen, nicht die SSH-Prüfung deaktivieren. SHA-256 dort vergleichen.
Danach auf dem Host (ARCHIVE und CONFIG sind die überprüften absoluten Uploadpfade):

```bash
: "${CTID:?}" "${ARCHIVE:?}" "${CONFIG:?}"
pct push "$CTID" "$ARCHIVE" /tmp/home-technik-release.tar.gz
pct push "$CTID" "$CONFIG" /tmp/home-technik.conf
pct enter "$CTID"
```

## 3. Release im Container installieren

Die folgenden Befehle laufen **im LXC**, nicht auf dem Proxmox-Host.
`RELEASE` auf den vollständigen Commit-SHA des geprüften Builds setzen. Die Prüfung begrenzt den Pfad.

```bash
set -euo pipefail
[[ "${RELEASE:-}" =~ ^[0-9a-f]{40}$ ]] || { echo 'Commit-SHA fehlt'; exit 1; }
install -d -m 755 /var/www/home-technik/releases /var/www/home-technik/assets
test ! -e "/var/www/home-technik/releases/$RELEASE"
install -d -m 755 "/var/www/home-technik/releases/$RELEASE"
tar --no-same-owner -xzf /tmp/home-technik-release.tar.gz -C "/var/www/home-technik/releases/$RELEASE"
test -s "/var/www/home-technik/releases/$RELEASE/index.html"
test -d "/var/www/home-technik/releases/$RELEASE/assets"
chmod -R u=rwX,go=rX "/var/www/home-technik/releases/$RELEASE"
cp -a "/var/www/home-technik/releases/$RELEASE/assets/." /var/www/home-technik/assets/
```

Ein bereits vorhandenes Release untersuchen und dessen Inhalt vergleichen; nicht automatisch löschen.
Die gemeinsam abgelegten, gehashten Assets bleiben bei Updates erhalten, damit offene Tabs ihre alten
nachgeladenen Module noch finden. Speicherverbrauch beobachten; keine ungefragte Bereinigung.

### Nginx bei Erstinstallation

Mit `nginx -T` die bestehenden Sites prüfen. Vorlage verwendet Port 80 und URL-Wurzel `/`.
Die Debian-Hauptkonfiguration muss `mime.types` einbinden; `.js` und `.mjs` müssen als JavaScript
ausgeliefert werden. Bei ungeeigneter MIME-Zuordnung diese vor dem Start korrigieren und prüfen.
Es gibt derzeit nur Fragment-Links (`#haus=…&akte=…`), daher keinen pauschalen SPA-Fallback:
fehlende Dateien liefern 404 statt HTML als JavaScript.

In einem **neuen dedizierten** Container die unveränderte Debian-Default-Site nach Sichtprüfung deaktivieren.
Vorhandene Site-Dateien vorher außerhalb des aktiven Include-Verzeichnisses sichern; bei erneutem Deployment
die vorhandene Home-Technik-Konfiguration nicht ungeprüft ersetzen.

```bash
test ! -e /etc/nginx/sites-available/home-technik
test ! -e /etc/nginx/sites-enabled/home-technik
install -m 644 /tmp/home-technik.conf /etc/nginx/sites-available/home-technik
ln -s /etc/nginx/sites-available/home-technik /etc/nginx/sites-enabled/home-technik
```

Ein `server_name _` allein macht die Site nicht zum Default. Im dedizierten Container nach bestätigter
Prüfung nur den Link `/etc/nginx/sites-enabled/default` entfernen. Bei geteiltem Webserver stattdessen
den tatsächlichen Hostnamen und die vorhandene Default-/Proxy-Konfiguration berücksichtigen.

### Aktivieren, auch bei Updates

Alten `current`-Link mit `readlink -f /var/www/home-technik/current` erfassen und im Deployment-Ergebnis
als Rollback-Pfad speichern. Wenn `current` ein echtes Verzeichnis ist, stoppen und die Herkunft prüfen.
Vorhandenes `.current-next` ebenfalls untersuchen, statt es zu überschreiben.

```bash
nginx -t
test ! -e /var/www/home-technik/.current-next
test ! -L /var/www/home-technik/.current-next
if test -e /var/www/home-technik/current && ! test -L /var/www/home-technik/current; then
  echo 'current ist kein Symlink'; exit 1
fi
ln -s "/var/www/home-technik/releases/$RELEASE" /var/www/home-technik/.current-next
mv -Tf /var/www/home-technik/.current-next /var/www/home-technik/current
systemctl enable --now nginx
systemctl reload nginx
systemctl is-active nginx
curl --fail --silent --show-error http://127.0.0.1/ -o /tmp/home-technik-served.html
cmp /tmp/home-technik-served.html /var/www/home-technik/current/index.html
```

Für eine Hostnamen-Site bei curl den passenden `Host`-Header mitgeben. Wenn Aktivierung oder Reload
fehlschlagen, Zustand untersuchen und alten Link/alte Konfiguration wiederherstellen.

## 4. Abnahme im Heimnetz

- Von einem anderen WLAN-Gerät die endgültige URL aufrufen; Homepage und Hausakte öffnen.
- Einen tatsächlichen `/assets/…js`-Pfad aus `index.html` sowie den PDF-Worker prüfen: Status 200,
  korrekter JavaScript-Content-Type, kein HTML. Auch Schrift, Favicon und PDF-Ausgabe testen.
- Zufällige nicht vorhandene Datei unter `/assets/` abrufen: Status 404. `index.html` soll `no-cache`,
  gehashte Assets sollen `immutable` liefern.
- Am alten Origin JSON exportieren/prüfen, am neuen importieren; Hausdaten nach Neuladen überprüfen.
- Safari: Touch, Hausakte, JSON-Export, PDF und QR-Ziel prüfen. Alternativ WebKit-Test gegen die neue URL
  ausführen (`IPAD_BASE_URL`), tatsächlichen iPad-Test dann als offen benennen.
- Autostart mit `pct config` und `systemctl is-enabled nginx` prüfen. Neustart nur im vereinbarten
  Wartungsumfang testen. Kein Host-Neustart zur Überprüfung eines Webservers nötig.

## 5. Update und Rollback

Update: Browser-Projektdatei sichern, neuen Commit separat bauen und über obige Release-Schritte einspielen.
Unveränderte Nginx-Site nicht erneut installieren. Commit, Archivprüfsumme, vorherigen Release-Pfad und
Testergebnis dokumentieren. Keine Updates automatisch aus einem beweglichen Branch ohne zugehörigen Commit bauen.

Rollback im LXC: `PREVIOUS_RELEASE` aus dem aufgezeichneten früheren Commit setzen, Existenz prüfen und
denselben atomaren Linkwechsel ausführen. Kein Löschen des fehlerhaften Releases nötig:

```bash
set -euo pipefail
[[ "${PREVIOUS_RELEASE:-}" =~ ^[0-9a-f]{40}$ ]] || exit 1
test -s "/var/www/home-technik/releases/$PREVIOUS_RELEASE/index.html"
test ! -e /var/www/home-technik/.current-next
test ! -L /var/www/home-technik/.current-next
ln -s "/var/www/home-technik/releases/$PREVIOUS_RELEASE" /var/www/home-technik/.current-next
mv -Tf /var/www/home-technik/.current-next /var/www/home-technik/current
nginx -t
systemctl reload nginx
curl --fail --silent --show-error http://127.0.0.1/ -o /tmp/home-technik-rollback.html
cmp /tmp/home-technik-rollback.html /var/www/home-technik/current/index.html
```

Wenn Nginx-Konfiguration geändert wurde, auch deren gesicherte Version wiederherstellen und erneut prüfen.
Browser neu laden; ältere App-Versionen können neue Projektformate möglicherweise nicht lesen.
Vor einer Datenwiederherstellung zunächst auch den aktuellen Datenstand exportieren.

## Quellen und Versionsprüfung

Beim Einsatz die installierte Proxmox-Version mit deren Hilfe (`pct help create`, `pveam help`) abgleichen.
Template-Namen nicht aus alten Beispielen übernehmen.

- [Proxmox Container Toolkit](https://pve.proxmox.com/pve-docs/pct.1.html)
- [Proxmox Templateverwaltung](https://pve.proxmox.com/pve-docs/pveam.1.html)
- [Nginx: statische Dateien](https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/)
- [Vite: Produktionsbuild und Grenzen von Preview](https://vite.dev/guide/static-deploy.html)
