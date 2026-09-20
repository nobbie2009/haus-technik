import { utilities } from "../../utilities/model";
import { nearestElectricalNode } from "../../electrical/cables";
import type { Vec2 } from "../../models/common";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { snap } from "../../geometry/snapping";
import { distance } from "../../geometry/distance";
import { parseLength } from "../../utils/units";
import { resizeWallEndpoints } from "../../geometry/wallGeometry";
import { addWallPath } from "../actions/topology";
import { createDimension, createRoom } from "../actions/create";
import { selectedPointIds } from "../actions/edit";

export function updateCursor(raw: Vec2, shift = false): Vec2 {
  const editor = useEditorStore.getState();
  shift ||= editor.orthogonal;
  const project = useProjectStore.getState().project;
  const excluded = editor.dragOffset ? selectedPointIds(project, editor.selection) : new Set<string>();
  const walls = Object.values(project.walls).filter(
    (wall) =>
      wall.floorId === editor.floorId &&
      project.layers[wall.layerId]?.visible &&
      !excluded.has(wall.startPointId) &&
      !excluded.has(wall.endPointId),
  );
  const visiblePoints = new Set(walls.flatMap((wall) => [wall.startPointId, wall.endPointId]));
  let result = snap(
    raw,
    Object.values(project.points)
      .filter((p) => visiblePoints.has(p.id))
      .map((p) => ({ id: p.id, position: p.position })),
    walls.map((wall) => ({
      id: wall.id,
      start: project.points[wall.startPointId]!.position,
      end: project.points[wall.endPointId]!.position,
    })),
    {
      scale: editor.viewport.scale,
      radiusPx: 9,
      gridSize: editor.gridSize,
      grid: editor.snapGrid,
      points: editor.snapPoints,
      walls: editor.snapWalls,
    },
    editor.snap,
  );
  let point = result?.position ?? raw;
  const anchor = editor.draft.points.at(-1);
  if (shift && anchor && editor.tool !== "rectangle") {
    point =
      Math.abs(point.x - anchor.x) >= Math.abs(point.y - anchor.y)
        ? { x: point.x, y: anchor.y }
        : { x: anchor.x, y: point.y };
  }
  if (anchor && editor.draft.input && (editor.tool === "wall" || editor.tool === "polygon")) {
    try {
      const direction = distance(anchor, point) > 0.001 ? point : { x: anchor.x + 1, y: anchor.y };
      point = resizeWallEndpoints(anchor, direction, parseLength(editor.draft.input)).end;
    } catch {
      /* Unvollständige Eingabe bleibt sichtbar, wird erst beim Bestätigen geprüft. */
    }
  }
  if (
    editor.tool === "polygon" &&
    editor.draft.points.length > 2 &&
    distance(raw, editor.draft.points[0]!) * editor.viewport.scale < 10 &&
    !editor.draft.input
  )
    point = editor.draft.points[0]!;
  if (editor.tool === "cable" || editor.tool === "connect") {
    const node = nearestElectricalNode(project, editor.floorId, raw, editor.viewport.scale);
    if (node) {
      point = { ...node.position };
      result = {
        position: point,
        distancePx: distance(raw, point) * editor.viewport.scale,
        target: { kind: "point", pointId: node.id },
      };
    }
  }
  if (editor.tool === "utilityPipe") {
    const node = Object.values(utilities(project).nodes)
      .reverse()
      .find(
        (n) =>
          n.floorId === editor.floorId &&
          project.layers[n.layerId]?.visible &&
          distance(raw, n.position) * editor.viewport.scale <= 18,
      );
    if (node) point = { ...node.position };
  }
  useEditorStore.setState({
    cursor: raw,
    snap: editor.draft.input || shift ? null : result,
    draft: { ...editor.draft, cursor: point },
  });
  return point;
}

export function confirmDrawing(point: Vec2, closePolygon = false): void {
  const editor = useEditorStore.getState();
  const { tool, draft, floorId } = editor;
  const commit = useProjectStore.getState().commit;
  const anchor = draft.points.at(-1);
  if (!anchor) {
    useEditorStore.setState({ draft: { points: [point], cursor: point, input: "" } });
    return;
  }
  if (draft.input) {
    try {
      if (parseLength(draft.input) < 1) throw new Error();
    } catch {
      useProjectStore.setState({ error: "Bitte eine gültige Länge ab 1 mm eingeben." });
      return;
    }
  }
  if (tool === "rectangle") {
    let roomId = "";
    const ok = commit("Rechteckraum zeichnen", (project) => {
      roomId = createRoom(project, floorId, [
        anchor,
        { x: point.x, y: anchor.y },
        point,
        { x: anchor.x, y: point.y },
      ]);
    });
    if (ok) {
      editor.cancel();
      useEditorStore.setState({ selection: [{ kind: "rooms", id: roomId }] });
    }
  } else if (tool === "polygon") {
    if (draft.points.length >= 3 && (closePolygon || distance(point, draft.points[0]!) < 0.001)) {
      let roomId = "";
      if (
        commit("Freien Raum zeichnen", (project) => {
          roomId = createRoom(project, floorId, draft.points);
        })
      ) {
        editor.cancel();
        useEditorStore.setState({ selection: [{ kind: "rooms", id: roomId }] });
      }
    } else if (distance(anchor, point) >= 1)
      useEditorStore.setState({ draft: { points: [...draft.points, point], cursor: point, input: "" } });
  } else if (tool === "wall") {
    const closed = draft.points.length > 2 && distance(point, draft.points[0]!) < 0.001;
    let selected = "";
    if (
      commit(closed ? "Wandzug schließen und Raum anlegen" : "Wand zeichnen", (project) => {
        const path = addWallPath(project, floorId, anchor, point);
        selected = path.wallIds[0]!;
        if (closed) createRoom(project, floorId, draft.points);
      })
    ) {
      useEditorStore.setState({
        selection: [{ kind: "walls", id: selected }],
        draft: { points: closed ? [] : [...draft.points, point], cursor: point, input: "" },
      });
    }
  } else if (tool === "dimension") {
    let id = "";
    if (
      commit("Bemaßung anlegen", (project) => {
        id = createDimension(project, floorId, anchor, point);
      })
    ) {
      editor.cancel();
      useEditorStore.setState({ selection: [{ kind: "dimensions", id }] });
    }
  }
}
