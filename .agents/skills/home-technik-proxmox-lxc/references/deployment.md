# Deployment und Betrieb

## Bevorzugt: interaktiver Installer und Update-Befehl

Den vollständigen Repository-Checkout auf dem Proxmox-Host bereitstellen. Als root:

```bash
bash .agents/skills/home-technik-proxmox-lxc/scripts/install.sh
```

Ab 0.24.0 führt der Installer mit nummerierten Auswahllisten durch die Einrichtung:

- Freie Container-ID wird von Proxmox vorgeschlagen; Enter übernimmt sie.
- Für die Container-Disk werden nur aktive Speicher mit Rootfs-Unterstützung angezeigt,
  für Templates nur aktive Template-Speicher, jeweils mit Typ und freiem Platz in GiB.
  Es werden vorhandene Proxmox-Speicher verwendet, keine physischen Festplatten formatiert.
- Vorhandene Debian-Standard-Templates auswählen oder **Debian-Template herunterladen** wählen.
  Dabei wird der Proxmox-Katalog aktualisiert; der eigentliche Download erfolgt erst nach der
  abschließenden Bestätigung. Die Katalogliste zeigt neuere Versionen zuerst; die gewählte
  Debian-Version muss vom installierten Proxmox unterstützt werden.
- Netzwerk-Bridge aus vorhandenen Linux-Bridges auswählen. In den Listen übernimmt Enter
  den ersten Eintrag, `q` bricht ab; falsche Nummern werden erneut abgefragt.
- Hostname, VLAN, DHCP oder feste IPv4/CIDR mit Gateway, DNS, CPU, RAM, Diskgröße und
  Browseradresse abfragen. Vorgaben: DHCP, 1 CPU, 512 MB RAM und 4 GB Disk.
- Update-Passwort eingeben oder leer lassen, um eines sicher zu erzeugen. Am Ende sicher aufbewahren.

Vor der Container-Erstellung werden alle Einstellungen zusammengefasst und mit `ja` bestätigt.
Der Aufruf erfolgt direkt auf dem Proxmox-Host; Hostpasswort und SSH-Schlüssel sind deshalb nicht nötig.
Belegte IDs werden auch gegen den Proxmox-Cluster geprüft. Fehlende Speicher oder Bridges sowie
Downloadfehler beenden die Installation vor der Container-Erstellung. DNS/Paketquellen und GitHub
müssen aus dem neuen Container erreichbar sein.

