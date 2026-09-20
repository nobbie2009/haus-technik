import { z } from "zod";
import type { Project } from "../models/project";
import { elementKinds, elementTables } from "../core/elementTables";
import { assetSchema, asset } from "./model";
import { newId } from "../utils/uuid";
import { addElectrical } from "../electrical/actions";

const id = z.uuid(),
  n = z.number().finite(),
  text = z.string().max(2000),
  name = z.string().trim().min(1).max(150);
const date = z.union([z.literal(""), z.iso.date()]);
export const homeKinds = {
  shutoff: "Absperrstelle",
  smoke: "Rauchmelder / Sensor",
  garden: "Gartenobjekt",
  outdoorLight: "Außenbeleuchtung",
} as const;
export type HomeKind = keyof typeof homeKinds;
export const objectRef = z.strictObject({ kind: z.enum(elementKinds), id });
export const homeItemSchema = z.strictObject({
  id,
  kind: z.enum(["shutoff", "smoke", "garden", "outdoorLight"]),
  name,
  location: text,
  details: text,
  target: objectRef.nullable(),
  floorId: id.nullable(),
  position: z.strictObject({ x: n, y: n }).nullable(),
  asset: assetSchema,
  installed: date,
  lastCheck: date,
  nextCheck: date,
  replaceBy: date,
  battery: text,
  controls: text,
  powerW: n.nonnegative().nullable(),
  gardenRole: z.enum(["other", "irrigationZone", "outdoorTap"]).optional(),
});
export const readingSchema = z.strictObject({
  id,
  date: z.iso.date(),
  value: n.nonnegative().max(1e12),
  reset: z.boolean(),
  note: text,
});
export const meterKinds = {
  electricity: "Strom",
  water: "Wasser",
  gas: "Gas",
  solar: "Solarertrag",
  heat: "Wärme",
  other: "Sonstiges",
} as const;
export const meterSchema = z
  .strictObject({
    id,
    name,
    kind: z.enum(["electricity", "water", "gas", "solar", "heat", "other"]),
    unit: z.enum(["kWh", "m³", "l"]),
    serial: text,
    location: text,
    target: objectRef.nullable(),
    price: n.nonnegative().max(1e6).nullable(),
    readings: z.array(readingSchema).max(10000),
  })
  .superRefine((m, ctx) => {
    const sorted = [...m.readings].sort((a, b) => a.date.localeCompare(b.date));
    const ids = new Set<string>();
    sorted.forEach((r, i) => {
      const prev = sorted[i - 1];
      if (ids.has(r.id) || prev?.date === r.date)
        ctx.addIssue({
          code: "custom",
          message: "Pro Zähler ist nur eine Ablesung je Datum mit eindeutiger ID möglich.",
        });
      if (prev && r.value < prev.value && !r.reset)
        ctx.addIssue({
          code: "custom",
          message: "Sinkender Zählerstand: Wert korrigieren oder Zählerwechsel/Neustart markieren.",
        });
      ids.add(r.id);
    });
  });
export const taskSchema = z.strictObject({
  id,
  title: name,
  location: text,
  target: objectRef.nullable(),
  itemId: id.nullable(),
  notes: text,
  due: date,
  intervalMonths: z.number().int().min(0).max(120),
  history: z.array(z.strictObject({ id, date: z.iso.date(), note: text })).max(1000),
});
export const homeSchema = z
  .strictObject({
    version: z.literal(1),
    items: z.array(homeItemSchema).max(2000),
    meters: z.array(meterSchema).max(200),
    tasks: z.array(taskSchema).max(2000),
    internet: z.strictObject({
      provider: text,
      technology: text,
      downloadMbps: n.nonnegative().nullable(),
      uploadMbps: n.nonnegative().nullable(),
      notes: text,
    }),
  })
  .superRefine((b, ctx) => {
    const ids = [...b.items, ...b.meters, ...b.tasks].map((v) => v.id);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Doppelte ID in der privaten Hausübersicht." });
  });
