# iPad-Bedienung ab 0.13.0

Ziel ist Safari auf einem aktuellen iPadOS, im Hoch- und Querformat sowie im Split View ab 600 px.
Die automatisierte Prüfung verwendet WebKit mit iPad-Geräteprofil. Sie ersetzt noch keinen Test
auf einem echten iPad, insbesondere für Apple Pencil, Bildschirmtastatur und den Dateien-Dialog.

## Im heimischen WLAN starten

Am PC im Projektordner:

```powershell
npm run start:lan
```

Der Befehl baut die App und startet den Vorschau-Server auf Port 4173. Die ausgegebene
**Network-Adresse** (etwa `http://192.168.178.20:4173`) in Safari auf dem iPad öffnen.
PC und iPad müssen im selben WLAN sein. Bei einer Windows-Firewall-Abfrage Zugriff im privaten
Heimnetz zulassen. Der PC muss eingeschaltet bleiben. Beenden am PC mit Strg+C.
Der Vorschau-Server ist für diesen lokalen Einsatz vorgesehen, nicht als öffentliches Hosting.

Projekte liegen im Browserspeicher des jeweiligen Geräts und der verwendeten Adresse.
Zum Übertragen am PC **JSON exportieren**, die Datei auf das iPad kopieren und dort **JSON importieren**.
Es gibt noch keinen automatischen Geräteabgleich. JSON-Exporte dienen auch als unabhängige Sicherung.
Ein Kaltstart ohne Verbindung zum Server und eine installierbare Offline-App sind noch nicht umgesetzt.

## Ohne Tastatur arbeiten

- Die Bereichs-Tabs liegen oberhalb des Plans. **Werkzeuge** klappt das Menüband darunter ein und aus;
  ein Tabwechsel öffnet es. Die Werkzeuggruppen lassen sich bei Bedarf waagerecht verschieben.
- Der Geschossname klappt die Etagenverwaltung direkt im Menüband auf, **Ebenen** die Sichtbarkeit und
  Sperren. Geschosse auch direkt dort anlegen und bearbeiten. Die Listen lassen sich waagerecht
  verschieben; der Pfeil nach oben klappt den Bereich wieder ein. Der Plan bleibt bedienbar.
- **Eigenschaften** öffnet die rechte Seitenleiste; derselbe Knopf schließt sie. Auf dem iPhone ist dies
  die Schaltfläche mit dem Schieberegler-Symbol neben **Ebenen**.
- Mit einem Finger Punkte setzen oder Objekte auswählen und verschieben. Platzierungen erfolgen beim Loslassen.
- Zwei Finger auf dem Plan zoomen und verschieben die Ansicht. Die Geste erzeugt keine neuen Objekte.
- **Raum schließen**, **Wandzug beenden**, **Abbrechen** und **Letzten Punkt entfernen** ersetzen Zeichenkürzel.
- **Rechtwinklig** ersetzt Shift beim Zeichnen; **Mehrfachauswahl** erlaubt mehrere ausgewählte Objekte.
- Genaue Maße über die Eigenschaften eingeben. Rückgängig/Wiederholen und Zoomknöpfe bleiben erreichbar.
- Stifteingaben verwenden denselben Pointer-Eingabepfad wie die Maus. Während eines aktiven Stiftkontakts
  werden zusätzliche Fingerkontakte ignoriert. Eine hardwareabhängige Handballenerkennung wird nicht versprochen.

## Prüfen

```powershell
npx playwright install webkit
npm run test:ipad
```

Die Tests prüfen Layout, echte automatisierte Einfinger-Taps, Projektwiederherstellung sowie
synthetische Mehrfinger-Pointer-Ereignisse. Die UUID-Erzeugung wird dabei ohne `crypto.randomUUID`
geprüft, wie beim HTTP-Zugriff im WLAN. Sie verwendet dann `crypto.getRandomValues`.

Grundlagen: [WebKit Pointer Events](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/)
und [Playwright-Geräteemulation](https://playwright.dev/docs/emulation).
