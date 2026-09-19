import type { Project } from "../models/project";
import type { SimulationScenario } from "./models";
import { switchControl } from "../electrical/switchingControls";
import { simulate } from "./solve";

/** Ein Tastimpuls; bistabiler Relaiszustand bleibt bei Versorgungsausfall gespeichert. */
export function operateSwitch(project: Project, scenario: SimulationScenario, id: string) {
  const item = project.electrical.switches[id];
  if (!item) return;
  const group = switchControl(project, id);
  if (group?.mode === "impulseRelay") {
    const result = simulate(project, scenario);
    if (
      !group.circuitId ||
      !result.nodes[group.circuitId]?.availablePhases.length ||
      scenario.disabledNodeIds.includes(group.id) ||
      scenario.disabledNodeIds.includes(id)
    )
      return;
    scenario.relayStates[group.id] = !(scenario.relayStates[group.id] ?? group.initialOn);
  } else scenario.switchStates[id] = !(scenario.switchStates[id] ?? item.closed);
}