export type HomeBook = z.infer<typeof homeSchema>;
export type HomeItem = z.infer<typeof homeItemSchema>;
export type Meter = z.infer<typeof meterSchema>;
export type Reading = z.infer<typeof readingSchema>;
export type MaintenanceTask = z.infer<typeof taskSchema>;
export function homeBook(p: Project): HomeBook {
  return homeSchema.parse(
    p.metadata.homeOverview ?? {
      version: 1,
      items: [],
      meters: [],
      tasks: [],
      internet: { provider: "", technology: "", downloadMbps: null, uploadMbps: null, notes: "" },
    },
  );
}
export function setHomeBook(p: Project, value: HomeBook) {
  const parsed = homeSchema.safeParse(value);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
  p.metadata.homeOverview = JSON.parse(JSON.stringify(parsed.data));
}
export function newHomeItem(kind: HomeKind): HomeItem {
  return {
    id: newId(),
    kind,
    name: "",
    location: "",
    details: "",
    target: null,
    floorId: null,
    position: null,
    asset: assetSchema.parse({}),
    installed: "",
    lastCheck: "",
    nextCheck: "",
    replaceBy: "",
    battery: "",
    controls: "",
    powerW: null,
  };
}
export function homeIssues(p: Project): { path: string; message: string }[] {
  if (p.metadata.homeOverview === undefined) return [];
  const result = homeSchema.safeParse(p.metadata.homeOverview);
  if (!result.success)
    return result.error.issues.map((i) => ({ path: `homeOverview.${i.path.join(".")}`, message: i.message }));
  return result.data.items.flatMap((item) =>
    (item.floorId && !p.floors[item.floorId]) || Boolean(item.floorId) !== Boolean(item.position)
      ? [{ path: item.id, message: "Planmarkierung benötigt ein vorhandenes Geschoss und eine Position." }]
      : [],
  );
}
export function resolveTarget(p: Project, ref: HomeItem["target"]) {
  return ref ? (elementTables(p)[ref.kind][ref.id] ?? null) : null;
}
export function placeOutdoorLight(p: Project, item: HomeItem) {
  if (item.kind !== "outdoorLight" || !item.floorId || !item.position)
    throw new Error("Außenleuchte benötigt eine Planposition.");
  if (resolveTarget(p, item.target)) throw new Error("Dieses Objekt ist bereits mit dem Plan verknüpft.");
  const id = addElectrical(p, item.floorId, item.position, "devices"),
    device = p.electrical.devices[id]!;
  device.name = item.name;
  device.type = "lighting";
  device.ratedPower = item.powerW;
  device.metadata.electricalSymbol = "lamp";
  item.target = { kind: "devices", id };
}
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function addMonths(date: string, months: number): string {
  const d = new Date(`${date}T00:00:00Z`),
    day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
export function completeTask(task: MaintenanceTask, date: string, note: string) {
  z.iso.date().parse(date);
  task.history.push({ id: newId(), date, note });
  task.due = task.intervalMonths ? addMonths(date, task.intervalMonths) : "";
}
export function consumption(meter: Meter, from = "", to = "") {
  const readings = [...meter.readings].sort((a, b) => a.date.localeCompare(b.date));
  return readings.slice(1).flatMap((end, index) => {
    const start = readings[index]!;
    if ((from && start.date < from) || (to && end.date > to)) return [];
    const days = (Date.parse(`${end.date}T00:00:00Z`) - Date.parse(`${start.date}T00:00:00Z`)) / 86400000;
    const value = end.reset ? null : end.value - start.value;
    return [
      {
        from: start.date,
        to: end.date,
        days,
        value,
        perDay: value === null ? null : value / days,
        cost: value === null || meter.price === null ? null : value * meter.price,
      },
    ];
  });
}
export function dueOverview(p: Project, today = localDate()) {
  const b = homeBook(p),
    rows: { id: string; name: string; date: string; location: string; source: string }[] = [];
  for (const t of b.tasks)
    if (t.due) rows.push({ id: t.id, name: t.title, date: t.due, location: t.location, source: "Wartung" });
  for (const item of b.items) {
    if (item.nextCheck)
      rows.push({
        id: `${item.id}:check`,
        name: `${item.name} · Prüfung`,
        date: item.nextCheck,
        location: item.location,
        source: homeKinds[item.kind],
      });
    if (item.replaceBy)
      rows.push({
        id: `${item.id}:replace`,
        name: `${item.name} · Austausch`,
        date: item.replaceBy,
        location: item.location,
        source: homeKinds[item.kind],
      });
    if (item.asset.maintenanceDate)
      rows.push({
        id: `${item.id}:asset`,
        name: item.name,
        date: item.asset.maintenanceDate,
        location: item.location,
        source: "Objektakte",
      });
  }
  for (const table of Object.values(elementTables(p)))
    for (const item of Object.values(table)) {
      const date = asset(item).maintenanceDate;
      if (date)
        rows.push({
          id: item.id,
          name: "name" in item ? String(item.name) : "Planobjekt",
          date,
          location: p.floors[item.floorId]?.name ?? "",
          source: "Objektakte",
        });
    }
  return rows
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({ ...r, overdue: r.date < today, today: r.date === today }));
}
