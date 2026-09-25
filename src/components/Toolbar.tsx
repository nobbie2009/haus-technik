import { lazy, Suspense, useRef, useState, useEffect } from "react";
const House3DDialog = lazy(() => import("./House3DDialog").then((m) => ({ default: m.House3DDialog })));
const HousebookDialog = lazy(() =>
  import("./housebook/HousebookDialog").then((m) => ({ default: m.HousebookDialog })),
);
const ConstructionDialog = lazy(() =>
  import("./housebook/ConstructionDialog").then((m) => ({ default: m.ConstructionDialog })),
);
import {
  PencilRuler,
  FilePlus2,
  FolderOpen,
  Save,
  Download,
  Upload,
  Undo2,
  Redo2,
  Check,
  LoaderCircle,
  CircleAlert,
  HelpCircle,
  LayoutTemplate,
} from "lucide-react";
import { useProjectStore, errorMessage } from "../stores/projectStore";
import { useEditorStore } from "../stores/editorStore";
import { saveNow } from "../persistence/autosave";
import { downloadProject, importProjectText } from "../persistence/projectFile";
import { ProjectDialog, activateProject } from "./dialogs/ProjectDialog";
import { Modal } from "./dialogs/Modal";
import { createDemoProject } from "../editor/demoProject";
import type { DisplayUnit } from "../models/common";
import { readQrLink } from "../housebook/qr";
import { UpdateStatus } from "./UpdateStatus";
import { useSharedProjects } from "../persistence/sharedProjects";

