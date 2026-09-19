import { createProject } from "../../src/core/projectFactory";
import { addElectrical } from "../../src/electrical/actions";
import { addProtectionDevice } from "../../src/electrical/boardActions";

export function distributionFixture() {
  const project = createProject("Haupt- und Unterverteilung");
  const floor = project.floorOrder[0]!;
  const upper = { ...project.floors[floor]!, id: crypto.randomUUID(), name: "Obergeschoss", elevation: 3000 };
  project.floors[upper.id] = upper;
  project.floorOrder.push(upper.id);
  const source = addElectrical(project, floor, { x: 0, y: 0 }, "supplies");
  project.electrical.supplies[source]!.ratedCurrent = 63;
  const main = addElectrical(project, floor, { x: 2000, y: 0 }, "distributionBoards");
  project.electrical.distributionBoards[main]!.supplyId = source;
  project.electrical.distributionBoards[main]!.name = "Hauptverteilung";
  const sub = addElectrical(project, upper.id, { x: 2000, y: 0 }, "distributionBoards");
  project.electrical.distributionBoards[sub]!.name = "Etagenverteiler";
  const upstream = addProtectionDevice(project, main);
  project.electrical.protectionDevices[upstream]!.ratedCurrent = 32;
  const branch = addProtectionDevice(project, sub);
  const feeder = crypto.randomUUID(),
    terminal = crypto.randomUUID();
  project.electrical.circuits[feeder] = {
    id: feeder,
    name: "Zuleitung OG",
    label: "SK-01",
    distributionBoardId: main,
    protectionDeviceId: upstream,
    phase: "L1/L2/L3",
    nominalVoltage: null,
    metadata: {},
  };
  project.electrical.circuits[terminal] = {
    id: terminal,
    name: "Steckdosen OG",
    label: "SK-02",
    distributionBoardId: sub,
    protectionDeviceId: branch,
    phase: "L1",
    nominalVoltage: null,
    metadata: {},
  };
  const outlet = addElectrical(project, upper.id, { x: 4000, y: 0 }, "outlets");
  project.electrical.outlets[outlet]!.circuitId = terminal;
  return { project, main, sub, source, feeder, terminal, upstream, branch, outlet, upper };
}
