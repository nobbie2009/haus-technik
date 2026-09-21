import { syncPlanMeters } from "../housebook/planMeters";
import { create } from "zustand";
import type { Project } from "../models/project";
import type { ProjectMutation } from "../editor/types";
import { createProject } from "../core/projectFactory";
import { parseProject, ProjectValidationError } from "../core/validation";
import { transact } from "../editor/history/transaction";

interface HistoryEntry {
  label: string;
  project: Project;
  bytes: number;
}
interface ProjectState {
  project: Project;
  past: HistoryEntry[];
  future: HistoryEntry[];
  error: string | null;
  saveStatus: "dirty" | "saving" | "saved" | "error";
  saveError: string | null;
  commit: (label: string, mutation: ProjectMutation) => boolean;
  undo: () => void;
  redo: () => void;
  replace: (project: Project, saved?: boolean) => void;
}

const entry = (label: string, project: Project): HistoryEntry => ({
  label,
  project,
  bytes: JSON.stringify(project).length * 2,
});
function bounded(history: HistoryEntry[]): HistoryEntry[] {
  let bytes = history.reduce((sum, item) => sum + item.bytes, 0);
  while (history.length > 1 && (history.length > 50 || bytes > 20_000_000)) bytes -= history.shift()!.bytes;
  return history;
}
export function errorMessage(error: unknown): string {
  if (error instanceof ProjectValidationError)
    return error.issues
      .slice(0, 3)
      .map((issue) => issue.message)
      .join(" ");
  return error instanceof Error ? error.message : "Die Aktion konnte nicht ausgeführt werden.";
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  project: createProject(),
  past: [],
  future: [],
  error: null,
  saveStatus: "dirty",
  saveError: null,
  commit(label, mutation) {
    try {
      const state = get();
      const next = transact(state.project, mutation);
      if (next !== state.project)
        set({
          project: next,
          past: bounded([...state.past, entry(label, state.project)]),
          future: [],
          saveStatus: "dirty",
          error: null,
        });
      return true;
    } catch (error) {
      set({ error: errorMessage(error) });
      return false;
    }
  },
  undo() {
    const state = get();
    const previous = state.past.at(-1);
    if (!previous) return;
    set({
      project: {
        ...previous.project,
        version: state.project.version + 1,
        updatedAt: new Date(Math.max(Date.now(), Date.parse(state.project.updatedAt))).toISOString(),
      },
      past: state.past.slice(0, -1),
      future: bounded([...state.future, entry(previous.label, state.project)]),
      error: null,
      saveStatus: "dirty",
    });
  },
  redo() {
    const state = get();
    const next = state.future.at(-1);
    if (!next) return;
    set({
      project: {
        ...next.project,
        version: state.project.version + 1,
        updatedAt: new Date(Math.max(Date.now(), Date.parse(state.project.updatedAt))).toISOString(),
      },
      future: state.future.slice(0, -1),
      past: bounded([...state.past, entry(next.label, state.project)]),
      error: null,
      saveStatus: "dirty",
    });
  },
  replace(project, saved = false) {
    const parsed = parseProject(project);
    const migrated = syncPlanMeters(parsed);
    set({
      project: parsed,
      past: [],
      future: [],
      error: null,
      saveError: null,
      saveStatus: saved && !migrated ? "saved" : "dirty",
    });
  },
}));
