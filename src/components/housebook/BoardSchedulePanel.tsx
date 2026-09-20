import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { boardSchedule } from "../../housebook/boardSchedule";
import { exportBoardSchedulePdf } from "../../housebook/boardSchedulePdf";
import { Field } from "./shared";
export function BoardSchedulePanel() {
  const p = useProjectStore((s) => s.project),
    boards = Object.values(p.electrical.distributionBoards);
  const [id, setId] = useState(boards[0]?.id ?? ""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const ids = id === "all" ? boards.map((b) => b.id) : boards.some((b) => b.id === id) ? [id] : [];
  return (
    <section>
      <h3>Sicherungskasten-Aushang</h3>
      <p>
        Eine lesbare Stromkreisübersicht zum Ausdrucken und Aushängen. Jeder Verteiler beginnt auf einem
        eigenen A4-Querformatblatt; lange Listen werden auf weitere Seiten verteilt.
      </p>
      {!boards.length ? (
        <p>
          Noch kein Sicherungskasten vorhanden. Im Elektrikbereich einen Verteiler und seine Stromkreise
          erfassen.
        </p>
      ) : (
        <>
          <div className="book-grid">
            <Field label="Sicherungskasten für Aushang">
              <select value={id} onChange={(e) => setId(e.target.value)}>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} · {b.name}
                  </option>
                ))}
                <option value="all">Alle Sicherungskästen</option>
              </select>
            </Field>
            <Field label="Eigene Hinweise auf dem Aushang">
              <textarea
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional, z. B. genauer Standort einer Unterverteilung"
              />
            </Field>
          </div>
          <p>
            Gedruckt werden die erfassten Zuordnungen, auch bei ausgeblendeten Planebenen. Die Kennzeichnungen
            sind keine automatisch ermittelten Einbauplätze.
          </p>
          <div className="book-actions">
            <button
              disabled={busy || !ids.length}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await exportBoardSchedulePdf(p, ids, note);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "PDF konnte nicht erstellt werden.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "PDF wird erstellt …" : "Aushang als PDF"}
            </button>
          </div>
          <p>
            PDF öffnen und im Druckdialog A4 / Querformat wählen. Eigene Hinweise gelten für diesen Export;
            sie verändern keine Projektdaten.
          </p>
          {error && <p role="alert">{error}</p>}
          {ids.map((id) => {
            const s = boardSchedule(p, id);
            return (
              <section key={id}>
                <h4>
                  {s.board.label} · {s.board.name} · {s.location}
                </h4>
                {s.rows.length ? (
                  s.rows.map((r) => (
                    <article className="home-row" key={r.id}>
                      <strong style={{ whiteSpace: "pre-line" }}>{r.protection}</strong>
                      <span style={{ whiteSpace: "pre-line" }}>{r.circuit}</span>
                      <details>
                        <summary>Räume, Geräte und FI anzeigen</summary>
                        <p style={{ whiteSpace: "pre-line" }}>{r.areas}</p>
                        <p style={{ whiteSpace: "pre-line" }}>FI: {r.fi}</p>
                        <p>Phase: {r.phase}</p>
                      </details>
                    </article>
                  ))
                ) : (
                  <p>Keine Stromkreise erfasst.</p>
                )}
              </section>
            );
          })}
        </>
      )}
    </section>
  );
}
