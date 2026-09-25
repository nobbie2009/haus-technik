import { useEffect, useState } from "react";
import { Text } from "react-konva";
import type { Project } from "../../models/project";
import type { Viewport } from "../../geometry/coordinates";
import { elementTables } from "../../core/elementTables";
import { asset } from "../../housebook/model";
import { useHomeAssistantStore } from "../../stores/homeAssistantStore";
export function HaLiveOverlay({
  project,
  floorId,
  viewport,
}: {
  project: Project;
  floorId: string;
  viewport: Viewport;
}) {
  const live = useHomeAssistantStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!live.visible || !live.readAt) return;
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, [live.visible, live.readAt]);
  if (!live.visible || !live.readAt) return null;
  const stale = !live.running || !!live.error || now - live.readAt > 30000;
  return (
    <>
      {Object.values(elementTables(project))
        .flatMap((t) => Object.values(t))
        .filter(
          (n) => n.floorId === floorId && project.layers[n.layerId]?.visible && asset(n).homeAssistantEntity,
        )
        .map((n) => {
          const pos =
            "position" in n && typeof n.position === "object"
              ? n.position
              : "polygon" in n
                ? n.polygon.pointIds.reduce(
                    (sum: { x: number; y: number }, id: string) => ({
                      x: sum.x + project.points[id]!.position.x / n.polygon.pointIds.length,
                      y: sum.y + project.points[id]!.position.y / n.polygon.pointIds.length,
                    }),
                    { x: 0, y: 0 },
                  )
                : "startPointId" in n
                  ? project.points[n.startPointId]?.position
                  : null;
          if (!pos) return null;
          const value = live.states.find((s) => s.entity_id === asset(n).homeAssistantEntity);
          const missing = !value || ["unknown", "unavailable"].includes(value.state);
          return (
            <Text
              key={n.id}
              x={viewport.originPx.x + pos.x * viewport.scale + 15}
              y={viewport.originPx.y - pos.y * viewport.scale + 20}
              fontSize={12}
              fill={stale || missing ? "#9a4c18" : "#176651"}
              text={`${stale ? "Stand" : "HA"}: ${missing ? "Nicht verfügbar" : `${value.state} ${value.attributes?.unit_of_measurement ?? ""}`} · ${new Date(live.readAt).toLocaleTimeString("de-DE")}`}
              listening={false}
            />
          );
        })}
    </>
  );
}
