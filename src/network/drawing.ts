import { housebook, setHousebook } from "../housebook/model";
import { useEditorStore } from "../stores/editorStore";
import { useProjectStore } from "../stores/projectStore";
import { fitView } from "../editor/interaction/commands";

export function startNetworkPath(id: string) {
  const editor = useEditorStore.getState();
  const book = housebook(useProjectStore.getState().project);
  const link = book.networkLinks.find((l) => l.id === id);
  const a = book.networkNodes.find((n) => n.id === link?.from),
    b = book.networkNodes.find((n) => n.id === link?.to);
  if (!link || !a || !b || a.floorId !== b.floorId) return;
  if (editor.floorId !== a.floorId) {
    editor.setFloor(a.floorId);
    fitView();
  }
  editor.setTool("networkCable");
  useEditorStore.setState({ networkCableId: id, selection: [] });
}
export function finishNetworkPath() {
  const editor = useEditorStore.getState();
  if (!editor.networkCableId) return;
  if (
    useProjectStore.getState().commit("Koax-Leitungsweg speichern", (project) => {
      const book = housebook(project);
      const link = book.networkLinks.find((l) => l.id === editor.networkCableId);
      if (!link) throw new Error("Kabelverbindung fehlt.");
      link.path = editor.draft.points;
      setHousebook(project, book);
    })
  )
    editor.setTool("select");
}
