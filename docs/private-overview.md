# Private Hausübersicht

Seit Version 0.18.0 stehen in der **Hausakte** sechs zusätzliche beziehungsweise erweiterte Bereiche bereit. Die Daten gehören zum geöffneten Projekt und werden automatisch lokal gespeichert. Mit **JSON exportieren** sicherst du auch Fotos, Ablesungen und Wartungsverläufe. PC und iPad haben weiterhin getrennte lokale Speicher; zum Übertragen dient die Projektdatei.

## Internet & WLAN

Anbieter, Anschlussart und dokumentierte Download-/Uploadrate erfassen. Im bestehenden Netzwerkbereich Router, Access Points, Repeater, Clients, Dosen und Patchpanel platzieren und Kabelports zuordnen. Oben ein Gerät auswählen und WLAN-Name (SSID), Frequenzbänder, IP-/MAC-Adresse, Standort, versorgte Räume sowie Empfangs- und Verbindungsnotizen ergänzen. Es findet keine automatische Netzwerksuche oder Funkabdeckungsberechnung statt.

## Absperrstellen und Rauchmelder

Einträge mit Bezeichnung, Standort, Hersteller, Modell, Seriennummer, Foto und Unterlagen-Link anlegen. Bei Absperrstellen beschreiben, was sie versorgen beziehungsweise sperren. Bereits im Rohrnetz angelegte Absperrventile werden automatisch mit Medium, Geschoss und dokumentiertem Schaltzustand aufgelistet; über **Ventil im Plan** gelangst du zu ihnen.

Bei Rauchmeldern lassen sich Versorgung/Batterie, Installationsdatum, letzte Prüfung, nächste Prüfung und geplanter Austausch dokumentieren. Die nächsten Termine erscheinen unter **Wartungen**. Ein vorhandenes Planobjekt kann verknüpft werden. Wird es gelöscht, bleibt der persönliche Eintrag erhalten und zeigt die fehlende Verknüpfung an.

**Letzte Planposition übernehmen** setzt eine Markierung auf dem aktuellen Geschoss an der zuletzt im Editor verwendeten Position. X/Y und Geschoss sind danach bearbeitbar. Markierungen erscheinen im Gesamtplan und dessen PDF-/SVG-Ausgabe; die Einträge stehen auch in der Material-/Bestandsliste. Der verknüpfte Verbraucher und sein persönlicher Eintrag sind dort getrennte Datensätze, keine Mengenaddition.

## Zähler & Verbrauch

1. Zähler mit Art, Einheit, Nummer und Standort anlegen. Strom, Wasser, Gas, Wärme, Solarertrag und sonstige Zähler sind möglich.
2. Zu jeder Ablesung Datum und kumulierten Zählerstand eintragen; pro Datum ist eine Ablesung möglich. Über **Korrigieren** lassen sich Werte berichtigen.
3. Nach zwei Ablesungen zeigt die eigene Verbrauchsübersicht Differenz, tatsächlich erfasste Tage und Tagesmittel. Ein optionaler Rechenpreis liefert eine Kostenschätzung ohne Grundgebühren. Eine spätere Preisänderung gilt für die gesamte dargestellte Schätzung, nicht als historischer Tarifverlauf.
4. Mit dem Zeitraumfilter vollständige Ableseintervalle auswählen. Es gibt keine Interpolation auf Monatsgrenzen. Strom, Gas, Wasser und Ertrag werden nicht zu einer unpassenden Gesamtsumme vermischt.
5. Bei einem Zählerwechsel **Zählerwechsel / Neustart seit letzter Ablesung** markieren. Das Intervall über den Wechsel bleibt unbekannt; erst nach der nächsten Ablesung beginnt wieder ein berechenbares Intervall. Sinkende Werte ohne diese Kennzeichnung werden abgelehnt.
6. Ablesungen und gefilterte Verbrauchsintervalle getrennt als CSV exportieren.

Einheiten sind nach der ersten Ablesung gesperrt. Für einen anderen Messkanal einen neuen Zähler anlegen. Ein Planobjekt kann verknüpft werden; ein dort vorhandener undatierter Zählerstand wird nicht automatisch als heutige Ablesung übernommen. Gasvolumen wird nicht ohne weitere Angaben in Energie umgerechnet. Solarwerte dokumentieren Ertrag; sie stellen keine Anlagen- oder Wirtschaftlichkeitssimulation dar.

## Wartungen

Die Terminliste vereint Wartungsaufgaben, nächste Prüfungen/Austauschdaten der Hausobjekte und vorhandene Wartungstermine aus Objektakten. Überfällige und heute fällige Termine sind bezeichnet und auf der Übersicht gezählt.

Eigene Aufgaben mit Standort, Notizen, Planverknüpfung oder zugehörigem Hausobjekt anlegen. **Erledigen** dokumentiert Datum und Notiz in der Historie. Bei Wiederholung wird der nächste Termin vom Erledigungsdatum aus berechnet; Monatsenden werden korrekt gekürzt. Mit null Monaten wird eine einmalige Aufgabe abgeschlossen. Prüf-/Austauschdaten an Hausobjekten weiterhin im jeweiligen Eintrag aktualisieren. Es gibt keine Hintergrund- oder Push-Benachrichtigungen.

## Garten & Außenlicht

Gartenobjekte und Außenbeleuchtung mit Standort, Foto, Pflege-/Bedienhinweisen und Terminen erfassen. Für Leuchten zusätzlich Watt und Steuerung dokumentieren. Nach Übernahme einer Planposition legt **Als elektrischen Verbraucher anlegen** einen verbundenen elektrischen Datensatz an. Watt werden dabei einmalig übernommen; spätere elektrische Änderungen im Plan bearbeiten. Dort Stromkreis, Anschluss und Schalter wie bei anderen Verbrauchern zuordnen. Die Leuchte startet ohne erfundenen Stromanschluss und ausgeschaltet. Gartenobjekte erhalten eine Planmarkierung; sie sind keine maßstäblichen Möbelmodelle.

## iPad im heimischen WLAN

Auf dem PC `npm run start:lan` starten und die angezeigte Netzwerkadresse im iPad-Browser öffnen. Die Hausakte unterstützt Touch-Eingaben, Dateiauswahl für Fotos sowie Hoch- und Querformat. Die automatisierte Prüfung nutzt WebKit mit iPad-Profil; ein Test auf einem physischen iPad bleibt sinnvoll.
