# Änderungen

## 0.59.0 · 23.09.2026

- Zigbee-Batteriestände und gemeldete Batteriewarnungen in Geräteliste, Grundriss und Eigenschaften anzeigen; Empfangszeit und gespeicherte MQTT-Nachrichten kennzeichnen, fehlende Werte von 0 % unterscheiden.
- Zigbee-Geräte Räumen zuordnen und den Raumnamen direkt am Gerät bearbeiten. Zuordnung mit dem Projekt speichern.
- Raumzuordnungen mit lesender Vorschau gezielt an Home Assistant übertragen: Geräte über ihre IEEE-Kennung erkennen, bestehende Bereiche nutzen oder neue anlegen. Veraltete Vorschauen und Teilerfolge erkennbar melden; keine automatische Rückschreibung oder Umbenennung bestehender HA-Bereiche.
- Handbuch, FAQ und Beispielabbildung aktualisieren; Browserabläufe einschließlich HA-Übertragung mit simulierten Antworten prüfen.

## 0.58.0 · 23.09.2026

- Zigbee2MQTT über Home Assistants MQTT-Schnittstelle auslesen und Geräte anhand ihrer IEEE-Adresse dauerhaft im Grundriss platzieren.
- Start-/stoppbare Live-Anzeige im 5-/10-Sekunden-Intervall sowie manuelle Topologie-Scans ergänzen. Gerichtete Funklinien mit LQI, Routenzielen, Etagenhinweisen und Gerätedetails anzeigen. Projektwechsel beendet den Empfang; Zugangsdaten bleiben außerhalb der Projektdatei.
- Anleitung, FAQ und Beispielabbildung mit Voraussetzungen, Bedienung und Grenzen der Funknetzauswertung ergänzen.

## 0.57.0 · 22.09.2026

- Gemeinsame Projekte: Zugriffsschlüssel und Abgleichverbindungen auf eigenen Geräten dauerhaft merken, gespeicherten Zugang entfernen und Eingabe auf Wunsch anzeigen. Falsche Schlüssel werden nicht gespeichert; blockierter Browserspeicher wird sichtbar gemeldet.
- Eigenen gut merkbaren Projektschlüssel mit `Update --set-project-key` im LXC verdeckt festlegen. Gesalzene Passwort-Hashes verwenden, bisherige zufällige Schlüssel weiter unterstützen und Projektdateien beim Schlüsselwechsel erhalten.
- Handbuch, FAQ und Deployment-Anleitung mit iPhone-Abbildung und Einrichtungsschritten aktualisieren.

## 0.56.0 · 22.09.2026

- Netzwerkkabel direkt im Plan verlegen: Startgerät, Wegpunkte und Zielgerät anklicken, anschließend freie Ports, Kabeltyp und Zuschlag im Anschlussdialog festlegen. Kabelweg und Anschluss gemeinsam speichern; PoE verwendet dieselbe Verbindung.
- Geschossübergreifende Leitungswege mit Wegpunkten pro Etage, Steigwegmarkierungen und Längen einschließlich Höhenunterschieden ergänzen. Verlauf in JSON und PDF erhalten, Abbruch und Rücknahme ohne unvollständig angelegte Kabel unterstützen.
- Handbuch mit Schrittfolge, Anschlussdialog-Abbildung und FAQ aktualisieren.

## 0.55.0 · 22.09.2026

- PoE-Switch, frei konfigurierbaren PoE-Verbraucher und Reolink Video Doorbell PoE in der Netzwerkbibliothek ergänzen. Bestehende Netzwerkgeräte können ebenfalls als PoE-Quelle oder Verbraucher konfiguriert werden.
- Direkte Ethernet-Verbindungen bestimmen automatisch Switch und Port. PoE/PoE+, abschaltbare Ports, Gerätebedarf und gemeinsames Leistungsbudget prüfen; Spannung, Leistung und daraus berechneten Planungsstrom anzeigen. Doorbell mit 48 V und konservativen 12 W vorbelegen. Keine zweite Stromleitung zum PoE-Verbraucher nötig.
- Anleitung mit Bedienablauf, Abbildung und FAQ erweitern. Planungsgrenzen für Patchpanel-Durchleitung und 230-V-Simulation ausdrücklich dokumentieren.

## 0.54.0 · 22.09.2026

- Verbraucherstrom in Ampere automatisch aus Leistung, Spannung, Phasen und Leistungsfaktor vorbelegen. Automatische Werte bei Änderungen nachführen und manuelle Eingaben erhalten. Fehlenden Leistungsfaktor ausdrücklich als Schätzung mit cos φ = 1 kennzeichnen und in der Simulation weiterhin als Annahme behandeln.

