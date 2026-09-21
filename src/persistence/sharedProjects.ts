import { create } from "zustand";
import { useProjectStore } from "../stores/projectStore";
import { importProjectText } from "./projectFile";
import { projectFingerprint } from "./backupLog";
import type { Project } from "../models/project";
const endpoint = "/api/home-technik-projects",
  storageKey = "home-technik-shared-session";
type Link = { etag: string; hash: string };
type Session = { token: string; links: Record<string, Link> };
function read(): Session {
  try {
    const v = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
    if (v && typeof v.token === "string" && v.links && typeof v.links === "object") return v;
  } catch {
    /* Private mode or first visit. */
  }
  return { token: "", links: {} };
}
export const useSharedProjects = create<Session & { message: string; busy: boolean; remoteChanged: boolean }>(
  () => ({ ...read(), message: "Nicht verbunden", busy: false, remoteChanged: false }),
);
function saveSession() {
  const { token, links } = useSharedProjects.getState();
  sessionStorage.setItem(storageKey, JSON.stringify({ token, links }));
}
export function connectShared(token: string) {
  useSharedProjects.setState({
    token: token.trim(),
    links: {},
    message: "Verbindung wird geprüft …",
    remoteChanged: false,
  });
  saveSession();
}
export function disconnectShared() {
  sessionStorage.removeItem(storageKey);
  useSharedProjects.setState({ token: "", links: {}, message: "Nicht verbunden", remoteChanged: false });
}
export async function sharedRequest(path = "", init: RequestInit = {}) {
  const response = await fetch(endpoint + path, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${useSharedProjects.getState().token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    if (response.status === 412)
      throw new Error(
        "Konflikt: Ein anderes Gerät hat den Serverstand geändert. Lokaler Entwurf bleibt erhalten.",
      );
    throw new Error(
      response.status === 401
        ? "Zugriffsschlüssel ungültig."
        : `Projektdienst nicht erreichbar (${response.status}).`,
    );
  }
  return response;
}
export type SharedSummary = { id: string; name: string; etag: string; saved: string };
export async function listShared(): Promise<SharedSummary[]> {
  const result = await (await sharedRequest()).json();
  if (!Array.isArray(result.projects))
    throw new Error("Projektdienst auf diesem Server noch nicht eingerichtet.");
  return result.projects;
}
export function linkShared(project: Project, etag: string) {
  if (!etag) throw new Error("Server liefert keine Revisionskennung.");
  useSharedProjects.setState((s) => ({
    links: { ...s.links, [project.id]: { etag, hash: projectFingerprint(project) } },
    message: "Serverstand verbunden",
    remoteChanged: false,
  }));
  saveSession();
}
export async function getShared(id: string) {
  const response = await sharedRequest(`/${encodeURIComponent(id)}`);
  const project = importProjectText(await response.text());
  if (project.id !== id) throw new Error("Server liefert eine andere Projektkennung.");
  return { project, etag: response.headers.get("ETag") ?? "" };
}
export async function publishShared(project: Project, create = false) {
  const link = useSharedProjects.getState().links[project.id];
  if (!create && !link)
    throw new Error("Projekt zuerst vom Server öffnen oder als neues Serverprojekt bereitstellen.");
  const response = await sharedRequest(`/${project.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(create ? { "If-None-Match": "*" } : { "If-Match": link!.etag }),
    },
    body: JSON.stringify(project),
  });
  linkShared(project, response.headers.get("ETag") ?? "");
}
export async function syncShared() {
  const state = useSharedProjects.getState(),
    p = useProjectStore.getState().project,
    link = state.links[p.id];
  if (!state.token || !link || state.busy) return;
  useSharedProjects.setState({ busy: true });
  try {
    const rows = await listShared(),
      remote = rows.find((r) => r.id === p.id);
    if (!remote) throw new Error("Serverprojekt fehlt. Lokale Daten bleiben erhalten.");
    const changed = projectFingerprint(p) !== link.hash;
    if (remote.etag !== link.etag)
      useSharedProjects.setState({
        remoteChanged: true,
        message: changed
          ? "Konflikt: Lokal und auf einem anderen Gerät geändert. Entwurf sichern und Serverstand prüfen."
          : "Neuer Serverstand verfügbar – in der Hausakte übernehmen.",
      });
    else if (changed) {
      await publishShared(p);
      useSharedProjects.setState({ message: "Auf dem Server gespeichert" });
    } else useSharedProjects.setState({ message: "Mit Server abgeglichen", remoteChanged: false });
  } catch (e) {
    useSharedProjects.setState({
      message: e instanceof Error ? e.message : "Abgleich fehlgeschlagen. Lokal weiterarbeiten möglich.",
    });
  } finally {
    useSharedProjects.setState({ busy: false });
  }
}
let started = false;
export function startSharedSync() {
  if (started) return;
  started = true;
  setInterval(() => {
    if (document.visibilityState === "visible") void syncShared();
  }, 10000);
}
