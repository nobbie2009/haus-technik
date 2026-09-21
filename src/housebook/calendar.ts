import type { Project } from "../models/project";
import { dueOverview } from "./home";
const escape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
export function maintenanceCalendar(p: Project, now = new Date()) {
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Home-Technik//Wartungen//DE",
    "CALSCALE:GREGORIAN",
  ];
  for (const row of dueOverview(p))
    lines.push(
      "BEGIN:VEVENT",
      `UID:${p.id}-${row.id}@home-technik`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${row.date.replace(/-/g, "")}`,
      `SUMMARY:${escape(row.name)}`,
      `LOCATION:${escape(row.location)}`,
      `DESCRIPTION:${escape(row.source)}`,
      "END:VEVENT",
    );
  lines.push("END:VCALENDAR");
  return (
    lines
      .map((line) => {
        const parts: string[] = [];
        let chunk = "",
          bytes = 0;
        for (const char of line) {
          const n = new TextEncoder().encode(char).length;
          if (bytes + n > 73) {
            parts.push(chunk);
            chunk = " ";
            bytes = 1;
          }
          chunk += char;
          bytes += n;
        }
        parts.push(chunk);
        return parts.join("\r\n");
      })
      .join("\r\n") + "\r\n"
  );
}
