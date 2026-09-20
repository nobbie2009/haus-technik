# Wandfotos und Leitungsverläufe

Seit 0.17.0 kann jede Wand mehrere Fotos mit eigenen eingezeichneten Verläufen enthalten.

## Foto anhängen

1. Im Bereich **Haus / Raum** mit **Auswahl** eine Wand auswählen. Alternativ die Wand unter **Objekte im aktiven Bereich** öffnen.
2. In den Eigenschaften **Wandfotos und Verläufe** öffnen.
3. **Wandfoto hinzufügen** wählen und ein JPEG-, PNG- oder WebP-Bild laden.
4. Unter **Fotodaten und Wandseite** einen Titel, die Seite beziehungsweise den Raum und eine Notiz ergänzen – beispielsweise „Küchenseite, Blick von der Tür, vor dem Verputzen“.

Für Innen- und Außenseite oder verschiedene Bauzustände jeweils ein eigenes Foto hinzufügen.
Die Auswahl **Wandfoto auswählen** wechselt zwischen den Bildern. Ein neues Foto ersetzt kein vorhandenes.
Bilder werden auf maximal 2400 Pixel an der längsten Seite verkleinert und als JPEG im Projekt gespeichert.
Es gelten maximal 25 MB pro Eingabedatei, 4 MB pro verarbeitetem Bild und 20 Fotos pro Wand.
Das gesamte Projekt einschließlich seiner Bilder und Vorlagen darf 18 MB nicht überschreiten.

## Verläufe einzeichnen

**Neuen Verlauf zeichnen** wählen und die Eckpunkte auf dem Foto nacheinander antippen.
Anschließend Name, Leitungsart und optional eine Notiz eintragen und **Verlauf speichern** drücken.
Es gibt Elektrik, Kalt-/Warmwasser, Heizungsvor-/rücklauf, Gas, Netzwerk und Sonstiges.
Die Farben sowie Namen und Arten in der Liste helfen beim Unterscheiden.

**Letzten Punkt entfernen** korrigiert den aktuellen Entwurf. Über **Punkt per Koordinaten setzen**
können Punkte auch ohne Maus gesetzt werden: X und Y beziehen sich prozentual auf das Foto,
jeweils von links beziehungsweise oben. **Zeichnung abbrechen** verwirft nur die begonnenen Punkte.
Beim Schließen mit begonnenen Punkten fragt der Dialog nach, ob diese verworfen werden sollen.

Gespeicherte Verläufe auf dem Foto oder in der Liste auswählen, um Namen und Notizen zu bearbeiten.
**Verlauf neu zeichnen** ersetzt die Punktfolge erst beim Speichern; bis dahin bleibt der bisherige Verlauf erhalten.
**Verlauf löschen**, das Löschen ganzer Fotos und andere gespeicherte Änderungen lassen sich über
**Rückgängig** wiederherstellen. Die Rückgängig-/Wiederholen-Schaltflächen verwenden die gemeinsame Projekthistorie.

## Zoom und iPad

Mit **Fotozoom** bis auf 300 % vergrößern. Ein vergrößertes Foto per Finger oder mit Bildlaufleisten verschieben.
Punkte werden erst bei einem kurzen Tippen gesetzt; Ziehbewegungen und Mehrfinger-Gesten zeichnen keine Punkte.
Auf dem iPad befindet sich der Einstieg nach Auswahl einer Wand unter **Eigenschaften**.
Der Dialog bleibt unabhängig von den ein- und ausklappbaren Seitenleisten geöffnet.

## Referenzstrecke und Export

Optional **Referenzstrecke markieren**, zwei unterschiedliche Punkte antippen und die bekannte Entfernung
in Millimetern eingeben. Danach werden ungefähre Gesamtlängen der eingezeichneten Verläufe angezeigt.
**Referenz entfernen** lässt Verläufe unverändert und entfernt die daraus abgeleiteten Längen.

Eine Fotoreferenz gleicht Perspektive und Objektivverzerrung nicht aus. Für brauchbare Näherungen
möglichst frontal fotografieren und die Referenz auf derselben Wandfläche wählen.
Die Funktion ist eine persönliche Fotodokumentation, keine Vermessung und kein Nachweis einer leitungsfreien Stelle.

**Wandfoto als SVG exportieren** erzeugt eine eigenständige Datei mit eingebettetem Foto und beschrifteten Linien.
Der normale JSON-Projektexport enthält sämtliche Wandfotos und editierbaren Verläufe.

## Beziehung zum Grundriss

Die Markierungen sind Fotoannotationen. Sie erzeugen keine elektrischen oder hydraulischen Verbindungen
und werden nicht automatisch auf den Grundriss übertragen. Das Verschieben oder Ändern der Wandlänge
verändert das Foto nicht. Beim Duplizieren einer Wand oder Einfügen einer Raumvorlage werden ihre Fotos
als unabhängig bearbeitbare Kopien übernommen. Eine gesperrte Wandebene erlaubt das Betrachten und
Exportieren, verhindert aber Änderungen an Fotos und Verläufen.
