import { housebook, setHousebook } from "../housebook/model";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";
import { fitView } from "../editor/interaction/commands";
import type { Vec2 } from "../models/common";
import { networkLayer } from "./model";
import { isTvKind } from "./tv";

export function confirmNetworkRoute(point: Vec2, hitPoint = point) {
  const editor = useEditorStore.getState();
  const project = useProjectStore.getState().project;
  const layer = networkLayer(project);
  if (!layer?.visible || layer.locked) {
    useProjectStore.setState({ error: "Netzwerkebene einblenden und entsperren." });
    return;
  }
  const nodes = housebook(project).networkNodes;
  if (editor.networkStartId && !nodes.some((n) => n.id === editor.networkStartId)) {
    editor.cancel();
    return;
  }
  const target = nodes
    .filter((n) => n.floorId === editor.floorId && !isTvKind(n.kind))
    .sort(
      (a, b) =>
        Math.hypot(a.position.x - hitPoint.x, a.position.y - hitPoint.y) -
        Math.hypot(b.position.x - hitPoint.x, b.position.y - hitPoint.y),
    )
    .find(
      (n) => Math.hypot(n.position.x - hitPoint.x, n.position.y - hitPoint.y) <= 24 / editor.viewport.scale,
    );
  if (!editor.networkStartId) {
    if (!target) {
      useProjectStore.setState({ error: "Netzwerkkabel an einem Netzwerkgerät beginnen." });
      return;
    }
    useEditorStore.setState({
      networkStartId: target.id,
      selection: [],
      networkRoute: [{ floorId: target.floorId, position: { ...target.position } }],
      draft: { points: [{ ...target.position }], cursor: null, input: "" },
    });
  } else if (target && target.id !== editor.networkStartId) {
    useEditorStore.setState({
      networkRequest: { from: editor.networkStartId, to: target.id, route: editor.networkRoute.slice(1) },
    });
  } else if (!target) {
    useEditorStore.setState({
      networkRoute: [...editor.networkRoute, { floorId: editor.floorId, position: { ...point } }],
      draft: { points: [...editor.draft.points, { ...point }], cursor: point, input: "" },
    });
  }
}

export function undoNetworkPoint() {
  const editor = useEditorStore.getState();
  if (!editor.networkStartId) {
    useEditorStore.setState({ draft: { ...editor.draft, points: editor.draft.points.slice(0, -1) } });
    return;
  }
  const route = editor.networkRoute.slice(0, -1);
  const last = route.at(-1);
  if (!last) {
    editor.cancel();
    return;
  }
  useEditorStore.setState({
    networkRoute: route,
    floorId: last.floorId,
    draft: { points: [last.position], cursor: null, input: "" },
  });
}

export function startNetworkPath(id: string) {
  const editor = useEditorStore.getState();
  const book = housebook(useProjectStore.getState().project);
  const link = book.networkLinks.find((l) => l.id === id);
  const a = book.networkNodes.find((n) => n.id === link?.from),
    b = book.networkNodes.find((n) => n.id === link?.to);
  if (!link || !a || !b || a.floorId !== b.floorId) return;
  if (editor.floorId !== a.floorId) {
    editor.setFloor(a.floorId);
    fitView();
  }
  editor.setTool("networkCable");
  useEditorStore.setState({ networkCableId: id, selection: [] });
}
export function finishNetworkPath() {
  const editor = useEditorStore.getState();
  if (!editor.networkCableId) {
    confirmNetworkRoute(editor.cursor);
    return;
  }
  if (
    useProjectStore.getState().commit("Koax-Leitungsweg speichern", (project) => {
      const book = housebook(project);
      const link = book.networkLinks.find((l) => l.id === editor.networkCableId);
      if (!link) throw new Error("Kabelverbindung fehlt.");
      link.path = editor.draft.points;
      delete link.route;
      setHousebook(project, book);
    })
  )
    editor.setTool("select");
}
