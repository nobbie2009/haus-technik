import { Group, Line, Text } from "react-konva";
import type { Vec2 } from "../../models/common";
import type { Viewport } from "../../geometry/coordinates";
import { worldToScreen } from "../../geometry/coordinates";

export function DimensionShape({
  start,
  end,
  a,
  b,
  viewport,
  label,
  selected = false,
  opacity = 1,
}: {
  start: Vec2;
  end: Vec2;
  a: Vec2;
  b: Vec2;
  viewport: Viewport;
  label: string;
  selected?: boolean;
  opacity?: number;
}) {
  const first = worldToScreen(start, viewport);
  const last = worldToScreen(end, viewport);
  const p = worldToScreen(a, viewport);
  const q = worldToScreen(b, viewport);
  let angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
  if (angle > 90 || angle < -90) angle += 180;
  const color = selected ? "#147c61" : "#62786d";
  return (
    <Group opacity={opacity}>
      <Line
        points={[first.x, first.y, p.x, p.y, q.x, q.y, last.x, last.y]}
        stroke={color}
        strokeWidth={selected ? 1.5 : 0.8}
      />
      {[p, q].map((point, i) => (
        <Line
          key={i}
          points={[point.x - 4, point.y + 4, point.x + 4, point.y - 4]}
          stroke={color}
          strokeWidth={1}
        />
      ))}
      <Text
        x={(p.x + q.x) / 2}
        y={(p.y + q.y) / 2}
        offsetX={65}
        offsetY={17}
        width={130}
        text={label}
        align="center"
        fontSize={11}
        fontFamily="IBM Plex Mono, monospace"
        fill={color}
        rotation={angle}
      />
    </Group>
  );
}
