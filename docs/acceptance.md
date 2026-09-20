# Phase 1 – Abnahmefälle

Die folgenden Fälle sind durch automatisierte Tests abgedeckt. Testcode steht unter `tests/`.

## Schaltgruppen, Trafos und Geschossleitungen (Schema 10)

- Alle Stellungskombinationen für zwei, drei und vier Schaltstellen prüfen: Jede Betätigung invertiert den Ausgang.
- Relais von mehreren Tastern bedienen. Impulse ohne Versorgung sind unwirksam; der bistabile Zustand bleibt bei Ausfall erhalten.
- Verbraucherlicht und Betriebsanzeige im Browser prüfen; Maus, Leertaste und Enter funktionieren.
- 230/8-V-Trafo mit 4-W-Last: 0,5 A sekundär und etwa 0,0174 A primär, keine doppelte Leistungssumme.
- VA-Überlast bei abweichendem Leistungsfaktor, fehlende Lastdaten und Sicherungsausfall prüfen.
- Startobjekt im EG, Ziel im OG: beide Teilwege, Steigmarkierung, Höhendifferenz und Reserve in der Länge berücksichtigen.
- Rein vertikale Leitung, Hit-Test im Zielgeschoss, Kopieren, Löschen, Ebenensperren und Änderung der Geschosshöhe prüfen.
- Gruppen-, Trafo- und Leitungszuordnungen nach Neuladen erhalten; Schema 1–9 strikt migrieren.

## Optische Rückmeldung und Reihenschaltung (Schema 9)

- Lampenlicht und Verbraucherbetrieb aus aktiver Last ableiten; fehlende Versorgung, Aus, Datenlücken und 0 W trennen.
- Lampentypen, generische Lichtnamen und gespeicherte Symbolpräferenz ohne Änderung der Lastdaten prüfen.
- Browser: direkten Planschalter mit Maus, Leertaste und Enter bedienen; tatsächliche gelbe Canvas-Pixel prüfen.
- Browser: Sicherung aus bei geschlossenem Schalter lässt Lampe dunkel; Szenario verändert den JSON-Export nicht.
- Alle acht Kontaktkombinationen von drei Serienschaltern prüfen; nur vollständig geschlossene Kette versorgt die Lampe.
- Verzweigte Lasten richtig zählen; offene nachgeschaltete Kontakte trennen nur den jeweiligen Zweig.
- Zyklen, fehlende Vorgänger und stromkreisübergreifende Ketten abweisen; Sperren und gemeinsame Kopien prüfen.
- Entfernen eines Vorgängers trennt den Nachfolger ausdrücklich; kein stilles Überbrücken an den Stromkreis.
- Browser: drei Schalter über Eigenschaften verketten, Planbedienung, Löschen/Undo und Neuladen prüfen.
- Schema 8 nach 9 einschließlich einmaliger IndexedDB-Migration ohne Veränderung vorhandener Lastdaten prüfen.

## Kontaktanschlüsse (Schema 8)

- L′/L in beiden Ziehrichtungen zuordnen; Leitung, Kontakte und Geräteversorgung gemeinsam speichern.
- Ohne Übernahme reine Kontaktbelegung dokumentieren, bestehende unabhängige Versorgung erhalten.
- Ungültige Kontakte, Rollen, Doppelbelegungen, widersprüchliche Versorgung und zu wenige Adern zurückweisen.
- Löschen oder Lösen eines verwalteten Anschlusses trennt dessen Verbraucher; Undo stellt die Verbindung wieder her.
- Schalter und Lampe gemeinsam duplizieren; allein kopierte Leitung übernimmt keine Anschlussverwaltung.
- Steckdose und einphasigen Verbraucher über L/N zuordnen; unpassende Phasen verhindern.
- Schema 7 strikt migrieren, Bestandskabel bleiben ohne neue Anschlusszuordnung; IndexedDB-Migration prüfen.
- Browser: Drag & Drop, umgekehrte Richtung, Dialog-Abbruch, Escape während des Ziehens und ungültige Kontaktwahl.
- Browser: Simulationswirkung, Bearbeitung gespeicherter Belegung, Löschen/Undo, Neuladen und Formularalternative.
- Dialog bei 1440 × 1000 und 1024 × 768 visuell prüfen.

## Lichtschalter (Schema 7)

