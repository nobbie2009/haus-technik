# Roadmap und offener Umfang

Stand: 20.09.2026. Zusammenfassung aus der bisherigen Architekturplanung und den Erweiterungen bis 0.13.0.

## Bereits vorhanden

- 2D-Grundriss, Geschosse, Möbel, Elektrik und statische Stromkreissimulation.
- Hausakte: Planvorlagen, PDF/SVG, Materiallisten, Szenarien, Objektakten und Umbauzustände.
- Raumvorlagen, Wandbefestigung, Netzwerkdokumentation und Wiederherstellung früherer Stände.
- Separate Leiterprüfung und lesender Home-Assistant-Abruf.
- Tablet-Oberfläche und Touch-Bedienung; WLAN-Start und WebKit-Prüfungen.

## Nächste Schritte

1. **iPad-Praxistest:** Safari, Apple Pencil, Bildschirmtastatur und Dateien-Import/-Export am echten Gerät.
   Für den Einsatz unterwegs anschließend Offline-Start und eine Geräteabgleich-Strategie festlegen.
2. **Elektriksimulation vertiefen:** Fehlerströme, Schutzreaktionen und über Adern geführte Relaissteuerung
   über den aktuellen dokumentierten Leitergraphen hinaus.
3. **Home Assistant mit der echten Installation prüfen:** Erreichbarkeit, CORS und Zuordnung realer Entitäten.
4. **3D-Ansicht aus dem Planmodell:** Geschoss-, Wand-, Tür- und Fensterhöhen nutzen; zunächst Gebäudeansicht.
5. **Weitere technische Netze:** Wasser, Gas und Zigbee. Netzwerkdokumentation ist bereits vorhanden;
   ein Betriebs- oder Funkmodell ist eine eigene Erweiterung.

Backend, Benutzerverwaltung und geräteübergreifende Synchronisierung sind bisher nicht umgesetzt.
Die bestehende Anwendung speichert lokal; Offline-Installation und Synchronisierung sind eigene Arbeitspakete.
