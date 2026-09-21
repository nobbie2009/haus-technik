import type { Project } from "../models/project";
import { utilities, media } from "../utilities/model";
import { homeBook, setHomeBook, meterKinds, type Meter } from "./home";
import { asset } from "./model";
import { solarPlants } from "./solar";
import { newId } from "../utils/uuid";

export function planMeters(p: Project) {
  return [
    ...Object.values(p.electrical.meters).map((item) => ({
      target: { kind: "meters" as const, id: item.id },
      item,
      kind: "electricity" as Meter["kind"],
      label: "Stromzähler",
      unit: "kWh" as Meter["unit"],
    })),
    ...Object.values(utilities(p).nodes)
      .filter((n) => n.kind === "meter")
      .map((item) => {
        const medium = item.media[0]!;
        const kind: Meter["kind"] =
          medium === "gas" ? "gas" : medium === "cold" || medium === "hot" ? "water" : "heat";
        return {
          target: { kind: "utilityNodes" as const, id: item.id },
          item,
          kind,
          label: `${meterKinds[kind]}zähler · ${media[medium].label}`,
          unit: (kind === "heat" ? "kWh" : "m³") as Meter["unit"],
        };
      }),
  ];
}
type PlanMeter = ReturnType<typeof planMeters>[number];
export function planMeterSerial(plan: PlanMeter): string {
  return "serialNumber" in plan.item
    ? plan.item.serialNumber || asset(plan.item).serial
    : asset(plan.item).serial;
}
function writePlanSerial(plan: PlanMeter, serial: string): boolean {
  let changed = false;
  if ("serialNumber" in plan.item && plan.item.serialNumber !== serial) {
    plan.item.serialNumber = serial;
    changed = true;
  }
  if (asset(plan.item).serial !== serial) {
    plan.item.metadata.asset = { ...asset(plan.item), serial };
    changed = true;
  }
  return changed;
}
export function sameMeterTarget(a: Meter["target"], b: Meter["target"]) {
  return Boolean(a && b && a.kind === b.kind && a.id === b.id);
}
export function compatibleMeterKind(planKind: Meter["kind"], kind: Meter["kind"]) {
  return planKind === kind || (planKind === "electricity" && kind === "solar");
}
// Keep historical readings when a plan meter disappears; only its live link becomes unavailable.
export function syncPlanMeters(p: Project, before?: Project): boolean {
  const plans = planMeters(p);
  if (!plans.length) return false;
  const book = homeBook(p),
    original = JSON.stringify(book);
  const previous = before ? planMeters(before) : [];
  const previousBook = before ? homeBook(before) : null;
  let planChanged = false;
  for (const plan of plans) {
    let linked = book.meters.find((m) => sameMeterTarget(m.target, plan.target));
    if (linked && !compatibleMeterKind(plan.kind, linked.kind)) {
      if (linked.readings.length) {
        linked.target = null;
        linked = undefined;
      } else {
        linked.kind = plan.kind;
        linked.unit = plan.unit;
      }
    }
    if (linked) {
      const old = previous.find((m) => sameMeterTarget(m.target, plan.target));
      if (old) {
        if (linked.name === old.item.name) linked.name = plan.item.name;

        if (linked.location === before?.floors[old.item.floorId]?.name)
          linked.location = p.floors[plan.item.floorId]?.name ?? "";
      }
      const oldRecord = previousBook?.meters.find((m) => m.id === linked.id);
      let serial: string | undefined;
      if (oldRecord && oldRecord.serial !== linked.serial) serial = linked.serial;
      else if (
        old &&
        "serialNumber" in plan.item &&
        "serialNumber" in old.item &&
        plan.item.serialNumber !== old.item.serialNumber
      )
        serial = plan.item.serialNumber;
      else if (old && asset(plan.item).serial !== asset(old.item).serial) serial = asset(plan.item).serial;
      else if (!planMeterSerial(plan) && linked.serial) serial = linked.serial;
      else if (!linked.serial && planMeterSerial(plan)) serial = planMeterSerial(plan);
      else if (linked.serial === planMeterSerial(plan)) serial = linked.serial;
      if (serial !== undefined) {
        linked.serial = serial;
        planChanged = writePlanSerial(plan, serial) || planChanged;
      }
      continue;
    }
    const serial = planMeterSerial(plan);
    planChanged = writePlanSerial(plan, serial) || planChanged;
    book.meters.push({
      id: newId(),
      name: plan.item.name,
      kind: plan.kind,
      unit: plan.unit,
      serial,
      location: p.floors[plan.item.floorId]?.name ?? "",
      target: plan.target,
      price: null,
      readings: [],
    });
  }
  if (JSON.stringify(book) === original) return planChanged;
  setHomeBook(p, book);
  return true;
}

/** Save an edited meter without discarding either meter's readings during reassignment. */
export function saveMeter(p: Project, draft: Meter) {
  const book = homeBook(p),
    old = book.meters.find((m) => m.id === draft.id);
  if (old?.readings.length && (old.unit !== draft.unit || old.kind !== draft.kind))
    throw new Error("Zählerart und Einheit bei vorhandenen Ablesungen nicht ändern.");
  const plan = planMeters(p).find((t) => sameMeterTarget(t.target, draft.target));
  if (
    draft.target &&
    (!plan || !compatibleMeterKind(plan.kind, draft.kind)) &&
    !(old && sameMeterTarget(old.target, draft.target) && old.kind === draft.kind && !plan)
  )
    throw new Error("Bitte einen passenden Planzähler wählen oder die Verknüpfung entfernen.");
  if (plan) {
    const others = book.meters.filter((m) => m.id !== draft.id && sameMeterTarget(m.target, draft.target));
    for (const other of others) {
      const untouched =
        !other.readings.length &&
        other.price === null &&
        other.kind === plan.kind &&
        other.unit === plan.unit &&
        other.name === plan.item.name &&
        other.serial === planMeterSerial(plan) &&
        other.location === (p.floors[plan.item.floorId]?.name ?? "") &&
        !solarPlants(p).some((plant) => plant.meterId === other.id);
      if (untouched) book.meters = book.meters.filter((m) => m.id !== other.id);
      else other.target = null;
    }
  }
  const value = { ...draft, readings: old?.readings ?? draft.readings };
  if (plan) {
    if (!value.serial && !sameMeterTarget(old?.target ?? null, draft.target))
      value.serial = planMeterSerial(plan);
    writePlanSerial(plan, value.serial);
  }
  if (old) Object.assign(old, value);
  else book.meters.push(value);
  setHomeBook(p, book);
}