- Mehrere Lampen über einen Schalter schalten; andere Verbraucher bleiben versorgt und werden einmal gezählt.
- Dokumentierte Kontaktstellung, Szenarioüberschreibung, Geräte-Aus und vorgeschaltete Sicherung unterscheiden.
- Fremde Stromkreise, ungültige IDs, Steckdosenanschluss und dreiphasige Geräte bei Schalterzuordnung ablehnen.
- Schalter, Lampen und Kabel gemeinsam mit neuen IDs und korrekten internen Referenzen duplizieren.
- Schalter löschen löst Referenzen und Kabel; Undo stellt den Bestand wieder her. Ebenensperren verhindern Änderungen.
- Stromkreis löschen entfernt Schalter- und Gerätezuordnungen konsistent.
- Schema 6 strikt und ohne Datenverlust migrieren, auch einmalig in IndexedDB.
- Browser: Schalter platzieren, zwei Lampen zuordnen, Stellung dokumentieren, Szenario und Eigenschaftenknopf bedienen.
- Browser: Projekt bleibt durch Simulation unverändert; Löschen/Undo, Neuladen und JSON-Roundtrip erhalten Daten.

## Statische Stromkreissimulation (Phase 4, erster Schritt)

- 2255 W an 230 V ergeben mit angenommener cos φ = 1 rund 9,80 A und 61,3 % von 16 A.
- Unterschiedliche Leistungsfaktoren ergeben komplex summierte Ströme; symmetrischer Drehstrom verwendet 400 V.
- Fehlende Daten, Standby, widersprüchliche Typenschildwerte und unbekannte Phasen ergeben unvollständige Ergebnisse.
- Gemeinsame Sicherungen und Unterverteilungen zählen jede Last einmal; Abschalten trennt nachgeschaltete Verbraucher.
- Einzelner Phasenausfall erhält andere Phasen; unbekannte Phasen werden nicht automatisch neu zugeteilt.
- Überlast bleibt sichtbar, ohne eine automatische Auslösung zu erfinden; FI-Nennstrom beschreibt nur Belastbarkeit.
- Browser: Verbraucher, Sicherung, Phase und Stromkreis schalten; Schätzung abschalten; alle Geräte ein-/ausschalten.
- Browser: Ergebnis im Plan anzeigen, Etage wechseln, Szenario beenden; Layout bei 1440 × 1000 und 1024 × 768 prüfen.
- Szenarien verändern weder JSON-Export noch Undo-Historie; eine Projektänderung beendet das aktive Szenario.

| Bereich           | Geprüfter Ablauf                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Schnellmaß        | Wand zeichnen, 4350 eingeben, exakt 4,350 m erhalten                                             |
| Eigenschaften     | Wand auf 4,800 m ändern, mit Undo/Redo zwischen beiden Maßen wechseln                            |
| Raummaße          | Rechteck auf 4,35 × 3,20 m setzen, 13,92 m² Wandachsfläche erhalten                              |
| Topologie         | T-Anschlüsse/Kreuzungen aufteilen, gemeinsame Punkte und Raumringe erhalten                      |
| Öffnungen         | Wandteilung führt Fensterreferenzen mit; Anschluss innerhalb einer Öffnung wird atomar abgelehnt |
| Nachbarräume      | Gemeinsame Wand mit gegensinnigen Raumringen validieren                                          |
| Freie Räume       | Konkave Polygone zeichnen; selbstüberschneidende Polygone ablehnen                               |
| Verschieben       | Eine Drag-Bewegung ist ein Undo-Schritt; Escape verwirft die Vorschau                            |
| Auswahl           | Gemeinsame Punkte bei Mehrfachauswahl nur einmal verschieben                                     |
| Duplizieren       | Neue UUIDs und interne Referenzen für Räume, Wände und Öffnungen erzeugen                        |
| Löschen           | Abhängige Räume/Öffnungen konsistent entfernen und per Undo wiederherstellen                     |
| Sperren           | Direkte und indirekte Änderungen gesperrter Geometrie verhindern                                 |
| Maße              | Deutsche Dezimalmaße und Einheiten umrechnen, ungültige Eingaben ablehnen                        |
| Ansicht           | Zoom/Pan verändern keine gespeicherten Koordinaten                                               |
| Snap              | Punkte vor Wänden/Raster; konstanter Bildschirmradius und Halteschwelle                          |
| Etagen            | Keller anlegen, negative Etagenhöhe speichern, eigene Objekte zeichnen                           |
| Fenster/Türen     | Per Werkzeug einsetzen, Anschlag/Brüstung ändern, Undo verwenden                                 |
| Persistenz        | Autosave abwarten, neu laden, identisches Projekt exportieren                                    |
| Dateien           | Export/Import erhält alle IDs und Maße; fehlerhafter Import erhält das aktive Projekt            |
| Projektbibliothek | Mehrere Projekte in IndexedDB speichern und wieder laden                                         |
| Größen            | Layout bei 1440 × 1000 und 1024 × 768 prüfen                                                     |
| Größerer Plan     | 1000 Wände laden, zoomen und unverändert exportieren                                             |

