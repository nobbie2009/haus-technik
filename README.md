# Home-Technik

Ein modularer technischer Hausplaner mit **Grundrisseditor, Möbelplanung, Elektrikdokumentation und statischer Stromkreissimulation**.
React, TypeScript, Vite, Zustand und react-konva. Daten und Berechnungen sind unabhängig vom Canvas.

## Grundstück per GPS erfassen

Auf iPhone und iPad lassen sich Grundstücksgrenzen, Wege, Beete und Referenzpunkte per Standortaufnahme erfassen. Benötigt HTTPS und Standortfreigabe; GPS dient zur Groberfassung. [Anleitung](docs/gps-grundstueck.md).

## Auf Proxmox bereitstellen

Der Codex-Skill [home-technik-proxmox-lxc](.agents/skills/home-technik-proxmox-lxc/SKILL.md)
beschreibt die Einrichtung eines LXC mit Nginx, geprüfte Builds, Updates und Rollback im Heimnetz.
Er enthält eine Nginx-Vorlage und getrennte Schritte für Build-Rechner, Proxmox-Host und Container.
Im Repository liegt er unter `.agents/skills/`; zur persönlichen Verwendung den gleichnamigen Ordner
nach `~/.codex/skills/` kopieren. Aufruf: `$home-technik-proxmox-lxc`.
Die Erstellung des Skills führt noch kein Deployment auf einem Server aus.

Auf dem Proxmox-Host das Repository herunterladen und den Assistenten als root starten:

```bash
git clone https://github.com/nobbie2009/haus-technik.git
cd haus-technik
bash .agents/skills/home-technik-proxmox-lxc/scripts/install.sh
```

Das Skript fragt alle Containerdaten ab. Ein Debian-Template muss bereits im Proxmox-Storage liegen.
Nach der Einrichtung im **LXC-Terminal** `Update` ausführen; `Update --check` prüft nur,
`Update --rollback` stellt die vorherige App-Version wieder her.
Vom Proxmox-Host zuerst mit `pct enter CT-ID` in den Container wechseln.
Die Versionsanzeige in der App meldet neue Releases automatisch; sie installiert nichts ohne dein Zutun.

## Neu in 0.23.0: Updates aus der App und Versionsangaben

Über die Versionsanzeige **Update installieren** auswählen, Update-Passwort eingeben und den Fortschritt
verfolgen. Bei neuen Installationen richtet der Assistent den Dienst automatisch ein. Für vorhandene
LXC-Installationen einmalig `Update` und danach `Update --setup-web` im Container ausführen.
Nach erfolgreicher Installation die neue Version bewusst über **Neue Version laden** öffnen.

Appname, Versionsnummer und „Copyright by nobbie2009“ stehen dauerhaft im App-Footer und
auf jeder Seite aller erzeugten PDFs.

## Seit 0.22.0: Installation und Updates

Interaktiver LXC-Installer, Update-Befehl mit Rollback und automatische Updatehinweise.
GitHub erstellt nach bestandener Projektprüfung versionierte Installationspakete.
Die CI verlangt für jeden neuen Update-Stand eine höhere Versionsnummer.

## Seit 0.21.0: Hausalltag und Gerätewechsel

Startseite mit Terminen, Ablesungen und Sicherungshinweisen, Hauschronik mit Fotos und Belegen,
geprüfte Sicherungsdateien und Gerätewechsel, QR-Aufkleber, druckbare Haus-Schnellübersicht sowie
Bewässerungszonen und Außenwasserstellen mit Pflegeaufgaben. [Anleitung](docs/house-life.md).

## Seit 0.20.0: Sicherungskasten-Aushang

Druckbare Stromkreisübersicht pro Verteiler mit Sicherungskennzeichnung, Räumen/Geräten,
FI-Zuordnung und eigenen Hinweisen als A4-PDF. [Anleitung](docs/board-schedule.md).

## Seit 0.19.0: Einrichtungsassistent, Suche und Solarakte

Unterbrechbarer Rundgang durch Haus und Technik, zentrale Suche nach Geräten und Unterlagen sowie
Balkonkraftwerke mit Modulen, Wechselrichter, optionalem Speicher und Ertragszähler.
[Anleitung](docs/setup-search-solar.md).

## Seit 0.18.0: Private Hausübersicht

Internet/WLAN, Absperrstellen, Rauchmelder, eigene Zähler- und Verbrauchsansicht, Wartungsverläufe sowie
Garten und Außenbeleuchtung. Mit Fotos, Planverknüpfungen, Terminen und CSV-Ausgabe.
[Anleitung](docs/private-overview.md).

## Seit 0.17.0: Wandfotos und Leitungsverläufe

Fotos direkt an Wänden sammeln, Wandseiten beschreiben und Leitungsverläufe auf den Bildern markieren.
Mit Fingerbedienung, Zoom, optionaler Referenzstrecke und SVG-Ausgabe. [Anleitung](docs/wall-photos.md).

## Seit 0.16.0: Wasser, Heizung und Gas

Technische Rohrnetze mit maßstäblichen Komponenten, getrennten Medien, Leitungsverläufen und
Etagenverbindungen dokumentieren. Rohrmaterial, DN, Dämmung, Heizleistung und Objektakten bearbeiten;
Ausgabe im Gesamtplan und in der Materialliste. [Anleitung und Modellgrenzen](docs/utilities.md).

## Seit 0.15.0: Verbraucherdatenbank

Eigene Geräte mit Hersteller, Modell, Seriennummer, Volt, Watt und kWh/Jahr speichern,
maßstäblich platzieren, drehen und an die Elektrik anschließen. Bibliotheken lassen sich
zwischen Projekten austauschen. [Anleitung](docs/consumer-library.md).

