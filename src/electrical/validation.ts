import { cableIssues } from "./cableValidation";
import { distributionPath } from "./distributionTopology";
import { switchChain } from "./switchTopology";
import { switchControl } from "./switchingControls";
import type { Project } from "../models/project";
import type { ValidationIssue } from "../core/validation";

export function electricalIssues(project: Project): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const report = (path: string, message: string) => issues.push({ path: `electrical.${path}`, message });
  const e = project.electrical;
  const members = new Set<string>();
  for (const group of Object.values(e.controls)) {
    for (const id of group.switchIds) {
      const member = e.switches[id];
      if (members.has(id))
        report(`controls.${group.id}`, "Jeder Schalter darf nur einer Schaltgruppe angehören.");
      members.add(id);
      if (!member || !group.circuitId || member.circuitId !== group.circuitId)
        report(
          `controls.${group.id}`,
          "Alle Gruppenschalter müssen existieren und demselben Stromkreis zugeordnet sein.",
        );
      if (
        member &&
        (member.supply.kind !== "circuit" ||
          Object.values(e.switches).some((s) => s.supply.kind === "switch" && s.supply.switchId === id))
      )
        report(`controls.${group.id}`, "Schalter zuerst aus der Reihenschaltung lösen.");
      if (Object.values(e.devices).some((d) => d.switchId === id))
        report(
          `controls.${group.id}`,
          "Direkte Verbraucherzuordnung zuerst lösen und anschließend die Schaltgruppe am Verbraucher wählen.",
        );
    }
  }
  for (const item of Object.values(e.switches)) {
    if (item.supply.kind === "switch") {
      const source = e.switches[item.supply.switchId];
      if (!source) report(`switches.${item.id}.supply`, "Vorgeschalteter Lichtschalter fehlt.");
      else if (!item.circuitId || item.circuitId !== source.circuitId)
        report(
          `switches.${item.id}.supply`,
          "Schalter einer Reihenschaltung müssen demselben Stromkreis angehören.",
        );
    }
    if (switchChain(project, item.id).cycle)
      report(`switches.${item.id}.supply`, "Reihenschaltung darf keinen Kreis bilden.");
  }
  for (const meter of Object.values(e.meters))
    if (meter.supplyId && !e.supplies[meter.supplyId])
      report(`meters.${meter.id}`, "Einspeisepunkt des Zählers fehlt.");
  for (const board of Object.values(e.distributionBoards)) {
    if (board.upstreamCircuitId && !e.circuits[board.upstreamCircuitId])
      report(`distributionBoards.${board.id}`, "Einspeisender Stromkreis fehlt.");
    if (distributionPath(project, board.id).cycle)
      report(`distributionBoards.${board.id}`, "Verteilerzuordnung darf keinen Kreis bilden.");
    if (board.meterId && !e.meters[board.meterId])
      report(`distributionBoards.${board.id}`, "Stromzähler fehlt.");
    if ([board.meterId, board.supplyId, board.upstreamCircuitId].filter(Boolean).length > 1)
      report(
        `distributionBoards.${board.id}`,
        "Kasten genau einer Versorgung zuordnen: Zähler, Einspeisung oder vorgeschalteter Stromkreis.",
      );
  }
  for (const board of Object.values(e.distributionBoards))
    if (board.supplyId && !e.supplies[board.supplyId])
      report(`distributionBoards.${board.id}.supplyId`, "Einspeisepunkt fehlt.");
  for (const kind of [
    "outlets",
    "devices",
    "distributionBoards",
    "junctions",
    "supplies",
    "meters",
    "switches",
    "controls",
    "transformers",
  ] as const)
    for (const item of Object.values(e[kind])) {
      const path = `${kind}.${item.id}`;
      if (!project.floors[item.floorId]) report(path, "Geschoss des Elektroobjekts fehlt.");
      if (project.layers[item.layerId]?.kind !== "electrical")
        report(path, "Elektroobjekt benötigt eine Elektrikebene.");
      if (item.roomId && project.rooms[item.roomId]?.floorId !== item.floorId)
        report(path, "Raum fehlt oder liegt auf einem anderen Geschoss.");
      if ("circuitId" in item && item.circuitId && !e.circuits[String(item.circuitId)])
        report(path, "Stromkreis fehlt.");
    }
  for (const item of [...Object.values(e.outlets), ...Object.values(e.switches)])
    if (item.wallId && project.walls[item.wallId]?.floorId !== item.floorId)
      report(
        `${e.switches[item.id] ? "switches" : "outlets"}.${item.id}.wallId`,
        "Wand fehlt oder liegt auf einem anderen Geschoss.",
      );
  for (const item of Object.values(e.devices)) {
    if (item.controlId) {
      const control = e.controls[item.controlId];
      if (
        !control ||
        !item.circuitId ||
        control.circuitId !== item.circuitId ||
        item.switchId ||
        item.connectionPointId ||
        item.phases !== 1
      )
        report(
          `devices.${item.id}.controlId`,
          "Schaltgruppe benötigt einen einphasigen Festanschluss desselben Stromkreises ohne weitere Schalterzuordnung.",
        );
    }
    if (item.transformerId) {
      const transformer = e.transformers[item.transformerId];
      if (
        !transformer ||
        !item.circuitId ||
        transformer.circuitId !== item.circuitId ||
        item.connectionPointId ||
        item.phases !== 1
      )
        report(
          `devices.${item.id}.transformerId`,
          "Trafo benötigt einen einphasigen Verbraucher am selben Primärstromkreis ohne Steckdosenzuordnung.",
        );
    }
    if (item.switchId) {
      const lightSwitch = e.switches[item.switchId];
      if (switchControl(project, item.switchId))
        report(`devices.${item.id}.switchId`, "Gruppenschalter über die Schaltgruppe zuordnen.");
      if (!lightSwitch) report(`devices.${item.id}.switchId`, "Lichtschalter fehlt.");
      else if (
        item.connectionPointId ||
        !item.circuitId ||
        item.circuitId !== lightSwitch.circuitId ||
        item.phases !== 1
      )
        report(
          `devices.${item.id}.switchId`,
          "Lichtschalter benötigt einen einphasigen Festanschluss am selben Stromkreis. Zuerst die Schalterzuordnung lösen.",
        );
    }
    if (item.connectionPointId && !e.outlets[item.connectionPointId])
      report(`devices.${item.id}`, "Angeschlossene Steckdose fehlt.");
    if (item.connectionPointId && item.circuitId)
      report(
        `devices.${item.id}`,
        "Ein Verbraucher kann nur über Steckdose oder Festanschluss zugeordnet sein.",
      );
    if (item.furnitureId && project.furniture[item.furnitureId]?.floorId !== item.floorId)
      report(`devices.${item.id}`, "Möbel fehlt oder liegt auf einem anderen Geschoss.");
  }
  for (const item of Object.values(e.circuits)) {
    if (!e.distributionBoards[item.distributionBoardId]) report(`circuits.${item.id}`, "Verteiler fehlt.");
    if (
      item.protectionDeviceId &&
      e.protectionDevices[item.protectionDeviceId]?.distributionBoardId !== item.distributionBoardId
    )
      report(`circuits.${item.id}`, "Schutzgerät fehlt oder gehört zu einem anderen Verteiler.");
  }
  for (const item of Object.values(e.protectionDevices)) {
    if (!e.distributionBoards[item.distributionBoardId])
      report(`protectionDevices.${item.id}`, "Verteiler des Schutzgeräts fehlt.");
    if (
      item.upstreamProtectionDeviceId &&
      e.protectionDevices[item.upstreamProtectionDeviceId]?.distributionBoardId !== item.distributionBoardId
    )
      report(
        `protectionDevices.${item.id}`,
        "Vorgeschaltetes Schutzgerät fehlt oder gehört zu einem anderen Sicherungskasten.",
      );
    const visited = new Set<string>();
    let next: string | null = item.id;
    while (next && e.protectionDevices[next]) {
      if (visited.has(next)) {
        report(`protectionDevices.${item.id}`, "Schutzgeräte dürfen keine zyklische Kette bilden.");
        break;
      }
      visited.add(next);
      next = e.protectionDevices[next]!.upstreamProtectionDeviceId;
    }
  }
  return [...issues, ...cableIssues(project)];
}