Der 1000-Wände-Test ist ein funktionaler Belastungstest, keine Garantie einer bestimmten Bildrate.

## Möbel und freie Objekte (Phase 2)

- Sofa in einen Raum setzen, Breite/Tiefe/Höhe ändern und auf 37,5° drehen.
- Mit Maus verschieben, Undo prüfen, duplizieren und Kopie löschen.
- Möbelebene sperren, Eigenschaften dürfen nicht editierbar sein; ausblenden entfernt Möbel aus der Auswahl.
- Neu laden und JSON-Roundtrip prüfen: IDs, Positionen und Maße müssen identisch bleiben.
- Freies Objekt als Werkbank benennen, eigenen Typ setzen und um 90° drehen.
- Schema-1-Datei importieren: bisherige Geometrie und IDs bleiben erhalten, Möbelebene wird ergänzt.
- Modultests prüfen gedrehte Treffer, Raumzuordnung, Validierung, Sperren und einmalige IndexedDB-Migration.

## Erste Elektrikdokumentation (Phase 3)

- Verteiler platzieren, Stromkreis anlegen, Phase und Spannung dokumentieren; F12 mit Charakteristik B und 16 A erfassen.
- Steckdose kennzeichnen und Stromkreis zuordnen; Planbeschriftung auf Stromkreis umstellen.
- Verbraucher mit nur 600 W erfassen und ausdrücklich an die Steckdose anschließen; Spannung/Strom bleiben leer.
- Übersicht zeigt ein angeschlossenes Gerät und 600 W erfasste Nennleistung, ohne Lastsimulation.
- Gerät verschieben, Undo/Redo, Ebenensperre, Neuladen und JSON-Roundtrip prüfen.
- Version-2-Möbelprojekt importieren und Möbel unverändert erhalten; zwei Steckdosen hintereinander platzieren.
- Modultests prüfen unbekannte Kennwerte, globale UUIDs, ungültige Verbindungen, abgeleitete Zuordnungen,
  Sperren für Stromkreise/Schutzgeräte, referenztreues Duplizieren sowie Löschen und Wiederherstellen.

## Leitungen und getrennte Bearbeitung

- Tabs zeigen nur die passenden Fachwerkzeuge; V/H bleiben in jedem Bereich verfügbar.
- Überlappende Steckdose, Sofa und Raum: Auswahl und Verschieben verändern ausschließlich das Objekt des aktiven Tabs.
- Tabwechsel entfernt die Auswahl; Delete darf danach kein zuvor gewähltes Objekt eines anderen Bereichs löschen.
- Objektliste ist nach Bereich gefiltert; Tastaturwechsel der Tabs und Layout bei 1440/1024 px sind geprüft.
- Leitungsweg mit Zwischenpunkt zeichnen, Kabeldaten und Längenzuschlag erfassen, Endobjekt bewegen.
- Endobjekt löschen entfernt abhängige Leitung; Undo stellt IDs und Kabeldaten wieder her.
- Backspace/Escape verwerfen Wegpunkte/Zeichenentwurf ohne zusätzliche persistente Kabel.
- Kabeldaten über Neuladen und JSON-Roundtrip erhalten; Version 3 inklusive bestehender Anschlussreferenzen migrieren.
- Geometrietests prüfen Planlänge, Zuschläge, keine implizite Kreuzungsverbindung, Sperren, Duplizieren und ungültige Kabelwege.
  Ein Browser mit 3D, technischen Netzen oder simultaner Bearbeitung mehrerer Benutzer wurde nicht getestet;
  diese Funktionen gehören nicht zu Phase 1.

