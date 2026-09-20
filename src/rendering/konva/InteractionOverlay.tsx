import { Circle, Group, Line, Rect, Text } from "react-konva";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { worldToScreen } from "../../geometry/coordinates";
import { distance } from "../../geometry/distance";
import { formatLength } from "../../utils/units";

export function InteractionOverlay() {
  const editor = useEditorStore();
  const unit = useProjectStore((s) => s.project.units.display);
  const { draft, viewport, tool } = editor;
  const anchor = draft.points.at(-1);
  const cursor = draft.cursor;
  const screen = (p: { x: number; y: number }) => worldToScreen(p, viewport);
  let vertices = cursor ? [...draft.points, cursor] : draft.points;
  if (tool === "rectangle" && anchor && cursor)
    vertices = [anchor, { x: cursor.x, y: anchor.y }, cursor, { x: anchor.x, y: cursor.y }];
  const p = cursor ? screen(cursor) : null;
  const label = draft.input
    ? `${draft.input} ${/[mc]/i.test(draft.input) ? "" : "mm"} ↵`
    : anchor && cursor
      ? formatLength(
          tool === "cable" || tool === "utilityPipe"
            ? vertices.slice(1).reduce((sum, p, i) => sum + distance(vertices[i]!, p), 0)
            : distance(anchor, cursor),
          unit,
        )
      : "";
  return (
    <>
      {vertices.length > 1 && tool !== "utilityPipe" && (
        <Line
          points={vertices.flatMap((v) => {
            const value = screen(v);
            return [value.x, value.y];
          })}
          closed={tool === "rectangle"}
          fill={tool === "rectangle" ? "#16846b15" : "transparent"}
          stroke="#16846b"
          strokeWidth={1.7}
          dash={[6, 4]}
        />
      )}
      {draft.points.map((point, i) => {
        const v = screen(point);
        return (
          <Circle key={i} x={v.x} y={v.y} radius={3.5} stroke="#16846b" strokeWidth={1.5} fill="white" />
        );
      })}
      {editor.snap && p && tool !== "select" && tool !== "pan" && (
        <Rect
          x={p.x - 5}
          y={p.y - 5}
          width={10}
          height={10}
          stroke="#16846b"
          strokeWidth={1.5}
          fill="#ffffffa0"
          rotation={editor.snap.target.kind === "point" ? 45 : 0}
        />
      )}
      {anchor && p && (
        <Group x={p.x + 16} y={p.y - 36}>
          <Rect width={145} height={27} fill="#17352e" cornerRadius={4} />
          <Text
            width={145}
            height={27}
            verticalAlign="middle"
            align="center"
            text={label}
            fontSize={12}
            fill="#f4fff8"
            fontFamily="IBM Plex Mono, monospace"
          />
        </Group>
      )}
    </>
  );
}
