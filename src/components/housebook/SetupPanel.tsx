import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import {
  setup,
  setSetup,
  setupSteps,
  setupTopics,
  moveSetup,
  addSetupRoom,
  type OpenSection,
  type Setup,
} from "../../housebook/setup";
import { homeBook } from "../../housebook/home";
import { housebook } from "../../housebook/model";
import { solarPlants } from "../../housebook/solar";
import { utilities } from "../../utilities/model";
import { Field } from "./shared";
import { FloorDialog } from "../dialogs/FloorDialog";
import { focusObject } from "../../housebook/navigation";
export function SetupPanel({
  onOpen,
  onClose,
  onPhoto,
}: {
  onOpen: OpenSection;
  onClose: () => void;
  onPhoto: (wallId: string) => void;
}) {
  const p = useProjectStore((s) => s.project),
    floorId = useEditorStore((s) => s.floorId),
    s = setup(p),
    b = homeBook(p),
    book = housebook(p),
    rooms = Object.values(p.rooms),
    room = p.rooms[s.roomId ?? ""];
  const [houseName, setHouseName] = useState(p.name),
    [floor, setFloor] = useState<string | null | undefined>(),
    [roomName, setRoomName] = useState(""),
    [width, setWidth] = useState(""),
    [depth, setDepth] = useState(""),
    [x, setX] = useState(0),
    [y, setY] = useState(0),
    [notice, setNotice] = useState("");
  const edit = (change: (s: Setup) => void) =>
    useProjectStore.getState().commit("Einrichtung aktualisieren", (p) => {
      const s = setup(p);
      change(s);
      setSetup(p, s);
    });
  const go = (step: number, status?: "done" | "skipped") =>
    useProjectStore.getState().commit("Einrichtung fortsetzen", (p) => moveSetup(p, step, status));
  return (
    <section>
      <h3>Einrichtungsassistent</h3>
      <p>
        Schritt für Schritt durch dein Haus. Vorhandene Daten bleiben erhalten. Du kannst jederzeit pausieren,
        zurückgehen oder etwas für später offenlassen.
      </p>
      <p role="status">
        {s.finished ? "Erster Rundgang abgeschlossen" : `Schritt ${s.step + 1} von ${setupSteps.length}`} ·{" "}
        {s.done.length} bestätigt · {s.skipped.length} übersprungen
      </p>
      <progress aria-label="Einrichtungsfortschritt" max={6} value={s.done.length} />
      <nav className="setup-steps" aria-label="Einrichtungsschritte">
        {setupSteps.map((title, index) => (
          <button key={title} aria-current={s.step === index ? "step" : undefined} onClick={() => go(index)}>
            {index + 1}. {title} ·{" "}
            {s.done.includes(index) ? "erledigt" : s.skipped.includes(index) ? "später" : "offen"}
          </button>
        ))}
      </nav>
      <h4>{setupSteps[s.step]}</h4>
      {s.step === 0 && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                useProjectStore.getState().commit("Haus benennen", (p) => {
                  p.name = houseName.trim();
                })
              )
                setNotice("Hausname gespeichert.");
            }}
          >
            <Field label="Hausname">
              <input required value={houseName} onChange={(e) => setHouseName(e.target.value)} />
            </Field>
            <button>Hausname speichern</button>
          </form>
          <h4>Vorhandene Geschosse</h4>
          {Object.values(p.floors).map((f) => (
            <article className="home-row" key={f.id}>
              <strong>{f.name}</strong>
              <span>{rooms.filter((r) => r.floorId === f.id).length} Räume</span>
              <button onClick={() => setFloor(f.id)}>Bearbeiten: {f.name}</button>
            </article>
          ))}
          <button onClick={() => setFloor(null)}>Geschoss ergänzen</button>
          <h4>Vorhandene Räume</h4>
          {rooms.length ? (
            rooms.map((r) => (
              <article className="home-row" key={r.id}>
                <strong>{r.name}</strong>
                <span>{p.floors[r.floorId]?.name}</span>
                <button
                  onClick={() => {
                    if (
                      edit((s) => {
                        s.roomId = r.id;
                        s.step = 3;
                      })
                    )
                      useEditorStore.getState().setFloor(r.floorId);
                  }}
                >
                  Raum erfassen: {r.name}
                </button>
              </article>
            ))
          ) : (
            <p>
              Noch keine Räume angelegt. Du kannst sie mit bekannten Maßen hier ergänzen oder später im Plan
              zeichnen.
            </p>
          )}
          <details>
            <summary>Rechteckigen Raum mit bekannten Maßen ergänzen</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                let id = "",
                  existed = false;
                if (
                  useProjectStore.getState().commit("Raum im Assistenten ergänzen", (p) => {
                    const before = new Set(Object.keys(p.rooms));
                    id = addSetupRoom(
                      p,
                      floorId,
                      roomName,
                      Number(width) * 1000,
                      Number(depth) * 1000,
                      x * 1000,
                      y * 1000,
                    );
                    existed = before.has(id);
                    const s = setup(p);
                    s.roomId = id;
                    setSetup(p, s);
                  })
                ) {
                  setRoomName("");
                  setNotice(
                    existed
                      ? "Vorhandener Raum ausgewählt – kein Duplikat angelegt."
                      : "Raum mit Wänden angelegt. Die Lage kannst du im Plan prüfen.",
                  );
                }
              }}
            >
              <div className="book-grid">
                <Field label="Raumgeschoss">
                  <select
                    value={floorId}
                    onChange={(e) => useEditorStore.getState().setFloor(e.target.value)}
                  >
                    {Object.values(p.floors).map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Raumname">
                  <input required value={roomName} onChange={(e) => setRoomName(e.target.value)} />
                </Field>
                <Field label="Raumbreite (m)">
                  <input
                    required
                    type="number"
                    step="any"
                    min="0.01"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                  />
                </Field>
                <Field label="Raumtiefe (m)">
                  <input
                    required
                    type="number"
                    step="any"
                    min="0.01"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                  />
                </Field>
                <Field label="Start X (m)">
                  <input
                    required
                    type="number"
                    step="any"
                    value={x}
                    onChange={(e) => setX(Number(e.target.value))}
                  />
                </Field>
                <Field label="Start Y (m)">
                  <input
                    required
                    type="number"
                    step="any"
                    value={y}
                    onChange={(e) => setY(Number(e.target.value))}
                  />
                </Field>
              </div>
              <p>
                X/Y legen die untere linke Ecke fest. Gleicher Raumname auf demselben Geschoss wählt den
                vorhandenen Raum aus.
              </p>
              <button>Raum übernehmen</button>
            </form>
          </details>
        </>
      )}
      {s.step === 1 && (
        <>
          <p>
            Eine vorhandene Zeichnung oder ein Foto kann als Vorlage dienen. Danach eine bekannte Strecke
            messen und den Maßstab einstellen.
          </p>
          <p>
            {Object.keys(book.backgrounds).length} Geschosse mit Vorlage · {Object.keys(p.walls).length} Wände
            vorhanden.
          </p>
          <Field label="Vorlage für Geschoss">
            <select value={floorId} onChange={(e) => useEditorStore.getState().setFloor(e.target.value)}>
              {Object.values(p.floors).map((f) => (
                <option value={f.id} key={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="book-actions">
            <button onClick={() => onOpen("background")}>Vorlage hochladen / skalieren</button>
            <button
              onClick={() => {
                useEditorStore.getState().setTool("rectangle");
                onClose();
              }}
            >
              Raum im Plan zeichnen
            </button>
          </div>
        </>
      )}
      {s.step === 2 && (
        <>
          <p>
            Welche Bereiche möchtest du dokumentieren? Die Auswahl erstellt keine Geräte und blendet keine
            bestehenden Daten aus.
          </p>
          <div className="book-grid">
            {Object.entries(setupTopics).map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  type="checkbox"
                  checked={s.topics.includes(key as keyof typeof setupTopics)}
                  onChange={(e) =>
                    edit((s) => {
                      s.topics = e.target.checked
                        ? [...s.topics, key as keyof typeof setupTopics]
                        : s.topics.filter((t) => t !== key);
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </>
      )}
      {s.step === 3 && (
        <>
          <Field label="Raum für Rundgang">
            <select
              value={room?.id ?? ""}
              onChange={(e) =>
                edit((s) => {
                  s.roomId = e.target.value || null;
                })
              }
            >
              <option value="">Raum auswählen</option>
              {rooms.map((r) => (
                <option value={r.id} key={r.id}>
                  {r.name} · {p.floors[r.floorId]?.name}
                </option>
              ))}
            </select>
          </Field>
          {room ? (
            <>
              <p>
                {room.name}: {Object.values(p.electrical.outlets).filter((o) => o.roomId === room.id).length}{" "}
                zugeordnete Steckdosen ·{" "}
                {Object.values(p.electrical.devices).filter((o) => o.roomId === room.id).length} zugeordnete
                Verbraucher. Weitere Objekte können bereits im Plan stehen, ohne einem Raum zugeordnet zu
                sein.
              </p>
              <p>
                Prüfe Lichtschalter, Steckdosen, Geräte und Rauchmelder. Fehlende Angaben kannst du später
                nachtragen.
              </p>
              <div className="book-actions">
                <button
                  onClick={() => {
                    if (focusObject({ kind: "rooms", id: room.id })) onClose();
                    else setNotice("Bitte zuerst die Grundrissebene einblenden.");
                  }}
                >
                  Raum im Plan öffnen
                </button>
                <button onClick={() => onOpen("smoke")}>Rauchmelder erfassen</button>
                <button onClick={() => onOpen("assets")}>Geräteakten ergänzen</button>
              </div>
              <h4>Fotos an den Raumwänden</h4>
              {room.wallIds.map((id, index) => (
                <button className="setup-wall" key={id} onClick={() => onPhoto(id)}>
                  Wand {index + 1} fotografieren / ansehen
                </button>
              ))}
              <Field label="Diesen Raum durchgesehen">
                <input
                  type="checkbox"
                  checked={s.reviewedRooms.includes(room.id)}
                  onChange={(e) =>
                    edit((s) => {
                      s.reviewedRooms = e.target.checked
                        ? [...s.reviewedRooms.filter((id) => id !== room.id), room.id]
                        : s.reviewedRooms.filter((id) => id !== room.id);
                    })
                  }
                />
              </Field>
            </>
          ) : (
            <p>Wähle einen vorhandenen Raum oder ergänze ihn im ersten Schritt.</p>
          )}
        </>
      )}
      {s.step === 4 && (
        <>
          <p>
            Zentrale Stellen findest du später schneller, wenn Standort und Bezeichnung dokumentiert sind.
          </p>
          <div className="book-cards">
            {s.topics.includes("electrical") && (
              <button onClick={() => onOpen("assets")}>
                <strong>Sicherungskasten & Geräte</strong>
                <span>{Object.keys(p.electrical.distributionBoards).length} Verteiler im Plan</span>
              </button>
            )}
            {s.topics.some((t) => ["water", "heating", "gas"].includes(t)) && (
              <button onClick={() => onOpen("shutoff")}>
                <strong>Hauptabsperrungen</strong>
                <span>
                  {b.items.filter((i) => i.kind === "shutoff").length +
                    Object.values(utilities(p).nodes).filter((n) => n.kind === "valve").length}{" "}
                  Einträge / Ventile
                </span>
              </button>
            )}
            {s.topics.includes("network") && (
              <button onClick={() => onOpen("network")}>
                <strong>Router & Internet</strong>
                <span>{book.networkNodes.length} Netzwerkgeräte</span>
              </button>
            )}
            <button onClick={() => onOpen("usage")}>
              <strong>Zähler & erste Ablesung</strong>
              <span>{b.meters.length} Zähler vorhanden</span>
            </button>
            {s.topics.includes("solar") && (
              <button onClick={() => onOpen("solar")}>
                <strong>Balkonkraftwerk erfassen</strong>
                <span>{solarPlants(p).length} Anlagen</span>
              </button>
            )}
            {s.topics.includes("garden") && (
              <button onClick={() => onOpen("garden")}>
                <strong>Garten & Außenlicht erfassen</strong>
                <span>Standorte und Pflegehinweise</span>
              </button>
            )}
          </div>
        </>
      )}
      {s.step === 5 && (
        <>
          <p>
            Dein erster Rundgang kann abgeschlossen werden, auch wenn Angaben noch offen sind. „Erledigt“
            bedeutet hier von dir durchgesehen.
          </p>
          <ul>
            <li>
              {Object.keys(p.floors).length} Geschosse · {rooms.length} Räume
            </li>
            <li>
              {s.reviewedRooms.filter((id) => p.rooms[id]).length} Räume durchgesehen ·{" "}
              {rooms.filter((r) => !s.reviewedRooms.includes(r.id)).length} noch offen
            </li>
            <li>
              {b.items.length} Hausobjekte · {b.meters.length} Zähler · {solarPlants(p).length} Solaranlagen
            </li>
          </ul>
          <h4>Für später</h4>
          <ul>
            {setupSteps.slice(0, 5).map(
              (title, index) =>
                !s.done.includes(index) && (
                  <li key={title}>
                    {title} · {s.skipped.includes(index) ? "übersprungen" : "noch nicht bestätigt"}
                  </li>
                ),
            )}
            {b.meters
              .filter((m) => !m.readings.length)
              .map((m) => (
                <li key={m.id}>{m.name}: erste Ablesung fehlt</li>
              ))}
            {!rooms.length && <li>Noch keinen Raum angelegt</li>}
          </ul>
          <div className="book-actions">
            <button onClick={() => onOpen("search")}>Gesamten Bestand durchsuchen</button>
            <button
              onClick={() =>
                edit((s) => {
                  s.finished = true;
                  s.done = [...s.done.filter((i) => i !== 5), 5];
                  s.skipped = s.skipped.filter((i) => i !== 5);
                })
              }
            >
              Ersten Rundgang abschließen
            </button>
          </div>
          <p>
            Über JSON exportieren im Hauptfenster sicherst du das gesamte Projekt einschließlich Fortschritt.
          </p>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="book-actions setup-footer">
        <button disabled={s.step === 0} onClick={() => go(s.step - 1)}>
          Zurück
        </button>
        {s.step < 5 && (
          <>
            <button onClick={() => go(s.step + 1, "skipped")}>Für später überspringen</button>
            <button onClick={() => go(s.step + 1, "done")}>Schritt bestätigen und weiter</button>
          </>
        )}
        <button onClick={onClose}>Pausieren und schließen</button>
      </div>
      {floor !== undefined && <FloorDialog floorId={floor} onClose={() => setFloor(undefined)} />}
    </section>
  );
}
