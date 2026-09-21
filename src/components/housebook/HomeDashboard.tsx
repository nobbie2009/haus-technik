import { useMemo } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useBackupLog, backupStatus } from "../../persistence/backupLog";
import { homeBook, meterKinds, dueOverview, localDate } from "../../housebook/home";
import { life } from "../../housebook/life";
import type { OpenSection } from "../../housebook/setup";
export function HomeDashboard({ onOpen, issueCount }: { onOpen: OpenSection; issueCount: number }) {
  const p = useProjectStore((s) => s.project),
    records = useBackupLog((s) => s.records),
    b = homeBook(p),
    today = localDate(),
    limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + 30);
  const upcoming = dueOverview(p).filter((r) => r.date <= localDate(limitDate)),
    backup = useMemo(() => backupStatus(p), [p, records]);
  return (
    <section aria-label="Haus-Startseite">
      <h4>Heute im Haus</h4>
      <div className="book-cards">
        <button onClick={() => onOpen("maintenance")}>
          <strong>{upcoming.filter((r) => r.date <= today).length} fällige Termine</strong>
          <span>Prüfungen, Austausch und Wartungen</span>
        </button>
        <button onClick={() => onOpen("check")}>
          <strong>{issueCount} offene Planungshinweise</strong>
          <span>Vorhandene Angaben ergänzen</span>
        </button>
        <button onClick={() => onOpen("backup")}>
          <strong>{backup.needsBackup ? "Sicherung ansehen" : "Sicherung geprüft"}</strong>
          <span>{backup.text}</span>
        </button>
        <button onClick={() => onOpen("chronicle")}>
          <strong>{life(p).events.length} Chronikeinträge</strong>
          <span>Reparaturen, Umbauten und Anschaffungen</span>
        </button>
      </div>
      <div className="book-actions">
        <button onClick={() => onOpen("usage")}>Ablesung erfassen</button>
        <button onClick={() => onOpen("chronicle")}>Foto / Ereignis erfassen</button>
        <button onClick={() => onOpen("quick")}>Wichtige Stellen & Kontakte</button>
        <button onClick={() => onOpen("qr")}>QR-Aufkleber erstellen</button>
      </div>
      <h4>Fällig oder in den nächsten 30 Tagen</h4>
      {!upcoming.length && <p>Keine erfassten Termine in diesem Zeitraum.</p>}
      {upcoming.slice(0, 8).map((r) => (
        <p key={r.id}>
          {r.date} · <strong>{r.name}</strong> · {r.location} {r.overdue ? "· überfällig" : ""}
        </p>
      ))}
      {upcoming.length > 8 && (
        <button onClick={() => onOpen("maintenance")}>Alle {upcoming.length} Termine anzeigen</button>
      )}
      <h4>Letzte Zählerstände</h4>
      {!b.meters.length && <p>Noch keine Zähler angelegt.</p>}
      {b.meters.map((m) => {
        const r = [...m.readings].sort((a, b) => b.date.localeCompare(a.date))[0];
        return (
          <article className="home-row" key={m.id}>
            <strong>
              {meterKinds[m.kind]} · {m.name}
            </strong>
            <span>
              {r ? `${r.date}: ${r.value.toLocaleString("de-DE")} ${m.unit}` : "Erste Ablesung fehlt"}
            </span>
            <button onClick={() => onOpen("usage", m.id)}>Ablesen: {m.name}</button>
          </article>
        );
      })}
    </section>
  );
}
