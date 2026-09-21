import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { dueOverview, localDate } from "../../housebook/home";
import { maintenanceCalendar } from "../../housebook/calendar";
import { download } from "../../housebook/export";
import { Field } from "./shared";
export function MaintenanceCalendar() {
  const p = useProjectStore((s) => s.project),
    rows = dueOverview(p);
  const [month, setMonth] = useState(localDate().slice(0, 7)),
    [day, setDay] = useState("");
  const [year, m] = month.split("-").map(Number),
    count = new Date(year!, m!, 0).getDate(),
    offset = (new Date(year!, m! - 1, 1).getDay() + 6) % 7;
  return (
    <section>
      <h4>Wartungskalender</h4>
      <Field label="Kalendermonat">
        <input
          type="month"
          value={month}
          onChange={(e) => {
            if (e.target.value) {
              setMonth(e.target.value);
              setDay("");
            }
          }}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 8 }}>
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => (
          <strong key={d}>{d}</strong>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={`empty-${i}`} />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`,
            n = rows.filter((r) => r.date === date).length;
          return (
            <button
              key={date}
              style={{ minHeight: 44, padding: 4 }}
              aria-pressed={day === date}
              aria-label={`${date}: ${n} Termine`}
              onClick={() => setDay(date)}
            >
              {i + 1}
              {n > 0 ? <strong> · {n}</strong> : null}
            </button>
          );
        })}
      </div>
      <p>
        {day || month}: {rows.filter((r) => (day ? r.date === day : r.date.startsWith(month))).length} Termine
      </p>
      {rows
        .filter((r) => (day ? r.date === day : r.date.startsWith(month)))
        .map((r) => (
          <p key={r.id}>
            {r.date} · {r.name} · {r.location}
          </p>
        ))}
      <button
        onClick={() => download(maintenanceCalendar(p), "Haus-Wartungen.ics", "text/calendar;charset=utf-8")}
      >
        Termine als Kalenderdatei exportieren
      </button>
      <p>
        Exportiert die aktuell erfassten Fälligkeiten. Wiederholungstermine entstehen nach dokumentierter
        Erledigung; spätere Änderungen benötigen einen neuen Export.
      </p>
    </section>
  );
}
