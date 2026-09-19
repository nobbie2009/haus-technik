# Hausakte · Version 0.12.0

Die Schaltfläche **Hausakte** in der oberen Werkzeugleiste bündelt die neuen Arbeitsabläufe. Die bestehende Zeichenoberfläche und die funktionale Stromkreissimulation bleiben erhalten.

## Vorhandene Grundrisse erfassen

1. Gewünschte Etage im Editor wählen und **Hausakte → Grundrissvorlage** öffnen.
2. PNG, JPEG, WebP oder eine ausgewählte PDF-Seite importieren. Die Verarbeitung erfolgt lokal im Browser.
3. Zwei Punkte in der Vorschau anklicken, ihre reale Entfernung in Millimetern eingeben und **Maßstab aus zwei Punkten setzen** wählen. Alternativ die gesamte Bildbreite numerisch festlegen; dieser Weg funktioniert auch ausschließlich mit Tastatur.
4. Linke obere Ecke, Deckkraft und Sichtbarkeit einstellen und **Vorlage speichern** wählen.
5. Dialog schließen und bei Bedarf **Alles anzeigen** verwenden. Wände können nun über der Vorlage gezeichnet werden.

Pro Etage wird eine Vorlage gespeichert. Der Import rastert die gewählte Seite bzw. das Bild mit maximal 2400 Pixeln Kantenlänge; er extrahiert keine CAD-Geometrie. Eingabedateien dürfen höchstens 25 MB groß sein. Bilder werden komprimiert in der Projektdatei aufbewahrt, nicht extern hochgeladen. Es gibt keine automatische Schräglagenkorrektur.

## Prüfung, Ausgabe und Umbau

- **Projektprüfung** sammelt fehlende Stromkreise, Schutzgeräte, Phasen, Versorgungszuordnungen und Lastangaben sowie Hinweise aus den vorhandenen Versorgungsprüfungen. Überfällige dokumentierte Wartungen erscheinen ebenfalls. **Im Plan** öffnet das Objekt. Ausgeblendete Ebenen müssen zuvor im Editor eingeblendet werden.
- **Ausgabe** exportiert die aktuelle Etage als Vektor-SVG oder PDF mit festem Maßstab. Das PDF wird bei Bedarf auf A4-Querformatblätter aufgeteilt. Beim Drucken **100 % / Tatsächliche Größe** einstellen; die 1-m-Kontrollstrecke dient zur Kontrolle. Hintergrundvorlagen werden nicht ausgegeben. Sichtbare Ebenen und die gewählte Inhaltsauswahl bestimmen den Export.
- Wände, Türen mit Anschlagbogen, Fenster, Raumangaben, Möbel, manuelle Maße, technische Objekte und Kabelwege werden aus dem Modell gezeichnet. Elektroobjekte verwenden beschriftete Übersichtssymbole mit Legende, keine normierte Symbolbibliothek. Raumflächen bleiben Wandachsflächen.
- **Verteiler- und Material-PDF** enthält Stromkreiskennzeichnungen und den erfassten Bestand. **Materialliste als CSV** enthält auch Schutzgeräte und Netzwerkkomponenten. Elektrische Kabellängen enthalten gezeichnete Wege, Geschossübergänge und Reserven; Netzwerkkabel verwenden Luftlinie, Etagenhöhen und Zuschlag. Die Liste ist keine automatische Einkaufs- oder Bestellliste.
- **Objektakten** bieten die Zustände Bestand, Geplant, Entfernen und Umgesetzt. Im Plan kennzeichnen zusätzliche Punkte die drei Änderungszustände; in Exporten werden sie farblich unterschieden und in Listen ausgeschrieben. Der Zustand ist Dokumentation: Er verändert weder die Lastberechnung noch löscht er Objekte.

## Geräteakten und Wandbefestigung

Eine Objektakte lässt sich auch direkt aus den Eigenschaften öffnen. Sie enthält Hersteller, Modell, Seriennummer, Notizen, nächste Wartung, einen HTTP-/HTTPS-Dokumentlink, ein Foto und optional eine Home-Assistant-Entitäts-ID. Fotos gehören zum JSON-Export; verlinkte Anleitungen werden nicht heruntergeladen oder eingebettet.

Bei Möbeln und räumlichen Elektroobjekten kann eine Wand mit Abstand vom Wandanfang, seitlichem Versatz und Montagehöhe angegeben werden. Die Montagehöhe ist eine Bestandsangabe; sie verändert noch keine elektrische Leitungslänge. Änderungen der Wand nehmen das Objekt mit. Verschieben des Objekts aktualisiert Abstand und Versatz. Wandteilungen führen Befestigungen auf das richtige Segment mit; Wandlöschung löst sie. Liegt der Abstand nach einer Änderung außerhalb der Wand, wird die Änderung abgelehnt. Ebenensperren gelten auch für indirekte Objektbewegungen. Gemeinsames Duplizieren führt die Wandreferenz mit; alleinige Objektkopien sind frei positioniert.