## Stromkreisbestand und Navigation

- Nur ausdrücklich zugeordnete Kabel zählen, auch wenn weitere Kabel dieselben Endobjekte verbinden.
- Planlänge und Zuschläge getrennt ausweisen; Bestandsdaten aller Etagen auch bei ausgeblendeten Ebenen zählen.
- Verbraucher über Steckdose und Festanschluss jeweils einmal zählen; fehlende Leistungswerte kenntlich machen.
- „Im Plan“ zentriert Steckdose, Verbraucher oder gesamten Kabelweg und öffnet die richtige Etage im Elektrik-Tab.
- Navigation erzeugt keinen Undo-Schritt, ändert keine Projektdaten und erhält Ebenensperren.
- Bei ausgeblendeter Ebene bleibt die Navigation deaktiviert. Dialog bei 1440 × 1000 und 1024 × 768 prüfen.

## Einspeisung, Stromzähler und Sicherungskasten

- Neue Steckdose zeigt 230 V Planungsvorgabe ohne erfundene Geräte-/Bauteil-Typenschildwerte.
- Einspeisepunkt mit 63 A Anschlusskapazität, Zählernummer und Zählerstand anlegen; Kasten über Zähler zuordnen.
- FI/LS-Kette dokumentieren, Stromkreis einem LS zuweisen, Steckdose zuordnen; 230 V / 16 A werden abgeleitet.
- Globale Spannung ändern, Undo/Redo prüfen, Quellspannung abweichend setzen; keine Bauteilwerte überschreiben.
- Sicherung von 16 auf 10 A ändern; Steckdose übernimmt den Wert als Absicherung, nicht als Stromaufnahme.
- Zähler löschen und wiederherstellen; lokale Speicherung, Neuladen und JSON-Roundtrip behalten alle Daten.
- Zwei Kästen: Stromkreis beim ausgewählten Kasten anlegen und umhängen; alte Schutzzuordnung wird gelöst.
- Modultests unterscheiden L–N/L–L, FI-Belastbarkeit/Überstromschutz und gemeinsam genutzte Sicherungen.
- Fehlende Quellen, Schutzzyklen, fremde Kästen, ungültige Spannungen und negative Zählerstände werden abgelehnt.
- Schema 4 einschließlich Kabeln, fremden Typenschildspannungen und Schutzdaten migriert unverändert nach Schema 5.

## Unterverteilungen (Schema 6)

- Hauptverteilung und Etagenverteiler verbinden; Anzeige der vollständigen Versorgungskette an der Steckdose.
- Vorgeschaltete Sicherung ändern: der kleinste bekannte Sicherungs-Nennwert aktualisiert sich am Endstromkreis.
- Selbstbezug, indirekte Kreise und Umhängen einer Zuleitung in ihren eigenen Zielkasten werden atomar verhindert.
- Mehrere Stufen, gemeinsame Zuleitungsabsicherung und widersprüchliche Phasenzuordnung prüfen.
- Löschen des Hauptkastens oder der Zuleitung erhält den nachgeschalteten Bestand; Undo stellt Referenzen wieder her.
- Unterverteilung direkt aus der Bestandsübersicht ihrer Zuleitung öffnen; Layout bei 1440/1024 px prüfen.
- Schema-5-Projekte behalten Quellen und Schutzdaten; Export, Neuladen und einmalige IndexedDB-Migration prüfen.

## Hausakte (0.12.0)

- Bildvorlage anhand zweier Punkte kalibrieren, speichern, neu laden und JSON-Roundtrip vergleichen.
- PDF-Pläne erzeugen und wieder als Vorlage importieren; maßstäbliche Seitenteilung und Vektorausgabe prüfen.
- PDF-Seiten rasterisieren und visuell auf Beschnitt, Maßangaben, Legende, Schriften und Lesbarkeit prüfen.
- Objektakte, Umbauzustand und Wartungsangaben speichern; Fehler und Ebenensperren beachten.
- Szenario mit 2255 W und 61,3 % höchster Auslastung speichern, vergleichen und im Plan laden.
- Versorgungsschema durchsuchen und zum Objekt navigieren.
- Netzwerkgeräte und konkrete Ports verbinden; doppelte Belegung ablehnen.
- Raumvorlage einfügen: neue IDs, interne Schaltungen und Leiterkontakte erhalten, externe Versorgung getrennt.
- Wandbefestigung bei Verschieben, T-Anschluss und Duplizieren erhalten; indirekte Änderung gesperrter Objekte ablehnen.
- Älteren gespeicherten Stand wiederherstellen und Wiederherstellung rückgängig machen.
- Zwei Repository-Instanzen verwenden; konkurrierendes Überschreiben atomar ablehnen und alte Stände begrenzen.
- Leiterprüfung: vollständiger Strompfad, fehlender Neutralleiter, offener Schalter, abgeschaltetes Schutzgerät, widersprüchliche Quellen und ideale Trafosekundärspannung.
- Home-Assistant-Abruf gegen eine simulierte API: ausschließlich GET, Anzeige des Messwertes, kein Token im JSON und leerer Token nach erneutem Öffnen.
- Hausakte bei 1440 × 1000 und 1024 × 768 prüfen.

