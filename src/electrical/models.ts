import type { Entity, EntityTable, FloorElement, UUID, Vec2 } from "../models/common";

export type ElectricalLabelMode = "label" | "name" | "number" | "circuit" | "none";
export interface ElectricalPlacement extends FloorElement {
  name: string;
  label: string;
  labelMode: ElectricalLabelMode;
  position: Vec2;
  roomId: UUID | null;
}
export interface Outlet extends ElectricalPlacement {
  number: string;
  wallId: UUID | null;
  circuitId: UUID | null;
  socketType: string;
  ratedVoltage: number | null;
  ratedCurrent: number | null;
  phases: 1 | 3;
}
export interface ElectricalDevice extends ElectricalPlacement {
  controlId: UUID | null;
  transformerId: UUID | null;
  transformerVoltage?: number | null | undefined;
  /** Einfacher Lichtschalter für einphasigen Festanschluss, sonst null. */
  switchId: UUID | null;
  type: string;
  furnitureId: UUID | null;
  /** Steckdosen-ID; keine implizite Verbindung durch räumliche Nähe. */
  connectionPointId: UUID | null;
  /** Direkter Festanschluss. Bei Steckdosenanschluss bleibt dieses Feld null. */
  circuitId: UUID | null;
  ratedVoltage: number | null;
  ratedCurrent: number | null;
  ratedPower: number | null;
  powerFactor: number | null;
  phases: 1 | 3;
  operatingMode: "on" | "off" | "standby";
}
export interface DistributionBoard extends ElectricalPlacement {
  upstreamCircuitId: UUID | null;
  supplyId: UUID | null;
  meterId: UUID | null;
}
export interface LightSwitch extends ElectricalPlacement {
  /** Reihenschaltung: Eingang aus Stromkreis, vorgeschaltetem Schalter oder bewusst getrennt. */
  supply: { kind: "circuit" } | { kind: "switch"; switchId: UUID } | { kind: "disconnected" };
  type: "singlePole";
  circuitId: UUID | null;
  wallId: UUID | null;
  closed: boolean;
}
/** Funktionale Wechsel-/Kreuzschaltung oder bistabiles Stromstoßrelais. */
export interface SwitchingControl extends ElectricalPlacement {
  mode: "changeover" | "impulseRelay";
  circuitId: UUID | null;
  switchIds: UUID[];
  initialOn: boolean;
  inverted: boolean;
}
export interface Transformer extends ElectricalPlacement {
  distributionBoardId?: UUID | null | undefined;
  secondaryVoltages?: number[] | undefined;
  circuitId: UUID | null;
  primaryVoltage: number;
  secondaryVoltage: number;
  ratedVA: number;
}
export interface ElectricityMeter extends ElectricalPlacement {
  supplyId: UUID | null;
  serialNumber: string;
  readingKWh: number | null;
}
export interface ElectricalSupply extends ElectricalPlacement {
  /** null übernimmt die projektweite Vorgabe. L–N bzw. L–L, in V. */
  phaseNeutralVoltage: number | null;
  phasePhaseVoltage: number | null;
  phases: 1 | 3;
  /** Dokumentierte Anschlusskapazität je Außenleiter, keine Stromquelle mit festem Strom. */
  ratedCurrent: number | null;
}
export interface ElectricalSettings {
  phaseNeutralVoltage: number;
  phasePhaseVoltage: number;
}
export const defaultElectricalSettings = (): ElectricalSettings => ({
  phaseNeutralVoltage: 230,
  phasePhaseVoltage: 400,
});
export interface Junction extends ElectricalPlacement {
  type: "junctionBox" | "terminal" | "connectionPoint";
}
export interface Cable extends FloorElement {
  /** Senkrechter Geschossübergang; path liegt auf der Start-, endPath auf der Zieletage. */
  riser: Vec2 | null;
  endPath: Vec2[];
  /** Kontakt-IDs sind innerhalb des referenzierten Endobjekts stabil. Leere Liste = nur Leitungsweg. */
  conductorConnections: { startContactId: string; endContactId: string }[];
  /** Optionaler, ausdrücklich bestätigter Zusammenhang mit der logischen Versorgung. */
  connectionAssignment: "none" | "switch" | "outlet";
  name: string;
  label: string;
  type: string;
  /** IDs räumlicher Elektroobjekte; diese sind die Knoten des Bauteilgraphen. */
  startNodeId: UUID;
  endNodeId: UUID;
  /** Nur Zwischenpunkte in mm. Endpunkte werden aus den referenzierten Objekten abgeleitet. */
  path: Vec2[];
  circuitId: UUID | null;
  conductorCount: number | null;
  conductorCrossSection: number | null;
  material: string;
  installationMethod: string;
  ratedVoltage: number | null;
  lengthAllowance: number;
}
export interface ProtectionDevice extends Entity {
  upstreamProtectionDeviceId: UUID | null;
  distributionBoardId: UUID;
  type: "MCB" | "RCD" | "RCBO" | "fuse" | "other";
  label: string;
  ratedCurrent: number | null;
  characteristic: string;
  poles: number;
  /** mA und kA; reine Bestandsdaten, keine Schutzbewertung. */
  residualCurrent: number | null;
  breakingCapacity: number | null;
}
export interface Circuit extends Entity {
  name: string;
  label: string;
  distributionBoardId: UUID;
  protectionDeviceId: UUID | null;
  phase: "L1" | "L2" | "L3" | "L1/L2/L3" | "unknown";
  nominalVoltage: number | null;
}
export interface ElectricalModel {
  controls: EntityTable<SwitchingControl>;
  transformers: EntityTable<Transformer>;
  switches: EntityTable<LightSwitch>;
  settings: ElectricalSettings;
  supplies: EntityTable<ElectricalSupply>;
  meters: EntityTable<ElectricityMeter>;
  junctions: EntityTable<Junction>;
  cables: EntityTable<Cable>;
  outlets: EntityTable<Outlet>;
  devices: EntityTable<ElectricalDevice>;
  distributionBoards: EntityTable<DistributionBoard>;
  circuits: EntityTable<Circuit>;
  protectionDevices: EntityTable<ProtectionDevice>;
}
export const emptyElectrical = (): ElectricalModel => ({
  controls: {},
  transformers: {},
  switches: {},
  settings: defaultElectricalSettings(),
  supplies: {},
  meters: {},
  junctions: {},
  cables: {},
  outlets: {},
  devices: {},
  distributionBoards: {},
  circuits: {},
  protectionDevices: {},
});
export const electricalPlacementKinds = [
  "controls",
  "transformers",
  "switches",
  "supplies",
  "meters",
  "outlets",
  "devices",
  "distributionBoards",
  "junctions",
] as const;
export type ElectricalKind = (typeof electricalPlacementKinds)[number];
