import { expect, it } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { addFurniture } from "../../src/furniture/actions";
import { furnitureHandle, resizeFurniture, resizeHandles } from "../../src/furniture/resize";

it.each([0, Math.PI / 2, Math.PI / 5])(
  "Griffe erhalten die gegenüberliegende Kante bei Rotation %s",
  (rotation) => {
    for (let handle = 0; handle < 8; handle++) {
      const p = createProject();
      const id = addFurniture(p, p.floorOrder[0]!, { x: 3000, y: 4000 }, "sofa");
      const item = p.furniture[id]!;
      item.rotation = rotation;
      const before = structuredClone(item);
      const fixed = furnitureHandle(item, (handle + 4) % 8);
      const h = resizeHandles[handle]!;
      const x = h.x * 500,
        y = h.y * 300;
      resizeFurniture(p, id, handle, {
        x: x * Math.cos(rotation) - y * Math.sin(rotation),
        y: x * Math.sin(rotation) + y * Math.cos(rotation),
      });
      expect(item.width).toBeCloseTo(before.width + (h.x ? 500 : 0));
      expect(item.depth).toBeCloseTo(before.depth + (h.y ? 300 : 0));
      const after = furnitureHandle(item, (handle + 4) % 8);
      expect(after.x).toBeCloseTo(fixed.x);
      expect(after.y).toBeCloseTo(fixed.y);
      expect(item.height).toBe(before.height);
      expect(item.rotation).toBe(rotation);
    }
  },
);

it("rastet Maße ein, verhindert Umklappen und respektiert gesperrte und unsichtbare Ebenen", () => {
  const p = createProject();
  const id = addFurniture(p, p.floorOrder[0]!, { x: 0, y: 0 }, "sofa");
  const item = p.furniture[id]!;
  resizeFurniture(p, id, 3, { x: 260, y: 900 }, 100);
  expect(item.width).toBe(2500);
  expect(item.depth).toBe(900);
  const fixed = furnitureHandle(item, 7);
  resizeFurniture(p, id, 3, { x: -10000, y: 0 });
  expect(item.width).toBe(1);
  expect(furnitureHandle(item, 7)).toEqual(fixed);
  const before = structuredClone(item);
  p.layers[item.layerId]!.locked = true;
  resizeFurniture(p, id, 3, { x: 500, y: 0 });
  expect(item).toEqual(before);
  p.layers[item.layerId]!.locked = false;
  p.layers[item.layerId]!.visible = false;
  resizeFurniture(p, id, 3, { x: 500, y: 0 });
  expect(item).toEqual(before);
});
