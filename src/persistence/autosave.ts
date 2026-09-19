import { projectRepository } from "./indexedDbRepository";
import { errorMessage, useProjectStore } from "../stores/projectStore";
import { useEditorStore } from "../stores/editorStore";
import { fitView } from "../editor/interaction/commands";

let queue: Promise<void> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | undefined;
let initialized = false;

export function saveNow(): Promise<void> {
  clearTimeout(timer);
  const snapshot = useProjectStore.getState().project;
  useProjectStore.setState({ saveStatus: "saving", saveError: null });
  const job = queue.catch(() => undefined).then(() => projectRepository.save(snapshot));
  queue = job;
  return job.then(
    () => {
      if (useProjectStore.getState().project === snapshot)
        useProjectStore.setState({ saveStatus: "saved", saveError: null });
    },
    (error: unknown) => {
      if (useProjectStore.getState().project === snapshot)
        useProjectStore.setState({ saveStatus: "error", saveError: errorMessage(error) });
      throw error;
    },
  );
}

export async function initializePersistence(): Promise<void> {
  if (initialized) return;
  initialized = true;
  try {
    const current = useProjectStore.getState().project;
    const saved = await projectRepository.loadActive();
    // Ein bereits begonnener Entwurf wird nicht durch langsames Laden verdrängt.
    if (saved && useProjectStore.getState().project === current)
      useProjectStore.getState().replace(saved, true);
  } catch (error) {
    useProjectStore.setState({ saveStatus: "error", saveError: `Lokaler Speicher: ${errorMessage(error)}` });
  }
  useEditorStore.getState().setFloor(useProjectStore.getState().project.floorOrder[0]!);
  useEditorStore.setState({ ready: true });
  if (
    useProjectStore.getState().project.metadata.housebook ||
    Object.keys(useProjectStore.getState().project.points).length ||
    Object.keys(useProjectStore.getState().project.furniture).length ||
    Object.keys(useProjectStore.getState().project.electrical.junctions).length ||
    Object.keys(useProjectStore.getState().project.electrical.outlets).length ||
    Object.keys(useProjectStore.getState().project.electrical.devices).length ||
    Object.keys(useProjectStore.getState().project.electrical.supplies).length ||
    Object.keys(useProjectStore.getState().project.electrical.meters).length ||
    Object.keys(useProjectStore.getState().project.electrical.switches).length ||
    Object.keys(useProjectStore.getState().project.electrical.controls).length ||
    Object.keys(useProjectStore.getState().project.electrical.transformers).length ||
    Object.keys(useProjectStore.getState().project.electrical.distributionBoards).length
  )
    fitView();
  useProjectStore.subscribe((state, previous) => {
    if (state.project === previous.project) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      void saveNow().catch(() => undefined);
    }, 500);
  });
  window.addEventListener("beforeunload", (event) => {
    if (useProjectStore.getState().saveStatus !== "saved") {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && useProjectStore.getState().saveStatus !== "saved")
      void saveNow().catch(() => undefined);
  });
  if (useProjectStore.getState().saveStatus === "dirty") void saveNow().catch(() => undefined);
}
