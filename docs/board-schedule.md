# Sicherungskasten-Aushang

Seit Version 0.20.0: **Hausakte → Sicherungskasten-Aushang**. Auch unter **Ausgabe** führt eine Schaltfläche dorthin.

1. Einen Sicherungskasten auswählen oder **Alle Sicherungskästen** wählen.
2. Bei Bedarf einen eigenen Hinweis ergänzen, zum Beispiel den Standort einer Unterverteilung. Dieser Text gilt für den aktuellen Export und verändert keine Projektdaten.
3. **Aushang als PDF** wählen.
4. Die heruntergeladene Datei `Sicherungskasten-Aushang.pdf` öffnen und im Druckdialog **A4 / Querformat** auswählen. Anschließend die passenden Blätter am Verteiler aushängen.

Die Übersicht enthält:

- Verteilerkennzeichnung, Name, Geschoss/Raum und Datenstand des Projekts.
- Zugeordnetes Schutzgerät mit Kennzeichnung, Typ und erfasster Stromstärke/Charakteristik.
- Stromkreiskennzeichnung und Bezeichnung.
- Zugeordnete Räume, Geräte, Steckdosen und weitere Komponenten. Räume werden nur aus vorhandenen Zuordnungen übernommen; bei einem Gerät an einer Steckdose wird deren Raum als Rückfall verwendet.
- Dokumentierte FI-/FI-LS-Zuordnung und erfassten Auslösestrom. Bei vorgeschalteten Verteilern steht deren Kennzeichnung dabei.
- Dokumentierte Phase; fehlende Angaben bleiben offen.

Jeder Verteiler beginnt auf einer eigenen Seite. Kopfzeile, Spaltenüberschriften und Seitenzahlen wiederholen sich. Lange Einträge werden umgebrochen; bei Fortsetzungen bleiben Sicherungskennzeichnung, Stromkreis, FI und Phase zur Orientierung sichtbar. Die Schrift wird nicht automatisch verkleinert, um große Bestände auf ein Blatt zu quetschen.

Schutzgeräte ohne Stromkreiszuordnung erscheinen zusätzlich als **Zuordnung offen**. Sie werden nicht als freie Reserve interpretiert. Ein leerer Verteiler erhält einen entsprechenden Hinweis. Ausgeblendete Ebenen ändern den dokumentierten Inhalt des Aushangs nicht. Verbraucher einer Unterverteilung stehen auf deren eigenen Blättern; am vorgeschalteten Stromkreis wird die versorgte Unterverteilung genannt.

Die Angaben stammen aus deinem Projekt. Die Sicherungskennzeichnung ist keine automatisch ermittelte Position auf der Hutschiene. Korrekturen an Sicherungsnummern, Stromkreisnamen und Raum-/Gerätezuordnungen werden im Elektrikbereich vorgenommen; danach das PDF erneut erzeugen. Der vorhandene Verteiler-/Materialexport bleibt separat verfügbar.
