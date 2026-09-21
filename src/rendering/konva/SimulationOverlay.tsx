import { transformerOutputLabel } from "../../electrical/transformers";
import { Group, Rect, Text } from "react-konva";
import type { Project } from "../../models/project";
import type { Viewport } from "../../geometry/coordinates";
import { worldToScreen } from "../../geometry/coordinates";
import { electricalNodes } from "../../electrical/cables";
import { useEditorStore } from "../../stores/editorStore";
import { useSimulationStore } from "../../stores/simulationStore";
import { deviceAppearance } from "../deviceAppearance";
import { switchControl, switchRole, controlClosed } from "../../electrical/switchingControls";

export function SimulationOverlay({
  project,
  floorId,
  viewport,
}: {
  project: Project;
  floorId: string;
  viewport: Viewport;
}) {
  const result = useSimulationStore((s) => s.result);
  const switchStates = useSimulationStore((s) => s.scenario.switchStates);
  const scenario = useSimulationStore((s) => s.scenario);
  const category = useEditorStore((s) => s.category);
  const size = useEditorStore((s) => s.size);
  if (!result || category !== "electrical") return null;
  return (
    <>
      {Object.values(electricalNodes(project))
        .filter(
          (item) =>
            item.floorId === floorId && project.layers[item.layerId]?.visible && result.nodes[item.id],
        )
        .map((item) => {
          const value = result.nodes[item.id]!,
            device = result.devices[item.id];
          const lightSwitch = project.electrical.switches[item.id];
          const group = switchControl(project, item.id),
            control = project.electrical.controls[item.id],
            transformer = project.electrical.transformers[item.id];
          const appearance = device ? deviceAppearance(project.electrical.devices[item.id]!, device) : null;
          const label = group
            ? `${switchRole(project, item.id)}${group.mode === "changeover" ? ((switchStates[item.id] ?? lightSwitch!.closed) ? " · I" : " · II") : ""}`
            : control
              ? `${controlClosed(project, control, scenario) ? "Kontakt zu" : "Kontakt offen"} · ${value.availablePhases.length ? "versorgt" : "ohne Versorgung"}`
              : transformer
                ? value.overload
                  ? "Trafo: ÜBERLAST"
                  : value.availablePhases.length
                    ? `${transformerOutputLabel(transformer)} nominal · ${value.incompleteCount ? "Last unvollständig" : "versorgt"}`
                    : "Trafo ohne Versorgung"
                : lightSwitch
                  ? !(switchStates[item.id] ?? lightSwitch.closed)
                    ? "Schalter aus"
                    : value.availablePhases.length
                      ? "Schalter ein"
                      : "Ein · ohne Versorgung"
                  : device
                    ? appearance!.label
                    : value.availablePhases.length
                      ? `${value.availablePhases.join("/")} versorgt`
                      : "Ohne Versorgung";
          const color = appearance
            ? appearance.color
            : !value.availablePhases.length
              ? "#9b4b18"
              : device?.status === "off"
                ? "#52685d"
                : "#14694e";
          const position = worldToScreen(item.position, viewport);
          const badgeWidth = label.length * 6 + 12;
          return (
            <Group
              key={item.id}
              x={Math.max(4, Math.min(position.x - 10, size.width - badgeWidth - 4))}
              y={position.y + 17}
            >
              <Rect width={badgeWidth} height={20} fill="#fff" stroke={color} cornerRadius={3} />
              <Text x={6} y={4} text={label} fontSize={11} fill={color} />
            </Group>
          );
        })}
    </>
  );
}
