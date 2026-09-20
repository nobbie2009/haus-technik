# GitHub-Vorbereitung

Enthalten sind reproduzierbare npm-Abhängigkeiten, CI für TypeScript, Modelltests, Build,
Desktop-Browser und WebKit-iPad-Profil, Dependabot sowie Vorlagen für Fehler und Pull Requests.
Die Actions sind auf konkrete Commit-IDs festgelegt; CI benötigt keine eigenen Secrets und hat
nur lesenden Repository-Zugriff. Ein CI-Lauf auf GitHub kann erst nach dem Hochladen erfolgen.

## Ein vorhandenes Repository verbinden

Ein leeres privates Repository auf GitHub anlegen oder ein vorhandenes, passendes Repository verwenden.
Anschließend im Projektordner dessen echte URL einsetzen:

```powershell
git remote add origin https://github.com/DEIN-KONTO/DEIN-REPOSITORY.git
git push -u origin HEAD
```

Wenn bereits ein Remote `origin` existiert, zuerst `git remote -v` prüfen.
Ein nicht leeres fremdes Repository nicht überschreiben; dessen Historie zuerst abgleichen.

Alternativ legt `gh repo create Home-Technik --private --source . --remote origin --push`
ein neues privates Repository an und lädt den aktuellen Branch hoch. Dies ist eine Veröffentlichung
des lokalen Git-Inhalts an GitHub und wird nur bei entsprechendem Auftrag ausgeführt.

## Repository-Einstellungen nach dem ersten Push

- Den aktuellen Hauptbranch als Standardbranch festlegen.
- Actions aktivieren und den erfolgreichen Job `check` als erforderliche Prüfung für Pull Requests wählen.
- Direkte Änderungen am Hauptbranch über eine Branch-Regel einschränken, sofern der GitHub-Tarif dies unterstützt.
- Private Sicherheitsmeldungen aktivieren, sofern verfügbar.

## Daten und Lizenz

Browserdaten aus IndexedDB sind kein Bestandteil des Repositories. `.gitignore` schließt unter anderem
`.env`, Schlüsseldateien, `*.homeplan.json`, `exports/`, `backups/` und `personal-data/` aus.
Anders benannte private Dateien müssen ebenfalls außerhalb der Versionsverwaltung bleiben.

Eine eigene Open-Source-Lizenz wurde noch nicht festgelegt. Diese Vorbereitung erteilt keine neue Lizenz.
Vor einer öffentlichen Freigabe die gewünschte Lizenz festlegen. Die mitgelieferte Schrift hat ihre
eigene Lizenz in [public/fonts/LICENSE.txt](../public/fonts/LICENSE.txt); npm-Pakete behalten ihre jeweiligen Lizenzen.
