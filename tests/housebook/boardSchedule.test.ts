import { describe, it, expect } from "vitest";
import { simulationFixture } from "../simulation/fixture";
import { boardSchedule } from "../../src/housebook/boardSchedule";
import { addProtectionDevice } from "../../src/electrical/boardActions";
import { addElectrical } from "../../src/electrical/actions";
import { createRoom } from "../../src/editor/actions/create";
describe("Sicherungskasten-Aushang", () => {
  it("zeigt direkt zugeordnete Geräte und Räume ohne fremde Stromkreise", () => {
    const f = simulationFixture(),
      p = f.project;
    const room = createRoom(
      p,
      f.upper.id,
      [
        { x: 0, y: 0 },
        { x: 5000, y: 0 },
        { x: 5000, y: 5000 },
        { x: 0, y: 5000 },
      ],
      "Büro",
    );
    p.electrical.outlets[f.outlet]!.roomId = room;
    const before = JSON.stringify(p),
      rows = boardSchedule(p, f.sub).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.areas).toContain("Obergeschoss: Büro");
    expect(rows[0]!.areas).toContain("PC");
    expect(rows[0]!.circuit).toContain("SK-02");
    expect(boardSchedule(p, f.main).rows[0]!.areas).toContain("Versorgt Unterverteilung");
    expect(boardSchedule(p, f.main).rows[0]!.areas).not.toContain("Kaffeemaschine");
    expect(JSON.stringify(p)).toBe(before);
  });
  it("berücksichtigt lokale und vorgeschaltete FI-Geräte mit Herkunft", () => {
    const f = simulationFixture(),
      p = f.project,
      fi = addProtectionDevice(p, f.main, "RCD"),
      rcbo = addProtectionDevice(p, f.sub, "RCBO");
    p.electrical.protectionDevices[fi]!.residualCurrent = 30;
    p.electrical.protectionDevices[f.upstream]!.upstreamProtectionDeviceId = fi;
    p.electrical.protectionDevices[f.branch]!.upstreamProtectionDeviceId = rcbo;
    const row = boardSchedule(p, f.sub).rows.find((r) => r.id === f.terminal)!;
    expect(row.fi).toContain(
      `${p.electrical.distributionBoards[f.main]!.label}: ${p.electrical.protectionDevices[fi]!.label} · 30 mA`,
    );
    expect(row.fi).toContain("Auslösestrom offen");
    expect(boardSchedule(p, f.sub).rows).toHaveLength(1);
  });
  it("kennzeichnet unbekannte Angaben und unzugeordnete Schutzgeräte", () => {
    const f = simulationFixture(),
      p = f.project;
    p.electrical.circuits[f.terminal]!.protectionDeviceId = null;
    p.electrical.circuits[f.terminal]!.phase = "unknown";
    const rows = boardSchedule(p, f.sub).rows;
    expect(rows[0]).toMatchObject({
      protection: "Nicht zugeordnet",
      fi: "Nicht dokumentiert",
      phase: "Offen",
    });
    expect(rows.find((r) => r.id === f.branch)).toMatchObject({
      unassigned: true,
      circuit: "Kein Stromkreis zugeordnet",
      areas: "Zuordnung offen – nicht automatisch Reserve",
    });
  });
  it("druckt erfasste Daten auch bei ausgeblendeter Ebene und unterstützt leere Verteiler", () => {
    const f = simulationFixture(),
      p = f.project;
    const id = addElectrical(p, p.floorOrder[0]!, { x: 0, y: 0 }, "distributionBoards");
    p.layers[p.electrical.distributionBoards[f.sub]!.layerId]!.visible = false;
    expect(boardSchedule(p, f.sub).rows[0]!.areas).toContain("Fernseher");
    expect(boardSchedule(p, id).rows).toEqual([]);
  });
});
