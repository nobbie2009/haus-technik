---
name: home-technik-proxmox-lxc
description: Home-Technik aus nobbie2009/haus-technik in einem Proxmox-LXC im Heimnetz bereitstellen, aktualisieren und auf einen vorherigen App-Stand zurücksetzen. Verwenden für Deployment, LXC-Einrichtung und Betriebsprüfung dieses Projekts.
---

# Home-Technik auf Proxmox LXC

Stelle den geprüften statischen Produktionsbuild mit Nginx in einem unprivilegierten Debian-LXC bereit.
Repository: https://github.com/nobbie2009/haus-technik, Standardbranch derzeit `master`.
Lies vor Änderungen die tatsächliche `package.json`, Lockdatei, Vite-Konfiguration und Projektregeln.

## Auftrag und Ziel klären

Unterscheide Skill-/Anleitungserstellung von einem Auftrag zum tatsächlichen Deployment.
Nur bei beauftragtem Deployment den Server verändern. Vorhandene Autorisierung weiterverwenden.
Fehlen Zugang oder Zielangaben, bereite Build und Konfiguration vor und frage gezielt nach:

- Proxmox-Host und nutzbarem SSH-Zugang; keine Passwörter oder Tokens ins Repository schreiben.
- Neuer oder bestehender Container, CT-ID, Storage, Bridge/VLAN sowie freie IP mit Gateway oder DHCP-Reservierung.
- Dauerhafter WLAN-Adresse und gegebenenfalls vorhandenem Reverse Proxy.

Verfügbare Werte zuerst lesend ermitteln. Keine CT-ID, IP, Bridge oder Storage-Namen als gegeben annehmen.
Bei vorhandenem LXC dessen Dienste und Daten prüfen; nicht neu erstellen oder ungefragt ersetzen.
Eine fehlgeschlagene Containererstellung vor Wiederholung mit `pct list`/`pct config` untersuchen.

## Projektbesonderheiten

- React/Vite-App: `npm ci`, `npm run check`, `npm run build`; Ausgabe `dist/`.
  Node-Version aus `.nvmrc`/`engines` verwenden (zur Erstellung dieses Skills: 24).
  Node nur auf dem Build-Rechner nötig. Kein Vite-Entwicklungs- oder Preview-Server als Dauerdienst.
- Kein Backend, keine serverseitige Hausdatenbank und kein automatischer PC/iPad-Abgleich.
  IndexedDB und Sicherungsnachweise liegen im jeweiligen Browser unter der jeweiligen Origin.
- Vor Wechsel von Host, Port oder HTTP zu HTTPS am alten Ziel JSON exportieren und prüfen.
  Am neuen Ziel unter **Hausakte → Sicherung & Gerätewechsel** importieren.
  Ein LXC-Backup sichert die App, aber nicht die Hausdaten auf PC und iPad.
- QR-Aufkleber benötigen die dauerhafte neue Adresse und das passende importierte Projekt.
  Alte Aufkleber erst ersetzen, wenn der neue Zugriff funktioniert.
- Standardumfang ist das Heimnetz. Keine Router-Portfreigaben, öffentliche Domain oder Cloud-Synchronisierung
  aus einem LXC-Auftrag ableiten. HTTPS über vorhandenen Proxy nur passend zum Auftrag einrichten.
- Bei HTTPS einen vorhandenen Home-Assistant-Zugriff gesondert prüfen: HTTP-Endpunkte können durch
  Mixed-Content blockiert sein. Keine Tokens in die statischen Dateien einbauen.

## Ablauf

Für neue Installationen bevorzugt das interaktive [install.sh](scripts/install.sh) auf dem Proxmox-Host
ausführen. Es fragt CT-ID, Hostname, Storages, vorhandenes Debian-Template, Netzwerk einschließlich
VLAN/DNS, Ressourcen und Zieladresse ab. Es erstellt ausschließlich einen neuen Container und zeigt
vorher die vollständige Zusammenfassung. Keine weiteren Rückfragen des Assistenten nötig, wenn der Nutzer
die Daten direkt im Skript eingeben möchte. Den ganzen Skill bereitstellen, nicht nur die Shell-Datei.

Im LXC zeigt `/usr/local/bin/Update` auf [update.py](scripts/update.py). `Update` prüft das neueste stabile
GitHub-Release und fragt vor Installation; `Update --check` prüft nur, `Update --rollback` aktiviert den
vorherigen App-Stand. Downloads werden per SHA-256 geprüft; Releases kommen aus erfolgreicher Projekt-CI.
Die App prüft beim Start und stündlich auf neue Releases, installiert aber nicht selbst.
Versionen bei jedem ausgelieferten Update erhöhen; `AGENTS.md` und CI-Versionsprüfung beachten.

Für die konkreten Befehle [Deployment und Betrieb](references/deployment.md) lesen.
Die [Nginx-Vorlage](assets/home-technik.conf) ist für einen dedizierten Debian-LXC an der URL-Wurzel gedacht.
Vorhandene Sites und Reverse Proxies gezielt integrieren; fremde Konfiguration nicht pauschal überschreiben.

1. Zielsystem inventarisieren und endgültige Adresse bestimmen. Für einen reinen Webserver sind
   1 vCPU, 512 MB RAM und 4 GB Disk ein Ausgangspunkt; an Template und vorhandene Ressourcen anpassen.
   Kein privilegierter Container, Docker, Nesting oder Host-Mount nötig.
2. Eindeutigen Git-Commit bauen und prüfen. Nur `dist/` und die Nginx-Konfiguration übertragen.
3. Release in eigenes Verzeichnis installieren, Konfiguration mit `nginx -t` prüfen, dann aktivieren.
   Vorherigen Release-Pfad und vorhandene Konfiguration für Rollback erhalten.
4. HTTP, JavaScript/MIME-Typen, PDF-Worker, Schrift und fehlende Dateien prüfen. Anschließend im WLAN
   Hausakte, JSON-Import/-Export, PDF-Ausgabe und QR-Ziel testen, möglichst in Safari auf dem iPad.
5. Bei Fehlern alten Release aktivieren und Ursache untersuchen. Keine Browserdaten löschen.
   Ein App-Rollback macht zwischenzeitliche Projektdatenänderungen oder Schema-Migrationen nicht rückgängig.

Zum Abschluss tatsächlichen Commit, CT-ID, Adresse, Autostart, Testergebnisse und Rollback-Pfad nennen.
Nicht ausgeführte Server-/iPad-Tests ausdrücklich offen lassen. Ein Skill oder erfolgreicher Build allein
ist kein erfolgreiches Deployment.
