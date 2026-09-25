# Einstieg und erster Rundgang {#einstieg}

Dieses Handbuch begleitet dich vom ersten Raum bis zur laufenden Hausdokumentation. Es beschreibt **Home-Technik {{VERSION}}**. Die Bildschirmbilder zeigen ausschließlich Beispielprojekte; einige Aufnahmen stammen aus Version 0.48.0. Kleine Unterschiede bei Versionsanzeige, Fenstergröße oder Schaltflächenanordnung sind deshalb möglich. Du kannst jedes Bild anklicken und in Originalgröße betrachten.

**So findest du etwas:** Im Inhaltsverzeichnis ein Kapitel wählen, oben einen Begriff suchen oder unten das alphabetische Stichwortverzeichnis verwenden. Die Handbuchsuche durchsucht Bedienung, FAQ und Erklärungen. Die Suche **innerhalb deiner Hausdaten** findest du dagegen in der App unter **Hausakte → Suche**. Deine Hausdaten werden von diesem Handbuch weder gelesen noch verändert.

## Ein sinnvoller Start in sieben Schritten

1. Öffne Home-Technik an der Adresse deines Hausservers. Verwende möglichst immer dieselbe Adresse. Ein anderer Host, Port oder Wechsel von HTTP auf HTTPS besitzt einen anderen lokalen Browserspeicher.
2. Wähle **Neu**, vergib einen eindeutigen Projektnamen, beispielsweise „Musterhaus – Bestand“, und bestätige. Vorhandene Projekte bleiben in der lokalen Projektbibliothek erhalten.
3. Lege im Menüband die Geschosse an. Beginne mit einer Etage, die du gut kennst. Prüfe Etagenhöhe und Raumhöhe, bevor du geschossübergreifende Verbindungen erfasst.
4. Zeichne einen einfachen Rechteckraum. Trage anschließend seine gemessenen Maße ein und benenne ihn. Ergänze Türen und Fenster.
5. Platziere erst einige Möbel und bekannte technische Komponenten. Vergib verständliche Namen, etwa „Steckdose links am Küchenfenster“.
6. Öffne **Hausakte → Einrichtung** und arbeite dich durch den geführten Rundgang. Du darfst Schritte überspringen und später fortsetzen.
7. Sichere das Projekt als JSON-Datei. Prüfe die heruntergeladene Datei unter **Hausakte → Sicherung & Gerätewechsel**. Erst ein geprüfter, außerhalb des Browsers aufbewahrter Export ist eine unabhängige Sicherung.

**Erwartetes Ergebnis:** Ein benanntes Projekt mit mindestens einem Geschoss, einem maßhaltigen Raum und einer separat gespeicherten Sicherungsdatei.

![Der Beispielgrundriss zeigt Räume, Wandöffnungen und die Aufteilung der Arbeitsfläche.](bilder/editor-desktop.png)

## Welche Arbeitsweise passt zu dir?

| Vorhaben                       | Empfohlener Einstieg                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| Bestehendes Haus dokumentieren | Geschosse und Räume, danach Raum für Raum Geräte und Fotos erfassen                      |
| Umbau vorbereiten              | Bestand sichern, Objektakten mit „Geplant“ oder „Rückbau“ kennzeichnen, Vergleich öffnen |
| Gartenleitungen festhalten     | Grundstück und Referenzpunkte, dann die jeweiligen Technikbereiche und Leitungsfotos     |
| Sicherungskasten ordnen        | Einspeisung, Zähler, Verteiler, Schutzgeräte und Stromkreise, danach Verbraucher         |
| Auf mehreren Geräten arbeiten  | Gemeinsamen Projektdienst einrichten oder kontrollierten JSON-Gerätewechsel verwenden    |

Home-Technik dokumentiert deine Angaben. Das Programm erkennt die reale Hausinstallation nicht automatisch. Unbekannte Werte lässt du offen; ein erfundener Wert wirkt später wie eine gesicherte Angabe.

# Oberfläche, Navigation und Auswahl {#oberflaeche}

Die obere Leiste enthält Projektaktionen, Rückgängig/Wiederholen, Anzeigeoptionen, **Hausakte**, **Baustelle**, Import/Export und die Hilfe. Die Versionsanzeige öffnet die Updateinformationen. Darunter liegen Bereichs-Tabs und Menüband. Der größte Bereich ist die Zeichenfläche; Eigenschaften erscheinen rechts.

![Das Menüband stellt Werkzeuge, Geschosse und Ebenen oberhalb des Plans bereit.](bilder/ribbon-inline-desktop.png)

## Bereich, Werkzeug, Ebene: drei verschiedene Dinge

- **Bereich:** Ein Tab wie Haus / Raum, Möbel, Elektrik oder Netzwerk legt fest, was du bearbeiten möchtest. Ein sichtbares Objekt eines anderen Bereichs lässt sich unter Umständen erst nach dem Tabwechsel auswählen.
- **Werkzeug:** Innerhalb eines Bereichs wählst du beispielsweise Auswahl, Wand, Möbelplatzierung oder Leitungszeichnung. Ein Platzierungswerkzeug kann nach dem ersten Objekt aktiv bleiben.
- **Ebene:** Ebenen bestimmen Sichtbarkeit und Bearbeitungssperren. Eine gesperrte Ebene bleibt sichtbar, lässt sich aber nicht verändern. Abhängige Objekte können eine Änderung ebenfalls verhindern.

## Menüband und Eigenschaften bedienen

**Menüband** klappt die Werkzeuggruppen ein oder aus. Ein Bereichswechsel öffnet das Menüband wieder. Auf schmalen Bildschirmen lassen sich die Gruppen waagerecht verschieben. Geschosse und Ebenen stehen direkt im Ribbon; die entsprechenden Schaltflächen springen zur Gruppe.

Auf iPad und iPhone **Eigenschaften** öffnen, um das gewählte Objekt zu bearbeiten. Auf sehr schmalen Bildschirmen erscheint dafür das Schieberegler-Symbol. Die Objektliste in der Eigenschaftenleiste ist eine Alternative zum Treffen kleiner Symbole im Plan.

## Genau auswählen und bearbeiten

1. Passenden Bereich öffnen und **Auswahl** aktivieren.
2. Das Objekt im Plan anklicken oder in **Objekte im aktiven Bereich** wählen.
3. Namen und Maße rechts prüfen. Eingaben entsprechend dem jeweiligen Feld mit Enter oder der Speichern-Schaltfläche bestätigen.
4. Bei mehreren übereinanderliegenden Objekten andere Ebenen vorübergehend ausblenden oder die Objektliste verwenden.
5. Nach einer unbeabsichtigten Änderung **Rückgängig** verwenden. Ein nicht abgeschlossener Zeichenvorgang wird mit **Escape** beziehungsweise **Abbrechen** verworfen.

Der Browserdialog zum Öffnen oder Speichern einer Datei gehört zum Betriebssystem. Auf dem iPhone findest du Downloads gewöhnlich über die Dateien-App; der tatsächliche Ablageort hängt von deinen Browsereinstellungen ab.

# Grundriss, Räume, Wände und genaue Maße {#grundriss}

## Rechteckraum anlegen

1. **Haus / Raum** wählen und das Rechteckraum-Werkzeug aktivieren.
2. Erste und gegenüberliegende Ecke im Plan setzen.
3. Den Raum auswählen, sinnvoll benennen und seine Maße prüfen.
4. Ein eingeblendetes Raummaß anklicken, das gewünschte genaue Maß eingeben und bestätigen. Die zugehörige Wand wird angepasst.
5. Bei einer Fehländerung Rückgängig verwenden und kontrollieren, welches Maß beziehungsweise welche Wand ausgewählt war.

Die Anzeige lässt sich zwischen mm, cm und m wechseln. Achte immer auf die Einheit am Eingabefeld: Viele technische Eigenschaften werden ausdrücklich in **Millimetern** eingegeben. 4,35 m entsprechen 4350 mm.

![Ein vorhandenes Raummaß kann direkt angewählt und genau geändert werden.](bilder/wall-dimension.png)

## Freier Raum und Wandzug

Für unregelmäßige Räume das Polygonraum-Werkzeug verwenden, die Ecken in umlaufender Reihenfolge setzen und **Raum schließen** wählen. Überschneidende Kanten und ungültige Flächen werden abgewiesen. **Letzten Punkt entfernen** korrigiert den begonnenen Umriss.

Mit dem Wand-Werkzeug den Anfang setzen, die Richtung vorgeben und die Länge eintippen. Beispielsweise legt **4350 + Enter** eine 4350 mm lange Wand fest. Weitere Wände können direkt anschließen. Ein einfacher geschlossener Wandzug erzeugt einen Raum. T-Anschlüsse und Kreuzungen werden geometrisch verbunden; prüfe danach die beteiligten Räume.

## Einen Eckpunkt verändern

Wähle das betreffende Raum- oder Wandobjekt und ziehe seinen Punktgriff. Ein einzelner Griff verändert diesen Punkt, nicht starr die ganze Wand mit allen Nachbarpunkten. Alternativ die Endpunktkoordinaten in den Eigenschaften bearbeiten. Gemeinsam verwendete Punkte bleiben gemeinsame Anschlüsse: Anliegende Wandsegmente passen ihre Richtung oder Länge entsprechend an. Wer einen gemeinsamen Punkt löst oder eine ganze Wand verschiebt, führt eine andere Änderung aus.

**Typische Kontrolle nach einer Änderung:** Stimmen Fläche, Türposition und Anschluss an die nächste Wand noch? Sind Wandbefestigungen vorhanden, die außerhalb der neuen Wandlänge liegen würden? Solche Abhängigkeiten können eine Verkürzung verhindern und müssen zuerst angepasst werden.

## Türen, Fenster und Bemaßung

Tür- oder Fensterwerkzeug wählen und die zugehörige Wand anklicken. In den Eigenschaften Breite, Höhe, Position und gegebenenfalls Anschlag beziehungsweise Brüstungshöhe ergänzen. Eine Öffnung gehört zu einer Wand; sie ist kein frei schwebendes Möbelsymbol.

Automatische Wandmaße helfen bei der Kontrolle. Für zusätzliche Abstände eine manuelle Bemaßung setzen und die gewünschten Bezugspunkte wählen. Raster und Fangpunkte unterstützen das Zeichnen, ersetzen aber keine abschließende Maßkontrolle.

# Geschosse, Ebenen und Treppen {#geschosse}

## Geschosse vorbereiten

Im Menüband die Geschossgruppe öffnen beziehungsweise dorthin springen. Erdgeschoss, Obergeschoss, Keller und bei Bedarf ein eigenes Geschoss „Außenbereich“ anlegen. Geschossnamen so wählen, dass spätere Objektlisten eindeutig sind.

**Etagenhöhe** beschreibt die vertikale Lage eines Geschosses. **Raumhöhe** beschreibt die Höhe darüber. Diese Angaben beeinflussen unter anderem geschossübergreifende Leitungsdarstellungen. Ein Außenbereich ist eine praktische Organisation des Plans; die App besitzt kein vollständiges Geländehöhenmodell.

## Ebenen sinnvoll verwenden

Grundriss, Möbel, Elektrik, Bemaßung sowie die weiteren Technikbereiche können getrennt dargestellt werden. Für die Gartenplanung beispielsweise nur Grundstück und die gerade bearbeitete Technik einblenden. Fertige Grundrisse sperren, wenn du anschließend Geräte dokumentierst.

Eine Sperre schützt auch indirekte Änderungen. Wird ein Rohranschluss verschoben, müssten seine Leitungsenden folgen. Ist die Leitung gesperrt, kann deshalb auch das Verschieben des Anschlussobjekts abgewiesen werden. Erst die passende Sperre bewusst lösen, dann die Änderung durchführen.

## Treppen über mehrere Etagen

Treppe platzieren, auswählen und in den Eigenschaften die Richtung **hoch** oder **runter** festlegen. Die Darstellung im benachbarten Geschoss dient zur Orientierung. Prüfe Geschossreihenfolge und Richtung, wenn die Treppe auf der erwarteten Ebene nicht erscheint. Bearbeite das Original auf seinem eigenen Geschoss.

![Die Treppe wird zur Orientierung auch im angrenzenden Geschoss dargestellt.](bilder/stairs-upper.png)

# Möbel und freie Objekte {#moebel}

Unter **Möbel** eine Vorlage wie Tisch, Schrank, Sofa, Bett oder Serverrack auswählen und im Plan platzieren. Bei einem freien Objekt Namen und Maße selbst vergeben. Vorlagenmaße sind Ausgangswerte und keine vermessenen Herstellerdaten.

**Tabwechsel und Verschieben:** Jeder Tab startet mit **Auswahl**. Eine Platzierung beginnt erst nach bewusster Werkzeug- oder Vorlagenwahl. Für die bereits gewählte Möbelvorlage **Möbel im Plan platzieren** drücken. Im Auswahlmodus lässt sich die Ansicht durch Ziehen auf einer freien Fläche mit Maus oder einem Finger verschieben. Ein kurzer Klick hebt die Auswahl auf. Getroffene Objekte bleiben auswählbar und verschiebbar; eine Raumfläche zählt im Bereich Haus / Raum als Raumobjekt. Für das Verschieben der Ansicht über Objekten weiterhin das Handwerkzeug, die mittlere Maustaste oder die Leertaste verwenden.

## Globaler Möbelkatalog und Herstellermaße

**Möbel → Globaler Möbelkatalog** enthält 39 Standardvorlagen, darunter Büro-, Bad-, Küchen-, Garten- und Lagermöbel. Über die Suche nach Namen filtern. Die Standardmaße sind anpassbare Planungsbeispiele, keine Herstellerzusagen.

Eigene Vorlagen unter **Meine Möbel** anlegen: Namen, Hersteller, optional einen Produktlink, Grundform sowie Breite, Tiefe und Höhe in Millimeter eingeben und **Vorlage speichern**. Ein im Plan ausgewähltes Möbel lässt sich mit **Ausgewähltes Möbel übernehmen** als Vorlage vorbereiten. Gespeicherte Vorlagen können bearbeitet, platziert und entfernt werden. Bereits platzierte Möbel behalten ihre eigenen Maße, auch wenn die Vorlage später geändert oder gelöscht wird.

