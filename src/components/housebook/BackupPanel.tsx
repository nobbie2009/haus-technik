import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useBackupLog, backupStatus, projectFingerprint, recordExport } from "../../persistence/backupLog";
import { downloadProject, importProjectText } from "../../persistence/projectFile";
import { projectRepository } from "../../persistence/indexedDbRepository";
import { activateProject } from "../dialogs/ProjectDialog";
import type { Project } from "../../models/project";
import { newId } from "../../utils/uuid";
import { Field } from "./shared";
export function BackupPanel() {
  const p = useProjectStore((s) => s.project),
    records = useBackupLog((s) => s.records),
    r = records[p.id],
    status = backupStatus(p);
  const [pending, setPending] = useState<{ project: Project; existing: Project | null; name: string } | null>(
      null,
    ),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <h3>Sicherung & Gerätewechsel</h3>
      <p>
        PC und iPad speichern jeweils in ihrem Browser. Übertrage die Projektdatei über einen Speicherort
        deiner Wahl und lies sie auf dem anderen Gerät ein. Es gibt keinen automatischen Abgleich.
      </p>
      <p role="status">{status.text}</p>
      {r && (
        <p>
          Export gestartet:{" "}
          {r.at ? new Date(r.at).toLocaleString("de-DE") : "nicht auf diesem Gerät dokumentiert"} ·
          Projektversion {r.version}
          {r.verifiedAt ? ` · Datei geprüft: ${new Date(r.verifiedAt).toLocaleString("de-DE")}` : ""}
        </p>
      )}
      <div className="book-actions">
        <button
          onClick={() =>
            void run(async () => {
              downloadProject(p);
              setMessage("Download gestartet. Prüfe, ob die Datei gespeichert wurde.");
            })
          }
        >
          Projekt sichern / mitnehmen
        </button>
      </div>
      <Field label="Gesicherte Datei prüfen">
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file)
              void run(async () => {
                const fileProject = importProjectText(await file.text());
                if (fileProject.id !== p.id || projectFingerprint(fileProject) !== projectFingerprint(p))
                  throw new Error(
                    "Die Datei entspricht nicht dem aktuell geöffneten Projektstand. Es wurde nichts übernommen.",
                  );
                recordExport(p, true);
                setMessage("Datei geprüft: Sie enthält genau den aktuellen Projektstand.");
              });
          }}
        />
      </Field>
      <h4>Projekt vom anderen Gerät übernehmen</h4>
      <Field label="Transferdatei auswählen">
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            setPending(null);
            if (file)
              void run(async () => {
                const incoming = importProjectText(await file.text()),
                  current = useProjectStore.getState().project;
                const existing =
                  incoming.id === current.id
                    ? structuredClone(current)
                    : await projectRepository.load(incoming.id);
                setPending({ project: incoming, existing, name: file.name });
              });
          }}
        />
      </Field>
      {pending && (
        <div className="home-summary">
          <h4>Dateivorschau: {pending.name}</h4>
          <p>
            {pending.project.name} · Version {pending.project.version} ·{" "}
            {new Date(pending.project.updatedAt).toLocaleString("de-DE")}
          </p>
          <p>
            {pending.project.floorOrder.length} Geschosse · {Object.keys(pending.project.rooms).length} Räume
          </p>
          {pending.existing ? (
            <>
              <p>
                Hier vorhanden: Version {pending.existing.version} ·{" "}
                {new Date(pending.existing.updatedAt).toLocaleString("de-DE")}
              </p>
              <p>
                {projectFingerprint(pending.project) === projectFingerprint(pending.existing)
                  ? "Datei und vorhandener Stand sind identisch."
                  : "Die Stände unterscheiden sich. Änderungen werden nicht automatisch zusammengeführt."}{" "}
                {Date.parse(pending.project.updatedAt) < Date.parse(pending.existing.updatedAt)
                  ? "Die Datei trägt einen älteren Änderungszeitpunkt."
                  : ""}
              </p>
              <p>
                Bei Übernahme ersetzt die Datei diesen Projektstand. Der bisherige Stand wird zuvor lokal
                gespeichert und bleibt in der Wiederherstellung verfügbar. Im Zweifel als separate Kopie
                öffnen.
              </p>
            </>
          ) : (
            <p>
              Dieses Projekt ist hier noch nicht vorhanden. Dein bisheriges Projekt bleibt separat
              gespeichert.
            </p>
          )}
          <div className="book-actions">
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const current = useProjectStore.getState().project,
                    latest =
                      pending.project.id === current.id
                        ? current
                        : await projectRepository.load(pending.project.id);
                  if (
                    (latest ? projectFingerprint(latest) : null) !==
                    (pending.existing ? projectFingerprint(pending.existing) : null)
                  )
                    throw new Error(
                      "Der lokale Stand hat sich seit der Vorschau geändert. Datei bitte erneut auswählen.",
                    );
                  await activateProject(pending.project);
                  setPending(null);
                  setMessage("Projektstand übernommen. Prüfe ihn vor der weiteren Bearbeitung.");
                })
              }
            >
              {pending.existing ? "Diesen Stand bewusst übernehmen" : "Projekt öffnen"}
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const copy = structuredClone(pending.project);
                  copy.id = newId();
                  copy.name = `${copy.name.slice(0, 100)} · Importkopie`;
                  copy.createdAt = new Date().toISOString();
                  copy.updatedAt = copy.createdAt;
                  await activateProject(copy);
                  setPending(null);
                  setMessage("Import als separates Projekt geöffnet.");
                })
              }
            >
              Als separate Kopie öffnen
            </button>
            <button disabled={busy} onClick={() => setPending(null)}>
              Vorschau schließen
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <p>
        Der Sicherungsnachweis gilt für diesen Browser. Ein Export bestätigt noch nicht, dass eine Datei
        dauerhaft auf einem anderen Gerät liegt. Vor dem Wechsel zuerst sichern, dann am Zielgerät die Datei
        übernehmen und dort weiterarbeiten.
      </p>
    </section>
  );
}
