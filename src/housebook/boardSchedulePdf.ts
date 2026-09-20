import type { Project } from "../models/project";
import { boardSchedule } from "./boardSchedule";
import { embedFont } from "./export";
import { addPdfFooter } from "./pdfFooter";
export async function createBoardSchedulePdf(project: Project, boardIds: string[], note = "") {
  const ids = [...new Set(boardIds)];
  if (!ids.length) throw new Error("Bitte einen Sicherungskasten auswählen.");
  const schedules = ids.map((id) => boardSchedule(project, id)),
    { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await embedFont(doc);
  const left = 12,
    widths = [39, 48, 109, 51, 26],
    labels = ["Sicherung / Schutzgerät", "Stromkreis", "Versorgte Räume / Geräte", "FI-Zuordnung", "Phase"],
    lineHeight = 5;
  let first = true;
  const date = new Date(project.updatedAt).toLocaleDateString("de-DE"),
    pages: { board: string; page: number }[] = [];
  for (const schedule of schedules) {
    let y = 0,
      part = 0;
    const heading = () => {
      if (!first) doc.addPage();
      first = false;
      part++;
      pages.push({ board: schedule.board.label || schedule.board.name, page: part });
      doc.setTextColor(25);
      doc.setFontSize(18);
      doc.text("SICHERUNGSKASTEN", left, 17);
      doc.setFontSize(11);
      const title = doc.splitTextToSize(
        `${schedule.board.label} · ${schedule.board.name} · ${schedule.location}`,
        273,
      ) as string[];
      y = 25;
      for (const text of title) {
        doc.text(text, left, y);
        y += 5;
      }
      doc.setFontSize(9);
      const context = doc.splitTextToSize(`${project.name} · Datenstand: ${date}`, 273) as string[];
      for (const text of context) {
        doc.text(text, left, y);
        y += 4.5;
      }
      y += 4;
      if (y > 90)
        throw new Error("Verteiler- oder Projektbezeichnung zu lang für den Aushang. Bitte kürzen.");
      doc.setFillColor("#ebebeb");
      doc.rect(left, y, 273, 12, "F");
      let x = left;
      doc.setFontSize(9);
      labels.forEach((label, i) => {
        doc.text(doc.splitTextToSize(label, widths[i]! - 4), x + 2, y + 4.5);
        x += widths[i]!;
      });
      y += 12;
    };
    heading();
    const printRow = (values: string[]) => {
      doc.setFontSize(10);
      const lines = values.map((text, i) => doc.splitTextToSize(text, widths[i]! - 5) as string[]);
      let remaining = Math.max(...lines.map((l) => l.length)),
        offset = 0;
      while (remaining > 0) {
        if (y + lineHeight + 5 > 180) heading();
        const count = Math.min(remaining, Math.max(1, Math.floor((180 - y - 5) / lineHeight))),
          height = count * lineHeight + 5;
        let x = left;
        doc.setFontSize(10);
        doc.setDrawColor(145);
        doc.setLineWidth(0.2);
        for (let i = 0; i < widths.length; i++) {
          doc.rect(x, y, widths[i]!, height);
          const cell = lines[i]!.slice(offset, offset + count);
          if (offset > 0 && i !== 2 && cell.length === 0) {
            cell.push(...lines[i]!.slice(0, count));
            if (i === 0 && cell.length < count) cell.push("(Fortsetzung)");
          }
          cell.forEach((text, j) => doc.text(text, x + 2, y + 5 + j * lineHeight));
          x += widths[i]!;
        }
        y += height;
        offset += count;
        remaining -= count;
      }
    };
    if (!schedule.rows.length)
      printRow([
        "—",
        "Keine Stromkreise erfasst",
        "Diesen Verteiler zunächst im Projekt dokumentieren.",
        "Offen",
        "Offen",
      ]);
    for (const row of schedule.rows) {
      const values = [row.protection, row.circuit, row.areas, row.fi, row.phase];
      doc.setFontSize(10);
      const height =
        Math.max(...values.map((text, i) => (doc.splitTextToSize(text, widths[i]! - 5) as string[]).length)) *
          lineHeight +
        5;
      if (y + height > 180 && height < 100) heading();
      printRow(values);
    }
    if (note.trim()) printRow(["Eigene Hinweise", "", note.trim(), "", ""]);
  }
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setTextColor(65);
    doc.setFontSize(8);
    doc.text(
      "Dokumentierte Zuordnung · Fehlende Angaben sind offen · Keine automatische Prüfung vor Ort",
      12,
      189,
    );
    doc.text("LS = Leitungsschutzschalter · FI = Fehlerstromschutzschalter · FI/LS = Kombination", 12, 194);
    doc.text(`Verteilerblatt ${pages[page - 1]!.page} · Gesamt ${page}/${total}`, 12, 200);
  }
  addPdfFooter(doc);
  return doc;
}
export async function exportBoardSchedulePdf(project: Project, boardIds: string[], note = "") {
  const doc = await createBoardSchedulePdf(project, boardIds, note);
  doc.save("Sicherungskasten-Aushang.pdf");
}
