import type { ProtectionDevice } from "./models";
import type { Project } from "../models/project";
import { addProtectionDevice } from "./boardActions";

type Preset = Pick<
  ProtectionDevice,
  "type" | "ratedCurrent" | "characteristic" | "poles" | "residualCurrent"
> & { id: string; name: string };
export const protectionPresets: Preset[] = [
  ...[6, 10, 13, 16, 20, 25, 32].map((ratedCurrent): Preset => ({
    id: `B${ratedCurrent}`,
    name: `LS B${ratedCurrent} · 1-polig`,
    type: "MCB",
    ratedCurrent,
    characteristic: "B",
    poles: 1,
    residualCurrent: null,
  })),
  ...[16, 20, 32].map((ratedCurrent): Preset => ({
    id: `C${ratedCurrent}-3`,
    name: `LS C${ratedCurrent} · 3-polig`,
    type: "MCB",
    ratedCurrent,
    characteristic: "C",
    poles: 3,
    residualCurrent: null,
  })),
  {
    id: "FI40",
    name: "FI 40 A / 30 mA · 4-polig",
    type: "RCD",
    ratedCurrent: 40,
    characteristic: "Typ A",
    poles: 4,
    residualCurrent: 30,
  },
  {
    id: "RCBO16",
    name: "FI/LS B16 / 30 mA · 2-polig",
    type: "RCBO",
    ratedCurrent: 16,
    characteristic: "B",
    poles: 2,
    residualCurrent: 30,
  },
  ...[
    { id: "D01", ratedCurrent: 16 },
    { id: "D02", ratedCurrent: 35 },
    { id: "DII", ratedCurrent: 25 },
    { id: "NH00", ratedCurrent: 63 },
  ].map(({ id, ratedCurrent }): Preset => ({
    id,
    name: `${id} ${ratedCurrent} A · Schmelzsicherung`,
    type: "fuse",
    ratedCurrent,
    characteristic: `${id} gG`,
    poles: 1,
    residualCurrent: null,
  })),
];

export function addProtectionPreset(project: Project, boardId: string, presetId: string): string {
  const preset = protectionPresets.find((item) => item.id === presetId);
  if (!preset) throw new Error("Sicherungsvorlage fehlt.");
  const id = addProtectionDevice(project, boardId, preset.type);
  const { name: _name, id: _id, ...values } = preset;
  Object.assign(project.electrical.protectionDevices[id]!, values);
  return id;
}
