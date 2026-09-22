import type { Project } from "../models/project";
import type { Housebook } from "../housebook/model";
import type { NetworkNode } from "./model";

export function networkCableLength(
  project: Project,
  a: NetworkNode,
  b: NetworkNode,
  link: Housebook["networkLinks"][number],
) {
  if (link.route) {
    const route = [
      { floorId: a.floorId, position: a.position },
      ...link.route,
      { floorId: b.floorId, position: b.position },
    ];
    return route.slice(1).reduce((sum, point, i) => {
      const previous = route[i]!;
      return (
        sum +
        Math.hypot(point.position.x - previous.position.x, point.position.y - previous.position.y) +
        Math.abs(
          (project.floors[point.floorId]?.elevation ?? 0) -
            (project.floors[previous.floorId]?.elevation ?? 0),
        )
      );
    }, link.allowance);
  }
  const points = [a.position, ...(link.path ?? []), b.position];
  return (
    points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y), 0) +
    Math.abs((project.floors[a.floorId]?.elevation ?? 0) - (project.floors[b.floorId]?.elevation ?? 0)) +
    link.allowance
  );
}
