import { Group, Rect, Line, Text, Circle } from "react-konva";
import type { Project } from "../../models/project";
import { housebook } from "../../housebook/model";
import { networkLayer, type NetworkKind } from "../../network/model";
import { useEditorStore } from "../../stores/editorStore";

const symbols: Record<NetworkKind, string> = {
  router: "R",
  switch: "SW",
  socket: "LAN",
  patchPanel: "PP",
  accessPoint: "AP",
  repeater: "RP",
  server: "NAS",
  client: "PC",
};
function NetworkSymbol({ kind, selected = false }: { kind: NetworkKind; selected?: boolean }) {
  const color = selected ? "#176fba" : "#7556a2";
  return (
    <>
      <Rect
        x={-18}
        y={-13}
        width={36}
        height={26}
        cornerRadius={4}
        fill={selected ? "#e7f1fc" : "#faf7ff"}
        stroke={color}
        strokeWidth={selected ? 2.5 : 1.5}
      />
      <Text
        x={-18}
        y={-6}
        width={36}
        text={symbols[kind]}
        align="center"
        fontSize={11}
        fontStyle="bold"
        fill={color}
      />
      {["router", "accessPoint", "repeater"].includes(kind) && (
        <>
          <Line points={[-12, -13, -16, -23]} stroke={color} strokeWidth={2} />
          <Line points={[12, -13, 16, -23]} stroke={color} strokeWidth={2} />
        </>
      )}
      {["switch", "patchPanel", "router", "socket"].includes(kind) &&
        [-9, 0, 9].map((x) => <Circle key={x} x={x} y={9} radius={1.5} fill={color} />)}
    </>
  );
}
export function NetworkRenderer({ project }: { project: Project }) {
  const editor = useEditorStore(),
    book = housebook(project),
    layer = networkLayer(project);
  if (layer && !layer.visible) return null;
  const x = (v: number) => editor.viewport.originPx.x + v * editor.viewport.scale;
  const y = (v: number) => editor.viewport.originPx.y - v * editor.viewport.scale;
  return (
    <Group opacity={layer?.opacity ?? 1}>
      {book.networkLinks.map((link) => {
        const a = book.networkNodes.find((n) => n.id === link.from),
          b = book.networkNodes.find((n) => n.id === link.to);
        return a?.floorId === editor.floorId && b?.floorId === editor.floorId ? (
          <Line
            key={link.id}
            points={[x(a.position.x), y(a.position.y), x(b.position.x), y(b.position.y)]}
            stroke="#7556a2"
            dash={[5, 4]}
          />
        ) : null;
      })}
      {book.networkNodes
        .filter((n) => n.floorId === editor.floorId)
        .map((n) => (
          <Group key={n.id} x={x(n.position.x)} y={y(n.position.y)}>
            <NetworkSymbol
              kind={n.kind}
              selected={editor.selection.some((s) => s.kind === "networkNodes" && s.id === n.id)}
            />
            <Text x={24} y={-6} text={n.name} fontSize={12} fill="#7556a2" />
          </Group>
        ))}
      {book.wifiMeasurements
        .filter((m) => m.floorId === editor.floorId)
        .map((m) => (
          <Text
            key={m.id}
            x={x(m.position.x)}
            y={y(m.position.y)}
            text={`WLAN ${m.name} · ${m.signalDbm} dBm`}
            fontSize={12}
            fill={m.signalDbm >= -60 ? "#16835f" : m.signalDbm >= -75 ? "#b87916" : "#b33e35"}
          />
        ))}
      {editor.tool === "network" && editor.draft.cursor && !layer?.locked && (
        <Group x={x(editor.draft.cursor.x)} y={y(editor.draft.cursor.y)} opacity={0.5}>
          <NetworkSymbol kind={editor.networkKind} />
        </Group>
      )}
    </Group>
  );
}
