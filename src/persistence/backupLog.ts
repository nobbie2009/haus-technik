import { create } from "zustand";
import { z } from "zod";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Project } from "../models/project";
const recordSchema = z.strictObject({
  hash: z.string().length(64),
  at: z.iso.datetime().nullable(),
  projectUpdatedAt: z.iso.datetime(),
  version: z.number().int(),
  verifiedAt: z.iso.datetime().nullable(),
});
const schema = z.record(z.string(), recordSchema),
  key = "home-technik-backup-log-v1";
function read() {
  try {
    const v = schema.safeParse(JSON.parse(localStorage.getItem(key) ?? "{}"));
    return v.success ? v.data : {};
  } catch {
    return {};
  }
}
export const useBackupLog = create<{ records: z.infer<typeof schema> }>(() => ({ records: read() }));
export function projectFingerprint(p: Project): string {
  const sorted = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sorted)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([k, value]) => [k, sorted(value)]),
          )
        : v;
  return bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(sorted(p)))));
}
export function recordExport(p: Project, verified = false) {
  const hash = projectFingerprint(p),
    previous = useBackupLog.getState().records[p.id],
    now = new Date().toISOString();
  const records = {
    ...useBackupLog.getState().records,
    [p.id]: {
      hash,
      at: verified ? (previous?.hash === hash ? previous.at : null) : now,
      projectUpdatedAt: p.updatedAt,
      version: p.version,
      verifiedAt: verified ? now : previous?.hash === hash ? previous.verifiedAt : null,
    },
  };
  localStorage.setItem(key, JSON.stringify(records));
  useBackupLog.setState({ records });
}
export function backupStatus(p: Project, now = Date.now()) {
  const r = useBackupLog.getState().records[p.id];
  if (!r) return { text: "Noch kein Export auf diesem Gerät dokumentiert", needsBackup: true };
  const changed = r.hash !== projectFingerprint(p),
    old = now - Date.parse(r.verifiedAt ?? r.at ?? p.updatedAt) > 7 * 86400000;
  return {
    text: changed
      ? "Projekt seit dem letzten Sicherungsnachweis verändert"
      : old
        ? "Letzter Sicherungsnachweis älter als sieben Tage – Datei erneut prüfen"
        : r.verifiedAt
          ? "Dieser Projektstand wurde als Datei geprüft"
          : "Export gestartet – Datei noch nicht geprüft",
    needsBackup: changed || old || !r.verifiedAt,
  };
}
