const key = "home-technik.home-assistant.connection.v1";
export type HomeAssistantConnection = { url: string; token: string };

export function loadHomeAssistantConnection(): HomeAssistantConnection {
  const raw = localStorage.getItem(key);
  if (!raw) return { url: "", token: "" };
  const value: unknown = JSON.parse(raw);
  if (
    !value ||
    typeof value !== "object" ||
    !("url" in value) ||
    !("token" in value) ||
    typeof value.url !== "string" ||
    typeof value.token !== "string"
  )
    throw new Error("Ungültige Verbindungseinstellungen.");
  return { url: value.url, token: value.token };
}
export function saveHomeAssistantConnection(connection: HomeAssistantConnection) {
  if (!connection.url && !connection.token) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(connection));
}
