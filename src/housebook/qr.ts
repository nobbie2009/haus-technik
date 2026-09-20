import { z } from "zod";
const uuid = z.uuid();
export function qrLink(base: string, projectId: string, key: string) {
  uuid.parse(projectId);
  if (!key || key.length > 200) throw new Error("Ungültiges QR-Ziel.");
  const url = new URL(base);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Bitte eine HTTP-/HTTPS-Adresse ohne Zugangsdaten verwenden.");
  url.search = "";
  url.hash = new URLSearchParams({ haus: projectId, akte: key }).toString();
  return url.href;
}
export function readQrLink(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, "")),
    project = params.get("haus"),
    key = params.get("akte");
  if (!uuid.safeParse(project).success || !key || key.length > 200) return null;
  return { projectId: project!, key };
}
