import { elementTables } from "../../core/elementTables";
import { useProjectStore } from "../../stores/projectStore";
import type { ProjectMutation, Selection } from "../../editor/types";
import { LengthField } from "../Fields";

export function usePropertyFields(selection: Selection) {
  const project = useProjectStore((s) => s.project);
  const commit = useProjectStore((s) => s.commit);
  const entity = elementTables(project)[selection.kind][selection.id]!;
  const locked = project.layers[entity.layerId]!.locked;
  const unit = project.units.display;
  const change = (mutation: ProjectMutation) => commit("Eigenschaften ändern", mutation);
  const lengthField = (
    label: string,
    value: number,
    mutate: (draft: Parameters<ProjectMutation>[0], value: number) => void,
  ) => (
    <LengthField
      key={`${selection.id}${label}`}
      label={label}
      value={value}
      unit={unit}
      disabled={locked}
      onCommit={(value) => change((draft) => mutate(draft, value))}
    />
  );
  return { project, locked, unit, change, lengthField };
}
