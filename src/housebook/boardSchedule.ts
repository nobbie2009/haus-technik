import type { Project } from "../models/project";
import type { ProtectionDevice, ElectricalPlacement } from "../electrical/models";
import { circuitMembers } from "../electrical/selectors";
import { protectionChain } from "../electrical/supply";
import { distributionPath } from "../electrical/distributionTopology";
export type ScheduleRow = {
  id: string;
  protection: string;
  circuit: string;
  areas: string;
  fi: string;
  phase: string;
  unassigned: boolean;
};
const compare = (a: string, b: string) => a.localeCompare(b, "de", { numeric: true });
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort(compare);
const types = { MCB: "LS", RCD: "FI", RCBO: "FI/LS", fuse: "Sicherung", other: "Schutzgerät" };
export function protectionText(d: ProtectionDevice) {
  return `${d.label || "Kennzeichnung fehlt"}\n${types[d.type]} ${d.characteristic}${d.ratedCurrent === null ? "?" : d.ratedCurrent} A`;
}
export function boardSchedule(p: Project, boardId: string) {
  const board = p.electrical.distributionBoards[boardId];
  if (!board) throw new Error("Sicherungskasten fehlt.");
  const circuits = Object.values(p.electrical.circuits)
    .filter((c) => c.distributionBoardId === boardId)
    .sort((a, b) => compare(a.label || a.name, b.label || b.name));
  const used = new Set<string>(),
    feeders = distributionPath(p, boardId).feeders;
  const fiText = (devices: ProtectionDevice[]) => {
    const ids = new Set<string>();
    return (
      devices
        .filter((d) => ["RCD", "RCBO"].includes(d.type) && !ids.has(d.id) && (ids.add(d.id), true))
        .map(
          (d) =>
            `${d.distributionBoardId !== boardId ? `${p.electrical.distributionBoards[d.distributionBoardId]?.label || "Vorgelagerter Verteiler"}: ` : ""}${d.label || "FI ohne Kennzeichnung"} · ${d.residualCurrent === null ? "Auslösestrom offen" : `${d.residualCurrent} mA`}`,
        )
        .join("\n") || "Nicht dokumentiert"
    );
  };
  const roomName = (item: ElectricalPlacement) => {
    const room = item.roomId ? p.rooms[item.roomId] : undefined;
    return room ? `${p.floors[room.floorId]?.name ?? ""}: ${room.name}` : "";
  };
  const rows: ScheduleRow[] = circuits.map((c) => {
    const chain = protectionChain(p, c.protectionDeviceId);
    chain.forEach((d) => used.add(d.id));
    const direct = c.protectionDeviceId ? p.electrical.protectionDevices[c.protectionDeviceId] : undefined,
      m = circuitMembers(p, c.id);
    const members = [...m.outlets, ...m.devices, ...m.switches, ...m.controls, ...m.transformers];
    const rooms = unique(
      members.map(
        (i) =>
          roomName(i) ||
          ("connectionPointId" in i && i.connectionPointId
            ? roomName(p.electrical.outlets[i.connectionPointId]!)
            : ""),
      ),
    );
    const floors = unique(members.map((i) => p.floors[i.floorId]?.name ?? ""));
    const lines = [
      rooms.length
        ? `Räume: ${rooms.join("; ")}`
        : `Räume: nicht zugeordnet${floors.length ? ` (${floors.join(", ")})` : ""}`,
    ];
    if (m.devices.length)
      lines.push(`Geräte: ${m.devices.map((d) => d.name || d.label || "Verbraucher ohne Namen").join("; ")}`);
    if (m.outlets.length)
      lines.push(
        `Steckdosen: ${m.outlets.map((o) => [o.label, o.name].filter(Boolean).join(" ")).join("; ")}`,
      );
    if (m.switches.length || m.controls.length || m.transformers.length)
      lines.push(
        `Weitere: ${[...m.switches, ...m.controls, ...m.transformers].map((i) => i.label || i.name).join("; ")}`,
      );
    if (m.boards.length)
      lines.push(`Versorgt Unterverteilung: ${m.boards.map((b) => `${b.label} ${b.name}`).join("; ")}`);
    if (!members.length && !m.boards.length) lines.push("Keine Räume/Geräte erfasst");
    return {
      id: c.id,
      protection: direct ? protectionText(direct) : "Nicht zugeordnet",
      circuit: [c.label || "Kennzeichnung fehlt", c.name].filter(Boolean).join("\n"),
      areas: lines.join("\n"),
      fi: fiText([...feeders.flatMap((f) => protectionChain(p, f.protectionDeviceId)), ...chain]),
      phase: c.phase === "unknown" ? "Offen" : c.phase,
      unassigned: false,
    };
  });
  for (const d of Object.values(p.electrical.protectionDevices)
    .filter((d) => d.distributionBoardId === boardId && !used.has(d.id))
    .sort((a, b) => compare(a.label, b.label)))
    rows.push({
      id: d.id,
      protection: protectionText(d),
      circuit: "Kein Stromkreis zugeordnet",
      areas: "Zuordnung offen – nicht automatisch Reserve",
      fi: fiText(protectionChain(p, d.id)),
      phase: "Offen",
      unassigned: true,
    });
  const room = board.roomId ? p.rooms[board.roomId] : undefined;
  return { board, location: [p.floors[board.floorId]?.name, room?.name].filter(Boolean).join(" · "), rows };
}
