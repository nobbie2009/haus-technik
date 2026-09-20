# Roadmap und offener Umfang

Stand: 20.09.2026. Zusammenfassung aus der bisherigen Architekturplanung und den Erweiterungen bis 0.20.0.

## Bereits vorhanden

- 2D-Grundriss, Geschosse, Möbel, Elektrik und statische Stromkreissimulation.
- Hausakte: Planvorlagen, PDF/SVG, Materiallisten, Szenarien, Objektakten und Umbauzustände.
- Raumvorlagen, Wandbefestigung, Netzwerkdokumentation und Wiederherstellung früherer Stände.
- Separate Leiterprüfung und lesender Home-Assistant-Abruf.
- Tablet-Oberfläche und Touch-Bedienung; WLAN-Start und WebKit-Prüfungen.
- Verdrahtete Stromstoßrelais, explizite Fehlerwiderstände und idealisierte FI-Reaktionen in der Leiterprüfung.
- GitHub-Vorbereitung mit CI, Dependabot und Beitragsvorlagen.
- Verbraucherdatenbank mit Seriennummern, elektrischen Werten, maßstäblicher Platzierung und Bibliotheksimport/-export.
- Wasser-, Heizungs- und Gasdokumentation mit Komponenten, Rohrverläufen, Etagenverbindungen und Materiallisten.
- Wandfotos mit benannten Wandseiten, eingezeichneten Leitungsverläufen, Fotoreferenz und SVG-Ausgabe.
- Private Hausübersicht für Internet/WLAN, Absperrstellen, Rauchmelder, Garten und Außenlicht.
- Eigene Zähler-/Verbrauchsansicht einschließlich Solarertrag sowie gemeinsame Wartungstermine und Aufgabenverläufe.
- Unterbrechbarer Einrichtungsassistent und zentrale Suche mit Navigation zu vorhandenen Datensätzen.
- Balkonkraftwerk-Akte mit Modulen, Wechselrichter, optionalem Speicher und verknüpftem Ertragszähler.
- Druckbarer Sicherungskasten-Aushang mit Stromkreisen, Räumen/Geräten und FI-Zuordnung.

## Nächste Schritte

Für die private Hausübersicht außerdem vorgeschlagen, bisher nicht umgesetzt: eine druckbare
Schnellübersicht mit wichtigen Standorten und Kontakten, eine Hauschronik mit Vorher-/Nachher-Fotos
und eine Erinnerung an die letzte exportierte Sicherung. Eine zentrale Unterlagenbibliothek wäre eine
weitere Ergänzung; Fotos und Unterlagen-Links gibt es bereits an Objekten und in der Suche.

1. **iPad-Praxistest:** Safari, Apple Pencil, Bildschirmtastatur und Dateien-Import/-Export am echten Gerät.
   Für den Einsatz unterwegs anschließend Offline-Start und eine Geräteabgleich-Strategie festlegen.
2. **Elektriksimulation weiter vertiefen:** Verteilte Leitungsimpedanzen, LS-/Schmelzsicherungskennlinien,
   Selektivität, dynamische Relaisrückkopplungen und Spulennennwerte. Das aktuelle Fehlerstrommodell ist
   auf ausdrücklich angegebene Fehlerwiderstände und ideale FI-Schwellwerte begrenzt.
3. **Home Assistant mit der echten Installation prüfen:** Erreichbarkeit, CORS und Zuordnung realer Entitäten.
4. **3D-Ansicht aus dem Planmodell:** Geschoss-, Wand-, Tür- und Fensterhöhen nutzen; zunächst Gebäudeansicht.
5. **Rohrnetze vertiefen:** Warmwasserzirkulation, Abwasser, Durchfluss, Druckverlust und hydraulischer Abgleich.
   Wasser, Heizung und Gas sind zunächst als Dokumentationsmodell umgesetzt.
6. **Zigbee:** Gerätezuordnung und später ein Funkmodell ergänzen. Netzwerkdokumentation ist bereits vorhanden.

Backend, Benutzerverwaltung und geräteübergreifende Synchronisierung sind bisher nicht umgesetzt.
Die bestehende Anwendung speichert lokal; Offline-Installation und Synchronisierung sind eigene Arbeitspakete.
