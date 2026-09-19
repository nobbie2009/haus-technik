import { useEffect, useState } from "react";
import { FolderOpen, FilePlus2 } from "lucide-react";
import { Modal } from "./Modal";
import { projectRepository } from "../../persistence/indexedDbRepository";
import type { ProjectSummary } from "../../persistence/projectRepository";
import { saveNow } from "../../persistence/autosave";
import { createProject } from "../../core/projectFactory";
import { useProjectStore, errorMessage } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { fitView } from "../../editor/interaction/commands";
import type { Project } from "../../models/project";

export async function activateProject(project: Project, saved = false): Promise<void> {
  const current = useProjectStore.getState().project;
  await saveNow();
  if (useProjectStore.getState().project !== current) {
    throw new Error(
      "Der aktuelle Entwurf wurde während des Speicherns geändert. Bitte den Projektwechsel erneut ausführen.",
    );
  }
  useProjectStore.getState().replace(project, saved);
  useEditorStore.getState().setFloor(project.floorOrder[0]!);
  useEditorStore.getState().setCategory("building");
  fitView();
  await saveNow();
}

export function ProjectDialog({ mode, onClose }: { mode: "new" | "open"; onClose: () => void }) {
  const [name, setName] = useState("Mein Haus");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (mode === "open")
      void projectRepository
        .list()
        .then(setProjects)
        .catch((err: unknown) => setError(errorMessage(err)));
  }, [mode]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      onClose();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };
  return (
    <Modal title={mode === "new" ? "Neues Projekt" : "Lokale Projekte"} onClose={onClose}>
      <p className="modal-intro">
        {mode === "new"
          ? "Beginne mit einer leeren Etage. Dein bisheriges Projekt bleibt lokal gespeichert."
          : "Diese Projekte sind in diesem Browser gespeichert. Für eine Sicherung kannst du sie als JSON exportieren."}
      </p>
      {mode === "new" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => activateProject(createProject(name.trim())));
          }}
        >
          <label className="field">
            Projektname
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>
              Abbrechen
            </button>
            <button className="primary" type="submit" disabled={busy}>
              <FilePlus2 size={16} /> Projekt erstellen
            </button>
          </div>
        </form>
      ) : (
        <div className="project-list">
          {projects.map((project) => (
            <button
              key={project.id}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await saveNow();
                  const loaded = await projectRepository.load(project.id);
                  if (!loaded) throw new Error("Projekt wurde nicht gefunden.");
                  await activateProject(loaded, true);
                })
              }
            >
              <FolderOpen size={22} />
              <span>
                <strong>{project.name}</strong>
                <small>
                  {project.floors} Etagen · {project.rooms} Räume ·{" "}
                  {new Date(project.updatedAt).toLocaleString("de-DE")}
                </small>
              </span>
            </button>
          ))}
          {!projects.length && !error && <p className="muted">Noch keine lokal gespeicherten Projekte.</p>}
        </div>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}
