import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { life, setLife, newEvent, eventKinds, type HouseEvent } from "../../housebook/life";
import { readPlanImage } from "../../housebook/images";
import { download } from "../../housebook/export";
import { TargetField } from "./HomeShared";
import { Field } from "./shared";
export function ChroniclePanel({
  initialId,
  onClose,
}: {
  initialId?: string | undefined;
  onClose: () => void;
}) {
  const p = useProjectStore((s) => s.project),
    book = life(p);
  const [draft, setDraft] = useState<HouseEvent>(
      () => book.events.find((e) => e.id === initialId) ?? newEvent(),
    ),
    [filter, setFilter] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const rows = book.events
    .filter((e) =>
      `${e.title} ${e.location} ${e.notes}`.toLocaleLowerCase("de").includes(filter.toLocaleLowerCase("de")),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const photo = async (file: File, key: "before" | "after") => {
    const id = draft.id;
    setBusy(true);
    setError("");
    try {
      const image = await readPlanImage(file);
      setDraft((d) => (d.id === id ? { ...d, [key]: image.data } : d));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section>
      <h3>Hauschronik</h3>
      <p>Reparaturen, Umbauten und Anschaffungen mit Datum, Kosten und Unterlagen festhalten.</p>
      <Field label="Chronik durchsuchen">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      </Field>
      <button onClick={() => setDraft(newEvent())}>Neues Ereignis</button>
      {rows.map((e) => (
        <article className="home-row" key={e.id}>
          <strong>
            {e.date} · {e.title}
          </strong>
          <span>
            {eventKinds[e.kind]} · {e.location}{" "}
            {e.cost === null
              ? ""
              : `· ${e.cost.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`}
          </span>
          <button onClick={() => setDraft(structuredClone(e))}>Bearbeiten: {e.title}</button>
          <button
            onClick={() => {
              if (
                window.confirm("Ereignis samt Fotos und Beleg löschen?") &&
                useProjectStore.getState().commit("Chronikeintrag löschen", (p) => {
                  const b = life(p);
                  b.events = b.events.filter((v) => v.id !== e.id);
                  setLife(p, b);
                })
              ) {
                if (draft.id === e.id) setDraft(newEvent());
              }
            }}
          >
            Löschen: {e.title}
          </button>
        </article>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            useProjectStore.getState().commit("Chronikeintrag speichern", (p) => {
              const b = life(p),
                i = b.events.findIndex((e) => e.id === draft.id);
              if (i < 0) b.events.push(draft);
              else b.events[i] = draft;
              setLife(p, b);
            })
          )
            setDraft(newEvent());
        }}
      >
        <h4>Ereignis erfassen</h4>
        <div className="book-grid">
          <Field label="Ereignistitel">
            <input
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>
          <Field label="Ereignisdatum">
            <input
              required
              type="date"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </Field>
          <Field label="Ereignisart">
            <select
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as HouseEvent["kind"] })}
            >
              {Object.entries(eventKinds).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ort / Raum">
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </Field>
          <Field label="Kosten (€)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.cost ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, cost: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Ereignisnotizen">
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </Field>
          <TargetField
            value={draft.target}
            onChange={(target) => setDraft({ ...draft, target })}
            onClose={onClose}
          />
        </div>
        <div className="book-grid">
          {(
            [
              ["before", "Vorher"],
              ["after", "Nachher"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <Field label={`${label}-Foto`}>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void photo(f, key);
                  }}
                />
              </Field>
              {draft[key] && (
                <>
                  <img className="home-photo" src={draft[key]} alt={`${label}: ${draft.title}`} />
                  <button type="button" onClick={() => setDraft({ ...draft, [key]: "" })}>
                    {label}-Foto entfernen
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <Field label="Rechnung / Beleg (PDF oder Bild)">
          <input
            disabled={busy}
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              setError("");
              const id = draft.id;
              try {
                let data: string;
                if (file.type === "application/pdf") {
                  if (file.size > 4_000_000) throw new Error("PDF-Beleg zu groß (maximal 4 MB).");
                  const bytes = new Uint8Array(await file.arrayBuffer());
                  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
                    throw new Error("Keine gültige PDF-Datei.");
                  let binary = "";
                  for (let i = 0; i < bytes.length; i += 8192)
                    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
                  data = `data:application/pdf;base64,${btoa(binary)}`;
                } else data = (await readPlanImage(file)).data;
                setDraft((d) =>
                  d.id === id
                    ? {
                        ...d,
                        receipt: {
                          name:
                            file.type === "application/pdf"
                              ? file.name
                              : file.name.replace(/\.[^.]+$/, "") + ".jpg",
                          data,
                        },
                      }
                    : d,
                );
              } catch (e) {
                setError(String(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        </Field>
        {draft.receipt && (
          <div className="book-actions">
            <span>{draft.receipt.name}</span>
            <button
              type="button"
              onClick={() => {
                const r = draft.receipt!,
                  mime = r.data.slice(5, r.data.indexOf(";")),
                  bytes = Uint8Array.from(atob(r.data.split(",")[1]!), (c) => c.charCodeAt(0));
                download(bytes, r.name, mime);
              }}
            >
              Beleg herunterladen
            </button>
            <button type="button" onClick={() => setDraft({ ...draft, receipt: null })}>
              Beleg entfernen
            </button>
          </div>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="book-actions">
          <button disabled={busy}>Ereignis speichern</button>
        </div>
      </form>
    </section>
  );
}
