# Wasser, Heizung und Gas

Seit Version 0.16.0 gibt es den Planungsbereich **Wasser / Wärme / Gas**. Die Daten bleiben wie der übrige Plan lokal im Projekt und werden beim JSON-Export mitgesichert.

## Komponenten platzieren

1. Bereich öffnen und Leitungsmedium wählen: Kaltwasser (KW), Warmwasser (WW), Heizung Vorlauf (VL), Heizung Rücklauf (RL) oder Gas (GAS).
2. Komponentenart wählen und **Komponente platzieren** aktivieren.
3. Den Mittelpunkt im Plan antippen. Unter **Eigenschaften** Namen, Position, Maße, Drehung und Anschlusshöhe bearbeiten.

Hausanschluss, Zähler, Absperrventil, Abzweig und Verteiler übernehmen das gewählte Medium.
Entnahmestelle und Warmwasserspeicher haben Kalt- und Warmwasseranschlüsse.
Heizkörper, Fußbodenheizkreis und Wärmeerzeuger haben Vor- und Rücklauf; eine Gasheizung hat zusätzlich einen Gasanschluss.
Ein Gasgerät hat ausschließlich einen Gasanschluss. Das sind schematische Anschlussgruppen am Objektmittelpunkt.

Maße sind bearbeitbare Platzhalter und keine Herstellerangaben. Heizleistung in Watt, dokumentierter Druck in bar und Temperatur in °C bleiben zunächst unbekannt. Die Anschlusshöhe ist relativ zur Etagenhöhe; negative Werte sind etwa für Leitungen unterhalb des Bodens möglich.
Unter **Objektakte und Umbauzustand** können Hersteller, Modell, Seriennummer, Wartung und Notizen erfasst werden.

## Leitungen zeichnen

**Rohrleitung zeichnen** aktivieren, einen passenden Startanschluss antippen, bei Bedarf Wegpunkte setzen und am Zielanschluss abschließen. Für Abzweige eine eigene Abzweig-Komponente verwenden; eine reine Linienkreuzung stellt keine Verbindung her.
Vorlauf und Rücklauf werden als getrennte Leitungen angelegt. Das Medium muss an beiden Anschlussobjekten vorhanden sein. Selbstverbindungen und doppelte Verbindungen desselben Mediums werden abgelehnt.

In den Eigenschaften einer Leitung lassen sich Rohrmaterial, Nennweite DN, Dämmstärke und Längenzuschlag dokumentieren. DN ist eine Nennweitenangabe und kein gemessener Innen- oder Außendurchmesser.
Wegpunkte können numerisch bearbeitet, ergänzt und gelöscht werden.

Für eine Verbindung zwischen Geschossen **Anschlüsse verbinden / Etagenleitung** öffnen und beide Objekte auswählen.
Der Steigpunkt wird zunächst unter dem Zielanschluss angelegt und lässt sich in X/Y bearbeiten.
Auf der Startetage führt der Verlauf über die eingegebenen Wegpunkte zum Steigpunkt; auf der Zieletage direkt vom Steigpunkt zum Ziel.
Die Verbindung wird auf beiden Anschlussgeschossen dargestellt; auf durchquerten Zwischengeschossen erscheint sie nicht automatisch.

Die angezeigte Planlänge summiert horizontale Teilstrecken, den absoluten Höhenunterschied beider Anschlüsse und den Zuschlag.
Bei unterschiedlichen Anschlusshöhen ist dies eine vereinfachte rechtwinklige Höhenführung. Zusätzliche vertikale Umwege müssen als Zuschlag dokumentiert werden.

## Bearbeiten und Ausgabe

- Mit **Auswahl** Komponenten oder Rohre auswählen und ziehen; Pfeiltasten und numerische Verschiebung sind ebenfalls möglich.
- Leitungsenden folgen verschobenen Komponenten. Beim Löschen eines Anschlussobjekts werden seine Leitungen mit entfernt; Rückgängig stellt sie wieder her.
- Zum Duplizieren einer Leitung beide Anschlussobjekte mit auswählen. Raumvorlagen übernehmen Komponenten innerhalb des Raums und deren interne Leitungen.
- Die Ebenen Wasser, Heizung und Gas lassen sich getrennt ausblenden oder sperren. Indirekte Geometrieänderungen an gesperrten Leitungen werden ebenfalls verhindert.
- PDF und SVG enthalten die Rohrnetze im **Gesamtplan**; die Materialliste enthält Komponenten und Rohrlängen samt DN, Material und Dämmung.
- Auf dem iPad erst **Werkzeuge** öffnen, den Bereich und das Werkzeug wählen, dann die Seitenleiste zum Zeichnen schließen. **Eigenschaften** öffnet die Bearbeitung.

## Modellgrenzen

Dies ist eine Bestands- und Planungsdokumentation. Druck, Temperatur, Heizleistung und Ventilstellung sind gespeicherte Angaben, keine Simulationsergebnisse.
Es gibt noch keine Berechnung von Durchfluss, Druckverlust, Wärmebedarf, hydraulischem Abgleich, Gasdimensionierung oder Normkonformität.
Eine geschlossene Ventilstellung wird dargestellt, berechnet jedoch keine Versorgungsausfälle.
Warmwasserzirkulation, Abwasser, Pumpenkennlinien und eine elektrische Kopplung von Wärmeerzeugern sind weitere Ausbaustufen.