## Seit 0.14.0: verdrahtete Relais und Fehlerstrom-Szenarien

Die Leiterprüfung wertet Tasterimpulse an tatsächlich verbundenen Relaisspulen aus. L–PE-/L–N-Fehler
mit angegebenem Gesamtwiderstand zeigen Fehlerstrom und idealisierte FI-Reaktionen.
[Bedienung und Modellgrenzen](docs/conductor-simulation.md).

GitHub-CI, Dependabot und Beitragsvorlagen sind vorbereitet: [GitHub-Anleitung](docs/github.md).

## Seit 0.13.0: iPad und Touch

Einklappbare Seitenleisten, Hoch-/Querformat, Zwei-Finger-Zoom, Zeichenaktionen ohne Tastatur und WLAN-Start.
Anleitung und Testgrenzen: [iPad](docs/ipad.md). Offene Schritte: [Roadmap](docs/roadmap.md).

## Seit 0.12.0: Hausakte

Über **Hausakte** stehen Grundrissvorlagen (Bild/PDF), Projektprüfung, maßstäbliche PDF-/SVG-Ausgabe, Materiallisten, gespeicherte Szenarien, Versorgungsschema, separate Leiterprüfung, Objektakten, Umbauzustände, Raumvorlagen, Netzwerkplanung, Wiederherstellung und lesender Home-Assistant-Abruf bereit.

Bedienung, Datenformat und genaue Grenzen: [Hausakte](docs/housebook.md). Änderungen: [Changelog](CHANGELOG.md).

## Starten

Voraussetzung: Node.js 24 oder neuer und npm.

```powershell
npm ci
npm run dev
```

Öffnen: **http://127.0.0.1:5173/**. Der Server ist nur auf diesem Rechner erreichbar.

Vite aktualisiert die Oberfläche bei Quellcodeänderungen. Der Browser speichert Projekte in IndexedDB.
Bleibe bei derselben Adresse: `localhost`, `127.0.0.1` und andere Ports haben getrennte Browserspeicher.
Nach einem Browser-Neustart wird das zuletzt aktive Projekt geladen. Für eine unabhängige Sicherung gibt es JSON-Export.

Für einen Produktionsbuild:

```powershell
npm run build
npm run preview
```

Der Vorschau-Server verwendet standardmäßig Port 4173 und damit einen anderen lokalen Browserspeicher.

## Funktionen

- Neue Projekte, Projektname, mehrere Geschosse mit Etagen- und Standard-Raumhöhe.
- Rechteckräume und freie geschlossene Polygone, automatische Flächen- und Umfangsberechnung.
- Wände zeichnen, exakt bemaßen und direkt als Wandzug fortsetzen.
- Ein einfacher geschlossener Wandzug erzeugt automatisch einen Raum.
- Gemeinsame Punkt-IDs, echte Wandanschlüsse, automatische Wandteilung bei T-Anschlüssen und Kreuzungen.
- Auswahl, Shift-Mehrfachauswahl, Verschieben mit Maus, Pfeiltasten oder metrischen Eingabefeldern.
- Duplizieren mit neuen UUIDs, Löschen samt Abhängigkeiten, transaktionales Undo/Redo.
- Editierbare Wandlänge, Endpunktkoordinaten, Material, Wandstärke und -höhe.
- Editierbare Raumdaten und Rechteckmaße; Längen-/Breitenänderung erhält die rechteckige Form.
- Türen und Fenster mit Wandzuordnung, Position, echten Maßen, Türanschlag und Fensterbrüstung.
- Möbelbibliothek mit Schrank, Tisch, Sofa, Bett, Küchenmöbel, Fernseher, Waschmaschine, Kühlschrank und Serverrack.
- Freie Objekte mit eigenem Namen/Typ, Breite, Tiefe, Höhe, Mittelpunkt und beliebiger Drehung.
- Eigene Möbelebene, automatische Raumzuordnung, Verschieben, Duplizieren und Undo/Redo.
- Eigene Elektrikebene mit Steckdosen, Verbrauchern und Verteilern; konfigurierbare Kennzeichnung im Plan.
- Stromkreise und Schutzgeräte verwalten, Steckdosen zuordnen und Verbraucher ausdrücklich anschließen.
- Typenschildwerte einzeln erfassen, Möbelbezug setzen und dokumentierten Betriebszustand hinterlegen.
- Einspeisepunkte mit projektweit einstellbaren 230 V L–N / 400 V L–L und Anschlusskapazität je Phase.
- Stromzähler mit Zählernummer, manuellem kWh-Stand und ID-basierter Zuordnung zur Einspeisung.
- Sicherungskästen mit Zähler-/Einspeisezuordnung, eigenen Sicherungen, FI-Geräten und Schutzketten.
- Unterverteilungen über Stromkreise anderer Kästen versorgen, auch über mehrere Etagen und Verteilungsstufen.
- Geplante Spannung und Absicherung an Steckdosen/Verbrauchern automatisch aus den Zuordnungen ableiten.
- Stromkreisübersicht mit erfasster Nennleistung und Anzahl fehlender Leistungsangaben.
- Stromkreisbestand über alle Etagen mit zugeordneten Leitungen, Planlänge und Längenzuschlägen.
- Direkt aus der Stromkreisübersicht zum Objekt im Plan wechseln, einschließlich Etagenwechsel und Zentrierung.
- Leitungswege zwischen Elektroobjekten, Abzweigdosen, Klemmen und Verbindungspunkten zeichnen.
- Automatische 2D-Planlänge, Längenzuschlag und editierbare Kabeldaten/Querschnitte.
- Tabs **Haus / Raum**, **Möbel**, **Elektrik** mit auf den aktiven Bereich begrenzter Auswahl und Bearbeitung.
- Automatische Wandmaße und manuelle Bemaßungen mit Punktbezug und konfigurierbarer Ausrichtung.
- Metrisches Raster, Rasterweiten von 10 bis 1000 mm, Snap-to-Grid/-Point/-Wall mit Halteschwelle.
- Zoom zum Mauszeiger, Pan, „Alles anzeigen“, mm/cm/m-Anzeige und Statusleiste.
- Grundriss-, Bemaßungs-, Möbel- und Elektrikebene sichtbar/unsichtbar und gesperrt/entsperrt.
- Lokales Autosave, manuelles Speichern, Projektbibliothek, validierter JSON-Import und -Export.
- Zugängliche HTML-Objektliste als Ergänzung zur Zeichenfläche.
- Beispielgrundriss mit vier Räumen und Öffnungen.

