import { useEffect, useRef, useState } from "react";
export function VoiceNote({
  onAudio,
  onBusy,
}: {
  onAudio: (value: string) => void;
  onBusy: (busy: boolean) => void;
}) {
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    alive = useRef(true);
  const [recording, setRecording] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const start = async () => {
    setError("");
    setBusy(true);
    onBusy(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined")
        throw new Error(
          "Sprachaufnahme benötigt einen unterstützten Browser und HTTPS. Alternativ die Diktierfunktion der Bildschirmtastatur im Notizfeld verwenden.",
        );
      const source = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) {
        source.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = source;
      const r = new MediaRecorder(source);
      recorder.current = r;
      const chunks: Blob[] = [];
      let bytes = 0;
      r.ondataavailable = (e) => {
        chunks.push(e.data);
        bytes += e.data.size;
        if (bytes > 2_000_000 && r.state === "recording") r.stop();
      };
      r.onstop = () => {
        source.getTracks().forEach((t) => t.stop());
        if (timer.current) clearTimeout(timer.current);
        if (!alive.current) return;
        setRecording(false);
        setBusy(true);
        if (bytes > 2_000_000) {
          setBusy(false);
          onBusy(false);
          setError("Aufnahme zu groß. Bitte kürzer aufnehmen.");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (alive.current) {
            onAudio(String(reader.result));
            onBusy(false);
            setBusy(false);
          }
        };
        reader.onerror = () => {
          if (alive.current) {
            setError("Aufnahme konnte nicht gelesen werden.");
            onBusy(false);
            setBusy(false);
          }
        };
        reader.readAsDataURL(new Blob(chunks, { type: r.mimeType }));
      };
      r.onerror = () => {
        source.getTracks().forEach((t) => t.stop());
        if (alive.current) {
          setRecording(false);
          onBusy(false);
          setError("Sprachaufnahme fehlgeschlagen.");
        }
      };
      r.start(500);
      setRecording(true);
      timer.current = setTimeout(() => {
        if (r.state === "recording") r.stop();
      }, 60000);
    } catch (e) {
      stream.current?.getTracks().forEach((t) => t.stop());
      if (alive.current) {
        setError(String(e));
        onBusy(false);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => (recording ? recorder.current?.stop() : void start())}
      >
        {recording ? "Sprachaufnahme beenden" : "Sprachaufnahme starten"}
      </button>
      <p>
        {recording
          ? "Aufnahme läuft · maximal 60 Sekunden"
          : "Aufnahme bleibt im Projekt und wird erst mit der Notiz gespeichert."}
      </p>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
