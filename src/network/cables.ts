import type { Project } from "../models/project";
import type { Housebook } from "../housebook/model";
import type { NetworkNode } from "./model";

export function networkCableLength(
  project: Project,
  a: NetworkNode,
  b: NetworkNode,
  link: Housebook["networkLinks"][number],
) {
  const points = [a.position, ...(link.path ?? []), b.position];
  return (
    points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y), 0) +
    Math.abs((project.floors[a.floorId]?.elevation ?? 0) - (project.floors[b.floorId]?.elevation ?? 0)) +
    link.allowance
  );
}