## Schnell ausprobieren

Die Tabs oben bestimmen den Bearbeitungsbereich. Darunter zeigt das Menüband die passenden Werkzeuge und
Vorlagen. Über den Geschossnamen und **Ebenen** rechts im Menüband lassen sich Etagen verwalten sowie
Ebenen einblenden, ausblenden und sperren. Auf iPad und iPhone klappt **Werkzeuge** das Menüband ein oder aus;
ein Tabwechsel öffnet es. Breite Werkzeuggruppen lassen sich horizontal verschieben.
Andere Bereiche bleiben sichtbar, lassen sich aber nicht
auswählen, verschieben oder über die Objektliste bearbeiten. Ein Tabwechsel hebt die Auswahl auf und verwirft
unfertige Zeichenwege. Auswahl (V) und Pan (H) bleiben im aktuellen Bereich; Fachwerkzeugkürzel wechseln automatisch
zum passenden Tab. Speichern, Export und Undo/Redo gelten weiterhin für das gesamte Projekt.

1. **Beispiel** öffnet einen vollständigen Grundriss. Das vorherige Projekt wird davor gespeichert.
2. **Wand** wählen, Anfangspunkt anklicken, Maus ausrichten, `4350` tippen und Enter drücken.
3. Die Wand ist exakt 4350 mm lang. Der nächste Abschnitt beginnt an ihrem Endpunkt.
4. Escape beendet den Zeichenvorgang. Über **Auswahl** eine Wand anklicken und rechts die Länge bearbeiten.
5. **Rechteckraum** zeichnet mit zwei gegenüberliegenden Eckpunkten einen Raum. Länge und Breite stehen rechts.
6. **Öffnen** zeigt lokale Projekte. Die Pfeilsymbole oben importieren und exportieren JSON.
7. **Möbel / Objekte** (M) wählen, eine Vorlage auswählen und den Mittelpunkt im Plan anklicken.
   Rechts lassen sich Maße und Drehung bearbeiten. „Freies Objekt“ dient als Vorlage für eigene Gegenstände.
   Das Möbelwerkzeug bleibt zum weiteren Platzieren aktiv. Escape oder V wechselt zur Auswahl.
   Ein einzelnes ausgewähltes Möbel zeigt acht Größen-Griffe: Ecken ändern Breite und Tiefe, Seitengriffe
   nur eine Abmessung. Die gegenüberliegende Kante bleibt fest, auch bei gedrehten Möbeln. Mit aktivem
   Rasterfang rasten die Maße ein. Escape verwirft die Vorschau; Loslassen speichert einen Rückgängig-Schritt.
8. **Elektrik** (E) wählen und zunächst einen **Verteiler** platzieren. Über **Stromkreise verwalten**
   einen Stromkreis und bei Bedarf ein Schutzgerät anlegen. Anschließend Steckdosen platzieren und zuordnen.
9. **Verbraucher / Lampe** platzieren, Name und bekannte Typenschildwerte eingeben. Unter **Anschluss**
   eine Steckdose oder einen Stromkreis für den Festanschluss wählen. Räumliche Nähe verbindet nichts automatisch.
10. Im Elektrik-Tab **Leitung** (L) wählen: Startobjekt anklicken, Zwischenpunkte setzen, Endobjekt anklicken.
    Backspace entfernt den letzten Zwischenpunkt; Escape verwirft den unfertigen Weg. Anschließend Kabeldaten
    und bei Bedarf einen Längenzuschlag rechts eintragen. Kreuzungen verbinden Leitungen nicht automatisch.
11. **Stromkreise verwalten** zeigt unter **Zugeordnete Objekte** den Bestand des gewählten Stromkreises
    über alle Etagen. **Im Plan** öffnet das Objekt im Elektrik-Tab und zentriert es. Gesperrte Objekte
    können angesehen werden; bei ausgeblendeter Ebene ist die Navigation deaktiviert.
    Leitungszählung und Gesamtlänge berücksichtigen nur ausdrücklich zugeordnete Kabel.

Maßeingaben akzeptieren `4350 mm`, `435 cm`, `4,35 m` und `4.35 m`.
Ohne Einheit gilt in Eigenschaftenfeldern die Anzeigeeinheit, beim Wand-Schnellmaß immer mm.
Negative Koordinaten sind erlaubt. Längen müssen positiv sein.

