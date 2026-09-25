import { furnitureCatalog } from "../furniture/catalog";
import { useEditorStore } from "../stores/editorStore";
import { useState } from "react";
import { FurnitureCatalogDialog } from "./FurnitureCatalogDialog";
import { useFurnitureLibrary } from "../furniture/library";

export function FurnitureLibrary() {
  const type = useEditorStore((s) => s.furnitureType);
  const entries = useFurnitureLibrary((s) => s.items);
  const [open, setOpen] = useState(false);
  const preset =
    entries.find((item) => `library:${item.id}` === type) ??
    furnitureCatalog.find((item) => item.type === type) ??
    furnitureCatalog.at(-1)!;
  return (
    <div className="furniture-library">
      <label className="field">
        <span>Objektvorlage</span>
        <select
          aria-label="Objektvorlage"
          value={type}
          onChange={(event) => {
            useEditorStore.getState().setTool("furniture");
            useEditorStore.setState({ furnitureType: event.target.value });
          }}
        >
          {furnitureCatalog.map((item) => (
            <option key={item.type} value={item.type}>
              {item.name}
            </option>
          ))}
          {entries.map((item) => (
            <option key={item.id} value={`library:${item.id}`}>
              {item.manufacturer ? `${item.manufacturer} · ` : ""}
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <button onClick={() => useEditorStore.getState().setTool("furniture")}>Möbel im Plan platzieren</button>
      <button onClick={() => setOpen(true)}>Globaler Möbelkatalog</button>
      {open && <FurnitureCatalogDialog onClose={() => setOpen(false)} />}
      <p>
        {preset.width} × {preset.depth} × {preset.height} mm
      </p>
      <p>Platzieren, dann Auswahl (V): Größe an den Griffen ziehen. Name und Drehung rechts bearbeiten.</p>
    </div>
  );
}
