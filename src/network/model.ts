import type { Project } from "../models/project";
import type { Vec2, EntityTable, FloorElement } from "../models/common";
import { bookSchema, housebook, setHousebook, networkLabels, type Housebook } from "../housebook/model";
import { newId } from "../utils/uuid";
import { isTvKind, tvCatalog, tvDefaults } from "./tv";
import { poeDefaults } from "./poe";

export type NetworkNode = Housebook["networkNodes"][number];
export type NetworkKind = NetworkNode["kind"];
export const networkPorts: Record<NetworkKind, number> = {
  router: 4,
  switch: 8,
  poeSwitch: 8,
  poeDevice: 1,
  poeDoorbell: 1,
  zigbee: 1,
  patchPanel: 24,
  socket: 2,
  accessPoint: 1,
  repeater: 1,
  server: 2,
  client: 1,
  ...(Object.fromEntries(Object.entries(tvCatalog).map(([id, item]) => [id, item.ports.length])) as Record<
    keyof typeof tvCatalog,
    number
  >),
};
export function networkLayer(project: Project) {
  return Object.values(project.layers).find((layer) => layer.kind === "network");
}
export function ensureNetworkLayer(project: Project): string {
  const layer = networkLayer(project);
  if (layer) return layer.id;
  const id = newId();
  project.layers[id] = {
    id,
    kind: "network",
    name: "Netzwerk",
    visible: true,
    locked: false,
    opacity: 1,
    metadata: {},
  };
  project.layerOrder.push(id);
  return id;
}
/** Read-only editor projection; mutations go through the housebook to preserve one data source. */
export function networkNodeTable(project: Project): EntityTable<NetworkNode & FloorElement> {
  const book = bookSchema.safeParse(project.metadata.housebook);
  if (!book.success) return {};
  const layerId = networkLayer(project)?.id ?? "";
  return Object.fromEntries(
    book.data.networkNodes.map((node) => [node.id, { ...node, layerId, metadata: node.metadata ?? {} }]),
  );
}
export function addNetworkNode(
  project: Project,
  floorId: string,
  position: Vec2,
  kind: NetworkKind,
  zigbeeAddress?: string,
): string {
  const layerId = ensureNetworkLayer(project);
  if (!project.layers[layerId]!.visible || project.layers[layerId]!.locked)
    throw new Error("Bitte die Netzwerkebene einblenden und entsperren.");
  if (!project.floors[floorId]) throw new Error("Geschoss fehlt.");
  const book = housebook(project),
    id = newId();
  const zigbeeDevice =
    kind === "zigbee" ? book.zigbee?.devices.find((d) => d.address === zigbeeAddress) : undefined;
  if (
    kind === "zigbee" &&
    (!zigbeeDevice || book.networkNodes.some((n) => n.zigbeeAddress === zigbeeAddress))
  )
    throw new Error("Ein noch nicht platziertes Gerät aus der Zigbee2MQTT-Liste auswählen.");
  let number = 1;
  while (book.networkNodes.some((n) => n.name === `${networkLabels[kind]} ${number}`)) number++;
  book.networkNodes.push({
    id,
    kind,
    floorId,
    position: { ...position },
    name: zigbeeDevice?.name || `${networkLabels[kind]} ${number}`,
    ...(zigbeeDevice ? { zigbeeAddress: zigbeeDevice.address } : {}),
    ports: networkPorts[kind],
    ...(poeDefaults(kind, networkPorts[kind]) ? { poe: poeDefaults(kind, networkPorts[kind]) } : {}),
    ...(isTvKind(kind) ? { tv: tvDefaults(kind) } : {}),
  });
  setHousebook(project, book);
  return id;
}
export function changeNetworkNode(project: Project, id: string, change: (node: NetworkNode) => void) {
  const book = housebook(project),
    node = book.networkNodes.find((n) => n.id === id);
  if (!node) throw new Error("Netzwerkgerät fehlt.");
  change(node);
  setHousebook(project, book);
}
export function deleteNetworkNodes(project: Project, ids: Set<string>) {
  if (!ids.size) return;
  const book = housebook(project);
  book.networkNodes = book.networkNodes.filter((n) => !ids.has(n.id));
  book.networkLinks = book.networkLinks.filter((l) => !ids.has(l.from) && !ids.has(l.to));
  book.wifiMeasurements = book.wifiMeasurements.filter((m) => !ids.has(m.sourceId));
  setHousebook(project, book);
}
