import { useEffect, useRef, useState } from "react";
import { Modal } from "./dialogs/Modal";
import { latestVersion, newer, releasePage, versionParts } from "../updates/check";
import { UpdateInstall } from "./UpdateInstall";

export function UpdateStatus() {
  const [open, setOpen] = useState(false),
    [latest, setLatest] = useState<string | null>(null),
    [server, setServer] = useState<string | null>(null),
    [error, setError] = useState(""),
    [checked, setChecked] = useState(""),
    [busy, setBusy] = useState(false);
  const running = useRef(false);
  const check = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    const results = await Promise.allSettled([
      latestVersion(),
      fetch(`${import.meta.env.BASE_URL}version.json`, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }).then(async (r) => {
        if (!r.ok) throw Error("Serverversion nicht erreichbar");
        const data = await r.json();
        if (!versionParts(data.version)) throw Error("Serverversion ungültig");
        return data.version as string;
      }),
    ]);
    const remote = results[0],
      local = results[1];
    if (remote.status === "fulfilled") {
      setLatest(remote.value);
      setChecked(new Date().toLocaleString("de-DE"));
    } else setError("Updateprüfung derzeit nicht möglich. Deine Hausdaten bleiben nutzbar.");
    if (local.status === "fulfilled") setServer(local.value);
    running.current = false;
    setBusy(false);
  };
  useEffect(() => {
    void check();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 3600000);
    return () => clearInterval(timer);
  }, []);
  const available = newer(latest, __APP_VERSION__),
    reload = newer(server, __APP_VERSION__);
  return (
    <>
      <button className="app-update-button" aria-label="Version und Updates" onClick={() => setOpen(true)}>
        v{__APP_VERSION__}
        {reload ? " · Neu laden" : available ? " · Update verfügbar" : ""}
      </button>
      {open && (
        <Modal title="Version und Updates" onClose={() => setOpen(false)}>
          <p>
            Geöffnet: <strong>Version {__APP_VERSION__}</strong>
            {server ? ` · Server: ${server}` : ""}
          </p>
          <p role="status">
            {busy
              ? "Prüfe auf Updates …"
              : error ||
                (latest
                  ? `Neueste veröffentlichte Version: ${latest}`
                  : "Noch kein veröffentlichtes Release gefunden.")}
          </p>
          {checked && <p>Letzte erfolgreiche Prüfung: {checked}</p>}
          {reload ? (
            <p>
              Die neue Version liegt bereits auf dem Server. Speichere offene Eingaben und lade die Seite
              anschließend neu.
            </p>
          ) : available ? (
            <p>
              Eine neuere Version ist verfügbar. Installiere sie hier oder führe im LXC-Terminal{" "}
              <code>Update</code> aus.
            </p>
          ) : (
            <p>Updates werden nicht automatisch installiert.</p>
          )}
          <p>
            Die App prüft beim Öffnen und stündlich bei sichtbarem Fenster auf GitHub-Releases. Dabei werden
            keine Hausdaten übertragen. Bei einem Wechsel der Serveradresse zuerst eine Projektdatei sichern.
          </p>
          <div className="book-actions">
            <button disabled={busy} onClick={() => void check()}>
              Jetzt nach Updates suchen
            </button>
            <a href={releasePage} target="_blank" rel="noreferrer">
              Releases auf GitHub
            </a>
          </div>
          <UpdateInstall onInstalled={() => void check()} />
          {reload && (
            <button
              onClick={() => {
                if (window.confirm("Offene Eingaben gespeichert? Neue App-Version jetzt laden?"))
                  window.location.reload();
              }}
            >
              Neue Version laden
            </button>
          )}
        </Modal>
      )}
    </>
  );
}
