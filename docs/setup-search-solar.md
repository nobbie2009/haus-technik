# Einrichten, wiederfinden und Solar dokumentieren

Seit Version 0.19.0 gibt es in der **Hausakte** die Bereiche **Einrichtung**, **Suche** und **Balkonkraftwerk**. Auf der Übersicht führen **Mit Einrichtung beginnen** beziehungsweise **Einrichtung fortsetzen** und **Wo finde ich …?** direkt dorthin.

## Einrichtungsassistent

Der Assistent führt durch sechs Schritte:

1. **Haus & Räume:** Hausnamen speichern, vorhandene Geschosse bearbeiten oder ergänzen. Bereits angelegte Räume werden angezeigt. Rechteckige Räume lassen sich mit bekannten Maßen und einer ausdrücklich gewählten Lage ergänzen. X/Y sind die untere linke Ecke in Metern. Ein gleicher Raumname auf demselben Geschoss wählt den vorhandenen Raum aus, statt ihn ein zweites Mal anzulegen. Für unregelmäßige Räume den Planeditor verwenden.
2. **Grundriss:** Geschoss wählen, vorhandene Vorlage hochladen und anhand einer bekannten Strecke skalieren. Alternativ im Plan zeichnen. Bereits hinterlegte Vorlagen werden gezählt.
3. **Technik:** Gewünschte Bereiche auswählen. Diese Auswahl steuert die Hinweise im Rundgang, erzeugt keine Geräte und entfernt keine bestehenden Daten.
4. **Raum für Raum:** Vorhandenen Raum wählen, Plan öffnen, Geräteakten ergänzen, Rauchmelder erfassen und Wandfotos direkt öffnen. Der Rauchmelder-Entwurf übernimmt den Raumnamen als Standort. Den Raum anschließend ausdrücklich als durchgesehen markieren. Die Anzeige zählt nur bereits zugeordnete Geräte; nicht zugeordnete Planobjekte können trotzdem vorhanden sein.
5. **Zentrale Stellen:** Je nach Themenauswahl zu Sicherungskasten/Geräteakten, Absperrungen, Router, Zählern, Solarakte oder Garten wechseln. Vorhandene Einträge und Zähler weiterverwenden.
6. **Abschluss:** Erfassten Bestand und noch offene Punkte ansehen. Der erste Rundgang darf auch mit übersprungenen Schritten abgeschlossen werden. „Erledigt“ bedeutet von dir durchgesehen, keine technische Vollständigkeitsprüfung.

**Zurück**, die Schrittschaltflächen und **Für später überspringen** bleiben jederzeit verfügbar. **Pausieren und schließen** beendet die Ansicht; der bestätigte Fortschritt, die Themenauswahl und durchgesehene Räume bleiben gespeichert. Formulare vor einem Wechsel über die jeweilige Speichern-Schaltfläche sichern: ungespeicherte Formularentwürfe gehören nicht zum gespeicherten Fortschritt.

Beim Wechsel vom Assistenten in eine Akte erscheint **Zur Einrichtung zurück**. Nach Neuladen oder erneutem Öffnen setzt der Assistent am gespeicherten Schritt fort. Der Fortschritt gehört zum Projekt, wird im JSON mitgesichert und unterstützt Undo/Redo. Es wird kein externer KI-Dienst verwendet.

## Zentrale Suche

Die Suche umfasst Planobjekte und ihre Objektakten, persönliche Hausobjekte, Zähler, Wartungsnotizen und Erledigungshistorien, Netzwerkgeräte, Solar-Komponenten sowie Wandfotos und deren Verlaufsnotizen. Suchbar sind unter anderem Bezeichnung, Seriennummer, Standort, SSID und Unterlagen-Link. Bilder selbst werden nicht mittels Texterkennung ausgewertet.

Mehrere Wörter werden gemeinsam gesucht; Groß-/Kleinschreibung und Akzente sind unerheblich. Über **Suchbereich** kannst du auf einen Objekttyp begrenzen. Die Liste zeigt zunächst bis zu 50 Treffer; weitere sind nachladbar. **Gefundene Angaben** klappt die zugehörigen Texte auf.

- **Im Plan** zeigt das konkrete Planobjekt; bei ausgeblendeter Ebene erscheint ein Hinweis.
- **Objektakte** öffnet dessen vorhandene Dokumentation.
- **Öffnen** führt zur konkreten Hausakte, Wartung, WLAN-Geräteangabe, Solarakte oder zum ausgewählten Zähler.
- **Foto öffnen** öffnet das gefundene Foto an seiner Wand.
- **Standort** zentriert vorhandene Hausobjekt-Markierungen oder Netzwerkpositionen im Plan.

## Balkonkraftwerk-Akte

Eine Anlage mit Name, Standort, Inbetriebnahme, Ausrichtung, Neigung, Foto, Notizen und Unterlagen-Link anlegen. Die folgenden Bestandteile lassen sich dokumentieren:

- **Modulgruppen:** Anzahl und Wp je Modul sowie Hersteller, Modell, Seriennummer und Unterlagen. Unterschiedliche Module oder individuelle Seriennummern in eigenen Gruppen anlegen. Die Gesamtleistung wird nur angezeigt, wenn alle Gruppen eine Leistung haben.
- **Wechselrichter:** Hersteller, Modell, Seriennummer, Unterlagen und AC-Nennleistung in Watt.
- **Optionaler Speicher:** Hersteller, Modell, Seriennummer, Unterlagen und Kapazität in Wh.
- **Anschluss-Steckdose:** Eine vorhandene Steckdose im Plan zuordnen und ihren Standort öffnen. Das ist eine Dokumentationsverknüpfung, keine Einspeisung in die Elektriksimulation.
- **Ertragszähler:** Einen vorhandenen Solarertragszähler in kWh zuordnen. **Speichern und Ertragszähler öffnen** verwendet diesen weiter oder legt bei fehlender Zuordnung einen neuen, leeren Ertragszähler an. Wiederholtes Öffnen erzeugt kein Duplikat. Es werden keine Ablesungen erfunden.

Ablesungen werden wie bisher unter **Zähler & Verbrauch** erfasst. In der Solarakte erscheint die Summe aus auswertbaren Ableseintervallen samt erfassten Tagen; Lücken durch Zählerwechsel bleiben ausdrücklich unbekannt. Wp, W und kWh werden getrennt behandelt. Es gibt keine automatische Ertragsprognose, Eigenverbrauchs- oder Wirtschaftlichkeitsberechnung.

Das Löschen einer Anlage lässt ihren Ertragszähler und seine Ablesungen bestehen. Gelöschte Steckdosen oder Zähler werden in der Akte als fehlende Zuordnung angezeigt. Anlagendaten und Fotos sind im Projekt-JSON gesichert. Seit 0.48.0 steht zusätzlich der optionale Projektdienst für gemeinsame Projekte auf PC und iPad bereit.
