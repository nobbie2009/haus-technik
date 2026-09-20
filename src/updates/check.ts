export const releaseApi = "https://api.github.com/repos/nobbie2009/haus-technik/releases/latest";
export const releasePage = "https://github.com/nobbie2009/haus-technik/releases/latest";
export function versionParts(value: unknown): number[] | null {
  if (typeof value !== "string" || !/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) return null;
  const parts = value.replace(/^v/, "").split(".").map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}
export function newer(candidate: unknown, current: string): boolean {
  const a = versionParts(candidate),
    b = versionParts(current);
  if (!a || !b) return false;
  const i = a.findIndex((n, i) => n !== b[i]);
  return i >= 0 && a[i]! > b[i]!;
}
export async function latestVersion(): Promise<string | null> {
  const response = await fetch(releaseApi, {
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) return null;
  if (!response.ok)
    throw new Error("GitHub ist gerade nicht erreichbar oder das Abfragelimit wurde erreicht.");
  const release = await response.json();
  if (release.draft || release.prerelease || !versionParts(release.tag_name))
    throw new Error("Keine gültige stabile Releaseversion erhalten.");
  return release.tag_name.replace(/^v/, "");
}
