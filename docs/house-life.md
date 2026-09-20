# Hausalltag: Übersicht, Chronik und Gerätewechsel

Ab Version 0.21.0 sind die neuen Bereiche über **Hausakte** erreichbar.

## Startseite

Die Übersicht zeigt anstehende Wartungen der nächsten 30 Tage und überfällige Aufgaben,
fehlende Angaben aus der Projektprüfung, letzte Zählerstände und den Sicherungsstatus.
Über die Schnellaktionen lassen sich Ablesungen und Chronikereignisse erfassen.
Erinnerungen erscheinen in der Anwendung; es werden keine Hintergrundbenachrichtigungen versendet.

## Sicherung & Gerätewechsel

1. Auf dem bisher verwendeten Gerät **Projekt sichern / mitnehmen** wählen und die JSON-Datei speichern.
2. Über **Gesicherte Datei prüfen** diese Datei wieder auswählen. Die Prüfung vergleicht den vollständigen
   Projektinhalt; sie übernimmt keine Daten. Ein gestarteter Download allein gilt noch nicht als geprüfte Sicherung.
3. Die Datei beispielsweise über die Dateien-App auf das iPad übertragen.
4. Dort unter **Transferdatei auswählen** öffnen. Projektname, Version, Zeitstempel und Abweichungen prüfen.
5. Den Stand bewusst übernehmen oder als separate Kopie öffnen. Erst danach auf diesem Gerät weiterarbeiten.

PC und iPad speichern weiterhin jeweils lokal im Browser. Gleichzeitige Änderungen werden nicht zusammengeführt.
Ein älterer Stand wird ausdrücklich gekennzeichnet. Vor dem Ersetzen bleibt der bisherige Stand in der lokalen
Wiederherstellung erhalten. Eine Importkopie erhält eine neue Projektkennung; bestehende QR-Aufkleber verweisen
weiterhin auf das ursprüngliche Projekt. Diese Vorschau gehört zum neuen Gerätewechsel-Bereich.

Der Sicherungsnachweis gilt nur für den jeweiligen Browser. Nach Änderungen, ohne geprüfte Datei oder nach sieben
Tagen erinnert die Übersicht erneut. Er bestätigt den Dateiinhalt, nicht dessen dauerhafte externe Aufbewahrung.

## Hauschronik

Reparaturen, Umbauten, Anschaffungen und sonstige Ereignisse mit Datum, Ort, Kosten, Notizen und optionaler
Planverknüpfung festhalten. Pro Ereignis sind ein Vorher- und Nachher-Foto sowie ein Beleg möglich.
Bilder werden verkleinert und als JPEG gespeichert; PDF-Belege dürfen höchstens 4 MB groß sein.
Die Gesamtgrenze des Projekts von 18 MB bleibt bestehen. Fotos und Belege reisen in der JSON-Sicherung mit.
Gespeicherte Ereignisse lassen sich bearbeiten, löschen, suchen und über Undo/Redo wiederherstellen.

## Haus-Schnellübersicht zum Aushängen

Wichtige Akten auswählen oder Sicherungskästen und Absperrstellen übernehmen. Eigene wichtige Stellen mit
genauer Lage und Bedienhinweisen sowie Kontakte mit Telefonnummer, E-Mail und Zuständigkeit ergänzen.
**Hausübersicht als PDF** erzeugt eine A4-Übersicht mit Seitenzahlen und deinen Angaben.

## QR-Aufkleber

Die vom iPad erreichbare WLAN-Adresse der Anwendung eintragen, beispielsweise die beim WLAN-Start angezeigte
Adresse. `localhost` bezeichnet immer das gerade verwendete Gerät. Für dauerhaft nutzbare Aufkleber sollte der
PC im Heimnetz eine gleichbleibende Adresse haben und die Anwendung dort laufen.

Akten auswählen und **QR-Aufkleber als PDF** drucken: acht Etiketten pro A4-Seite, bis zu 100 pro Ausgabe.
Jeder Code enthält die Anwendungsadresse, Projektkennung und Aktenkennung, keine Fotos oder Kontaktdaten.
Nach dem Scannen muss das passende Projekt bereits in diesem Browser vorhanden sein. Ein anderes Projekt wird
ausdrücklich angezeigt; ein vorhandenes passendes Projekt kann gezielt geöffnet oder per Datei übertragen werden.
Gelöschte Akten werden als nicht mehr vorhanden gemeldet. **Ziel testen** prüft die Navigation direkt in der App.

## Gartenpflege

Unter **Garten & Außenlicht** können Gartenobjekte als **Bewässerungszone** oder **Außenwasserstelle** gekennzeichnet
werden. Standort, Notizen, Foto und vorhandene Planverknüpfungen beschreiben die Anlage.
**Pflege planen** übernimmt Objekt und Standort in eine Wartungsaufgabe, etwa zum Winterfestmachen oder
zur jährlichen Kontrolle. Fälligkeit, Wiederholung und Erledigungen stehen anschließend in der Wartungsübersicht.
Es gibt keine automatische Bewässerungssteuerung.

Gartenpflanzen, Zählerfotos und zusätzliche Solarauswertungen wurden in diesem Ausbau nicht ergänzt.
