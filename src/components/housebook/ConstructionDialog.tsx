import { useState } from "react";
import { Modal } from "../dialogs/Modal";
import { Field } from "./shared";
import { VoiceNote } from "./VoiceNote";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { searchEntries } from "../../housebook/search";
import { constructionNotes, setConstructionNotes, type ConstructionNote } from "../../housebook/construction";
import { readPlanImage } from "../../housebook/images";
import { newId } from "../../utils/uuid";
const fresh = (): ConstructionNote => ({
  id: newId(),
  at: new Date().toISOString(),
  title: "",
  target: useEditorStore.getState().selection[0] ?? null,
  notes: "",
  measurement: "",
  done: false,
  photo: "",
  audio: "",
});
export function ConstructionDialog({ onClose }: { onClose: () => void }) {
  const p = useProjectStore((s) => s.project),
    rows = constructionNotes(p),
    targets = searchEntries(p).filter((r) => r.target);
  const [draft, setDraft] = useState(fresh),
    [error, setError] = useState(""),
    [filter, setFilter] = useState(""),
    [busy, setBusy] = useState(false),
    [closing, setClosing] = useState(false);
  const [recording, setRecording] = useState(false);
  const dirty = !!(
    recording ||
    draft.title ||
    draft.notes ||
    draft.measurement ||
    draft.photo ||
    draft.audio
  );
  const save = () => {
    if (busy || recording) return;
    const ok = useProjectStore.getState().commit("Baustellennotiz speichern", (d) => {
      const rows = constructionNotes(d),
        index = rows.findIndex((r) => r.id === draft.id);
      if (index < 0) rows.push(draft);
      else rows[index] = draft;
      setConstructionNotes(d, rows);
    });
    if (ok) {
      setDraft(fresh());
      setError("");
    } else setError(useProjectStore.getState().error ?? "Speichern fehlgeschlagen.");
  };
  return (
    <Modal
      title="Baustellenansicht"
      className="housebook-dialog construction-dialog"
      onClose={() => (dirty ? setClosing(true) : onClose())}
    >
      <p>
        Fotos, Messwerte und Aufgaben direkt am Objekt erfassen. Offline bleiben die Angaben lokal
        gespeichert; verbundene Projekte werden später abgeglichen.
      </p>
      {closing && (
        <div role="alert">
          <p>Ungespeicherte Eingaben vorhanden.</p>
          <button onClick={() => setClosing(false)}>Weiter erfassen</button>
          <button onClick={onClose}>Eingaben verwerfen und schließen</button>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Baustellentitel">
          <input
            required
            maxLength={150}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </Field>
        <Field label="Baustellenobjekt">
          <select
            value={draft.target ? `${draft.target.kind}:${draft.target.id}` : ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                target:
                  targets.find((r) => `${r.target!.kind}:${r.target!.id}` === e.target.value)?.target ?? null,
              })
            }
          >
            <option value="">Allgemeine Notiz</option>
            {targets.map((r) => (
              <option key={r.key} value={`${r.target!.kind}:${r.target!.id}`}>
                {r.title} · {r.location}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Baustellennotiz">
          <textarea
            rows={4}
            maxLength={10000}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </Field>
        <Field label="Messwert mit Einheit und Bezug">
          <input
            maxLength={2000}
            placeholder="z. B. Kabel 45 cm unter Terrassenkante"
            value={draft.measurement}
            onChange={(e) => setDraft({ ...draft, measurement: e.target.value })}
          />
        </Field>
        <Field label="Baustellenfoto aufnehmen oder auswählen">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              try {
                const image = await readPlanImage(file);
                setDraft((d) => ({ ...d, photo: image.data }));
              } catch (e) {
                setError(String(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        </Field>
        {draft.photo && (
          <img
            src={draft.photo}
            alt="Baustellenfoto im Entwurf"
            style={{ maxWidth: "100%", maxHeight: 240 }}
          />
        )}
        <VoiceNote
          key={draft.id}
          onBusy={setRecording}
          onAudio={(audio) => setDraft((d) => ({ ...d, audio }))}
        />
        {draft.audio && <audio controls src={draft.audio} />}
        <label className="field">
          <input
            type="checkbox"
            checked={draft.done}
            onChange={(e) => setDraft({ ...draft, done: e.target.checked })}
          />
          Arbeit erledigt
        </label>
        <button className="primary" disabled={busy || recording}>
          Baustellennotiz speichern
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      <hr />
      <Field label="Baustelleneinträge suchen">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      </Field>
      {rows
        .filter((r) => `${r.title} ${r.notes} ${r.measurement}`.toLowerCase().includes(filter.toLowerCase()))
        .slice()
        .reverse()
        .map((r) => (
          <article className="info-card" key={r.id}>
            <h3>{r.title}</h3>
            <p>
              {new Date(r.at).toLocaleString("de-DE")} · {r.done ? "Erledigt" : "Offen"} ·{" "}
              {targets.find((t) => t.target?.id === r.target?.id)?.title ?? "Allgemein / Objekt entfernt"}
            </p>
            <p>{r.notes}</p>
            <p>{r.measurement}</p>
            {r.photo && <img src={r.photo} alt={r.title} style={{ maxWidth: "100%", maxHeight: 240 }} />}
            {r.audio && <audio controls src={r.audio} />}
            <button disabled={dirty} onClick={() => setDraft(structuredClone(r))}>
              Bearbeiten: {r.title}
            </button>
            <button
              disabled={dirty && draft.id === r.id}
              onClick={() =>
                useProjectStore.getState().commit("Baustellenaufgabe umschalten", (d) =>
                  setConstructionNotes(
                    d,
                    constructionNotes(d).map((n) => (n.id === r.id ? { ...n, done: !n.done } : n)),
                  ),
                )
              }
            >
              {r.done ? "Wieder öffnen" : "Als erledigt markieren"}: {r.title}
            </button>
          </article>
        ))}
    </Modal>
  );
}