export function Toolbar() {
  const shared = useSharedProjects();
  const project = useProjectStore((s) => s.project);
  const status = useProjectStore((s) => s.saveStatus);
  const past = useProjectStore((s) => s.past);
  const future = useProjectStore((s) => s.future);
  const [dialog, setDialog] = useState<"new" | "open" | null>(null);
  const [help, setHelp] = useState(false);
  const [book, setBook] = useState(false);
  const [construction, setConstruction] = useState(false);
  const [three, setThree] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const showGrid = useEditorStore((s) => s.showGrid);
  const measurements = useEditorStore((s) => s.showMeasurements);
  const ready = useEditorStore((s) => s.ready);
  const [qrTarget, setQrTarget] = useState<ReturnType<typeof readQrLink>>(null);
  useEffect(() => {
    if (!ready) return;
    const read = () => {
      const target = readQrLink(window.location.hash);
      setQrTarget(target);
      if (target) setBook(true);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [ready]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      useProjectStore.setState({ error: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <header className="app-header">
        <div className="brand">
          <PencilRuler size={22} />
          <div>
            HOME<span>TECHNIK</span>
          </div>
        </div>
        <div className="header-divider" />
        <div className="project-heading">
          <strong>{project.name}</strong>
          <span>Technischer Hausplaner</span>
        </div>
        <div className={`save-indicator ${status}`} aria-live="polite">
          {status === "saved" ? (
            <Check size={14} />
          ) : status === "saving" ? (
            <LoaderCircle size={14} />
          ) : status === "error" ? (
            <CircleAlert size={14} />
          ) : (
            <span className="unsaved-dot" />
          )}
          {
            {
              dirty: "Ungespeichert",
              saving: "Speichert …",
              saved: "Lokal gespeichert",
              error: "Speicherfehler",
            }[status]
          }
        </div>
        <UpdateStatus />
      </header>
      <div className="command-bar">
        <div className="project-commands">
          <button
            onClick={() => setDialog("new")}
            disabled={!ready || busy}
            title="Neues Projekt"
            aria-label="Neu"
          >
            <FilePlus2 size={16} />
            <span>Neu</span>
          </button>
          <button onClick={() => setDialog("open")} disabled={!ready || busy} aria-label="Öffnen">
            <FolderOpen size={16} />
            <span>Öffnen</span>
          </button>
          <button
            onClick={() => void run(saveNow)}
            disabled={!ready || busy}
            title="Lokal speichern (Strg+S)"
            aria-label="Speichern"
          >
            <Save size={16} />
            <span>Speichern</span>
          </button>
        </div>
        <div className="toolbar-divider" />
        <div className="toolbar-group">
          <button
            onClick={() => {
              useEditorStore.getState().cancel();
              useProjectStore.getState().undo();
            }}
            disabled={!past.length}
            aria-label="Rückgängig"
            title={`Rückgängig (Strg+Z)${past.at(-1) ? `: ${past.at(-1)!.label}` : ""}`}
          >
            <Undo2 size={17} />
          </button>
          <button
            onClick={() => {
              useEditorStore.getState().cancel();
              useProjectStore.getState().redo();
            }}
            disabled={!future.length}
            aria-label="Wiederholen"
            title="Wiederholen (Strg+Shift+Z)"
          >
            <Redo2 size={17} />
          </button>
        </div>
        <div className="toolbar-divider" />
        <label className="toolbar-check">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(event) => useEditorStore.setState({ showGrid: event.target.checked })}
          />
          Raster
        </label>
        <label className="toolbar-check">
          <input
            type="checkbox"
            checked={measurements}
            onChange={(event) => useEditorStore.setState({ showMeasurements: event.target.checked })}
          />
          Maße
        </label>
        <select
          className="unit-select"
          aria-label="Anzeigeeinheit"
          value={project.units.display}
          onChange={(event) =>
            useProjectStore.getState().commit("Anzeigeeinheit ändern", (draft) => {
              draft.units.display = event.target.value as DisplayUnit;
            })
          }
        >
          <option value="mm">mm</option>
          <option value="cm">cm</option>
          <option value="m">m</option>
        </select>
        <div className="toolbar-spacer" />
        <button disabled={!ready || busy} onClick={() => setThree(true)}>
          3D-Hausansicht
        </button>
        {three && (
          <Suspense fallback={<p>3D wird geladen …</p>}>
            <House3DDialog key={project.id} onClose={() => setThree(false)} />
          </Suspense>
        )}
        <button disabled={!ready || busy} onClick={() => setBook(true)}>
          Hausakte
        </button>
        <button disabled={!ready || busy} onClick={() => setConstruction(true)}>
          Baustelle
        </button>
        {shared.token && (
          <span className="shared-project-status" role="status" title={shared.message}>
            {shared.remoteChanged ? "Serverstand prüfen" : shared.busy ? "Serverabgleich …" : shared.message}
          </span>
        )}
        <button
          className="example-button"
          disabled={!ready || busy}
          onClick={() => void run(() => activateProject(createDemoProject()))}
          title="Beispielgrundriss öffnen"
          aria-label="Beispielgrundriss öffnen"
        >
          <LayoutTemplate size={16} />
          <span>Beispiel</span>
        </button>
        <button
          title="JSON importieren"
          aria-label="JSON importieren"
          disabled={!ready || busy}
          onClick={() => fileInput.current?.click()}
        >
          <Upload size={16} />
        </button>
        <button
          title="JSON exportieren"
          aria-label="JSON exportieren"
          onClick={() => {
            try {
              downloadProject(project);
            } catch (error) {
              useProjectStore.setState({ error: errorMessage(error) });
            }
          }}
        >
          <Download size={16} />
        </button>
        <button className="subtle" aria-label="Tastaturhilfe" onClick={() => setHelp(true)}>
          <HelpCircle size={18} />
        </button>
        <a href="./handbuch/index.html" target="_blank" rel="noopener" className="handbook-link">
          Handbuch
        </a>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          aria-label="Projektdatei importieren"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file)
              void run(async () => {
                const imported = importProjectText(await file.text());
                await activateProject(imported);
                useEditorStore.setState({ message: `„${imported.name}“ wurde importiert.` });
              });
          }}
        />
      </div>
      {dialog && <ProjectDialog mode={dialog} onClose={() => setDialog(null)} />}
      {construction && (
        <Suspense fallback={<p>Baustellenansicht wird geladen …</p>}>
          <ConstructionDialog onClose={() => setConstruction(false)} />
        </Suspense>
      )}
      {book && (
        <Suspense fallback={<span role="status">Hausakte wird geöffnet …</span>}>
          <HousebookDialog
            key={project.id}
            qrTarget={qrTarget}
            onClose={() => {
              setBook(false);
              setQrTarget(null);
              if (readQrLink(window.location.hash))
                window.history.replaceState(null, "", window.location.pathname + window.location.search);
            }}
          />
        </Suspense>
      )}
      {help && (
        <Modal title="Schnell und präzise zeichnen" onClose={() => setHelp(false)}>
          <p>
            <a href="./handbuch/index.html" target="_blank" rel="noopener">
              Ausführliches Handbuch mit Bildern, FAQ und Stichwortsuche öffnen
            </a>
          </p>
          <div className="help-grid">
            {[
              ["V / H", "Auswahl / Pan"],
              ["E", "Elektrik platzieren und dokumentieren"],
              ["L", "Leitungsweg zwischen Elektroobjekten zeichnen"],
              ["M", "Möbel / freie Objekte platzieren"],
              ["W / R / P", "Wand / Rechteckraum / freier Raum"],
              ["D / T / F", "Bemaßung / Tür / Fenster"],
              ["4350 + Enter", "Wandlänge exakt in mm festlegen"],
              ["Shift", "Rechtwinklig zeichnen / Mehrfachauswahl"],
              ["Space + Ziehen", "Zeichenfläche verschieben"],
              ["Mausrad", "Zum Mauszeiger zoomen"],
              ["Pfeiltasten", "Auswahl 10 mm verschieben"],
              ["Shift + Pfeiltasten", "Auswahl um eine Rasterweite verschieben"],
              ["Strg+Z / Strg+Y", "Rückgängig / Wiederholen"],
              ["Strg+A", "Alles im aktuellen Tab und Geschoss auswählen"],
              ["Strg+D / Delete", "Duplizieren / Löschen"],
              ["Strg+S / Home", "Speichern / alles anzeigen"],
              ["Escape", "Aktuellen Zeichenvorgang abbrechen"],
            ].map(([key, label]) => (
              <div key={key}>
                <kbd>{key}</kbd>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="field-hint">
            Alle Daten bleiben in diesem Browser. Exportiere eine JSON-Datei für eine unabhängige Sicherung.
            Flächen sind Wandachsflächen.
          </p>
        </Modal>
      )}
    </>
  );
}
