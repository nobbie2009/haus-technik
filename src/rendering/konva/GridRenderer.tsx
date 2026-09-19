import { Line, Text } from "react-konva";
import type { Viewport } from "../../geometry/coordinates";

export function GridRenderer({
  viewport,
  width,
  height,
  gridSize,
  visible,
}: {
  viewport: Viewport;
  width: number;
  height: number;
  gridSize: number;
  visible: boolean;
}) {
  if (!visible) return null;
  let step = gridSize;
  while (step * viewport.scale < 15) step *= 5;
  const pixels = step * viewport.scale;
  const lines = [];
  const origin = viewport.originPx;
  for (let x = ((origin.x % pixels) + pixels) % pixels; x < width; x += pixels)
    lines.push(<Line key={`x${x}`} points={[x, 0, x, height]} stroke="#dce3dc" strokeWidth={0.65} />);
  for (let y = ((origin.y % pixels) + pixels) % pixels; y < height; y += pixels)
    lines.push(<Line key={`y${y}`} points={[0, y, width, y]} stroke="#dce3dc" strokeWidth={0.65} />);
  return (
    <>
      {lines}
      <Line points={[origin.x, 0, origin.x, height]} stroke="#bdcbbf" strokeWidth={1} />
      <Line points={[0, origin.y, width, origin.y]} stroke="#bdcbbf" strokeWidth={1} />
      <Text x={origin.x + 6} y={origin.y + 7} text="0" fontSize={10} fill="#6e8377" />
    </>
  );
}
