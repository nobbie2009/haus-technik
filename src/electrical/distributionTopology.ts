import type { Project } from "../models/project";
import type { Circuit, DistributionBoard } from "./models";

/** Radiale Zuordnung, geordnet von der Wurzel zum angefragten Kasten. */
export function distributionPath(project: Project, boardId: string) {
  const boards: DistributionBoard[] = [];
  const feeders: Circuit[] = [];
  const seen = new Set<string>();
  let next: string | null = boardId;
  let cycle = false;
  while (next) {
    if (seen.has(next)) {
      cycle = true;
      break;
    }
    seen.add(next);
    const board: DistributionBoard | undefined = project.electrical.distributionBoards[next];
    if (!board) break;
    boards.unshift(board);
    const feeder: Circuit | undefined = board.upstreamCircuitId
      ? project.electrical.circuits[board.upstreamCircuitId]
      : undefined;
    if (!feeder) break;
    feeders.unshift(feeder);
    next = feeder.distributionBoardId;
  }
  const root = boards[0];
  const meter = root?.meterId ? project.electrical.meters[root.meterId] : undefined;
  const supplyId = meter?.supplyId ?? root?.supplyId;
  const supply = supplyId ? project.electrical.supplies[supplyId] : undefined;
  return { boards, feeders, meter, supply, cycle };
}

export function canFeedBoard(project: Project, boardId: string, circuitId: string): boolean {
  const circuit = project.electrical.circuits[circuitId];
  if (!circuit) return false;
  const path = distributionPath(project, circuit.distributionBoardId);
  return !path.cycle && !path.boards.some((board) => board.id === boardId);
}
