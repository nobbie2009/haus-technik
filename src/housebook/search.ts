import type { Project } from "../models/project";
import type { Selection } from "../editor/types";
import { elementKinds, elementTables } from "../core/elementTables";
import { asset, housebook, networkLabels } from "./model";
import { homeBook, homeKinds } from "./home";
import { solarPlants } from "./solar";
import { wallPhotos } from "./wallPhotos";
import type { GuideSection } from "./setup";
import { life, eventKinds } from "./life";
export type SearchResult = {
  key: string;
  title: string;
  category: string;
  location: string;
  description: string;
  section?: GuideSection;
  id?: string;
  target?: Selection;
  wallId?: string;
  photoId?: string;
  floorId?: string;
  position?: { x: number; y: number };
};
const labels: Record<Selection["kind"], string> = {
  networkNodes: "Netzwerkgerät",
  utilityNodes: "Rohrkomponente",
  utilityPipes: "Rohrleitung",
  walls: "Wand",
  rooms: "Raum",
  doors: "Tür",
  windows: "Fenster",
  dimensions: "Bemaßung",
  furniture: "Möbel",
  junctions: "Abzweigdose",
  cables: "Kabel",
  outlets: "Steckdose",
  devices: "Verbraucher",
  distributionBoards: "Sicherungskasten",
  supplies: "Einspeisung",
  meters: "Stromzähler",
  switches: "Schalter",
  controls: "Relais",
  transformers: "Transformator",
};
const assetText = (a: ReturnType<typeof asset>) =>
  [a.manufacturer, a.model, a.serial, a.notes, a.documentUrl].filter(Boolean).join(" · ");
export function searchEntries(p: Project): SearchResult[] {
  const rows: SearchResult[] = [],
    tables = elementTables(p),
    b = homeBook(p);
  for (const kind of elementKinds.filter((kind) => kind !== "networkNodes"))
    for (const i of Object.values(tables[kind]))
      rows.push({
        key: `${kind}:${i.id}`,
        title: ("name" in i ? String(i.name) : "") || labels[kind],
        category: labels[kind],
        location: p.floors[i.floorId]?.name ?? "",
        description: [
          "label" in i ? String(i.label) : "",
          "serialNumber" in i ? String(i.serialNumber) : "",
          assetText(asset(i)),
        ]
          .filter(Boolean)
          .join(" · "),
        target: { kind, id: i.id },
      });
  for (const i of b.items)
    rows.push({
      key: `home:${i.id}`,
      title: i.name,
      category: homeKinds[i.kind],
      location: i.location,
      description: [i.details, i.controls, i.battery, assetText(i.asset)].filter(Boolean).join(" · "),
      section: i.kind === "outdoorLight" ? "garden" : i.kind,
      id: i.id,
      ...(i.floorId && i.position ? { floorId: i.floorId, position: i.position } : {}),
    });
  for (const m of b.meters)
    rows.push({
      key: `meter:${m.id}`,
      title: m.name,
      category: "Zähler / Verbrauch",
      location: m.location,
      description: [m.serial, m.unit, ...m.readings.map((r) => r.note)].filter(Boolean).join(" · "),
      section: "usage",
      id: m.id,
    });
  for (const t of b.tasks)
    rows.push({
      key: `task:${t.id}`,
      title: t.title,
      category: "Wartung",
      location: t.location,
      description: [t.notes, ...t.history.map((h) => h.note)].join(" · "),
      section: "maintenance",
      id: t.id,
    });
  for (const n of housebook(p).networkNodes)
    rows.push({
      key: `network:${n.id}`,
      target: { kind: "networkNodes", id: n.id },
      title: n.name,
      category: networkLabels[n.kind],
      location: n.details?.location || p.floors[n.floorId]?.name || "",
      description: n.details ? Object.values(n.details).join(" · ") : "",
      section: "network",
      id: n.id,
      floorId: n.floorId,
      position: n.position,
    });
  for (const s of solarPlants(p))
    rows.push({
      key: `solar:${s.id}`,
      title: s.name,
      category: "Balkonkraftwerk",
      location: s.location,
      description: [
        assetText(s.asset),
        assetText(s.inverter.asset),
        s.battery ? assetText(s.battery.asset) : "",
        ...s.modules.map((m) => assetText(m.asset)),
      ].join(" · "),
      section: "solar",
      id: s.id,
    });
  for (const w of Object.values(p.walls))
    for (const photo of wallPhotos(p, w.id))
      rows.push({
        key: `photo:${photo.id}:${w.id}`,
        title: photo.name,
        category: "Wandfoto",
        location: p.floors[w.floorId]?.name ?? "",
        description: [photo.side, photo.notes, ...photo.traces.flatMap((t) => [t.name, t.notes])].join(" · "),
        wallId: w.id,
        photoId: photo.id,
      });
  for (const e of life(p).events)
    rows.push({
      key: `event:${e.id}`,
      title: e.title,
      category: `Hauschronik · ${eventKinds[e.kind]}`,
      location: e.location,
      description: [e.date, e.notes, e.receipt?.name ?? ""].join(" · "),
      section: "chronicle",
      id: e.id,
    });
  return rows;
}
const normalize = (v: string) =>
  v
    .toLocaleLowerCase("de")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replaceAll("ß", "ss");
export function searchProject(p: Project, query: string, category = ""): SearchResult[] {
  const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return searchEntries(p)
    .filter(
      (r) =>
        (!category || r.category === category) &&
        terms.every((t) => normalize(`${r.title} ${r.location} ${r.description} ${r.category}`).includes(t)),
    )
    .sort((a, b) => a.title.localeCompare(b.title, "de"));
}
