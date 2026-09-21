import { networkNodeTable } from "../network/model";
import { utilities } from "../utilities/model";
import type { Project } from "../models/project";

/** Gemeinsamer Editorzugriff; Fachmodelle bleiben in ihren eigenen Modulen. */
export function elementTables(project: Project) {
  return {
    networkNodes: networkNodeTable(project),
    utilityNodes: utilities(project).nodes,
    utilityPipes: utilities(project).pipes,
    walls: project.walls,
    rooms: project.rooms,
    doors: project.doors,
    windows: project.windows,
    dimensions: project.dimensions,
    furniture: project.furniture,
    junctions: project.electrical.junctions,
    cables: project.electrical.cables,
    outlets: project.electrical.outlets,
    devices: project.electrical.devices,
    distributionBoards: project.electrical.distributionBoards,
    supplies: project.electrical.supplies,
    meters: project.electrical.meters,
    switches: project.electrical.switches,
    controls: project.electrical.controls,
    transformers: project.electrical.transformers,
  };
}
export const elementKinds = [
  "networkNodes",
  "utilityNodes",
  "utilityPipes",
  "walls",
  "rooms",
  "doors",
  "windows",
  "dimensions",
  "furniture",
  "junctions",
  "cables",
  "outlets",
  "devices",
  "distributionBoards",
  "supplies",
  "meters",
  "switches",
  "controls",
  "transformers",
] as const;
