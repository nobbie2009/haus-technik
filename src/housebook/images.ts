export async function readPlanImage(
  file: File,
  pageNumber = 1,
): Promise<{ data: string; width: number; height: number }> {
  if (file.size > 25_000_000) throw new Error("Datei zu groß (maximal 25 MB).");
  let canvas = document.createElement("canvas");
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdf = await import("pdfjs-dist");
    pdf.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    const task = pdf.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      const doc = await task.promise;
      if (pageNumber > doc.numPages) throw new Error(`Das PDF hat nur ${doc.numPages} Seiten.`);
      const page = await doc.getPage(pageNumber),
        base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: Math.min(2, 2400 / Math.max(base.width, base.height)) });
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvas, viewport }).promise;
    } finally {
      await task.destroy();
    }
  } else {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
      throw new Error("Bitte PNG, JPEG, WebP oder PDF wählen.");
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
  }
  const data = canvas.toDataURL("image/jpeg", 0.85);
  if (data.length > 4_000_000)
    throw new Error("Bild ist nach Verkleinerung noch zu groß. Bitte kleinere Vorlage verwenden.");
  return { data, width: canvas.width, height: canvas.height };
}
