# Home-Technik auf Unraid

Ab Version 0.64.0 gibt es ein fertiges Docker-Image für **Linux/amd64**, einschließlich Webserver, Handbuch und Projektdienst. Auf dem Unraid-Server sind weder Node.js noch Python zu installieren. Proxmox wird nicht benötigt. Containerport: 8080; Beispiel-Hostport: 8088. Den Hostport bei Belegung ändern.

## Installation

1. Docker in Unraid aktivieren. Im Unraid-Terminal die folgenden Befehle ausführen. Sie laden ein festes Release und prüfen dessen SHA-256-Prüfsumme vor dem Import. Es werden keine fremden Container verändert.

   ```bash
   mkdir -p /mnt/user/appdata/home-technik-install
   cd /mnt/user/appdata/home-technik-install
   VERSION=0.64.0
   BASE="https://github.com/nobbie2009/haus-technik/releases/download/v$VERSION"
   curl -fL --retry 3 -O "$BASE/home-technik-docker-$VERSION.tar.gz"
   curl -fL --retry 3 -O "$BASE/home-technik-docker-$VERSION.tar.gz.sha256"
   sha256sum -c "home-technik-docker-$VERSION.tar.gz.sha256" && docker load -i "home-technik-docker-$VERSION.tar.gz"
   ```

   Nur nach erfolgreicher Prüfsumme und Ausgabe `Loaded image: home-technik:0.64.0` fortfahren. Der Download ist ein Docker-Image, nicht das separate LXC-Installationspaket.

2. Den **neuen, leeren** Datenordner vorbereiten. Bei vorhandenen Daten zuerst sichern und Eigentümer prüfen; keine pauschalen rekursiven Rechteänderungen durchführen.

   ```bash
   mkdir -p /mnt/user/appdata/home-technik
   chown 10001:10001 /mnt/user/appdata/home-technik
   chmod 700 /mnt/user/appdata/home-technik
   mkdir -p /boot/config/plugins/dockerMan/templates-user
   curl -fL --retry 3 -o /boot/config/plugins/dockerMan/templates-user/my-home-technik.xml "$BASE/home-technik.xml"
   ```

3. Unter **Docker → Container hinzufügen** die Vorlage **home-technik** auswählen. Datenpfad und freien Hostport prüfen und anwenden. Das Image wurde bereits lokal geladen; ein Registry-Download ist nicht erforderlich. Privilegierten Modus ausgeschaltet lassen. Anschließend Autostart aktivieren.
4. In der Unraid-Konsole des laufenden Containers ausführen:

   ```bash
   python /app/start.py --set-key
   ```

   Einen eigenen Schlüssel mit 12–256 Zeichen zweimal verdeckt eingeben, sicher aufbewahren und den Container neu starten. Alternativ vom Unraid-Terminal: `docker exec -it home-technik python /app/start.py --set-key`. Der Schlüssel gilt für alle gemeinsamen Projekte dieses Servers. Ohne Einrichtung bleibt der Projektdienst gesperrt; die lokale App funktioniert bereits.

5. Die **WebUI** öffnen, zum Beispiel `http://UNRAID-SERVER:8088/`. Unter **Hausakte → Gemeinsame Projekte** mit dem Schlüssel verbinden. Ein Testprojekt hochladen und auf einem zweiten Gerät abrufen.

## Kontrolle nach der Installation

```bash
docker inspect --format '{{.State.Health.Status}}' home-technik
docker logs --tail 30 home-technik
```

Nach etwa 30 Sekunden muss der Zustand `healthy` sein. Zusätzlich `/version.json` und `/handbuch/index.html` unter derselben App-Adresse öffnen. Die Version muss zur geladenen Version passen. Nach einem Containerneustart müssen gemeinsame Projekte weiter abrufbar sein.

Bei `Permission denied` den Eigentümer des Datenordners prüfen (10001:10001). Bei belegtem Port einen anderen Hostport wählen. Bei einem Downloadversuch gegen Docker Hub kontrollieren, ob das Image geladen ist und das Feld **Repository** exakt `home-technik:0.64.0` lautet. Ein Registry-Updatecheck ist bei diesem lokal importierten Image nicht vorgesehen.

## Updates und Rückkehr zur vorherigen Version

1. Offene Eingaben speichern und Projekte als JSON exportieren. Den Container stoppen und den gesamten Datenordner sichern, einschließlich `auth.json` und etwaiger SQLite-Begleitdateien. Danach wieder starten.
2. Das neue Docker-Image wie oben mit der neuen Versionsnummer herunterladen, Prüfsumme prüfen und laden.
3. In Unraid den Container bearbeiten, **Repository** auf `home-technik:NEUE-VERSION` ändern und anwenden. Datenpfad, Hostport und Autostart beibehalten. Die bestehende Vorlage muss nicht erneut heruntergeladen werden.
4. Gesundheitszustand, Version und Projekte prüfen. Offene Browser-Tabs neu laden; alte Tabs können noch Dateien des vorherigen Images erwarten.

Die Installation über die App und der LXC-Befehl `Update` werden im Docker-Betrieb nicht verwendet. Das neue Image wird bewusst über Unraid aktiviert. Für einen App-Rollback das vorherige lokal vorhandene Image im Repository-Feld auswählen. Ein App-Rollback setzt keine Hausdaten zurück; falls nötig die vorher erstellte Datensicherung bei gestopptem Container wiederherstellen. Alte Images erst nach erfolgreicher Kontrolle entfernen.

## Daten, HTTPS und Umzug

- Nur gemeinsame, bereits hochgeladene Projekte liegen im Datenordner. Ausschließlich lokale Projekte bleiben im Browser. Regelmäßig JSON-Sicherungen exportieren.
- Vor einem Wechsel von Adresse, Port oder HTTP zu HTTPS am alten Ziel Projekte exportieren und am neuen Ziel importieren beziehungsweise mit dem Projektdienst verbinden. Lokale Browserdaten werden nicht automatisch übernommen.
- Für GPS und Mikrofon auf Mobilgeräten HTTPS über einen vorhandenen Reverse Proxy verwenden. Die App an der URL-Wurzel betreiben; `/api/home-technik-projects` muss mit weitergeleitet werden. Originalen Host inklusive Port erhalten und ausreichend große Uploads (24 MB) zulassen. Den gesamten Zugriff einschließlich HTML und API über dieselbe Adresse führen.
- Der Container benötigt keinen Docker-Socket und keine privilegierten Rechte. Die Projektdaten verlassen den eigenen Server nicht durch einen externen Synchronisationsdienst.

## Umfang der automatisierten Installationsprüfung

Die Releaseprüfung baut und startet das Linux-Image mit leerem persistentem Volume. Sie prüft Weboberfläche, Version, Handbuch, JavaScript, PDF-Worker, Zugriffsschutz, Schlüsselwechsel, Projektschreiben und Konflikterkennung sowie Datenbestand nach Containerersetzung. Das geprüfte Image wird als Release-Datei veröffentlicht. Die Bedienung der Unraid-Oberfläche und ein realer HTTPS-/iPad-Zugriff sind ergänzend auf dem Zielgerät zu prüfen.
