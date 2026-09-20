import { migrateProject } from "./migrations";
import type { Project } from "../models/project";
import { parseProject } from "../core/validation";
import { recordExport } from "./backupLog";

/** Alte Dateiversionen werden an dieser Grenze validiert und migriert. */
export function importProjectText(text: string): Project {
  if (text.length > 20_000_000)
    throw new Error("Die Datei ist für diesen Editor zu groß (maximal 20 MB Text).");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Die Datei enthält kein gültiges JSON.");
  }
  return migrateProject(raw);
}
export function exportProjectText(project: Project): string {
  return JSON.stringify(parseProject(project), null, 2);
}

export function downloadProject(project: Project): void {
  const blob = new Blob([exportProjectText(project)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${project.name.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 80) || "Grundriss"}.homeplan.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  recordExport(project);
}
