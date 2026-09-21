import { newId } from "../utils/uuid";
import { migrateProject } from "./migrations";
import { parseProject } from "../core/validation";
import type { Project } from "../models/project";
import type { ProjectRepository } from "./projectRepository";
import {
  consumerLibrarySchema,
  consumerEntrySchema,
  type ConsumerEntry,
} from "../electrical/consumerLibrary";

export class IndexedDbRepository implements ProjectRepository {
  private database: Promise<IDBDatabase> | null = null;
  private expected = new Map<string, string>();
  constructor(private readonly name = "home-technik") {}
  private open(): Promise<IDBDatabase> {
    if (!this.database)
      this.database = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.name, 2);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("projects"))
            request.result.createObjectStore("projects", { keyPath: "id" });
          if (!request.result.objectStoreNames.contains("settings"))
            request.result.createObjectStore("settings");
          if (!request.result.objectStoreNames.contains("snapshots"))
            request.result.createObjectStore("snapshots", { keyPath: "id" });
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => {
            request.result.close();
            this.database = null;
          };
          resolve(request.result);
        };
        request.onerror = () => {
          this.database = null;
          reject(request.error);
        };
        request.onblocked = () => {
          this.database = null;
          reject(new Error("Die Projektdatenbank ist durch einen anderen Tab blockiert."));
        };
      });
    return this.database;
  }
  private async read(store: string, key?: string): Promise<unknown> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, "readonly");
      const request =
        key === undefined ? transaction.objectStore(store).getAll() : transaction.objectStore(store).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async list() {
    const projects = (await this.read("projects")) as Project[];
    return projects
      .map((project) => ({
        id: project.id,
        name: project.name,
        updatedAt: project.updatedAt,
        floors: project.floorOrder.length,
        rooms: Object.keys(project.rooms).length,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async deviceLibrary(): Promise<ConsumerEntry[]> {
    return consumerLibrarySchema.parse((await this.read("settings", "deviceLibrary")) ?? []);
  }
  async updateDeviceLibrary(entry: ConsumerEntry, remove = false): Promise<void> {
    const value = consumerEntrySchema.parse(entry),
      db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("settings", "readwrite"),
        store = tx.objectStore("settings"),
        request = store.get("deviceLibrary");
      request.onsuccess = () => {
        try {
          const rows = consumerLibrarySchema.parse(request.result ?? []).filter((r) => r.id !== value.id);
          if (!remove) rows.push({ ...value, serial: "" });
          store.put(consumerLibrarySchema.parse(rows), "deviceLibrary");
        } catch {
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("Gerätebibliothek konnte nicht gespeichert werden."));
    });
  }
  async load(id: string): Promise<Project | null> {
    const raw = await this.read("projects", id);
    if (!raw) return null;
    this.expected.set(id, JSON.stringify(raw));
    const project = migrateProject(raw);
    if ((raw as { schemaVersion: number }).schemaVersion !== project.schemaVersion)
      await this.write(project, false);
    return project;
  }
  async loadActive(): Promise<Project | null> {
    const id = await this.read("settings", "activeProject");
    return typeof id === "string" ? this.load(id) : null;
  }
  async save(project: Project): Promise<void> {
    await this.write(project, true);
  }
  async snapshots(
    projectId: string,
  ): Promise<{ id: string; savedAt: string; project: Project; name?: string }[]> {
    return (
      (await this.read("snapshots")) as { id: string; savedAt: string; project: Project; name?: string }[]
    )
      .filter((s) => s.project.id === projectId)
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .map((s) => ({ ...s, project: migrateProject(s.project) }));
  }
  async saveNamedSnapshot(project: Project, name: string): Promise<void> {
    if (!name.trim() || name.trim().length > 150)
      throw new Error("Bitte einen Namen mit 1 bis 150 Zeichen eingeben.");
    const validated = parseProject(project),
      db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("snapshots", "readwrite");
      transaction
        .objectStore("snapshots")
        .put({ id: newId(), savedAt: new Date().toISOString(), name: name.trim(), project: validated });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Versionsstand konnte nicht gespeichert werden."));
    });
  }
  private async write(project: Project, activate: boolean): Promise<void> {
    const validated = parseProject(project);
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(["projects", "settings", "snapshots"], "readwrite");
      const store = transaction.objectStore("projects");
      let conflict = false;
      const read = store.get(project.id);
      read.onsuccess = () => {
        const current = read.result as Project | undefined;
        const serialized = current ? JSON.stringify(current) : undefined;
        if (
          current &&
          serialized !== JSON.stringify(validated) &&
          serialized !== this.expected.get(project.id)
        ) {
          conflict = true;
          transaction.abort();
          return;
        }
        if (current && serialized !== JSON.stringify(validated)) {
          const snapshots = transaction.objectStore("snapshots");
          snapshots.put({ id: newId(), savedAt: new Date().toISOString(), project: current });
          const all = snapshots.getAll();
          all.onsuccess = () => {
            const entries = (all.result as { id: string; savedAt: string; project: Project; name?: string }[])
              .filter((s) => s.project.id === project.id && !s.name)
              .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
            let bytes = 0;
            entries.forEach((s, index) => {
              bytes += JSON.stringify(s).length * 2;
              if (index >= 20 || (index > 0 && bytes > 40_000_000)) snapshots.delete(s.id);
            });
          };
        }
        store.put(validated);
        if (activate) transaction.objectStore("settings").put(project.id, "activeProject");
      };
      transaction.oncomplete = () => {
        this.expected.set(project.id, JSON.stringify(validated));
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(
          conflict
            ? new Error(
                "Ein anderer Tab hat dieses Projekt geändert. Entwurf als JSON sichern und die Seite neu laden, um den aktuellen Speicherstand zu öffnen.",
              )
            : (transaction.error ?? new Error("Speichern wurde abgebrochen.")),
        );
    });
  }
}

export const projectRepository = new IndexedDbRepository();
