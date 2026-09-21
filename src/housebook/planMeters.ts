import type { Project } from "../models/project";
import { utilities, media } from "../utilities/model";
import { homeBook, setHomeBook, meterKinds, type Meter } from "./home";
import { asset } from "./model";
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
        if (linked.serial === asset(old.item).serial) linked.serial = asset(plan.item).serial;
        if (linked.location === before?.floors[old.item.floorId]?.name)
          linked.location = p.floors[plan.item.floorId]?.name ?? "";
      }
      continue;
    }
    book.meters.push({
      id: newId(),
      name: plan.item.name,
      kind: plan.kind,
      unit: plan.unit,
      serial: asset(plan.item).serial,
      location: p.floors[plan.item.floorId]?.name ?? "",
      target: plan.target,
      price: null,
      readings: [],
    });
  }
  if (JSON.stringify(book) === original) return false;
  setHomeBook(p, book);
  return true;
}