| Bedienung                              | Aktion                               |
| -------------------------------------- | ------------------------------------ |
| V / H                                  | Auswahl / Pan                        |
| M                                      | Möbel / freie Objekte                |
| E                                      | Elektrikobjekte / Stromkreise        |
| L                                      | Leitungsweg zeichnen                 |
| W / R / P                              | Wand / Rechteckraum / freier Raum    |
| D / T / F                              | Bemaßung / Tür / Fenster             |
| Shift beim Zeichnen                    | Rechtwinklige Ausrichtung            |
| Enter beim freien Raum                 | Polygon schließen                    |
| Escape                                 | Laufende Vorschau abbrechen          |
| Mausrad                                | Zoom zum Mauszeiger                  |
| Mittlere Maustaste oder Space + Ziehen | Pan                                  |
| Shift + Klick                          | Mehrfachauswahl                      |
| Pfeiltasten / Shift + Pfeiltasten      | 10 mm / eine Rasterweite verschieben |
| Strg+Z / Strg+Y oder Strg+Shift+Z      | Undo / Redo                          |
| Strg+D / Delete                        | Duplizieren / Löschen                |
| Strg+S / Home                          | Speichern / alles anzeigen           |

## Einspeisung, Stromzähler und Sicherungskasten

1. Im **Elektrik**-Tab einen **Stromeinspeisepunkt** platzieren. Die Spannung übernimmt zunächst den
   **Elektrik-Projektstandard** (230 V L–N, 400 V L–L); eine abweichende Spannung lässt sich an der Quelle
   eintragen. Die Anschlusskapazität in A je Phase bleibt unbekannt, bis du sie dokumentierst.
2. **Stromzähler** platzieren, Einspeisepunkt zuordnen, Zählernummer und optional abgelesenen kWh-Stand erfassen.
3. **Sicherungskasten / Verteiler** platzieren und unter **Versorgung des Sicherungskastens** den Zähler wählen.
   Alternativ ist eine direkte Einspeisung möglich.
4. **B16-Sicherung hinzufügen** legt eine editierbare Vorlage an. **FI hinzufügen** legt ein separates RCD an.
   Über **Vorgeschaltetes Schutzgerät** lässt sich beispielsweise das FI vor dem LS zuordnen.
5. **Stromkreise verwalten** öffnet den gewählten Kasten. Stromkreis anlegen und sein Schutzgerät wählen;
   die Zuordnung ist auch direkt am Kasten unter **Stromkreiszuordnung** editierbar.
6. Steckdose einem Stromkreis zuordnen. **Geplante Versorgung** zeigt die abgeleitete Spannung, den kleinsten
   bekannten Überstrom-Sicherungswert der Kette und die Anschlusskapazität. Ein Verbraucher übernimmt diese
   Versorgung über seinen Steckdosen- oder Festanschluss. Änderungen werden sofort berücksichtigt.
7. Für eine **Unterverteilung** im Hauptkasten einen Zuleitungsstromkreis mit Schutzgerät anlegen. Im zweiten
   Kasten unter **Versorgung des Sicherungskastens → Über Stromkreis einer Haupt- oder Unterverteilung** diese
   Zuleitung wählen. Spannung und Sicherungswerte folgen der vollständigen Kette. Eigene und kreisbildende
   Stromkreise werden nicht angeboten. Die Stromkreisübersicht verlinkt die nachgeschalteten Kästen.

Der Projektstandard gilt für dieses Projekt einschließlich bereits vorhandener Objekte im Automatikmodus.
Typenschildwerte von Geräten und Bauteilen bleiben davon getrennt und werden nicht überschrieben.
Ohne Einspeisezuordnung ist die angezeigte Spannung eine Planungsvorgabe, keine vorhandene Versorgung.
Leitungswege ersetzen die ausdrückliche Zuordnung nicht. Ein Zähler misst hier noch nicht automatisch;
sein kWh-Stand ist eine manuelle Bestandsangabe.

