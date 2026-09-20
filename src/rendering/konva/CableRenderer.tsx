import { Group, Line, Circle, Text } from "react-konva";
import type { Project } from "../../models/project";
import type { Selection } from "../../editor/types";
import type { Viewport } from "../../geometry/coordinates";
import { worldToScreen } from "../../geometry/coordinates";
import { cableFloorPath, cableOnFloor, cableLengths, electricalNode } from "../../electrical/cables";
import { formatLength } from "../../utils/units";
import { useEditorStore } from "../../stores/editorStore";

export function CableRenderer({
  project,
  floorId,
  viewport,
  selection,
  measurements,
}: {
  project: Project;
  floorId: string;
  viewport: Viewport;
  selection: Selection[];
  measurements: boolean;
}) {
  const width = useEditorStore((s) => s.size.width);
  const labelX = (x: number, text: string) => Math.max(4, Math.min(x, width - text.length * 6 - 8));
  return (
    <>
      {Object.values(project.electrical.cables)
        .filter((cable) => cableOnFloor(project, cable, floorId) && project.layers[cable.layerId]?.visible)
        .map((cable) => {
          const path = cableFloorPath(project, cable, floorId).map((point) => worldToScreen(point, viewport));
          if (path.length < 2) return null;
          const selected = selection.some((item) => item.id === cable.id);
          const a = path[0]!,
            b = path[1]!;
          const lengthLabel = `${cable.label} · ${formatLength(cableLengths(project, cable).totalLength, project.units.display)}`;
          return (
            <Group key={cable.id} opacity={project.layers[cable.layerId]!.opacity}>
              {cable.riser &&
                (() => {
                  const points = cableFloorPath(project, cable, floorId);
                  const riserPoint = floorId === cable.floorId ? points.at(-1)! : points[0]!;
                  const p = worldToScreen(riserPoint, viewport);
                  const other =
                    floorId === cable.floorId
                      ? electricalNode(project, cable.endNodeId)!.floorId
                      : cable.floorId;
                  const label = `${cable.label} → ${project.floors[other]!.name}`;
                  return (
                    <Group x={p.x} y={p.y + 25}>
                      <Line points={[0, -23, 0, -7]} stroke="#a8622a" dash={[2, 2]} />
                      <Circle radius={7} fill="white" stroke="#a8622a" />
                      <Text x={-4} y={-6} text="↕" fontSize={13} fill="#713d1b" />
                      <Text
                        x={labelX(p.x + 12, label) - p.x}
                        y={8}
                        text={label}
                        fontSize={11}
                        fill="#713d1b"
                      />
                    </Group>
                  );
                })()}
              <Line
                points={path.flatMap((point) => [point.x, point.y])}
                stroke={selected ? "#087e68" : "#a8622a"}
                strokeWidth={selected ? 3 : 1.8}
                lineJoin="round"
              />
              {selected &&
                path
                  .slice(1, -1)
                  .map((point, i) => (
                    <Circle key={i} x={point.x} y={point.y} radius={4} fill="white" stroke="#087e68" />
                  ))}
              {(measurements || selected) && (
                <Text
                  x={labelX((a.x + b.x) / 2 + 7, lengthLabel)}
                  y={(a.y + b.y) / 2 - 16}
                  text={lengthLabel}
                  fontSize={11}
                  fill="#713d1b"
                />
              )}
            </Group>
          );
        })}
    </>
  );
}
