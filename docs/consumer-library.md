# Verbraucherdatenbank ab 0.15.0

Unter **Elektrik → Verbraucherdatenbank** lassen sich eigene Geräte anlegen, suchen,
bearbeiten, als neue Vorlage kopieren und im Plan platzieren.

## Beispiel Kühlschrank

1. Gerätename, Hersteller, Modell und Seriennummer eintragen.
2. Breite, Tiefe und Höhe in Millimetern erfassen.
3. Nennspannung in Volt und Nennleistung in Watt vom Typenschild übernehmen, soweit bekannt.
4. Den Jahresverbrauch getrennt in kWh/Jahr erfassen. Unbekannte elektrische Werte leer lassen.
5. **Verbraucher speichern**, dann beim Eintrag **Platzieren** wählen und den Mittelpunkt im Plan antippen.

Das Gerät hat einen maßstäblichen rechteckigen Grundriss und ein elektrisches Anschlusssymbol
am Mittelpunkt. Es ist ein einzelnes Elektroobjekt auf der Elektrikebene, kein lose verbundenes
Paar aus Möbel und Verbraucher. Die ganze Grundfläche lässt sich im Auswahlwerkzeug treffen.
Maße, Drehung, Seriennummer und Jahresverbrauch sind unter **Eigenschaften** bearbeitbar.
Das funktioniert auch auf dem iPad; nach der Vorlagenwahl die Werkzeugleiste schließen.

## Anschließen

- Unter **Eigenschaften → Anschluss** eine Steckdose oder einen Festanschluss an einen Stromkreis wählen.
- Für dokumentierte Adern **Anschlussdialog öffnen** oder das Werkzeug **Anschließen** verwenden:
  Steckdose und Gerät wählen, Kontakte prüfen und bei Bedarf die Zuordnung für die Simulation bestätigen.
- Leitungsenden folgen dem Geräte-Mittelpunkt beim Verschieben. Beim Löschen werden abhängige
  Anschlussleitungen mit entfernt; Rückgängig stellt den gemeinsamen Schritt wieder her.
- Neue Geräte sind zunächst nicht angeschlossen und im dokumentierten Betriebszustand **Aus**.
  Zum Simulieren den Betriebszustand auf **Ein** setzen oder das Szenario entsprechend ändern.

Der Jahresverbrauch ist ein Energiekennwert und wird **nicht** in eine momentane Anschlussleistung
umgerechnet. Die Lastsimulation verwendet Nennleistung, Spannung und die weiteren elektrischen Angaben.
Höhe ist eine dokumentierte Abmessung; der 2D-Grundriss zeigt Breite und Tiefe.

## Speicherung und Wiederverwendung

Die Bibliothek gehört zum Projekt und wird mit Autosave und dem Projekt-JSON gespeichert.
**Bibliothek exportieren** erzeugt zusätzlich eine `*.consumer-library.json` zur Übernahme
in andere Projekte. Der Bibliotheksimport fügt neue Einträge mit neuen IDs hinzu; er überschreibt
keine vorhandenen Vorlagen. Maximal 1000 Einträge und 5 MB pro Importdatei sind vorgesehen.
Bibliotheksdateien können Seriennummern enthalten und sind in Git standardmäßig ausgeschlossen.

Jede Platzierung ist eine eigenständige Kopie. Spätere Vorlagenänderungen oder das Löschen einer
Vorlage verändern platzierte Geräte nicht. Bei weiteren Exemplaren die jeweilige Seriennummer
anpassen; **als neue Vorlage kopieren** lässt die Seriennummer bewusst leer.
Seriennummer, Hersteller und Modell stehen auch in der bestehenden Objektakte desselben Geräts.

Geräteumrisse erscheinen im PDF-/SVG-Plan. Materiallisten enthalten Abmessungen, Nennwerte,
Jahresverbrauch und Seriennummer. Die Datenbank ist lokal; es gibt keinen externen Produktkatalog
und keine automatische Synchronisierung zwischen Geräten. Projekt- oder Bibliotheksdateien dienen
zum Austausch zwischen PC und iPad.

## Datenmodell

`project.metadata.consumerLibrary` enthält streng validierte Vorlagen. Platzierte Geräte bleiben
gewöhnliche `electrical.devices`; `metadata.consumerShape` ergänzt Maße, Drehwinkel und Jahresenergie.
Bestehende Dateien ohne diese Metadaten bleiben unverändert lesbar. Normale Verbraucher ohne
Grundriss behalten ihre bisherige Symbolanzeige. Maße und Instanzdaten unterliegen den bestehenden
Transaktionen, Ebenensperren und Undo/Redo-Regeln.
