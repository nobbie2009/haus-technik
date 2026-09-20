# Änderungen

## 0.17.0 · 20.09.2026

- Mehrere Fotos direkt an einer Wand, mit Titel, Wandseite und Notizen.
- Farbige Fotoverläufe für Elektrik, Wasser, Heizung, Gas und Netzwerk, inklusive Beschriftung und Bearbeitung.
- Zoom, Fingerpunkte, Koordinateneingabe und Abbruchschutz für begonnene Zeichnungen.
- Optionale Fotoreferenz für ausdrücklich ungefähre Verlaufslängen; eigenständiger SVG-Export mit eingebettetem Foto.
- Integration in Projektspeicherung, JSON-Export, Undo/Redo und Wandsperren; validierte Bild- und Verlaufsdaten.
- Modell-, Desktop- und iPad-Prüfungen für Zuordnung, Zeichnung, Kalibrierung, Wiederherstellung und Touch-Bedienung.

## 0.16.0 · 20.09.2026

- Neuer Planungsbereich für Kalt-/Warmwasser, Heizungsvor-/rücklauf und Gas mit getrennten Ebenen.
- Maßstäbliche Komponenten: Anschlüsse, Zähler, Ventile, Abzweige, Verteiler, Entnahmestellen, Speicher, Heizkörper, Fußbodenheizkreise und Wärmeerzeuger.
- Rohrleitungen mit Wegpunkten, Medienprüfung, Etagenverbindungen und bearbeitbaren Steigpunkten.
- Dokumentation von Rohrmaterial, DN, Dämmung, Höhen, Längenzuschlag, Heizleistung, Druck und Temperatur.
- Integration in Auswahl, Verschieben, Löschen, Duplizieren, Ebenensperren, Undo/Redo, Objektakten und Raumvorlagen.
- Rohrnetze im PDF-/SVG-Gesamtplan sowie Komponenten und Rohrlängen in Materiallisten.
- Automatisierte Modell-, Desktop- und iPad-Prüfungen; Dokumentation der Grenzen gegenüber einer hydraulischen oder gastechnischen Berechnung.

## 0.15.0 · 20.09.2026

- Verbraucherdatenbank mit Suche, Bearbeitung, Kopien sowie separatem JSON-Import/-Export.
- Gerätedaten mit Hersteller, Modell, Seriennummer, Nennspannung, Nennleistung und getrenntem Jahresverbrauch.
- Maßstäbliche Platzierung als eigenständiges Elektrogerät mit Breite, Tiefe, Höhe und Drehung.
- Auswahl über den Grundriss sowie Bearbeitung, Anschlüsse, Leitungsnachführung und Undo/Redo über bestehende Editorfunktionen.
- Geräteumrisse in PDF/SVG und erweiterte Daten in Materiallisten.
- Streng validierte Bibliotheks-/Instanzdaten und Prüfungen für Speicherung, Anschlüsse und iPad-Bedienung.

## 0.14.0 · 20.09.2026

- Stromstoßrelais reagieren in der Leiterprüfung auf vollständig verdrahtete Tasterimpulse an A1/A2.
- L–PE-/L–N-Fehlerszenarien mit explizitem Schleifenwiderstand, vektorieller Differenzstromrechnung und idealisierter FI-Abschaltung.
- Tatsächliche Leiterpfade bestimmen die Schutzreaktion; fehlende Rückwege, parallele Pfade und widersprüchliche Quellen bleiben unbestimmt.
- Schutzleiterkontinuität bleibt bei abgeschalteten Verteilern und Schutzgeräten erhalten.
- Fehlerszenarien lassen sich speichern und wiederherstellen; ältere Szenarien bleiben lesbar.
- GitHub-Vorbereitung: CI mit Desktop-/WebKit-Tests, Dependabot, Vorlagen, Beitragsregeln und Veröffentlichungshinweise.
- Erweiterte Modell-, Desktop- und iPad-Browserprüfungen und Dokumentation der Rechengrenzen.

## 0.13.0 · 20.09.2026

- Tablet-Layout mit einklappbaren Werkzeugen und Eigenschaften, größeren Touch-Zielen und anpassbaren Dialogen.
- Zwei-Finger-Zoom/Pan, verzögerte Fingerplatzierung und Abbruch ohne versehentliche Modelländerungen.
- Bildschirmaktionen zum Schließen von Räumen, Beenden von Wandzügen, Abbrechen und Entfernen von Entwurfspunkten.
- Rechtwinkliges Zeichnen und Mehrfachauswahl ohne Tastatur.
- UUID-Erzeugung für HTTP im Heimnetz und eigener WLAN-Startbefehl.
- WebKit-Prüfungen im iPad-Profil sowie dokumentierter Bedienumfang und verbleibende Roadmap.

## 0.12.0 · 19.09.2026

- Hausakte als zentralen Arbeitsbereich ergänzt.
- Bild-/PDF-Grundrissvorlagen mit Zweipunktkalibrierung, Position und Deckkraft pro Etage.
- Zentrale Projektprüfung mit Navigation zu betroffenen Objekten.
- Maßstäbliche PDF-/SVG-Pläne sowie Verteiler- und Materialausgabe als PDF/CSV.
- Benannte, persistente Simulationsszenarien mit Vergleich und erneutem Laden.
- Interaktives Versorgungsschema und separate Leiterprüfung aus dokumentierten Aderverbindungen.
- Objektakten, Fotos, Wartungsdaten, Dokumentlinks und Umbauzustände.
- Explizite Wandbefestigung mit Referenzerhalt bei Wandteilungen und gemeinsamem Duplizieren.
- Raumvorlagen einschließlich Möbeln, Elektrik und kopierten, extern unversorgten Stromkreisen.
- Netzwerkgeräte, Portbelegung und Verbindungsdokumentation.
- Lokale Wiederherstellung früherer Stände und atomare Erkennung konkurrierender Speicherungen.
- Lesende Home-Assistant-Anbindung; Zugriffstoken bleiben ausschließlich im Dialogspeicher.
- Erweiterte Modell- und Browsertests, lokale PDF-Schrift mit Lizenz und Anwenderdokumentation.

## 0.11.0

Bestehender Stand mit Grundrisseditor, Möbeln, Elektrik, funktionaler Lastsimulation, Schaltgruppen, Trafos und Geschossleitungen als Git-Ausgangsstand gesichert.
