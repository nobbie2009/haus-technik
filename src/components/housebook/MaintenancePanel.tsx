import { useState } from "react";
import { MaintenanceCalendar } from "./MaintenanceCalendar";
import { useProjectStore } from "../../stores/projectStore";
import { homeBook, dueOverview, completeTask, localDate, type MaintenanceTask } from "../../housebook/home";
import { newId } from "../../utils/uuid";
import { Field } from "./shared";
import { TargetField, updateHome } from "./HomeShared";
const fresh = (): MaintenanceTask => ({
  id: newId(),
  title: "",
  location: "",
  target: null,
  itemId: null,
  notes: "",
  due: "",
  intervalMonths: 0,
  history: [],
});
export function MaintenancePanel({
  onClose,
  initialId,
}: {
  onClose: () => void;
  initialId?: string | undefined;
}) {
  const p = useProjectStore((s) => s.project),
    b = homeBook(p),
    rows = dueOverview(p);
  const [draft, setDraft] = useState(() => {
      const item = initialId?.startsWith("item:")
        ? b.items.find((i) => i.id === initialId.slice(5))
        : undefined;
      return (
        b.tasks.find((t) => t.id === initialId) ??
        (item
          ? {
              ...fresh(),
              title: `Pflege: ${item.name}`,
              location: item.location,
              itemId: item.id,
              target: item.target,
            }
          : fresh())
      );
    }),
    [done, setDone] = useState(""),
    [date, setDate] = useState(localDate),
    [note, setNote] = useState("");
  return (
    <section>
      <h3>Wartungen & Prüftermine</h3>
      <MaintenanceCalendar />
      <p>
        Termine aus Hausobjekten und Objektakten stehen hier gemeinsam. Erinnerungen werden in dieser Ansicht
        angezeigt.
      </p>
      {rows.length === 0 && <p>Keine Termine geplant.</p>}
      {rows.map((r) => (
        <article className="home-row" key={r.id}>
          <strong>
            {r.date} · {r.name}
          </strong>
          <span>
            {r.location} · {r.source} · {r.overdue ? "Überfällig" : r.today ? "Heute fällig" : "Geplant"}
          </span>
        </article>
      ))}
      <h4>Wartungsaufgaben</h4>
      <button onClick={() => setDraft(fresh())}>Neue Wartung</button>
      {b.tasks.map((t) => (
        <article className="home-row" key={t.id}>
          <strong>{t.title}</strong>
          <span>
            {t.due || (t.history.length ? "Erledigt" : "Ohne Termin")} · {t.location}
          </span>
          <button onClick={() => setDraft(structuredClone(t))}>Bearbeiten: {t.title}</button>
          <button
            onClick={() => {
              setDone(t.id);
              setDate(localDate());
              setNote("");
            }}
          >
            Erledigen: {t.title}
          </button>
          <button
            onClick={() => {
              if (
                window.confirm("Wartung einschließlich Verlauf löschen?") &&
                updateHome("Wartung löschen", (b) => {
                  b.tasks = b.tasks.filter((v) => v.id !== t.id);
                })
              ) {
                if (draft.id === t.id) setDraft(fresh());
                if (done === t.id) setDone("");
              }
            }}
          >
            Löschen: {t.title}
          </button>
          {t.history.length > 0 && (
            <details>
              <summary>Erledigungshistorie ({t.history.length})</summary>
              {[...t.history].reverse().map((h) => (
                <p key={h.id}>
                  {h.date} · {h.note || "Erledigt"}
                </p>
              ))}
            </details>
          )}
        </article>
      ))}
      {done && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (
              updateHome("Wartung erledigen", (b) => {
                const t = b.tasks.find((t) => t.id === done);
                if (t) completeTask(t, date, note);
              })
            ) {
              setDone("");
            }
          }}
        >
          <h4>Erledigung dokumentieren</h4>
          <Field label="Erledigt am">
            <input
              required
              type="date"
              max={localDate()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Erledigungsnotiz">
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="book-actions">
            <button>Erledigung speichern</button>
            <button type="button" onClick={() => setDone("")}>
              Abbrechen
            </button>
          </div>
        </form>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            updateHome("Wartung speichern", (b) => {
              const old = b.tasks.find((t) => t.id === draft.id);
              if (old) Object.assign(old, { ...draft, history: old.history });
              else b.tasks.push(draft);
            })
          )
            setDraft(fresh());
        }}
      >
        <h4>Wartungsdaten</h4>
        <div className="book-grid">
          <Field label="Wartungsname">
            <input
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>
          <Field label="Wartungsstandort">
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </Field>
          <Field label="Fällig am">
            <input
              type="date"
              value={draft.due}
              onChange={(e) => setDraft({ ...draft, due: e.target.value })}
            />
          </Field>
          <Field label="Wiederholung (Monate, 0 = einmalig)">
            <input
              type="number"
              min="0"
              max="120"
              value={draft.intervalMonths}
              onChange={(e) => setDraft({ ...draft, intervalMonths: Number(e.target.value) })}
            />
          </Field>
          <Field label="Zugehöriges Hausobjekt">
            <select
              value={draft.itemId ?? ""}
              onChange={(e) => setDraft({ ...draft, itemId: e.target.value || null })}
            >
              <option value="">Keines</option>
              {b.items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Wartungsnotizen">
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </Field>
          <TargetField
            value={draft.target}
            onChange={(target) => setDraft({ ...draft, target })}
            onClose={onClose}
          />
        </div>
        <p>
          Wiederholungen beginnen am dokumentierten Erledigungsdatum; am Monatsende wird auf den letzten
          gültigen Tag gekürzt.
        </p>
        <div className="book-actions">
          <button>Wartung speichern</button>
        </div>
      </form>
    </section>
  );
}
