# Verdrahtete Simulation ab 0.14.0

Die **Hausakte → Leiterprüfung** berechnet ausdrücklich dokumentierte Aderverbindungen.
Die Versorgungssimulation und die Betriebsanzeigen im Plan bleiben ein getrenntes funktionales Modell.
Eine logische Stromkreis- oder Relaiszuordnung allein erzeugt in der Leiterprüfung keine Versorgung.

## Stromstoßrelais

Ein Relais der Art „Stromstoßrelais mit Tastern“ besitzt A1/A2 für die ideale Spule sowie COM/NO für
den bistabilen Schaltkontakt. Seine zugeordneten Schaltstellen werden als Taster L/NO dargestellt.
Im Ruhezustand sind Taster offen, unabhängig von der dokumentierten Stellung eines früheren Schalters.

Unter **Schalterstellungen testen** sendet **Tastimpuls** einen vollständigen Druck-/Loslassvorgang.
Die Berechnung vergleicht die Versorgung an A1/A2 vor und während des Drucks. Nur eine neu auftretende,
vollständige Außenleiter-/Neutralleiterversorgung derselben Quelle schaltet den Relaiszustand um.
Unterbrochene Tasteradern, fehlendes A2 oder ausgefallene Einspeisung erzeugen keinen Impuls.
Ein bereits gehaltener Taster erzeugt beim erneuten Prüfen keine weitere Flanke.

Die Verdrahtung bestimmt, welche Relais tatsächlich reagieren. COM/NO führt die Lastversorgung;
der Zustand bleibt bei einem Ausfall der Spulenspeisung gespeichert. Spulennennspannung und -leistung,
Anzugszeiten, Kontaktprellen und dynamische Rückkopplungen mehrerer Relais sind nicht modelliert.
Der Ausgangszustand steht am Relais, der veränderte Zustand ausschließlich im Szenario.

## Fehlerstrom-Szenarien

1. Einen einphasigen Netzverbraucher unter **Fehlerort** wählen.
2. **L–PE** oder **L–N** wählen.
3. Den angenommenen **Gesamtwiderstand des Fehlerkreises** in Ohm eingeben.
4. **Fehler simulieren** betätigen. Mehrere Fehler an verschiedenen Verbrauchern sind möglich.

Der eingegebene Wert steht für die gesamte rein ohmsche Fehlerschleife. Leitungs- und Quellenimpedanzen
werden nicht zusätzlich geschätzt. I = U/R verwendet die tatsächlich dokumentierte Quellspannung.
Das Modell setzt eine passende geerdete Quelle und für L–PE einen dokumentierten PE-Rückweg zu dieser
Quelle voraus. Ein fehlender PE liefert **Unbestimmt**, nicht einen behaupteten sicheren Nullstrom.
Kleinspannungs-/Trafoverbraucher und dreiphasige Fehlerorte sind hier nicht enthalten.

Ein Fehler liegt am Geräteeingang und bleibt daher auch bei dokumentierter Betriebsart „Aus“ bestehen.
Ein tatsächlich geöffneter vorgelagerter Außenleiter unterbricht ihn. Der Schutzleiter bleibt beim
Abschalten von Schutzgeräten, Stromkreisen oder Verteilern kontinuierlich; eine unterbrochene
dokumentierte PE-Ader wird hingegen als fehlender Rückweg erkannt.

## FI/RCD-Modell

Geschützte Verteilerpfade tragen die IDs ihrer Schutzkette. Die Berechnung verfolgt Hin- und Rückweg
im Leitergraphen, statt den Fehler über eine bloße Verbraucher-Stromkreiszuordnung zuzuweisen.
Der Fehlerstrom zählt auf einem nach außen gerichteten Schutzpfad positiv und auf dem Rückweg negativ.
Bei einem L–N-Fehler mit Rückweg durch denselben FI hebt sich der Differenzstrom auf. Ein Neutralleiter
am FI vorbei kann dagegen auch bei L–N einen Differenzstrom erzeugen.

Mehrere rein ohmsche Fehler werden mit den festen Außenleiterwinkeln 0°, −120° und +120° vektoriell
zusammengeführt. Die Modellschwelle ist der dokumentierte Bemessungsdifferenzstrom `residualCurrent`
in mA. Ein RCD/RCBO schaltet im Modell ab, wenn der Betrag diese Schwelle erreicht. Anschließend wird
der Leitergraph neu aufgebaut; Fehlerstrom vor Abschaltung, verbleibender Strom und betroffene
Verbraucher werden getrennt angezeigt. Alle erreichten Schwellen reagieren gleichzeitig.

Das ist keine Zeit-/Selektivitätsrechnung. Reale RCDs können bereits zwischen 0,5 IΔn und IΔn reagieren;
„Unter Modellschwelle“ ist daher kein Nachweis, dass ein echtes Gerät eingeschaltet bleibt.
Grundlagen: [Schneider Electric – RCD-Prinzip](https://www.electrical-installation.org/enwiki/Description_of_RCDs)
und [Ansprechbereich](https://www.electrical-installation.org/enwiki/Sensitivity_of_RCDs_to_disturbances).

Parallele ideale Leiterpfade lassen die Stromaufteilung ohne ein Impedanznetz offen. Bei ihnen, bei
unvollständigen Fehlerpfaden oder widersprüchlichen Einspeisungen wird keine automatische Schutzreaktion
behauptet. Fehlende FI-Schwellen bleiben unbekannt. Ohne dokumentierten RCD gibt es keine FI-Abschaltung.
LS-/Schmelzsicherungs-Auslösung, Erdungsnetz, Körperströme, Dauerableitströme normaler Verbraucher,
Frequenz-/DC-Einflüsse und echte Auslösezeiten sind nicht enthalten. Es entsteht kein Installationsnachweis.

## Speicherung und Rücksetzen

Die simulierten Fehler ändern das Projekt nicht. **Szenarien → Aktuellen Zustand speichern** legt
Fehlerorte, Widerstände und Relaiszustände in der Hausakte ab; sie gelangen damit auch in den JSON-Export.
Bis zu 100 Fehlereinträge sind zulässig. Die neue optionale Szenarioeigenschaft `conductorFaults` hält
alte Dateien weiterhin lesbar; gelöschte Fehlerorte werden beim Szenarioladen ausgelassen.

Abschaltungen werden aus dem aktuellen Szenario erneut berechnet und sind kein dauerhaft eingerasteter
FI-Zustand. **Fehler entfernen** beseitigt den Fehler und berechnet die Versorgung neu.
Der Szenariovergleich zeigt Lastwerte der funktionalen Simulation und kennzeichnet enthaltene
Leiterfehler ausdrücklich; deren Reaktion wird in der Leiterprüfung betrachtet.
