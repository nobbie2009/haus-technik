import { createProject } from "../../src/core/projectFactory";
import { addElectrical } from "../../src/electrical/actions";
import { addProtectionDevice } from "../../src/electrical/boardActions";
import { addCable } from "../../src/electrical/cables";
import { setCableContacts } from "../../src/electrical/contacts";
import { newId } from "../../src/utils/uuid";

export function conductorFixture() {
  const project = createProject("Verdrahtete Prüfung"),
    floor = project.floorOrder[0]!;
  const source = addElectrical(project, floor, { x: 0, y: 0 }, "supplies");
  const board = addElectrical(project, floor, { x: 1500, y: 0 }, "distributionBoards");
  project.electrical.supplies[source]!.phases = 1;
  project.electrical.distributionBoards[board]!.supplyId = source;
  const rcd = addProtectionDevice(project, board, "RCD");
  project.electrical.protectionDevices[rcd]!.residualCurrent = 30;
  const mcb = addProtectionDevice(project, board);
  project.electrical.protectionDevices[mcb]!.upstreamProtectionDeviceId = rcd;
  const circuit = newId();
  project.electrical.circuits[circuit] = {
    id: circuit,
    name: "Testkreis",
    label: "SK1",
    distributionBoardId: board,
    protectionDeviceId: mcb,
    phase: "L1",
    nominalVoltage: null,
    metadata: {},
  };
  const device = addElectrical(project, floor, { x: 3000, y: 0 }, "devices");
  Object.assign(project.electrical.devices[device]!, {
    name: "Testlampe",
    circuitId: circuit,
    ratedVoltage: 230,
    ratedPower: 23,
    operatingMode: "on",
  });
  const connect = (a: string, b: string, pairs: string[][]) => {
    const id = addCable(project, a, b, []);
    setCableContacts(
      project,
      id,
      pairs.map(([from, to]) => ({ startContactId: from!, endContactId: to! })),
      false,
    );
    return id;
  };
  const feed = connect(source, board, [
    ["L", "IN_L1"],
    ["N", "IN_N"],
    ["PE", "IN_PE"],
  ]);
  const load = connect(
    board,
    device,
    ["L", "N", "PE"].map((p) => [`${circuit}:${p}`, p]),
  );
  return { project, floor, source, board, rcd, mcb, circuit, device, connect, feed, load };
}

export function relayConductorFixture() {
  const data = conductorFixture();
  const { project, floor, board, circuit, device, load, connect } = data;
  delete project.electrical.cables[load];
  const relay = addElectrical(project, floor, { x: 2000, y: 1000 }, "controls");
  const button = addElectrical(project, floor, { x: 1000, y: 1000 }, "switches");
  Object.assign(project.electrical.controls[relay]!, {
    name: "Relais",
    mode: "impulseRelay",
    circuitId: circuit,
    switchIds: [button],
    initialOn: false,
  });
  project.electrical.switches[button]!.circuitId = circuit;
  project.electrical.switches[button]!.label = "T1";
  project.electrical.devices[device]!.controlId = relay;
  connect(board, relay, [
    [`${circuit}:L`, "COM"],
    [`${circuit}:N`, "A2"],
  ]);
  connect(relay, device, [["NO", "L"]]);
  connect(board, device, [
    [`${circuit}:N`, "N"],
    [`${circuit}:PE`, "PE"],
  ]);
  connect(board, button, [[`${circuit}:L`, "L"]]);
  const controlCable = connect(button, relay, [["NO", "A1"]]);
  return { ...data, relay, button, controlCable };
}
