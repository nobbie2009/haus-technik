# Grundstück per GPS aufnehmen

Ab Version 0.35.0 unter **Grundstück → Per GPS erfassen**. Auf dem iPhone zuerst **Werkzeuge** öffnen.

## Vorbereitung

- Home-Technik über eine vertrauenswürdige **HTTPS-Adresse** öffnen. Eine gewöhnliche HTTP-Adresse im Heimnetz reicht für die Standortfreigabe auf dem iPhone nicht aus.
- Safari den Standortzugriff erlauben und auf dem Gerät die genaue Standortfreigabe aktivieren. Die tatsächliche Genauigkeit hängt von Gerät und Empfang ab.
- Projekte liegen lokal im jeweiligen Browser. Für einen bereits vorhandenen Hausplan zuerst dessen JSON-Projektdatei auf dem iPhone importieren; anschließend die ergänzte Datei exportieren und auf dem anderen Gerät importieren. Es gibt keine automatische geräteübergreifende Synchronisierung.

## Referenz und Ausrichtung

1. An einen bekannten Grundstücks- oder Gebäudepunkt gehen und **Ortung starten**.
2. Unter **GPS-Referenz und Ausrichtung** den passenden Planpunkt auswählen. Bei einem neuen Grundstück kann der Startpunkt dem Planursprung X 0 / Y 0 zugeordnet werden.
3. Die Nordrichtung im Plan angeben: 0° oben, 90° rechts, 180° unten, 270° links. Der Wert beschreibt die geografische Nordrichtung, nicht die Blickrichtung des Telefons. Es erfolgt keine automatische Kompasskalibrierung.
4. **Aktuellen Standort als GPS-Referenz setzen**. Die Referenz gilt für das aktive Geschoss. Spätere Änderungen daran verschieben bestehende Objekte nicht.

Die Zuordnung ist eine Momentaufnahme: Wird der ursprüngliche Planpunkt später verschoben, folgt die GPS-Referenz nicht automatisch. Dann vor der nächsten Aufnahme neu kalibrieren.

## Punkte aufnehmen

1. Grundstücksgrenze, Weg, Terrasse, Beet oder Referenzpunkt wählen; bei Wegen die Breite eingeben.
2. Am aufzunehmenden Punkt kurz stehen bleiben, **Position prüfen** drücken und die angezeigte Position und Genauigkeit ansehen.
3. **Punkt übernehmen** und zum nächsten Punkt gehen. Grenzen und Flächen benötigen mindestens drei Punkte, Wege zwei, Referenzpunkte einen. Den ersten Punkt am Ende nicht nochmals aufnehmen; Flächen werden automatisch geschlossen.
4. Fehlerhafte letzte Punkte entfernen. Mit **GPS-Objekt speichern** die gesamte Aufnahme übernehmen. Danach lassen sich weitere Objekte aufnehmen.
5. Dialog schließen, um die Ortung zu beenden. Die gespeicherten Objekte können im Plan wie manuell gezeichnete Grundstücksobjekte bearbeitet werden. Rückgängig entfernt die zuletzt gespeicherte Aufnahme gemeinsam mit ihren Messdaten.

## Genauigkeit und Daten

GPS dient zur Groberfassung. Der Vorschaukreis addiert die vom Browser gemeldete Standort- und Referenzungenauigkeit als Orientierungswert; eine falsche Nordausrichtung verursacht zusätzliche Fehler. Dies ist keine Vermessung und keine verlässliche Dokumentation exakter unterirdischer Leitungsverläufe. Genaue Abstände anschließend messen und die Planpunkte korrigieren.

Messungen älter als 15 Sekunden werden nicht übernommen. Bei mehr als 10 m gemeldeter Ungenauigkeit ist zunächst eine ausdrückliche Freigabe im Dialog nötig. Punkte mehr als 10 km vom Bezugspunkt entfernt werden abgewiesen. Die Projektion ist für lokale Garten- und Grundstückspläne vorgesehen.

Beim Schließen oder Wechsel in den Hintergrund stoppt die Ortung. Nach der Rückkehr erneut **Ortung starten**. Gespeichert werden nur die gewählte Referenz und ausdrücklich übernommene Punkte, einschließlich Zeitpunkt und gemeldeter Genauigkeit. Es wird keine Bewegungsspur aufgezeichnet. Die GPS-Daten sind Teil des lokalen Projekts und seiner Sicherungen/JSON-Exporte; manuelle Korrekturen verändern die ursprünglichen Messdaten nicht.
