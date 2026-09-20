# Architekturentscheidungen

## Umfang und Stack

Phase 1 ist ein lokaler Grundrisseditor mit React, TypeScript, Vite, Zustand und react-konva.
Modelle, Geometrie, Editoraktionen, Darstellung und Persistenz besitzen getrennte Module.
Zod prüft externe und veränderte Projektdaten zur Laufzeit; Vitest und Playwright prüfen Modell und Bedienabläufe.

## Datenfluss

```text
Bedienereignis → Werkzeug → Modellaktion → Validierung → Projektstore
                                                       ├─ Rendering
                                                       ├─ Historie
                                                       └─ Persistenz
```

- `models` importiert keine Laufzeitbibliotheken.
- `geometry` kennt mathematische Werte und IDs, keine UI und keinen Store.
- `core` erzeugt und validiert Projekte und berechnet Ansichten aus gültigen Projekten.
- `editor/actions` verändert ausschließlich den übergebenen Projektentwurf.
- `editor/history/transaction` arbeitet auf einer tiefen Kopie und prüft Sperren und Modellintegrität vor dem Commit.
- `editor/interaction` übersetzt DOM-Ereignisse in Werkzeugzustände und Modellaktionen.
- `rendering` zeichnet Modell- und Vorschauzustände. Canvas-Objekte besitzen keine persistenten Fachdaten.
- Der Editorstore enthält Auswahl, Werkzeug, Vorschau, Snap-Ziel und Viewport; der Projektstore enthält Dokument und Historie.
- `persistence` verwendet das Projektmodell und einen Repository-Vertrag. Autosave verbindet diesen mit dem Store.

## SVG oder Konva

Beide Varianten erlauben präzise Geometrie. SVG bietet DOM-Zugänglichkeit und direkte Vektorausgabe;
react-konva liefert deklarative Canvas-Bindungen für den interaktiven Editor. Für Phase 1 ist Konva gewählt.

Das Projektformat ist vollständig rendererunabhängig. Es wird kein Konva-Bühnenbaum gespeichert.
Drei Canvas-Ebenen trennen Raster, Modell und Interaktionsvorschau. Fachliche Projektebenen sind eigenständige
Datenobjekte und erzeugen nicht jeweils ein Canvas. Hit-Tests erfolgen anhand der Modellgeometrie.
Eine HTML-Objektliste ergänzt den Canvas. Nicht sichtbare Wand-/Raumgeometrie außerhalb des Viewports wird ausgespart.

Offizielle Grundlagen:

- [Konva: Performance](https://konvajs.org/docs/performance/All_Performance_Tips.html)
- [Konva: Anwendungszustand serialisieren](https://konvajs.org/docs/data_and_serialization/Best_Practices.html)
- [MDN: SVG](https://developer.mozilla.org/en-US/docs/Web/SVG)
- [Zod: Laufzeitschemas](https://zod.dev/api)
- [Vitest](https://vitest.dev/guide/)

## Geometrie und Topologie

Koordinaten liegen in `PlanPoint`. Wände referenzieren Start- und Endpunkt. Räume referenzieren einen geordneten
Punktring und die zugehörigen Wände. Eine Wand darf höchstens einen Raum je Seite begrenzen.
Ringe sind implizit geschlossen; der erste Punkt wird nicht wiederholt. Beide Umlaufrichtungen sind zulässig.

Beim Zeichnen werden identische Endpunkte wiederverwendet. Anschlüsse im Wandinneren teilen eine Wand atomar und
führen Raum- und Öffnungsreferenzen mit. Das Startsegment behält die Wand-ID; das neue Segment erhält eine neue UUID.
Eine Teilung innerhalb einer Öffnung wird abgelehnt. Kreuzungen und kollineare Teilsegmente werden beim Zeichnen aufgelöst.

Wandlängenänderungen halten Richtung und gewählten Endpunkt fest. Der andere gemeinsame Punkt bewegt sich und zieht
angeschlossene Geometrie mit. Für Rechteckräume skaliert eine eigene Aktion Länge und Breite in ihren lokalen Achsen.
Ein allgemeiner Constraint-Solver ist nicht vorgesehen. Verschieben verbindet zuvor getrennte Geometrie nicht automatisch.

Öffnungspositionen sind Millimeterabstände vom Wandstart zur Öffnungsmitte. Eine spätere Wandrichtungsumkehr muss
Position und Öffnungsrichtung umrechnen. Öffnungen derselben Wand dürfen sich horizontal nicht überlappen.
Wandhöhe, Öffnungshöhe und Fensterbrüstung werden auf Vereinbarkeit geprüft.

Wandkörper besitzen derzeit gerade Endkappen. Ausgearbeitete Gehrungen und lichte Innenkonturen sind nicht enthalten.
Raumflächen sind sichtbar gekennzeichnete **Wandachsflächen**. Längen, Flächen, Umfänge und Wand-Raum-Zuordnungen
werden berechnet, nicht redundant gespeichert. Die Rechentoleranz beträgt `1e-6 mm`.

## Koordinaten, Zoom und Snap

Alle Modelllängen sind Millimeter. X zeigt nach rechts, Y nach oben. Z wird über die Etagenhöhe vorbereitet.

```text
screenX = originX + worldX × scale
screenY = originY − worldY × scale
```

`scale` bedeutet CSS-Pixel pro Millimeter. Gerätepixel verändern keine Modellmaße. Zoom hält den Weltpunkt unter
dem Cursor fest, Pan verändert nur den Ursprung. Die Prozentanzeige verwendet `0,1 px/mm` als Referenzzoom.
Sie ist kein physischer Druckmaßstab.

Snap priorisiert Punkte vor Wandprojektionen vor Rasterpunkten. Der Fangradius beträgt 9 Pixel; eine Halteschwelle
von 1,5 × Radius stabilisiert vorhandene Punkt-/Wandziele. Der Aufrufer übergibt das letzte Ziel an den reinen Snap-Kern.
Geschoss und Sichtbarkeit filtern die Kandidaten. Der Snap-Kern verändert keine Topologie.

Explizite numerische Längen haben Vorrang vor Fangzielen. Maßfelder verwenden ihre Anzeigeeinheit; das Schnellmaß
ohne Suffix verwendet mm. Dezimalpunkt und Dezimalkomma sind erlaubt, Tausendergruppierungen nicht.

## Projektformat und Validierung

Das Format verwendet `schemaVersion: 10`. `version` ist die Dokumentrevision, unabhängig von der App-Version.
UUIDs sind projektweit eindeutig. Tabellenschlüssel entsprechen der Objekt-ID. Geschoss- und Ebenenreihenfolgen
enthalten jedes Objekt genau einmal. Metadaten enthalten ausschließlich endliche JSON-Werte.

Strikte Zod-Schemas prüfen Strukturen; fachliche Prüfungen kontrollieren Referenzen, Geschosse, Raumringe und Öffnungen.
Zyklen, Klasseninstanzen und übermäßig tiefe Strukturen werden vorab zurückgewiesen. Fehler liefern Pfad und Ursache.
Unbekannte Felder und Schemaversionen werden abgelehnt. Der Import ersetzt das aktive Projekt erst nach vollständiger
Prüfung und vorheriger Speicherung. `persistence/migrations.ts` validiert Versionen 1 bis 9 strikt. Version 1 erhält
zusätzlich eine Möbeltabelle; Versionen 1/2 erhalten die Elektrikstruktur und fehlende Fachebenen. Version 3 erhält
leere Tabellen für `junctions` und `cables`. Alle bestehenden IDs, Geometrien, Metadaten, Revisionen und Zeiten bleiben
erhalten. Die Migration läuft beim JSON-Import und beim lokalen Laden. Ein lokaler Altbestand wird einmalig migriert
gespeichert, ohne dabei das aktive Projekt zu wechseln. Erst nach vollständiger Validierung wird geschrieben.

## Historie und Persistenz

Ein abgeschlossener Bearbeitungsschritt entspricht einer Transaktion. Ziehvorschauen erzeugen keine Historieneinträge;
Escape verwirft sie. Ein Drag ergibt einen Eintrag. Neue Änderungen nach Undo löschen den Redo-Zweig.
Dokumentrevision und Änderungszeit werden bei Undo/Redo neu vergeben. Die Historie ist sitzungsbezogen.

Der MVP speichert unveränderliche Projektschnappschüsse. Pro Historienrichtung gelten maximal 50 Einträge und ein
geschätztes 20-MB-Budget; mindestens der letzte Eintrag bleibt erhalten. Eine spätere Patch-Historie kann den internen
Speicher austauschen, ohne Modellaktionen oder Werkzeuge zu ändern.

IndexedDB speichert Projekte über einen kleinen Repository-Vertrag. Projekt und aktive Projekt-ID werden in derselben
Datenbanktransaktion geschrieben. Autosave wartet 500 ms nach Änderungen. Schreibvorgänge laufen geordnet, und nur
der tatsächlich gespeicherte aktuelle Schnappschuss erhält den Status „Gespeichert“. Fehler bleiben sichtbar.
Manuelles Speichern wartet auf den Abschluss. JSON-Export bleibt unabhängig von IndexedDB nutzbar.

Speicher ist an Browserprofil und Origin gebunden. Gleichzeitige Bearbeitung desselben Projekts in mehreren Tabs
wird nicht zusammengeführt; das ist keine kollaborative Anwendung. Browser-Speicher ersetzt kein externes Backup.

## Geplante Erweiterungen

Weitere technische Netze erhalten eigene Module und ID-Referenzen auf Geschosse, Räume und Wände.
Elektrische Anschlüsse werden eigene Knoten/Ports: räumliche Nähe oder gemeinsame Grundrisspunkte sind keine
elektrische Verbindung. Leitertypen, Querschnitte, Netzarten und Schutzgeräte gehören in eigene Fachmodelle.

Simulation erhält einen unveränderlichen technischen Modellschnappschuss und ein Szenario. Ergebnisse werden separat
nach Objekt-ID zurückgegeben; Typenschildwerte bleiben erhalten. Netzwege benötigen später Z-Koordinaten und getrennte
geometrische beziehungsweise angesetzte Kabellängen. Simulation importiert weder React noch Editorstores.

Wand-, Raum-, Öffnungs- und Geschosshöhen ermöglichen spätere 3D-Ableitungen. Für diese Erweiterungen gibt es noch
keine ungenutzten Modulgerüste. Elektrik wird iterativ ergänzt; Wasser, Gas, Netzwerke, Zigbee, Home Assistant und 3D bleiben spätere Phasen.

## Phase 2: Möbel und freie Objekte

`Furniture` liegt als UUID-Tabelle im Projekt. Es enthält Typ, Name, Geschoss-/Ebenen-ID, optionale Raum-ID,
Mittelpunkt, Rotation (Radiant gegen den Uhrzeigersinn), Breite, Tiefe, Höhe und Metadaten. Typ ist ein erweiterbarer
String; der Katalog liefert lediglich Startwerte. Gespeicherte Objekte hängen nicht von Katalogvorlagen ab.

Geometrie und Treffertest arbeiten mit dem invers transformierten Punkt beziehungsweise vier gedrehten Ecken.
Konva bildet diese Daten deklarativ ab; Drag-Vorschauen verändern das gespeicherte Modell nicht. Eigenschaften,
Verschieben, Löschen und Duplizieren laufen durch dieselben validierten Transaktionen und Historie wie der Grundriss.
Raumzuordnungen werden vor der Transaktionsvalidierung aus dem Mittelpunkt abgeleitet. Bei Mehrdeutigkeit ist
`roomId` null. Raumbewegungen verschieben Möbel nicht implizit. Ebenensperren gelten auch für Möbel und indirekte
Änderungen ihrer Raumzuordnung. Die Geometrie erlaubt Überlappungen; ein Kollisionssystem ist noch nicht vorhanden.

## Phase 3, erster Schritt: Elektrikdokumentation

`project.electrical` enthält getrennte UUID-Tabellen für `outlets`, `devices`, `distributionBoards`,
`circuits` und `protectionDevices`. Modelle, Relationen und Selektoren importieren weder React noch Stores.
`core/elementTables.ts` stellt dem Editor die räumlichen Tabellen bereit, ohne Daten zu kopieren oder Fachmodelle
zusammenzulegen. Auswahl, Verschieben, Ebenensperren und Historie verwenden diese Referenzen.

Ein Verbraucher referenziert entweder eine Steckdose über `connectionPointId` oder einen Stromkreis über
`circuitId`; beide gleichzeitig sind ungültig. `connectionPointId` bezeichnet in Schema 3 bis 5 ausdrücklich eine
Steckdosen-ID. Eine spätere Leiter-/Polauflösung kann diese Referenz auf einen dedizierten Anschlussport migrieren.
Bei Steckdosenanschluss wird der Stromkreis abgeleitet. Zugeordnete Geräte-/Steckdosenlisten und die Liste der
Verteilerstromkreise werden ebenfalls abgeleitet statt redundant gespeichert.

Unbekannte elektrische Kennwerte sind `null`; keine Berechnung ergänzt sie stillschweigend. Die Summe erfasster
Nennleistungen ist ein Bestandswert, unabhängig vom dokumentierten Betriebszustand. Unbekannte Leistungswerte
werden separat gezählt. Schutzgerätparameter sind Bestandsdaten, keine technische Schutzbewertung.

Raum- und Wandzuordnungen werden anhand der Position aktualisiert, elektrische Verbindungen ausschließlich
explizit gesetzt. Ein Möbelbezug ist eine fachliche ID-Referenz und bewegt den Verbraucher nicht automatisch.
Löschen löst Referenzen in derselben Undo-Transaktion. Modellaktionen können gemeinsam duplizierte Verbraucher,
Steckdosen und Möbel intern auf die Kopien referenzieren; die Oberfläche begrenzt Mehrfachauswahl auf einen Bereich.
Das Duplizieren eines Verteilers kopiert nur dessen Position
und Eigenschaften, nicht seine Stromkreise.

## Leitungswege und Bauteilgraph

`junctions` enthält Abzweigdosen, Klemmen und freie Verbindungspunkte. `cables` referenziert Start-/Endobjekte über
globale UUIDs. Der geordnete `path` enthält ausschließlich Zwischenpunkte in Millimetern. `cablePath` ergänzt die
aktuellen Endobjektpositionen; `cableLengths` summiert Segmente und optionalen Zuschlag. Es werden keine redundanten
Endpunktkoordinaten oder Längen gespeichert. Kabeldaten enthalten Typ, Aderanzahl, Querschnitt (mm²), Material,
Verlegeart und Bemessungsspannung; unbekannte numerische Werte bleiben `null`.

`buildCableGraph` erzeugt einen vom Editor unabhängigen JSON-Schnappschuss aus vorhandenen Bauteil-IDs als Knoten
und Kabel-IDs als Kanten. Sichtbarkeit verändert diesen Graphen nicht. Linienkreuzungen, Nähe und bloße Platzierung
einer Abzweigdose auf einem Kabel erzeugen keine zusätzlichen Verbindungen. Verbindungspunkte müssen ausdrücklich
als Leitungsenden referenziert werden. Bestandsangaben zu Geräteanschlüssen und Stromkreisen bleiben getrennt.

Kabel zeichnen ist eine Transaktion; Zwischenpunkte und Endpunktvorschau liegen nur im Editorstore. Endpunkte folgen
bewegten Objekten. Kabelziehen verändert Zwischenpunkte, nicht Endobjekte. Löschen entfernt abhängige Kabel;
gemeinsames Duplizieren von Endobjekten und Kabeln remappt Referenzen. Gesperrte Kabel verhindern auch indirekte
Geometrieänderungen durch bewegte Endobjekte. Nullsegmente und fehlende Knoten werden abgelehnt; seit Schema 10 erlaubt ein expliziter Steigpunkt Etagenwechsel und rein vertikale Wege.

Der jetzige Kabelgraph liegt auf Bauteilebene und enthält noch keine Leiter-/Polauflösung oder Schaltkontakte.
Die erste Lastsimulation verwendet einen getrennten Versorgungsgraphen aus den expliziten Zuordnungen.

## Phase 4: statische Stromkreissimulation

`simulation/graph.ts` projiziert die vorhandenen UUIDs in einen gerichteten radialen Graphen:
Einspeisung → Zähler → Verteiler → Schutzkette → Stromkreis → Steckdose → Verbraucher.
Festanschlüsse hängen direkt am Stromkreis, Unterverteilungen am zugeordneten Zuleitungsstromkreis.
Der Graph ist unabhängig von Kabelgeometrie, Etagen und Sichtbarkeit. Er erfindet keine Leiterverbindungen.

`simulation/solve.ts` propagiert Quelle und verfügbare Phasen iterativ von den Wurzeln zu den Verbrauchern.
Konfigurierte Phasen bleiben von ausgefallenen Phasen getrennt: unbekannte Zuordnungen wandern bei einem
Phasenausfall nicht auf eine verbleibende Phase. Einphasige Quellen verwenden die Konvention L1.
Jede Last wird entlang ihrer Vorfahren genau einmal summiert, auch bei gemeinsamen Sicherungen und Unterverteilungen.
Wirk- und Blindstromanteile werden pro Phase addiert; deren Betrag ergibt den resultierenden Strom.

`simulation/load.ts` löst nominale P/U/I/cos-φ-Beziehungen für einphasige und symmetrische dreiphasige Lasten.
Das Modell setzt sinusförmige induktive Lasten voraus. Fehlende Leistungsfaktoren können ausdrücklich mit 1
angenommen werden; Ergebnisse tragen dann eine Schätzungsmarkierung. Widersprüche und unbekannte Daten
bleiben sichtbar. Unvollständige Lasten verhindern eine scheinbar exakte Gesamtauslastung.
Überlast ist eine Überschreitung der dokumentierten Belastbarkeit, keine simulierte Auslösung.
Leitungsimpedanzen, Fehlerströme, Kurzschlüsse, Auslösekennlinien und Energieintegration bleiben spätere Schritte.

Alle Simulationsmodule sind frei von React und Zustand. `SimulationScenario` und `SimulationResult` sind
JSON-serialisierbare Daten ohne Änderungen am Projektmodell. Der separate `simulationStore` hält Szenarioschalter
und Ergebnisse; jede neue Projektreferenz beendet das Szenario. Keine Projekthistorie, Autosave-Daten oder
Zählerstände werden geändert. Dialog und Konva-Overlay rendern dieselben Ergebnisse. Die erste Simulation in
App-Version 0.7.0 benötigte keine Schemaänderung; Lichtschalter ergänzen in 0.8.0 das Schema 7.

## Lichtschalter (Schema 7)

`electrical.switches` speichert `LightSwitch` mit UUID, Position, Etage, Ebene, Raum-/Wandbezug,
`type: singlePole`, optionaler Stromkreis-ID und dokumentierter Kontaktstellung `closed`.
Verbraucher referenzieren den Schalter mit `switchId`; die Liste geschalteter Geräte wird daraus abgeleitet.
Die Validierung erlaubt diese Referenz nur für einphasige Festanschlüsse am selben Stromkreis. Steckdosenanschlüsse
waren im ersten Schritt nicht enthalten. Seit Schema 9 können Schalter in Reihe vorgeschaltet werden. Nicht zugeordnete Schalter dürfen geplant werden.

Der Versorgungsgraph fügt den Schalter zwischen Stromkreis und Verbraucher ein. Ein offener Kontakt entfernt
die verfügbaren Phasen seiner Nachfolger; geschaltete Lasten zählen genau einmal für Schalter und alle Vorgänger.
`SimulationScenario.switchStates` überschreibt temporär die dokumentierte Stellung. Gerätebetrieb bleibt unabhängig.
Das Modell ist eine logische Ein-/Aus-Schaltung, kein aufgelöstes Leiter-/Kontaktmodell für Wechselschaltungen.

Schalter unterstützen dieselben Editoraktionen, Ebenensperren und Kabelendpunkte wie andere Elektroobjekte.
Gemeinsames Duplizieren remappt interne Schalter- und Kabelreferenzen. Löschen löst Schalterreferenzen und abhängige
Kabel atomar; Geräte bleiben direkt ihrem Stromkreis zugeordnet. Löschen des Stromkreises löst beide Zuordnungen.
Schema-6-Migration ergänzt eine leere Schaltertabelle und `switchId: null`, ohne Bestandsdaten oder Revisionen zu ändern.

## Kontaktbelegung und Anschlussdialog (Schema 8, App 0.9.0)

`Cable.conductorConnections` enthält Paare aus `startContactId` und `endContactId`, jeweils innerhalb des über
UUID referenzierten Endobjekts. Diese stabilen lokalen IDs stammen aus `electrical/contacts.ts`: L, L1–L3, N, PE
beziehungsweise L und L_OUT für den einfachen Schalter. Die Leitung bleibt ein eigenständiges Objekt mit UUID.
Die Kontaktvorlagen sind generisch, keine Herstellerdatenbank. Herstellerspezifische Schaltbilder unterscheiden
Gerätetypen und Kontakte, siehe [Gira – Schaltbilder](https://download.gira.de/de_DE/download.html?id=3053).

`connectionAssignment` unterscheidet reine Belegungsdokumentation von einer ausdrücklich übernommenen
Schalter- oder Steckdosenzuordnung. Die Fachdaten bleiben konsistent: Nur eine verwaltende Anschlussleitung pro
Verbraucher, passendes Kontaktpaar, passende Phase und derselbe Stromkreis. Fehlende oder doppelte Kontakte und
unvereinbare Rollen werden beim Import und jeder Transaktion abgelehnt. Globale Mehrfachbelegung physischer Klemmen
und herstellerspezifische Anschlusskapazitäten werden noch nicht geprüft.

Der Anschlussdialog verändert zunächst nur lokalen Entwurfszustand. Ein Pointer-Gesture oder zwei Klicks öffnen
denselben Dialog; eine Formularalternative erlaubt die Bedienung ohne Ziehen. Escape, Pointercancel und Werkzeugwechsel
verwerfen Entwürfe. Erst Bestätigung erzeugt Leitung, Belegung und optional Versorgung in einer validierten Transaktion.
Eine zwischenzeitliche Dokumentänderung verhindert das Speichern eines veralteten Dialogentwurfs.

`setCableContacts` ist unabhängig von React. Entfernen einer verwaltenden Anschlussleitung löst deren Gerätebezug
und bei einem Schalter auch den von ihr verwalteten Festanschluss. Die Transaktionsgrenze bereinigt gelöschte Leitungen
vor Sperrprüfung und Validierung, einschließlich indirekter Löschung durch entfernte Endobjekte.
Eine dokumentarische Leitung verändert keine anderen Versorgungsreferenzen. Gemeinsames Duplizieren remappt
Endobjekte; ohne mitkopierten Verbraucher bleibt eine Leitungskopie reine Dokumentation.

Schema 7 wird strikt eingelesen und erhält je Kabel `conductorConnections: []` sowie `connectionAssignment: none`.
Alte Kabel erzeugen dadurch keine neuen Simulationsverbindungen. Schema 8 ist noch kein Leitergraph-Solver:
Die Simulation verwendet die vorhandenen radialen Zuordnungen; Kontaktbelegung dokumentiert weitere Anschlussdetails.

## Reihenschaltung und Betriebsdarstellung (Schema 9, App 0.10.0)

`LightSwitch.supply` ist eine diskriminierte Union: `circuit`, `switch` mit Vorgänger-UUID oder `disconnected`.
Die Stromkreis-ID beschreibt weiterhin die fachliche Zuordnung. Alle Schalter einer Kette gehören demselben
Stromkreis an; Referenzprüfungen und `switchChain` verhindern Zyklen. Ein Verbraucher referenziert weiterhin den
letzten Schalter über `switchId`. Dadurch bleiben bestehende Kontaktbelegungen zur Lampe gültig.

Der reine Versorgungsgraph verwendet den Vorgängerschalter als Parent. Dieselbe Erreichbarkeitsrechnung liefert
damit das UND-Verhalten für beliebig viele aufeinanderfolgende Kontakte. Verzweigungen sind möglich; jede Last
zählt pro durchlaufenem Schalter und Vorgänger genau einmal. Es gibt keine unabhängige UI-Schaltlogik.
Beim Löschen eines Vorgängers wird der Nachfolger ausdrücklich `disconnected`, damit kein Ersatzanschluss an den
Stromkreis entsteht. Kopien remappen gemeinsam kopierte Vorgänger. Schema 8 erhält `supply: { kind: circuit }`
und behält damit sein bisheriges Verhalten ohne Änderungen an Lastdaten, Revisionen oder Kontaktbelegungen.

`rendering/deviceAppearance.ts` übersetzt ausschließlich berechnete Gerätezustände in Symbol, Text und Farbe.
Positive aktive Lampenlasten erhalten einen statischen Lichtschein, andere Verbraucher eine Betriebsanzeige.
Off, unpowered, incomplete und 0 W werden unterschieden. `metadata.electricalSymbol` ist eine optionale reine
Darstellungspräferenz; sie verändert weder Gerätetyp noch Berechnungen. Ohne Präferenz werden Typ und bei generischen
Objekten Lichtnamen ausgewertet. Es wird keine Leuchtintensität aus Watt physikalisch simuliert.

`SimulationPlanControls` positioniert zugängliche HTML-Schalter über dem Canvas. Sie verändern nur `switchStates`
im Szenariostore und sind auch mit Tastatur bedienbar. Canvas-Symbole, Textmarkierungen und HTML-Objektliste
lesen dasselbe Simulationsergebnis. Es gibt keinen lokalen Betriebszustand in Konva-Elementen.

## Einspeisung, Zähler und Sicherungskästen (Schema 5)

`electrical.settings` enthält positive projektweite Spannungen L–N und L–L (anfangs 230/400 V).
`supplies` und `meters` sind reguläre räumliche Objekttabellen mit UUIDs, Ebenen, Raum-/Etagenbezug und Weltposition.
Die Einspeisung speichert Phasenanzahl, optionale eigene Spannungen und Anschlusskapazität je Phase.
`null` bei Einspeisespannungen bedeutet dynamische Übernahme aus dem Projektstandard. Kapazität `null` bleibt unbekannt.
Ein Zähler referenziert genau einen optionalen Einspeisepunkt und enthält Seriennummer sowie manuellen kWh-Zählerstand.

Ein Kasten referenziert entweder einen Zähler (`meterId`), eine Einspeisung (`supplyId`) oder seit Schema 6
einen vorgeschalteten Stromkreis (`upstreamCircuitId`). Mehrere gleichzeitige Versorgungsreferenzen sind ungültig.
Stromkreise und Schutzgeräte gehören über `distributionBoardId` zum Kasten. Schutzgeräte können einen Vorgänger
im selben Kasten referenzieren (`upstreamProtectionDeviceId`); fehlende Referenzen und Zyklen sind ungültig.
Diese radialen Zuordnungen sind unabhängig von den gezeichneten Kabelwegen. Kreuzungen oder räumliche Nähe erzeugen
auch hier keine Verbindungen. Die Erweiterung um Leiter-/Polgraphen steht aus.

`distributionTopology.ts` verfolgt die radiale Kasten-/Stromkreiszuordnung iterativ mit Zyklenerkennung.
Die Ableitung enthält alle Zuleitungsstromkreise und ihre Schutzketten von der Wurzel bis zum Ziel.
Phasenwidersprüche, fehlende Absicherung einer Zuleitung und gemeinsam genutzte Sicherungen werden angezeigt.
Validierung verhindert Zyklen auch beim Umhängen eines bereits verwendeten Stromkreises. Schema 5 erhält
bei der Migration ausschließlich `upstreamCircuitId: null`; bestehende Versorgungen bleiben erhalten.
Löschen eines einspeisenden Stromkreises löst die Eingangsreferenz des nachgeschalteten Kastens atomar.
Unterverteilungen werden in der Bestandsliste der Zuleitung angezeigt; Leistungssummen bleiben direkt zugeordnet.

`electrical/supply.ts` ist frei von React/Store-Abhängigkeiten. Es leitet Spannung und dokumentierte Absicherung
für Stromkreise, Steckdosen und Geräte aus diesen IDs ab. Der Projektstandard greift vor einer Quellenzuordnung;
nach Zuordnung ist die Quelle maßgeblich. Historische explizite Stromkreisspannungen bleiben erhalten und erzeugen
bei Widersprüchen einen Hinweis. Typenschildwerte sind keine gespeicherten Kopien der Versorgung.
Überstromschutz wird nur aus MCB/RCBO/Sicherung abgeleitet, nicht aus FI-Bemessungsströmen. Der kleinste bekannte
Nennwert dient als Planungsinformation; keine Stromregelung, Lastverteilung, Schutzbewertung oder Auslösesimulation.
Gemeinsam benutzte Sicherungen und unbekannte Werte werden kenntlich gemacht.

Migrationen ergänzen leere Quellen-/Zählertabellen, Projektvorgaben und leere Referenzen, erhalten aber bestehende
Kabel, Gerätewerte, Revisionen, UUIDs und Zeitstempel. Löschen einer Quelle/eines Zählers löst zugehörige Referenzen
und entfernt abhängige Kabel atomar; Undo stellt den Bestand wieder her. Duplizieren remappt gemeinsam ausgewählte
Quellen/Zähler/Kästen, kopiert aber noch keine Kastenstromkreise oder Schutzgeräte. Gesperrte Elektrikebenen verhindern
auch Änderungen der projektweiten Spannungsvorgaben.

## Bearbeitungsbereiche

Die Stromkreisübersicht verwendet reine Selektoren für explizit zugeordnete Steckdosen, Verbraucher und Kabel.
Längensummen werden aus Kabelgeometrie und Zuschlägen berechnet, unabhängig von aktiver Etage und Sichtbarkeit.
Die Navigation aus der Übersicht verändert ausschließlich den Editorstore: Bereich, Etage, Auswahl und Kamera.
Sie lässt Projekthistorie, Ebenensichtbarkeit und Sperren unverändert; ausgeblendete Ziele werden nicht geöffnet.

Der Editorstore hält den aktiven Tab (`building`, `furniture`, `electrical`) getrennt vom Projektmodell.
Tabwechsel verwerfen Auswahl und Zeichenentwurf. Werkzeugkürzel aktivieren ihren Bereich; Auswahl und Pan behalten ihn.
Canvas-Treffertest und HTML-Objektliste berücksichtigen den Bereich. Andere Fachebenen bleiben sichtbar, sind aber
nicht auswählbar. Die App entfernt zudem nicht passende Auswahlen nach Modelländerungen. Die globale Projekthistorie
bleibt erhalten; Undo/Redo ist kein separater Verlauf pro Tab. Die Tabs unterstützen Pfeiltasten sowie Home/End.

## Phase-1-Stand

1. Datenmodell, Geometrie, Einheiten und Validierung: umgesetzt.
2. Zeichenfläche, Raster, Zoom/Pan und Statusleiste: umgesetzt.
3. Wände, Schnellmaße, Snap und Anschlüsse: umgesetzt.
4. Rechteck-/Polygonräume und Flächen: umgesetzt.
5. Auswahl, Bearbeitung, Eigenschaften und Undo/Redo: umgesetzt.
6. Bemaßung, Türen und Fenster: umgesetzt.
7. Geschosse, Ebenen, Autosave, Projekte und JSON: umgesetzt.
8. Modell-, Persistenz- und Browserprüfungen: siehe [acceptance.md](acceptance.md).

Verbleibende MVP-Grenzen stehen in der [README](../README.md).

## Schaltgruppen, Trafos und Geschossleitungen (Schema 10)

Die aktuelle Erweiterung ist in [electrical-schema10.md](electrical-schema10.md) beschrieben.

## Hausakte (App 0.12.0)

Die Metadaten-Erweiterungen, separate Leiterprüfung, IndexedDB-Version 2 und neuen Arbeitsabläufe sind in [housebook.md](housebook.md) dokumentiert. Die ältere Roadmap oben beschreibt den jeweiligen historischen Phasenstand.

## Tablet-Bedienung (App 0.13.0)

Touch-Gesten werden in der Eingabesteuerung verarbeitet. Fingerplatzierungen erfolgen erst beim Loslassen;
Mehrfinger-Gesten ändern ausschließlich den Viewport und verwerfen laufende Verschiebevorschauen.
Dialoge verwenden ein Portal am Dokumentkörper, damit ausgeblendete Seitenleisten sie nicht verstecken.
UUIDs entstehen über eine zentrale Funktion mit `getRandomValues` als Alternative für HTTP-LAN-Adressen.
Bedienung und Testgrenzen: [iPad](ipad.md). Aktueller offener Umfang: [Roadmap](roadmap.md).

## Verdrahtete Fehler- und Relaisszenarien (App 0.14.0)

Die Leiterberechnung behält neben den Zusammenhangskomponenten einen gerichtungsmarkierten,
ansonsten ungerichteten Kontaktgraphen. Geschützte Verteilerkanten tragen die Schutzketten-IDs.
Fehlerpfade liefern vorzeichenbehaftete Beiträge zu deren phasenbezogenen Differenzströmen.
Parallele Pfade werden über alternative Wege erkannt und nicht mit einer willkürlichen Stromaufteilung bewertet.
Erreichte FI-Modellschwellen erzeugen einen neuen Berechnungspass mit geöffneten Schutzkontakten.
Eingabeprojekt und Szenario bleiben unverändert; automatische Abschaltungen sind abgeleitete Ergebnisse.

Ein Tasterimpuls vergleicht den Leitergraphen vor und während eines temporären Tastendrucks.
Nur neu versorgte Relaisspulen verändern den bistabilen Szenariozustand. Das Dokument bleibt unverändert.
Optionale `conductorFaults` in gespeicherten Szenarien sind streng validiert, ältere Szenarien bleiben lesbar.
Details und Grenzen: [Verdrahtete Simulation](conductor-simulation.md).

## Verbraucherdatenbank (App 0.15.0)

Die projektlokale Bibliothek liegt in `project.metadata.consumerLibrary`. Eine Platzierung erzeugt
ein eigenständiges Elektrogerät mit einer Momentaufnahme der Vorlagendaten. Maße, Rotation und
Jahresverbrauch liegen in `metadata.consumerShape`; Hersteller, Modell und Seriennummer in der
bestehenden Objektakte. Nennspannung und Nennleistung verwenden die bisherigen Gerätefelder.
Damit greifen Anschluss, Simulation, Verschieben, Löschen und Undo auf dasselbe Objekt zu.

Bibliothek und Abmessungen werden bei Projektimport und Transaktionen validiert. Ältere Projekte
ohne diese Metadaten bleiben unverändert lesbar. Bibliotheksimporte vergeben neue IDs.
Plananzeige, Auswahl, Ansichtsgrenzen und Vektorexport berücksichtigen die gedrehte Grundfläche.
Bedienung und Datenumfang: [Verbraucherdatenbank](consumer-library.md).

## Rohrnetze (App 0.16.0)

`metadata.utilities` enthält versionierte Tabellen `nodes` und `pipes`. Der gemeinsame Editorzugriff
stellt sie als `utilityNodes` und `utilityPipes` bereit, sodass Historie, Objektakten und Ebenensperren
auch für Rohrnetze gelten. Die optionale Erweiterung lässt ältere Projekte ohne Rohrnetze unverändert.
Die neue Ebenenart `heating` ergänzt die bestehenden Arten `water` und `gas`.

Komponenten definieren zulässige Anschlussmedien. Rohrleitungen referenzieren zwei Komponenten,
ein Medium, Wegpunkte und bei einem Etagenwechsel einen Steigpunkt. Endpunkte und Höhenstrecken
werden aus den Anschlussobjekten abgeleitet. Die Transaktionsprüfung berücksichtigt diese Abhängigkeiten
auch bei gesperrten Leitungen. Die Importprüfung validiert Datenformen vor dem Zugriff auf die Tabellen.
Numerische Betriebsdaten und Ventilstellungen sind reine Dokumentation; es gibt keinen Strömungslöser.
Bedienung und genaue Längenannahmen: [Wasser, Heizung und Gas](utilities.md).

## Private Hausübersicht (App 0.18.0)

`metadata.homeOverview` enthält ein separat validiertes Schema Version 1 für private Hausobjekte,
Zähler mit Ablesungen, Wartungsaufgaben mit Verlauf und Internetanschlussdaten. Die Projekt-Schemaversion
bleibt 10; Projekte ohne diesen optionalen Schlüssel bleiben unverändert lesbar. Netzwerkgeräte nutzen
weiterhin die vorhandenen `housebook.networkNodes`, ergänzt um optionale WLAN-Details.

Hausobjekte können eine Geschoss-/Positionsmarkierung und eine weiche Referenz auf ein Planobjekt
enthalten. Das Löschen des Planobjekts entfernt keine persönliche Dokumentation. Planmarkierungen
fließen in Ansicht, Zoom auf alle Objekte und Gesamtplanexport ein. Die Erzeugung einer Außenleuchte
legt elektrischen Verbraucher und persönliche Verknüpfung in einer gemeinsamen Transaktion an.

Ablesungen besitzen kalendarische Datumswerte und kumulierte, nichtnegative Messwerte. Validiert werden
eindeutige Tage/IDs und monotone Werte innerhalb eines Zählerabschnitts. `consumption` wertet chronologisch
sortierte, vollständig im Filter enthaltene Intervalle aus; ein Neustart unterbricht das Intervall.
UTC-Tagesdifferenzen vermeiden Sommerzeitabweichungen. Tarife sind ein aktueller manueller Rechenpreis,
keine Abrechnungsperioden. Wiederholte Wartungstermine verwenden monatsweise Addition mit Monatsendkürzung.

Alle Änderungen laufen über den Projektstore und dessen Validierung, Historie und IndexedDB-Sicherung.
Fotos verwenden die vorhandene Bildverkleinerung; die Gesamtgrenze von 18 MB gilt auch für diese Metadaten.
Die Hausakte wird weiterhin verzögert geladen. Es gibt keine Netzwerkabfrage, Hintergrundüberwachung oder
gemeinsame serverseitige Speicherung für diese neuen Bereiche.

## Wandfotos (App 0.17.0)

Wände speichern unter `metadata.wallPhotos` eine validierte Liste eingebetteter Bilder mit Beschreibungen,
Fotoverläufen und optionaler Zwei-Punkt-Referenz. Alle Punktkoordinaten sind auf die Bildbreite und -höhe
normiert; Bildanzeige und Zoom verändern diese Daten nicht. Längen verwenden beide Pixeldimensionen und
den Maßstab der Referenz. Fotoverläufe sind unabhängig von elektrischen und hydraulischen Netzobjekten.

Gespeicherte Änderungen laufen durch die gemeinsame Transaktionshistorie und Wandsperrprüfung.
Zeichenentwürfe bleiben lokal im Dialog, bis der Benutzer sie speichert. Pointer-Gesten unterscheiden
Tippen, Ziehen und Mehrfinger-Eingabe. Modal-Abbruch kann verhindert werden, um das Verwerfen eines
Entwurfs bestätigen zu lassen. Die bestehende Bildverarbeitung begrenzt die Auflösung; die Projektprüfung
wendet die 18-MB-Gesamtgrenze auch auf Projekte an, die ausschließlich Wandfotos enthalten.
Bedienung und Grenzen: [Wandfotos](wall-photos.md).