Für IKEA oder andere Hersteller **Maße von IKEA oder anderen Quellen übernehmen** öffnen. Nur die Produktmaße von der Produktseite kopieren, keine Verpackungsmaße. Unterstützt werden benannte Maße mit Einheit wie `Breite: 80 cm, Tiefe: 28 cm, Höhe: 202 cm` sowie eine einzelne Maßfolge `80 × 28 × 202 cm`. Bei dieser Folge wird **Breite × Tiefe × Höhe** angenommen. **Maße vorschlagen** rechnet in Millimeter um; Reihenfolge, Werte und gewählte Produktvariante anschließend selbst prüfen und speichern. Fehlende Einheiten und widersprüchliche Maßangaben werden abgewiesen. Der Produktlink wird als Quelle gespeichert, aber nicht automatisch abgerufen. Fotos und 3D-Modelle werden nicht importiert.

Der eigene Katalog gilt **projektübergreifend in diesem Browser**. Mit **Möbelkatalog exportieren** eine JSON-Sicherung herunterladen. Auf einem anderen Gerät dieselbe Datei unter **Möbelkatalog importieren (JSON)** auswählen, die Vorschau prüfen und **Importierte Vorlagen übernehmen** drücken. Gleiche Kennungen mit gleichen Inhalten werden übersprungen, abweichende Inhalte als neue Kopie ergänzt. Bestehende Einträge werden nicht überschrieben. Grenzen: 1.000 eigene Vorlagen und 2 MB pro Katalog. Der Katalog wird nicht automatisch zwischen Geräten synchronisiert und ist nicht Bestandteil der Projektdatei; platzierte Möbel samt Maßen und Produktquelle sind dagegen im Projekt enthalten.

![Globaler Möbelkatalog mit einer eigenen Regalvorlage und Eingabe von Herstellermaßen.](bilder/furniture-catalog.png)

1. In den Auswahlmodus wechseln und das Möbel anklicken.
2. An den Eck- oder Seitengriffen die Grundfläche verändern. Seitengriffe ändern die jeweilige Richtung; die Vorschau zeigt die neue Ausdehnung.
3. Für exakte Maße Breite, Tiefe und Höhe rechts eingeben. Die Höhe ist eine gespeicherte Eigenschaft; der Plan bleibt eine Draufsicht.
4. Drehung anpassen, das Objekt verschieben oder duplizieren. Duplikate erhalten eigene Kennungen.
5. Bei einer begonnenen Größenänderung mit Escape abbrechen. Eine abgeschlossene Änderung lässt sich rückgängig machen.

![Griffe ermöglichen das direkte Ändern der Möbelgröße im Plan.](bilder/furniture-resize.png)

**Möbel oder Verbraucher?** Ein Schrank benötigt keinen Stromanschluss. Ein elektrisch auszuwertendes Gerät sollte als Verbraucher angelegt werden. Die Verbraucherdatenbank verbindet Maßdarstellung und elektrische Angaben in einem einzigen Elektroobjekt. Ein zusätzliches Möbel kann sonst eine zweite, unabhängige Darstellung desselben Geräts ergeben.

# Elektrik, Sicherungskasten und Klingeltrafo {#elektrik}

Dieses Kapitel beschreibt die Eingabe in die Software. Die eingezeichneten Zuordnungen sind deine Dokumentation und schalten keine reale Anlage.

## Versorgung in einer nachvollziehbaren Reihenfolge erfassen

1. Unter **Elektrik** einen Einspeisepunkt platzieren und benennen. Bekannte Spannungs- und Kapazitätsangaben erfassen; unbekannte Angaben offen lassen.
2. Einen Stromzähler platzieren und der Einspeisung zuordnen. Zählernummer erfassen. Die verknüpfte Hausakte verwendet den Zähler weiter.
3. **Sicherungskasten / Verteiler** platzieren und unter **Versorgung des Sicherungskastens** den Zähler oder eine direkte Einspeisung auswählen.
4. Schutzgeräte hinzufügen. **B16-Sicherung hinzufügen** und **FI hinzufügen** erzeugen bearbeitbare Ausgangseinträge. Typ, Kennzeichnung und dokumentierte Werte an den Bestand anpassen.
5. Bei mehreren Schutzgeräten die Vorgängerbeziehung festlegen, etwa FI vor Leitungsschutzschalter. Die Schutzkette ist eine ausdrückliche Zuordnung.
6. **Stromkreise verwalten** öffnen. Einen Stromkreis mit verständlicher Bezeichnung anlegen, Schutzgerät und dokumentierte Phase zuordnen.
7. Steckdosen platzieren und dem Stromkreis zuweisen. Verbraucher ausdrücklich an eine Steckdose oder als Festanschluss zuordnen.

![Der grafische Sicherungskasten zeigt die Schutzkette, Stromkreise und Klingeltrafos. Komponenten öffnen ihre Einstellungen in einem weiteren Popup.](bilder/board-equipment-desktop.png)

## Sicherungskasten im Popup verwalten

1. Den Sicherungskasten im Plan oder in der Objektliste auswählen und **Sicherungskasten öffnen** anklicken.
2. Im **Versorgungsschema** der Linie vom Eingang über FI und Sicherungen zum Stromkreis folgen. Klingeltrafos erscheinen unter ihrem Primärstromkreis. Die Anordnung zeigt die logische Schutzkette, keine maßstäbliche Hutschienenbelegung.
3. Eine Sicherung anklicken. Im zweiten Popup Kennzeichnung, Typ, Bemessungswerte und **Vorgeschaltetes Schutzgerät** ändern. So lässt sich beispielsweise ein LS einem FI zuordnen. Änderungen werden direkt übernommen.
4. Einen Stromkreis oder Klingeltrafo anklicken, um dessen Zuordnung und technische Daten zu bearbeiten. Stromkreise ohne Schutzgerät und Trafos ohne Stromkreis dieses Kastens werden getrennt gekennzeichnet.
5. Unter **Neue Sicherung** eine Vorlage auswählen und **Sicherung hinzufügen** anklicken. **Klingeltrafo hinzufügen** öffnet ebenfalls direkt die Komponenteneinstellungen. Über **Stromkreise verwalten** weitere Stromkreise anlegen.
6. Unter **Leitungen und Anschlüsse** eine Leitung anklicken. Name, Endpunkte, Typ, Querschnitt und weitere Leitungsdaten bearbeiten; **Anschlussbelegung bearbeiten** öffnet den Kontakteditor. **Leitung verbinden** legt eine Verbindung vom Kasten zu einem vorhandenen Endobjekt an. Aufgeführt werden direkte Leitungen am Kasten oder seinen Trafos und die Leitungen seiner Stromkreise. Räumliche Leitungswege mit Zwischenpunkten im Plan zeichnen.
7. Das zweite Popup mit dem Kreuz oder Escape schließen. Der Sicherungskasten bleibt geöffnet und zeigt den aktuellen Stand. Auf einer gesperrten Elektrikebene sind Änderungen deaktiviert.

**Versorgung und Zuordnung** öffnet die Einspeisung und die bisherigen Zuordnungsfelder. Die Schema-Linien zeigen gespeicherte Versorgungsbeziehungen; sie sind kein Nachweis einer physischen Aderverbindung. Unter den Leitungen wird die vorhandene Kontaktbelegung gesondert ausgewiesen.

Die **geplante Versorgung** folgt den belegten Leitungen. Stromkreis und einfache Schalter-/Steckdosenanschlüsse werden beim Speichern gemeinsam übernommen. Ein reiner Leitungsweg ohne Kontaktbelegung stellt noch keine Versorgung her.

## Unterverteilung

Im Hauptkasten einen Zuleitungsstromkreis erfassen. Am zweiten Kasten **Über Stromkreis einer Haupt- oder Unterverteilung** wählen und den Zuleitungsstromkreis zuordnen. Eigene und kreisbildende Zuordnungen werden nicht angeboten. Danach die eigenen Schutzgeräte und Abgänge des zweiten Kastens erfassen. Verbraucher bleiben dem jeweiligen Endstromkreis zugeordnet.

## Klingeltrafo mit mehreren Ausgängen

Einen Transformator beziehungsweise Klingeltrafo erfassen und seine primäre Versorgung dokumentieren. Die vorgesehenen Ausgangsspannungen **6, 9, 12 und 24 V** lassen sich als getrennte Ausgänge hinterlegen. Am angeschlossenen Verbraucher den passenden Trafoausgang auswählen und dessen Nennwerte prüfen.

Die Auswahl mehrerer Ausgänge beschreibt Anschlüsse des dokumentierten Geräts. Sie macht nicht aus jedem Ausgang einen unabhängigen Trafo mit jeweils voller Gesamtleistung. Leistung und vorhandene Herstellerangaben müssen zur tatsächlich erfassten Komponente passen. Die Simulation verwendet ein ideales Trafomodell; Verluste und reale Regelung werden nicht berechnet.

## Kabelwege und Anschlussbelegung

**Leitungsweg zeichnen** wählen, ein Startobjekt treffen, Zwischenpunkte setzen und am Ziel abschließen. Dabei öffnet sich automatisch **Anschlüsse verbinden** mit den passenden Kontaktvorschlägen. Am Sicherungskasten den Abgang auswählen, Belegung und gegebenenfalls Verbraucherzuordnung prüfen und speichern. Leitungsweg samt Zwischenpunkten und Anschluss werden gemeinsam angelegt; ein zweiter Anschlussvorgang ist nicht nötig. **Abbrechen** verwirft den noch ungespeicherten Leitungsweg. Das funktioniert auch mit dem Stromanschluss eines Netzwerkgeräts. Name, Kabeltyp, Aderanzahl, Querschnitt und Längenzuschlag in den Eigenschaften ergänzen. Kreuzende Linien sind nicht automatisch verbunden; für einen dokumentierten Abzweig eine Abzweigdose beziehungsweise Klemme verwenden.

Für verschiedene Geschosse **Anschlussdialog öffnen** verwenden und Start/Ziel über die Listen auswählen. Die Etagenangaben helfen bei gleichen Gerätenamen. Ohne konkrete Aderpaare wird ein Leitungsweg dokumentiert. Für die separate Leiterprüfung müssen passende Kontaktpaare angegeben sein.

Nach Auswahl der Endobjekte werden passende Kontakte automatisch vorgeschlagen: **N → N**, **PE → PE** sofern an beiden Enden vorhanden, und der eindeutige Außenleiter. N und PE erscheinen kompakt; zum Ändern oder Entfernen die jeweilige Zeile aufklappen. **Kontaktvorschläge übernehmen** ersetzt die aktuelle Bearbeitung erneut durch die Vorschläge.

Einphasige Stromkreise und eindeutig dokumentierte einphasige Anschlüsse einer Abzweigdose bieten nur den zugehörigen Außenleiter an. Bei unbekannter oder mehrdeutiger Versorgung weiterhin die Kontaktbelegung prüfen; eine ungeklärte Drehstrom-Phasenauswahl wird nicht geraten. Die globale Netzspannung bleibt davon unabhängig. Bereits gespeicherte Kontakte werden nicht stillschweigend entfernt. Die Auswahllisten verhindern neue N-/PE-/Außenleiter-Verwechslungen und doppelte Kontaktbelegung innerhalb derselben Leitung.

## Eine Leitung an eine bestimmte Sicherung anschließen

1. Im Kasten **Leitung verbinden** öffnen oder im Plan den Anschlussdialog starten. Start- und Zielobjekt wählen; der Sicherungskasten darf auf beiden Seiten stehen.
2. Am Kasten **Start · Sicherung / Stromkreis** beziehungsweise **Ziel · Sicherung / Stromkreis** wählen. Die Liste zeigt eingebaute Sicherungen mit Kennzeichnung, Typ und Amperewert sowie vorhandene Stromkreise. **Einspeisung des Kastens · IN** ist für die Zuleitung bestimmt.
3. Hat die gewählte Sicherung noch keinen Stromkreis, wird beim Speichern ein **Abgang** dafür angelegt. Abbrechen verändert das Projekt nicht. Bei vorhandenen Stromkreisen den passenden Eintrag wählen.
4. Die Kontaktliste zeigt nur die Leiter des gewählten Abgangs. Passende einfache Kontaktpaare werden vorgeschlagen; Zuordnung prüfen und gegebenenfalls ergänzen. Bei mehrdeutiger Phasenwahl die Außenleiter ausdrücklich festlegen. Für den Abgang muss mindestens ein Außenleiter verbunden sein. N und PE sind zugehörige Leiter, keine geschalteten Pole der Sicherung.
5. Der Stromkreis wird automatisch aus dem Abgang übernommen und über belegte Leitungen und Abzweigdosen weitergeführt. Ein zusätzliches Zuordnungshäkchen ist nicht nötig. Unterschiedliche Stromkreise dürfen nicht versehentlich zusammengeführt werden; der Dialog meldet solche Konflikte.
6. **Belegung speichern** übernimmt Leitung, Kontakte und gegebenenfalls den neuen Stromkreis zusammen. Im Kasten erscheint der Abgang unter seiner Sicherung. **Rückgängig** nimmt diesen Speicherschritt gemeinsam zurück.

Abzweigdosen führen den erkannten Stromkreis weiter. Nachgelagerte einfache Verbraucher erhalten ihre Versorgung aus den belegten Leitungen. Abgeleitete Anschlussfelder sind schreibgeschützt: zum Umhängen die Leitung bearbeiten. Beim Löschen einer Anschlussleitung wird auch deren abgeleitete Versorgung gelöst. Unabhängige, zuvor manuell dokumentierte Einspeisepunkte bleiben erhalten. Unterverteilungen und Schaltgruppen behalten ihre ausdrücklich konfigurierten Versorgungsbeziehungen.

![Im Anschlussdialog zuerst Sicherung und Stromkreis auswählen, anschließend die zugehörigen Leiter und das Endobjekt verbinden.](bilder/contact-dialog-desktop.png)

## Lichtschalter und Schaltgruppen

Leitung von der Versorgung zum Eingang **L** des Schalters zeichnen und anschließend **L′ → L** zur Lampe verbinden. Stromkreis und Schalterzuordnung werden beim Speichern übernommen. Lampen folgen ihrer Versorgung und dem Schalter; sie benötigen keinen eigenen Ein/Aus-Zustand. Das gilt auch für alte Lampen, bei denen früher „Aus“ gespeichert war. Für mehrere Schaltstellen eine Wechsel-/Kreuzschaltgruppe oder ein Stromstoßrelais verwenden; uneindeutige parallele Schalteranschlüsse werden gemeldet.

