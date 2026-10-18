import type { Project } from "../../models/project";
import type { UUID, Vec2 } from "../../models/common";
import type { Selection } from "../types";
import { duplicateSelection } from "./edit";

export interface ClipboardContent {
  snapshot: Project;
  selection: Selection[];
  floorId: UUID;
}

type Json = unknown;
const isRecord = (value: Json): value is Record<string, Json> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const hasId = (value: Json): value is { id: string } => isRecord(value) && typeof value.id === "string";

/** Hält die Auswahl samt Projektstand fest, damit sie nach Ausschneiden oder Änderungen eingefügt werden kann. */
export function copyContent(project: Project, selection: Selection[], floorId: UUID): ClipboardContent {
  if (!selection.length) throw new Error("Zum Kopieren zuerst ein Objekt auswählen.");
  return { snapshot: structuredClone(project), selection: structuredClone(selection), floorId };
}

/** Überträgt nur neu entstandene Einträge (Tabellen nach ID, Listen mit ID-Objekten) in das Ziel. */
function mergeAdded(target: Record<string, Json>, before: Json, after: Json): void {
  if (!isRecord(before) || !isRecord(after)) return;
  for (const [key, value] of Object.entries(after)) {
    const previous = before[key];
    if (!(key in before)) {
      if (!(key in target)) target[key] = structuredClone(value);
      continue;
    }
    if (Array.isArray(value) && Array.isArray(previous)) {
      const known = new Set(previous.filter(hasId).map((item) => item.id));
      const added = value.filter((item) => hasId(item) && !known.has(item.id));
      if (!added.length) continue;
      if (!Array.isArray(target[key])) target[key] = [];
      (target[key] as Json[]).push(...structuredClone(added));
      continue;
    }
    if (isRecord(value) && isRecord(previous)) {
      if (!isRecord(target[key])) {
        // Inzwischen gelöschte Einträge nicht als leere Hülle wieder anlegen.
        if (key in target || hasId(previous)) continue;
        target[key] = {};
      }
      mergeAdded(target[key] as Record<string, Json>, previous, value);
    }
  }
}

function collectAdded(before: Json, after: Json, found: Json[]): void {
  if (!isRecord(before) || !isRecord(after)) return;
  for (const [key, value] of Object.entries(after)) {
    const previous = before[key];
    if (!(key in before)) found.push(value);
    else if (Array.isArray(value) && Array.isArray(previous)) {
      const known = new Set(previous.filter(hasId).map((item) => item.id));
      found.push(...value.filter((item) => hasId(item) && !known.has(item.id)));
    } else collectAdded(previous, value, found);
  }
}

function positions(value: Json, found: Vec2[]): void {
  if (Array.isArray(value)) value.forEach((item) => positions(item, found));
  else if (isRecord(value)) {
    if (typeof value.x === "number" && typeof value.y === "number" && Object.keys(value).length === 2)
      found.push({ x: value.x, y: value.y });
    else Object.values(value).forEach((item) => positions(item, found));
  }
}

function setFloor(value: Json, from: UUID, to: UUID): void {
  if (Array.isArray(value)) value.forEach((item) => setFloor(item, from, to));
  else if (isRecord(value))
    for (const [key, item] of Object.entries(value)) {
      if (key === "floorId" && item === from) value[key] = to;
      else setFloor(item, from, to);
    }
}

/**
 * Fügt eine Kopie der Zwischenablage ein. Ohne Ziel wird um `offset` versetzt, mit Ziel landet die Mitte
 * der Kopie dort. Auf einem anderen Geschoss erhalten die Kopien das aktuelle Geschoss.
 */
export function pasteContent(
  project: Project,
  content: ClipboardContent,
  floorId: UUID,
  placement: { target: Vec2 } | { offset: Vec2 },
): Selection[] {
  let delta: Vec2;
  if ("target" in placement) {
    const probe = structuredClone(content.snapshot);
    duplicateSelection(probe, content.selection, { x: 0, y: 0 });
    const added: Json[] = [];
    collectAdded(content.snapshot, probe, added);
    const points: Vec2[] = [];
    positions(added, points);
    if (!points.length) delta = { x: 0, y: 0 };
    else {
      const xs = points.map((p) => p.x),
        ys = points.map((p) => p.y);
      delta = {
        x: placement.target.x - (Math.min(...xs) + Math.max(...xs)) / 2,
        y: placement.target.y - (Math.min(...ys) + Math.max(...ys)) / 2,
      };
    }
  } else delta = placement.offset;
  const working = structuredClone(content.snapshot);
  const result = duplicateSelection(working, content.selection, delta);
  if (floorId !== content.floorId) {
    const added: Json[] = [];
    collectAdded(content.snapshot, working, added);
    added.forEach((item) => setFloor(item, content.floorId, floorId));
  }
  mergeAdded(project as unknown as Record<string, Json>, content.snapshot, working);
  return result;
}
