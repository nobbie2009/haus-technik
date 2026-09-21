import { confirmSite } from "../../site/drawing";
import { confirmPipe } from "../../utilities/drawing";
import { confirmCable } from "./cableDrawing";
import { confirmConnection } from "./connectionDrawing";
import { useEffect } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { saveNow } from "../../persistence/autosave";
import { confirmDrawing, updateCursor } from "./drawing";
import { deleteSelected, duplicateSelected, fitView } from "./commands";
import { moveSelection } from "../actions/edit";
import type { Tool } from "../types";

export function useKeyboard(): void {
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, select, textarea, [contenteditable=true], dialog")) return;
      const editor = useEditorStore.getState();
      const project = useProjectStore.getState();
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && ["z", "y", "s", "d"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        if (event.key.toLowerCase() === "z") {
          editor.cancel();
          event.shiftKey ? project.redo() : project.undo();
        }
        if (event.key.toLowerCase() === "y") {
          editor.cancel();
          project.redo();
        }
        if (event.key.toLowerCase() === "s") void saveNow().catch(() => undefined);
        if (event.key.toLowerCase() === "d") duplicateSelected();
        return;
      }
      if (modifier || event.altKey) return;
      if (event.code === "Space") {
        event.preventDefault();
        useEditorStore.setState({ spacePressed: true });
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        editor.cancel();
        if (!editor.draft.points.length) editor.setTool("select");
        return;
      }
      if (
        (editor.tool === "cable" || editor.tool === "utilityPipe") &&
        event.key === "Backspace" &&
        editor.cableStartId
      ) {
        event.preventDefault();
        if (editor.draft.points.length > 1)
          useEditorStore.setState({ draft: { ...editor.draft, points: editor.draft.points.slice(0, -1) } });
        else editor.cancel();
        return;
      }
      if (
        editor.tool === "site" &&
        event.key === "Backspace" &&
        !editor.draft.input &&
        editor.draft.points.length
      ) {
        event.preventDefault();
        useEditorStore.setState({ draft: { ...editor.draft, points: editor.draft.points.slice(0, -1) } });
        return;
      }
      if (event.key === "Enter" && editor.draft.points.length) {
        if (editor.tool === "site") {
          event.preventDefault();
          confirmSite(editor.draft.cursor ?? editor.cursor, !editor.draft.input);
          return;
        }
        if (editor.tool === "utilityPipe") {
          event.preventDefault();
          confirmPipe(editor.draft.cursor ?? editor.cursor);
          return;
        }
        if (editor.tool === "connect") {
          event.preventDefault();
          confirmConnection(editor.draft.cursor ?? editor.cursor);
          return;
        }
        if (editor.tool === "cable") {
          event.preventDefault();
          confirmCable(editor.draft.cursor ?? editor.cursor, true);
          return;
        }
        event.preventDefault();
        confirmDrawing(
          editor.draft.cursor ?? editor.cursor,
          editor.tool === "polygon" && !editor.draft.input,
        );
        return;
      }
      if (
        ["wall", "polygon", "site"].includes(editor.tool) &&
        editor.draft.points.length &&
        (/^[0-9.,]$/.test(event.key) ||
          event.key === "Backspace" ||
          (editor.draft.input && /^[mc]$/i.test(event.key)))
      ) {
        event.preventDefault();
        useEditorStore.setState({
          draft: {
            ...editor.draft,
            input:
              event.key === "Backspace" ? editor.draft.input.slice(0, -1) : editor.draft.input + event.key,
          },
        });
        updateCursor(editor.cursor, event.shiftKey);
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        return;
      }
      const directions: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: 1 },
        ArrowDown: { x: 0, y: -1 },
      };
      const direction = directions[event.key];
      if (direction && editor.selection.length) {
        event.preventDefault();
        const step = event.shiftKey ? editor.gridSize : 10;
        project.commit("Auswahl verschieben", (draft) =>
          moveSelection(draft, editor.selection, { x: direction.x * step, y: direction.y * step }),
        );
        return;
      }
      const shortcuts: Record<string, Tool> = {
        v: "select",
        h: "pan",
        w: "wall",
        r: "rectangle",
        p: "polygon",
        d: "dimension",
        t: "door",
        f: "window",
        m: "furniture",
        e: "electrical",
        l: "cable",
        a: "connect",
      };
      const tool = shortcuts[event.key.toLowerCase()];
      if (tool) {
        event.preventDefault();
        editor.setTool(tool);
      }
      if (event.key === "Home") {
        event.preventDefault();
        fitView();
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") useEditorStore.setState({ spacePressed: false });
    };
    const blur = () => {
      useEditorStore.setState({ spacePressed: false, dragOffset: null });
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
}
