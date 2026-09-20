import { utilities, media, pipeFloorPath, pipeLength, pipeCaptionPoint, nodeKinds } from "../utilities/model";
import type { Project } from "../models/project";
import type { Vec2 } from "../models/common";
import { furnitureCorners } from "../geometry/furniture";
import { consumerShape } from "../electrical/consumerLibrary";
import { cableFloorPath, cableLengths } from "../electrical/cables";
import { electricalPlacementKinds } from "../electrical/models";
import { getRoomMeasurements } from "../core/selectors";
import { dimensionGeometry } from "../geometry/dimensions";
import { asset, housebook, statusLabels, networkLabels } from "./model";
import { circuitMembers } from "../electrical/selectors";
import { homeBook, homeKinds } from "./home";

export type Primitive =
  | { kind: "line"; points: Vec2[]; color: string; width: number }
  | { kind: "text"; position: Vec2; text: string; color: string; size: number };
const colors = { existing: "#334b50", planned: "#176fba", remove: "#bb4433", completed: "#167863" };
export function planPrimitives(
  project: Project,
  floorId: string,
  mode: "building" | "electrical" | "all" = "all",
): Primitive[] {
  const result: Primitive[] = [];
  const line = (points: Vec2[], color = "#334b50", width = 20) =>
    result.push({ kind: "line", points, color, width });
  const text = (position: Vec2, value: string, color = "#334b50", size = 140) =>
    result.push({ kind: "text", position, text: value, color, size });
  const visible = (item: { floorId: string; layerId: string }) =>
    item.floorId === floorId && project.layers[item.layerId]?.visible;
  for (const wall of Object.values(project.walls).filter(visible)) {
    const a = project.points[wall.startPointId]!.position,
      b = project.points[wall.endPointId]!.position;
    line([a, b], colors[asset(wall).status], wall.thickness);
    const vertical = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
    text(
      {
        x: (a.x + b.x) / 2 + (vertical ? wall.thickness / 2 + 120 : 0),
        y: (a.y + b.y) / 2 + (vertical ? 0 : wall.thickness / 2 + 120),
      },
      `${(Math.hypot(b.x - a.x, b.y - a.y) / 1000).toFixed(2)} m`,
      "#5b676c",
      110,
    );
  }
  for (const item of [...Object.values(project.doors), ...Object.values(project.windows)].filter(visible)) {
    const wall = project.walls[item.wallId]!,
      a = project.points[wall.startPointId]!.position,
      b = project.points[wall.endPointId]!.position;
    const length = Math.hypot(b.x - a.x, b.y - a.y),
      dx = (b.x - a.x) / length,
      dy = (b.y - a.y) / length;
    const ends = [-0.5, 0.5].map((s) => ({
      x: a.x + dx * (item.position + s * item.width),
      y: a.y + dy * (item.position + s * item.width),
    }));
    line(ends, "#ffffff", wall.thickness + 5);
    const transform = (along: number, normal = 0) => ({
      x: a.x + dx * along - dy * normal,
      y: a.y + dy * along + dx * normal,
    });
    const left = item.position - item.width / 2,
      right = item.position + item.width / 2;
    if ("openingDirection" in item) {
      const start = item.openingDirection.hinge === "startSide",
        hinge = start ? left : right,
        direction = start ? 1 : -1,
        swing = item.openingDirection.swing === "leftOfWall" ? 1 : -1;
      line([transform(hinge), transform(hinge, item.width * swing)], "#377f9a", 15);
      line(
        Array.from({ length: 21 }, (_, i) => {
          const angle = ((i / 20) * Math.PI) / 2;
          return transform(
            hinge + Math.cos(angle) * item.width * direction,
            Math.sin(angle) * item.width * swing,
          );
        }),
        "#377f9a",
        10,
      );
    } else {
      for (const offset of [-wall.thickness / 3, wall.thickness / 3])
        line([transform(left, offset), transform(right, offset)], "#377f9a", 15);
      for (const end of [left, right])
        line([transform(end, -wall.thickness / 2), transform(end, wall.thickness / 2)], "#377f9a", 15);
    }
  }
  for (const room of Object.values(project.rooms).filter(visible)) {
    const measure = getRoomMeasurements(project, room.id),
      p = measure.polygon;
    const label = `${room.name} · ${(measure.area / 1e6).toFixed(1)} m²`;
    text(
      {
        x: p.reduce((s, v) => s + v.x, 0) / p.length - label.length * 130 * 0.25,
        y: p.reduce((s, v) => s + v.y, 0) / p.length,
      },
      label,
      "#657572",
      130,
    );
  }
  if (mode !== "electrical")
    for (const item of Object.values(project.furniture).filter(visible)) {
      const corners = furnitureCorners(item);
      line([...corners, corners[0]!], colors[asset(item).status]);
      text(item.position, item.name, colors[asset(item).status], 110);
    }
  for (const item of Object.values(project.dimensions).filter(visible)) {
    const g = dimensionGeometry(project, item);
    line([g.start, g.a], "#657572", 8);
    line([g.end, g.b], "#657572", 8);
    line([g.a, g.b], "#657572", 10);
    text(
      { x: (g.a.x + g.b.x) / 2 + 90, y: (g.a.y + g.b.y) / 2 + 100 },
      `${(g.length / 1000).toFixed(2)} m`,
      "#334b50",
      120,
    );
  }
  if (mode !== "building") {
    for (const cable of Object.values(project.electrical.cables))
      if (project.layers[cable.layerId]?.visible) {
        const points = cableFloorPath(project, cable, floorId);
        if (points.length) line(points, colors[asset(cable).status], 15);
      }
    const symbols = {
      outlets: "S",
      devices: "V",
      switches: "L",
      controls: "R",
      transformers: "T",
      supplies: "E",
      meters: "Z",
      distributionBoards: "UV",
      junctions: "A",
    };
    for (const kind of electricalPlacementKinds)
      for (const item of Object.values(project.electrical[kind]).filter(visible)) {
        const shape = kind === "devices" ? consumerShape(item) : null;
        if (shape) {
          const corners = furnitureCorners({ ...shape, position: item.position });
          line([...corners, corners[0]!], colors[asset(item).status]);
        }
        const p = item.position,
          c = colors[asset(item).status],
          r = 85;
        line(
          [
            { x: p.x - r, y: p.y - r },
            { x: p.x + r, y: p.y - r },
            { x: p.x + r, y: p.y + r },
            { x: p.x - r, y: p.y + r },
            { x: p.x - r, y: p.y - r },
          ],
          c,
          20,
        );
        text({ x: p.x - r / 2, y: p.y - 30 }, symbols[kind], c, 100);
        text({ x: p.x + 140, y: p.y }, item.label || item.name, c, 110);
      }
    const book = housebook(project);
    for (const node of book.networkNodes.filter((n) => n.floorId === floorId))
      text(node.position, `NET ${node.name}`, "#7556a2", 120);
    for (const link of book.networkLinks) {
      const a = book.networkNodes.find((n) => n.id === link.from),
        b = book.networkNodes.find((n) => n.id === link.to);
      if (a?.floorId === floorId && b?.floorId === floorId) line([a.position, b.position], "#7556a2", 15);
    }
  }
  if (mode === "all") {
    for (const item of homeBook(project).items.filter((i) => i.floorId === floorId && i.position))
      text(item.position!, `${homeKinds[item.kind]}: ${item.name}`, "#21705f", 120);
    const net = utilities(project);
    for (const pipe of Object.values(net.pipes))
      if (project.layers[pipe.layerId]?.visible) {
        const path = pipeFloorPath(project, pipe, floorId),
          color = media[pipe.medium].color;
        if (path.length) {
          line(path, color, 25);
          const caption = pipeCaptionPoint(path);
          text(
            { x: caption.x + 80, y: caption.y + 180 },
            `${pipe.name} · ${media[pipe.medium].short}`,
            color,
            110,
          );
        }
        if (path.length && pipe.riser)
          text(
            pipe.riser,
            `Steigleitung ${project.floors[net.nodes[pipe.from]!.floorId]?.name} / ${project.floors[net.nodes[pipe.to]!.floorId]?.name}`,
            color,
            100,
          );
      }
    for (const node of Object.values(net.nodes).filter(visible)) {
      const corners = furnitureCorners(node),
        color = media[node.media[0]!].color;
      line([...corners, corners[0]!], color);
      text(
        node.position,
        `${node.name} · ${node.media.map((m) => media[m].short).join("/")}${node.closed ? " · geschlossen" : ""}`,
        color,
        110,
      );
    }
  }
  return result;
}
export function planBounds(primitives: Primitive[]) {
  const points = primitives.flatMap((p) =>
    p.kind === "line"
      ? p.points
      : [p.position, { x: p.position.x + p.text.length * p.size * 0.65, y: p.position.y + p.size }],
  );
  return points.length
    ? {
        x: Math.min(...points.map((p) => p.x)) - 300,
        y: Math.max(...points.map((p) => p.y)) + 300,
        width: Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)) + 600,
        height: Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y)) + 600,
      }
    : { x: 0, y: 0, width: 10000, height: 7000 };
}
export function escapeXml(value: string) {
  return value.replace(
    /[<>&"']/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!,
  );
}
export function planSvg(
  project: Project,
  floorId: string,
  scale: number,
  mode: "building" | "electrical" | "all",
) {
  const primitives = planPrimitives(project, floorId, mode),
    b = planBounds(primitives);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${b.width / scale}mm" height="${b.height / scale}mm" viewBox="${b.x} ${-b.y} ${b.width} ${b.height}"><title>${escapeXml(project.name)} – ${escapeXml(project.floors[floorId]!.name)} – 1:${scale}</title><rect x="${b.x}" y="${-b.y}" width="${b.width}" height="${b.height}" fill="white"/>${primitives.map((p) => (p.kind === "line" ? `<polyline points="${p.points.map((v) => `${v.x},${-v.y}`).join(" ")}" fill="none" stroke="${p.color}" stroke-width="${p.width}"/>` : `<text x="${p.position.x}" y="${-p.position.y}" font-family="Arial,sans-serif" font-size="${p.size}" fill="${p.color}">${escapeXml(p.text)}</text>`)).join("")}</svg>`;
}
export function download(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export function materialRows(project: Project): string[][] {
  const rows = [
    ["Kategorie", "Kennzeichnung", "Name / Typ", "Etage", "Status", "Menge", "Einheit", "Details"],
  ];
  for (const kind of electricalPlacementKinds)
    for (const item of Object.values(project.electrical[kind])) {
      const shape = kind === "devices" ? consumerShape(item) : null;
      const device = kind === "devices" ? project.electrical.devices[item.id] : null;
      rows.push([
        kind,
        item.label,
        item.name,
        project.floors[item.floorId]!.name,
        statusLabels[asset(item).status],
        "1",
        "Stück",
        shape && device
          ? `${shape.width} × ${shape.depth} × ${shape.height} mm; ${device.ratedVoltage ?? "?"} V; ${device.ratedPower ?? "?"} W; ${shape.annualEnergyKWh ?? "?"} kWh/Jahr; SN: ${asset(item).serial}`
          : "",
      ]);
    }
  for (const cable of Object.values(project.electrical.cables))
    rows.push([
      "Leitung",
      cable.label,
      cable.type,
      project.floors[cable.floorId]!.name,
      statusLabels[asset(cable).status],
      (cableLengths(project, cable).totalLength / 1000).toFixed(2),
      "m",
      `${cable.conductorCount ?? "?"} × ${cable.conductorCrossSection ?? "?"} mm²; inkl. Steigstrecke/Reserve`,
    ]);
  for (const item of Object.values(project.furniture))
    rows.push([
      "Möbel",
      "",
      item.name,
      project.floors[item.floorId]!.name,
      statusLabels[asset(item).status],
      "1",
      "Stück",
      `${item.width} × ${item.depth} × ${item.height} mm`,
    ]);
  for (const item of Object.values(project.electrical.protectionDevices)) {
    const board = project.electrical.distributionBoards[item.distributionBoardId]!;
    rows.push([
      "Schutzgerät",
      item.label,
      item.type,
      project.floors[board.floorId]!.name,
      statusLabels[asset(board).status],
      "1",
      "Stück",
      `${item.characteristic} ${item.ratedCurrent ?? "?"} A · ${board.label}`,
    ]);
  }
  const book = housebook(project);
  for (const item of book.networkNodes)
    rows.push([
      "Netzwerk",
      "",
      item.name,
      project.floors[item.floorId]?.name ?? "Etage fehlt",
      "Dokumentiert",
      "1",
      "Stück",
      `${networkLabels[item.kind]} · ${item.ports} Ports · ${item.details?.ssid ?? ""} · ${item.details?.location ?? ""}`,
    ]);
  for (const item of homeBook(project).items)
    rows.push([
      homeKinds[item.kind],
      item.asset.serial,
      item.name,
      item.location,
      statusLabels[item.asset.status],
      "1",
      "Eintrag",
      item.details,
    ]);
  for (const link of book.networkLinks) {
    const a = book.networkNodes.find((n) => n.id === link.from)!,
      b = book.networkNodes.find((n) => n.id === link.to)!;
    const length =
      Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) +
      Math.abs((project.floors[a.floorId]?.elevation ?? 0) - (project.floors[b.floorId]?.elevation ?? 0)) +
      link.allowance;
    rows.push([
      "Netzwerkkabel",
      link.name,
      link.cableType,
      project.floors[a.floorId]?.name ?? "",
      "Dokumentiert",
      (length / 1000).toFixed(2),
      "m",
      `${a.name}:${link.fromPort} → ${b.name}:${link.toPort} · Luftlinie/Etagenhöhe/Zuschlag`,
    ]);
  }
  const net = utilities(project);
  for (const node of Object.values(net.nodes))
    rows.push([
      "Rohrnetz-Komponente",
      "",
      node.name,
      project.floors[node.floorId]!.name,
      statusLabels[asset(node).status],
      "1",
      "Stück",
      `${nodeKinds[node.kind]}; ${node.media.map((m) => media[m].short).join("/")}; ${node.width} × ${node.depth} × ${node.height} mm; Heizleistung ${node.heatOutputW ?? "?"} W`,
    ]);
  for (const pipe of Object.values(net.pipes))
    rows.push([
      "Rohrleitung",
      pipe.name,
      media[pipe.medium].label,
      project.floors[pipe.floorId]!.name,
      statusLabels[asset(pipe).status],
      (pipeLength(project, pipe) / 1000).toFixed(2),
      "m",
      `${pipe.material || "Material unbekannt"}; DN ${pipe.nominalDiameter ?? "?"}; Dämmung ${pipe.insulation} mm; inkl. Höhenunterschied/Zuschlag`,
    ]);
  return rows;
}
export function csv(rows: string[][]) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((cell) => `"${(/^[=+@\-\t\r]/.test(cell) ? "'" + cell : cell).replace(/"/g, '""')}"`)
          .join(";"),
      )
      .join("\r\n")
  );
}
import { addPdfFooter } from "./pdfFooter";
let fontData: Promise<string> | undefined;
export async function embedFont(doc: import("jspdf").jsPDF) {
  fontData ??= fetch(`${import.meta.env.BASE_URL}fonts/NotoSans-Regular.ttf`)
    .then(async (response) => {
      if (!response.ok) throw new Error("PDF-Schrift konnte nicht geladen werden.");
      const bytes = new Uint8Array(await response.arrayBuffer());
      let value = "";
      for (let i = 0; i < bytes.length; i += 8192)
        value += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return btoa(value);
    })
    .catch((error) => {
      fontData = undefined;
      throw error;
    });
  doc.addFileToVFS("NotoSans-Regular.ttf", await fontData);
  doc.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
  doc.setFont("NotoSans", "normal");
}
export async function exportPlanPdf(
  project: Project,
  floorId: string,
  scale: number,
  mode: "building" | "electrical" | "all",
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" }),
    primitives = planPrimitives(project, floorId, mode),
    b = planBounds(primitives);
  await embedFont(doc);
  const width = 267,
    height = 154,
    columns = Math.ceil(b.width / scale / width),
    rows = Math.ceil(b.height / scale / height);
  if (columns * rows > 100) throw new Error("Mehr als 100 Seiten. Bitte kleineren Druckmaßstab wählen.");
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      if (row || col) doc.addPage();
      doc.setFontSize(12);
      doc.setTextColor("#23383b");
      doc.text(`${project.name.slice(0, 65)} | ${project.floors[floorId]!.name.slice(0, 30)}`, 15, 12);
      doc.setFontSize(8);
      doc.text(
        `1:${scale} | Blatt ${row * columns + col + 1}/${rows * columns} | Raster ${col + 1}/${row + 1} | Druck: 100 %, keine Anpassung`,
        15,
        19,
      );
      const x = (p: Vec2) => 15 + (p.x - b.x) / scale - col * width,
        y = (p: Vec2) => 25 + (b.y - p.y) / scale - row * height;
      doc.saveGraphicsState();
      doc.rect(15, 25, width, height, null);
      doc.clip();
      doc.discardPath();
      for (const primitive of primitives) {
        if (primitive.kind === "line") {
          doc.setDrawColor(primitive.color);
          doc.setLineWidth(primitive.width / scale);
          primitive.points
            .slice(1)
            .forEach((p, i) => doc.line(x(primitive.points[i]!), y(primitive.points[i]!), x(p), y(p)));
        } else {
          doc.setTextColor(primitive.color);
          doc.setFontSize((primitive.size / scale) * 2.83465);
          doc.text(primitive.text, x(primitive.position), y(primitive.position));
        }
      }
      doc.restoreGraphicsState();
      doc.setDrawColor("#dce3de");
      doc.setLineWidth(0.2);
      doc.rect(15, 25, width, height);
      doc.setTextColor("#334b50");
      doc.setFontSize(7);
      doc.text("Wandachsmaße | Bestand: grau / Geplant: blau / Entfernen: rot / Umgesetzt: grün", 15, 186);
      doc.text(
        "S Steckdose · V Verbraucher · L Schalter · R Schaltgruppe · T Trafo · E Einspeisung · Z Zähler · UV Verteiler · A Abzweig",
        15,
        191,
      );
      doc.setDrawColor("#334b50");
      doc.setLineWidth(0.5);
      doc.line(15, 198, 15 + 1000 / scale, 198);
      doc.text("1 m", 17 + 1000 / scale, 199);
    }
  addPdfFooter(doc);
  doc.save("Hausplan.pdf");
}
export async function exportInventoryPdf(project: Project) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 22;
  await embedFont(doc);
  const line = (value: string, heading = false) => {
    doc.setFontSize(heading ? 12 : 9);
    const lines = doc.splitTextToSize(value, 178) as string[];
    for (const item of lines) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(item, 16, y);
      y += heading ? 7 : 5;
    }
  };
  line(`${project.name} - Verteiler und Material`, true);
  for (const board of Object.values(project.electrical.distributionBoards)) {
    line(`${board.label} ${board.name}`, true);
    for (const circuit of Object.values(project.electrical.circuits).filter(
      (c) => c.distributionBoardId === board.id,
    )) {
      const protection = circuit.protectionDeviceId
        ? project.electrical.protectionDevices[circuit.protectionDeviceId]
        : null;
      const members = circuitMembers(project, circuit.id);
      line(
        `${circuit.label} | ${circuit.name} | ${circuit.phase} | ${protection ? `${protection.characteristic}${protection.ratedCurrent ?? "?"} A` : "Schutzgerät fehlt"} | ${members.outlets.length} Steckdosen | ${members.knownPower} W Nennleistung`,
      );
    }
  }
  line("Materialbestand (keine automatisch berechnete Bestellung)", true);
  for (const row of materialRows(project).slice(1))
    line(`${row[1]} ${row[2]} | ${row[3]} | ${row[4]} | ${row[5]} ${row[6]} ${row[7]}`);
  addPdfFooter(doc);
  doc.save("Verteiler-und-Material.pdf");
}
