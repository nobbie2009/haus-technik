import { Group, Line } from "react-konva";
import type { Project } from "../../models/project";
import type { Door, Window } from "../../models/opening";
import { worldToScreen } from "../../geometry/coordinates";
import type { Viewport } from "../../geometry/coordinates";
import { distance } from "../../geometry/distance";

export function OpeningShape({
  project,
  opening,
  viewport,
  selected,
}: {
  project: Project;
  opening: Door | Window;
  viewport: Viewport;
  selected: boolean;
}) {
  const wall = project.walls[opening.wallId]!;
  const a = project.points[wall.startPointId]!.position;
  const b = project.points[wall.endPointId]!.position;
  const length = distance(a, b);
  if (length < 0.001) return null;
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  const transform = (along: number, normal = 0) => {
    const p = worldToScreen(
      { x: a.x + ux * along - uy * normal, y: a.y + uy * along + ux * normal },
      viewport,
    );
    return [p.x, p.y];
  };
  const left = opening.position - opening.width / 2;
  const right = opening.position + opening.width / 2;
  const color = selected ? "#119772" : "#466b65";
  if ("sillHeight" in opening)
    return (
      <Group opacity={project.layers[opening.layerId]!.opacity}>
        <Line
          points={[...transform(left), ...transform(right)]}
          stroke="#f6f7f3"
          strokeWidth={Math.max(4, wall.thickness * viewport.scale - 1)}
        />
        {[-wall.thickness / 3, wall.thickness / 3].map((offset) => (
          <Line
            key={offset}
            points={[...transform(left, offset), ...transform(right, offset)]}
            stroke={color}
            strokeWidth={selected ? 2.5 : 1.5}
          />
        ))}
        {[left, right].map((position) => (
          <Line
            key={position}
            points={[...transform(position, -wall.thickness / 2), ...transform(position, wall.thickness / 2)]}
            stroke={color}
            strokeWidth={2}
          />
        ))}
      </Group>
    );
  if (opening.type === "opening")
    return (
      <Group opacity={project.layers[opening.layerId]!.opacity}>
        <Line
          points={[...transform(left), ...transform(right)]}
          stroke="#f6f7f3"
          strokeWidth={Math.max(4, wall.thickness * viewport.scale + 1)}
        />
        {[left, right].map((position) => (
          <Line
            key={position}
            points={[...transform(position, -wall.thickness / 2), ...transform(position, wall.thickness / 2)]}
            stroke={color}
            strokeWidth={selected ? 2.5 : 1.5}
          />
        ))}
      </Group>
    );
  if (opening.type === "sliding") {
    const side = opening.openingDirection.swing === "leftOfWall" ? 1 : -1;
    return (
      <Group opacity={project.layers[opening.layerId]!.opacity}>
        <Line
          points={[...transform(left), ...transform(right)]}
          stroke="#f6f7f3"
          strokeWidth={Math.max(4, wall.thickness * viewport.scale + 1)}
        />
        <Line
          points={[
            ...transform(left, (wall.thickness / 2 + 35) * side),
            ...transform(right, (wall.thickness / 2 + 35) * side),
          ]}
          stroke={color}
          strokeWidth={selected ? 3 : 2}
        />
        <Line
          points={[...transform(left), ...transform(right)]}
          stroke={color}
          strokeWidth={1}
          dash={[5, 4]}
        />
      </Group>
    );
  }
  const hingeStart = opening.openingDirection.hinge === "startSide";
  const hinge = hingeStart ? left : right;
  const direction = hingeStart ? 1 : -1;
  const swing = opening.openingDirection.swing === "leftOfWall" ? 1 : -1;
  const arc = Array.from({ length: 21 }, (_, i) => {
    const angle = ((i / 20) * Math.PI) / 2;
    return transform(
      hinge + Math.cos(angle) * opening.width * direction,
      Math.sin(angle) * opening.width * swing,
    );
  }).flat();
  return (
    <Group opacity={project.layers[opening.layerId]!.opacity}>
      <Line
        points={[...transform(left), ...transform(right)]}
        stroke="#f6f7f3"
        strokeWidth={Math.max(4, wall.thickness * viewport.scale + 1)}
      />
      <Line
        points={[...transform(hinge), ...transform(hinge, opening.width * swing)]}
        stroke={color}
        strokeWidth={selected ? 2 : 1.3}
      />
      <Line points={arc} stroke={color} strokeWidth={1} />
    </Group>
  );
}
