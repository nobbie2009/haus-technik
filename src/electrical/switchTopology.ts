import type { Project } from "../models/project";
import type { LightSwitch } from "./models";

/** Quelle → letzter Schalter. Gemeinsame Vorgänger erlauben verzweigte Schaltergruppen. */
export function switchChain(project: Project, id: string): { switches: LightSwitch[]; cycle: boolean } {
  const switches: LightSwitch[] = [],
    seen = new Set<string>();
  let next: string | null = id;
  while (next) {
    if (seen.has(next)) return { switches: switches.reverse(), cycle: true };
    seen.add(next);
    const item: LightSwitch | undefined = project.electrical.switches[next];
    if (!item) break;
    switches.push(item);
    next = item.supply.kind === "switch" ? item.supply.switchId : null;
  }
  return { switches: switches.reverse(), cycle: false };
}

export function setSwitchSupply(project: Project, id: string, supply: LightSwitch["supply"]): void {
  const item = project.electrical.switches[id]!;
  if (supply.kind === "switch") {
    const source = project.electrical.switches[supply.switchId];
    if (!source?.circuitId) throw new Error("Vorgeschalteten Schalter zuerst einem Stromkreis zuordnen.");
    if (item.circuitId && item.circuitId !== source.circuitId)
      throw new Error("Schalter einer Reihenschaltung müssen demselben Stromkreis zugeordnet sein.");
    if (switchChain(project, source.id).switches.some((entry) => entry.id === id))
      throw new Error("Eine Reihenschaltung darf keinen Kreis bilden.");
    item.circuitId = source.circuitId;
  }
  item.supply = structuredClone(supply);
}