## Szenarien und Versorgungsschema

**Szenarien** speichert den aktuellen Simulationszustand unter einem Namen. Ohne aktive Simulation wird der dokumentierte Ausgangszustand gespeichert. Bis zu 50 Szenarien gehören zur Projektdatei. Der Vergleich berechnet bekannte Wirkleistung, höchste bekannte Auslastung, unvollständige Daten und Schätzungsstatus stets anhand des aktuellen Projekts. Gelöschte IDs werden beim Laden eines Szenarios ausgelassen. Speichern eines Szenarios stellt den aktiven Simulationszustand anschließend wieder her.

**Versorgungsschema** stellt den radialen Versorgungsgraphen automatisch dar. Stromkreise und Schutzgeräte navigieren zu ihrem Verteiler; räumliche Objekte öffnen ihre eigene Position. Die aktuelle Editor-Auswahl ist hervorgehoben. Diese Ansicht bildet keine einzelnen Leiter ab.

## Separate Leiterprüfung

**Leiterprüfung** berechnet einen eigenen Kontaktgraphen aus den ausdrücklich dokumentierten Aderpaaren der Kabel. Die bisherige Zuordnungssimulation bleibt davon getrennt. Kabelkreuzungen und räumliche Nähe verbinden nichts. Zum Bearbeiten einer Aderbelegung eine Leitung auswählen und **Anschlussbelegung bearbeiten** verwenden.

Zusätzliche generische Kontakte:

- Einspeisung: L bzw. L1/L2/L3, N, PE.
- Zähler: IN_ und OUT_ für L1/L2/L3, N, PE.
- Verteiler: Eingänge und nach Stromkreis beschriftete Ausgänge mit stabiler Stromkreis-ID. Die dokumentierte Phasenzuordnung verbindet den jeweiligen Ausgang mit dem Eingang; explizit abgeschaltete Schutzgeräte oder Stromkreise unterbrechen diesen Modellpfad.
- Abzweig-/Klemmenobjekte: getrennte Kontakte L1, L2, L3, N, PE. Mehrere Kabel an demselben benannten Kontakt bilden einen Knoten.
- Ein-/Aus-, Wechsel- und Kreuzschalter: Kontaktverbindungen folgen ihrer Szenariostellung. Die konkrete Verdrahtung bestimmt das Ergebnis.
- Ideale Trafos: Sekundärversorgung entsteht nur bei vollständigem Primäranschluss; keine Verluste oder geregelten Netzteile.

Ein einphasiger Verbraucher benötigt einen vollständigen Außenleiter-/Neutralleiterpfad zur selben Quelle. Dreiphasige Verbraucher benötigen drei verschiedene Außenleiter derselben Quelle. Widersprüchliche Quellen oder Leiter auf demselben Netz werden gemeldet und dort nicht als gültige Versorgung ausgewertet. Einzelne Kabel können im Szenario unterbrochen werden. Lastwerte werden pro Verbraucher mit dem bestehenden idealen Lastmodell berechnet.

Grenzen: keine Widerstände, Spannungsabfälle, zeitabhängigen Schutzkennlinien, Kurzschluss- oder Fehlerstromberechnung und keine Verteilung von Strömen auf parallele Leiter. Die Prüfung stellt keinen Schutz- oder Installationsnachweis aus. Stromstoßrelais-Steuerkreise werden hier noch nicht auf Leiterebene ausgewertet; die vorhandene funktionale Relaissimulation bleibt verfügbar. Die Leiterergebnisse stehen in der separaten Tabelle; die Plan-Betriebsanzeigen zeigen weiterhin die funktionale Zuordnungssimulation.

## Raumvorlagen und Netzwerk

**Raumvorlagen** speichern den Zustand eines Raums einschließlich Öffnungen, zugeordneter Möbel, Elektroobjekte und interner Kabel. Beim Einfügen entstehen neue IDs und der Zustand Geplant. Vorhandene lokale Stromkreise und ihre Schutzketten werden kopiert, damit Schaltgruppen erhalten bleiben. Fehlt der zugehörige Verteiler in der Raumvorlage, entsteht ein neuer, unversorgter Vorlagenverteiler. Externe Einspeisungen bleiben getrennt und müssen ausdrücklich zugeordnet werden. Alle zuvor gespeicherten Räume bleiben unverändert. Die numerische Einfügeposition bezeichnet den ersten Polygonpunkt der Vorlage. Überlappungen mit dem Zielbestand werden nicht automatisch aufgelöst.