## 0.53.0 · 22.09.2026

- Anschließen vereinfachen: belegte Leitungen übernehmen Stromkreis und Simulationszuordnung gemeinsam, einschließlich Abzweigdosen. Zusätzliche Zuordnungshäkchen entfallen; Änderungen und Löschen halten die verwalteten Anschlüsse zusammen. Widersprüchliche Stromkreise oder mehrere uneindeutige Lichtschalter werden gemeldet.
- Lampen folgen Versorgung und Lichtschalter ohne separaten Ein/Aus-Zustand. Fehlende Lampenleistung mit editierbaren 5 W vorbelegen und fehlende Verbraucherspannung aus der angeschlossenen Versorgung beziehungsweise dem Trafo übernehmen. Manuelle Typenschildwerte erhalten.
- Anleitung und Anschlussabbildungen an den vereinfachten Ablauf anpassen.

## 0.52.1 · 22.09.2026

- Veraltete Browser-Testannahme beim Anschließen aus der Verbraucherdatenbank korrigieren: die vollständige automatische Belegung L–L, N–N und PE–PE sowie deren Erhalt beim Neuladen prüfen. Der Test berücksichtigt damit den seit 0.52.0 vorbelegten Schutzleiter.

## 0.52.0 · 22.09.2026

- Leitungsverlegung und Anschließen zusammenführen: Am Ziel den Anschlussdialog mit Kontaktvorschlägen öffnen und Leitungsweg samt Zwischenpunkten und Belegung gemeinsam speichern oder verwerfen.
- Netzwerkgeräte über einen eigenen Stromanschluss mit Steckdosen verbinden, einschließlich Verbraucherzuordnung und konfigurierbarem PE. Anschluss beim Zeichnen erkennen und beim Verschieben, Umbenennen oder Löschen mit dem Netzwerkgerät zusammenführen.
- Passende Leiterverbindungen automatisch vorschlagen: N zu N, vorhandenen PE zu PE und eindeutige Außenleiter. Einphasige Stromkreise sowie eindeutig dokumentierte einphasige Abzweigdosen auf die passende Phase begrenzen; Drehstrom unverändert auswählbar halten.
- N/PE kompakt mit aufklappbarer Bearbeitung darstellen, Kontaktvorschläge erneut übernehmen können und unvereinbare Leiterarten beziehungsweise doppelt belegte Kontakte aus der Auswahl nehmen. Handbuch, FAQ und Abbildungen aktualisieren.

## 0.51.0 · 22.09.2026

- Beim Anschließen eines Sicherungskastens zuerst Sicherung beziehungsweise Stromkreis auswählen. Eingebaute Sicherungen ohne Stromkreis erhalten beim Speichern automatisch einen Abgang; Abbrechen erzeugt keine Einträge. Kontakte zeigen Sicherungskennzeichnung, Stromkreis und Leiter.
- Leitungen dem gewählten Abgang zuordnen und direkte Verbraucher, Steckdosen, einfache Schalter oder Trafos auf Wunsch demselben Stromkreis zuweisen. Bestehende abweichende Anschlüsse bleiben geschützt. Einspeisung getrennt anbieten und versehentliches Verbinden zweier Abgänge verhindern. Handbuch und Anschlussabbildung aktualisieren.

## 0.50.0 · 22.09.2026

- Sicherungskästen in einem grafischen Popup verwalten: Schutzketten, Stromkreise und Klingeltrafos mit sichtbaren Verbindungen sowie zugehörige Leitungen anzeigen. Komponenten per Klick in einem weiteren Popup konfigurieren und neue Sicherungen beziehungsweise Trafos direkt hinzufügen.
- Escape schließt bei verschachtelten Dialogen nur das oberste Fenster. Anleitung mit Bedienablauf und aktueller Abbildung ergänzen.

## 0.49.1 · 21.09.2026

- Anleitungspflege fest in den Update-Skill aufnehmen: betroffene Kapitel, Fachtexte, FAQ, Stichwörter und Bilder gemeinsam mit Änderungen aktualisieren, Handbuch erzeugen und passende Prüfungen ausführen. Bei Installation veröffentlichter Releases die mitgelieferte Anleitung und Version kontrollieren.

## 0.49.0 · 21.09.2026