Fehlt bei einer neu angelegten oder bearbeiteten Lampe die Leistung, werden **5 W** als editierbarer LED-Startwert eingetragen. Eine fehlende Verbraucherspannung wird bei bekanntem Anschluss aus der Versorgung übernommen, zum Beispiel **230 V**, bei Drehstrom aus der Außenleiterspannung und bei zugeordnetem Trafo aus dessen ausgewähltem Ausgang. Bereits eingetragene Werte werden nicht überschrieben. Bei älteren Projekten verwendet die Simulation die Leitungen auch dann, wenn frühere manuelle Schalterzuordnungen abweichen. Fehlende Aderpaare müssen weiterhin ergänzt werden; unbekannte Anschlusswege werden nicht geraten.

Eine Reihenschaltung mehrerer Schalter bedeutet: Alle Kontakte müssen geschlossen sein. Sie ist keine Wechselschaltung. Beim Stromstoßrelais wechselt ein Tastimpuls den Szenariozustand; bei fehlender Versorgung entsteht im Modell kein wirksamer Impuls.

# Simulation verstehen {#simulation}

**Ampere automatisch:** Sind Leistung und Spannung vorhanden, wird der Verbraucherstrom vorbelegt. Einphasig gilt `I = P / (U × cos φ)`, bei symmetrischem Drehstrom `I = P / (√3 × U × cos φ)` mit der Außenleiterspannung. Ohne Leistungsfaktor verwendet die Vorbelegung ausdrücklich eine Schätzung mit `cos φ = 1`: Eine 5-W-Lampe an 230 V erhält beispielsweise **0,021739 A** (rund 0,022 A). Automatische Werte folgen Änderungen an Leistung, Spannung, Phasen und Leistungsfaktor. Eine manuelle Ampere-Eingabe bleibt erhalten; das Leeren des Feldes aktiviert die Vorbelegung wieder. Fehlende oder ungeeignete Ausgangswerte bleiben unberechnet. In der Simulation bleibt die Annahme abschaltbar; der vorgeschlagene Strom wird nicht als unabhängiger Messwert behandelt.

Home-Technik besitzt zwei unterschiedliche Betrachtungen. Prüfe vor einer Fehlersuche, welche Ansicht du verwendest.

| Betrachtung          | Grundlage                                                                      | Typischer Zweck                                                            |
| -------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Stromkreissimulation | Ausdrückliche Zuordnung von Einspeisung, Verteiler, Stromkreis und Verbraucher | Dokumentierte Lasten und Schaltzustände betrachten                         |
| Leiterprüfung        | Dokumentierte Kontakt- und Aderpaare                                           | Anschlusswege, Schalterverdrahtung und unterstützte Fehlerszenarien prüfen |

## Stromkreissimulation Schritt für Schritt

1. Verbraucher mit Anschluss, Spannung und bekannten Lastdaten erfassen.
2. **Elektrik → Stromkreis simulieren** öffnen und den Stromkreis wählen.
3. Verbraucher, Schalter und Versorgung im Szenario ein- beziehungsweise ausschalten.
4. Angezeigte Leistung, Phasenströme, fehlende Angaben und Auslastungen lesen.
5. **Ergebnis im Plan ansehen** verwenden. Lampen und Verbraucher zeigen ihren berechneten Zustand.
6. Das Szenario beenden oder unter **Hausakte → Szenarien** benennen und speichern.

![Die Simulation stellt Lasten und Schaltzustände der dokumentierten Versorgung dar.](bilder/simulation-desktop.png)

Eine Szenarioänderung überschreibt nicht die Bestandsdaten. Eine Projektänderung oder ein Neuladen beendet die laufende Simulation. Ein fehlender Leistungsfaktor kann als ausdrücklich gekennzeichnete Schätzung behandelt werden. Jahresverbrauch in kWh ist keine momentane Leistung in Watt.

{{include:docs/conductor-simulation.md}}

# Wasser, Wärme und Gas {#rohrnetze}

![Rohrkomponenten und getrennte Leitungsmedien erscheinen im Technikplan.](bilder/utilities-desktop.png)

{{include:docs/utilities.md}}

# Internet, Router, Netzwerk und WLAN {#netzwerk}

Router und Netzwerkgeräte gehören in den Bereich **Netzwerk**. Ein Router ist damit kein Möbelersatz und muss nicht über die Elektrikebene angelegt werden.

## Zigbee2MQTT auf dem Grundriss anzeigen

### Schwebende Übersicht für Router, Batterien und Erreichbarkeit

Mit **Netzwerk → Zigbee-Übersicht** öffnest du ein schwebendes Fenster. Der Plan bleibt bedienbar und das Fenster bleibt beim Tabwechsel geöffnet. Am Titel ziehen, um es mit Maus oder Finger zu verschieben; mit fokussiertem Titel funktionieren auch die Pfeiltasten. Über **−** einklappen, **+** aufklappen oder **×** schließen. Schließen beendet den laufenden Empfang nicht. Ein Projektwechsel schließt die Übersicht.

Die Gruppen zeigen **Router**, **Batterie niedrig**, **Nicht erreichbar (Z2M)** und **Erreichbarkeit unbekannt**. Als niedriger Batteriestand gilt standardmäßig **höchstens 20 %**; die Grenze lässt sich auf 10 oder 30 % ändern. Eine ausdrücklich gemeldete Batteriewarnung gilt unabhängig von diesem Grenzwert. Fehlende Batteriewerte gelten nicht als leer. Die Suche filtert Gerätenamen, Plannamen und IEEE-Adressen; die Gruppenzähler beziehen sich weiter auf alle Geräte. Platzierte Geräte zeigen Etage und gegebenenfalls Raum. Ein Klick auf den **Gerätenamen oder den gesamten Geräteeintrag** wechselt automatisch zur passenden Etage, blendet bei Bedarf die Netzwerkebene ein, zentriert und markiert das Gerät. Per Tastatur den Eintrag fokussieren und Enter oder Leertaste drücken. Nicht platzierte Geräte bleiben ebenfalls in der Übersicht sichtbar.

**Offline seit wann?** Offline wird nur anhand einer Z2M-Availability-Meldung ausgewiesen. Eine Sendepause oder ein fehlender Link im Netzwerkscan ist kein Ausfallnachweis. Angezeigt wird, seit wann die App das Gerät **in der aktuellen Empfangssitzung als offline beobachtet**. Wiederholte Offline-Meldungen setzen diese Zeit nicht zurück; bei einer Online-Meldung verschwindet der Eintrag aus der Offline-Gruppe. Eine beim Start empfangene gespeicherte Offline-Meldung enthält keinen Ausfallbeginn – dieser bleibt ausdrücklich unbekannt. Auch bei einer neuen Meldung kann Z2M einen Ausfall verzögert erkennen.

**Letzte Zigbee-Nachricht (Z2M)** stammt ausschließlich aus `last_seen`, nicht aus der MQTT-Empfangszeit der App. Dafür in Zigbee2MQTT `last_seen` aktivieren (ISO-Zeit oder Epoch-Millisekunden); für den Online-/Offline-Status außerdem **Availability** aktivieren. Nicht gemeldete Angaben bleiben unbekannt. Die Übersicht verwendet denselben 5-/10-Sekunden-Empfang wie die Geräteliste und löst keine zusätzlichen Netzwerkscans aus. Nach Stoppen oder Verbindungsabbruch steht sichtbar **letzter bekannter Stand**. Ein neuer Live-Start beginnt eine neue Beobachtung; die App speichert keine Ausfallhistorie.

![Schwebende Zigbee-Übersicht mit Router, niedriger Batterie und eindeutig gekennzeichneter Offline-Beobachtung.](bilder/zigbee-overview.png)

