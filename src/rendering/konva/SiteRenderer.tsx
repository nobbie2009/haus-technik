import { Group, Line, Circle, Text } from "react-konva";
import type { Project } from "../../models/project";
import { useEditorStore } from "../../stores/editorStore";
import { site, siteClosed, siteSegments } from "../../site/model";
import { distance } from "../../geometry/distance";
import { formatLength } from "../../utils/units";
export function SiteRenderer({ project }: { project: Project }) {
  const e = useEditorStore(),
    scale = e.viewport.scale;
  const x = (v: number) => e.viewport.originPx.x + v * scale,
    y = (v: number) => e.viewport.originPx.y - v * scale;
  return (
    <>
      {Object.values(site(project).elements)
        .filter((s) => s.floorId === e.floorId && project.layers[s.layerId]?.visible)
        .map((s) => {
          const selected = e.selection.some((v) => v.kind === "siteElements" && v.id === s.id),
            color = selected ? "#176fba" : s.kind === "path" || s.kind === "terrace" ? "#87715c" : "#47805a";
          return (
            <Group key={s.id} opacity={project.layers[s.layerId]!.opacity}>
              <Line
                points={s.vertices.flatMap((p) => [x(p.x), y(p.y)])}
                closed={siteClosed(s.kind)}
                stroke={s.kind === "path" ? (selected ? "#c7e0f5" : "#ded3c5") : color}
                strokeWidth={s.kind === "path" ? Math.max(2, s.width * scale) : selected ? 2.5 : 1.5}
                lineJoin="round"
                lineCap="round"
                fill={s.kind === "terrace" ? "#aa937522" : s.kind === "bed" ? "#68945622" : "transparent"}
                dash={s.kind === "boundary" ? [8, 5] : []}
              />
              {s.kind === "path" && (
                <Line
                  points={s.vertices.flatMap((p) => [x(p.x), y(p.y)])}
                  stroke={color}
                  strokeWidth={1}
                  dash={[5, 5]}
                />
              )}
              {s.vertices.map((p, i) => (
                <Group key={i} x={x(p.x)} y={y(p.y)}>
                  <Circle
                    radius={s.kind === "reference" ? 5 : 3.5}
                    fill="white"
                    stroke={color}
                    strokeWidth={1.5}
                  />
                  {(selected || e.category === "site" || s.kind === "reference") && (
                    <Text x={7} y={5} text={`P${i + 1}`} fontSize={11} fill={color} />
                  )}
                </Group>
              ))}
              <Text
                x={x(s.vertices[0]!.x) + 9}
                y={y(s.vertices[0]!.y) - 20}
                text={s.name}
                fontSize={12}
                fill={color}
              />
              {e.showMeasurements &&
                (selected || e.category === "site") &&
                siteSegments(s).map(([a, b], i) => (
                  <Text
                    key={i}
                    x={x((a.x + b.x) / 2) + 5}
                    y={y((a.y + b.y) / 2) - 17}
                    text={formatLength(distance(a, b), project.units.display)}
                    fontSize={11}
                    fill={color}
                  />
                ))}
            </Group>
          );
        })}
    </>
  );
}