Befehlsgrundlagen: [Proxmox Storage Manager](https://pve.proxmox.com/pve-docs/pvesm.1.html)
und [Proxmox Template Manager](https://pve.proxmox.com/pve-docs/pveam.1.html).

Der Installer lädt das neueste vollständige GitHub-Release, das erst nach erfolgreichen CI-Prüfungen
veröffentlicht wird. Er richtet Nginx und den Symlink `/usr/local/bin/Update` auf
`/opt/home-technik/update.py` ein. Im Container als root:

```bash
Update --check
Update
Update --rollback
```

Diese Befehle einzeln nach Bedarf verwenden, nicht als gemeinsame Installationsfolge.
`Update` zeigt alte/neue Version und fragt vor der Installation; `--yes` erlaubt ausdrücklich
unbeaufsichtigte Installation. `--check` ändert keine App-Dateien. `--rollback` fragt vor dem Wechsel
auf das vorherige Release. Vom Proxmox-Host zuerst `pct enter CT-ID` verwenden; für eine rein lesende
Prüfung ist `pct exec CT-ID -- Update --check` möglich.

Downloads sind an das Repository gebunden, werden per SHA-256 geprüft und ohne Archiv-Symlinks entpackt.
Ein Prozess-Lock verhindert parallele Updates. Der atomare `current`-Wechsel wird mit HTTP geprüft;
bei Fehlern wird ein vorhandener vorheriger Stand wieder aktiviert. Nach einem Rollback kann das bereits
vorhandene neuere Release nur dann wiederverwendet werden, wenn alle Dateien dem geprüften Paket entsprechen.
Der Updater selbst wird bei erfolgreichem Update ebenfalls erneuert. Releases/Assets bleiben erhalten.

Die App fragt beim Öffnen und einmal pro Stunde bei sichtbarem Fenster die GitHub-Release-API ab;
parallel prüft sie `version.json` auf dem eigenen Server. Sie unterscheidet „Update verfügbar“ von einer
bereits installierten neuen Serverversion. Keine automatische Installation oder erzwungenes Neuladen.
Bei Netzfehlern oder API-Limit bleibt die App bedienbar; manuelle Prüfung über die Versionsanzeige.

Pro Änderung `npm version patch --no-git-tag-version` (bei Funktionen entsprechend `minor`) verwenden,
deutsches Changelog aktualisieren und beide Paketdateien committen. CI lehnt unveränderte/rückläufige
Versionen gegenüber dem vorherigen Push beziehungsweise PR-Basisstand ab. Bereits veröffentlichte Releases
werden nicht überschrieben. Der Installer benötigt mindestens das Release 0.22.0.

### Updates in der App ab 0.23.0

Der Installer richtet `home-technik-update.service` ein. Der Python-Dienst lauscht ausschließlich
auf `127.0.0.1:9087`; Nginx leitet nur `/api/home-technik-update` dorthin weiter. Er akzeptiert einen
festen Update-Befehl, keine frei wählbaren Shellbefehle, URLs oder Dateipfade. Das Update-Passwort wird
mit Salt und PBKDF2 im LXC gespeichert, nicht im Browser. Fehlversuche werden begrenzt und parallele
Installationen abgewiesen. Das ist für das vertrauenswürdige Heimnetz vorgesehen; bei HTTP wird auch
die Passwortanfrage nicht transportverschlüsselt. Bei vorhandenem HTTPS-Proxy dessen Adresse benutzen.

Bestehender LXC: zuerst `Update`, danach einmalig `Update --setup-web`. Dieser Dialog fragt das Passwort ab
und ersetzt nach Bestätigung die verwaltete Nginx-Site; angepasste Proxy-/Hostnamenkonfiguration vorher
prüfen. Die vorherige Site wird gesichert. Danach die Versionsanzeige in der App öffnen, Passwort eingeben
und **Update installieren** drücken. Der Fortschritt wird abgefragt; nach Erfolg bewusst **Neue Version laden**.
Die API startet nach einem erfolgreichen Update neu und behält das Ergebnis für die Anzeige.

Diagnose: `systemctl status home-technik-update`, `journalctl -u home-technik-update` sowie
`/var/log/home-technik-update.log`. Bei vergessenem Passwort im LXC die Auth-Datei
`/var/lib/home-technik/update-auth.json` gezielt umbenennen und `Update --setup-web` erneut ausführen.
Die App-Version ändert sich bei Updates, Hausdaten und ihre Schema-Version werden dadurch nicht automatisch
zurückgesetzt. Ein Proxmox-Backup ersetzt die JSON-Sicherung aus dem Browser nicht.

Bei fehlgeschlagener Erstinstallation bleibt der Container zur Diagnose erhalten. Nicht wiederholt mit
derselben belegten ID starten. Netzwerk, Paketinstallation und den letzten erfolgreichen Schritt prüfen;
wenn `Update` samt Verwaltungsmarker schon eingerichtet ist, kann dessen Erstinstallation erneut gestartet
werden. Keine Container oder Releaseverzeichnisse automatisch entfernen.

## Gemeinsame Projekte ab 0.48.0

Nach dem App-Update im LXC als root `Update --setup-projects` ausführen. Der Befehl legt
einen unprivilegierten Dienstbenutzer an, installiert `home-technik-projects.service` und erzeugt
einen eigenen zufälligen Zugriffsschlüssel. Diesen einmal angezeigten Schlüssel sicher aufbewahren;
bei der ersten Einrichtung nach einem älteren Updater werden fehlende Dienstdateien aus dem geprüften
Paket genau der installierten Version nachgeladen. Dafür muss GitHub erreichbar sein.
Auf dem Server liegt nur dessen Hash. Er ist unabhängig vom Update-Passwort.
Die verwaltete Nginx-Site wird mit vorheriger Sicherung ersetzt und geprüft. Eigene Anpassungen
an HTTPS oder Reverse-Proxy vorher mit der Vorlage abgleichen. Keine öffentliche Freigabe einrichten.

Auf jedem Gerät dieselbe App-Adresse öffnen: **Hausakte → Gemeinsame Projekte**. Schlüssel eingeben,
verbinden, auf eigenen Geräten **Auf diesem Gerät merken** aktivieren und auf dem ersten Gerät **Aktuelles Projekt erstmals bereitstellen** wählen. Auf weiteren
Geräten **Serverstand prüfen** und **Serverstand übernehmen und verbinden** wählen. Der Schlüssel bleibt
ohne Merken-Option in der Tab-Sitzung, mit Option dauerhaft im Browserprofil dieser App-Adresse. Er steht
nicht in der Projektdatei. **Gespeicherten Zugang entfernen** entfernt ihn wieder. Nur eigene Geräte verwenden.
Für verschlüsselte Übertragung die vorhandene HTTPS-Adresse benutzen.

Verbundene lokale Änderungen werden bei sichtbarem Tab alle zehn Sekunden hochgeladen. Neue Serverstände
werden zur bewussten Übernahme angeboten. Bei gleichzeitigen Änderungen bleibt der lokale Entwurf erhalten;
zunächst als Datei sichern, dann den Serverstand prüfen. Vor der Übernahme wird zusätzlich ein benannter
lokaler Versionsstand erzeugt. Eine automatische Zusammenführung erfolgt nicht. Ohne Netz kann in der
bereits geöffneten App weitergearbeitet werden; ein Offline-Neustart der App wird nicht zugesichert.

Der Dienst lauscht auf `127.0.0.1:9088`; Nginx führt `/api/home-technik-projects` dorthin.
Hausdaten liegen in `/var/lib/home-technik-projects/projects.sqlite3`, der Schlüsselhash in `auth.json`.
Pro Projekt bleiben die letzten 20 ersetzten Serverstände in der Datenbank; diese Historie hat noch
keinen Wiederherstellungsdialog. JSON-Exporte und benannte Browserstände bleiben die bedienbaren Sicherungen.
Für eine Dateisicherung den Dienst vorher stoppen, das gesamte Datenverzeichnis mit erhaltenen
Eigentümern/Rechten sichern und den Dienst wieder starten. Alternativ die SQLite-Backup-API verwenden;
nicht nur die laufende Hauptdatei ohne WAL kopieren. Ein App-Rollback verändert die Hausdaten nicht.

Diagnose: `systemctl status home-technik-projects`, `journalctl -u home-technik-projects`.
`Update --reset-project-key` widerruft den bisherigen Schlüssel und erzeugt einen neuen; alle Geräte
müssen neu verbunden werden. Der Schlüssel gewährt Zugriff auf alle Projekte dieses Hausservers.

Ab 0.57.0 erlaubt `/usr/local/bin/Update --set-project-key` stattdessen eine eigene Passphrase:
12 bis 128 druckbare ASCII-Zeichen, ohne Rand-Leerzeichen. Mehrere Wörter sind möglich.
Der Dialog fragt zweimal verdeckt; keine Schlüssel als Befehlsargument oder in Shell-History schreiben.
Der Dienst speichert einen zufälligen Salt und PBKDF2-SHA256 mit 600.000 Iterationen; bestehende
SHA-256-Hashes zufälliger Schlüssel bleiben kompatibel. Der Schlüsselwechsel ersetzt die Auth-Datei
atomar und startet ausschließlich den Projektdienst neu. Datenbank und Nginx-Konfiguration bleiben erhalten.
Bei fehlgeschlagenem Neustart wird die bisherige Auth-Datei wiederhergestellt. Alle Geräte danach neu verbinden.

Es gibt keine getrennten Benutzerkonten. Home-Assistant-Zugangsdaten und die lokale übergreifende
Gerätebibliothek werden nicht als eigene Serverdaten synchronisiert.

## Manueller Weg für Sonderfälle

Die folgenden Schritte dienen vorhandenen Umgebungen oder separat vorbereiteten Builds.
Sie installieren den Update-Symlink nicht automatisch. Einen vorhandenen Container erst nach Inventarisierung
gezielt auf den Installer-Verzeichnisaufbau umstellen; der interaktive Installer übernimmt ihn nicht.

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
