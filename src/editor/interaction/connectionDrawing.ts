import type { Vec2 } from "../../models/common";
import { nearestElectricalNode } from "../../electrical/cables";
import { contactsFor } from "../../electrical/contacts";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";

/** Gleicher Ablauf für Ziehen und zwei Einzelklicks; bis zum Dialog-Commit keine Modelldaten. */
export function confirmConnection(position: Vec2): void {
  const editor = useEditorStore.getState(),
    project = useProjectStore.getState().project;
  const target = nearestElectricalNode(project, editor.floorId, position, editor.viewport.scale);
  if (!target || !contactsFor(project, target.id).length) {
    useProjectStore.setState({
      error: "Bitte einen Lichtschalter, Verbraucher oder eine Steckdose als Anschluss wählen.",
    });
    return;
  }
  if (project.layers[target.layerId]!.locked) {
    useProjectStore.setState({ error: "Die Elektrikebene ist gesperrt." });
    return;
  }
  if (!editor.cableStartId) {
    useEditorStore.setState({
      cableStartId: target.id,
      selection: [],
      draft: { points: [{ ...target.position }], cursor: { ...target.position }, input: "" },
    });
  } else if (editor.cableStartId !== target.id) {
    const startNodeId = editor.cableStartId;
    editor.cancel();
    useEditorStore.setState({ connectionRequest: { startNodeId, endNodeId: target.id, cableId: null } });
  }
}