- Umfangreiches deutsches Handbuch mit 31 Kapiteln und 25 vergrößerbaren Bildschirmbildern aus Beispielprojekten ergänzen. Einstieg, Grundriss, Technik, Garten, Hausakte, Baustelle, Geräteabgleich, Sicherung und Updates mit konkreten Schrittfolgen erklären.
- Inhaltsverzeichnis, direkt verlinkbare Abschnitte, FAQ, alphabetisches Stichwortverzeichnis und lokale Volltextsuche mit Unterstützung für Umlaute und Umschreibungen bereitstellen. Responsive Darstellung für PC, iPad und iPhone; Inhalte auch ohne JavaScript lesbar halten.
- Handbuch aus der oberen App-Leiste und der Tastaturhilfe öffnen. HTML bei Entwicklung und Build aus den redaktionellen Quellen erzeugen, Bilddateien und Kapitelverweise prüfen sowie aktuelle App-Version und Copyright anzeigen.
- Veraltete Hinweise zu Geräteabgleich, Planzählern und Werkzeug-Seitenleisten in den eingebundenen Fachanleitungen aktualisieren.

## 0.48.0 · 21.09.2026

- Wandansicht mit beiden Seiten, maßstäblichen Öffnungen und Montagepunkten ergänzen. Vorhandene Möbel und Elektroobjekte per Antippen oder genauer Eingabe von Abstand und Höhe setzen; den Grundriss und Ebenensperren berücksichtigen.
- Benannte Bezugspunkte mit Beschreibung in Leitungsfotos markieren und im SVG ausgeben. Bei kalibrierten Fotos Abstände zum gewählten Verlauf anzeigen. Leitungsfotos auch Grundstücksobjekten und Außenflächen zuordnen.
- Gerätevorlagen projektübergreifend im Browser speichern und in andere Projekte übernehmen. Maße und technische Daten erhalten, individuelle Seriennummern nicht kopieren.
- Mobile Baustellenansicht mit Objektbezug, Kamera-/Fotoaufnahme, Messwerten, Notizen, Aufgabenstatus und optionalen Sprachnotizen ergänzen. Entwürfe vor versehentlichem Schließen schützen und lokal im Projekt speichern.
- Optionalen Projektdienst für PC, iPad und iPhone ergänzen: eigener Zugriffsschlüssel, unprivilegierter Python-Dienst und SQLite-Speicher, Einrichtung über `Update --setup-projects`. Lokale Änderungen verbundener Projekte regelmäßig abgleichen, Serveränderungen zur Übernahme anbieten und gleichzeitige Änderungen mit Revisionsvergleich vor Überschreiben schützen. Vor Übernahmen benannte lokale Versionsstände sichern; Serverhistorie mit 20 vorherigen Ständen führen.

## 0.47.0 · 21.09.2026

- Verbindungen vom ausgewählten Planobjekt oder aus der Hausakte verfolgen: elektrische Versorgungszuordnungen bis zur Einspeisung, dokumentierte Kabelwege über Abzweigdosen sowie zusammenhängende Rohr-, Netzwerk- und SAT-Netze. Ergebnisse mit Geschoss und Raum auflisten und im Plan hervorheben.
- Absperr- und Abschaltübersicht für Sicherungen, Stromkreise und Rohrkomponenten ergänzen. Elektrisch nachgeordnete Objekte anzeigen; im Rohrnetz alternative Versorgungswege und bereits geschlossene Ventile berücksichtigen. Dokumentationsanalyse ohne Änderung realer Schaltzustände.
- Bestand und Umbauziel je Geschoss mit gleichem Bildausschnitt nebeneinander vergleichen. Geplante Objekte beziehungsweise Rückbau anhand der Objektakten ausblenden, ohne Projektdaten zu verändern.
- Projektprüfung um doppelte Kennzeichnungen, offene Abzweigdosen, fehlende Rohranschlüsse und nicht dokumentierte Netzwerkverbindungen erweitern. Solarobjekte nicht als unvollständig erfasste Verbraucher melden; Ergebnisse filtern und als CSV ausgeben.
- Wartungen in einem Monatskalender mit Tagesauswahl anzeigen und aktuelle Fälligkeiten als ICS-Kalenderdatei exportieren.
- Benannte Versionsstände dauerhaft von der automatischen Bereinigung ausnehmen, Änderungen zum aktuellen Projekt auflisten und Einzelstände als Datei sichern. Die bestehende rückgängig machbare Wiederherstellung auch für benannte Stände verwenden.
- QR-Aufkleber direkt aus den Eigenschaften eines Planobjekts öffnen, als Vorschau anzeigen und einzeln als PNG speichern. Die vorhandene PDF-Ausgabe und Prüfung der Projektzuordnung weiterverwenden.

## 0.46.1 · 21.09.2026

