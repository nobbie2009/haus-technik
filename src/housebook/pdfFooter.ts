import type { jsPDF } from "jspdf";
import { appFooterText } from "../app/branding";

/** Apply after all pages are complete; content keeps the bottom 10 mm free. */
export function addPdfFooter(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  doc.setProperties({ creator: appFooterText(), author: "nobbie2009" });
  for (let page = 1; page <= total; page++) {
    doc.setPage(page);
    doc.setFont("NotoSans", "normal");
    doc.setFontSize(8);
    doc.setTextColor("#334b50");
    const width = doc.internal.pageSize.getWidth(),
      y = doc.internal.pageSize.getHeight() - 5;
    doc.text(appFooterText(), 12, y);
    doc.text(`${page}/${total}`, width - 12, y, { align: "right" });
  }
}
