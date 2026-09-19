# Elektrik-Erweiterungen · App 0.11.0 / Schema 10

## Schaltgruppen

`electrical.controls` enthält räumliche `SwitchingControl`-Objekte mit stabiler UUID, `mode`, `circuitId`, geordneter `switchIds`-Liste, `initialOn` und `inverted`. Die Liste bildet zwei Wechselschalter und beliebig viele dazwischenliegende Kreuzschalter ab. Die Rolle eines vorhandenen `LightSwitch` wird aus Mitgliedschaft und Listenposition abgeleitet; sein historisches `type: singlePole` bleibt der Basistyp eines einzelnen Bedienobjekts. Schalter können nicht zugleich direkt Verbraucher oder eine Reihenschaltung steuern. Verbraucher referenzieren alternativ `controlId` oder `switchId`.

Das reine Modul `electrical/switchingControls.ts` berechnet die Durchgängigkeit der zwei korrespondierenden Pfade über deren Vertauschungen. `simulation/graph.ts` ergänzt den Leistungspfad Stromkreis → Schaltgruppe → Verbraucher. Bei Wechsel-/Kreuzschaltungen invertiert jede Stellung genau einmal den Ausgang. Unvollständige Gruppen bleiben ohne Versorgung. Kontaktbelegungen sind weiterhin Dokumentation und werden nicht als vollständiger Leitergraph gelöst.

Beim Stromstoßrelais ist die Liste eine Menge von Tastern. `simulation/operateSwitch.ts` führt einen einzelnen Impuls aus und prüft vorher die Verfügbarkeit des Steuerstromkreises. `SimulationScenario.relayStates` enthält ausschließlich temporäre Zustände. Ein Ausfall nimmt dem Verbraucher die Versorgung, löscht aber nicht den bistabilen Relaiszustand. Dies ist kein monostabiles Spulenrelais und kein Modell von Spulenstrom, Verzögerungen oder separaten Steuerkreisen.

Gruppen und Trafos verwenden die gleichen räumlichen Editoraktionen, Sperren und Transaktionen wie andere Elektroobjekte. Löschen eines Gruppenmitglieds leert die Zuordnung, damit fehlende Kontakte nicht überbrückt werden. Kopieren einer Gruppe übernimmt nur gemeinsam kopierte Mitglieder. Verknüpfte Verbraucherkopien referenzieren die neue Gruppe. Szenarioänderungen erzeugen weder Dokumentrevisionen noch Undo-Schritte.

## Transformatoren

`electrical.transformers` enthält Position, Primärstromkreis, `primaryVoltage`, `secondaryVoltage`, `ratedVA`. Verbraucher referenzieren `transformerId` und behalten den zugehörigen Primärstromkreis. Die Zuordnung benötigt einen einphasigen Festanschluss. Gelöschte Trafos trennen Verbraucher, statt sie direkt an Netzspannung anzuschließen.

Der Versorgungspfad ist Stromkreis → Trafo → Verbraucher. Das ideale Übersetzungsverhältnis liefert `U2 = U1 × Un2 / Un1`. Sekundärströme werden am Trafo gesammelt; oberhalb des Trafos werden Wirk- und Blindstromanteile mit `Un2 / Un1` auf die Primärseite umgerechnet. Wirkleistung bleibt erhalten und wird je Vorfahr einmal gezählt. Nennstromgrenze sekundär: `ratedVA / secondaryVoltage`. Überlast wird angezeigt, nicht automatisch abgeschaltet. Keine Verluste, Leerlaufströme oder geregelten DC-Netzteile.

Bei zusätzlicher Schalter-/Gruppenzuordnung wirkt deren Versorgung als funktionale Freigabe des Sekundärverbrauchers. Sein Leistungspfad läuft über den Trafo. Stromanzeigen für die separat modellierten Schaltstellen bilden in diesem Fall nicht den sekundären Leiterstrom ab. Die Relaissteuerung bleibt am Primärstromkreis; separate Kleinspannungs-Steuerkreise sind noch nicht enthalten.

## Geschossleitungen

`Cable.floorId` ist weiterhin die Startetage. `riser: Vec2 | null` bezeichnet eine senkrechte Steigstrecke an gemeinsamen Weltkoordinaten. `path` enthält Wegpunkte der Startetage; `endPath` diejenigen der Zieletage. Etagen der Endobjekte stammen aus ihren ID-Referenzen. Gleiche Etage erfordert `riser: null` und leeren Zielweg; verschiedene Etagen erfordern einen Steigpunkt.

`cableFloorPath` liefert nur die Teilgeometrie einer Etage für Rendering, Hit-Test und Kamera. Beide Endetagen zeigen dieselbe Leitung mit Übergangsmarkierung und Geschossverweis. Die Objektliste zeigt sie auf beiden Etagen. `cableLengths` berechnet horizontale Teilwege + absolute Höhendifferenz + Reserve. Keine redundante Länge wird gespeichert. Änderungen einer Geschosshöhe verändern die Steigstrecke; gesperrte Leitungen schützen auch diesen indirekten Einfluss. Zwischenetagen werden noch nicht separat dargestellt.

Der Anschlussdialog zeigt Endobjekte aller Etagen. Eine leere Kontaktliste ist ausdrücklich ein dokumentierter Leitungsweg. Stromkreis- und Verbraucherzuordnung bleiben getrennt; die gezeichnete Leitung speist nicht automatisch eine ganze Installation.

## Migration und Prüfung

Schema 9 wird strikt geprüft. Migration ergänzt leere Gruppen-/Trafotabellen, `controlId: null`, `transformerId: null` sowie `riser: null`, `endPath: []`. IDs, Bestandswerte, Revision und Zeitstempel bleiben erhalten. Alle älteren Migrationsstufen laufen anschließend durch diese Stufe. Import, Export und IndexedDB verwenden dieselbe Validierung.

Tests prüfen sämtliche Schalterstellungen für zwei bis vier Schaltstellen, Relaisimpulse bei Ausfall und Wiederkehr, Primär-/Sekundärströme, Überlast und fehlende Daten, Lösch-/Kopierregeln, Etagengeometrie, Sperren, Migrationen und Browserabläufe.
