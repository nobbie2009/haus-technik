import { Circle, Group, Line, Rect, Text } from "react-konva";
import { solarPlacement, solarKinds } from "../../electrical/solarPlan";
import type { Project } from "../../models/project";
import type { ElectricalKind } from "../../electrical/models";
import type { Selection } from "../../editor/types";
import type { Viewport } from "../../geometry/coordinates";
import { worldToScreen } from "../../geometry/coordinates";
import { electricalCaption } from "../../electrical/selectors";
import { useEditorStore } from "../../stores/editorStore";
import { useSimulationStore } from "../../stores/simulationStore";
import { deviceAppearance } from "../deviceAppearance";
import { DeviceSymbol } from "./DeviceSymbol";
import { consumerShape, consumerLibrary } from "../../electrical/consumerLibrary";
import { useProjectStore } from "../../stores/projectStore";
import { networkLayer } from "../../network/model";

function ElectricalSymbol({ kind, selected }: { kind: ElectricalKind; selected: boolean }) {
  const color = selected ? "#087e68" : "#9b4b18";
  return (
    <>
      {selected && <Circle radius={15} stroke="#087e68" dash={[3, 3]} />}
      {kind === "outlets" ? (
        <>
          <Circle radius={9} fill="#fff7ee" stroke={color} strokeWidth={1.8} />
          <Circle x={-3} radius={1.3} fill={color} />
          <Circle x={3} radius={1.3} fill={color} />
          <Line points={[-5, -7, 5, -7]} stroke={color} />
        </>
      ) : kind === "switches" ? (
        <>
          <Circle radius={7} fill="#fff7ee" stroke={color} strokeWidth={1.8} />
          <Line points={[5, -5, 13, -13]} stroke={color} strokeWidth={1.8} />
          <Line points={[10, -13, 13, -13, 13, -10]} stroke={color} strokeWidth={1.8} />
        </>
      ) : kind === "devices" ? (
        <DeviceSymbol appearance={{ kind: "device", state: "idle", running: false, label: "", color }} />
      ) : kind === "transformers" ? (
        <>
          <Circle x={-5} radius={9} fill="white" stroke={color} />
          <Circle x={5} radius={9} stroke={color} />
          <Text x={-9} y={-4} text="T" fontSize={9} fill={color} />
        </>
      ) : kind === "controls" ? (
        <>
          <Rect x={-12} y={-10} width={24} height={20} fill="#fff7ee" stroke={color} />
          <Text x={-9} y={-5} text="SG" fontSize={10} fill={color} />
        </>
      ) : kind === "meters" ? (
        <>
          <Rect x={-13} y={-11} width={26} height={22} fill="#fff7ee" stroke={color} strokeWidth={1.8} />
          <Text x={-11} y={-4} width={22} text="kWh" align="center" fontSize={9} fill={color} />
        </>
      ) : kind === "supplies" ? (
        <>
          <Circle radius={11} fill="#fff7ee" stroke={color} strokeWidth={1.8} />
          <Line points={[-7, 0, -4, -4, 0, 0, 4, 4, 7, 0]} stroke={color} strokeWidth={1.8} tension={0.4} />
        </>
      ) : kind === "junctions" ? (
        <>
          <Rect x={-8} y={-8} width={16} height={16} fill="#fff7ee" stroke={color} />
          <Circle radius={3} fill={color} />
        </>
      ) : (
        <>
          <Rect x={-11} y={-10} width={22} height={20} fill="#fff7ee" stroke={color} strokeWidth={1.8} />
          <Line points={[-6, -5, 6, -5, 6, 0, -6, 0, -6, 5, 6, 5]} stroke={color} />
        </>
      )}
    </>
  );
}
export function ElectricalRenderer({
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
  const result = useSimulationStore((state) => state.result);
  const category = useEditorStore((state) => state.category);
  return (
    <>
      {(
        [
          "distributionBoards",
          "outlets",
          "devices",
          "junctions",
          "supplies",
          "meters",
          "switches",
          "controls",
          "transformers",
        ] as const
      ).flatMap((kind) =>
        Object.values(project.electrical[kind])
          .filter(
            (item) =>
              item.floorId === floorId &&
              project.layers[item.layerId]?.visible &&
              !(item.metadata.networkNodeId && networkLayer(project)?.visible),
          )
          .map((item) => {
            const p = worldToScreen(item.position, viewport);
            const shape = kind === "devices" ? consumerShape(item) : null;
            const solar = solarPlacement(item);
            return (
              <Group key={item.id} x={p.x} y={p.y} opacity={project.layers[item.layerId]!.opacity}>
                {shape && (
                  <Group rotation={(-shape.rotation * 180) / Math.PI}>
                    <Rect
                      x={(-shape.width * viewport.scale) / 2}
                      y={(-shape.depth * viewport.scale) / 2}
                      width={shape.width * viewport.scale}
                      height={shape.depth * viewport.scale}
                      fill={solar ? "#dae9ee" : "#fff7ee"}
                      stroke={selection.some((s) => s.id === item.id) ? "#087e68" : "#9b4b18"}
                    />
                    {solar &&
                      (solar.kind === "module" || solar.kind === "plant") &&
                      [0.25, 0.5, 0.75].map((part) => (
                        <Group key={part}>
                          <Line
                            points={[
                              (-shape.width * viewport.scale) / 2,
                              (part - 0.5) * shape.depth * viewport.scale,
                              (shape.width * viewport.scale) / 2,
                              (part - 0.5) * shape.depth * viewport.scale,
                            ]}
                            stroke="#427689"
                          />
                          <Line
                            points={[
                              (part - 0.5) * shape.width * viewport.scale,
                              (-shape.depth * viewport.scale) / 2,
                              (part - 0.5) * shape.width * viewport.scale,
                              (shape.depth * viewport.scale) / 2,
                            ]}
                            stroke="#427689"
                          />
                        </Group>
                      ))}
                  </Group>
                )}
                {solar ? (
                  <Text
                    text={solarKinds[solar.kind].symbol}
                    x={-16}
                    y={-7}
                    width={32}
                    align="center"
                    fontStyle="bold"
                    fill="#245c70"
                    fontSize={13}
                  />
                ) : kind === "devices" ? (
                  <>
                    <DeviceSymbol
                      appearance={deviceAppearance(
                        project.electrical.devices[item.id]!,
                        category === "electrical" ? result?.devices[item.id] : undefined,
                      )}
                    />
                    {selection.some((s) => s.id === item.id) && (
                      <Circle radius={15} stroke="#087e68" dash={[3, 3]} />
                    )}
                  </>
                ) : (
                  <ElectricalSymbol kind={kind} selected={selection.some((s) => s.id === item.id)} />
                )}
                <Text x={17} y={-5} text={electricalCaption(project, item)} fontSize={11} fill="#713d1b" />
              </Group>
            );
          }),
      )}
    </>
  );
}
export function ElectricalPreview() {
  const editor = useEditorStore();
  const project = useProjectStore((s) => s.project);
  const entry = editor.solarPlacement
    ? { ...solarKinds[editor.solarPlacement.kind], rotation: 0 }
    : editor.consumerEntryId
      ? consumerLibrary(project).find((e) => e.id === editor.consumerEntryId)
      : null;
  if (editor.tool !== "electrical" || !editor.draft.cursor) return null;
  const p = worldToScreen(editor.draft.cursor, editor.viewport);
  return (
    <Group x={p.x} y={p.y} opacity={0.5}>
      {entry && (
        <Group rotation={(-entry.rotation * 180) / Math.PI}>
          <Rect
            x={(-entry.width * editor.viewport.scale) / 2}
            y={(-entry.depth * editor.viewport.scale) / 2}
            width={entry.width * editor.viewport.scale}
            height={entry.depth * editor.viewport.scale}
            fill="#fff7ee"
            stroke="#9b4b18"
          />
        </Group>
      )}
      {editor.solarPlacement ? (
        <Text
          text={solarKinds[editor.solarPlacement.kind].symbol}
          x={-15}
          y={-7}
          width={30}
          align="center"
          fill="#245c70"
        />
      ) : (
        <ElectricalSymbol kind={editor.electricalKind} selected={false} />
      )}
    </Group>
  );
}