Grundlagen: [Z2M-Geräteverfügbarkeit](https://www.zigbee2mqtt.io/guide/configuration/device-availability.html), [Z2M-Einstellungen für last_seen](https://www.zigbee2mqtt.io/guide/configuration/all-settings.html).

### Empfang und Netzwerkkarte

**Voraussetzung:** Zigbee2MQTT und Home Assistant verwenden denselben MQTT-Broker. Unter **Hausakte → Home Assistant** die erreichbare Basisadresse und einen Token mit **Administratorrechten** hinterlegen. Die MQTT-WebSocket-Schnittstelle verlangt diese Rechte. Eine separate Z2M-Webadresse ist nicht nötig. Eine über HTTPS geöffnete Hausplanung benötigt auch eine HTTPS-Adresse für Home Assistant.

1. **Netzwerk → Zigbee2MQTT · Geräte & Karte** öffnen. Falls dein MQTT-Basistopic anders heißt, `zigbee2mqtt` ändern.
2. **Anzeige aktualisieren** auf 5 oder 10 Sekunden stellen und **Geräte auslesen & Live starten** wählen. Die App empfängt veröffentlichte Geräte und Zustände; sie erzwingt keine Messung an schlafenden Sensoren.
3. Bei einem Gerät **Platzieren** wählen und dessen Standort im aktuellen Geschoss anklicken. Für weitere Geräte den Dialog erneut öffnen. Platzierte Geräte lassen sich auswählen und verschieben. Die IEEE-Adresse erhält die Zuordnung auch bei einer Z2M-Umbenennung; der eigene Planname bleibt erhalten.
4. **Topologie jetzt scannen** liefert Verbindungslinien und Routenziele. Ein Scan kann 10 Sekunden bis 2 Minuten dauern und Zigbee vorübergehend verlangsamen. Die App startet deshalb keinen automatischen Dauerscan. Bei ausbleibender Antwort wird nach drei Minuten der Empfang mit einer Meldung beendet.
5. Beide Endgeräte platzieren, damit ihre Linie erscheint. LQI reicht von 0 bis 255; höher ist besser. Rot unter 80, Orange unter 150 und Grün ab 150 sind **Orientierungsfarben**, keine universellen Grenzwerte. Pfeile zeigen die gemeldete Richtung; kräftige Linien kennzeichnen Routeneinträge. Bei Geräteauswahl werden nur dessen Verbindungen angezeigt. Für andere Etagen erscheinen Geräte- und Geschossnamen.
6. Die Eigenschaften zeigen Gerätetyp, Modell, Geräte-LQI, Batterie, Verfügbarkeit und Linkdetails mit Tiefe, Beziehungscode und Routenzielen. Geräte-LQI aus Zustandsnachrichten und gerichtete Link-LQI aus dem letzten Scan sind unterschiedliche Messwerte.
7. **Zigbee-Aktualisierung stoppen** im Menüband beendet Empfang und Anzeigetimer. Das Schließen des Dialogs allein lässt die Aktualisierung weiterlaufen. Projektwechsel und Neuladen stoppen ebenfalls. Ein bereits an Z2M gesendeter Scan wird dadurch nicht auf dem Coordinator abgebrochen.

**Batterien:** Geräteliste, Grundriss und Eigenschaften zeigen den von Z2M gemeldeten Prozentwert (`battery`) und eine gemeldete Batteriewarnung (`battery_low`). **0 %** bedeutet leer, **unbekannt** bedeutet keine Prozentangabe. Die Eigenschaften zeigen die Empfangszeit der letzten Batterienachricht. Andere Zustandsnachrichten aktualisieren diese Zeit nicht. Gespeicherte MQTT-Nachrichten werden gekennzeichnet; die Empfangszeit ist keine Messzeit. Schlafende Sensoren melden oft nur selten neue Werte, unabhängig vom Anzeigeintervall.

**Raum benennen und zuordnen:** Einen Raum unter **Haus / Raum** zeichnen. Danach das platzierte Zigbee-Gerät auswählen und in seinen Eigenschaften **Raumzuordnung** wählen. Angeboten werden die Räume derselben Etage. **Raumname** ändert den Namen dieses Raums für alle zugeordneten Geräte; das Feld gibt es auch direkt in den Raumeigenschaften. Verschieben ändert eine ausdrückliche Raumzuordnung nicht. Nach Löschen eines Raums oder einem Etagenwechsel gegebenenfalls neu zuordnen.

**Raum nach Home Assistant übertragen:** Bei einem zugeordneten Gerät **Raum an Home Assistant übertragen …** öffnen und **Vorschau aus Home Assistant laden** drücken. Das liest zunächst ausschließlich die HA-Geräte und Bereiche. Das Gerät muss durch aktivierte MQTT-Discovery in HA vorhanden sein; die App prüft seine eindeutige IEEE-Kennung. In der Vorschau den bisherigen Bereich kontrollieren und einen vorhandenen **HA-Zielbereich** wählen oder mit dem App-Raumnamen einen neuen anlegen. Erst **Jetzt übertragen** schreibt die Gerätezuordnung. Administratorrechte sind erforderlich. Falls zwischen Vorschau und Übertragung eine Zuordnung geändert wurde, die Vorschau erneut laden. Wurde ein Bereich angelegt, die Gerätezuordnung aber nicht bestätigt, diesen vorhandenen Bereich beim nächsten Versuch auswählen.

Lokales Umbenennen löst keine automatische Übertragung aus. Bestehende HA-Bereiche werden nicht umbenannt; sie können weitere Geräte enthalten. Nach einer lokalen Umbenennung bewusst einen bestehenden Bereich auswählen oder einen neuen erstellen. Eigene Bereichszuordnungen einzelner HA-Entitäten haben Vorrang vor dem Gerätebereich. Die App überträgt keine Grundrissgeometrie, Positionen oder Etagen nach HA. Das Schließen des Übertragungsdialogs beendet die Verbindung, kann eine bereits an HA gesendete Änderung aber nicht zurücknehmen.

**Speicherung:** Geräteliste, Basistopic, Platzierungen, Raumzuordnungen und letzter Kartenstand werden im Projekt gesichert. Laufende Zustandswerte bleiben nur in der Sitzung; es entsteht keine Messwerthistorie. Der Home-Assistant-Token bleibt in den lokalen Verbindungseinstellungen und wird nicht in die Hausdatei exportiert. Löschen eines Planobjekts entfernt nur seine Platzierung, kein Gerät aus Zigbee2MQTT. Dieselbe IEEE-Adresse kann nicht doppelt platziert werden.

**Lücken richtig beurteilen:** Fehlende Linien können an nicht platzierten Nachbarn, schlafenden Geräten, fehlenden Scanantworten oder einem alten Kartenstand liegen. Die Ansicht berechnet keine Funkabdeckung und beweist kein Funkloch. Unvollständige Scans zeigen die gemeldeten Gerätefehler. Verfügbarkeit bleibt unbekannt, wenn Z2M keine Availability-Nachrichten veröffentlicht. Empfangszeiten geben an, wann die App eine Nachricht erhielt; zwischengespeicherte Nachrichten müssen keine neue Gerätemessung sein.

![Zigbee-Geräte mit LQI-Verbindung, Batteriestand und Raumzuordnung mit HA-Übertragung.](bilder/zigbee-desktop.png)

Grundlagen: [Zigbee2MQTT-Netzwerkkarte und Scanverhalten](https://www.zigbee2mqtt.io/guide/usage/mqtt_topics_and_messages.html#zigbee2mqtt-bridge-request-networkmap), [Home-Assistant-WebSocket-API](https://developers.home-assistant.io/docs/api/websocket/).

## Ethernet-Geräte erfassen

1. **Netzwerk** öffnen und einen Router platzieren.
2. Switch, Patchpanel, Netzwerkdosen und Access Points entsprechend deinem Bestand ergänzen.
3. Jedes Gerät eindeutig benennen, etwa „SW-OG – Abstellraum“. Geschoss, Position und Portzahl prüfen.
4. In der Verbindungsverwaltung jeweils ein Gerät mit Port und das Zielgerät mit Port auswählen.
5. Verbindung speichern und prüfen. Ein Port kann nicht gleichzeitig mehrfach belegt werden; bei einem fehlenden Port die dokumentierte Anschlusszahl kontrollieren.
6. Unter **Hausakte → Internet & WLAN** Anschlussdaten, SSID, Frequenzbänder, IP-/MAC-Adresse und Empfangsnotizen ergänzen.

## Netzwerkkabel im Plan verlegen – auch über Geschosse

1. **Netzwerk → Netzwerkkabel verlegen** wählen und das Startgerät anklicken.
2. Die gewünschten Zwischenpunkte im Plan setzen. Für einen Etagenwechsel zuerst einen Wegpunkt am Steigschacht setzen und dann im Menüband das andere Geschoss wählen. Der letzte Punkt wird dort an derselben Planposition als Steigweg fortgesetzt. Weitere Zwischenpunkte setzen; auch mehrere Geschosswechsel sind möglich.
3. Das Zielgerät anklicken. Jetzt öffnet sich **Netzwerkkabel anschließen** mit Start- und Zielgeschoss. Freie Ports sind vorgeschlagen; aktive PoE-Ports beziehungsweise der PoE-Eingangsport werden bevorzugt. Belegte Ports stehen nicht erneut zur Auswahl.
4. Ports, Kabelkennzeichnung, Kabeltyp und optionalen **Längenzuschlag (m)** prüfen. **Kabel und Anschlüsse speichern** legt genau eine gemeinsame Verbindung an. PoE bezieht sich automatisch auf diese Leitung.

**Letzten Kabelpunkt entfernen** beziehungsweise Backspace nimmt auch den letzten Geschossübergang zurück. **Leitungsweg abbrechen**, Escape oder Abbrechen im Anschlussdialog hinterlässt kein halbfertiges Kabel. Die Kabellänge folgt allen Wegabschnitten und addiert die Höhenunterschiede zwischen den beteiligten Etagen sowie den Zuschlag. Steigwegmarkierungen nennen auf beiden Etagen das jeweils andere Geschoss; der Verlauf bleibt beim Speichern, JSON-Export und PDF-Planexport erhalten.

Anschlussdaten bestehender Kabel unter **Ports, Kabel & WLAN → Kabel bearbeiten** ändern. Auf derselben Etage kann **Leitungsweg zeichnen** den Verlauf neu festlegen. Ein geschossübergreifender Verlauf wird bei Bedarf durch Lösen der alten Verbindung und erneutes Zeichnen ersetzt. TV-/SAT-Koaxleitungen verwenden weiterhin ihre eigene Anschlussverwaltung.

![Anschlussdialog nach dem Zeichnen eines Netzwerkkabels vom Erdgeschoss ins Obergeschoss mit freien Ports und berechneter Gesamtlänge.](bilder/network-route-dialog.png)

## PoE-Switch und Reolink Doorbell

1. Unter **Netzwerk → Netzwerkgerät platzieren** einen **Switch mit PoE** und eine **Reolink Video Doorbell PoE** auswählen und platzieren. Für andere Kameras oder Geräte gibt es **PoE-Verbraucher**. Vorhandene Access Points oder Switches lassen sich über **PoE-Funktion** umstellen.
2. Am Switch das **PoE-Gesamtbudget (W)** aus seinem Datenblatt eintragen. Anfangs steht es auf 0 (unbekannt); der Switch bestätigt dann noch keine Versorgung. Unter **PoE-Ports aktivieren** einzelne Ports ausschalten und den unterstützten **PoE-Standard** wählen.
3. Unter **Ports, Kabel & WLAN → Ports verbinden** Switch und Verbraucher mit ihren Ports verbinden. Dieselbe Ethernetleitung überträgt Daten und ordnet die PoE-Quelle zu. Eine zusätzliche elektrische Leitung oder zweite Versorgungszuordnung entfällt.
4. Am Verbraucher Quelle, Port und Prüfergebnis ansehen. Bei Bedarf Eingangsport, Leistung und Nennspannung ändern. Der Planungsstrom wird unmittelbar als Leistung / Spannung berechnet.

Die Vorlage gilt für die **Reolink Video Doorbell PoE**, nicht für WLAN- oder Akkuvarianten. Sie verwendet aktives **IEEE 802.3af, 48 V** und **12 W als konservativen Planungswert**, somit **0,25 A**. Der Hersteller nennt weniger als 12 W, keinen konstanten Durchschnittswert: [Reolink Doorbell PoE](https://reolink.com/us/product/reolink-video-doorbell-poe/) und [Leistungsangaben](https://support.reolink.com/articles/900000593323-What-is-the-Power-Consumption-of-Reolink-PoE-Cameras/).

Für das Switch-Budget reserviert die Planung konservativ **15,4 W je PoE-Gerät** beziehungsweise **30 W je PoE+-Gerät**, einschließlich Reserve für Leitungsverluste. Die zulässige Verbraucherleistung beträgt 12,95 beziehungsweise 25,5 W. Deshalb sind beispielsweise zwei Doorbells bei 30 W Gesamtbudget noch nicht als gemeinsam versorgt bestätigt. Abgeschaltete Ports, fehlende Leistungsangaben, ungeeignete Standards und Budgetüberschreitungen werden angezeigt.

**Grenzen:** Die Prüfung gilt für direkte Ethernet-Verbindungen vom PoE-Switch zum Verbraucher. Eine interne Durchleitung über Patchpanel oder Netzwerkdosen ist noch nicht modelliert. Passive 24-V-Einspeisung und PoE++ sind nicht unterstützt. Das Ergebnis ist eine Planungsprüfung, keine Aussage über einen tatsächlich eingeschalteten Switch. PoE-Lasten werden nicht automatisch in die 230-V-Lastsimulation übernommen; deren Eingangsleistung einschließlich Eigenverbrauch und Netzteilverlusten am Switch gesondert dokumentieren. Ein vorhandener separater Stromanschluss muss vor einem Wechsel zum PoE-Verbraucher entfernt werden.

![Reolink-Doorbell mit PoE-Leistung, Nennspannung, berechnetem Strom und automatisch zugeordnetem Switch-Port.](bilder/poe-desktop.png)

## Netzanschluss für Router und Switch

1. Router, Switch oder anderes Netzwerkgerät auswählen und **Mit Steckdose verbinden** anklicken. Alternativ mit dem elektrischen Anschlusswerkzeug das Netzwerkgerät im Plan treffen oder im Anschlussdialog unter **Netzwerkgeräte · Stromanschluss einrichten** auswählen. Dabei wird einmalig sein Stromanschluss eingerichtet; ein Abbruch der anschließenden Leitungsbearbeitung lässt diesen noch unverbundenen Anschluss bestehen.
2. Im Anschlussdialog die Steckdose als anderes Endobjekt auswählen. L und N werden vorgeschlagen. Beim Speichern übernimmt die App die Steckdosen- und Simulationszuordnung automatisch; ein separates Häkchen entfällt.
3. **Verbinden und zuordnen** speichern. Am Netzwerkgerät wird die zugeordnete Steckdose angezeigt.
4. Unter **Stromanschluss konfigurieren** Typenschildwerte, Leistung und bei Bedarf **PE-Anschluss vorhanden** einstellen. Neue Netzwerk-Stromanschlüsse starten als einphasiges L/N-Modell ohne PE; die Einstellung an das dokumentierte Gerät beziehungsweise Netzteil anpassen. Ein reiner Datenport oder PoE wird dadurch nicht zu einem Netzspannungsanschluss.
5. Nach Änderung des PE-Anschlusses **Mit Steckdose verbinden** erneut öffnen und **Kontaktvorschläge übernehmen** wählen. PE wird nur vorgeschlagen, wenn beide Enden ihn anbieten. Vorhandene belegte Kontakte müssen vor dem Entfernen ihrer Geräteanschlüsse ausdrücklich gelöst werden.

Ein bestehender Steckdosenanschluss wird zur Bearbeitung wieder geöffnet. Der Stromanschluss folgt dem Namen, der Position und dem Geschoss des Netzwerkgeräts; beim Löschen des Geräts werden sein Stromanschluss und dessen Leitungen ebenfalls entfernt. Die Angaben werden mit dem Projekt gespeichert und exportiert. Lastberechnungen benötigen weiterhin passende Leistungsangaben.

![Ein Netzwerkgerät mit konfiguriertem PE-Anschluss wird an die Steckdose angeschlossen. L, N und PE werden automatisch vorgeschlagen.](bilder/network-editor-desktop.png)

Die Verbindung beschreibt die dokumentierte Verkabelung. Die App sucht keine Geräte im Heimnetz, prüft keine tatsächliche Erreichbarkeit und berechnet keine WLAN-Abdeckung oder PoE-Versorgung. Ein per WLAN angebundener Client muss nicht zusätzlich eine erfundene Kabelverbindung erhalten. Entsprechende Prüfhinweise anhand deiner realen Dokumentation bewerten.

**Gartenbeispiel:** Hausrouter, Netzwerkdose am Ausgang und Access Point im Gartenhaus erfassen. Den unterirdischen Verlauf zusätzlich mit Bezugspunkten, Abständen und Fotos dokumentieren. Eine Funknotiz kann festhalten, wo du Empfang gemessen hast; sie ist keine automatische Funkkarte.

# Fernsehen, SAT und Koax {#tv}

![SAT-Schüssel, Multischalter und Antennendose lassen sich mit Koaxwegen dokumentieren.](bilder/tv-desktop.png)

{{include:docs/tv-sat.md}}

# Grundstück, Garten und unterirdische Leitungen {#grundstueck}

## Grenzen, Wege und Flächen zeichnen

1. Ein geeignetes Geschoss wählen. Für einen großen Garten kann ein eigenes Geschoss „Außenbereich“ die Übersicht erleichtern.
2. **Grundstück** öffnen und Grundstücksgrenze, Weg, Terrasse, Beet oder Referenzpunkt auswählen.
3. Punkte umlaufend setzen. Grenzen und Flächen benötigen mindestens drei Punkte, ein Weg zwei und ein Referenzpunkt einen.
4. Bei Wegen die tatsächliche Breite eingeben. Die Umrisslinie allein beschreibt sonst nicht die begehbare Breite.
5. Objekt benennen und Punkte beziehungsweise Koordinaten nachmessen und korrigieren.

![Grundstücksgrenze, Wege und Referenzpunkte dienen zur Orientierung im Außenbereich.](bilder/site-desktop.png)

Referenzpunkte sollten wieder auffindbar sein: Gebäudeecke, feste Mauerkante oder eindeutig bezeichneter Grenzpunkt. „Neben dem Strauch“ ist bei einer späteren Suche weniger hilfreich als ein gemessener Abstand zu einer festen Ecke.

## Strom, Wasser und Internet im Garten

Die Grundstücksebene beschreibt Flächen und Bezugspunkte. Leitungen legst du in ihrem jeweiligen Technikbereich an: **Elektrik**, **Wasser / Wärme / Gas** oder **Netzwerk**. So bleiben Typ und Zuordnung erhalten und können getrennt angezeigt werden.

1. Ausgang und Ziel dokumentieren, beispielsweise Hausanschluss und Außenwasserstelle.
2. Leitungsweg anhand bekannter Punkte zeichnen. Abzweige ausdrücklich als Komponenten erfassen.
3. Verlegetiefe, Rohr-/Kabeltyp und unbekannte Abschnitte beschreiben. Bei Rohranschlüssen können negative Anschlusshöhen verwendet werden. Für andere Netze keine automatische Tiefenberechnung voraussetzen; die Tiefe zusätzlich in Notizen und Messwerten festhalten.
4. Ein Außenobjekt auswählen und **Leitungsfotos dieser Außenfläche** öffnen. Fotos vor dem Verfüllen hinzufügen und benannte Bezugspunkte setzen.
5. Mit **Baustelle** gemessene Abstände mit Einheit und Bezug ergänzen, beispielsweise „60 cm unter Oberkante Terrassenplatte, 85 cm ab Hausecke Nordost“.
6. Nach Abschluss eine benannte Sicherung und einen JSON-Export erstellen.

Die Zeichnung und GPS-Aufnahme allein liefern keine verlässliche Zentimetergenauigkeit für verborgene Leitungen. Halte fest, was gemessen wurde und was nur geschätzt ist.

# Grundstück mit iPhone-GPS aufnehmen {#gps}

![Der GPS-Dialog zeigt Referenz, Standortprüfung und die punktweise Aufnahme.](bilder/gps-iphone.png)

{{include:docs/gps-grundstueck.md}}

# Wandansicht und Montagehöhen {#wandansicht}

In der Wandansicht siehst du die Wand von vorne. Das hilft beispielsweise bei Steckdosenhöhen, dem Abstand eines Geräts vom Wandanfang und der Orientierung an Fenstern oder Türen.

1. **Haus / Raum → Auswahl** aktivieren und die Wand auswählen.
2. Rechts **Wandansicht öffnen** wählen.
3. Die gewünschte Wandseite wählen. **A** bezeichnet den Wandanfang, **B** das Wandende. Die andere Seite spiegelt die Ansicht.
4. Unter **Objekt in Wandansicht** ein bereits auf diesem Geschoss vorhandenes Möbel oder Elektroobjekt auswählen. Neue Geräte zuerst im Grundriss platzieren.
5. **Montageabstand ab A (mm)** und **Montagehöhe ab Boden (mm)** eingeben und **Montagepunkt speichern** wählen. Alternativ einen Montagepunkt in der Wandansicht antippen.
6. Zurück im Grundriss die übernommene Lage prüfen. Die Höhe bleibt als Wandbefestigung am Objekt gespeichert.

![Montageabstand und Höhe werden in der Wandansicht exakt eingegeben.](bilder/wall-elevation.png)

**Beispiel:** Eine Steckdose soll 1234 mm vom Wandanfang und 650 mm über Boden dokumentiert werden. Diese beiden Werte eintragen; eine perspektivische Schätzung im Foto ist dafür nicht notwendig.

Die Symbole zeigen Bezugspunkte, nicht den vollständigen Geräteumriss. Öffnungen werden maßstäblich dargestellt. Montagepunkte außerhalb der Wandgrenzen werden abgewiesen. Eine gesperrte Wand- oder Objektebene verhindert die Änderung. Beim späteren Verschieben oder Ändern der Wand werden die vorhandenen Wandbefestigungen berücksichtigt.

# Leitungsfotos, Kalibrierung und Bezugspunkte {#fotos}

![Auf dem Foto lassen sich Verläufe und eine bekannte Referenzstrecke einzeichnen.](bilder/wall-photo-desktop.png)

{{include:docs/wall-photos.md}}

## Benannten Bezugspunkt ergänzen

**Bezugspunkt setzen** wählen, eine feste Stelle im Foto antippen und einen Namen sowie eine Beschreibung eingeben. Mit **Bezugspunkt speichern** bestätigen. Geeignet sind eindeutig erkennbare Ecken oder Kanten. Ein einzelner benannter Bezugspunkt ersetzt die Kalibrierung über eine bekannte Strecke nicht.

Bei einem kalibrierten Foto zeigt die Liste den ungefähren Abstand eines Bezugspunkts zum Anfang des ausgewählten Leitungsverlaufs. Das ist nicht automatisch der kürzeste Abstand zur gesamten Leitung. Bezugspunkte werden im SVG mit ausgegeben und bleiben im Projekt bearbeitbar.

Auch Grundstücksobjekte besitzen Leitungsfotos: Außenobjekt auswählen und **Leitungsfotos dieser Außenfläche** öffnen. So lassen sich Gartenleitungen gemeinsam mit einer fest bezeichneten Hausecke oder Terrassenkante festhalten.

# Verbraucherdatenbank und gemeinsame Gerätevorlagen {#geraetebibliothek}

![Die Verbraucherdatenbank erfasst Abmessungen und technische Gerätedaten.](bilder/consumer-library.png)

{{include:docs/consumer-library.md}}

## Eine Vorlage in mehreren Projekten verwenden

1. Im aktuellen Projekt ein Gerät in der Verbraucherdatenbank speichern.
2. **Projektübergreifende Gerätebibliothek** aufklappen.
3. Beim passenden Gerät **Übergreifend merken** wählen.
4. Ein anderes Projekt öffnen und dort wieder die Verbraucherdatenbank aufrufen.
5. Bei der gespeicherten Vorlage **Ins Projekt übernehmen** wählen. Anschließend aus der Projektbibliothek platzieren.

Maße, Hersteller, Modell und technische Werte bleiben erhalten. Die individuelle Seriennummer wird absichtlich entfernt. Die übergreifende Bibliothek liegt in diesem Browser. Auf einem anderen Gerät kannst du eine Bibliotheksdatei importieren oder ein gemeinsames Projekt mit den benötigten Vorlagen öffnen und diese dort erneut merken.

# Zähler anlegen, verknüpfen und ablesen {#zaehler}

## Vom Plan zur Hausakte

Platziere einen Strom-, Wasser- oder Gaszähler im entsprechenden Technikbereich. Der Planzähler wird in der Hausakte automatisch geführt. Du musst denselben Zähler nicht ein zweites Mal manuell anlegen. Zählernummer und Zuordnung bleiben zwischen Plan und verknüpfter Akte verbunden.

1. Zähler im Plan auswählen und eine eindeutige Bezeichnung sowie die Zählernummer eintragen.
2. Über den Verweis zur zugehörigen Zählerakte wechseln beziehungsweise **Hausakte → Zähler & Verbrauch** öffnen.
3. Art und Einheit kontrollieren. Strom wird typischerweise als Energie in kWh dokumentiert; Wasser- oder Gasvolumen ist ein anderer Messkanal.
4. Datum und tatsächlich abgelesenen kumulierten Stand eintragen und speichern.
5. Nach einer weiteren Ablesung die berechenbaren Intervalle ansehen.

![Die Hausakte führt Zähler nach Art, Standort und zugehörigen Ablesungen.](bilder/plan-meters.png)

## Vorhandene Einträge nachträglich verbinden

Wenn du früher Plan und Hausakte getrennt angelegt hast, öffne den bestehenden Zählereintrag zum Bearbeiten. Wähle den passenden Planzähler derselben Art. Prüfe Nummer, Namen und Standort vor dem Speichern. So bleiben vorhandene Ablesungen beim richtigen Datensatz. Lege nicht vorsorglich einen dritten Zähler an.

Ein undatierter Zahlenwert im Plan wird nicht als heutige Ablesung erfunden. Datierte Ablesungen gehören in die Zählerakte. Bei einer leeren Nummer nach älterem Import zuerst die bestehende Verknüpfung und die Nummer in der Akte prüfen.

## Verbrauch und Korrekturen

Der Verbrauch ist die Differenz zweier gültiger kumulierter Ablesungen. Die App nennt die tatsächlich erfassten Tage und das Tagesmittel. Ein Rechenpreis liefert eine Schätzung ohne Grundgebühr; er ist kein vollständiger historischer Tarifvertrag. Zeitraumfilter wählen vollständige Ableseintervalle, keine künstlich interpolierten Monatsgrenzen.

Über **Korrigieren** einen falschen Wert berichtigen. Pro Datum ist eine Ablesung möglich. Bei einem Zählerwechsel **Zählerwechsel / Neustart seit letzter Ablesung** markieren. Das Wechselintervall bleibt unbekannt; erst ein weiteres gültiges Intervall kann wieder berechnet werden. Die Einheit ist nach der ersten Ablesung gesperrt. Für einen anderen Messkanal einen neuen Zähler anlegen.

Ablesungen und Verbrauchsintervalle können getrennt als CSV ausgegeben werden. Unterschiedliche Medien werden nicht zu einer vermeintlichen Gesamtsumme addiert. Gasvolumen wird nicht ohne weitere Angaben in Energie umgerechnet.

# Solar, Balkonkraftwerk und Batteriespeicher {#solar}

![Module, Wechselrichter und Speicher können als eigene Planobjekte platziert werden.](bilder/solar-plan.png)

{{include:docs/solar-plan.md}}

## Solarakte sorgfältig ausfüllen

Unter **Hausakte → Balkonkraftwerk** Standort, Inbetriebnahme, Ausrichtung, Neigung und Unterlagen erfassen. In Modulgruppen Anzahl und **Wp je Modul** dokumentieren. Unterschiedliche Modelle oder individuell erfasste Seriennummern können getrennte Gruppen benötigen.

Am Wechselrichter die AC-Nennleistung in **W**, am Speicher die Kapazität in **Wh** eintragen. Diese Größen haben verschiedene Bedeutungen. Für Ertragsdaten einen Solarertragszähler mit **kWh** verwenden. **Speichern und Ertragszähler öffnen** verwendet den zugeordneten Zähler weiter oder legt einen neuen leeren Ertragszähler an.

Eine Anschlusssteckdose kann dokumentiert werden. Diese Verknüpfung ist keine Rückspeisung in die Stromkreissimulation. Die App berechnet weder automatisch Sonnenertrag noch Ladezyklen, Eigenverbrauch oder Wirtschaftlichkeit.

# Hausakte, Geräteakten und geführte Einrichtung {#hausakte}

Die Hausakte ergänzt den Plan um Informationen, die nicht in ein Symbol passen: Hersteller, Seriennummern, Wartungen, Fotos, Zählerstände und persönliche Hinweise. Ein Planobjekt besitzt seine **Objektakte**; darüber hinaus gibt es persönliche Hausobjekte wie Rauchmelder oder Außenwasserstellen.

![Die Hausakte bündelt die Übersicht und die Fachbereiche des Hauses.](bilder/housebook-overview.png)

## Objektakte pflegen

Objekt auswählen und **Objektakte und Umbauzustand** öffnen. Bekannte Hersteller-, Modell- und Serienangaben ergänzen. Unterlagen über einen passenden Link referenzieren und Wartungs- oder Bedienhinweise so formulieren, dass du sie später ohne zusätzlichen Kontext verstehst.

Umbauzustände kennzeichnen Bestand, Planung, Rückbau oder Fertigstellung. Sie dokumentieren deinen Planungsstand; eine Markierung „Fertiggestellt“ prüft keine reale Ausführung.

## Einrichtungsassistent

**Hausakte → Einrichtung** führt durch Haus und Räume, Grundriss, Technikthemen, die raumweise Durchsicht, zentrale Stellen und den Abschluss. Bestehende Räume und Akten werden weiterverwendet. Ein übersprungener Schritt ist kein Fehler und darf später bearbeitet werden.

**Pausieren und schließen** bewahrt bestätigten Fortschritt. Formulare vor einem Bereichswechsel mit der jeweiligen Schaltfläche speichern. Ein noch nicht gespeicherter Formularentwurf ist nicht automatisch Teil des Assistentenfortschritts. Bei Rückkehr aus einer Akte hilft **Zur Einrichtung zurück**.

## Grundrissvorlage und Raumvorlagen

Unter **Grundrissvorlage** ein vorhandenes Bild oder eine PDF-Seite dem richtigen Geschoss zuordnen. Anhand einer bekannten Strecke skalieren, Lage und Deckkraft prüfen und anschließend nachzeichnen. Eine Vorlage ist ein Hintergrundbild und erzeugt keine Räume durch automatische Erkennung.

**Raumvorlagen** bewahren einen Raum mit zugeordneten Objekten und internen Verbindungen. Beim Einfügen entstehen neue Kennungen und der Zustand „Geplant“. Externe Versorgungen werden nicht stillschweigend übernommen; gegebenenfalls entsteht ein unversorgter Vorlagenverteiler. Nach dem Einfügen Lage, Überlappungen und Anschlüsse prüfen.

## Eigene Hausdaten suchen

**Hausakte → Suche** durchsucht unter anderem Namen, Seriennummern, Standorte, Netzwerkangaben, Zähler, Solarakten und Wandfototexte. Mit mehreren Wörtern enger suchen und bei Bedarf den Suchbereich begrenzen. Die Liste bietet je nach Treffer **Im Plan**, **Objektakte**, **Öffnen** oder **Foto öffnen**. Bilder werden nicht automatisch per Texterkennung gelesen.

# Rauchmelder, Absperrstellen und Gartenpflege {#hausobjekte}

{{include:docs/private-overview.md}}

# Verbindungen, Abschalten, Umbau und Wartungskalender {#planung}

![Dokumentierte Verbindungen können vom ausgewählten Objekt aus hervorgehoben werden.](bilder/connection-highlight.png)

{{include:docs/planning-tools.md}}

![Der Umbauvergleich zeigt Bestand und Zielzustand mit gemeinsamem Bildausschnitt.](bilder/renovation-comparison.png)

![Wartungen lassen sich über Monatsansicht und Tagesauswahl kontrollieren.](bilder/maintenance-calendar.png)

# Hauschronik, Schnellübersicht und QR-Aufkleber {#hausalltag}

{{include:docs/house-life.md}}

# Mobile Baustellenansicht {#baustelle}

**Baustelle** in der oberen Leiste öffnet eine vereinfachte Erfassung für unterwegs. Die Ansicht ist auch auf schmalen Bildschirmen nutzbar. Du kannst sie für eine Aufnahme vor dem Verputzen, eine gemessene Verlegetiefe oder eine offene Aufgabe verwenden.

1. Wenn vorhanden, zuerst das zugehörige Planobjekt auswählen. Dann **Baustelle** öffnen.
2. Einen prägnanten **Baustellentitel** eingeben, etwa „Gartenleitung vor Verfüllung“.
3. Unter **Baustellenobjekt** den Bezug kontrollieren oder eine allgemeine Notiz wählen.
4. Notiz und **Messwert mit Einheit und Bezug** eintragen. „60“ ist unklar; „60 cm unter Oberkante Terrasse“ ist nachvollziehbar.
5. Über **Baustellenfoto aufnehmen oder auswählen** ein Foto hinzufügen. Auf unterstützten Mobilgeräten kann der Browser die Kamera anbieten.
6. Optional **Sprachaufnahme starten** verwenden. Mikrofonzugriff benötigt einen unterstützten Browser und eine sichere Verbindung. Die Aufnahme endet spätestens nach 60 Sekunden; zu große Aufnahmen werden abgewiesen.
7. **Arbeit erledigt** passend setzen und **Baustellennotiz speichern** wählen.
8. Den gespeicherten Eintrag in der Liste prüfen. Über **Bearbeiten** korrigieren oder den Aufgabenstatus ändern.

![Die mobile Baustellenansicht bietet große Eingabefelder für Foto, Notiz und Messwert.](bilder/construction-mobile.png)

Eine Aufnahme bleibt zunächst im Entwurf. Erst das Speichern der Notiz übernimmt sie in das Projekt. Beim Schließen mit ungespeicherten Eingaben wird gefragt, ob du weiter erfassen oder den Entwurf verwerfen möchtest. Während einer laufenden Aufnahme beziehungsweise Fotoverarbeitung ist das Speichern gesperrt.

Bereits geöffnete Projekte können bei einer Netzunterbrechung lokal weiterbearbeitet werden. Ein vollständiger Neustart der App ohne erreichbaren Server wird nicht zugesichert. Bei einem verbundenen gemeinsamen Projekt erfolgt der Abgleich wieder, wenn Verbindung und sichtbarer Tab verfügbar sind. Die Bildschirmtastatur kann unabhängig von der eingebauten Aufnahme eine eigene Diktierfunktion anbieten.

# Auf PC, iPad und iPhone arbeiten {#mobil}

{{include:docs/ipad.md}}

![Auf schmalen Bildschirmen bleibt das Menüband über seine Bereichs-Tabs erreichbar.](bilder/ribbon-phone.png)

## Vor einem Wechsel des Geräts

Speichere offene Formulare. Wenn du gemeinsame Projekte verwendest, kontrolliere den Serverstatus und gleiche den aktuellen Stand ab. Öffne auf dem nächsten Gerät den richtigen Serverstand. Ohne Projektdienst zuerst eine neue JSON-Datei exportieren und kontrolliert übernehmen. Zwei unabhängig geänderte Kopien werden nicht automatisch zusammengeführt.

# Gemeinsamer Projektstand auf mehreren Geräten {#gemeinsame-projekte}

Der optionale Projektdienst speichert gemeinsame Projekte auf deinem eigenen Hausserver. Die lokale Browserspeicherung bleibt bestehen. Du entscheidest, welche Projekte du erstmals bereitstellst und welche Serverstände du auf einem weiteren Gerät übernimmst.

## Einmalige Vorbereitung am LXC

Nach Installation einer passenden App-Version im LXC **als Administrator** `Update --setup-projects` ausführen. Der Befehl richtet den Projektdienst ein und zeigt einen eigenen Zugriffsschlüssel einmalig an. Den Schlüssel sicher aufbewahren. Er ist nicht das Passwort für App-Updates und gewährt Zugriff auf alle gemeinsamen Projekte dieses Hausservers.

Ab Version 0.57.0 kann der Administrator mit `/usr/local/bin/Update --set-project-key` einen eigenen gut merkbaren Schlüssel festlegen. Die Eingabe erfolgt zweimal verdeckt, nicht als Befehlsargument. 12 bis 128 Zeichen sind erlaubt: Buchstaben ohne Umlaute, Zahlen, Leerzeichen und Sonderzeichen; keine Leerzeichen am Anfang oder Ende. Mehrere gut merkbare Wörter erleichtern die Eingabe am iPhone. Der bisherige Schlüssel wird ungültig; alle Geräte anschließend mit dem neuen Schlüssel verbinden. Projekte und Update-Passwort bleiben erhalten.

Eine vorhandene HTTPS-Adresse schützt die Übertragung. Die Einrichtung gehört auf den Server, nicht in ein Eingabefeld der Hausakte. Bei einer individuell angepassten Nginx-Konfiguration die Betriebsanleitung beachten: Die verwaltete Konfiguration wird mit vorheriger Sicherung ersetzt. Die App allein aktiviert keinen Serverdienst.

## Erstes Gerät verbinden

1. **Hausakte → Gemeinsame Projekte** öffnen.
2. **Projektdienst-Zugriffsschlüssel** eintragen, auf eigenen Geräten **Auf diesem Gerät merken** anhaken und **Mit Projektdienst verbinden** wählen. **Schlüssel anzeigen** hilft bei der Eingabekontrolle. Erst nach erfolgreicher Prüfung wird der neue Zugang gespeichert.
3. Projektname und geöffneten Bestand kontrollieren.
4. **Aktuelles Projekt erstmals bereitstellen** wählen.
5. Auf den Status achten. Danach werden lokale Änderungen des verbundenen Projekts bei sichtbarem Tab etwa alle zehn Sekunden abgeglichen. **Jetzt abgleichen** stößt die Prüfung direkt an.

## Weiteres Gerät verbinden

1. Dieselbe App-Adresse öffnen und mit demselben Projektschlüssel verbinden.
2. **Serverprojekte laden** wählen und beim richtigen Haus **Serverstand prüfen** öffnen.
3. Die Vorschau kontrollieren. Bei gleicher Projektkennung ersetzt die Übernahme den lokalen Projektstand.
4. **Serverstand übernehmen und verbinden** wählen. Vorher wird der aktuell geöffnete lokale Stand als benannte Sicherung aufbewahrt.
5. Bei gewünschter unabhängiger Kopie stattdessen **Als lokale Kopie öffnen** wählen. Diese erhält eine neue Projektkennung.

## Konflikte bewusst lösen

Eine Änderung auf einem anderen Gerät wird angeboten, nicht ungefragt über deinen offenen Entwurf geschrieben. Haben beide Seiten Änderungen, erscheint ein Konflikthinweis.

1. Den **lokalen Entwurf als Datei sichern**.
2. Serverprojekte laden und den aktuellen Serverstand prüfen.
3. Entscheiden, welchen Stand du weiterbearbeiten willst. Die App führt Inhalte nicht automatisch zusammen.
4. Falls nötig fehlende Änderungen anhand der gesicherten Kopie im gewählten Stand nachtragen.

Mit **Auf diesem Gerät merken** bleiben Schlüssel und Projektverknüpfungen im Browserprofil dieser App-Adresse auch nach dem Schließen gespeichert. Wer das Browserprofil verwendet, hat damit Zugang zu den gemeinsamen Projekten. **Gespeicherten Zugang entfernen** löscht den Zugang dieses Browsers, keine Serverprojekte. Ohne Häkchen gilt die Anmeldung nur für den Tab; **Verbindung trennen** beendet sie. Gelöschte Websitedaten, private Browserfenster oder eine andere App-Adresse können eine erneute Anmeldung erfordern. Kann der Browser nicht speichern, zeigt die App einen Hinweis. Der Schlüssel gehört nicht in die Projektdatei. Home-Assistant-Zugangsdaten und die lokale übergreifende Gerätebibliothek werden nicht als eigene Einstellungen synchronisiert.

![Gemeinsame Projekte auf dem iPhone: Zugang auf dem eigenen Gerät merken und wieder entfernen.](bilder/shared-access-phone.png)

## Sicherung des Servers

Der Dienst bewahrt die letzten 20 ersetzten Stände je Projekt in seiner Datenbank auf. Dafür gibt es noch keinen eigenen Wiederherstellungsdialog. Verwende zusätzlich JSON-Sicherungen und benannte lokale Versionsstände. Für eine Serversicherung den Dienst stoppen und das komplette Datenverzeichnis mit erhaltenen Rechten sichern oder die SQLite-Backup-Funktion verwenden; die laufende Hauptdatei allein kann unvollständig sein.

# Speichern, Sichern und Wiederherstellen {#sicherung}

| Verfahren                       | Was es bewahrt                                                  | Wichtige Grenze                                               |
| ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| Automatisches lokales Speichern | Aktueller Projektstand im Browser                               | Kein Schutz vor Löschen der Browserdaten oder Geräteausfall   |
| JSON-Projektdatei               | Übertragbarer Projektinhalt einschließlich eingebetteter Medien | Download außerhalb des Browsers aufbewahren und prüfen        |
| Automatische Wiederherstellung  | Begrenzte Zahl vorheriger lokaler Speicherstände                | Befindet sich im selben Browser wie das Projekt               |
| Benannter Versionsstand         | Bewusst festgehaltener lokaler Stand                            | Bleibt lokal; bei Bedarf separat exportieren                  |
| Gemeinsamer Projektdienst       | Bereitgestellte und abgeglichene Serverstände                   | Unabgeglichene lokale Eingaben sind noch nicht auf dem Server |

## Nach einem wichtigen Arbeitsschritt

1. Offene Formulare speichern und auf **Lokal gespeichert** achten.
2. Unter **Hausakte → Wiederherstellung** einen benannten Stand erstellen, zum Beispiel „Leitungen Garten vor Verfüllen“.
3. Unter **Sicherung & Gerätewechsel** das Projekt sichern und die heruntergeladene Datei prüfen.
4. Die geprüfte Datei an einem unabhängigen Ort aufbewahren. Ein Download nur auf demselben Gerät schützt nicht vor dessen Ausfall.
5. Bei einem gemeinsamen Projekt zusätzlich den Serverabgleich kontrollieren.

## Einen früheren Stand verwenden

In **Wiederherstellung** den gewünschten Zeitpunkt oder Namen auswählen. Unterschiede und Projektzuordnung kontrollieren, dann bewusst wiederherstellen. Die Wiederherstellung selbst kann rückgängig gemacht werden. Benannte Stände werden nicht wie gewöhnliche automatische Stände bereinigt, können aber durch das Löschen sämtlicher Browserdaten ebenfalls verloren gehen.

Wenn ein anderer Tab gespeichert hat, kann ein Konflikthinweis erscheinen. Den noch offenen Entwurf zuerst exportieren, dann neu laden. Browserdaten nicht als erste Fehlerbehebung löschen. Ein App-Update oder Rollback verändert die Anwendungsversion, nicht automatisch den Inhalt deiner Hausdaten.

# Ausgabe: Pläne, Listen, Aushänge und Dateien {#ausgabe}

Unter **Hausakte → Ausgabe** die gewünschte Ausgabe wählen. Ein Planexport ist eine Darstellung; eine JSON-Datei ist die weiterbearbeitbare Projektsicherung.

| Format                  | Zweck                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Projekt-JSON            | Später weiterbearbeiten, sichern oder auf ein anderes Gerät übertragen             |
| Plan-PDF                | Lesen, drucken und weitergeben                                                     |
| Plan-SVG                | Skalierbare grafische Ausgabe                                                      |
| Bestands-/Materialliste | Dokumentierte Komponenten und Längen auswerten                                     |
| CSV                     | Zählerwerte, Verbrauchsintervalle oder Prüfergebnisse tabellarisch weiterverwenden |
| ICS                     | Exportierte Wartungstermine in eine Kalenderanwendung übernehmen                   |
| Foto-SVG                | Ein Foto mit seinen eingezeichneten Verläufen und Bezugspunkten weitergeben        |

Vor der Ausgabe Geschoss, Ebenen und gewünschten Planumfang kontrollieren. Fehlende technische Angaben werden durch einen Export nicht ergänzt. Für Zähler und Prüfberichte die jeweilige Fachansicht verwenden. Die PDFs der Anwendung tragen Appname, Version und Copyright im Footer.

![Der Sicherungskasten-Aushang fasst die dokumentierten Stromkreise zusammen.](bilder/board-schedule-ui.png)

{{include:docs/board-schedule.md}}

# Home Assistant {#home-assistant}

Unter **Hausakte → Home Assistant** Basisadresse und Zugriffstoken eintragen. Beide werden lokal in diesem Browser gespeichert und beim nächsten Öffnen wieder angeboten. Über **Verbindung verwerfen** beide Angaben entfernen.

Objektakten können Entitäts-IDs enthalten. Der Abruf liest Zustände ausdrücklich auf Anforderung. Die Anwendung sendet darüber keine Steuerbefehle und aktualisiert die Daten nicht fortlaufend automatisch.

1. Prüfen, ob der Browser die Home-Assistant-Adresse grundsätzlich erreichen kann.
2. Basisadresse und gültigen Token in der App eintragen.
3. Den Zustandsabruf starten und die Anzeige beziehungsweise Fehlermeldung kontrollieren.
4. Bei Verbindungsfehlern die passende CORS-Freigabe für die App-Adresse und einen möglichen HTTPS-/HTTP-Mischbetrieb prüfen.

Adresse und Token sind Verbindungseinstellungen des Geräts, keine Projektinhalte. Sie werden weder über Projekt-JSON noch als Teil eines gemeinsamen Projekts auf andere Geräte übertragen. Auf einem neuen Gerät erneut eintragen. Einen Token nicht in Notizen oder exportierte Beispielprojekte kopieren.

# Updates und Versionsanzeige {#updates}

Die Versionsanzeige unterscheidet die **geöffnete Version im Browser**, die **Version auf dem Server** und ein gegebenenfalls verfügbares **GitHub-Release**. Ein bereits offener Tab kann noch die vorherige Anwendung ausführen, obwohl der Server aktualisiert wurde.

## Reguläres Update

1. Offene Eingaben speichern und eine Projektdatei sichern.
2. Versionsanzeige öffnen und die Hinweise lesen.
3. Ist das passwortgeschützte Update eingerichtet, **Update installieren** wählen und das dafür vorgesehene Update-Passwort eingeben.
4. Fortschritt abwarten. Nach erfolgreicher Installation bewusst **Neue Version laden** verwenden.
5. Projekt und Versionsanzeige erneut kontrollieren.

Alternativ im eingerichteten LXC `Update --check` zum Prüfen und `Update` zum geführten Installieren verwenden. `Update --rollback` aktiviert einen vorherigen App-Stand; es ist keine Wiederherstellung älterer Hausdaten.

## „Updateprüfung derzeit nicht möglich“

Diese Meldung bedeutet zunächst nur, dass die Releaseprüfung keine verlässliche Antwort erhalten hat. Ursachen können fehlende Verbindung, ein GitHub-Anfragelimit oder eine noch laufende Veröffentlichung sein. Deine bereits vorhandenen Hausdaten bleiben verwendbar. Nicht ständig neu prüfen; später erneut versuchen. Eine genaue Wartezeit kann nur aus der aktuellen Serverantwort abgeleitet werden, nicht aus einer pauschalen Annahme.

Wird eine neuere Serverversion gemeldet, Eingaben sichern und die App neu laden. Ein Lesezeichen auf eine andere Adresse oder ein anderer Port kann dagegen einen getrennten Browserspeicher öffnen; das ist kein Beweis, dass das alte Projekt gelöscht wurde.

# Tastatur und Touch im Überblick {#tastatur}

Tastenkürzel gelten im Editor, nicht beim Schreiben in ein Textfeld. Auf dem Mac kann je nach Browser die entsprechende Command-Taste anstelle von Strg verwendet werden; im Zweifel die sichtbaren Schaltflächen nutzen.

| Eingabe             | Funktion                                                     |
| ------------------- | ------------------------------------------------------------ |
| V / H               | Auswahl / Ansicht verschieben                                |
| W / R / P           | Wand / Rechteckraum / freier Raum                            |
| M                   | Möbel beziehungsweise freie Objekte platzieren               |
| E / L               | Elektrik platzieren / Leitungsweg zeichnen                   |
| D / T / F           | Bemaßung / Tür / Fenster                                     |
| Zahl + Enter        | Begonnene Wand auf genaue Länge in mm festlegen              |
| Shift               | Rechtwinklig zeichnen beziehungsweise Mehrfachauswahl        |
| Leertaste + Ziehen  | Zeichenfläche verschieben                                    |
| Mausrad             | Zum Mauszeiger zoomen                                        |
| Pfeiltasten         | Auswahl um 10 mm verschieben                                 |
| Shift + Pfeiltasten | Auswahl um eine Rasterweite verschieben                      |
| Strg+Z / Strg+Y     | Rückgängig / Wiederholen                                     |
| Strg+D / Entf       | Duplizieren / Löschen                                        |
| Strg+S / Pos1       | Speichern / alles anzeigen                                   |
| Escape              | Aktuellen Vorgang abbrechen beziehungsweise Dialog schließen |
| Ein Finger          | Auswählen, Punkt setzen oder Objekt verschieben              |
| Zwei Finger im Plan | Ansicht verschieben und zoomen                               |

Auf Touchgeräten ersetzen **Raum schließen**, **Wandzug beenden**, **Letzten Punkt entfernen**, **Abbrechen**, **Rechtwinklig** und **Mehrfachauswahl** die entsprechenden Tastaturaktionen. Eine abgebrochene Geste soll keine Platzierung speichern. Bei Textmarkierungen darf der Zeiger über den Dialogrand hinausgezogen werden, ohne dass dies allein das Popup schließt.

# FAQ und gezielte Fehlerhilfe {#faq}

## Warum steht bei einem Offline-Gerät „Ausfallbeginn unbekannt“?

Die gespeicherte Z2M-Meldung enthält nur den Zustand, keinen Zeitpunkt des Ausfalls. Die App zeigt ihre erste Offline-Beobachtung dieser Empfangssitzung und getrennt davon die letzte Zigbee-Nachricht, sofern `last_seen` aktiviert ist. Beides wird nicht als genauer Ausfallbeginn ausgegeben. Siehe [schwebende Zigbee-Übersicht](#netzwerk).

## Warum platziert ein Tabwechsel jetzt kein Objekt mehr?

Jeder Tab startet mit **Auswahl**. Zum Platzieren bewusst eine Vorlage oder das passende Werkzeug wählen. Eine freie Fläche im Auswahlmodus ziehen, um die Ansicht zu verschieben. Siehe [Möbel und Bedienung](#moebel).

## Kann ich IKEA-Möbel importieren und auf dem iPad verwenden?

Ja, als maßstäbliche 2D-Vorlage: Produktmaße kopieren, im globalen Möbelkatalog vorschlagen lassen, prüfen und speichern. Der Link allein lädt kein Modell. Eigene Vorlagen per Katalogdatei exportieren und auf dem iPad importieren. Siehe [Herstellermaße und globaler Katalog](#moebel).

## Warum fehlt der Batteriestand oder ändert er sich nicht?

Die App zeigt die von Z2M veröffentlichten Werte. Manche Geräte melden nur eine Batteriewarnung, andere senden Prozentwerte selten oder erst nach dem Aufwachen. „Unbekannt“ ist kein leerer Akku. Nach einem Neuladen muss erst wieder eine Nachricht eintreffen. Siehe [Batterien und Zigbee](#netzwerk).

## Kann ich Räume aus dem Plan nach Home Assistant übertragen?

Ja: Gerät auswählen, einen Raum zuordnen und **Raum an Home Assistant übertragen …** öffnen. Vorschau lesen, Zielbereich wählen und ausdrücklich übertragen. Raumnamen bearbeitest du direkt am Raum oder beim zugeordneten Zigbee-Gerät. Es gibt keine automatische beidseitige Synchronisierung; bestehende HA-Bereiche werden nicht umbenannt. Siehe [Raumzuordnung und Übertragung](#netzwerk).

## Warum wird Zigbee nicht alle fünf Sekunden neu gescannt?

Das Intervall aktualisiert empfangene Gerätezustände. Ein vollständiger Scan belastet das Funknetz und kann bis zu zwei Minuten dauern. Deshalb löst nur **Topologie jetzt scannen** eine neue Karte aus. Datum und Details des letzten Kartenstands bleiben sichtbar. Siehe [Zigbee2MQTT im Netzwerkkapitel](#netzwerk).

## Zigbee2MQTT meldet einen abgelehnten Zugriff oder keine Geräte – was prüfen?

Unter **Hausakte → Home Assistant** Adresse und Token prüfen: Der Benutzer benötigt für MQTT-Abonnements Administratorrechte. Die MQTT-Integration muss mit dem Z2M-Broker verbunden sein. Im Zigbee-Dialog das korrekte Basistopic eintragen. Bei HTTPS auch Home Assistant über HTTPS ansprechen.

## Kann ich Netzwerkkabel wie Stromleitungen zeichnen und die Etage wechseln?

Ja: **Netzwerkkabel verlegen** wählen, Startgerät und Wegpunkte anklicken. Am Steigschacht über das Menüband das Geschoss wechseln und dort weiterzeichnen. Ein Klick auf das Zielgerät öffnet die Anschlusseinstellungen; erst deren Bestätigung speichert Leitung und Ports zusammen. Siehe [Netzwerk](#netzwerk).

## Wie versorge ich meine Reolink-Türklingel über PoE?

Die Vorlage **Reolink Video Doorbell PoE** und einen **Switch mit PoE** im Netzwerk platzieren. Am Switch sein tatsächliches PoE-Budget eintragen und beide über **Ports, Kabel & WLAN** verbinden. Switch und Port werden automatisch aus der Leitung abgeleitet. Steht dort kein passendes Budget, ist ein Port ausgeschaltet oder benötigt das Gerät PoE+ statt PoE, wird die Ursache in den Eigenschaften angezeigt. Die WLAN- und Akku-Türklingeln benötigen andere Vorlagen. Einzelheiten im [Netzwerkkapitel](#netzwerk).

## Wo liegen meine Hausdaten?

Standardmäßig in der IndexedDB dieses Browsers unter genau der verwendeten App-Adresse. Gemeinsam bereitgestellte Projekte liegen zusätzlich auf deinem eingerichteten Hausserver. JSON-Dateien sind separate Sicherungen. Diese Speicherorte ersetzen einander nicht vollständig.

## Warum ist am iPhone alles leer, obwohl ich am PC gezeichnet habe?

Die Geräte besitzen getrennte lokale Speicher. Den gemeinsamen Projektdienst verbinden und den richtigen Serverstand übernehmen oder eine aktuelle JSON-Datei importieren. Dasselbe WLAN allein überträgt keine Projekte.

## Warum ist mein Projekt nach Wechsel auf HTTPS verschwunden?

HTTP und HTTPS sind unterschiedliche Origins. Wenn der alte Speicher noch erreichbar ist, an der bisherigen Adresse exportieren und am neuen Ziel importieren. Browserdaten nicht löschen. Gemeinsame Projekte können nach Verbindung mit dem Dienst erneut übernommen werden.

## Reicht „Lokal gespeichert“ als Backup?

Nein. Es bestätigt die Browserspeicherung. Für eine unabhängige Sicherung eine JSON-Datei herunterladen, prüfen und getrennt aufbewahren. Siehe [Sicherung](#sicherung).

## Warum lässt sich ein sichtbares Objekt nicht auswählen?

Den passenden Bereich öffnen, Auswahl aktivieren und Ebene auf Sichtbarkeit beziehungsweise Sperre prüfen. Die Objektliste hilft bei Überlagerungen. Ein Vorschausymbol im Nachbargeschoss kann ein anderes Originalgeschoss haben.

## Wo sind Werkzeuge, Geschosse und Ebenen auf dem iPhone?

Im oberen Menüband. Dieses gegebenenfalls einblenden und waagerecht verschieben. **Eigenschaften** beziehungsweise das Schieberegler-Symbol öffnet die Objektbearbeitung.

## Warum wird nach einem Klick immer noch ein weiteres Objekt platziert?

Das Platzierungswerkzeug ist noch aktiv. Auf Auswahl wechseln oder den Vorgang abbrechen. Wiederholtes Platzieren ist beispielsweise für mehrere Solarmodule vorgesehen.

## Wie ändere ich die Wandlänge, ohne die ganze Wand zu verschieben?

Ein Raummaß anklicken und genau eingeben oder den betreffenden Endpunkt bearbeiten. Die ganze Wand zu ziehen ist eine andere Aktion. Gemeinsame Anschlusspunkte beeinflussen die anliegenden Segmente. Siehe [Grundriss](#grundriss).

## Warum verweigert die App eine Wandverkürzung?

Eine Öffnung oder Wandbefestigung könnte außerhalb der neuen Wand liegen; außerdem können Sperren oder ungültige Raumflächen die Änderung verhindern. Den konkreten Hinweis lesen und zuerst die Abhängigkeit korrigieren.

## Wie skaliere ich ein Möbel mit der Maus?

Möbel auswählen und einen Eck- oder Seitengriff ziehen. Für exakte Abmessungen die Eigenschaften verwenden. Bei einem Elektroverbraucher die Maße in dessen eigenen Eigenschaften prüfen.

## Warum sehe ich die Treppe nicht auf dem anderen Geschoss?

Richtung hoch/runter, Geschossreihenfolge und Sichtbarkeit kontrollieren. Das Original auf seinem ursprünglichen Geschoss auswählen und dort bearbeiten.

## Wo platziere ich Router, Access Points und Switches?

Im Bereich Netzwerk. Anbieter-, WLAN- und Empfangsangaben ergänzend unter Hausakte → Internet & WLAN dokumentieren. Es findet keine automatische Gerätesuche statt.

## Wo gehören SAT-Schüssel und Multischalter hin?

Unter Netzwerk die TV-/SAT-Vorlagen verwenden. Anschlüsse benennen und über die Koaxverwaltung verbinden. Ethernet und Koax sind unterschiedliche Anschlussarten.

## Muss ich einen Zähler im Plan und in der Hausakte doppelt anlegen?

Nein. Ein unterstützter Planzähler wird automatisch in der Akte geführt. Früher getrennt angelegte Einträge bearbeiten und dem passenden vorhandenen Planzähler zuordnen. Ablesungen am bestehenden richtigen Eintrag erhalten.

## Weshalb gibt es trotz eingetragener Zahl noch keinen Verbrauch?

Ein undatierter Planwert ist keine datierte Ablesung. Für einen berechenbaren Verbrauch werden mindestens zwei gültige kumulierte Ablesungen benötigt. Ein Zählerwechsel kann ein Intervall ausdrücklich unbestimmt machen.

## Warum kann ich die Zählereinheit nicht mehr ändern?

Nach der ersten Ablesung ist sie gesperrt, damit bestehende Werte nicht umgedeutet werden. Einen anderen Messkanal als neuen Zähler erfassen.

## Warum versorgt mein gezeichnetes Kabel den Verbraucher nicht?

Eine Leitung benötigt eine passende Kontaktbelegung und eine erkennbare Versorgung. Beim Speichern werden Stromkreis und einfache Verbraucherzuordnungen automatisch übernommen. Eine alte Linie ohne Aderpaare genügt nicht: **Anschlussbelegung bearbeiten** öffnen und die Vorschläge prüfen.

Netzwerkgeräte über **Mit Steckdose verbinden** anschließen. N und vorhandener PE werden vorbelegt; die Verbraucherzuordnung erfolgt automatisch. Einphasige Verbindungen benötigen keine zusätzlichen L2-/L3-Paare.

Im **Sicherungskasten öffnen** zeigt das Versorgungsschema die Schutzkette. Unter **Leitungen und Anschlüsse** die Leitung anklicken und **Anschlussbelegung bearbeiten** öffnen. Eine sichtbare Schema-Linie allein bedeutet noch keine dokumentierte Aderbelegung.

Beim Anschluss am Kasten zuerst **Sicherung / Stromkreis** auswählen. Fehlt zu einer eingebauten Sicherung noch der Stromkreis, entsteht er beim Speichern. Die weitere Stromkreiszuordnung übernimmt die App.

## Warum leuchtet die Lampe in der Simulation nicht?

Einspeisung, Sicherung und Leitungsbelegung prüfen. Die Lampe folgt dem angeschlossenen Schalter und hat keinen separaten Ein/Aus-Zustand mehr. Bei mehreren widersprüchlichen Anschlüssen zeigt die Simulation einen Hinweis. Für die Leiterprüfung muss auch der Rückweg über N vollständig dokumentiert sein. Manuelle Typenschildwerte müssen zur Versorgung passen.

## Warum löst die B16-Sicherung bei über 16 A nicht automatisch aus?

Die Stromkreissimulation zeigt Auslastung, berechnet aber keine reale zeitabhängige LS-Auslösekennlinie. Eine Auslastungsanzeige ist kein Installationsnachweis. Die separate FI-Fehlermodellierung hat eigene Grenzen.

## Erzeugt eine Linienkreuzung einen Abzweig?

Bei Kabeln oder Rohren nicht allein durch die Zeichnung. Ein dokumentiertes Anschlussobjekt und passende Verbindungen verwenden. Geometrische Wandanschlüsse sind davon zu unterscheiden.

## Kann ich mehrere Solarmodule platzieren?

Ja. Die Platzierung verwendet zunächst noch nicht platzierte Module und erweitert anschließend die Modulgruppe. Weitere Balkonkraftwerk-Übersichten können neue Anlagen erzeugen. Die gewünschte Anlage vor weiteren Komponenten prüfen.

## Warum fehlt mein Wechselrichter in einer zweiten Position?

Pro Anlage ist eine Wechselrichter-Planplatzierung vorgesehen. Bestehendes Objekt verschieben oder prüfen, ob du eine zusätzliche eigenständige Anlage dokumentieren möchtest. Siehe [Solar](#solar).

## Berechnet Home-Technik den Solarertrag automatisch?

Nein. Modulleistung, Wechselrichter und Speicher sind Dokumentation. Ertrag wird über echte Zählerablesungen erfasst. Wp, W, Wh und kWh nicht verwechseln.

## Kann ich Grundstücksgrenzen per GPS vermessen?

Du kannst sie grob erfassen. GPS ist keine rechtssichere Grenzvermessung und liefert keine verlässliche Genauigkeit für verdeckte Leitungen. Feste Referenz, richtige Nordausrichtung und nachgemessene Abstände sind entscheidend.

## Warum funktioniert GPS im heimischen WLAN nicht?

Eine gewöhnliche HTTP-Adresse genügt auf mobilen Browsern meist nicht. Eine vertrauenswürdige HTTPS-Adresse verwenden und Standortfreigabe prüfen. Bei Rückkehr aus dem Hintergrund die Ortung erneut starten.

## Warum kann ich einen GPS-Punkt nicht übernehmen?

Messung kann zu alt, zu ungenau oder zu weit von der Referenz entfernt sein. Neu messen, Empfang prüfen und die im Dialog genannten Grenzen beachten. Nicht durch eine beliebige Referenz umgehen.

## Übernimmt ein Leitungsfoto automatisch Leitungen in den Grundriss?

Nein. Das Foto erhält eigene Markierungen. Elektrische, hydraulische oder Netzwerkverbindungen werden im jeweiligen Planbereich angelegt.

## Was unterscheidet Bezugspunkt und Referenzstrecke im Foto?

Ein Bezugspunkt benennt eine wiedererkennbare Stelle. Eine Referenzstrecke ordnet einem Abstand im Bild ein bekanntes Maß zu. Erst diese Kalibrierung ermöglicht ungefähre Längen; Perspektivfehler bleiben bestehen.

## Warum lässt sich ein Foto nicht speichern?

Dateityp, Eingabegröße und Gesamtgröße des Projekts prüfen. Viele eingebettete Fotos und Aufnahmen können die Projektgrenze erreichen. Nicht benötigte Medien nach Sicherung bewusst entfernen oder kleinere geeignete Bilder verwenden.

## Wo sind meine projektübergreifenden Vorlagen auf dem anderen Gerät?

Die gemeinsame Gerätebibliothek gilt zunächst für Projekte in diesem Browser. Bibliothek exportieren/importieren oder Vorlagen über ein gemeinsames Projekt mitführen. Individuelle Seriennummern werden beim Merken entfernt.

## Warum startet keine Sprachaufnahme?

Unterstützung für MediaRecorder, sichere Verbindung und Mikrofonfreigabe prüfen. Alternativ die Diktierfunktion der Bildschirmtastatur im Notizfeld verwenden. Die Aufnahme wird erst zusammen mit der Baustellennotiz gespeichert.

## Warum gibt es einen Konflikt beim Serverabgleich?

Ein anderes Gerät hat den Serverstand geändert, seit dein lokaler Stand verbunden wurde. Lokalen Entwurf zuerst als Datei sichern und danach den Serverstand prüfen. Es gibt keine automatische Zusammenführung.

## Warum ist der Projektdienst nicht erreichbar?

Prüfen, ob auf diesem Server `Update --setup-projects` ausgeführt wurde, der Dienst läuft und dieselbe App-Adresse verwendet wird. Eine statische Vorschau allein enthält keinen laufenden Projektdienst. Bei ungültigem Schlüssel erneut verbinden.

## Warum muss ich den Projektschlüssel immer wieder eintippen?

Unter [Gemeinsame Projekte](#gemeinsame-projekte) **Auf diesem Gerät merken** aktivieren. Das gilt je Browser und App-Adresse. Einen leichter eintippbaren Schlüssel kann der Administrator nach dem Update mit `/usr/local/bin/Update --set-project-key` setzen. Danach den neuen Schlüssel auf jedem Gerät einmal eingeben und merken lassen.

## Ist der Projektschlüssel mein Update-Passwort?

Nein. Es sind getrennte Zugänge. Der Projektschlüssel verbindet Hausdaten; das Update-Passwort erlaubt die dafür eingerichtete App-Aktualisierung. Home Assistant verwendet nochmals einen eigenen Token.

## Warum meldet die App „Updateprüfung derzeit nicht möglich“?

Verbindung, GitHub-Limit oder Veröffentlichung können die Prüfung vorübergehend verhindern. Lokal weiterarbeiten und später erneut prüfen. Daraus folgt nicht, dass Hausdaten beschädigt sind.

## Warum stimmen geöffnete Version und Serverversion nicht überein?

Der Tab kann noch die vorherige Anwendung geladen haben. Eingaben sichern und die neue Version bewusst laden. Ein Update erzwingt nicht das sofortige Neuladen aller geöffneten Geräte.

## Werden Wartungen als Push-Nachricht geschickt?

Nein. Fälligkeiten erscheinen in der App. ICS-Export in eine Kalenderanwendung übernehmen und dort gewünschte Erinnerungen einrichten. Eine exportierte Kalenderdatei ist keine dauerhafte Live-Verbindung.

## Warum öffnet mein QR-Aufkleber nicht das erwartete Gerät?

App-Adresse, Projektkennung und vorhandenes Projekt prüfen. Ein Code ersetzt keine Projektübertragung. Eine als Kopie importierte Datei hat eine neue Projektkennung; gelöschte Akten können nicht geöffnet werden.

## Warum fehlen Home-Assistant-Adresse und Token auf dem iPad?

Diese Einstellungen bleiben auf dem jeweiligen Gerät und sind nicht im Projekt-JSON oder Serverprojekt enthalten. Auf dem iPad erneut eintragen. Bei Abruffehlern CORS und HTTPS/HTTP prüfen.

## Darf ich Browserdaten löschen, wenn etwas nicht funktioniert?

Erst unabhängig sichern und prüfen. Das Löschen kann lokale Projekte, Wiederherstellungsstände und Einstellungen entfernen. Bei einem Konflikt zunächst den Entwurf exportieren; ein Neuladen ist etwas anderes als das Löschen des Speichers.

# Stichwortverzeichnis und Begriffe {#stichwoerter}

Begriffe sind verlinkt. Die Suche oben findet zusätzlich Synonyme und alle ausführlichen Erklärungen im Handbuch.

| Stichwort                                  | Bedeutung und Kapitel                                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Ablesung                                   | Datierter kumulierter [Zählerstand](#zaehler)                                                           |
| Abzweigdose                                | Dokumentierter Verbindungspunkt im [Elektrikplan](#elektrik)                                            |
| Access Point / AP                          | WLAN-Zugangspunkt im [Netzwerk](#netzwerk)                                                              |
| Ader / Anschlussbelegung                   | Konkrete Kontaktpaare für die [Leiterprüfung](#simulation)                                              |
| Akte                                       | Ergänzende Angaben zum Objekt in der [Hausakte](#hausakte)                                              |
| Anschlusshöhe                              | Höhenangabe relativ zum Geschoss bei [Rohrkomponenten](#rohrnetze)                                      |
| Außenbereich                               | Grundstück und Technik im [Garten](#grundstueck)                                                        |
| Backup                                     | Unabhängig aufbewahrte [Sicherung](#sicherung)                                                          |
| Balkonkraftwerk / BKW                      | Dokumentierte [Solaranlage](#solar)                                                                     |
| Batteriespeicher                           | Kapazität in Wh in der [Solarakte](#solar)                                                              |
| Baustellennotiz                            | Foto, Aufgabe und Messwert in der [Baustellenansicht](#baustelle)                                       |
| Bestand / Rückbau / Geplant                | [Umbauzustände](#planung) in der Objektakte                                                             |
| Bezugspunkt                                | Benannte Fotostelle in [Leitungsfotos](#fotos)                                                          |
| Bemaßung                                   | Automatische und eigene [Planmaße](#grundriss)                                                          |
| Browser-Origin                             | Kombination aus Protokoll, Host und Port; relevant für [Speicherung](#sicherung)                        |
| CSV                                        | Tabellarische [Ausgabe](#ausgabe)                                                                       |
| DN                                         | Dokumentierte Rohrnennweite im [Rohrnetz](#rohrnetze)                                                   |
| Drehung                                    | Ausrichtung von [Möbeln und Objekten](#moebel)                                                          |
| Ebene                                      | Sichtbarkeit und Bearbeitungssperre im [Menüband](#geschosse)                                           |
| Einspeisung                                | Ausgang der dokumentierten [Versorgung](#elektrik)                                                      |
| Ertragszähler                              | Zähler für dokumentierten [Solarertrag](#solar)                                                         |
| Etagenleitung                              | Verbindung zwischen [Geschossen](#rohrnetze)                                                            |
| FI / RCD / FI-LS                           | Grafische [Schutzgeräte](#elektrik) im Popup und in der Leiterprüfung                                   |
| Fotozoom                                   | Vergrößerung von [Leitungsfotos](#fotos)                                                                |
| Gartenleitung                              | Mediengetrennte Dokumentation im [Außenbereich](#grundstueck)                                           |
| Gerätebibliothek                           | Wiederverwendbare [Verbrauchervorlagen](#geraetebibliothek)                                             |
| Geschoss                                   | Horizontale Planungsebene mit [Höhenangaben](#geschosse)                                                |
| GPS                                        | Punktweise [Standortaufnahme](#gps)                                                                     |
| Grundstücksgrenze                          | Gezeichneter Umriss im [Grundstücksplan](#grundstueck)                                                  |
| Hauschronik                                | Reparaturen und Ereignisse im [Hausalltag](#hausalltag)                                                 |
| Home Assistant / HA                        | Lesender [Zustandsabruf](#home-assistant)                                                               |
| Hutschiene                                 | Reale Montageposition; Kennzeichnungen im [Kasten](#elektrik) ausdrücklich dokumentieren                |
| ICS                                        | Datei für [Wartungstermine](#planung)                                                                   |
| IndexedDB                                  | Lokale Browserdatenbank für [Projekte](#sicherung)                                                      |
| JSON                                       | Weiterbearbeitbare [Projektdatei](#sicherung)                                                           |
| Kalibrierung                               | Bekannte Strecke im [Foto](#fotos) oder in einer Grundrissvorlage                                       |
| Klingeltrafo                               | Transformator mit dokumentierten [Ausgängen](#elektrik)                                                 |
| Koax / LNB / Multischalter                 | Komponenten der [TV-/SAT-Dokumentation](#tv)                                                            |
| Konflikt                                   | Unterschiedliche gleichzeitige [Projektänderungen](#gemeinsame-projekte)                                |
| kWh / Wh                                   | Energie beziehungsweise Speicherkapazität, siehe [Solar](#solar) und [Zähler](#zaehler)                 |
| Leitungsweg                                | Gezeichneter Verlauf, getrennt von [Versorgungszuordnung](#elektrik)                                    |
| Menüband / Ribbon                          | Obere [Werkzeuggruppen](#oberflaeche)                                                                   |
| Montagehöhe                                | Abstand über Boden in der [Wandansicht](#wandansicht)                                                   |
| Nordrichtung                               | Ausrichtung für die [GPS-Referenz](#gps)                                                                |
| Objektliste                                | Alternative zur Auswahl im [Plan](#oberflaeche)                                                         |
| PDF                                        | Lesbare und druckbare [Ausgabe](#ausgabe)                                                               |
| Phase                                      | Dokumentierte Zuordnung L1/L2/L3 in der [Elektrik](#elektrik)                                           |
| Planvorlage                                | Skaliertes Hintergrundbild in der [Hausakte](#hausakte)                                                 |
| Port / Patchpanel                          | Anschlüsse und Verbindungen im [Netzwerk](#netzwerk)                                                    |
| PoE / Reolink / Türklingel                 | Versorgung über Ethernet, Switch-Budget und Verbraucher im [Netzwerk](#netzwerk)                        |
| Zigbee / Z2M / LQI / Batterie / HA-Bereich | Geräteplatzierung, Batteriestände, Raumzuordnung, HA-Übertragung und Topologie im [Netzwerk](#netzwerk) |
| Projektschlüssel                           | Zugang zum [gemeinsamen Projektdienst](#gemeinsame-projekte)                                            |
| QR-Code                                    | Verweis auf Projekt und Akte, siehe [QR-Aufkleber](#hausalltag)                                         |
| Raster / Fangpunkt                         | Unterstützung beim [genauen Zeichnen](#grundriss)                                                       |
| Raumvorlage                                | Wiederverwendbarer Raum in der [Hausakte](#hausakte)                                                    |
| Referenzstrecke                            | Bekannter Bildabstand zur [Kalibrierung](#fotos)                                                        |
| Relais / Taster                            | Unterstützte [Schaltmodelle](#simulation)                                                               |
| Router / Repeater / SSID                   | [Internet und WLAN](#netzwerk)                                                                          |
| Rückgängig / Undo                          | Abgeschlossene [Änderung zurücknehmen](#tastatur)                                                       |
| Sicherungskasten-Aushang                   | Dokumentierte Stromkreise als [PDF](#ausgabe)                                                           |
| Sperre                                     | Schutz einer [Ebene](#geschosse) vor Änderungen                                                         |
| SVG                                        | Skalierbare [Grafikdatei](#ausgabe)                                                                     |
| Synchronisierung / Abgleich                | Bewusster gemeinsamer [Projektstand](#gemeinsame-projekte)                                              |
| Token                                      | Lokaler Zugang für [Home Assistant](#home-assistant)                                                    |
| Treppe                                     | Richtung und Darstellung im [Nachbargeschoss](#geschosse)                                               |
| Unterverteilung                            | Nachgeordneter [Sicherungskasten](#elektrik)                                                            |
| Verbrauch                                  | Differenz gültiger [Ablesungen](#zaehler)                                                               |
| Versionsstand                              | Bewusst gesicherter [Projektzustand](#sicherung)                                                        |
| Vorlauf / Rücklauf                         | Getrennte Medien im [Heizungsnetz](#rohrnetze)                                                          |
| Wandansicht                                | Frontansicht mit [Montagepunkten](#wandansicht)                                                         |
| Wartungskalender                           | Fälligkeiten und [Tagesauswahl](#planung)                                                               |
| Wechselrichter / Wp                        | [Solar-Komponenten und Leistungsangaben](#solar)                                                        |
| Wiederherstellung                          | Frühere [lokale Stände](#sicherung)                                                                     |

Weitere Stichwörter: **Möbelkatalog, IKEA, Herstellermaße, Vorlagenimport, Freifläche und Tabwechsel** – siehe [Möbel und Bedienung](#moebel).

**Zigbee-Übersicht, Router, Batterie niedrig, Offline seit, Availability und last_seen** – siehe [Zigbee im Netzwerk](#netzwerk).

## Grenzen der Dokumentation

Grundriss und technische Netze bilden deine eingegebenen Informationen ab. Unbekannte Anschlüsse, geschätzte Längen und nicht erfasste Geräte bleiben unbestimmt. Projektprüfung, Simulation, Fotokalibrierung und GPS ersetzen keine Prüfung der tatsächlichen Installation. Das Handbuch beschreibt die Bedienung der Software; es ist keine Anleitung für Eingriffe an elektrischen oder gasführenden Anlagen.