- Wiederholtes Platzieren von Solarmodulen ermöglichen: zunächst freie Einträge aus der Solarakte verwenden, anschließend die Modulanzahl automatisch erweitern. Wiederholtes Platzieren eines Balkonkraftwerks legt eine weitere eigenständige Anlage an und wählt sie für folgende Komponenten aus.

## 0.46.0 · 21.09.2026

- Balkonkraftwerk, einzelne Solarmodule, Wechselrichter und Batteriespeicher im Elektrik-Menüband auswählen und maßstäblich im Plan platzieren. Abmessungen und Drehung bearbeiten; Solarsymbole auch in Planexport und Materialliste berücksichtigen.
- Planobjekte mit der Solarakte verbinden: vorhandene Anlagen und Module verwenden oder beim Platzieren eine neue Anlage anlegen. Leistung und Speicherkapazität zentral bearbeiten, die zugehörige Akte direkt öffnen und auch aus der Akte heraus platzieren. Ebenensperren, Rückgängig und lokale Speicherung berücksichtigen.

## 0.45.0 · 21.09.2026

- Geschosse und Ebenen als feste Ribbon-Gruppen neben den Zeichenwerkzeugen und Vorlagen anzeigen. Die bisherigen zusätzlichen aufklappbaren Listen entfallen; die Schaltflächen oben springen zur jeweiligen Gruppe im horizontalen Menüband.
- Das gesamte Ribbon mit „Menüband“ auch auf dem Desktop ein- und ausblenden. Die Bereichs-Tabs bleiben erreichbar; ein Tabwechsel öffnet die Werkzeugzeile wieder. Geschossformulare beim Ausblenden mit verbergen und ihre Eingaben erhalten.

## 0.44.0 · 21.09.2026

- Home-Assistant-Adresse und Zugriffstoken automatisch lokal im Browser speichern und nach Dialogwechsel oder Neuladen wieder einsetzen. Verbindungseinstellungen getrennt vom Projekt halten; keine Zugangsdaten in Projektdateien oder Exporte übernehmen.
- „Verbindung verwerfen“ löscht auch die gespeicherte Adresse und den Token. Fehler beim Laden, Speichern oder Löschen verständlich anzeigen; Zustände weiterhin nur auf ausdrücklichen Abruf lesen.

## 0.43.0 · 21.09.2026

- Geschossverwaltung und Ebenensteuerung als aufklappbare Bereiche direkt im Menüband anzeigen. Geschosse wechseln sowie Ebenen einblenden, ausblenden und sperren, ohne den Plan durch ein Popup zu blockieren.
- Geschosse aus dem Menüband heraus inline anlegen und bearbeiten. Bereiche mit eigener Schaltfläche oder Escape einklappen; auf schmalen Geräten die Geschoss- und Ebenenlisten horizontal verschieben.

## 0.42.0 · 21.09.2026

- Angezeigte Wandachsmaße bestehender Räume im Auswahlmodus anklicken oder antippen und die genaue Länge direkt eingeben. Dezimalkomma und Einheiten mm, cm und m unterstützen; Anfangs- oder Endpunkt ausdrücklich festhalten und nur den anderen Punkt entlang der Wand verschieben.
- Auch verbundene, ausgerichtete Wandbemaßungen bearbeiten. Eingabefokus und Tastaturbedienung, Touch-Treffflächen, Fehlermeldungen, Ebenensperren sowie Rückgängig berücksichtigen.

## 0.41.0 · 21.09.2026

- Gerade und gebogene Treppen zusätzlich im nächsthöheren oder nächsttieferen Geschoss anzeigen. In den Treppeneigenschaften zwischen „Nach oben“, „Nach unten“ und „Nur auf dieser Etage“ wählen; vorhandene Treppen zeigen standardmäßig nach oben.
- Geschosshöhen und Referenzpunktversatz berücksichtigen, Gegenrichtung und Zielgeschoss beschriften und die zusätzliche Ansicht in Planexport und „Alles anzeigen“ einbeziehen. Die Darstellung folgt dem Original ohne doppelte Möbel- oder Materialeinträge; Bearbeitung auf der Ursprungsetage.

## 0.40.0 · 21.09.2026

