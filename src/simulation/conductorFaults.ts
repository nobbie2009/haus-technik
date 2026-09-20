import type { Project } from "../models/project";
import type { ConductorFault, SimulationScenario } from "./models";
import type { ConductorNetwork } from "./conductorNetwork";

export interface ConductorFaultResult extends ConductorFault {
  current: number | null;
  initialCurrent: number | null;
  status: "active" | "cleared" | "unpowered" | "incomplete";
  issues: string[];
}
export interface ResidualProtectionResult {
  id: string;
  residualMilliAmps: number;
  thresholdMilliAmps: number | null;
  status: "below" | "trip" | "uncertain";
}

export function analyzeConductorFaults(
  project: Project,
  scenario: SimulationScenario,
  network: ConductorNetwork,
  contact: (id: string, pin: string) => [string, string] | null,
  voltage: (sourceId: string) => number,
): { faults: ConductorFaultResult[]; protections: ResidualProtectionResult[] } {
  const sums = new Map<string, { real: number; imaginary: number }>();
  let uncertain = false;
  const faults = (scenario.conductorFaults ?? []).map((fault): ConductorFaultResult => {
    const result: ConductorFaultResult = {
      ...fault,
      current: null,
      initialCurrent: null,
      status: "incomplete",
      issues: [],
    };
    const device = project.electrical.devices[fault.deviceId];
    if (
      !device ||
      device.phases !== 1 ||
      device.transformerId ||
      !Number.isFinite(fault.resistanceOhms) ||
      fault.resistanceOhms < 0.001 ||
      fault.resistanceOhms > 1e9
    ) {
      result.issues.push(
        "Fehlermodell benötigt einen einphasigen Netzverbraucher und einen Gesamtwiderstand von 0,001 Ω bis 1 GΩ.",
      );
      uncertain = true;
      return result;
    }
    const line = contact(device.id, "L");
    if (!line || !/^L[123]$/.test(line[1])) {
      result.status = "unpowered";
      result.current = 0;
      result.issues.push("Kein eindeutiger aktiver Außenleiter am Fehlerort.");
      return result;
    }
    const returnPin = fault.kind === "line-pe" ? "PE" : "N";
    const back = contact(device.id, returnPin);
    if (!back || back[0] !== line[0] || back[1] !== returnPin || !project.electrical.supplies[line[0]]) {
      result.issues.push(
        `Rückweg über ${returnPin} zur selben Quelle fehlt oder ist widersprüchlich. Keine Schutzbewertung möglich.`,
      );
      uncertain = true;
      return result;
    }
    const source = project.electrical.supplies[line[0]]!;
    const outward = network.path(`${source.id}/${source.phases === 1 ? "L" : line[1]}`, `${device.id}/L`);
    const inward = network.path(`${device.id}/${returnPin}`, `${source.id}/${returnPin}`);
    if (!outward || !inward) {
      uncertain = true;
      return result;
    }
    result.current = voltage(source.id) / fault.resistanceOhms;
    result.initialCurrent = result.current;
    result.status = "active";
    if (network.ambiguous(outward) || network.ambiguous(inward)) {
      uncertain = true;
      result.issues.push(
        "Parallele Leiterpfade: Stromaufteilung und Schutzreaktion sind ohne Impedanznetz unbestimmt.",
      );
      return result;
    }
    const angle = line[1] === "L2" ? (-2 * Math.PI) / 3 : line[1] === "L3" ? (2 * Math.PI) / 3 : 0;
    for (const step of [...outward, ...inward]) {
      for (const id of network.edges[step.index]!.protections) {
        const protection = project.electrical.protectionDevices[id];
        if (!protection || !["RCD", "RCBO"].includes(protection.type)) continue;
        const sum = sums.get(id) ?? { real: 0, imaginary: 0 };
        sum.real += step.direction * result.current * Math.cos(angle);
        sum.imaginary += step.direction * result.current * Math.sin(angle);
        sums.set(id, sum);
      }
    }
    return result;
  });
  const protections = [...sums].map(([id, sum]): ResidualProtectionResult => {
    const residualMilliAmps = Math.hypot(sum.real, sum.imaginary) * 1000;
    const thresholdMilliAmps = project.electrical.protectionDevices[id]!.residualCurrent;
    return {
      id,
      residualMilliAmps,
      thresholdMilliAmps,
      status:
        uncertain || !thresholdMilliAmps
          ? "uncertain"
          : residualMilliAmps + 1e-9 >= thresholdMilliAmps
            ? "trip"
            : "below",
    };
  });
  return { faults, protections };
}
