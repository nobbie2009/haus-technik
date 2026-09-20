import { simulationFixture } from "./simulation/fixture";
import { addProtectionDevice } from "../src/electrical/boardActions";
import { addElectrical } from "../src/electrical/actions";
import { newId } from "../src/utils/uuid";
export function boardScheduleFixture() {
  const f = simulationFixture(),
    p = f.project;
  p.name = "Testhaus · Druckmuster";
  const fi = addProtectionDevice(p, f.main, "RCD");
  p.electrical.protectionDevices[fi]!.label = "FI-Haus";
  p.electrical.protectionDevices[fi]!.residualCurrent = 30;
  p.electrical.protectionDevices[f.upstream]!.upstreamProtectionDeviceId = fi;
  for (let i = 1; i <= 18; i++) {
    const id = newId(),
      protection = addProtectionDevice(p, f.sub);
    p.electrical.circuits[id] = {
      id,
      name: `Teststromkreis ${i} – Küche und Außenbereich`,
      label: `SK-${i + 2}`,
      distributionBoardId: f.sub,
      protectionDeviceId: protection,
      phase: "L1",
      nominalVoltage: null,
      metadata: {},
    };
    const device = addElectrical(p, f.upper.id, { x: i * 100, y: 100 }, "devices");
    Object.assign(p.electrical.devices[device]!, {
      name: `Prüfgerät ${i} · Gerätebeschreibung mit Umlauten äöü`,
      circuitId: id,
    });
  }
  for (let i = 1; i <= 70; i++) {
    const id = addElectrical(p, f.upper.id, { x: i * 100, y: 200 }, "devices");
    Object.assign(p.electrical.devices[id]!, {
      name: `Langtextgerät-${i} mit ausführlicher Standortbezeichnung`,
      circuitId: f.terminal,
    });
  }
  return f;
}
