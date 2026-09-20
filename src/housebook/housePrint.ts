import type { Project } from "../models/project";
import { life } from "./life";
import { searchEntries, type SearchResult } from "./search";
import { embedFont } from "./export";
import { qrLink } from "./qr";
import { addPdfFooter } from "./pdfFooter";
export async function quickOverviewPdf(p: Project) {
  const { jsPDF } = await import("jspdf"),
    doc = new jsPDF(),
    b = life(p);
  await embedFont(doc);
  let y = 0;
  const header = () => {
    doc.setFontSize(17);
    doc.text("MEIN HAUS · SCHNELLÜBERSICHT", 14, 18);
    doc.setFontSize(9);
    doc.text(`Datenstand: ${new Date(p.updatedAt).toLocaleDateString("de-DE")}`, 14, 25);
    y = 34;
  };
  header();
  const line = (text: string, heading = false) => {
    doc.setFontSize(heading ? 12 : 10);
    const lines = doc.splitTextToSize(text || "—", 182) as string[];
    for (const s of lines) {
      if (y > 272) {
        doc.addPage();
        header();
        doc.setFontSize(heading ? 12 : 10);
      }
      doc.text(s, 14, y);
      y += heading ? 7 : 5;
    }
    y += 2;
  };
  line(p.name, true);
  line("Wichtige Stellen", true);
  const entries = searchEntries(p);
  if (!b.quickKeys.length && !b.places.length) line("Noch keine wichtigen Stellen ausgewählt.");
  for (const key of b.quickKeys) {
    const r = entries.find((r) => r.key === key);
    if (r) {
      line(r.title, true);
      line([r.location, r.description].filter(Boolean).join(" · ") || "Standort / Hinweise offen");
    } else line("Ein ausgewählter Eintrag wurde entfernt.");
  }
  for (const place of b.places) {
    line(place.title, true);
    line(place.location || "Standort offen");
    if (place.instructions) line(place.instructions);
  }
  line("Ansprechpartner", true);
  if (!b.contacts.length) line("Noch keine Kontakte eingetragen.");
  for (const c of b.contacts) {
    line([c.name, c.role].filter(Boolean).join(" · "), true);
    line([c.phone, c.email].filter(Boolean).join(" · ") || "Kontaktdaten offen");
    if (c.notes) line(c.notes);
  }
  if (b.quickNotes) {
    line("Eigene Hinweise", true);
    line(b.quickNotes);
  }
  addPdfFooter(doc);
  return doc;
}
export async function qrLabelsPdf(p: Project, entries: SearchResult[], base: string) {
  if (!entries.length) throw new Error("Bitte mindestens eine Akte auswählen.");
  if (entries.length > 100) throw new Error("Maximal 100 Aufkleber je Ausgabe.");
  const { jsPDF } = await import("jspdf"),
    qr = await import("qrcode"),
    doc = new jsPDF();
  await embedFont(doc);
  for (let i = 0; i < entries.length; i++) {
    if (i && i % 8 === 0) doc.addPage();
    const row = entries[i]!,
      x = 10 + (i % 2) * 95,
      y = 12 + Math.floor((i % 8) / 2) * 68,
      url = qrLink(base, p.id, row.key);
    doc.setDrawColor("#aaaaaa");
    doc.rect(x, y, 92, 64);
    const data = await qr.toDataURL(url, { width: 480, margin: 4, errorCorrectionLevel: "M" });
    doc.addImage(data, "PNG", x + 2, y + 9, 44, 44);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(row.title, 41) as string[];
    doc.text(lines.slice(0, 5), x + 48, y + 10);
    doc.setFontSize(7);
    doc.text((doc.splitTextToSize(row.location || row.category, 41) as string[]).slice(0, 3), x + 48, y + 36);
    doc.text("Hausakte öffnen", x + 3, y + 59);
    doc.text(`${i + 1}/${entries.length}`, x + 77, y + 59);
  }
  addPdfFooter(doc);
  return doc;
}
