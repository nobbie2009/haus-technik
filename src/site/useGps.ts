import { useCallback, useEffect, useRef, useState } from "react";
import { gpsFixSchema, type GpsFix } from "./gps";
export function useGps() {
  const [fix, setFix] = useState<GpsFix | null>(null),
    [active, setActive] = useState(false),
    [error, setError] = useState("");
  const [now, setNow] = useState(Date.now);
  const watch = useRef<number | null>(null),
    generation = useRef(0);
  const clear = useCallback(() => {
    generation.current++;
    if (watch.current !== null) navigator.geolocation?.clearWatch(watch.current);
    watch.current = null;
  }, []);
  const stop = useCallback(() => {
    clear();
    setActive(false);
    setFix(null);
  }, [clear]);
  const start = useCallback(() => {
    stop();
    setError("");
    if (!window.isSecureContext) {
      setError(
        "Standort benötigt HTTPS. Bitte Home-Technik über eine vertrauenswürdige HTTPS-Adresse öffnen.",
      );
      return;
    }
    if (!navigator.geolocation) {
      setError("Dieser Browser stellt keinen Standort bereit.");
      return;
    }
    setActive(true);
    const token = generation.current;
    try {
      watch.current = navigator.geolocation.watchPosition(
        (position) => {
          if (token !== generation.current) return;
          const parsed = gpsFixSchema.safeParse({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          });
          if (!parsed.success) {
            stop();
            setError("Ungültige Standortdaten empfangen. Bitte erneut starten.");
            return;
          }
          setFix(parsed.data);
          setNow(Date.now());
          setError("");
        },
        (failure) => {
          if (token !== generation.current) return;
          stop();
          setError(
            failure.code === 1
              ? "Standortzugriff abgelehnt. Bitte in Safari bzw. den Geräteeinstellungen erlauben und erneut starten."
              : failure.code === 3
                ? "Kein aktueller Standort innerhalb von 20 Sekunden. Unter freiem Himmel erneut starten."
                : "Standort nicht verfügbar. Bitte Empfang prüfen und erneut starten.",
          );
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    } catch {
      stop();
      setError("Standort konnte nicht gestartet werden. Bitte Browserfreigabe und HTTPS prüfen.");
    }
  }, [stop]);
  useEffect(() => clear, [clear]);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const hidden = () => {
      if (document.hidden) {
        stop();
        setError("Ortung im Hintergrund pausiert. Zum Fortsetzen erneut starten.");
      }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [active, stop]);
  return { fix, active, error, now, start, stop };
}
