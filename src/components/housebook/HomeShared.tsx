import { useProjectStore } from "../../stores/projectStore";
import { homeBook, setHomeBook, type HomeBook, type HomeItem } from "../../housebook/home";
import { elementKinds, elementTables } from "../../core/elementTables";
import { focusObject } from "../../housebook/navigation";
import { Field } from "./shared";
export function updateHome(label: string, change: (book: HomeBook) => void) {
  return useProjectStore.getState().commit(label, (p) => {
    const b = homeBook(p);
    change(b);
    setHomeBook(p, b);
  });
}
export function TargetField({
  value,
  onChange,
  onClose,
}: {
  value: HomeItem["target"];
  onChange: (v: HomeItem["target"]) => void;
  onClose: () => void;
}) {
  const p = useProjectStore((s) => s.project),
    targets = elementKinds.flatMap((kind) =>
      Object.values(elementTables(p)[kind]).map((item) => ({ kind, item })),
    );
  const key = value ? `${value.kind}:${value.id}` : "",
    exists = targets.some((t) => `${t.kind}:${t.item.id}` === key);
  return (
    <>
      <Field label="Verknüpftes Planobjekt">
        <select
          value={key}
          onChange={(e) => {
            const t = targets.find((t) => `${t.kind}:${t.item.id}` === e.target.value);
            onChange(t ? { kind: t.kind, id: t.item.id } : null);
          }}
        >
          <option value="">Keine Verknüpfung</option>
          {key && !exists && <option value={key}>Planobjekt wurde entfernt</option>}
          {targets.map((t) => (
            <option key={`${t.kind}:${t.item.id}`} value={`${t.kind}:${t.item.id}`}>
              {"name" in t.item ? String(t.item.name) : t.kind} · {p.floors[t.item.floorId]?.name}
            </option>
          ))}
        </select>
      </Field>
      {value && exists && (
        <button
          type="button"
          onClick={() => {
            if (focusObject(value)) onClose();
            else useProjectStore.setState({ error: "Bitte die Ebene des Planobjekts einblenden." });
          }}
        >
          Im Plan zeigen
        </button>
      )}
    </>
  );
}
