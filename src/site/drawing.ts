import type { Vec2 } from "../models/common";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";
import { parseLength } from "../utils/units";
import { distance } from "../geometry/distance";
import { addSiteElement, siteClosed } from "./model";
export function confirmSite(point: Vec2, finish = false) {
  const editor = useEditorStore.getState(),
    points = editor.draft.points;
  if (editor.draft.input) {
    try {
      if (parseLength(editor.draft.input) < 1) throw new Error();
    } catch {
      useProjectStore.setState({ error: "Bitte eine gültige Länge ab 1 mm eingeben." });
      return;
    }
  }
  const closed = siteClosed(editor.siteKind);
  const closing = closed && points.length >= 3 && distance(point, points[0]!) < 0.001;
  if (editor.siteKind === "reference" || finish || closing) {
    const vertices = editor.siteKind === "reference" ? [point] : points;
    let id = "";
    if (
      useProjectStore.getState().commit(`${closed ? "Grundstücksfläche" : "Außenobjekt"} zeichnen`, (p) => {
        id = addSiteElement(p, editor.floorId, editor.siteKind, vertices, editor.siteWidth);
      })
    ) {
      editor.cancel();
      useEditorStore.setState({ selection: [{ kind: "siteElements", id }], tool: "select" });
    }
    return;
  }
  if (!points.length || distance(points.at(-1)!, point) >= 1)
    useEditorStore.setState({ draft: { points: [...points, { ...point }], cursor: point, input: "" } });
}
