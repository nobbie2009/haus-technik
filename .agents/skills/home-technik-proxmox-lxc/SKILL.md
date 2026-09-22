---
name: home-technik-proxmox-lxc
description: Home-Technik aus nobbie2009/haus-technik in einem Proxmox-LXC im Heimnetz bereitstellen, aktualisieren und auf einen vorherigen App-Stand zurücksetzen. Verwenden für Deployment, LXC-Einrichtung, Betriebsprüfung und die Pflege der Benutzeranleitung bei Home-Technik-Updates.
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
- Ab 0.48.0 optionaler Projektdienst für den gemeinsamen PC/iPad/iPhone-Stand: nach `Update`
  einmalig `Update --setup-projects` im LXC. Eigener Zugriffsschlüssel, Python/SQLite auf Loopback 9088,
  Nginx-Weiterleitung und unprivilegierter systemd-Dienst. Der Update-Dienst bleibt getrennt.
  Einrichtung, Schlüsselwechsel und Sicherung: [Betriebsanleitung](references/deployment.md).
  Ab 0.57.0 setzt `/usr/local/bin/Update --set-project-key` eine eigene Passphrase durch verdeckte
  doppelte Eingabe. Die App kann den Zugang ausdrücklich auf dem eigenen Gerät merken und entfernen.
  Eigene Schlüssel werden mit gesalzenem PBKDF2-SHA256 gespeichert; alte zufällige Schlüssel bleiben gültig.
  IndexedDB und lokale Sicherungsnachweise bleiben unter der jeweiligen Browser-Origin.
- Vor Wechsel von Host, Port oder HTTP zu HTTPS am alten Ziel JSON exportieren und prüfen.
  Am neuen Ziel unter **Hausakte → Sicherung & Gerätewechsel** importieren.
  Ein LXC-Backup sichert auch den eingerichteten Projektdienst, aber keine ausschließlich lokalen
  beziehungsweise noch nicht abgeglichenen Browserdaten. JSON-Sicherungen weiterhin erstellen.
- QR-Aufkleber benötigen die dauerhafte neue Adresse und das passende importierte Projekt.
  Alte Aufkleber erst ersetzen, wenn der neue Zugriff funktioniert.
- Standardumfang ist das Heimnetz. Keine Router-Portfreigaben, öffentliche Domain oder Cloud-Synchronisierung
  aus einem LXC-Auftrag ableiten. HTTPS über vorhandenen Proxy nur passend zum Auftrag einrichten.
- Bei HTTPS einen vorhandenen Home-Assistant-Zugriff gesondert prüfen: HTTP-Endpunkte können durch
  Mixed-Content blockiert sein. Keine Tokens in die statischen Dateien einbauen.

## Benutzeranleitung bei jedem Update mitpflegen

Die Anleitung ist Bestandteil jedes Home-Technik-Updates. Bei der Vorbereitung einer Änderung
die betroffenen Bedienabläufe mit dem tatsächlichen Code und der Oberfläche abgleichen und die
Dokumentation im selben Änderungsstand aktualisieren:

- Hauptquelle: `docs/handbuch.md`; eingebundene Fachtexte unter `docs/` ebenfalls berichtigen.
  Neue Funktionen, geänderte Schaltflächen, Arbeitsschritte, Voraussetzungen und Grenzen erklären.
  Überholte Aussagen entfernen. Bei rein internen Änderungen ohne Bedienauswirkung genügt eine
  Prüfung; keine künstlichen Anleitungstexte hinzufügen.
- Betroffene FAQ-Antworten, Suchbegriffe, A–Z-Verweise und Kapitelverknüpfungen mitführen.
  Stabile Kapitelkennungen erhalten, damit bestehende Links weiter funktionieren.
- Bildschirmbilder unter `public/handbuch/bilder/` bei relevanten sichtbaren Änderungen erneuern
  beziehungsweise ergänzen. Nur fiktive Beispieldaten verwenden. Bildunterschriften und tatsächliche
  Aufnahmeversion konsistent halten; ältere unverändert passende Bilder dürfen gekennzeichnet bleiben.
  Die Versionskennzeichnung der Bilder wird auch in `scripts/build-handbook.mjs` erzeugt.
- `npm run handbook:build` ausführen und anschließend mit `npm run build` das Handbuch im Release
  erzeugen. `public/handbuch/index.html` ist eine generierte, nicht einzucheckende Datei.
  Kapitelverweise und Bilddateien werden beim Erzeugen geprüft. Bei Änderungen an Navigation, Suche,
  Bildern oder Layout passende Handbuch-Browsertests aus `tests/e2e/handbook.spec.ts` und
  `tests/ipad/handbook.spec.ts` ausführen; geänderte Abbildungen visuell kontrollieren.
