import { expect, it } from "vitest";
import { conductorFixture } from "../simulation/conductorFixture";
import { addElectrical } from "../../src/electrical/actions";
import { syncWiring, fillConsumerDefaults } from "../../src/electrical/wiring";
import { simulate } from "../../src/simulation/solve";
import { emptyScenario } from "../../src/simulation/models";
import { transact } from "../../src/editor/history/transaction";
import { suggestContacts } from "../../src/electrical/contactSuggestions";

function fixture() {
  const f = conductorFixture();
  const junction = addElectrical(f.project, f.floor, { x: 100, y: 100 }, "junctions");
  const sw = addElectrical(f.project, f.floor, { x: 200, y: 100 }, "switches");
  const lamp = addElectrical(f.project, f.floor, { x: 300, y: 100 }, "devices");
  f.project.electrical.devices[lamp]!.metadata.electricalSymbol = "lamp";
  f.connect(f.board, junction, [[`${f.circuit}:L`, "L1"]]);
  f.connect(junction, sw, [["L1", "L"]]);
  f.connect(sw, lamp, [["L_OUT", "L"]]);
  return { ...f, junction, sw, lamp };
}

it("übernimmt Stromkreis durch Abzweigdosen, Spannung und LED-Leistung; die Lampe folgt allein dem Schalter", () => {
  const { project, sw, lamp, circuit } = fixture();
  syncWiring(project, true);
  expect(project.electrical.devices[lamp]).toMatchObject({
    switchId: sw,
    circuitId: circuit,
    ratedPower: 5,
    ratedVoltage: 230,
    operatingMode: "off",
  });
  expect(
    Object.values(project.electrical.cables)
      .filter((c) => c.metadata.wiringManaged)
      .every((c) => c.circuitId === circuit),
  ).toBe(true);
  const snapshot = structuredClone(project);
  syncWiring(project, true);
  expect(project).toEqual(snapshot);
  const scenario = emptyScenario();
  expect(simulate(project, scenario).devices[lamp]!.status).toBe("running");
  scenario.switchStates[sw] = false;
  expect(simulate(project, scenario).devices[lamp]!.status).toBe("unpowered");
});

it("entfernt beim Löschen die Versorgung und lässt unabhängige Typenschildwerte bestehen", () => {
  const { project, lamp, sw } = fixture();
  const d = project.electrical.devices[lamp]!;
  d.ratedPower = 8;
  d.ratedVoltage = 12;
  syncWiring(project, true);
  const cable = Object.values(project.electrical.cables).find(
    (c) => c.startNodeId === sw && c.endNodeId === lamp,
  )!;
  const next = transact(project, (p) => {
    delete p.electrical.cables[cable.id];
  });
  expect(next.electrical.devices[lamp]).toMatchObject({
    switchId: null,
    circuitId: null,
    ratedPower: 8,
    ratedVoltage: 12,
  });
});

it("blockiert zwei unterschiedliche Stromkreise statt die Simulation falsch zu versorgen", () => {
  const { project, junction, circuit, board, connect } = fixture();
  const other = structuredClone(project.electrical.circuits[circuit]!);
  other.id = "second-circuit";
  other.label = "SK-99";
  project.electrical.circuits[other.id] = other;
  connect(board, junction, [[`${other.id}:L`, "L1"]]);
  expect(() => syncWiring(project, true)).toThrow(/unterschiedliche Stromkreise/);
});

it("ersetzt widersprüchliche Altzuordnungen durch den tatsächlich angeschlossenen Schalter", () => {
  const { project, lamp, sw, circuit } = fixture();
  const old = addElectrical(project, project.floorOrder[0]!, { x: 900, y: 900 }, "switches");
  project.electrical.switches[old]!.circuitId = circuit;
  project.electrical.devices[lamp]!.circuitId = circuit;
  project.electrical.devices[lamp]!.switchId = old;
  syncWiring(project, true);
  expect(project.electrical.devices[lamp]!.switchId).toBe(sw);
});

it("schaltet eine verdrahtete Reihenschaltung mit jedem vorgeschalteten Schalter ab", () => {
  const { project, sw, lamp, connect, floor } = fixture();
  const second = addElectrical(project, floor, { x: 250, y: 100 }, "switches");
  const old = Object.values(project.electrical.cables).find(
    (c) => c.startNodeId === sw && c.endNodeId === lamp,
  )!;
  delete project.electrical.cables[old.id];
  connect(sw, second, [["L_OUT", "L"]]);
  connect(second, lamp, [["L_OUT", "L"]]);
  syncWiring(project, true);
  expect(project.electrical.switches[second]!.supply).toEqual({ kind: "switch", switchId: sw });
  const scenario = emptyScenario();
  expect(simulate(project, scenario).devices[lamp]!.status).toBe("running");
  scenario.switchStates[sw] = false;
  expect(simulate(project, scenario).devices[lamp]!.status).toBe("unpowered");
});

it("verliert nach Entfernen der Zuleitung auch hinter Abzweigdosen die Versorgung", () => {
  const { project, board, junction, lamp } = fixture();
  syncWiring(project, true);
  const cable = Object.values(project.electrical.cables).find(
    (c) => c.startNodeId === board && c.endNodeId === junction,
  )!;
  const next = transact(project, (p) => {
    delete p.electrical.cables[cable.id];
  });
  expect(next.electrical.devices[lamp]!.circuitId).toBeNull();
  expect(simulate(next, emptyScenario()).devices[lamp]!.status).toBe("unpowered");
});

it("schlägt für die Schalterzuleitung den Eingang und nicht den geschalteten Ausgang vor", () => {
  const { project, junction, sw } = fixture();
  syncWiring(project, true);
  expect(suggestContacts(project, junction, sw)).toEqual([{ startContactId: "L1", endContactId: "L" }]);
});

it("übernimmt eine dokumentierte Steckdosenspannung auch bei noch unvollständiger Einspeisung", () => {
  const { project, lamp, floor } = fixture();
  const outlet = addElectrical(project, floor, { x: 900, y: 500 }, "outlets");
  project.electrical.outlets[outlet]!.ratedVoltage = 230;
  project.electrical.devices[lamp]!.connectionPointId = outlet;
  fillConsumerDefaults(project);
  expect(project.electrical.devices[lamp]!.ratedVoltage).toBe(230);
});