- TV-/SAT-Geräte im Netzwerkbereich platzieren: SAT-Schüssel, LNB, Multischalter, terrestrische Antenne, Verstärker, Koax-Verteiler, Antennendose, Receiver und Fernseher. Modelle, Satellitenposition, LNB-Ausführung, Spiegelgröße und benannte Anschlüsse bearbeiten.
- Koaxanschlüsse verbinden, Kabeldaten nachträglich bearbeiten und Leitungswege mit Wegpunkten per Maus oder Touch zeichnen. Etagenverbindungen mit Zielgeschoss kennzeichnen; Leitungslängen samt Höhenunterschied und Zuschlag sowie TV-Komponenten in den Export übernehmen.
- Anschlussbelegung auf doppelte Verbindungen prüfen und Koax- von Netzwerkports trennen. Speichern, Neuladen und Rückgängig für Leitungswege unterstützen.

## 0.39.0 · 21.09.2026

- Einzelne Möbel im Auswahlmodus über acht Eck- und Seitengriffe direkt im Plan vergrößern und verkleinern. Gegenüberliegende Kanten festhalten, gedrehte Möbel entlang ihrer eigenen Achsen skalieren und aktuelle Breite/Tiefe an der Vorschau anzeigen.
- Rasterfang für Maße, größere Touch-Treffbereiche, Ebenensperren und einen gemeinsamen Rückgängig-Schritt je Größenänderung unterstützen. Escape, abgebrochene Zeigergesten und Zwei-Finger-Navigation verwerfen die Vorschau.

## 0.38.1 · 21.09.2026

- Popups beim Ziehen einer Textmarkierung über den Dialogrand offen halten. Schließen über den Hintergrund nur auslösen, wenn der Klick dort beginnt und endet; abgebrochene Zeigergesten verwerfen. Schließen-Schaltfläche und Escape bleiben unverändert bedienbar.

## 0.38.0 · 21.09.2026

- Bereichs-Tabs und Zeichenwerkzeuge aus der linken Seitenleiste in ein horizontales Menüband oberhalb des Plans verlagern. Je Bereich die passenden Vorlagen und Aktionen anzeigen; die bisherige linke Spalte steht dem Plan zur Verfügung.
- Geschossverwaltung und Ebenensichtbarkeit/-sperren über eigene Schaltflächen oben öffnen. Abstandspunkte für das Grundstück in einem eigenen Dialog erfassen.
- Menüband auf iPad und iPhone ein- und ausklappen; Tabs und Ansichtssteuerung erreichbar halten. Breite Werkzeuggruppen horizontal verschieben und bei Bereichswechsel an ihren Anfang zurücksetzen.
- Tastaturbedienung und Fokusrückgabe beim Schließen von Dialogen verbessern; Bedienungsanleitung aktualisieren.

## 0.37.0 · 21.09.2026

- Zählernummern zwischen Planzählern und verknüpften Hausakten-Einträgen in beide Richtungen abgleichen. Bereits in der Hausakte vorhandene Nummern beim Laden in leere Planfelder übernehmen; widersprüchliche Altwerte zur bewussten Korrektur anzeigen.
- Bei ausgewählten Strom-, Wasser-, Gas- und Wärmezählern die letzte datierte Ablesung anzeigen und direkt den passenden Eintrag unter „Zähler & Verbrauch“ öffnen.
- Ablesungen zentral mit Datum in der Hausakte führen. Alte undatierte Stromzählerstände bleiben als bisheriger Planstand sichtbar, solange noch keine datierte Ablesung existiert.

## 0.36.0 · 21.09.2026

- Raum- und Wandendpunkte im Auswahlmodus über eigene runde Griffe einzeln verschieben. Nur der gewählte Punkt bewegt sich; angeschlossene Wände ändern Länge und Richtung, alle übrigen Punkte bleiben stehen.
- Größere Treffbereiche für die Punktbearbeitung per Touch ergänzen. Ganze Wände und Räume weiterhin über Wandfläche beziehungsweise Rauminneres verschieben.
- Raumecken einzeln auswählen und ihre X-/Y-Koordinaten genau bearbeiten. Bestehende Geometrieprüfung, Ebenensperren und Rückgängig auch beim Verschieben einzelner Punkte beachten.

## 0.35.0 · 21.09.2026

- Grundstücksgrenzen, Wege, Terrassen, Beete und Referenzpunkte auf iPhone/iPad per GPS-Groberfassung aufnehmen. Bekannten Planpunkt oder Planursprung als GPS-Referenz verwenden und die Nordrichtung einstellen.
- Aktuelle Position mit Unsicherheitskreis prüfen und einzelne Punkte ausdrücklich übernehmen. Wegbreite, Punktentfernung, geometrische Prüfung und gemeinsame Speicherung mit Rückgängig unterstützen.
- Standortfreigabe und HTTPS verständlich prüfen; veraltete Messungen sperren und größere Ungenauigkeit kennzeichnen. Ortung beim Schließen oder Wechsel in den Hintergrund beenden.
- GPS-Referenz und ursprüngliche Messdaten samt Genauigkeit im lokalen Projekt speichern; bestehende Planpunkte weiterhin manuell korrigieren. Anleitung für Aufnahme und Projektübertragung ergänzen.

