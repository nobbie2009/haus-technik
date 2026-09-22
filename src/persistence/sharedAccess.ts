export const sharedAccessKey = "home-technik-shared-session";
export type SharedSession = {
  token: string;
  links: Record<string, { etag: string; hash: string }>;
  remember: boolean;
};
export function readSharedAccess(): SharedSession {
  for (const remember of [true, false]) {
    try {
      const storage = remember ? localStorage : sessionStorage;
      const value = JSON.parse(storage.getItem(sharedAccessKey) ?? "null");
      if (
        value &&
        typeof value.token === "string" &&
        value.links &&
        typeof value.links === "object" &&
        !Array.isArray(value.links)
      )
        return { ...value, remember };
    } catch {
      /* Storage unavailable or invalid. */
    }
  }
  return { token: "", links: {}, remember: false };
}
export function writeSharedAccess(session: SharedSession) {
  try {
    if (session.remember) localStorage.setItem(sharedAccessKey, JSON.stringify(session));
    else localStorage.removeItem(sharedAccessKey);
    sessionStorage.setItem(sharedAccessKey, JSON.stringify(session));
    return "";
  } catch {
    return "Der Browser konnte den Zugang nicht speichern. Nach dem Schließen erneut verbinden.";
  }
}
export function clearSharedAccess() {
  let error = "";
  for (const persistent of [true, false]) {
    try {
      (persistent ? localStorage : sessionStorage).removeItem(sharedAccessKey);
    } catch {
      error =
        "Gespeicherter Zugang konnte nicht vollständig entfernt werden. Bitte die Websitedaten im Browser löschen.";
    }
  }
  return error;
}
