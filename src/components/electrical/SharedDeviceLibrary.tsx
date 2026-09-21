import { useEffect, useState } from "react";
import { projectRepository } from "../../persistence/indexedDbRepository";
import { consumerLibrary, setConsumerLibrary, type ConsumerEntry } from "../../electrical/consumerLibrary";
import { useProjectStore } from "../../stores/projectStore";
import { newId } from "../../utils/uuid";
export function SharedDeviceLibrary({ entries }: { entries: ConsumerEntry[] }) {
  const [rows, setRows] = useState<ConsumerEntry[]>([]),
    [message, setMessage] = useState("");
  const refresh = () => projectRepository.deviceLibrary().then(setRows);
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
      await refresh();
    } catch (e) {
      setMessage(String(e));
    }
  };
  useEffect(() => {
    void refresh().catch((e) => setMessage(String(e)));
  }, []);
  return (
    <details>
      <summary>Projektübergreifende Gerätebibliothek</summary>
      <p>
        Diese Vorlagen stehen allen Projekten in diesem Browser zur Verfügung. Seriennummern werden nicht
        übernommen. Für andere Geräte die Bibliotheksdatei exportieren oder ein gemeinsames Projekt mit den
        Vorlagen verwenden.
      </p>
      {entries.map((entry) => (
        <div className="home-row" key={entry.id}>
          <span>{entry.name}</span>
          <button
            onClick={() =>
              void run(async () => {
                await projectRepository.updateDeviceLibrary(entry);
                setMessage("Vorlage projektübergreifend gespeichert.");
              })
            }
          >
            Übergreifend merken: {entry.name}
          </button>
        </div>
      ))}
      <h4>Gespeicherte Gerätevorlagen</h4>
      {rows.map((entry) => (
        <div className="home-row" key={entry.id}>
          <strong>{entry.name}</strong>
          <span>
            {entry.width} × {entry.depth} × {entry.height} mm · {entry.model}
          </span>
          <button
            onClick={() => {
              const ok = useProjectStore
                .getState()
                .commit("Gemeinsame Gerätevorlage übernehmen", (p) =>
                  setConsumerLibrary(p, [...consumerLibrary(p), { ...entry, id: newId() }]),
                );
              setMessage(
                ok
                  ? "Vorlage ins aktuelle Projekt übernommen."
                  : (useProjectStore.getState().error ?? "Übernahme fehlgeschlagen."),
              );
            }}
          >
            Ins Projekt übernehmen: {entry.name}
          </button>
          <button onClick={() => void run(() => projectRepository.updateDeviceLibrary(entry, true))}>
            Übergreifende Vorlage löschen: {entry.name}
          </button>
        </div>
      ))}
      {!rows.length && <p>Noch keine übergreifenden Vorlagen gespeichert.</p>}
      {message && <p role="status">{message}</p>}
    </details>
  );
}
