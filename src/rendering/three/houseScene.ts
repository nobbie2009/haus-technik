import * as T from "three";
import type { Project } from "../../models/project";
import type { Selection } from "../../editor/types";
import { floorReference, orderedFloorIds } from "../../models/floor";
import { elementTables } from "../../core/elementTables";
import { asset } from "../../housebook/model";
import { isStair, stairTarget } from "../../furniture/stairs";

export function wallPanels(
  length: number,
  height: number,
  openings: { position: number; width: number; height: number; sillHeight?: number }[],
) {
  const cuts = openings.map((o) => ({
    left: Math.max(0, o.position - o.width / 2),
    right: Math.min(length, o.position + o.width / 2),
    bottom: Math.max(0, o.sillHeight ?? 0),
    top: Math.min(height, (o.sillHeight ?? 0) + o.height),
  }));
  const xs = [
    ...new Set([0, length, ...cuts.flatMap((c) => [c.left, c.right]).filter((x) => x >= 0 && x <= length)]),
  ].sort((a, b) => a - b);
  const ys = [
    ...new Set([0, height, ...cuts.flatMap((c) => [c.bottom, c.top]).filter((y) => y >= 0 && y <= height)]),
  ].sort((a, b) => a - b);
  return xs.slice(1).flatMap((right, i) =>
    ys.slice(1).flatMap((top, j) => {
      const left = xs[i]!,
        bottom = ys[j]!;
      const x = (left + right) / 2,
        y = (bottom + top) / 2;
      return cuts.some((c) => x > c.left && x < c.right && y > c.bottom && y < c.top)
        ? []
        : [{ left, right, bottom, top }];
    }),
  );
}
export function buildHouseScene(p: Project, floorIds: string[], explode: number, opacity: number) {
  const root = new T.Group();
  const order = orderedFloorIds(p);
  const material = (color: number, alpha = 1) =>
    new T.MeshStandardMaterial({
      color,
      transparent: alpha < 1,
      opacity: alpha,
      roughness: 0.85,
      side: T.DoubleSide,
      depthWrite: alpha === 1,
    });
  const box = (
    group: T.Group,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    color: number,
    target: Selection,
    alpha = 1,
  ) => {
    const mesh = new T.Mesh(
      new T.BoxGeometry(width / 1000, height / 1000, depth / 1000),
      material(color, alpha),
    );
    mesh.position.set(x / 1000, y / 1000, z / 1000);
    mesh.userData.target = target;
    group.add(mesh);
    return mesh;
  };
  for (const floorId of floorIds) {
    const floor = p.floors[floorId];
    if (!floor) continue;
    const group = new T.Group(),
      ref = floorReference(floor);
    group.position.set(
      ref.x / 1000,
      floor.elevation / 1000 + order.indexOf(floorId) * explode,
      -ref.y / 1000,
    );
    root.add(group);
    for (const room of Object.values(p.rooms).filter(
      (r) => r.floorId === floorId && p.layers[r.layerId]?.visible,
    )) {
      const points = room.polygon.pointIds.map((id) => p.points[id]!.position);
      const shape = new T.Shape(points.map((v) => new T.Vector2(v.x / 1000, v.y / 1000)));
      const mesh = new T.Mesh(new T.ShapeGeometry(shape), material(0xdce4d6));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = -0.005;
      mesh.userData.target = { kind: "rooms", id: room.id };
      group.add(mesh);
    }
    for (const wall of Object.values(p.walls).filter(
      (w) => w.floorId === floorId && p.layers[w.layerId]?.visible,
    )) {
      const a = p.points[wall.startPointId]!.position,
        b = p.points[wall.endPointId]!.position;
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      if (!length) continue;
      const angle = Math.atan2(b.y - a.y, b.x - a.x),
        segment = new T.Group();
      segment.position.set(a.x / 1000, 0, -a.y / 1000);
      segment.rotation.y = angle;
      group.add(segment);
      const openings = [...Object.values(p.doors), ...Object.values(p.windows)].filter(
        (o) => o.wallId === wall.id,
      );
      for (const part of wallPanels(length, wall.height, openings))
        box(
          segment,
          part.right - part.left,
          part.top - part.bottom,
          wall.thickness,
          (part.left + part.right) / 2,
          (part.bottom + part.top) / 2,
          0,
          0xe4dfd3,
          { kind: "walls", id: wall.id },
          opacity,
        );
      for (const o of openings) {
        const window = "sillHeight" in o;
        box(
          segment,
          o.width,
          o.height,
          30,
          o.position,
          (window ? o.sillHeight : 0) + o.height / 2,
          0,
          window ? 0x72b5cd : 0x94785c,
          { kind: window ? "windows" : "doors", id: o.id },
          window ? 0.35 : opacity,
        );
      }
    }
    for (const f of Object.values(p.furniture).filter(
      (f) => f.floorId === floorId && p.layers[f.layerId]?.visible,
    )) {
      const g = new T.Group();
      g.position.set(f.position.x / 1000, 0, -f.position.y / 1000);
      g.rotation.y = f.rotation;
      group.add(g);
      const target: Selection = { kind: "furniture", id: f.id };
      if (isStair(f)) {
        const other = stairTarget(p, f),
          rise = other ? other.elevation - floor.elevation : f.height;
        for (let i = 0; i < 12; i++) {
          const h = (Math.abs(rise) * (i + 1)) / 12;
          box(
            g,
            f.width,
            h,
            f.depth / 12,
            0,
            rise >= 0 ? h / 2 : -h / 2,
            -f.depth / 2 + (f.depth * (i + 0.5)) / 12,
            0xa38a65,
            target,
          );
        }
      } else box(g, f.width, f.height, f.depth, 0, f.height / 2, 0, 0x839d8b, target);
    }
    for (const [kind, table] of Object.entries(elementTables(p))) {
      if (
        ![
          "devices",
          "outlets",
          "switches",
          "distributionBoards",
          "networkNodes",
          "utilityNodes",
          "transformers",
        ].includes(kind)
      )
        continue;
      for (const n of Object.values(table)) {
        if (
          n.floorId !== floorId ||
          !p.layers[n.layerId]?.visible ||
          !("position" in n) ||
          typeof n.position !== "object"
        )
          continue;
        const mounting = asset(n).mounting;
        const h = mounting?.height ?? 0;
        box(
          group,
          200,
          200,
          160,
          n.position.x,
          h + 100,
          -n.position.y,
          kind === "networkNodes" ? 0x7964a4 : 0xd69a3c,
          { kind: kind as Selection["kind"], id: n.id },
        );
      }
    }
  }
  return root;
}
export function disposeHouseScene(root: T.Object3D) {
  root.traverse((o) => {
    if (o instanceof T.Mesh) {
      o.geometry.dispose();
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      materials.forEach((m) => m.dispose());
    }
  });
}