- Kapitel-/Bildanzahlen in README, Handbuchtests und Begleittexten bei Umfangsänderungen anpassen.
  Ein mitgeliefertes Offline-ZIP nach Änderungen neu erzeugen. Die Build-Version kommt aus
  `package.json`; Versionsnummern und deutsches Changelog nach den Projektregeln pflegen.

Bei der reinen Installation eines bereits veröffentlichten Releases die mitgelieferte Anleitung
auf Erreichbarkeit und passende Version prüfen. Fehlende Korrekturen im Repository und einem
neuen Release nachführen, statt die produktive Anleitung unabhängig vom Release zu verändern.
Zum Abschluss kurz nennen, welche Anleitungsteile aktualisiert wurden oder dass die Prüfung
keinen inhaltlichen Anpassungsbedarf ergeben hat.

## Ablauf

Für neue Installationen bevorzugt das interaktive [install.sh](scripts/install.sh) auf dem Proxmox-Host
ausführen. Es schlägt eine freie CT-ID vor und bietet aktive Storages mit freiem Platz, Debian-Templates
und Bridges als nummerierte Auswahl an. Fehlende Templates können nach Bestätigung heruntergeladen werden.
Es fragt außerdem Hostname und Netzwerk einschließlich
VLAN/DNS, Ressourcen und Zieladresse ab. Es erstellt ausschließlich einen neuen Container und zeigt
vorher die vollständige Zusammenfassung. Keine weiteren Rückfragen des Assistenten nötig, wenn der Nutzer
die Daten direkt im Skript eingeben möchte. Den ganzen Skill bereitstellen, nicht nur die Shell-Datei.

Im LXC zeigt `/usr/local/bin/Update` auf [update.py](scripts/update.py). `Update` prüft das neueste stabile
GitHub-Release und fragt vor Installation; `Update --check` prüft nur, `Update --rollback` aktiviert den
vorherigen App-Stand. Downloads werden per SHA-256 geprüft; Releases kommen aus erfolgreicher Projekt-CI.
Die App prüft beim Start und stündlich auf neue Releases, installiert aber nicht selbst.
Ab 0.23.0 kann der Nutzer die Installation in der App mit einem Update-Passwort starten.
Der Installer fragt dieses ab (leer erzeugt ein zufälliges Passwort) und richtet einen nur auf Loopback
gebundenen Python-Dienst mit festem Update-Befehl hinter Nginx ein. Bestehende Installationen nach `Update`
einmalig mit `Update --setup-web` nachrüsten. Kein Passwort im Browser speichern oder ins Repository schreiben.
Im App- und PDF-Footer müssen Name, Build-Version und `Copyright by nobbie2009` erhalten bleiben.
Versionen bei jedem ausgelieferten Update erhöhen; `AGENTS.md` und CI-Versionsprüfung beachten.

Für die konkreten Befehle [Deployment und Betrieb](references/deployment.md) lesen.
Die [Nginx-Vorlage](assets/home-technik.conf) ist für einen dedizierten Debian-LXC an der URL-Wurzel gedacht.
Vorhandene Sites und Reverse Proxies gezielt integrieren; fremde Konfiguration nicht pauschal überschreiben.

1. Zielsystem inventarisieren und endgültige Adresse bestimmen. Für einen reinen Webserver sind
   1 vCPU, 512 MB RAM und 4 GB Disk ein Ausgangspunkt; an Template und vorhandene Ressourcen anpassen.
   Kein privilegierter Container, Docker, Nesting oder Host-Mount nötig.
2. Anleitung gemäß obigem Abschnitt prüfen und gegebenenfalls aktualisieren. Eindeutigen Git-Commit
   bauen und prüfen. Nur `dist/` und die Nginx-Konfiguration übertragen.
3. Release in eigenes Verzeichnis installieren, Konfiguration mit `nginx -t` prüfen, dann aktivieren.
   Vorherigen Release-Pfad und vorhandene Konfiguration für Rollback erhalten.
4. HTTP, JavaScript/MIME-Typen, PDF-Worker, Schrift und fehlende Dateien prüfen. Anschließend im WLAN
   Hausakte, JSON-Import/-Export, PDF-Ausgabe, QR-Ziel und `handbuch/index.html` testen,
   möglichst in Safari auf dem iPad. Im Handbuch Version, Bilder und eine Stichwortsuche prüfen.
5. Bei Fehlern alten Release aktivieren und Ursache untersuchen. Keine Browserdaten löschen.
   Ein App-Rollback macht zwischenzeitliche Projektdatenänderungen oder Schema-Migrationen nicht rückgängig.

Zum Abschluss tatsächlichen Commit, CT-ID, Adresse, Autostart, Testergebnisse und Rollback-Pfad nennen.
Nicht ausgeführte Server-/iPad-Tests ausdrücklich offen lassen. Ein Skill oder erfolgreicher Build allein
ist kein erfolgreiches Deployment.
