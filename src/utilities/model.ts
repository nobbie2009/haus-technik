import { z } from "zod";
import type { Project } from "../models/project";
import type { Vec2 } from "../models/common";
import { newId } from "../utils/uuid";

export const media = {
  cold: { label: "Kaltwasser", short: "KW", color: "#176fba", layer: "water" },
  hot: { label: "Warmwasser", short: "WW", color: "#b84232", layer: "water" },
  flow: { label: "Heizung Vorlauf", short: "VL", color: "#b45319", layer: "heating" },
  return: { label: "Heizung Rücklauf", short: "RL", color: "#70519a", layer: "heating" },
  gas: { label: "Gas", short: "GAS", color: "#856600", layer: "gas" },
} as const;
export type Medium = keyof typeof media;
export const nodeKinds = {
  source: "Hausanschluss",
  meter: "Zähler",
  valve: "Absperrventil",
  junction: "Abzweig",
  manifold: "Verteiler",
  tap: "Entnahmestelle",
  tank: "Warmwasserspeicher",
  radiator: "Heizkörper",
  heatingLoop: "Fußbodenheizkreis",
  boiler: "Wärmeerzeuger",
  gasBoiler: "Gasheizung",
  gasAppliance: "Gasgerät",
} as const;
export type UtilityKind = keyof typeof nodeKinds;
const n = z.number().finite(),
  id = z.uuid();
const point = z.strictObject({ x: n, y: n });
const medium = z.enum(["cold", "hot", "flow", "return", "gas"]);
const base = {
  id,
  floorId: id,
  layerId: id,
  name: z.string().trim().min(1).max(150),
  metadata: z.record(z.string(), z.json()),
};
export const utilityNodeSchema = z.strictObject({
  ...base,
  kind: z.enum(Object.keys(nodeKinds) as [UtilityKind, ...UtilityKind[]]),
  media: z.array(medium).min(1).max(5),
  position: point,
  elevation: n,
  width: n.positive().max(100000),
  depth: n.positive().max(100000),
  height: n.positive().max(100000),
  rotation: n,
  heatOutputW: n.nonnegative().nullable(),
  pressureBar: n.nonnegative().nullable(),
  temperatureC: n.min(-273.15).nullable(),
  closed: z.boolean(),
});
export const utilityPipeSchema = z.strictObject({
  ...base,
  medium,
  from: id,
  to: id,
  path: z.array(point).max(1000),
  riser: point.nullable(),
  material: z.string().max(150),
  nominalDiameter: n.positive().max(10000).nullable(),
  insulation: n.nonnegative().max(10000),
  allowance: n.nonnegative(),
});
export const utilitiesSchema = z.strictObject({
  version: z.literal(1),
  nodes: z.record(id, utilityNodeSchema),
  pipes: z.record(id, utilityPipeSchema),
});
export type UtilityNode = z.infer<typeof utilityNodeSchema>;
export type UtilityPipe = z.infer<typeof utilityPipeSchema>;
export type Utilities = z.infer<typeof utilitiesSchema>;

