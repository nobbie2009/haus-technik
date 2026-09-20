# Mitarbeit

## Lokal starten

Node.js 24 oder neuer installieren, dann `npm ci` und `npm run dev` ausführen.
Die [README](README.md) beschreibt Funktionen und Start; die [Architektur](docs/architecture.md)
erläutert Datenmodell, Geometrie und Editorzustand.

## Änderungen

- Fachberechnungen als reine Funktionen halten; keine Änderungen am Projekt während einer Simulation.
- Projektänderungen über validierte Transaktionen durchführen und Undo/Redo erhalten.
- Änderungen am Dateiformat mit Validierung und gegebenenfalls Migration versehen.
- Oberfläche ohne Maus/Tastatur auf dem iPad bedienbar halten.
- Fachliche Grenzen einer Berechnung ausdrücklich dokumentieren; unbekannte Werte bleiben unbekannt.
- Für Git nur Quellcode und synthetische Testdaten verwenden. Echte Exporte gehören in `personal-data/`.

Vor einem Pull Request:

```powershell
npm run format:check
npm run check
npm run build
npm run test:e2e
npm run test:ipad
```

Für die Browserprüfungen einmalig `npx playwright install chromium webkit` ausführen.
Unter Windows verwendet der Desktop-Test standardmäßig installiertes Chrome; alternativ
`$env:PLAYWRIGHT_CHANNEL = 'chromium'`. Linux-CI installiert Browser einschließlich Systemabhängigkeiten.

Relevante Tests und Dokumentation mit der Änderung aktualisieren, im deutschen Changelog festhalten
und im Pull Request Problem, neues Verhalten und ausgeführte Prüfungen beschreiben.
