/** Undirected continuity network, with the outward direction of protected branches retained. */
export interface ConductorEdge {
  from: string;
  to: string;
  protections: string[];
}
export class ConductorNetwork {
  edges: ConductorEdge[] = [];
  private adjacent = new Map<string, number[]>();
  add(from: string, to: string, protections: string[] = []) {
    const index = this.edges.push({ from, to, protections }) - 1;
    for (const pin of [from, to]) {
      const indices = this.adjacent.get(pin) ?? [];
      indices.push(index);
      this.adjacent.set(pin, indices);
    }
  }
  path(start: string, end: string, exclude = -1): { index: number; direction: number }[] | null {
    const previous = new Map<string, { pin: string; index: number; direction: number }>();
    const queue = [start],
      visited = new Set(queue);
    for (let i = 0; i < queue.length; i++) {
      const pin = queue[i]!;
      if (pin === end) {
        const result = [];
        for (let p = end; p !== start;) {
          const step = previous.get(p)!;
          result.push({ index: step.index, direction: step.direction });
          p = step.pin;
        }
        return result.reverse();
      }
      for (const index of this.adjacent.get(pin) ?? []) {
        if (index === exclude) continue;
        const edge = this.edges[index]!,
          direction = edge.from === pin ? 1 : -1;
        const next = direction === 1 ? edge.to : edge.from;
        if (visited.has(next)) continue;
        visited.add(next);
        previous.set(next, { pin, index, direction });
        queue.push(next);
      }
    }
    return null;
  }
  /** Parallel ideal paths have indeterminate current sharing. */
  ambiguous(path: { index: number }[]): boolean {
    return path.some(({ index }) => {
      const edge = this.edges[index]!;
      return this.path(edge.from, edge.to, index) !== null;
    });
  }
}
