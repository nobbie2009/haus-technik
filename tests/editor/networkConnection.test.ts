import { expect, it } from "vitest";
import { distributionFixture } from "../electrical/distributionFixture";
import { addNetworkNode } from "../../src/network/model";
import { useProjectStore } from "../../src/stores/projectStore";
import { useEditorStore } from "../../src/stores/editorStore";
import { confirmCable } from "../../src/editor/interaction/cableDrawing";
import { confirmConnection } from "../../src/editor/interaction/connectionDrawing";

it("erkennt Netzwerkgeräte beim Zeichnen einer elektrischen Anschlussverbindung", () => {
  const { project, upper, outlet } = distributionFixture();
  const position = { x: 1000, y: 1800 };
  const id = addNetworkNode(project, upper.id, position, "router");
  useProjectStore.getState().replace(project);
  useEditorStore.getState().cancel();
  useEditorStore.setState({
    floorId: upper.id,
    viewport: { ...useEditorStore.getState().viewport, scale: 0.1 },
  });
  confirmConnection(position);
  const power = useEditorStore.getState().cableStartId!;
  expect(useProjectStore.getState().project.electrical.devices[power]!.metadata.networkNodeId).toBe(id);
  confirmConnection(project.electrical.outlets[outlet]!.position);
  expect(useEditorStore.getState().connectionRequest).toMatchObject({
    startNodeId: power,
    endNodeId: outlet,
  });
});

it("übergibt den gezeichneten Netzwerk-Stromweg ohne vorzeitig eine Leitung anzulegen", () => {
  const { project, upper, outlet } = distributionFixture();
  const position = { x: 1000, y: 1800 };
  addNetworkNode(project, upper.id, position, "router");
  useProjectStore.getState().replace(project);
  useEditorStore.getState().cancel();
  useEditorStore.setState({
    floorId: upper.id,
    viewport: { ...useEditorStore.getState().viewport, scale: 0.1 },
  });
  confirmCable(position);
  const power = useEditorStore.getState().cableStartId!;
  const waypoint = { x: 8000, y: 9000 };
  confirmCable(waypoint);
  const before = useProjectStore.getState().project;
  confirmCable(project.electrical.outlets[outlet]!.position);
  expect(useEditorStore.getState().connectionRequest).toEqual({
    startNodeId: power,
    endNodeId: outlet,
    cableId: null,
    path: [waypoint],
  });
  expect(useProjectStore.getState().project).toBe(before);
  useEditorStore.getState().cancel();
  expect(useEditorStore.getState().connectionRequest).toBeNull();
  expect(useProjectStore.getState().project).toBe(before);
});
