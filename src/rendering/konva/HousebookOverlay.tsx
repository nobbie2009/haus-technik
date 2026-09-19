import { useEffect, useState } from "react";
import { Image, Line, Text, Circle } from "react-konva";
import type { Project } from "../../models/project";
import type { Viewport } from "../../geometry/coordinates";
import { housebook, asset } from "../../housebook/model";
import { elementTables } from "../../core/elementTables";
export function BackgroundImage({
  project,
  floorId,
  viewport,
}: {
  project: Project;
  floorId: string;
  viewport: Viewport;
}) {
  const bg = housebook(project).backgrounds[floorId],
    [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    setImage(null);
    if (!bg?.data) return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.src = bg.data;
    return () => {
      cancelled = true;
    };
  }, [bg?.data]);
  if (!bg?.visible || !image) return null;
  return (
    <Image
      image={image}
      x={viewport.originPx.x + bg.position.x * viewport.scale}
      y={viewport.originPx.y - bg.position.y * viewport.scale}
      width={bg.width * viewport.scale}
      height={((bg.width * bg.pixelHeight) / bg.pixelWidth) * viewport.scale}
      opacity={bg.opacity}
      listening={false}
    />
  );
}
export function HousebookOverlay({
  project,
  floorId,
  viewport,
}: {
  project: Project;
  floorId: string;
  viewport: Viewport;
}) {
  const book = housebook(project),
    x = (v: number) => viewport.originPx.x + v * viewport.scale,
    y = (v: number) => viewport.originPx.y - v * viewport.scale;
  return (
    <>
      {book.networkLinks.map((link) => {
        const a = book.networkNodes.find((n) => n.id === link.from),
          b = book.networkNodes.find((n) => n.id === link.to);
        return a?.floorId === floorId && b?.floorId === floorId ? (
          <Line
            key={link.id}
            points={[x(a.position.x), y(a.position.y), x(b.position.x), y(b.position.y)]}
            stroke="#7556a2"
            dash={[5, 4]}
          />
        ) : null;
      })}
      {book.networkNodes
        .filter((n) => n.floorId === floorId)
        .map((n) => (
          <Text
            key={n.id}
            x={x(n.position.x)}
            y={y(n.position.y)}
            text={`NET ${n.name}`}
            fontSize={12}
            fill="#7556a2"
          />
        ))}
      {Object.values(elementTables(project))
        .flatMap((table) => Object.values(table))
        .filter(
          (n) =>
            n.floorId === floorId &&
            project.layers[n.layerId]?.visible &&
            n.metadata.asset &&
            asset(n).status !== "existing",
        )
        .map((n) => {
          const p =
            "position" in n && typeof n.position === "object"
              ? n.position
              : "startPointId" in n
                ? project.points[n.startPointId]!.position
                : "polygon" in n
                  ? project.points[n.polygon.pointIds[0]!]!.position
                  : null;
          return p ? (
            <Circle
              key={n.id}
              x={x(p.x) - 10}
              y={y(p.y) - 10}
              radius={4}
              fill={
                { planned: "#176fba", remove: "#bb4433", completed: "#167863", existing: "#334b50" }[
                  asset(n).status
                ]
              }
            />
          ) : null;
        })}
    </>
  );
}
