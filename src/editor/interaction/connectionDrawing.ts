import type { Vec2 } from "../../models/common";
import { nearestElectricalNode } from "../../electrical/cables";
import { contactsFor } from "../../electrical/contacts";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { networkNodeTable } from "../../network/model";
import { ensureNetworkPower } from "../../network/power";

/** Gemeinsame Zielerkennung; Netzwerkgeräte erhalten bei Bedarf ihren Stromanschluss. */
export function electricalConnectionTarget(position: Vec2) {
  const editor = useEditorStore.getState();
  let project = useProjectStore.getState().project;
  let target = nearestElectricalNode(project, editor.floorId, position, editor.viewport.scale);
  if (!target) {
    const node = Object.values(networkNodeTable(project))
      .filter((n) => n.floorId === editor.floorId && project.layers[n.layerId]?.visible)
      .map((n) => ({
        node: n,
        distance: Math.hypot(n.position.x - position.x, n.position.y - position.y) * editor.viewport.scale,
      }))
      .filter((n) => n.distance <= 14)
      .sort((a, b) => a.distance - b.distance)[0]?.node;
    if (node) {
      let id = "";
      if (
        !useProjectStore.getState().commit("Netzwerk-Stromanschluss einrichten", (d) => {
          id = ensureNetworkPower(d, node.id);
        })
      )
        return;
      project = useProjectStore.getState().project;
      target = project.electrical.devices[id]!;
    }
  }
  return target;
}

export function confirmConnection(position: Vec2): void {
  const editor = useEditorStore.getState();
  const target = electricalConnectionTarget(position);
  const project = useProjectStore.getState().project;
  if (!target || !contactsFor(project, target.id).length) {
    useProjectStore.setState({
      error: "Bitte ein Elektroobjekt oder Netzwerkgerät als Anschluss wählen.",
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