## 0.34.1 · 21.09.2026

- Bestehende Zähler nachträglich bearbeiten und ihre Planverknüpfung ändern oder entfernen. Passende Planzähler auch dann anbieten, wenn bereits ein automatischer Hausakten-Eintrag vorhanden ist.
- Bei neuer Zuordnung unveränderte automatische Einträge ersetzen; eigene Daten und Ablesungen bisher zugeordneter Einträge ohne Planverknüpfung erhalten. Historische Zähler auch nach Entfernen des Planobjekts weiter bearbeiten.
- Bearbeitung ausdrücklich abbrechen können, ohne Änderungen zu speichern.

## 0.34.0 · 21.09.2026

- Strom-, Wasser-, Gas- und Wärmezähler beim Platzieren im Plan automatisch in „Zähler & Verbrauch“ erfassen und verknüpfen. Bestehende Planzähler beim Laden nachtragen, vorhandene Verknüpfungen und Ablesungen erhalten.
- Zählerauswahl mit Art, Name, Einheit und Standort beschriften. Planverknüpfungen auf passende, noch nicht zugeordnete Zähler begrenzen; Steckdosen und andere Komponenten nicht mehr anbieten.
- Bei vorhandenen Zählern direkt die Ablesung anzeigen; zusätzliche Zähler ohne Planposition weiterhin manuell erfassen. Beim Entfernen eines Planzählers die Verbrauchshistorie erhalten, beim Duplizieren einen eigenen Verlauf beginnen.

## 0.33.0 · 21.09.2026

- Neuer Planungsbereich „Grundstück“ mit Grundstücksgrenzen, Wegen mit einstellbarer Breite, Terrassen, Beeten und Referenzpunkten auf einer eigenen sichtbaren und sperrbaren Ebene.
- Eckpunkte maßhaltig bearbeiten; Kantenlängen, Umfang und Flächen anzeigen. Referenzpunkte mit genauem X-/Y-Abstand zu vorhandenen Grundstückspunkten anlegen und für den Punktfang beim Platzieren anderer Gewerke nutzen.
- Außenobjekte auswählen, verschieben, duplizieren, löschen und rückgängig machen; lokale Speicherung und JSON-Import/-Export unterstützen alle Grundstücksdaten.
- Grundstücksobjekte und Maße in SVG-/PDF-Planausgaben übernehmen; breite Wege beim Einpassen und Export vollständig berücksichtigen.

## 0.32.0 · 21.09.2026

- Neuer Planungsbereich „Netzwerk“ mit eigener sichtbarer und sperrbarer Ebene. Router, Switches, Netzwerkdosen, Patchpanel, Access Points, Repeater, Server/NAS und Clients direkt per Klick im Grundriss platzieren.
- Netzwerkgeräte im Plan auswählen, verschieben, duplizieren und löschen; Name, Geräteart, Ports, Position und Netzwerkangaben rechts bearbeiten. Änderungen unterstützen Rückgängig/Wiederholen und lokale Speicherung.
- Port-, Kabel- und WLAN-Verwaltung direkt aus dem Netzwerkbereich öffnen. Bestehende Hausakten-Geräte werden übernommen; Sichtbarkeit gilt auch für Planausgaben.

## 0.31.0 · 21.09.2026

- Sicherungskasten um editierbare Vorlagen für LS B6–B32, dreipolige LS C16/C20/C32, FI, FI/LS sowie D01-, D02-, DII- und NH00-Schmelzsicherungen erweitert.
- Klingeltrafo direkt im Sicherungskasten anlegen und dessen Primärstromkreis zuordnen. Mehrere Ausgänge mit 6, 9, 12 und 24 V lassen sich je Verbraucher auswählen.
- Anschlussplan und Leitersimulation unterstützen getrennte Spannungsabgriffe mit gemeinsamem 0-V-Rückleiter. Die Lastsimulation berücksichtigt die gemeinsame VA-Leistung aller Trafoausgänge.
- Sicherungskasten-Aushang zeigt Trafoausgänge und offene Primärzuordnungen. Bestehende Einzelausgangstrafos bleiben kompatibel.

## 0.30.0 · 21.09.2026

