import { memo } from "react";
import { Group, Rect, Line, Text, Circle } from "react-konva";
import type { Furniture } from "../../models/furniture";
import type { Project } from "../../models/project";
import type { Viewport } from "../../geometry/coordinates";
import type { Selection } from "../../editor/types";
import { worldToScreen } from "../../geometry/coordinates";
import { furnitureCatalog } from "../../furniture/catalog";
import { useEditorStore } from "../../stores/editorStore";

function FurnitureShape({
  item,
  viewport,
  selected,
  opacity = 1,
}: {
  item: Furniture;
  viewport: Viewport;
  selected: boolean;
  opacity?: number;
}) {
  const p = worldToScreen(item.position, viewport);
  const w = item.width * viewport.scale,
    h = item.depth * viewport.scale;
  const stroke = selected ? "#087e68" : "#797062";
  return (
    <Group opacity={opacity}>
      <Group x={p.x} y={p.y} rotation={(-item.rotation * 180) / Math.PI}>
        <Rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          fill={selected ? "#d4eee2" : "#ede7dc"}
          stroke={stroke}
          strokeWidth={selected ? 2 : 1.2}
        />
        {item.type === "bed" && (
          <>
            <Rect
              x={-w * 0.43}
              y={-h * 0.43}
              width={w * 0.38}
              height={h * 0.2}
              cornerRadius={3}
              stroke={stroke}
            />
            <Rect
              x={w * 0.05}
              y={-h * 0.43}
              width={w * 0.38}
              height={h * 0.2}
              cornerRadius={3}
              stroke={stroke}
            />
            <Line points={[-w / 2, -h * 0.15, w / 2, -h * 0.15]} stroke={stroke} />
          </>
        )}
        {item.type === "sofa" && (
          <>
            <Rect
              x={-w * 0.39}
              y={-h * 0.27}
              width={w * 0.78}
              height={h * 0.64}
              cornerRadius={3}
              stroke={stroke}
            />
            <Line points={[0, -h * 0.27, 0, h * 0.37]} stroke={stroke} />
          </>
        )}
        {["wardrobe", "kitchenCabinet", "serverRack"].includes(item.type) && (
          <Line
            points={[-w / 2, -h / 2, w / 2, h / 2, w / 2, -h / 2, -w / 2, h / 2]}
            stroke={stroke}
            strokeWidth={0.7}
          />
        )}
        {item.type === "washingMachine" && <Circle radius={Math.min(w, h) * 0.32} stroke={stroke} />}
        {selected && <Circle radius={3} fill={stroke} />}
      </Group>
      {w > 55 && h > 32 && (
        <Text
          x={p.x - w / 2}
          y={p.y + 4}
          width={w}
          align="center"
          text={item.name}
          fontSize={11}
          fill="#3c443e"
          ellipsis
          wrap="none"
        />
      )}
    </Group>
  );
}

export const FurnitureRenderer = memo(function FurnitureRenderer({
  project,
  floorId,
  viewport,
  selection,
}: {
  project: Project;
  floorId: string;
  viewport: Viewport;
  selection: Selection[];
}) {
  return (
    <>
      {Object.values(project.furniture)
        .filter((item) => item.floorId === floorId && project.layers[item.layerId]?.visible)
        .map((item) => (
          <FurnitureShape
            key={item.id}
            item={item}
            viewport={viewport}
            selected={selection.some((s) => s.id === item.id)}
            opacity={project.layers[item.layerId]!.opacity}
          />
        ))}
    </>
  );
});

export function FurniturePreview() {
  const editor = useEditorStore();
  if (editor.tool !== "furniture" || !editor.draft.cursor) return null;
  const preset = furnitureCatalog.find((item) => item.type === editor.furnitureType)!;
  const item: Furniture = {
    ...preset,
    id: "preview",
    floorId: editor.floorId,
    layerId: "",
    roomId: null,
    position: editor.draft.cursor,
    rotation: 0,
    metadata: {},
  };
  return <FurnitureShape item={item} viewport={editor.viewport} selected opacity={0.5} />;
}
