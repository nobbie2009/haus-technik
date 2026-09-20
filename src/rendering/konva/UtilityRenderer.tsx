import { Group, Line, Text, Circle } from "react-konva";
import type { Project } from "../../models/project";
import { worldToScreen } from "../../geometry/coordinates";
import { furnitureCorners } from "../../geometry/furniture";
import {
  utilities,
  media,
  pipeFloorPath,
  pipeLength,
  pipeCaptionPoint,
  supportedMedia,
  nodeMedia,
} from "../../utilities/model";
import { useEditorStore } from "../../stores/editorStore";
export function UtilityRenderer({ project }: { project: Project }) {
  const editor = useEditorStore(),
    net = utilities(project),
    viewport = editor.viewport;
  const screen = (points: { x: number; y: number }[]) =>
    points.flatMap((p) => {
      const s = worldToScreen(p, viewport);
      return [s.x, s.y];
    });
  const selected = (id: string) => editor.selection.some((s) => s.id === id);
  const cursor = worldToScreen(editor.draft.cursor ?? editor.cursor, viewport);
  return (
    <Group>
      {Object.values(net.pipes).map((pipe) => {
        const layer = project.layers[pipe.layerId];
        if (!layer?.visible) return null;
        const path = pipeFloorPath(project, pipe, editor.floorId);
        if (!path.length) return null;
        const riserPoint = editor.floorId === net.nodes[pipe.from]!.floorId ? path.at(-1)! : path[0]!;
        const p = worldToScreen(pipeCaptionPoint(path), viewport),
          m = media[pipe.medium];
        return (
          <Group key={pipe.id} opacity={layer.opacity}>
            <Line
              points={screen(path)}
              stroke={selected(pipe.id) ? "#167863" : m.color}
              strokeWidth={selected(pipe.id) ? 5 : 3}
              dash={pipe.medium === "return" ? [8, 4] : []}
            />
            <Text
              x={p.x + 8}
              y={p.y - 18}
              text={`${pipe.name} · ${m.short}${editor.showMeasurements ? ` · ${(pipeLength(project, pipe) / 1000).toFixed(2)} m` : ""}`}
              fill={m.color}
              fontSize={11}
            />
            {pipe.riser && (
              <>
                <Circle
                  x={worldToScreen(riserPoint, viewport).x}
                  y={worldToScreen(riserPoint, viewport).y}
                  radius={7}
                  stroke={m.color}
                  fill="white"
                />
                <Text
                  x={worldToScreen(riserPoint, viewport).x + 10}
                  y={worldToScreen(riserPoint, viewport).y - 16}
                  text={`↕ ${project.floors[net.nodes[pipe.from]!.floorId]?.name} / ${project.floors[net.nodes[pipe.to]!.floorId]?.name}`}
                  fontSize={11}
                  fill={m.color}
                />
              </>
            )}
          </Group>
        );
      })}
      {Object.values(net.nodes)
        .filter((n) => n.floorId === editor.floorId && project.layers[n.layerId]?.visible)
        .map((n) => {
          const p = worldToScreen(n.position, viewport),
            color = media[nodeMedia(n)[0]!].color;
          return (
            <Group key={n.id} opacity={project.layers[n.layerId]!.opacity}>
              <Line
                points={screen(furnitureCorners(n))}
                closed
                fill="#fffdf3"
                stroke={selected(n.id) ? "#167863" : color}
                strokeWidth={selected(n.id) ? 3 : 1.5}
              />
              <Circle x={p.x} y={p.y} radius={12} stroke={color} fill="white" strokeWidth={2} />
              <Text
                x={p.x - 10}
                y={p.y - 5}
                width={20}
                align="center"
                text={
                  n.kind === "valve"
                    ? n.closed
                      ? "×"
                      : "○"
                    : n.kind === "radiator" || n.kind === "heatingLoop"
                      ? "H"
                      : n.kind === "meter"
                        ? "Z"
                        : n.kind === "source"
                          ? "A"
                          : n.kind === "junction"
                            ? "+"
                            : "T"
                }
                fontSize={12}
                fill={color}
              />
              <Text
                x={p.x + 17}
                y={p.y - 7}
                text={`${n.name} · ${nodeMedia(n)
                  .map((m) => media[m].short)
                  .join("/")}${n.closed ? " · geschlossen" : ""}`}
                fill={color}
                fontSize={12}
              />
            </Group>
          );
        })}
      {editor.tool === "utilityNode" && (
        <Circle
          x={cursor.x}
          y={cursor.y}
          radius={12}
          stroke={media[supportedMedia(editor.utilityKind, editor.utilityMedium)[0]!].color}
          dash={[4, 3]}
        />
      )}
      {editor.tool === "utilityPipe" && editor.draft.points.length > 0 && (
        <Line
          points={screen([...editor.draft.points, editor.draft.cursor ?? editor.cursor])}
          stroke={media[editor.utilityMedium].color}
          strokeWidth={3}
          dash={[6, 4]}
        />
      )}
    </Group>
  );
}
