# Projektregeln

- App-Footer und jede erzeugte PDF-Seite zeigen Appname, aktuelle Build-Version und
  `Copyright by nobbie2009`. Für neue PDF-Ausgaben den gemeinsamen Footer verwenden.

- Jede ausgelieferte Änderung erhält eine höhere App-Version in `package.json` und `package-lock.json`:
  mindestens Patch, bei neuen Funktionen Minor. Vor einem neuen Update den letzten Stand von `origin/master`
  prüfen. Nicht dieselbe Versionsnummer für unterschiedliche ausgelieferte Stände verwenden.
- Deutschen Eintrag in `CHANGELOG.md` ergänzen, passende Prüfungen ausführen und Änderungen auf GitHub sichern,
  soweit der aktuelle Auftrag dies autorisiert. CI veröffentlicht nach erfolgreichen Prüfungen das Release.
- Deployment-Skill unter `.agents/skills/home-technik-proxmox-lxc` mit Änderungen an den dortigen Skripten
  konsistent halten. Keine privaten Hostadressen, Zugangsdaten oder echten Hausdaten einchecken.