Ein Sicherungs-Nennstrom ist keine tatsächliche Stromaufnahme und kein Stromregler. Die Anschlusskapazität
und gemeinsam verwendete Sicherungen stehen nicht jedem Stromkreis zusätzlich zur Verfügung. FI-Bemessungsströme
werden nicht als Überstromschutz gerechnet. Es gibt Hinweise auf fehlende Sicherungswerte, Spannungs-/Phasenwidersprüche
und unpassende Bauteil-Nennwerte. Die separate Simulation berechnet Lasten; Auslösezeiten, Selektivität und Kurzschlussströme werden nicht berechnet.
Fachliche Grundlagen: [Hager – Leitungsschutzschalter](https://hager.com/de/wissen/e-volution/produktwissen/leitungsschutzschalter)
und [Hager – FI/LS](https://particuliers.hager.com/de/loesungen/energieverteilung/fehlerstrom-leitungsschutzschalter).

## Stromkreise simulieren

1. Einspeisung, Sicherungskasten, Schutzgerät und Stromkreis zuordnen. Für einphasige Verbraucher am
   Stromkreis L1, L2 oder L3 festlegen. Einphasige Einspeisungen werden als L1 modelliert.
2. Verbraucher über eine Steckdose oder direkt anschließen und bekannte Typenschildwerte erfassen.
3. Im **Elektrik**-Tab **Stromkreis simulieren** öffnen und den gewünschten Stromkreis auswählen.
4. Verbraucher einzeln oder mit **Alle ein / Alle aus** schalten. Sicherungen, Einspeisung und einzelne
   Phasen lassen sich abschalten; **Stromkreis verbunden** unterbricht die logische Versorgung des Stromkreises.
5. Leistung, Strom je Phase und Sicherungsauslastung prüfen. Gemeinsame Schutzgeräte und Einspeisungen
   berücksichtigen alle nachgeschalteten Verbraucher einschließlich Unterverteilungen genau einmal.
6. **Ergebnis im Plan ansehen** zeigt Versorgungszustände an den Objekten. **Simulation beenden** entfernt sie.

Beispiel: 130 + 600 + 25 + 1500 W ergeben bei 230 V und cos φ = 1 **2255 W, 9,80 A und 61,3 % von 16 A**.
Fehlender Leistungsfaktor wird standardmäßig ausdrücklich als 1 angenommen und als **Schätzung** markiert.
Diese Annahme lässt sich abschalten. Fehlende oder widersprüchliche Angaben ergeben unvollständige Ergebnisse;
bekannte Teillasten werden ausgewiesen. Standby benötigt eigene Lastdaten und wird derzeit nicht berechnet.

Das Modell verwendet ideale Nennspannungen, sinusförmige induktive Lasten und symmetrische Drehstromverbraucher.
Es berechnet P = U × I × cos φ beziehungsweise P = √3 × U × I × cos φ und summiert Wirk- und Blindstromanteile
je Phase. Es verwendet die expliziten Versorgungszuordnungen, nicht die gezeichneten Kabelwege.
Spannungsabfall, einzelne Leiter, Neutralleiterstrom, Leitungsunterbrechungen, Kurzschluss und Fehlerstrom fehlen noch.
Eine Überschreitung des Nennstroms wird angezeigt; eine Sicherung löst nicht automatisch bei 100 % aus.
Auslösekennlinien und zeitabhängiges Verhalten sind noch nicht implementiert. Beim FI wird nur die Belastbarkeit angezeigt.
Grundlagen: [HIOKI – Leistungsmessung](https://www.hioki.com/us-en/products/power-meters/power-analyzer/id_5904)
und [Hager – thermische und magnetische Auslösung](https://hager.com/de/katalog/produkt/ndn113-ls-schalter-1-polig-10ka-15ka-d-13a-1m).

Szenarioschalter verändern weder Projektdaten noch Undo/Redo oder den manuellen Zählerstand.
Jede Projektänderung und jedes Neuladen beendet die Simulation. Szenarien können seit 0.12.0 in der Hausakte benannt gespeichert und erneut geladen werden.

## Lichtschalter

1. Unter **Elektrik → Elektroobjekt → Lichtschalter** einen Schalter platzieren und rechts einen Stromkreis wählen.
2. Eine **Verbraucher / Lampe** platzieren, benennen und Leistung erfassen. Unter **Anschluss** einen
   einphasigen Festanschluss an denselben Stromkreis wählen; den dokumentierten Betriebszustand auf **Ein** setzen.
3. An der Lampe **Lichtschalter** auswählen oder am Schalter unter **Geschaltete Lampen / Verbraucher** anhaken.
   Ein Schalter kann mehrere Verbraucher steuern. Das Gerät referenziert den letzten Schalter seiner Kette.
4. **Stromkreis simulieren** öffnen: Unter **Lichtschalter** den Kontakt ein-/ausschalten. Leistung, Strom
   und Versorgung aktualisieren sich. Im Plan kann der ausgewählte Schalter auch rechts über **Im Szenario
   einschalten / ausschalten** bedient werden.

Die dokumentierte Schalterstellung dient als Ausgangspunkt und wird gespeichert. Szenarioschalter bleiben temporär.
Ein ausgeschaltetes Gerät bleibt auch bei geschlossenem Schalter aus. Ein offener Schalter unterbricht die
Versorgung seiner Verbraucher im Zuordnungsgraphen. Gezeichnete Kabel verbinden Geräte weiterhin nicht automatisch.
Der erste Schaltertyp unterstützt einfache Ein-/Aus-Schaltungen für einphasige Festanschlüsse, noch keine
geschalteten Steckdosen oder Dimmer. Wechsel-/Kreuzschaltungen und Taster am Stromstoßrelais werden über Schaltgruppen modelliert.
Vor einem Stromkreiswechsel die Verbraucherzuordnungen lösen. Löschen eines Schalters löst dessen Zuordnungen;
die Geräte behalten ihren direkten Stromkreisanschluss. Undo stellt Schalter und Zuordnungen gemeinsam wieder her.

## Sichtbare Zustände und direktes Schalten

Während der Simulation erscheinen Ein-/Aus-Knöpfe direkt unter den Lichtschaltern im Plan. Sie lassen sich
anklicken oder mit Tab, Leertaste und Enter bedienen. Es wird ausschließlich das Szenario verändert.
Lampen mit berechneter aktiver Last zeigen einen gelben Lichtschein und **Leuchtet**; andere Verbraucher
zeigen eine grüne Betriebsanzeige und **In Betrieb**. Ohne Versorgung bleiben sie dunkel. Ausgeschaltete Geräte,
fehlende Daten und 0-W-Lasten werden getrennt dargestellt. Es gibt kein Blinken und keine zeitabhängige Animation.

Lampentypen wie `lamp`, `light`, `lampe` und `licht` werden erkannt. Bei generischen Geräten werden eindeutige
Lichtnamen wie **LICHT** oder **Deckenlampe** berücksichtigt. Unter **Symbol im Plan** lässt sich die Darstellung
ausdrücklich wählen. Diese Präferenz verändert keine Typenschilddaten oder Lastberechnung und wird lokal gespeichert.
Der Betriebszustand steht zusätzlich in der HTML-Objektliste.

## Mehrere Schalter in Reihe

Für **S1 → S2 → S3 → Lampe**:

1. Alle Schalter demselben Stromkreis zuordnen.
2. Bei S2 unter **Schalterversorgung / Reihenschaltung** „Nach S1“ wählen; bei S3 „Nach S2“.
3. Die Lampe dem letzten Schalter S3 zuordnen. Weitere Schalter lassen sich auf dieselbe Weise ergänzen.
4. Simulation starten und die Schalter direkt im Plan bedienen. **Alle Kontakte müssen geschlossen sein**,
   damit die Lampe Versorgung erhält. Ein einzelner offener Kontakt unterbricht die Kette.

Die Eigenschaften zeigen die vollständige Schalterkette. Vorgeschaltete Sicherungen und Einspeisung bleiben wirksam;
ein geschlossener Schalter überbrückt keinen Versorgungsausfall. Abzweige sind möglich: Ein Verbraucher an S1
kann weiterlaufen, während S2 den nachgeschalteten Zweig trennt. Selbstbezüge und Kreise werden abgelehnt.
Wird ein vorgeschalteter Schalter gelöscht, erhält sein unmittelbarer Nachfolger **Nicht angeschlossen**,
damit die entstandene Lücke nicht automatisch überbrückt wird. Undo stellt die Verbindungen wieder her.
Das ist eine Reihenschaltung mit UND-Verhalten. Für Bedienung derselben Lampe von mehreren Stellen eine Schaltgruppe verwenden.

## Wechsel-/Kreuzschaltung und Stromstoßrelais

1. Zwei oder mehr Lichtschalter platzieren und demselben einphasigen Stromkreis zuordnen. Die Etagen dürfen verschieden sein.
2. **Elektroobjekt → Wechsel-/Kreuzschaltung / Stromstoßrelais** platzieren und den **Schaltungs-Stromkreis** wählen.
3. Unter **Schaltstellen zuordnen** die Schalter anhaken. Erster und letzter sind Wechselschalter, zusätzliche Schalter dazwischen Kreuzschalter.
4. Eine Lampe mit Festanschluss an denselben Stromkreis und Betriebszustand **Ein** unter **Gemeinsam geschaltete Verbraucher** anhaken. Alternativ an der Lampe **Schaltgruppe / Relais** wählen.
5. Simulation starten: Jeder Schalter kann die Lampe umschalten, unabhängig von der Stellung der anderen.

Für eine Relaisschaltung **Schaltungsart → Stromstoßrelais mit Tastern** wählen. Alle zugeordneten Schaltstellen sind dann Taster. **Tasten** im Plan oder **Tastimpuls** im Simulationsdialog wechselt den gespeicherten Relaiszustand. Ein Impuls ohne Versorgung bewirkt nichts; das bistabile Relais behält seinen Zustand bei Ausfall. **Szenario zurücksetzen** stellt den dokumentierten Anfangszustand wieder her.

Ein Schalter gehört höchstens einer Gruppe an. Bestehende Reihen- oder direkte Verbraucherzuordnungen zuerst lösen. Kontaktvorlagen folgen der Gruppenrolle; bei bereits dokumentierter Belegung diese vor einem Rollenwechsel anpassen bzw. entfernen. Löschen einer Schaltstelle trennt die Gruppe, statt sie automatisch zu überbrücken. Die Gruppe darf während der Planung unvollständig sein; sie liefert dann keine Ausgangsversorgung.

## Transformator / Klingeltrafo

**Elektroobjekt → Transformator / Klingeltrafo** platzieren, Primärstromkreis sowie Primärspannung, Sekundärspannung und VA-Nennleistung erfassen. Startwerte sind 230 V / 8 V / 8 VA und können geändert werden. Den Verbraucher demselben Primärstromkreis zuordnen und dort unter **Transformator** den Trafo wählen. Die geplante Versorgung zeigt dann die Sekundärspannung.

Die Simulation rechnet einen idealen Wechselspannungstrafo: Spannungsübersetzung, sekundärer Laststrom, primärer Strom an der Sicherung und Überlast bezogen auf den Sekundär-Nennstrom. Wirk- und Blindanteile werden auf die Primärseite umgerechnet; Leistung wird nicht doppelt gezählt. Verluste, Leerlaufstrom, Gleichrichtung, Spannungsregelung und thermisches Abschalten sind noch nicht modelliert. Die Relaissteuerung verwendet ihren Stromkreis, keine separate Trafospule.

## Leitungen zwischen Geschossen

**Anschlussdialog öffnen**, Start- und Zielobjekt wählen; jede Option nennt die Etage. Ohne Kontaktpaare **Leitungsweg speichern** wählen. So lassen sich beispielsweise ein Sicherungskasten im EG und ein Verbraucher im OG verbinden. Die logische Stromkreiszuordnung erfolgt weiterhin ausdrücklich am Verbraucher oder Schalter; eine Unterverteilung im OG ist nicht erforderlich.

Bei unterschiedlichen Etagen entsteht ein **Steigpunkt**, zunächst an der Startposition. Rechts lassen sich X/Y, Wegpunkte auf der Startetage und separat auf dem Zielgeschoss bearbeiten. Beide Etagen zeigen den Übergang mit Leitungskennung und Zielgeschoss. Die Länge ist die Summe beider horizontalen Wege, der absoluten Differenz der Geschosshöhen und des Zuschlags. Montagehöhen und Reserve über den Zuschlag erfassen. Eine rein senkrechte Leitung ist möglich; Zwischenetagen bekommen noch keine eigene Durchgangsmarkierung. Gemeinsame Weltkoordinaten und korrekt eingetragene Geschosshöhen sind Voraussetzung.

## Anschlüsse per Drag & Drop

1. Im Elektrik-Tab **Anschließen (A)** wählen. Von einem Lichtschalter, Verbraucher oder einer Steckdose
   zum zweiten Objekt ziehen. Zwei Einzelklicks funktionieren ebenfalls. Alternativ **Anschlussdialog öffnen**
   verwenden und beide Objekte aus Listen wählen.
2. Im Popup **Anschlüsse verbinden** die Kontaktpaare prüfen, ergänzen oder entfernen. Bei Schalter und
   einphasigem Verbraucher wird L′ ↔ L vorgeschlagen; die Ziehrichtung spielt keine Rolle.
3. Optional **Verbraucher diesem Lichtschalter / dieser Steckdose zuordnen (Simulation)** aktivieren.
   Die Vorschau beschreibt die Änderung. **Verbinden und zuordnen** speichert Leitung, Kontaktbelegung und
   Gerätezuordnung gemeinsam als einen Undo-Schritt. Eine bestehende andere Versorgung wird nicht überschrieben.
4. Ohne dieses Häkchen werden nur Kontakte dokumentiert. **Abbrechen** oder Escape verwirft den Entwurf.
5. Eine gespeicherte Leitung auswählen und rechts **Anschlussbelegung bearbeiten** öffnen, um Kontakte zu ändern.

Kontaktvorlagen sind derzeit für einfache Lichtschalter sowie ein-/dreiphasige Verbraucher und Steckdosen vorhanden.
Sie sind generisch; PE ist nur zu belegen, wenn dieser Kontakt am konkreten Gerät vorhanden ist. Beim einfachen
Schalter stehen L und der geschaltete Ausgang L′ zur Auswahl. N und PE laufen in diesem Modell nicht durch seinen
Schaltkontakt. Es gibt noch keine herstellerspezifischen Klemmenpläne für Verteiler, Zähler oder Abzweigdosen.
Die Prüfung erkennt fehlende Kontakte, Doppelbelegung innerhalb einer Leitung, unvereinbare Kontaktrollen und
eine zu geringe dokumentierte Aderzahl. Sie ersetzt keinen vollständigen Leiter- oder Installationsnachweis.

Eine ausdrücklich mit Gerätezuordnung gespeicherte Anschlussleitung verwaltet diesen Anschluss: Beim Löschen
oder Lösen der Zuordnung wird der Verbraucher davon getrennt, bei einer Schalterleitung einschließlich seines
Festanschlusses. Undo stellt alles wieder her. Reine Dokumentationsleitungen verändern unabhängige Zuordnungen nicht.
Gemeinsames Duplizieren remappt interne Referenzen. Eine allein kopierte Leitung kopiert nur die Kontaktbelegung.

Die Simulation arbeitet weiterhin mit dem Versorgungsgraphen und der bestätigten Gerätezuordnung.
Gezeichnete Kontaktpaare allein erzeugen noch keinen vollständigen Leiterstromkreis oder eine Fehlerstromsimulation.

## Tests

```powershell
npm run check
npm run build
npm run test:e2e
npm run format:check
```

- Vitest prüft Geometrie, Einheiten, Topologie, Bearbeitung, Sperren, Historie, JSON und IndexedDB.
- Playwright prüft vollständige Bedienabläufe, Neuladen, Import-/Export-Roundtrip, Etagen, Öffnungen,
  Escape während des Verschiebens sowie einen Grundriss mit 1000 Wänden.
- Browserprüfungen verwenden isolierte, kurzlebige Testprofile. Deine Projektbibliothek bleibt unberührt.
- Unter Windows wird installiertes Google Chrome verwendet. Alternativ in PowerShell:
  `$env:PLAYWRIGHT_CHANNEL = 'msedge'`.
- Auf anderen Plattformen: zuerst `npx playwright install chromium`.
- Screenshots und Fehlerprotokolle liegen nach Browserprüfungen unter `test-results/`.

## Struktur

```text
src/
  app/          Anwendungslayout und Gestaltung
  models/       Versionierte TypeScript-Datenverträge
  core/         Projektfabrik, Validierung, berechnete Ansichten
  geometry/     Reine Geometrie, Koordinaten, Snap
  furniture/    Objektvorlagen, Platzierung und Raumzuordnung
  electrical/   Elektrikmodelle, Validierung, Zuordnungen und Bestandsübersichten
  simulation/   Reiner Versorgungsgraph, Lastrechnung und Szenario-Ergebnisse
  editor/       Topologieaktionen, Transaktionen, Eingabesteuerung
  rendering/    Deklarative Konva-Darstellung
  stores/       Getrennte Projekt- und Editorzustände
  persistence/  IndexedDB, Autosave, JSON-Dateien
  components/   Werkzeuge, Eigenschaften, Projektverwaltung
  utils/        Einheiten
tests/          Geometrie-, Modell-, Persistenz- und Browsertests
docs/           Architektur und Abnahme
```

## Modell und Grenzen des MVP

Alle Längen liegen intern in Millimetern. Die Weltkoordinaten verwenden X nach rechts und Y nach oben.
Geschosshöhen werden separat gespeichert. Wände besitzen echte Stärke/Höhe und referenzieren gemeinsame Punkt-IDs.
Länge, Fläche, Umfang und Wand-Raum-Zuordnungen werden aus dem Modell berechnet.

**Raumflächen sind Wandachsflächen**, keine lichten Innen- oder normgerechten Wohnflächen.
Wandkörper haben gerade Endkappen; ausgearbeitete Gehrungen und lichte Innenkonturen sind noch nicht enthalten.
Eine einzelne Wandlängenänderung kann angeschlossene Räume verformen. Für Rechteckerhaltung die Raummaße bearbeiten.
Das Verschieben erzeugt keine neuen topologischen Verbindungen; solche Anschlüsse entstehen beim Zeichnen.

Die Validierung erkennt ungültige Polygone und Referenzen. Sie erkennt noch nicht jede Überlappung voneinander
unabhängiger Räume und ersetzt keine allgemeine Raumerkennung aus beliebigen Wandsammlungen.
Räume mit Löchern, Bogenwände und ein allgemeiner Constraint-Solver sind nicht enthalten. Druckmaßstäbe und PDF-/SVG-Export sind seit 0.12.0 in der Hausakte verfügbar.

Die Oberfläche unterstützt Desktop und Tablet einschließlich Split View ab 600 px. Smartphone-Bedienung ist nicht optimiert.
Der Editor ist lokal für einen Benutzer ausgelegt; gleichzeitige Bearbeitung desselben Projekts in mehreren Tabs
wird nicht zusammengeführt. Undo/Redo ist sitzungsbezogen und begrenzt. JSON-Dateien tragen `schemaVersion: 10`;
Versionen 1 bis 9 werden beim Import und lokalen Laden automatisch migriert. Unbekannte neuere Versionen werden abgelehnt.

Möbelpositionen sind Mittelpunkte, Drehwinkel werden intern in Radiant gegen den Uhrzeigersinn gespeichert.
Die Raumzuordnung wird nach Änderungen aus dem Mittelpunkt berechnet; bei keinem oder mehreren passenden Räumen
bleibt sie leer. Raumänderungen verschieben Möbel nicht automatisch mit. Haus, Möbel und Elektrik werden in ihren
jeweiligen Tabs bearbeitet; Mehrfachauswahl ist innerhalb eines Bereichs möglich.
Möbel dürfen sich überlappen und Wände schneiden; Kollisionsprüfung ist noch nicht enthalten.
Eigene Objekte haben einen rechteckigen Grundriss, frei geformte Möbelpolygone sind nicht enthalten.

Die Elektrik ist ein erster Dokumentationsschritt von Phase 3. Unbekannte Typenschildwerte bleiben `null`.
Die Nennleistungssumme zählt erfasste Gerätewerte einschließlich ausgeschalteter Geräte; sie beschreibt weder
Momentanverbrauch noch Stromaufnahme oder Sicherungsauslastung. Die separate Simulation berechnet diese Werte
für das gewählte Szenario unter den oben beschriebenen Annahmen. Ein Stromkreis referenziert ein Schutzgerät und dessen ausdrücklich verknüpfte Vorgänger
im selben Kasten. Zyklen und Schutzgeräte aus fremden Kästen werden abgelehnt.

Steckdosen erhalten einen räumlichen Wandbezug. Frei positionierte Elektroobjekte bleiben beim Verschieben von Wänden oder Möbeln an
ihrer Weltposition; Zuordnungen ersetzen keine geometrische Befestigung. Verteilerkopien enthalten noch keine
Stromkreiskopien. Beim Löschen eines Verteilers werden seine Stromkreise/Schutzgeräte entfernt und Zuordnungen gelöst;
Steckdosen und Verbraucher bleiben erhalten. Undo stellt den gesamten Schritt wieder her.

Leitungen können zwei Etagen über einen senkrechten Steigpunkt verbinden. Ihre Endpunkte folgen den referenzierten Elektroobjekten;
Zwischenpunkte bleiben beim Verschieben eines Endobjekts an ihrer Position. Beim Ziehen einer Leitung werden
nur Zwischenpunkte verschoben; eine gerade Leitung erhält dafür einen Zwischenpunkt. Löschen eines Endobjekts
entfernt zugehörige Leitungen im selben Undo-Schritt. Leitungswege lassen sich außerdem rechts über Koordinaten bearbeiten.

Der Bauteilgraph enthält explizite Kabelverbindungen, noch keine einzelnen Leiter, Pole oder Schaltkontakte.
Ein Verbindungspunkt verbindet nur Leitungen, deren Enden ausdrücklich diesem Objekt zugeordnet sind.
Kabelwege und ihre Stromkreisangabe ersetzen nicht automatisch bestehende Anschluss-/Stromkreiszuordnungen.
Planlängen sind horizontale 2D-Längen; Geschoss-Steigstrecken werden separat automatisch addiert, weitere Höhenwege und Reserven als Zuschlag dokumentiert.
Die Versorgungskette ist eine separate ID-Zuordnung zur Ableitung von Planungswerten, noch kein Leiter-/Polmodell.
Neben der statischen Zuordnungssimulation gibt es seit 0.12.0 eine separate Leiterprüfung in der Hausakte; deren Umfang und Grenzen stehen in [docs/housebook.md](docs/housebook.md). Verteilerzuordnungen sind radial und
dürfen keine Kreise bilden. Die Bestandsübersicht summiert direkt zugeordnete Verbraucher; Verbraucher hinter
Unterverteilungen stehen in deren Stromkreisen. Löschen einer Zuleitung löst den Eingang der Unterverteilung,
erhält aber deren eigene Stromkreise und Objekte. Einphasige Zuleitungen mit widersprüchlicher nachgeschalteter
Phasenzuordnung werden als Planungskonflikt angezeigt.
Netzwerkdokumentation und lesender Home-Assistant-Abruf sind seit 0.12.0 in der Hausakte verfügbar. 3D, Backend, Benutzerverwaltung und weitere technische Netze bleiben spätere Phasen.
Die Erweiterungsgrenzen sind in [docs/architecture.md](docs/architecture.md) festgehalten.
