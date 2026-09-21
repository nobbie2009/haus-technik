import { describe, expect, it } from "vitest";
import { simulationFixture } from "../simulation/fixture";
import { addBoardTransformer } from "../../src/electrical/boardActions";
import { addProtectionPreset, protectionPresets } from "../../src/electrical/protectionPresets";
import { parseProject } from "../../src/core/validation";
import { simulate } from "../../src/simulation/solve";
import { emptyScenario } from "../../src/simulation/models";
import { objectSupply } from "../../src/electrical/supply";
import { boardSchedule } from "../../src/housebook/boardSchedule";
import { deleteSelection } from "../../src/editor/actions/edit";
import { transact } from "../../src/editor/history/transaction";

describe("Sicherungskasten mit Mehrfachtrafo", () => {
  it("legt unterschiedliche Sicherungen mit eindeutiger Kennzeichnung und Typenschildwerten an", () => {
    const { project, sub } = simulationFixture();
    const ids = protectionPresets.map((preset) => addProtectionPreset(project, sub, preset.id));
    const devices = ids.map((id) => project.electrical.protectionDevices[id]!);
    expect(new Set(devices.map((d) => d.label)).size).toBe(ids.length);
    expect(devices.find((d) => d.type === "RCBO")).toMatchObject({
      ratedCurrent: 16,
      poles: 2,
      residualCurrent: 30,
    });
    expect(devices.find((d) => d.characteristic === "NH00 gG")).toMatchObject({
      type: "fuse",
      ratedCurrent: 63,
    });
    expect(parseProject(project)).toEqual(project);
  });

  it("berechnet alle vier Ausgänge gleichzeitig und summiert die gemeinsame VA-Last", () => {
    const { project, sub, terminal, devices, branch } = simulationFixture([3, 4.5, 6, 12]);
    const id = addBoardTransformer(project, sub);
    const tx = project.electrical.transformers[id]!;
    tx.circuitId = terminal;
    devices.forEach((deviceId, i) =>
      Object.assign(project.electrical.devices[deviceId]!, {
        connectionPointId: null,
        circuitId: terminal,
        transformerId: id,
        transformerVoltage: [6, 9, 12, 24][i],
        ratedVoltage: [6, 9, 12, 24][i],
        powerFactor: 1,
      }),
    );
    const saved = parseProject(JSON.parse(JSON.stringify(project)));
    const result = simulate(saved, emptyScenario());
    devices.forEach((deviceId, i) => {
      expect(result.devices[deviceId]).toMatchObject({
        voltage: [6, 9, 12, 24][i],
        current: 0.5,
        status: "running",
      });
      expect(objectSupply(saved, "devices", deviceId).voltage).toBe([6, 9, 12, 24][i]);
    });
    expect(result.nodes[id]!.utilization).toBeCloseTo((25.5 / 24) * 100);
    expect(result.nodes[id]!.overload).toBe(true);
    expect(result.nodes[branch]!.maxCurrent).toBeCloseTo(25.5 / 230);
    expect(boardSchedule(project, sub).rows.find((r) => r.id === terminal)?.areas).toContain(
      "6 / 9 / 12 / 24 V",
    );
    tx.ratedVA = 30;
    expect(simulate(project, emptyScenario()).nodes[id]!.overload).toBe(false);
    const disconnected = emptyScenario();
    disconnected.disabledNodeIds = [branch];
    expect(simulate(project, disconnected).devices[devices[0]!]!.status).toBe("unpowered");
  });

  it("validiert Ausgänge und Kastenzuordnung und löst Beziehungen beim Löschen", () => {
    const { project, sub, feeder, terminal, devices } = simulationFixture([3]);
    const id = addBoardTransformer(project, sub);
    expect(boardSchedule(project, sub).rows.find((r) => r.id === id)?.areas).toContain(
      "Primärstromkreis offen",
    );
    expect(() =>
      transact(project, (p) => {
        p.electrical.transformers[id]!.circuitId = feeder;
      }),
    ).toThrow(/selben Sicherungskasten/);
    project.electrical.transformers[id]!.circuitId = terminal;
    const device = project.electrical.devices[devices[0]!]!;
    Object.assign(device, {
      connectionPointId: null,
      circuitId: terminal,
      transformerId: id,
      transformerVoltage: 12,
    });
    expect(() =>
      transact(project, (p) => {
        p.electrical.devices[device.id]!.transformerVoltage = 8;
      }),
    ).toThrow(/Trafoausgang/);
    expect(() =>
      transact(project, (p) => {
        p.electrical.transformers[id]!.secondaryVoltages = [6, 6];
      }),
    ).toThrow(/eindeutig/);
    const deleted = transact(project, (p) => deleteSelection(p, [{ kind: "distributionBoards", id: sub }]));
    expect(deleted.electrical.transformers[id]!.distributionBoardId).toBeNull();
    expect(deleted.electrical.devices[device.id]!.transformerId).toBeNull();
    expect(parseProject(deleted)).toEqual(deleted);
  });
});