Validiert: 244 Modultests, vollständiger Browserdurchlauf mit 30 Tests sowie erneuter gezielter Lauf der sechs Hausakte-Tests nach den abschließenden Anpassungen. TypeScript-Prüfung, Produktionsbuild und Formatprüfung erfolgreich. Keine reale Home-Assistant-Installation war für einen Verbindungstest angegeben.

## iPad und WLAN (0.13.0)

- WebKit im iPad-Profil bei 810 × 1080, 1080 × 810 und 600 × 900: erreichbare Bedienelemente und Dialoge ohne Seitenüberlauf.
- Fingerzeichnung eines Polygonraums, Abschluss ohne Tastatur, Eigenschaften bearbeiten und nach Neuladen erhalten.
- Projektimport, PDF-Export und erneuter PDF-Import als Planvorlage.
- Synthetische Zwei-Finger-Pointer-Gesten verändern den Zoom ohne Modelländerung; Pointer-Abbruch platziert nichts.
- HTTP-kompatible UUID-Erzeugung ohne `crypto.randomUUID` einschließlich Autosave.
- Dialoge bleiben beim Wechsel zwischen Desktop- und Tablet-Layout unabhängig von Seitenleisten sichtbar.

Validiert am 20.09.2026: 244 Modultests, 30 Desktop-Browsertests und vier WebKit-iPad-Tests.
Die vier iPad-Tests wurden auch gegen den Produktionsbuild über die tatsächliche HTTP-WLAN-Adresse ausgeführt.
TypeScript, Build und Formatprüfung erfolgreich. Physisches iPad, Apple Pencil und die native Bildschirmtastatur
sind noch nicht am echten Gerät geprüft. Der erste Nutzungsumfang ist auf Wunsch das heimische WLAN.

## GitHub-Vorbereitung und verdrahtete Simulation (0.14.0)

- Verdrahtete Taster, Flankenerkennung, fehlendes A2, unterbrochene Steuerader, ausgeschaltete Quelle und bistabiler Zustand.
- 50-mA-L–PE-Fehler am 30-mA-FI: Abschaltung und anschließender Leiterzustand ohne Projekt-/Szenarioänderung.
- L–N mit gemeinsamem Rückweg: kein Differenzstrom; Neutralleiter am FI vorbei: Differenzstrom.
- Mehrere gleichphasige Fehler summieren sich; symmetrische dreiphasige Fehler werden vektoriell addiert.
- Fehlender PE, fehlende FI-Schwelle und parallele Speisepfade erzeugen keine behauptete Schutzreaktion.
- PE bleibt bei deaktiviertem Schutzgerät kontinuierlich; alte Szenarien übernehmen keine vorherigen Fehler.
- Browserablauf mit Relaisimpuls, Fehlerstrom, gespeichertem Szenario, Neuladen und Fehlerentfernung.
- iPad-WebKit-Prüfung gegen den aktualisierten Produktionsbuild über die WLAN-Adresse.

Validiert: 261 Modultests, 32 Desktop-Browsertests, fünf iPad-WebKit-Tests sowie TypeScript,
Produktionsbuild und Formatprüfung. CI-Workflow mit Actionlint geprüft. Suchlauf nach gängigen
Zugangsdatenmustern im vorgesehenen Git-Inhalt ohne Treffer; dies ist kein umfassendes Sicherheitsaudit.
GitHub Actions wurden noch nicht auf GitHub ausgeführt: Es ist bislang kein Remote eingerichtet.
