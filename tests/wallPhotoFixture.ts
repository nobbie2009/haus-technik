import type { Page } from "@playwright/test";
import { createProject } from "../src/core/projectFactory";
import { addWallPath } from "../src/editor/actions/topology";
export function wallProject() {
  const project = createProject("Wanddokumentation");
  const wall = addWallPath(project, project.floorOrder[0]!, { x: 0, y: 0 }, { x: 4000, y: 0 }).wallIds[0]!;
  return { project, wall };
}
export async function wallPng(page: Page): Promise<Buffer> {
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 600;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#dcd8cd";
    c.fillRect(0, 0, 1200, 600);
    c.strokeStyle = "#c4beb1";
    c.lineWidth = 3;
    for (let y = 0; y < 600; y += 100) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(1200, y);
      c.stroke();
      for (let x = (y / 100) % 2 ? 100 : 0; x < 1200; x += 200) c.strokeRect(x, y, 200, 100);
    }
    c.fillStyle = "#777a76";
    c.fillRect(110, 110, 620, 20);
    c.fillRect(710, 110, 20, 320);
    c.fillStyle = "#f9f9f5";
    c.fillRect(686, 392, 68, 68);
    c.strokeStyle = "#565c5b";
    c.strokeRect(686, 392, 68, 68);
    c.beginPath();
    c.arc(720, 426, 21, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "#565c5b";
    c.fillRect(709, 422, 5, 8);
    c.fillRect(726, 422, 5, 8);
    c.fillStyle = "#444b48";
    c.font = "24px sans-serif";
    c.fillText("Synthetisches Testbild · Wand vor dem Verputzen", 30, 560);
    return canvas.toDataURL("image/png").split(",")[1]!;
  });
  return Buffer.from(data, "base64");
}
