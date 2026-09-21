import { useEffect, useState } from "react";
import { ConnectionsPanel } from "./ConnectionsPanel";
import { ComparePanel } from "./ComparePanel";
import { VersionsPanel } from "./VersionsPanel";
import { Modal } from "../dialogs/Modal";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { housebook, asset, statusLabels } from "../../housebook/model";
import { elementKinds, elementTables } from "../../core/elementTables";
import { projectReview } from "../../housebook/review";
import { focusObject } from "../../housebook/navigation";
import {
  download,
  planSvg,
  csv,
  materialRows,
  exportPlanPdf,
  exportInventoryPdf,
} from "../../housebook/export";
import { BackgroundPanel } from "./BackgroundPanel";
import { ScenariosPanel } from "./ScenariosPanel";
import { SchematicPanel } from "./SchematicPanel";
import { ConductorPanel } from "./ConductorPanel";
import { HomeAssistantPanel } from "./HomeAssistantPanel";
import { InternetPanel } from "./InternetPanel";
import { HomeItemsPanel } from "./HomeItemsPanel";
import { UsagePanel } from "./UsagePanel";
import { MaintenancePanel } from "./MaintenancePanel";
import { dueOverview } from "../../housebook/home";
import { setup, type OpenSection } from "../../housebook/setup";
import { SetupPanel } from "./SetupPanel";
import { SearchPanel } from "./SearchPanel";
import { SolarPanel } from "./SolarPanel";
import { WallPhotoDialog } from "./WallPhotoDialog";
import { BoardSchedulePanel } from "./BoardSchedulePanel";
import { BackupPanel } from "./BackupPanel";
import { ChroniclePanel } from "./ChroniclePanel";
import { HomeDashboard } from "./HomeDashboard";
import { QuickOverviewPanel } from "./QuickOverviewPanel";
import { QrPanel } from "./QrPanel";
import { searchEntries } from "../../housebook/search";
import { activateProject } from "../dialogs/ProjectDialog";
import { AssetDialog } from "./AssetDialog";
import { Field, updateBook } from "./shared";
import type { Selection } from "../../editor/types";
import { projectRepository } from "../../persistence/indexedDbRepository";
import { saveNow } from "../../persistence/autosave";
import { saveRoomTemplate, insertRoomTemplate } from "../../housebook/templates";
import type { Project } from "../../models/project";
const sections = {
  overview: "Übersicht",
  connections: "Verbindungen & Abschalten",
  compare: "Bestand / Umbau",
  backup: "Sicherung & Gerätewechsel",
  chronicle: "Hauschronik",
  quick: "Haus-Schnellübersicht",
  qr: "QR-Aufkleber",
  setup: "Einrichtung",
  search: "Suche",
  solar: "Balkonkraftwerk",
  background: "Grundrissvorlage",
  check: "Projektprüfung",
  export: "Ausgabe",
  boardSchedule: "Sicherungskasten-Aushang",
  scenarios: "Szenarien",
  schematic: "Versorgungsschema",
  conductors: "Leiterprüfung",
  assets: "Objektakten",
  network: "Internet & WLAN",
  shutoff: "Absperrstellen",
  smoke: "Rauchmelder",
  usage: "Zähler & Verbrauch",
  maintenance: "Wartungen",
  garden: "Garten & Außenlicht",
  templates: "Raumvorlagen",
  history: "Wiederherstellung",
  homeAssistant: "Home Assistant",
};
export function HousebookDialog({
  onClose,
  qrTarget,
  initialMeterId,
  initialSolarId,
  initialSection,
  initialQrKey,
}: {
  onClose: () => void;
  initialMeterId?: string;
  initialSolarId?: string;
  initialSection?: keyof typeof sections;
  initialQrKey?: string;
  qrTarget?: { projectId: string; key: string } | null | undefined;
}) {
  const project = useProjectStore((s) => s.project),
    globalError = useProjectStore((s) => s.error),
    floorId = useEditorStore((s) => s.floorId);
  const [section, setSection] = useState<keyof typeof sections>(
      initialSection ?? (initialSolarId !== undefined ? "solar" : initialMeterId ? "usage" : "overview"),
    ),
    [record, setRecord] = useState<Selection | null>(null);
  const [entryId, setEntryId] = useState<string | undefined>(initialSolarId || initialMeterId),
    [fromSetup, setFromSetup] = useState(false),
    [photo, setPhoto] = useState<{ wallId: string; photoId?: string | undefined } | null>(null);
  const openSection: OpenSection = (section, id) => {
    setEntryId(id);
    setSection(section);
    setMessage("");
  };
  const [filter, setFilter] = useState(""),
    [status, setStatus] = useState("all"),
    [scale, setScale] = useState(50),
    [mode, setMode] = useState<"all" | "building" | "electrical">("all");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [snapshots, setSnapshots] = useState<
    { id: string; savedAt: string; project: Project; name?: string }[]
  >([]);
  const [restore, setRestore] = useState<string | null>(null);
  const [checkFilter, setCheckFilter] = useState("");
  const [roomId, setRoomId] = useState(Object.keys(project.rooms)[0] ?? ""),
    [templateName, setTemplateName] = useState("Raumvorlage"),
    [x, setX] = useState(15000),
    [y, setY] = useState(0);
  const issues = projectReview(project),
    book = housebook(project);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  };
  const targets = elementKinds
    .filter((kind) => kind !== "networkNodes")
    .flatMap((kind) => Object.values(elementTables(project)[kind]).map((item) => ({ kind, item })));
  const jump = (target: Selection) => {
    if (focusObject(target)) onClose();
    else setMessage("Die Ebene ist ausgeblendet. Bitte zuerst im Editor einblenden.");
  };
  useEffect(() => {
    if (!qrTarget || qrTarget.projectId !== project.id) return;
    const row = searchEntries(project).find((r) => r.key === qrTarget.key);
    if (!row) {
      setMessage("Das Ziel dieses QR-Aufklebers wurde im Projekt nicht gefunden.");
      return;
    }
    if (row.target && row.target.kind !== "networkNodes") {
      setSection("assets");
      setRecord(row.target);
    } else if (row.wallId) setPhoto({ wallId: row.wallId, photoId: row.photoId });
    else if (row.section) {
      setSection(row.section);
      setEntryId(row.id);
    }
  }, [qrTarget?.key, qrTarget?.projectId, project.id]);
  return (
    <>
      <Modal title="Hausakte" className="housebook-dialog" onClose={onClose}>
        <div className="book-shell">
          <nav className="book-nav" aria-label="Bereiche der Hausakte">
            {Object.entries(sections).map(([id, name]) => (
              <button
                key={id}
                aria-current={section === id ? "page" : undefined}
                onClick={() => {
                  setSection(id as keyof typeof sections);
                  setEntryId(undefined);
                  if (id === "setup") setFromSetup(true);
                  setMessage("");
                  if (id === "history")
                    void run(async () => {
                      setSnapshots(await projectRepository.snapshots(project.id));
                    });
                }}
              >
                {name}
                {id === "check" && issues.length > 0 ? ` (${issues.length})` : ""}
              </button>
            ))}
          </nav>
          <div className="book-content" aria-busy={busy}>
            {section === "connections" && <ConnectionsPanel onClose={onClose} />}
            {section === "compare" && <ComparePanel />}
            {qrTarget && qrTarget.projectId !== project.id && (
              <div className="home-summary">
                <p>
                  Dieser QR-Aufkleber gehört zu einem anderen Projekt. Es wurde keine falsche Akte geöffnet.
                </p>
                <button
                  onClick={() =>
                    void run(async () => {
                      const p = await projectRepository.load(qrTarget.projectId);
                      if (!p)
                        throw new Error(
                          "Das passende Projekt ist hier noch nicht vorhanden. Bitte zuerst die Projektdatei vom PC importieren.",
                        );
                      await activateProject(p);
                    })
                  }
                >
                  Passendes lokales Projekt öffnen
                </button>
                <button onClick={() => openSection("backup")}>Projektdatei übertragen</button>
              </div>
            )}
            {fromSetup && section !== "setup" && (
              <div className="book-actions">
                <button onClick={() => openSection("setup")}>Zur Einrichtung zurück</button>
                <span>Dein Schritt bleibt gespeichert.</span>
              </div>
            )}
            {globalError && (
              <p className="book-error" role="alert">
                {globalError}
              </p>
            )}
            {message && (
              <p className="book-message" role="status">
                {message}
              </p>
            )}
            {section === "overview" && (
              <section>
                <span className="eyebrow">DEIN HAUS IM ÜBERBLICK</span>
                <h3>{project.name}</h3>
                <HomeDashboard onOpen={openSection} issueCount={issues.length} />
                <div className="book-actions">
                  <button
                    onClick={() => {
                      setFromSetup(true);
                      openSection("setup");
                    }}
                  >
                    {project.metadata.setupGuide ? "Einrichtung fortsetzen" : "Mit Einrichtung beginnen"}
                  </button>
                  <button onClick={() => openSection("search")}>Wo finde ich …?</button>
                </div>
                <p>
                  Grundriss erfassen, Technik dokumentieren und Pläne ausgeben. Alle Angaben bleiben im
                  Projekt und werden mit dem JSON-Export gesichert.
                </p>
                <div className="book-stats">
                  <div>
                    <strong>{project.floorOrder.length}</strong>Etagen
                  </div>
                  <div>
                    <strong>{Object.keys(project.rooms).length}</strong>Räume
                  </div>
                  <div>
                    <strong>{Object.keys(project.electrical.circuits).length}</strong>Stromkreise
                  </div>
                  <div>
                    <strong>{issues.length}</strong>Hinweise
                  </div>
                </div>
                <div className="book-cards">
                  {(
                    [
                      [
                        "usage",
                        "Zähler & Verbrauch",
                        "Ablesungen erfassen und tatsächliche Verbräuche vergleichen.",
                      ],
                      [
                        "maintenance",
                        "Wartungen",
                        `${dueOverview(project).filter((r) => r.overdue || r.today).length} Termine überfällig oder heute fällig.`,
                      ],
                      [
                        "background",
                        "1 · Haus erfassen",
                        "Vorhandenen Grundriss importieren und maßstäblich hinterlegen.",
                      ],
                      [
                        "assets",
                        "2 · Bestand dokumentieren",
                        "Geräte, Fotos, Wartung und Umbauzustände festhalten.",
                      ],
                      [
                        "check",
                        "3 · Planung prüfen",
                        "Fehlende Angaben finden und direkt im Plan bearbeiten.",
                      ],
                      [
                        "export",
                        "4 · Ergebnisse mitnehmen",
                        "PDF-Pläne, SVG, Verteiler- und Materiallisten erstellen.",
                      ],
                    ] as const
                  ).map(([id, title, desc]) => (
                    <button key={id} onClick={() => setSection(id)}>
                      <strong>{title}</strong>
                      <span>{desc}</span>
                    </button>
                  ))}
                </div>
                <p>
                  Umbau-Markierungen im Plan: Blau = geplant · Rot = entfernen · Grün = umgesetzt. Der Bestand
                  bleibt neutral.
                </p>
              </section>
            )}
            {section === "background" && <BackgroundPanel key={floorId} />}
            {section === "check" && (
              <section>
                <h3>Projektprüfung</h3>
                <p>Hinweise zur Vollständigkeit der Dokumentation und des statischen Versorgungsmodells.</p>
                <Field label="Prüfergebnisse filtern">
                  <input value={checkFilter} onChange={(e) => setCheckFilter(e.target.value)} />
                </Field>
                <button
                  onClick={() =>
                    download(
                      csv([
                        ["Einstufung", "Hinweis"],
                        ...issues.map((i) => [i.severity === "warning" ? "Prüfen" : "Hinweis", i.message]),
                      ]),
                      "Planpruefung.csv",
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Prüfbericht als CSV
                </button>
                {!issues.length && <p>Keine Hinweise in den aktuell geprüften Angaben.</p>}
                <ul className="book-list">
                  {issues
                    .filter((i) =>
                      i.message.toLocaleLowerCase("de-DE").includes(checkFilter.toLocaleLowerCase("de-DE")),
                    )
                    .map((i) => (
                      <li key={i.id}>
                        <span>
                          <small>{i.severity === "warning" ? "Prüfen" : "Hinweis"}</small>
                          {i.message}
                        </span>
                        {i.target && <button onClick={() => jump(i.target!)}>Im Plan</button>}
                      </li>
                    ))}
                </ul>
              </section>
            )}
            {section === "export" && (
              <section>
                <h3>Pläne und Listen ausgeben</h3>
                <p>
                  Ausgabe der aktuellen Etage „{project.floors[floorId]?.name}“. Sichtbare Ebenen werden
                  berücksichtigt. Die Grundrissvorlage wird nicht mitgedruckt. Große Pläne werden im PDF auf
                  mehrere A4-Querformatblätter verteilt.
                </p>
                <div className="book-grid">
                  <Field label="Druckmaßstab">
                    <select value={scale} onChange={(e) => setScale(Number(e.target.value))}>
                      {[20, 25, 50, 100, 200].map((n) => (
                        <option key={n} value={n}>
                          1:{n}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Planinhalt">
                    <select value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                      <option value="all">Haus, Möbel und Technik</option>
                      <option value="building">Haus und Möbel</option>
                      <option value="electrical">Haus und Technik</option>
                    </select>
                  </Field>
                </div>
                <div className="book-actions">
                  <button onClick={() => setSection("boardSchedule")}>
                    Sicherungskasten-Aushang vorbereiten
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => void run(() => exportPlanPdf(project, floorId, scale, mode))}
                  >
                    Grundriss als PDF
                  </button>
                  <button
                    onClick={() =>
                      download(planSvg(project, floorId, scale, mode), "Hausplan.svg", "image/svg+xml")
                    }
                  >
                    Grundriss als SVG
                  </button>
                  <button disabled={busy} onClick={() => void run(() => exportInventoryPdf(project))}>
                    Verteiler- und Material-PDF
                  </button>
                  <button
                    onClick={() =>
                      download(csv(materialRows(project)), "Materialbestand.csv", "text/csv;charset=utf-8")
                    }
                  >
                    Materialliste als CSV
                  </button>
                </div>
                <p>
                  Für maßstäbliche Ausdrucke „100 % / Tatsächliche Größe“ wählen. Raumflächen beziehen sich
                  auf Wandachsen. Die Materialliste enthält den dokumentierten Bestand einschließlich
                  Umbauzustand.
                </p>
              </section>
            )}
            {section === "boardSchedule" && <BoardSchedulePanel />}
            {section === "backup" && <BackupPanel />}
            {section === "chronicle" && (
              <ChroniclePanel key={`${project.id}:${entryId}`} initialId={entryId} onClose={onClose} />
            )}
            {section === "quick" && <QuickOverviewPanel key={project.id} />}
            {section === "qr" && <QrPanel initialKey={initialQrKey} />}
            {section === "scenarios" && <ScenariosPanel onClose={onClose} />}
            {section === "schematic" && <SchematicPanel onClose={onClose} />}
            {section === "assets" && (
              <section>
                <h3>Objektakten und Umbau</h3>
                <div className="book-grid">
                  <Field label="Objekte suchen">
                    <input value={filter} onChange={(e) => setFilter(e.target.value)} />
                  </Field>
                  <Field label="Nach Umbauzustand filtern">
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                      <option value="all">Alle Zustände</option>
                      {Object.entries(statusLabels).map(([key, text]) => (
                        <option key={key} value={key}>
                          {text}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <ul className="book-list">
                  {targets
                    .filter(
                      ({ item }) =>
                        (status === "all" || asset(item).status === status) &&
                        `${"name" in item ? item.name : ""} ${"label" in item ? item.label : ""}`
                          .toLocaleLowerCase()
                          .includes(filter.toLocaleLowerCase()),
                    )
                    .map(({ kind, item }) => (
                      <li key={item.id}>
                        <span>
                          <strong>{"name" in item ? item.name : kind}</strong> ·{" "}
                          {project.floors[item.floorId]?.name}
                          <small>
                            {statusLabels[asset(item).status]}
                            {asset(item).model ? ` · ${asset(item).model}` : ""}
                          </small>
                        </span>
                        <button onClick={() => setRecord({ kind, id: item.id })}>Akte öffnen</button>
                        <button onClick={() => jump({ kind, id: item.id })}>Im Plan</button>
                      </li>
                    ))}
                </ul>
              </section>
            )}
            {section === "setup" && (
              <SetupPanel onOpen={openSection} onClose={onClose} onPhoto={(wallId) => setPhoto({ wallId })} />
            )}
            {section === "search" && (
              <SearchPanel
                onOpen={openSection}
                onClose={onClose}
                onAsset={setRecord}
                onPhoto={(wallId, photoId) => setPhoto({ wallId, photoId })}
              />
            )}
            {section === "solar" && (
              <SolarPanel key={entryId ?? "new"} initialId={entryId} onOpen={openSection} onClose={onClose} />
            )}
            {section === "network" && <InternetPanel key={entryId ?? "new"} initialId={entryId} />}
            {section === "shutoff" && (
              <HomeItemsPanel
                key={`shutoff:${entryId}`}
                initialId={entryId}
                kinds={["shutoff"]}
                onClose={onClose}
              />
            )}
            {section === "smoke" && (
              <HomeItemsPanel
                key={`smoke:${entryId}`}
                initialId={entryId}
                initialLocation={fromSetup ? project.rooms[setup(project).roomId ?? ""]?.name : undefined}
                kinds={["smoke"]}
                onClose={onClose}
              />
            )}
            {section === "garden" && (
              <HomeItemsPanel
                key={`garden:${entryId}`}
                initialId={entryId}
                kinds={["garden", "outdoorLight"]}
                onOpen={openSection}
                onClose={onClose}
              />
            )}
            {section === "usage" && (
              <UsagePanel key={entryId ?? "new"} initialId={entryId} onClose={onClose} />
            )}
            {section === "maintenance" && (
              <MaintenancePanel key={entryId ?? "new"} initialId={entryId} onClose={onClose} />
            )}
            {section === "homeAssistant" && <HomeAssistantPanel />}
            {section === "conductors" && <ConductorPanel onClose={onClose} />}
            {section === "templates" && (
              <section>
                <h3>Raumvorlagen</h3>
                <p>
                  Raumgeometrie, Öffnungen, zugeordnete Möbel und Elektroobjekte als Vorlage sichern. Beim
                  Einfügen bleiben interne Verbindungen erhalten. Stromkreise werden kopiert; externe
                  Einspeisungen bleiben getrennt. Neue Objekte erhalten den Zustand „Geplant“.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (
                      useProjectStore
                        .getState()
                        .commit("Raumvorlage speichern", (p) => saveRoomTemplate(p, roomId, templateName))
                    )
                      setMessage("Raumvorlage gespeichert.");
                  }}
                >
                  <div className="book-grid">
                    <Field label="Vorlagenraum">
                      <select required value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                        <option value="">Raum wählen …</option>
                        {Object.values(project.rooms).map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Vorlagenname">
                      <input
                        required
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                      />
                    </Field>
                  </div>
                  <button disabled={!roomId}>Raumvorlage speichern</button>
                </form>
                <div className="book-grid">
                  <Field label="Einfügeposition X (mm)">
                    <input type="number" value={x} onChange={(e) => setX(Number(e.target.value))} />
                  </Field>
                  <Field label="Einfügeposition Y (mm)">
                    <input type="number" value={y} onChange={(e) => setY(Number(e.target.value))} />
                  </Field>
                </div>
                <ul className="book-list">
                  {book.templates.map((t) => (
                    <li key={t.id}>
                      <span>{t.name}</span>
                      <button
                        onClick={() => {
                          let target: Selection | null = null;
                          if (
                            useProjectStore.getState().commit("Raumvorlage einfügen", (p) => {
                              target = insertRoomTemplate(p, t.id, floorId, x, y);
                            }) &&
                            target
                          )
                            jump(target);
                        }}
                      >
                        Auf aktueller Etage einfügen
                      </button>
                      <button
                        onClick={() =>
                          updateBook("Raumvorlage löschen", (b) => {
                            b.templates = b.templates.filter((v) => v.id !== t.id);
                          })
                        }
                      >
                        Löschen
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {section === "history" && (
              <section>
                <VersionsPanel
                  refresh={async () => setSnapshots(await projectRepository.snapshots(project.id))}
                />
                <h3>Ältere Projektstände</h3>
                <p>
                  Beim Überschreiben werden bis zu 20 frühere Stände mit begrenztem Speicherbudget aufbewahrt.
                  Diese lokale Wiederherstellung ergänzt den unabhängigen JSON-Export.
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => setSnapshots(await projectRepository.snapshots(project.id)))
                  }
                >
                  Liste aktualisieren
                </button>
                <ul className="book-list">
                  {snapshots.map((s) => (
                    <li key={s.id}>
                      <span>
                        <strong>
                          {s.name ? `${s.name} · ` : ""}
                          {new Date(s.savedAt).toLocaleString("de-DE")}
                        </strong>
                        <small>
                          {s.project.name} · Revision {s.project.version}
                        </small>
                      </span>
                      <button disabled={busy} onClick={() => setRestore(s.id)}>
                        Wiederherstellen …
                      </button>
                      {restore === s.id && (
                        <div>
                          <p>
                            Diesen Stand wiederherstellen? Der aktuelle Entwurf wird zuvor gespeichert. Die
                            Wiederherstellung ist rückgängig machbar.
                          </p>
                          <button
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await saveNow();
                                const ok = useProjectStore
                                  .getState()
                                  .commit("Projektstand wiederherstellen", (p) => {
                                    const version = p.version,
                                      time = p.updatedAt;
                                    Object.assign(p, structuredClone(s.project), {
                                      version,
                                      updatedAt: time,
                                    });
                                  });
                                if (ok) {
                                  await saveNow();
                                  setRestore(null);
                                  setSnapshots(await projectRepository.snapshots(project.id));
                                  setMessage("Projektstand wiederhergestellt.");
                                }
                              })
                            }
                          >
                            Diesen Stand jetzt übernehmen
                          </button>
                          <button onClick={() => setRestore(null)}>Abbrechen</button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {!snapshots.length && <p>Noch keine früheren Stände vorhanden.</p>}
              </section>
            )}
          </div>
        </div>
      </Modal>
      {record && <AssetDialog target={record} onClose={() => setRecord(null)} />}
      {photo && (
        <WallPhotoDialog
          wallId={photo.wallId}
          initialPhotoId={photo.photoId}
          onClose={() => setPhoto(null)}
        />
      )}
    </>
  );
}
