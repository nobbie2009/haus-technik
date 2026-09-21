import { useState } from "react";
import { Modal } from "../dialogs/Modal";
import { Field } from "../housebook/shared";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import {
  consumerLibrary,
  consumerEntrySchema,
  setConsumerLibrary,
  importConsumerLibrary,
  type ConsumerEntry,
} from "../../electrical/consumerLibrary";
import { download } from "../../housebook/export";
import { newId } from "../../utils/uuid";
import { SharedDeviceLibrary } from "./SharedDeviceLibrary";

const empty = (): ConsumerEntry => ({
  id: newId(),
  name: "",
  manufacturer: "",
  model: "",
  serial: "",
  width: 600,
  depth: 650,
  height: 1850,
  rotation: 0,
  annualEnergyKWh: null,
  ratedPower: null,
  ratedVoltage: null,
  phases: 1,
});
export function ConsumerLibraryDialog({ onClose }: { onClose: () => void }) {
  const project = useProjectStore((s) => s.project),
    commit = useProjectStore((s) => s.commit);
  const [draft, setDraft] = useState(empty),
    [query, setQuery] = useState(""),
    [message, setMessage] = useState(""),
    [removeId, setRemoveId] = useState<string | null>(null);
  const entries = consumerLibrary(project);
  const edit = <K extends keyof ConsumerEntry>(key: K, value: ConsumerEntry[K]) =>
    setDraft((old) => ({ ...old, [key]: value }));
  return (
    <Modal title="Verbraucherdatenbank" className="housebook-dialog" onClose={onClose}>
      <SharedDeviceLibrary entries={entries} />
      <p>
        Geräte dieses Projekts speichern, suchen und im Plan platzieren. Eine Platzierung erhält eine eigene
        Kopie der Daten. Änderungen an der Vorlage verändern bereits platzierte Geräte nicht.
      </p>
      <div className="book-actions">
        <button
          disabled={!entries.length}
          onClick={() =>
            download(
              JSON.stringify(entries, null, 2),
              "verbraucher.consumer-library.json",
              "application/json",
            )
          }
        >
          Bibliothek exportieren
        </button>
        <Field label="Bibliothek als neue Einträge importieren">
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              if (file.size > 5_000_000) {
                setMessage("Bibliotheksdatei zu groß (maximal 5 MB).");
                return;
              }
              try {
                const text = await file.text();
                if (
                  commit("Verbraucherbibliothek importieren", (p) => {
                    importConsumerLibrary(p, text, newId);
                  })
                )
                  setMessage("Bibliothek als neue Einträge importiert.");
                else setMessage(useProjectStore.getState().error ?? "Import fehlgeschlagen.");
              } catch {
                setMessage("Datei konnte nicht gelesen werden.");
              }
            }}
          />
        </Field>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = consumerEntrySchema.safeParse(draft);
          if (!parsed.success) {
            setMessage(parsed.error.issues.map((i) => i.message).join(" "));
            return;
          }
          if (
            commit("Verbrauchervorlage speichern", (p) => {
              const items = consumerLibrary(p),
                index = items.findIndex((e) => e.id === draft.id);
              if (index < 0) items.push(parsed.data);
              else items[index] = parsed.data;
              setConsumerLibrary(p, items);
            })
          )
            setMessage("Verbraucher gespeichert.");
          else setMessage(useProjectStore.getState().error ?? "Speichern fehlgeschlagen.");
        }}
      >
        <div className="book-grid">
          {(
            [
              ["name", "Gerätename"],
              ["manufacturer", "Hersteller"],
              ["model", "Modell"],
              ["serial", "Seriennummer"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                required={key === "name"}
                maxLength={key === "name" ? 150 : 2000}
                value={draft[key]}
                onChange={(e) => edit(key, e.target.value)}
              />
            </Field>
          ))}
          {(
            [
              ["width", "Breite (mm)"],
              ["depth", "Tiefe (mm)"],
              ["height", "Höhe (mm)"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                required
                type="number"
                min="1"
                max="100000"
                step="any"
                value={draft[key]}
                onChange={(e) => edit(key, Number(e.target.value))}
              />
            </Field>
          ))}
          {(
            [
              ["ratedVoltage", "Nennspannung (V)"],
              ["ratedPower", "Nennleistung (W)"],
              ["annualEnergyKWh", "Jahresverbrauch (kWh/Jahr)"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                min={key === "ratedVoltage" ? 0.001 : 0}
                max={key === "ratedVoltage" ? 1e6 : 1e9}
                step="any"
                value={draft[key] ?? ""}
                onChange={(e) => edit(key, e.target.value === "" ? null : Number(e.target.value))}
              />
            </Field>
          ))}
          <Field label="Phasen">
            <select value={draft.phases} onChange={(e) => edit("phases", Number(e.target.value) as 1 | 3)}>
              <option value="1">Einphasig</option>
              <option value="3">Dreiphasig</option>
            </select>
          </Field>
        </div>
        <p>
          Unbekannte elektrische Werte leer lassen. kWh/Jahr dokumentiert den Energieverbrauch; für die
          Stromkreissimulation gilt die Nennleistung in Watt.
        </p>
        <div className="book-actions">
          <button type="submit">Verbraucher speichern</button>
          <button
            type="button"
            onClick={() => {
              setDraft(empty());
              setMessage("");
            }}
          >
            Neuer Eintrag
          </button>
        </div>
      </form>
      {message && <p role="status">{message}</p>}
      <Field label="Verbraucher suchen">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </Field>
      <ul className="book-list">
        {entries
          .filter((e) =>
            `${e.name} ${e.manufacturer} ${e.model} ${e.serial}`
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()),
          )
          .map((entry) => (
            <li key={entry.id}>
              <span>
                <strong>{entry.name}</strong>
                <small>
                  {entry.manufacturer} {entry.model} · {entry.serial || "Keine Seriennummer"}
                </small>
                <small>
                  {entry.width} × {entry.depth} × {entry.height} mm · {entry.ratedVoltage ?? "?"} V ·{" "}
                  {entry.ratedPower ?? "?"} W · {entry.annualEnergyKWh ?? "?"} kWh/Jahr
                </small>
              </span>
              <button
                aria-label={`${entry.name} platzieren`}
                onClick={() => {
                  const editor = useEditorStore.getState();
                  editor.setTool("electrical");
                  useEditorStore.setState({
                    electricalKind: "devices",
                    consumerEntryId: entry.id,
                    message: `${entry.name}: Mittelpunkt auf dem Plan antippen. Bearbeitung und Anschluss unter Eigenschaften.`,
                  });
                  onClose();
                }}
              >
                Platzieren
              </button>
              <button
                aria-label={`${entry.name} bearbeiten`}
                onClick={() => {
                  setDraft(structuredClone(entry));
                  setMessage("Eintrag zur Bearbeitung geladen.");
                }}
              >
                Bearbeiten
              </button>
              <button
                aria-label={`${entry.name} als neue Vorlage kopieren`}
                onClick={() => {
                  setDraft({ ...entry, id: newId(), name: `${entry.name} Kopie`, serial: "" });
                  setMessage("Kopie ohne Seriennummer vorbereitet. Bitte speichern.");
                }}
              >
                Kopieren
              </button>
              <button
                aria-label={`${entry.name} aus Bibliothek löschen`}
                onClick={() => setRemoveId(entry.id)}
              >
                Löschen
              </button>
              {removeId === entry.id && (
                <div className="book-actions">
                  <span>Nur die Vorlage löschen? Platzierte Geräte bleiben erhalten.</span>
                  <button
                    onClick={() => {
                      if (
                        commit("Verbrauchervorlage löschen", (p) =>
                          setConsumerLibrary(
                            p,
                            consumerLibrary(p).filter((i) => i.id !== entry.id),
                          ),
                        )
                      ) {
                        setRemoveId(null);
                        if (draft.id === entry.id) setDraft(empty());
                      }
                    }}
                  >
                    Vorlage endgültig löschen
                  </button>
                  <button onClick={() => setRemoveId(null)}>Abbrechen</button>
                </div>
              )}
            </li>
          ))}
      </ul>
      {!entries.length && <p>Noch keine Geräte angelegt.</p>}
    </Modal>
  );
}