**Netzwerk** verwaltet Dosen, Patchpanel, Switches, Router und Access Points mit Etage, Koordinaten und Ports. Verbindungen belegen konkrete Ports. Doppelte Belegung, Selbstverbindungen und Ports außerhalb des Gerätebereichs werden abgelehnt. Geräte und Verbindungen erscheinen violett im Plan. Löschen eines Geräts entfernt seine Verbindungen im selben Undo-Schritt. Es handelt sich um Dokumentation, nicht um Paketfluss-, Funkabdeckungs- oder PoE-Simulation.

## Wiederherstellung und mehrere Tabs

Vor dem Überschreiben eines gespeicherten Projekts wird der vorherige Stand in derselben IndexedDB-Transaktion gesichert. Pro Projekt werden höchstens 20 Stände mit einem geschätzten 40-MB-Budget aufbewahrt; mindestens der neueste vorherige Stand bleibt erhalten. **Wiederherstellung** zeigt die Stände an und bietet eine konkrete Bestätigung vor der Übernahme. Der aktuelle Entwurf wird davor gespeichert. Wiederherstellung selbst ist ein Undo-Schritt und respektiert bestehende Sperren.

Eine atomare Vergleichsprüfung verhindert, dass ein anderer Tab einen seit seinem Laden veränderten Stand überschreibt. Bei einem Konflikt bleibt der Entwurf geöffnet: zuerst JSON exportieren, dann die Seite neu laden. Es gibt weiterhin keine automatische Zusammenführung. Die Wiederherstellung ist browserlokal und nicht Teil des JSON-Exports.

## Home Assistant

In Objektakten werden Entitäts-IDs hinterlegt. **Home Assistant** kann Zustände auf ausdrücklichen Abruf über die [offizielle REST-API](https://developers.home-assistant.io/docs/api/rest/) lesen. Basisadresse und Zugriffstoken verbleiben nur im Arbeitsspeicher dieses Dialogbereichs; weder Projekt, IndexedDB noch JSON-Export enthalten sie. Die Implementierung verwendet ausschließlich GET /api/states, keine Steuerbefehle oder automatische Aktualisierung. Umleitungen werden nicht verfolgt.

Der Browser benötigt Zugriff auf die Instanz und eine passende CORS-Freigabe für den App-Origin. HTTPS/HTTP-Mischbetrieb kann der Browser blockieren. Die Verbindung wurde mit einer simulierten API getestet; ein Test mit einer konkreten Hausinstallation benötigt deren Adresse und einen im Dialog eingegebenen Token.

## Datenformat und Architektur

Das bestehende Projektformat bleibt Schema 10. Die bewusst erweiterbaren Metadaten erhalten zwei reservierte, strikt validierte Einträge:

- `project.metadata.housebook`, Formatversion 1: Grundrissvorlagen pro Geschoss-ID, benannte Szenarien, Netzwerkobjekte/-verbindungen und Raumvorlagen.
- `entity.metadata.asset`: Objektakte, Umbauzustand und optionale Wandbefestigung.

Projekte ohne diese Einträge benötigen keine Migration. Import, lokale Speicherung und Modelltransaktionen prüfen die neuen Strukturen zusätzlich zum vorhandenen Projektschema. Höchstens 4 MB kodierte Bilddaten pro Bild und 18 MB kompaktes JSON pro erweitertem Projekt halten einen erneuten Import innerhalb des bestehenden 20-MB-Dateilimits möglich. Raumvorlagen enthalten einen eingefrorenen validierten Projektschnappschuss ohne verschachtelte Hausakte; beim Einfügen wird nur der gewünschte Raum samt Abhängigkeiten übernommen.

Die IndexedDB-Version steigt auf 2 und ergänzt `snapshots`, ohne bestehende Projekte zu ersetzen. Der bestehende Migrationstest lädt weiterhin Projektversionen 1 bis 9.

PDF-Import nutzt [PDF.js](https://mozilla.github.io/pdf.js/examples/), PDF-Erstellung [jsPDF](https://github.com/parallax/jsPDF), jeweils bei Bedarf geladen. Die eingebettete Schrift Noto Sans liegt lokal unter `public/fonts`, einschließlich ihrer SIL-OFL-Lizenz; Quelle: [Noto Fonts](https://github.com/notofonts/noto-fonts). Das Rendern und der Export benötigen keine externen Schrift- oder PDF-Dienste.

3D bleibt gemäß der vorgeschlagenen Reihenfolge eine spätere Ausbaustufe.
