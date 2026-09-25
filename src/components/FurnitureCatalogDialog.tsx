import { useState } from "react";
import { Modal } from "./dialogs/Modal";
import { furnitureCatalog } from "../furniture/catalog";
import {
  furnitureFile,
  furnitureTemplateSchema,
  mergeFurniture,
  readFurnitureFile,
  readProductDimensions,
  useFurnitureLibrary,
  type FurnitureTemplate,
} from "../furniture/library";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";
import { download } from "../housebook/export";

const empty = () => ({
  id: String(crypto.randomUUID()),
  name: "",
  type: "custom",
  width: "1000",
  depth: "1000",
  height: "1000",
  manufacturer: "",
  source: "",
});
export function FurnitureCatalogDialog({ onClose }: { onClose: () => void }) {
  const library = useFurnitureLibrary();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(empty);
  const [productText, setProductText] = useState("");
  const [message, setMessage] = useState("");
  const [incoming, setIncoming] = useState<FurnitureTemplate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [remove, setRemove] = useState<string | null>(null);
  const selected = useEditorStore((s) => s.selection);
  const project = useProjectStore((s) => s.project);
  const selectedItem =
    selected.length === 1 && selected[0]?.kind === "furniture"
      ? project.furniture[selected[0].id]
      : undefined;
  const choose = (key: string) => {
    useEditorStore.getState().setTool("furniture");
    useEditorStore.setState({ furnitureType: key });
    onClose();
  };
  const run = (action: () => void) => {
    try {
      action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aktion fehlgeschlagen.");
    }
  };
  const edit = (item: FurnitureTemplate) => {
    setForm({ ...item, width: String(item.width), depth: String(item.depth), height: String(item.height) });
    setMessage("Vorlage unten bearbeiten. Bereits platzierte Möbel bleiben unverändert.");
  };
  const matches = (name: string) => name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  return (
    <Modal title="Globaler Möbelkatalog" onClose={onClose} className="furniture-catalog-dialog">
      <p>
        Eigene Vorlagen stehen in allen Projekten dieses Browsers zur Verfügung. Für andere Geräte den Katalog
        exportieren und dort importieren. Alle Modelle sind maßstäbliche 2D-Grundformen.
      </p>
      <label className="field">
        Möbel suchen
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <details open={!!query}>
        <summary>Standardvorlagen ({furnitureCatalog.length}) · Beispielmaße</summary>
        {furnitureCatalog
          .filter((p) => matches(p.name))
          .map((p) => (
            <div className="home-row" key={p.type}>
              <span>
                {p.name} · {p.width} × {p.depth} × {p.height} mm
              </span>
              <button onClick={() => choose(p.type)}>Platzieren: {p.name}</button>
            </div>
          ))}
      </details>
      <h3>Meine Möbel</h3>
      {library.error && <p role="alert">{library.error}</p>}
      {!library.items.length && (
        <p>Noch keine eigenen Vorlagen. Unten ein Möbel anlegen oder Maßangaben übernehmen.</p>
      )}
      {library.items
        .filter((i) => matches(`${i.name} ${i.manufacturer}`))
        .map((i) => (
          <div className="home-row" key={i.id}>
            <span>
              <strong>{i.name}</strong> · {i.manufacturer}
              <br />
              {i.width} × {i.depth} × {i.height} mm{" "}
              {i.source && (
                <a href={i.source} target="_blank" rel="noopener noreferrer">
                  Produktquelle
                </a>
              )}
            </span>
            <button onClick={() => choose(`library:${i.id}`)}>Platzieren: {i.name}</button>
            <button onClick={() => edit(i)}>Bearbeiten: {i.name}</button>
            <button onClick={() => setRemove(i.id)}>Entfernen: {i.name}</button>
            {remove === i.id && (
              <>
                <span>Nur die Vorlage entfernen? Platzierte Möbel bleiben erhalten.</span>
                <button
                  onClick={() =>
                    run(() => {
                      library.save(library.items.filter((item) => item.id !== i.id));
                      if (useEditorStore.getState().furnitureType === `library:${i.id}`) {
                        useEditorStore.getState().setTool("select");
                        useEditorStore.setState({ furnitureType: "custom" });
                      }
                      if (form.id === i.id) setForm(empty());
                      setRemove(null);
                      setMessage("Vorlage entfernt.");
                    })
                  }
                >
                  Vorlage endgültig entfernen
                </button>
                <button onClick={() => setRemove(null)}>Behalten</button>
              </>
            )}
          </div>
        ))}
      <h3>{library.items.some((i) => i.id === form.id) ? "Vorlage bearbeiten" : "Eigene Vorlage anlegen"}</h3>
      <button
        onClick={() => {
          setForm(empty());
          setProductText("");
        }}
      >
        Neue Vorlage
      </button>
      {selectedItem && (
        <button
          onClick={() =>
            setForm({
              ...empty(),
              name: selectedItem.name,
              type: furnitureCatalog.some((p) => p.type === selectedItem.type) ? selectedItem.type : "custom",
              width: String(selectedItem.width),
              depth: String(selectedItem.depth),
              height: String(selectedItem.height),
              manufacturer:
                typeof selectedItem.metadata.manufacturer === "string"
                  ? selectedItem.metadata.manufacturer
                  : "",
              source:
                typeof selectedItem.metadata.productSource === "string"
                  ? selectedItem.metadata.productSource
                  : "",
            })
          }
        >
          Ausgewähltes Möbel übernehmen
        </button>
      )}
      <label className="field">
        Vorlagenname
        <input
          maxLength={150}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </label>
      <label className="field">
        Hersteller
        <input
          maxLength={150}
          value={form.manufacturer}
          onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
        />
      </label>
      <label className="field">
        Produktlink (optional)
        <input
          type="url"
          maxLength={2000}
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
        />
      </label>
      <label className="field">
        Grundform
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {furnitureCatalog.map((i) => (
            <option key={i.type} value={i.type}>
              {i.name}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary>Maße von IKEA oder anderen Quellen übernehmen</summary>
        <p>
          Nur die Produktmaße von der Herstellerseite kopieren und hier einfügen, ohne Verpackungsmaße.
          Unterstützt: „Breite: 80 cm, Tiefe: 28 cm, Höhe: 202 cm“ oder „80 × 28 × 202 cm“. Bei drei Zahlen
          wird Breite × Tiefe × Höhe angenommen – Reihenfolge am Produkt prüfen. Der Link allein wird nicht
          abgerufen; Bilder und 3D-Modelle werden nicht importiert.
        </p>
        <label className="field">
          Kopierte Produktmaße
          <textarea maxLength={20000} value={productText} onChange={(e) => setProductText(e.target.value)} />
        </label>
        <button
          onClick={() =>
            run(() => {
              const sizes = readProductDimensions(productText);
              setForm({
                ...form,
                width: String(sizes.width),
                depth: String(sizes.depth),
                height: String(sizes.height),
              });
              setMessage(
                "Maße in Millimeter übernommen. Bitte Breite, Tiefe und Höhe prüfen und anschließend speichern.",
              );
            })
          }
        >
          Maße vorschlagen
        </button>
      </details>
      {(
        [
          ["width", "Breite"],
          ["depth", "Tiefe"],
          ["height", "Höhe"],
        ] as const
      ).map(([key, label]) => (
        <label className="field" key={key}>
          {label} (mm)
          <input
            inputMode="decimal"
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </label>
      ))}
      <button
        onClick={() =>
          run(() => {
            const parsed = furnitureTemplateSchema.safeParse({
              ...form,
              width: Number(form.width.replace(",", ".")),
              depth: Number(form.depth.replace(",", ".")),
              height: Number(form.height.replace(",", ".")),
            });
            if (!parsed.success)
              throw new Error(
                "Name, Grundform und positive Maße bis 100.000 mm prüfen. Produktlink: HTTP/HTTPS ohne Zugangsdaten.",
              );
            const items = library.items.filter((i) => i.id !== parsed.data.id);
            library.save([...items, parsed.data]);
            setMessage("Vorlage projektübergreifend gespeichert.");
            setForm(empty());
          })
        }
      >
        Vorlage speichern
      </button>
      <h3>Katalogdatei</h3>
      <button
        disabled={!library.items.length}
        onClick={() =>
          run(() =>
            download(furnitureFile(library.items), "Home-Technik-Moebelkatalog.json", "application/json"),
          )
        }
      >
        Möbelkatalog exportieren
      </button>
      <label className="field">
        Möbelkatalog importieren (JSON)
        <input
          type="file"
          accept=".json,application/json"
          disabled={loading}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setLoading(true);
            setIncoming(null);
            try {
              if (file.size > 2_000_000) throw new Error("Maximal 2 MB pro Katalogdatei.");
              setIncoming(readFurnitureFile(await file.text()));
              setMessage("Importvorschau bereit. Vorhandene Vorlagen werden nicht überschrieben.");
            } catch {
              setMessage(
                "Katalog nicht importiert. Erwartet wird eine gültige Home-Technik-Möbelkatalogdatei (maximal 2 MB, 1.000 Vorlagen).",
              );
            } finally {
              setLoading(false);
            }
          }}
        />
      </label>
      {incoming && (
        <>
          <p>
            Importvorschau: {incoming.length} Vorlagen. Identische Kennungen und Inhalte werden übersprungen,
            abweichende Inhalte als Kopie ergänzt.
          </p>
          <ul>
            {incoming.map((i) => (
              <li key={i.id}>
                {i.name}: {i.width} × {i.depth} × {i.height} mm
              </li>
            ))}
          </ul>
          <button
            onClick={() =>
              run(() => {
                library.save(mergeFurniture(library.items, incoming));
                setIncoming(null);
                setMessage("Katalog importiert.");
              })
            }
          >
            Importierte Vorlagen übernehmen
          </button>
          <button onClick={() => setIncoming(null)}>Import verwerfen</button>
        </>
      )}
      <p role="status">{loading ? "Datei wird geprüft …" : message}</p>
    </Modal>
  );
}