- Gerade Treppen und Treppen mit Kurve stehen als maßhaltige, drehbare Grundrissobjekte zur Verfügung.
- Stufen und Laufrichtung sind im Editor sichtbar; die Stufenlinien werden auch in Planausgaben übernommen.

## 0.29.0 · 21.09.2026

- Türen können jetzt als Drehtür, Schiebetür oder offener Durchgang ohne Türblatt dargestellt werden.
- Netzwerkplanung ergänzt Server/NAS und WLAN-Messpunkte mit Sender, Planposition und Signalstärke in dBm.
- WLAN-Messwerte erscheinen farblich bewertet im Grundriss und in der Planausgabe; Netzwerkgeräte, Ports und Kabel bleiben gemeinsam dokumentiert.

## 0.28.0 · 20.09.2026

- Etagenübergangsmarker folgen bei verschobenen Referenzpunkten jetzt auf beiden Geschossen der korrekten gemeinsamen Position.

## 0.27.0 · 20.09.2026

- Geschossliste nach Höhenlage und anschließendem Namen sortiert.
- Geschosse erhalten X/Y-Referenzpunkte für die gemeinsame Gebäudelage.
- Optionale transparente Etagenreferenzen zeigen Keller, Erdgeschoss und Obergeschoss übereinander.
- Geschossübergreifende Rohr- und Elektroleitungen berücksichtigen die Referenzverschiebung.

## 0.26.0 · 20.09.2026

- Kombitherme/Gasheizung unterstützt jetzt getrennte Anschlüsse für Kaltwasser, Warmwasser, Heizungs-Vorlauf, Heizungs-Rücklauf und Gas.
- Bereits vorhandene Gasheizungen mit VL/RL/GAS bleiben kompatibel und können ohne Neuanlage um KW/WW-Leitungen ergänzt werden.
- Medienauswahl, Rohrprüfung und Bauteilbeschriftung verwenden die zusätzlichen Kombitherme-Anschlüsse.

## 0.25.0 · 20.09.2026

- Neues Anschlussplan-Schema für die Elektrik: belegte Leitungen zeigen Bauteile, Pole und Schaltkontakte mit farbigen Verbindungslinien.
- 3-/5-polige Anschlüsse, Neutralleiter, Schutzleiter, Außenleiter und Kleinspannung werden getrennt kenntlich gemacht.
- Versorgungskette und Anschlussplan sind als getrennte Ansichten in der Hausakte verfügbar.

## 0.24.0 · 20.09.2026

- Einfacherer Proxmox-Installer: nummerierte Auswahl für Disk-Speicher, Template-Speicher, Debian-Template und Netzwerk-Bridge.
- Freie Container-ID automatisch vorschlagen, verfügbaren Speicherplatz anzeigen und ungültige Menüeingaben erneut abfragen.
- Fehlende Debian-Templates direkt auswählen und nach Bestätigung herunterladen.

## 0.23.0 · 20.09.2026

- Updates direkt aus der App starten, mit Update-Passwort, Fortschritt und kontrolliertem Neuladen.
- Lokaler Update-Dienst im LXC; Installer richtet Passwort und Dienst ein, bestehende Installationen mit `Update --setup-web` nachrüstbar.
- Dauerhaft sichtbarer App-Footer mit Home-Technik, Versionsnummer und Copyright by nobbie2009.
- Einheitlicher Footer auf jeder Seite sämtlicher erzeugter PDF-Ausgaben, einschließlich QR-Aufklebern.
- PDF-Version stammt aus demselben Build wie die App-Anzeige; Seitennummern bleiben erhalten.

## 0.22.0 · 20.09.2026

- Interaktiver Proxmox-Installer fragt Container, Storage, Debian-Template, Netzwerk und Ressourcen ab.
- Update-Symlink im LXC mit Prüfsummenprüfung, atomarem Releasewechsel und Rollback auf den vorherigen Stand.
- App zeigt ihre Version und prüft beim Öffnen sowie stündlich auf neue GitHub-Releases.
- Neue Serverversion wird erkannt; offene Eingaben bleiben bis zum selbst gewählten Neuladen erhalten.
- Versionsnummern in Paket und Lockdatei werden pro Update erhöht und in CI gegen den bisherigen Stand geprüft.
- Nach erfolgreichen CI-Prüfungen veröffentlicht GitHub ein versioniertes Installationspaket mit SHA-256.

## 20.09.2026 · Deployment-Skill (App weiterhin 0.21.0)

