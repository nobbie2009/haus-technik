import { furnitureCatalog } from "../furniture/catalog";
import { useEditorStore } from "../stores/editorStore";

export function FurnitureLibrary() {
  const type = useEditorStore((s) => s.furnitureType);
  const preset = furnitureCatalog.find((item) => item.type === type)!;
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
        </select>
      </label>
      <p>
        {preset.width} × {preset.depth} × {preset.height} mm
      </p>
      <p>Auf den Mittelpunkt klicken. Maße, Name und Drehung anschließend rechts bearbeiten.</p>
    </div>
  );
}
