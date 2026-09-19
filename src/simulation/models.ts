export const phases = ["L1", "L2", "L3"] as const;
export type Phase = (typeof phases)[number];
export interface SimulationScenario {
  /** Nur Szenariozustand; Projekt und dokumentierte Betriebsarten bleiben unverändert. */
  deviceStates: Record<string, "on" | "off">;
  switchStates: Record<string, boolean>;
  relayStates: Record<string, boolean>;
  disabledNodeIds: string[];
  disabledPhases: Record<string, Phase[]>;
  assumeUnityPowerFactor: boolean;
}
export const emptyScenario = (): SimulationScenario => ({
  deviceStates: {},
  switchStates: {},
  relayStates: {},
  disabledNodeIds: [],
  disabledPhases: {},
  assumeUnityPowerFactor: true,
});
export type SimulationNodeKind =
  | "supply"
  | "meter"
  | "board"
  | "protection"
  | "circuit"
  | "outlet"
  | "device"
  | "switch"
  | "control"
  | "transformer";
export interface SimulationNode {
  id: string;
  kind: SimulationNodeKind;
  parentId: string | null;
  phase: Phase | "L1/L2/L3" | "unknown";
}
export interface SimulationGraph {
  nodes: Record<string, SimulationNode>;
  edges: { from: string; to: string }[];
}
export interface DeviceResult {
  id: string;
  state: "on" | "off" | "standby";
  status: "running" | "off" | "unpowered" | "incomplete";
  voltage: number | null;
  power: number | null;
  current: number | null;
  powerFactor: number | null;
  estimated: boolean;
  phaseIds: Phase[];
  issues: string[];
}
export interface NodeResult {
  id: string;
  sourceId: string | null;
  availablePhases: Phase[];
  deviceIds: string[];
  knownPower: number;
  phaseCurrents: Record<Phase, number>;
  maxCurrent: number | null;
  ratedCurrent: number | null;
  utilization: number | null;
  overload: boolean;
  incompleteCount: number;
  estimated: boolean;
}
export interface SimulationResult {
  graph: SimulationGraph;
  devices: Record<string, DeviceResult>;
  nodes: Record<string, NodeResult>;
  issues: string[];
}
