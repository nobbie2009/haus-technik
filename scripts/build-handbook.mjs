import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { marked } from "marked";
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const version = JSON.parse(read("package.json")).version;
const escape = (s) =>
  s.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const sections = read("docs/handbuch.md")
  .split(/^# /m)
  .filter(Boolean)
  .map((part) => {
    const [heading, ...lines] = part.split("\n");
    const match = heading.trim().match(/^(.*?) \{#([a-z0-9-]+)\}$/);
    if (!match) throw new Error(`Kapitel ohne stabile Kennung: ${heading}`);
    return { title: match[1], id: match[2], source: lines.join("\n") };
  });
const included = new Map();
if (new Set(sections.map((s) => s.id)).size !== sections.length)
  throw new Error("Doppelte Kapitelkennung im Handbuch.");
for (const section of sections)
  for (const match of section.source.matchAll(/\{\{include:(docs\/[a-z-]+\.md)\}\}/g))
    included.set(match[1].split("/").at(-1), section.id);
let pictures = 0;
const html = sections
  .map((section, index) => {
    const source = section.source
      .replace(/\{\{include:(docs\/[a-z-]+\.md)\}\}/g, (_, file) => {
        // Keep user instructions; omit developer verification and internal data-model appendices.
        let content = read(file).split(/^## (?:Datenmodell|Datenformat und Architektur|Prüfen)\s*$/m)[0];
        content = content.replace(/^# .*\r?\n/, "");
        return content;
      })
      .replaceAll("{{VERSION}}", version);
    let body = marked.parse(source, { gfm: true });
    const counts = new Map();
    body = body.replace(/<h([2-6])>(.*?)<\/h\1>/g, (_, level, label) => {
      const headingLevel = Math.min(Number(level) + 1, 6);
      const base = `${section.id}-${slug(label.replace(/<[^>]+>/g, ""))}`;
      const count = (counts.get(base) ?? 0) + 1;
      counts.set(base, count);
      const id = count > 1 ? `${base}-${count}` : base;
      return `<h${headingLevel} id="${id}" tabindex="-1">${label}<a class="permalink" href="#${id}" aria-label="Link zu ${escape(label.replace(/<[^>]+>/g, ""))}">#</a></h${headingLevel}>`;
    });
    body = body.replace(/href="([^"#]+\.md)(?:#[^"]*)?"/g, (_, file) =>
      included.has(file.split("/").at(-1))
        ? `href="#${included.get(file.split("/").at(-1))}"`
        : `href="https://github.com/nobbie2009/haus-technik/blob/master/docs/${escape(file)}"`,
    );
    body = body.replace(/<p><img src="(bilder\/[^"/]+\.png)" alt="([^"]*)"\s*\/?><\/p>/g, (_, file, alt) => {
      const data = readFileSync(new URL(`../public/handbuch/${file}`, import.meta.url));
      const width = data.readUInt32BE(16),
        height = data.readUInt32BE(20);
      pictures++;
      const capturedVersion = file.endsWith("poe-desktop.png")
        ? "0.55.0"
        : ["contact-dialog-desktop.png", "network-editor-desktop.png"].some((name) => file.endsWith(name))
          ? "0.53.0"
          : file.endsWith("board-equipment-desktop.png")
            ? "0.50.0"
            : "0.48.0";
      return `<figure><a href="${file}" target="_blank" rel="noopener" aria-label="Bild in Originalgröße öffnen: ${alt}"><img src="${file}" alt="${alt}" width="${width}" height="${height}" loading="lazy" decoding="async"></a><figcaption>Abb. ${pictures} · ${alt} <span>Beispieldaten · Aufnahme ${capturedVersion} · zum Vergrößern öffnen</span></figcaption></figure>`;
    });
    body = body
      .replace(
        /<table>/g,
        '<div class="table-scroll" role="region" aria-label="Tabelle" tabindex="0"><table>',
      )
      .replace(/<\/table>/g, "</table></div>");
    return `<article id="${section.id}" data-title="${escape(section.title)}" tabindex="-1"><p class="chapter-number">Kapitel ${String(index + 1).padStart(2, "0")}</p><h2 class="chapter-title">${escape(section.title)}</h2>${body}<a class="back-top" href="#anfang">Zurück zu Suche und Inhaltsverzeichnis ↑</a></article>`;
  })
  .join("\n");
const ids = new Set([
  "anfang",
  "inhalt",
  "suche",
  ...Array.from(html.matchAll(/\bid="([^"]+)"/g), (m) => m[1]),
]);
for (const [, id] of html.matchAll(/href="#([^"]+)"/g))
  if (!ids.has(id)) throw new Error(`Ungültiger Kapitelverweis: ${id}`);
const toc = sections
  .map(
    (s, i) =>
      `<li><a href="#${s.id}"><span>${String(i + 1).padStart(2, "0")}</span>${escape(s.title)}</a></li>`,
  )
  .join("");
const words = html.replace(/<[^>]*>/g, " ").split(/\s+/).length;
const page = `<!doctype html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Bebilderte Anleitung für Home-Technik mit Schrittfolgen, FAQ, Stichwortverzeichnis und Volltextsuche."><title>Home-Technik · Handbuch ${version}</title><style>${read("docs/handbook.css")}</style></head><body>
<a class="skip" href="#inhalt">Zum Handbuchinhalt</a>
<header id="anfang"><div class="topline"><a class="brand" href="../../">HOME-TECHNIK</a><span>Handbuch · Version ${version}</span><a class="app-link" href="../../" target="_blank" rel="noopener">App öffnen ↗</a></div><p class="eyebrow">PLANEN · DOKUMENTIEREN · WIEDERFINDEN</p><h1>Dein Haus.<br>Schritt für Schritt dokumentiert.</h1><p class="lead">Vom ersten Grundriss bis zur Wartung: Bedienung, praktische Beispiele und Antworten auf häufige Fragen an einem Ort.</p><div class="stats"><span>${sections.length} Kapitel</span><span>${pictures} Abbildungen</span><span>FAQ & A–Z</span><span>Suche ohne Internetdienst</span></div></header>
<div class="search-panel"><label for="suche">Im Handbuch suchen</label><div class="search-line"><input id="suche" type="search" placeholder="Zum Beispiel: Zähler verknüpfen, Gartenleitung, Klingeltrafo …" autocomplete="off" aria-describedby="suchhilfe"><button id="clear" type="button">Suche zurücksetzen</button></div><p id="suchhilfe">Mehrere Wörter grenzen Treffer ein. Auch Umlaute und Umschreibungen wie „Zaehler“ werden gefunden. Taste / setzt den Fokus in die Suche.</p><p id="status" role="status" aria-live="polite"></p><ol id="results" aria-label="Suchergebnisse" hidden></ol><noscript><p>Ohne JavaScript bleiben sämtliche Kapitel und das Inhaltsverzeichnis lesbar. Verwende die Suchfunktion deines Browsers.</p></noscript></div>
<div class="layout"><aside><details id="navigation" open><summary>Inhaltsverzeichnis</summary><nav aria-label="Handbuchkapitel"><ol>${toc}</ol></nav></details><p class="nav-note">Alle Beispiele verwenden fiktive Hausdaten. Die Suche verarbeitet nur dieses Handbuch.</p></aside><main id="inhalt">${html}</main></div>
<footer>Home-Technik · Version ${version} · Copyright by nobbie2009<span>Handbuch zur Bedienung der Anwendung · Stand 21.09.2026</span></footer><script>${read("docs/handbook.js")}</script></body></html>`;
mkdirSync(new URL("../public/handbuch/", import.meta.url), { recursive: true });
writeFileSync(new URL("../public/handbuch/index.html", import.meta.url), page);
console.log(
  `Handbuch ${version}: ${sections.length} Kapitel, ${pictures} Bilder, ca. ${words} Wörter. Alle Kapitelverweise geprüft.`,
);
