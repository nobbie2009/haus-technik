import { describe, expect, it } from "vitest";
import { distributionFixture } from "./distributionFixture";
import { canFeedBoard, distributionPath } from "../../src/electrical/distributionTopology";
import { objectSupply } from "../../src/electrical/supply";
import { deleteCircuit, addElectrical } from "../../src/electrical/actions";
import { transact } from "../../src/editor/history/transaction";
import { deleteSelection } from "../../src/editor/actions/edit";
import { useProjectStore } from "../../src/stores/projectStore";
import { exportProjectText, importProjectText } from "../../src/persistence/projectFile";

describe("Unterverteilungen", () => {
  it("führt Versorgung und Sicherungskette über Etagen ohne gespeicherte Kopien zusammen", () => {
    const { project, sub, feeder, outlet, upstream, branch, source } = distributionFixture();
    project.electrical.distributionBoards[sub]!.upstreamCircuitId = feeder;
    const before = JSON.stringify(project);
    const supply = objectSupply(project, "outlets", outlet);
    expect(supply).toMatchObject({
      voltage: 230,
      overcurrentRating: 16,
      capacity: 63,
      supply: { id: source },
    });
    expect(supply.chain.map((item) => item.id)).toEqual([upstream, branch]);
    expect(supply.routeLabels).toEqual(["UV-01", "F1", "SK-01", "UV-02", "F2", "SK-02"]);
    project.electrical.protectionDevices[upstream]!.ratedCurrent = 10;
    expect(objectSupply(project, "outlets", outlet).overcurrentRating).toBe(10);
    project.electrical.protectionDevices[upstream]!.ratedCurrent = 32;
    expect(JSON.stringify(project)).toBe(before);
    expect(importProjectText(exportProjectText(project))).toEqual(project);
  });
  it("verhindert direkte und indirekte Kreise auch beim Umhängen eines Stromkreises", () => {
    const { project, sub, main, feeder, terminal } = distributionFixture();
    project.electrical.distributionBoards[sub]!.upstreamCircuitId = feeder;
    expect(canFeedBoard(project, sub, terminal)).toBe(false);
    expect(canFeedBoard(project, main, terminal)).toBe(false);
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.distributionBoards[sub]!.upstreamCircuitId = terminal;
      }),
    ).toThrow(/Kreis/);
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.circuits[feeder]!.distributionBoardId = sub;
        draft.electrical.circuits[feeder]!.protectionDeviceId = null;
      }),
    ).toThrow(/Kreis/);
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.distributionBoards[main]!.supplyId = null;
        draft.electrical.distributionBoards[main]!.upstreamCircuitId = terminal;
      }),
    ).toThrow(/Kreis/);
  });
  it("validiert fehlende Stromkreise und mehrdeutige Versorgung", () => {
    const { project, sub, source, feeder } = distributionFixture();
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.distributionBoards[sub]!.upstreamCircuitId = crypto.randomUUID();
      }),
    ).toThrow(/fehlt/);
    expect(() =>
      transact(project, (draft) => {
        draft.electrical.distributionBoards[sub]!.upstreamCircuitId = feeder;
        draft.electrical.distributionBoards[sub]!.supplyId = source;
      }),
    ).toThrow(/genau einer Versorgung/);
  });
  it("unterstützt mehrstufige Verteilungen und erkennt widersprüchliche Phasen", () => {
    const { project, sub, main, feeder, terminal, outlet, upper } = distributionFixture();
    project.electrical.distributionBoards[sub]!.upstreamCircuitId = feeder;
    const third = addElectrical(project, upper.id, { x: 6000, y: 0 }, "distributionBoards");
    project.electrical.distributionBoards[third]!.upstreamCircuitId = terminal;
    expect(distributionPath(project, third).boards.map((item) => item.id)).toEqual([main, sub, third]);
    project.electrical.circuits[feeder]!.phase = "L2";
    expect(objectSupply(project, "outlets", outlet).warnings.join(" ")).toContain("Phasenzuordnung");
    project.electrical.circuits[feeder]!.protectionDeviceId = null;
    expect(objectSupply(project, "outlets", outlet).warnings.join(" ")).toContain("Verteilerzuleitung");
  });
  it("kennzeichnet gemeinsam genutzte Zuleitungsabsicherung", () => {
    const { project, sub, feeder, terminal, outlet } = distributionFixture();
    project.electrical.distributionBoards[sub]!.upstreamCircuitId = feeder;
    const second = {
      ...project.electrical.circuits[terminal]!,
      id: crypto.randomUUID(),
      protectionDeviceId: null,
    };
    project.electrical.circuits[second.id] = second;
    expect(objectSupply(project, "outlets", outlet).warnings.join(" ")).toContain(
      "F1 schützt mehrere Stromkreise",
    );
  });
  it("löst beim Löschen der Hauptverteilung nur den Eingang der Unterverteilung und erlaubt Undo", () => {
    const { project, sub, main, feeder, terminal, outlet } = distributionFixture();
    project.electrical.distributionBoards[sub]!.upstreamCircuitId = feeder;
    useProjectStore.getState().replace(project);
    expect(
      useProjectStore
        .getState()
        .commit("Hauptverteilung löschen", (draft) =>
          deleteSelection(draft, [{ kind: "distributionBoards", id: main }]),
        ),
    ).toBe(true);
    const next = useProjectStore.getState().project;
    expect(next.electrical.distributionBoards[sub]!.upstreamCircuitId).toBeNull();
    expect(next.electrical.circuits[terminal]).toBeDefined();
    expect(next.electrical.outlets[outlet]).toBeDefined();
    expect(objectSupply(next, "outlets", outlet).supply).toBeUndefined();
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().project.electrical).toEqual(project.electrical);
  });
  it("verhindert indirektes Lösen einer gesperrten Unterverteilung", () => {
    const { project, sub, feeder } = distributionFixture();
    project.electrical.distributionBoards[sub]!.upstreamCircuitId = feeder;
    const old = project.layers[project.electrical.distributionBoards[sub]!.layerId]!;
    const layer = { ...old, id: crypto.randomUUID(), locked: true };
    project.layers[layer.id] = layer;
    project.layerOrder.push(layer.id);
    project.electrical.distributionBoards[sub]!.layerId = layer.id;
    expect(() => transact(project, (draft) => deleteCircuit(draft, feeder))).toThrow(/gesperrt/);
  });
});
