import { Arrow, Group, Text } from "react-konva";
import type { Project } from "../../models/project";
import { housebook } from "../../housebook/model";
import { emptyZigbee } from "../../network/zigbeeModel";
import { useZigbeeStore } from "../../stores/zigbeeStore";
import { useEditorStore } from "../../stores/editorStore";

export function ZigbeeLinks({ project }: { project: Project }) {
  const editor = useEditorStore(),
    state = useZigbeeStore();
  const book = housebook(project);
  const snapshot = state.projectId === project.id ? state.snapshot : (book.zigbee ?? emptyZigbee());
  const selected = book.networkNodes.find((n) => editor.selection.some((s) => s.id === n.id))?.zigbeeAddress;
  const screen = (p: { x: number; y: number }) => ({
    x: editor.viewport.originPx.x + p.x * editor.viewport.scale,
    y: editor.viewport.originPx.y - p.y * editor.viewport.scale,
  });
  return (
    <Group>
      {snapshot.links
        .filter((l) => !selected || l.from === selected || l.to === selected)
        .map((link, index) => {
          const from = book.networkNodes.find((n) => n.zigbeeAddress === link.from),
            to = book.networkNodes.find((n) => n.zigbeeAddress === link.to);
          if (!from || !to) return null;
          const color =
            link.lqi === null
              ? "#64748b"
              : link.lqi < 80
                ? "#b33e35"
                : link.lqi < 150
                  ? "#b87916"
                  : "#16835f";
          const a = screen(from.position),
            b = screen(to.position);
          if (from.floorId !== to.floorId) {
            const local = from.floorId === editor.floorId ? from : to.floorId === editor.floorId ? to : null;
            if (!local) return null;
            const point = screen(local.position),
              remote = local === from ? to : from;
            return (
              <Text
                key={index}
                x={point.x + 25}
                y={point.y + 15 + (local === from ? 0 : 15)}
                fontSize={11}
                fill={color}
                text={`${local === from ? "→" : "←"} ${remote.name} · ${project.floors[remote.floorId]?.name} · LQI ${link.lqi ?? "?"}`}
              />
            );
          }
          if (from.floorId !== editor.floorId) return null;
          const dx = b.x - a.x,
            dy = b.y - a.y,
            length = Math.max(1, Math.hypot(dx, dy));
          const ox = (-dy / length) * 6,
            oy = (dx / length) * 6;
          return (
            <Group key={index}>
              <Arrow
                points={[
                  a.x + ox + (dx / length) * 22,
                  a.y + oy + (dy / length) * 22,
                  b.x + ox - (dx / length) * 24,
                  b.y + oy - (dy / length) * 24,
                ]}
                stroke={color}
                fill={color}
                pointerLength={7}
                pointerWidth={6}
                strokeWidth={link.routes.length ? 2 : 1}
                dash={link.routes.length ? [] : [4, 3]}
              />
              <Text
                x={(a.x + b.x) / 2 + ox * 2}
                y={(a.y + b.y) / 2 + oy * 2}
                text={`LQI ${link.lqi ?? "?"}${link.routes.length ? ` · ${link.routes.length} Route(n)` : ""}`}
                fontSize={11}
                fill={color}
              />
            </Group>
          );
        })}
    </Group>
  );
}
