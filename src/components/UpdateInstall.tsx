import { useEffect, useState } from "react";
const endpoint = `${import.meta.env.BASE_URL}api/home-technik-update`;
type State = { supported: boolean; state: string; message: string };
export function UpdateInstall({ onInstalled }: { onInstalled: () => void }) {
  const [service, setService] = useState<State | null>(null),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false);
  useEffect(() => {
    let active = true,
      wasRunning = false,
      previousState = "",
      pending = false;
    const poll = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw Error();
        const data = await response.json();
        if (data.supported !== true || typeof data.state !== "string" || typeof data.message !== "string")
          throw Error();
        if (active) {
          setService(data);
          setError((error) => (error.startsWith("Update-Dienst kurzzeitig") ? "" : error));
          if (previousState !== "success" && data.state === "success") onInstalled();
          previousState = data.state;
          wasRunning = data.state === "running";
        }
      } catch {
        if (active && wasRunning)
          setError("Update-Dienst kurzzeitig nicht erreichbar. Die Prüfung wird fortgesetzt.");
      } finally {
        pending = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  if (!service)
    return (
      <p>
        Direkte Installation ist derzeit nicht erreichbar oder noch nicht eingerichtet. Im LXC zuerst{" "}
        <code>Update</code> und anschließend <code>Update --setup-web</code> ausführen.
      </p>
    );
  return (
    <section aria-label="Update installieren">
      <h3>Update direkt installieren</h3>
      <p role="status">{service.message}</p>
      <p>
        Vorher offene Eingaben speichern und eine Projektdatei sichern. Die Seite wird nicht automatisch neu
        geladen.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSending(true);
          setError("");
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Home-Technik-Update": "1" },
              body: JSON.stringify({ password }),
              signal: AbortSignal.timeout(15000),
            });
            setPassword("");
            const data = await response.json();
            if (!response.ok) throw Error(data.message || "Update konnte nicht gestartet werden.");
            setService({
              supported: true,
              state: "running",
              message: "Update gestartet. Fortschritt wird abgefragt …",
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Update konnte nicht gestartet werden.");
          } finally {
            setPassword("");
            setSending(false);
          }
        }}
      >
        <label>
          Update-Passwort
          <input
            aria-label="Update-Passwort"
            type="password"
            autoComplete="current-password"
            required
            minLength={12}
            maxLength={1024}
            value={password}
            disabled={sending || service.state === "running"}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button disabled={sending || service.state === "running"}>
          {sending || service.state === "running" ? "Update läuft …" : "Update installieren"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
