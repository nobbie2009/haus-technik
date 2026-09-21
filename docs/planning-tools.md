# Planung, Wartung und Versionsstände

## Verbindungen verfolgen und Abschaltfolgen prüfen

Ein Planobjekt auswählen und in seinen Eigenschaften **Verbindungen / Abschalten** öffnen. Alternativ **Hausakte → Verbindungen & Abschalten** aufrufen. Als Ausgangspunkt lassen sich auch Stromkreise und einzelne Schutzgeräte auswählen.

- **Verbindungen verfolgen:** Bei elektrischen Geräten und Steckdosen wird die eingetragene Versorgung bis zur Einspeisung verfolgt. Dokumentierte Kabelwege zwischen zugeordneten Objekten werden einschließlich Abzweigdosen ergänzt. Gibt es mehrere Kabelwege, wird ein Weg mit möglichst wenigen Kabelabschnitten gewählt. Bei Rohrnetzen wird das zusammenhängende Netz des gewählten Mediums angezeigt. Netzwerk und SAT zeigen die dokumentierten Kabelverbindungen.
- **Absperren / Abschalten:** Die Liste zeigt elektrisch nachgeordnete Objekte. Im Rohrnetz werden die vor und nach einer hypothetischen Absperrung erreichbaren Knoten verglichen. Dabei zählen eingetragene Hausanschlüsse als Quellen; bereits geschlossene Komponenten und alternative Rohrwege werden berücksichtigt. Ohne dokumentierten Hausanschluss lässt sich keine Auswirkung bestimmen. Netzwerkverbindungen haben keine verlässliche Versorgungsrichtung und liefern deshalb keine Abschaltliste.
- **Im Plan hervorheben:** Orange Linien markieren dokumentierte Leitungen; gestrichelte Linien zeigen Versorgungszuordnungen, keine tatsächlichen Kabelwege. Objekte erhalten einen orangefarbenen Ring. Geschosse können gewechselt werden; **Hervorhebung beenden** schaltet die Darstellung aus. Ausgeblendete Ebenen zunächst einblenden.

Die Ergebnisse beschreiben die dokumentierte Anlage. Sie schalten keine Geräte, Sicherungen oder Ventile und ersetzen keine Messung. Raumangaben werden aus den vorhandenen Raumflächen ermittelt.

## Bestand und Umbau

Unter **Objektakte und Umbauzustand** Bauteile als Bestand, geplant, Rückbau oder fertiggestellt kennzeichnen. **Hausakte → Bestand / Umbau** zeigt zwei Pläne desselben Geschosses mit gemeinsamem Bildausschnitt. Im Bestand fehlen geplante Objekte, im Zielzustand die zum Rückbau markierten. Fertiggestellte Objekte erscheinen in beiden Ansichten. Die Darstellung ändert keine Daten; sichtbare Ebenen werden berücksichtigt.

## Projektprüfung

**Hausakte → Projektprüfung** enthält Hinweise zu elektrischen Zuordnungen, Schutzgeräten und Leistungsangaben sowie zu doppelten Plan-Kennzeichnungen, offenen Abzweigdosen, unverbundenen Rohrkomponenten und fehlenden Netzwerk-Kabelverbindungen. Bei WLAN-Geräten kann eine fehlende Kabelverbindung beabsichtigt sein. Hinweise lassen sich filtern, im Plan aufsuchen und als CSV herunterladen. Die Prüfung ist eine Vollständigkeitsprüfung der Dokumentation, keine technische Abnahme.

## Wartungskalender

**Hausakte → Wartungen** bietet eine Monatsansicht. Ein Tag zeigt die zugehörigen Fälligkeiten aus Wartungsaufgaben, Hausobjekten und Objektakten. Darunter stehen die vorhandenen Eingaben für Aufgaben, Wiederholungsintervalle und Erledigungsprotokolle bereit.

**Termine als Kalenderdatei exportieren** lädt eine ICS-Datei mit den aktuell erfassten Fälligkeiten. Stabile Termin-IDs helfen Kalenderprogrammen beim Wiedererkennen; das genaue Importverhalten hängt vom Kalenderprogramm ab. Es gibt kein Kalenderabonnement und keine automatische Synchronisation. Folgetermine werden nach dokumentierter Erledigung berechnet und können erneut exportiert werden.

## Benannte Versionsstände

Unter **Hausakte → Wiederherstellung** einen Namen wie „Vor Gartenumbau“ eingeben und **Versionsstand sichern** wählen. Benannte Stände werden bei der automatischen Bereinigung nicht gelöscht. **Versionsstände laden** zeigt benannte und automatische Sicherungen für den Vergleich und Einzeldateiexport. Der Vergleich listet hinzugefügte, entfernte und geänderte Planobjekte sowie Änderungen an Geometrie, Geschossen und Fachdaten auf.

In der anschließenden Wiederherstellungsliste einen Stand auswählen und die Übernahme bestätigen. Vorher wird der aktuelle Stand gespeichert; die Übernahme lässt sich rückgängig machen. Ebenensperren bleiben wirksam. Die Stände liegen ausschließlich im jeweiligen Browser. Für eine vom Browser unabhängige Sicherung die gewünschte Version als JSON-Datei herunterladen; ein normaler Projektexport enthält nicht die gesamte lokale Versionshistorie.

## QR-Codes

Im Plan ein Gerät oder einen Verteiler auswählen und **QR-Code für dieses Objekt** öffnen. Der passende Eintrag ist bereits ausgewählt. Bei einer Einzelauswahl erscheinen Vorschau und PNG-Download; für mehrere Etiketten bleibt der PDF-Export verfügbar.

Die Anwendungsadresse muss auf dem scannenden Gerät erreichbar sein. Dort muss außerdem das passende Projekt vorhanden sein: Der QR-Code überträgt nur Projekt- und Objektkennung, nicht die Hausdaten. Über **Ziel testen** lässt sich die Verknüpfung vor dem Drucken prüfen.