// Return the stored tables themselves: editor transactions must mutate the project, not parsed copies.
export function utilities(project: Project): Utilities {
  return (project.metadata.utilities as Utilities | undefined) ?? { version: 1, nodes: {}, pipes: {} };
}
export function ensureUtilities(project: Project): Utilities {
  project.metadata.utilities ??= { version: 1, nodes: {}, pipes: {} };
  return utilities(project);
}
export function supportedMedia(kind: UtilityKind, selected: Medium): Medium[] {
  if (kind === "tap" || kind === "tank") return ["cold", "hot"];
  if (["radiator", "heatingLoop", "boiler"].includes(kind)) return ["flow", "return"];
  if (kind === "gasBoiler") return ["flow", "return", "cold", "hot", "gas"];
  if (kind === "gasAppliance") return ["gas"];
  return [selected];
}
/** Alte Projekte enthielten bei der Gasheizung nur VL/RL/GAS. Diese Daten bleiben gültig. */
export function nodeMedia(node: Pick<UtilityNode, "kind" | "media">): Medium[] {
  return node.kind === "gasBoiler" ? supportedMedia("gasBoiler", "flow") : node.media;
}
export function supportsMedium(node: Pick<UtilityNode, "kind" | "media">, selected: Medium): boolean {
  return (
    node.media.includes(selected) ||
    (node.kind === "gasBoiler" && (selected === "cold" || selected === "hot"))
  );
}
export function utilityLayer(project: Project, selected: Medium): string {
  const kind = media[selected].layer;
  let layer = Object.values(project.layers).find((l) => l.kind === kind);
  if (!layer) {
    const layerId = newId();
    layer = {
      id: layerId,
      name: kind === "water" ? "Wasser" : kind === "heating" ? "Heizung" : "Gas",
      kind,
      visible: true,
      locked: false,
      opacity: 1,
      metadata: {},
    };
    project.layers[layerId] = layer;
    project.layerOrder.push(layerId);
  }
  if (layer.locked || !layer.visible) throw new Error("Die zugehörige Ebene ist gesperrt oder ausgeblendet.");
  return layer.id;
}
export function addUtilityNode(
  project: Project,
  floorId: string,
  position: Vec2,
  kind: UtilityKind,
  selected: Medium,
): string {
  const supported = supportedMedia(kind, selected),
    layerId = utilityLayer(project, supported[0]!);
  const id = newId();
  ensureUtilities(project).nodes[id] = {
    id,
    floorId,
    layerId,
    metadata: {},
    name: nodeKinds[kind],
    kind,
    media: supported,
    position: { ...position },
    elevation: 0,
    width: kind === "radiator" ? 1000 : 400,
    depth: kind === "radiator" ? 150 : 400,
    height: 600,
    rotation: 0,
    heatOutputW: null,
    pressureBar: null,
    temperatureC: null,
    closed: false,
  };
  return id;
}
export function addUtilityPipe(
  project: Project,
  from: string,
  to: string,
  selected: Medium,
  path: Vec2[] = [],
): string {
  const net = ensureUtilities(project),
    a = net.nodes[from],
    b = net.nodes[to];
  if (!a || !b || a.id === b.id) throw new Error("Zwei verschiedene Anschlussobjekte wählen.");
  if (!supportsMedium(a, selected) || !supportsMedium(b, selected))
    throw new Error("Das Medium passt nicht zu beiden Anschlüssen.");
  if ([a, b].some((v) => project.layers[v.layerId]?.locked))
    throw new Error("Ein Anschlussobjekt liegt auf einer gesperrten Ebene.");
  if (
    Object.values(net.pipes).some(
      (p) => p.medium === selected && [p.from, p.to].includes(from) && [p.from, p.to].includes(to),
    )
  )
    throw new Error("Diese Verbindung besteht bereits.");
  const id = newId(),
    layerId = utilityLayer(project, selected);
  net.pipes[id] = {
    id,
    floorId: a.floorId,
    layerId,
    name: `${media[selected].short}-${Object.keys(net.pipes).length + 1}`,
    metadata: {},
    medium: selected,
    from,
    to,
    path: structuredClone(path),
    riser: a.floorId === b.floorId ? null : { ...b.position },
    material: "",
    nominalDiameter: null,
    insulation: 0,
    allowance: 0,
  };
  return id;
}
export function pipeOnFloor(project: Project, pipe: UtilityPipe, floorId: string): boolean {
  const net = utilities(project);
  return net.nodes[pipe.from]?.floorId === floorId || net.nodes[pipe.to]?.floorId === floorId;
}
export function pipeFloorPath(project: Project, pipe: UtilityPipe, floorId: string): Vec2[] {
  const net = utilities(project),
    a = net.nodes[pipe.from],
    b = net.nodes[pipe.to];
  if (!a || !b) return [];
  if (!pipe.riser) return a.floorId === floorId ? [a.position, ...pipe.path, b.position] : [];
  if (a.floorId === floorId) return [a.position, ...pipe.path, pipe.riser];
  return b.floorId === floorId ? [pipe.riser, b.position] : [];
}
export function pipeLength(project: Project, pipe: UtilityPipe): number {
  const net = utilities(project),
    a = net.nodes[pipe.from]!,
    b = net.nodes[pipe.to]!;
  const length = (ps: Vec2[]) =>
    ps.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - ps[i]!.x, p.y - ps[i]!.y), 0);
  return (
    length(pipeFloorPath(project, pipe, a.floorId)) +
    (a.floorId === b.floorId ? 0 : length(pipeFloorPath(project, pipe, b.floorId))) +
    Math.abs(
      (project.floors[a.floorId]?.elevation ?? 0) +
        a.elevation -
        (project.floors[b.floorId]?.elevation ?? 0) -
        b.elevation,
    ) +
    pipe.allowance
  );
}

/** Keep route captions off component labels by using the longest segment's midpoint. */
export function pipeCaptionPoint(path: Vec2[]): Vec2 {
  let result = path[0] ?? { x: 0, y: 0 },
    longest = -1;
  path.slice(1).forEach((b, i) => {
    const a = path[i]!,
      length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length > longest) {
      longest = length;
      result = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
  });
  return result;
}
