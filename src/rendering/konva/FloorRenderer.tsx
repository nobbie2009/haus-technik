import { memo } from "react";
import { Circle, Group, Line, Text } from "react-konva";
import type { Project } from "../../models/project";
import type { Selection } from "../../editor/types";
import type { Viewport } from "../../geometry/coordinates";
import { worldToScreen } from "../../geometry/coordinates";
import { wallFootprint } from "../../geometry/wallGeometry";
import { distance } from "../../geometry/distance";
import { dimensionGeometry } from "../../geometry/dimensions";
import { getRoomMeasurements } from "../../core/selectors";
import { formatArea, formatLength } from "../../utils/units";
import { DimensionShape } from "./DimensionShape";
import { OpeningShape } from "./OpeningShape";
import type { Vec2 } from "../../models/common";

export const FloorRenderer = memo(function FloorRenderer({
  project,
  floorId,
  viewport,
  selection,
  measurements,
  width,
  height,
  offset = { x: 0, y: 0 },
  editPoints = false,
}: {
  project: Project;
  floorId: string;
  viewport: Viewport;
  selection: Selection[];
  measurements: boolean;
  width: number;
  height: number;
  offset?: Vec2;
  editPoints?: boolean;
}) {
  const screen = (p: Vec2) => worldToScreen({ x: p.x + offset.x, y: p.y + offset.y }, viewport);
  const flatten = (points: Vec2[]) =>
    points.flatMap((p) => {
      const v = screen(p);
      return [v.x, v.y];
    });
  const selected = new Set(selection.map((s) => s.id));
  const visible = (item: { floorId: string; layerId: string }) =>
    item.floorId === floorId && project.layers[item.layerId]?.visible;
  const inView = (points: Vec2[]) => {
    const mapped = points.map(screen);
    return (
      Math.max(...mapped.map((p) => p.x)) > -180 &&
      Math.min(...mapped.map((p) => p.x)) < width + 180 &&
      Math.max(...mapped.map((p) => p.y)) > -180 &&
      Math.min(...mapped.map((p) => p.y)) < height + 180
    );
  };
  const rooms = Object.values(project.rooms).filter(visible);
  const walls = Object.values(project.walls).filter(visible);
  const dimensionedPairs = new Set(
    Object.values(project.dimensions)
      .filter(visible)
      .flatMap((dimension) =>
        dimension.mode === "aligned" && dimension.start.kind === "point" && dimension.end.kind === "point"
          ? [[dimension.start.pointId, dimension.end.pointId].sort().join(":")]
          : [],
      ),
  );
  return (
    <>
      {rooms.map((room) => {
        const polygon = room.polygon.pointIds.map((id) => project.points[id]!.position);
        if (!inView(polygon)) return null;
        return (
          <Line
            key={room.id}
            points={flatten(polygon)}
            closed
            fill={selected.has(room.id) ? "#cde6d9" : "#e5eee6"}
            stroke={selected.has(room.id) ? "#168568" : "#c3d2c2"}
            strokeWidth={selected.has(room.id) ? 2 : 1}
            opacity={project.layers[room.layerId]!.opacity}
          />
        );
      })}
      {walls.map((wall) => {
        const start = project.points[wall.startPointId]!.position;
        const end = project.points[wall.endPointId]!.position;
        if (!inView([start, end]) || distance(start, end) < 0.001) return null;
        const active = selected.has(wall.id);
        const color = active ? "#16846b" : "#3e5050";
        const a = screen(start),
          b = screen(end);
        const footprint = wallFootprint(start, end, wall.thickness);
        const dimensionOffset = wall.thickness / 2 + Math.max(220, 28 / viewport.scale);
        return (
          <Group key={wall.id} opacity={project.layers[wall.layerId]!.opacity}>
            <Line points={flatten(footprint)} closed fill={color} stroke={color} strokeWidth={1} />
            {measurements &&
              !dimensionedPairs.has([wall.startPointId, wall.endPointId].sort().join(":")) &&
              distance(start, end) * viewport.scale > 50 && (
                <DimensionShape
                  start={start}
                  end={end}
                  a={{
                    x: start.x - ((end.y - start.y) / distance(start, end)) * dimensionOffset,
                    y: start.y + ((end.x - start.x) / distance(start, end)) * dimensionOffset,
                  }}
                  b={{
                    x: end.x - ((end.y - start.y) / distance(start, end)) * dimensionOffset,
                    y: end.y + ((end.x - start.x) / distance(start, end)) * dimensionOffset,
                  }}
                  viewport={viewport}
                  label={formatLength(distance(start, end), project.units.display)}
                  selected={active}
                />
              )}
            {active &&
              [a, b].map((p, i) => (
                <Circle key={i} x={p.x} y={p.y} radius={4} fill="white" stroke="#16846b" strokeWidth={1.5} />
              ))}
          </Group>
        );
      })}
      {[...Object.values(project.doors), ...Object.values(project.windows)].filter(visible).map((opening) => (
        <OpeningShape
          key={opening.id}
          project={project}
          opening={opening}
          viewport={viewport}
          selected={selected.has(opening.id)}
        />
      ))}
      {rooms.map((room) => {
        const data = getRoomMeasurements(project, room.id);
        if (!inView(data.polygon)) return null;
        const center = screen({
          x: data.polygon.reduce((sum, p) => sum + p.x, 0) / data.polygon.length,
          y: data.polygon.reduce((sum, p) => sum + p.y, 0) / data.polygon.length,
        });
        return (
          <Group key={`label${room.id}`} opacity={project.layers[room.layerId]!.opacity}>
            <Text
              x={center.x - 100}
              y={center.y - 20}
              width={200}
              align="center"
              text={room.name}
              fill="#36544a"
              fontSize={13}
              fontFamily="IBM Plex Sans, sans-serif"
            />
            <Text
              x={center.x - 100}
              y={center.y + 1}
              width={200}
              align="center"
              text={formatArea(data.area)}
              fill="#617c6e"
              fontSize={11}
              fontFamily="IBM Plex Mono, monospace"
            />
          </Group>
        );
      })}
      {editPoints &&
        [...new Set(walls.flatMap((w) => [w.startPointId, w.endPointId]))].map((id) => {
          const p = screen(project.points[id]!.position);
          return (
            <Circle
              key={`handle-${id}`}
              x={p.x}
              y={p.y}
              radius={5.5}
              fill="white"
              stroke="#16846b"
              strokeWidth={2}
            />
          );
        })}
      {Object.values(project.dimensions)
        .filter(visible)
        .map((dimension) => {
          const geometry = dimensionGeometry(project, dimension);
          return (
            <DimensionShape
              key={dimension.id}
              {...geometry}
              viewport={viewport}
              label={formatLength(geometry.length, project.units.display)}
              selected={selected.has(dimension.id)}
              opacity={project.layers[dimension.layerId]!.opacity}
            />
          );
        })}
    </>
  );
});