- Wiederverwendbarer Codex-Skill für Home-Technik auf einem unprivilegierten Proxmox-LXC.
- Nginx-Vorlage, getrennte Build-/Host-/Container-Schritte und Releasewechsel mit Rollback.
- Browserdaten-Übertragung, dauerhafte WLAN-Adresse und QR-Aufkleber beim Serverumzug berücksichtigt.
- Kein automatisches Deployment und keine Änderungen am App-Datenmodell.

## 0.21.0 · 20.09.2026

- Haus-Startseite mit Wartungsterminen, letzten Zählerständen, fehlenden Angaben und Schnellaktionen.
- Sicherungserinnerung mit Inhaltsprüfung der exportierten Datei und bewusster Übernahme beim Gerätewechsel.
- Vorschau unterschiedlicher und älterer Projektstände; Import als separate Kopie möglich.
- Hauschronik für Reparaturen, Umbauten und Anschaffungen mit Kosten, Vorher-/Nachher-Fotos und Belegen.
- QR-Aufkleber als A4-PDF mit direktem Aktenaufruf und Prüfung der zugehörigen Projektkennung.
- Druckbare Haus-Schnellübersicht mit wichtigen Stellen, eigenen Hinweisen und Kontakten.
- Bewässerungszonen und Außenwasserstellen mit direkt verknüpften Pflegeaufgaben.
- Projektvalidierung, Suche, Undo/Redo und JSON-Sicherung erweitert; zusätzliche Desktop- und iPad-Prüfungen.

## 0.20.0 · 20.09.2026

- Eigener Sicherungskasten-Aushang in der Hausakte und aus dem Ausgabebereich erreichbar.
- Einzelnen Verteiler oder alle Sicherungskästen als A4-Querformat-PDF ausgeben.
- Sicherungskennzeichnung, Stromkreis, zugeordnete Räume/Geräte, Phase und FI-Zuordnung einschließlich vorgeschalteter Verteilungen.
- Fehlende Zuordnungen und unzugeordnete Schutzgeräte ausdrücklich sichtbar; keine erfundenen Reserveplätze.
- Eigene Hinweise, wiederholte Tabellenköpfe, Datenstand und Seitennummern; lange Einträge mit lesbaren Fortsetzungen.
- Modell-, Desktop- und iPad-Prüfungen sowie gerenderte PDF-Probe mit umfangreichen Testdaten.

## 0.19.0 · 20.09.2026

- Einrichtungsassistent mit sechs Schritten, Themenauswahl, raumweisem Rundgang und Abschlussübersicht.
- Fortschritt, übersprungene Schritte und durchgesehene Räume im Projekt gespeichert; vorhandene Räume und Geräte werden weiterverwendet.
- Direkte Eingaben für Hausname, Geschosse und rechteckige Räume sowie Übergänge zu Planvorlagen, Objektakten und Wandfotos.
- Zentrale Suche nach Namen, Standorten, Seriennummern, WLAN-Angaben, Unterlagen und Notizen; direkte Navigation zu Akten, Zählern, Fotos und Planpositionen.
- Balkonkraftwerk-Akte mit Modulgruppen, Wechselrichter, optionalem Speicher, Anschlusszuordnung, Foto und Unterlagen.
- Vorhandenen Solarertragszähler verknüpfen oder einmalig anlegen; tatsächliche Ableseintervalle auswerten.
- Projektvalidierung, JSON-Sicherung und Undo/Redo erweitert; zusätzliche Modell-, Desktop- und iPad-WebKit-Prüfungen.

## 0.18.0 · 20.09.2026

- Internetanschluss und WLAN-Gerätedaten mit SSID, Frequenzbändern, IP/MAC und Standort; zusätzliche Repeater und Clients.
- Persönliche Einträge für Absperrstellen, Rauchmelder, Garten und Außenbeleuchtung mit Fotos, Seriennummern und Terminen.
- Vorhandene Absperrventile automatisch in der Übersicht; Planmarkierungen und Verknüpfungen zu bestehenden Objekten.
- Außenleuchten direkt als elektrische Verbraucher anlegen, mit dokumentierter Leistung und anschließbarer Elektrik.
- Eigene Zähler- und Verbrauchsansicht mit Ablesekorrektur, Zeitraumfilter, Tagesmitteln, Kostenabschätzung und CSV-Ausgabe.
- Validierung von Ablesefolgen und Zählerwechseln; unbekannte Intervalle bleiben ausdrücklich offen.
- Gemeinsame Wartungsübersicht, wiederkehrende Aufgaben und Erledigungshistorien.
- Projektvalidierung, lokale Sicherung, JSON, Undo/Redo, Planausgabe und Bestandslisten integriert.
- Zusätzliche Modell-, Desktop- und iPad-WebKit-Prüfungen.

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
