import type { Project } from "../models/project";
import type { SwitchingControl } from "./models";
import type { SimulationScenario } from "../simulation/models";

export function switchControl(project: Project, switchId: string) {
  return Object.values(project.electrical.controls).find((item) => item.switchIds.includes(switchId));
}
export function controlClosed(project: Project, control: SwitchingControl, scenario: SimulationScenario) {
  if (!control.circuitId || control.switchIds.length < (control.mode === "changeover" ? 2 : 1)) return false;
  if (control.mode === "impulseRelay") return scenario.relayStates[control.id] ?? control.initialOn;
  if (control.switchIds.some((id) => scenario.disabledNodeIds.includes(id))) return false;
  // Zwei korrespondierende Pfade; jeder Wechsel-/Kreuzkontakt vertauscht sie.
  const crossings = control.switchIds.filter(
    (id) => !(scenario.switchStates[id] ?? project.electrical.switches[id]?.closed),
  ).length;
  return (crossings % 2 === 0) !== control.inverted;
}
export function switchRole(project: Project, id: string) {
  const group = switchControl(project, id);
  if (!group) return "Ein-/Aus-Schalter";
  if (group.mode === "impulseRelay") return "Taster";
  const index = group.switchIds.indexOf(id);
  return index === 0 || index === group.switchIds.length - 1 ? "Wechselschalter" : "Kreuzschalter";
}
