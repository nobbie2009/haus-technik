import { placeSolar, solarPlacement } from "../../electrical/solarPlan";
import { furnitureHandle, resizeFurniture, resizeHandles } from "../../furniture/resize";
import { addUtilityNode } from "../../utilities/model";
import { confirmPipe } from "../../utilities/drawing";
import { confirmCable } from "./cableDrawing";
import { confirmNetworkRoute } from "../../network/drawing";
import { confirmConnection } from "./connectionDrawing";
import { confirmSite } from "../../site/drawing";
import { addNetworkNode } from "../../network/model";
import { addElectrical } from "../../electrical/actions";
import { placeConsumer } from "../../electrical/placeConsumer";
import { addFurniture } from "../../furniture/actions";
import { useEffect, useMemo, useRef } from "react";
import type { PointerEvent } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { panBy, screenToWorld, zoomAt } from "../../geometry/coordinates";
import type { Viewport } from "../../geometry/coordinates";
import { subtract } from "../../geometry/vector";
import type { Vec2 } from "../../models/common";
import type { Selection } from "../types";
import { toolLabels } from "../types";
import { hitTest, hitWallPoint } from "./hitTest";
import { updateCursor, confirmDrawing } from "./drawing";
import { moveSelection, movePoint } from "../actions/edit";
import { createOpening, openingPosition } from "../actions/create";

interface Gesture {
  type: "pan" | "move" | "connect" | "point" | "resize";
  pointId?: string;
  screen: Vec2;
  world: Vec2;
  selection: Selection[];
  moved: boolean;
}

export function useCanvasInteraction() {
  const host = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const touches = useRef(new Map<number, Vec2>());
  const pinch = useRef<{ viewport: Viewport; center: Vec2; distance: number } | null>(null);
  const navigating = useRef(false);
  const pen = useRef<number | null>(null);
  const project = useProjectStore((s) => s.project);
  const editor = useEditorStore();
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry)
        useEditorStore.setState({
          size: { width: entry.contentRect.width, height: entry.contentRect.height },
        });
    });
    if (host.current) observer.observe(host.current);
    const element = host.current!;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const current = useEditorStore.getState();
      const rect = element.getBoundingClientRect();
      useEditorStore.setState({
        viewport: zoomAt(
          current.viewport,
          { x: event.clientX - rect.left, y: event.clientY - rect.top },
          Math.max(0.003, Math.min(2, current.viewport.scale * Math.exp(-event.deltaY * 0.001))),
        ),
      });
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      observer.disconnect();
      element.removeEventListener("wheel", wheel);
    };
  }, []);
  useEffect(() => {
    if (
      !editor.dragOffset &&
      (gesture.current?.type === "move" ||
        gesture.current?.type === "point" ||
        gesture.current?.type === "resize") &&
      gesture.current.moved
    )
      gesture.current = null;
  }, [editor.dragOffset]);
  const preview = useMemo(() => {
    if (!editor.dragOffset) return project;
    const next = structuredClone(project);
    if (editor.dragResize)
      resizeFurniture(
        next,
        editor.dragResize.id,
        editor.dragResize.handle,
        editor.dragOffset,
        editor.dragResize.grid,
      );
    else if (editor.dragPointId) movePoint(next, editor.dragPointId, editor.dragOffset);
    else moveSelection(next, editor.selection, editor.dragOffset);
    return next;
  }, [project, editor.selection, editor.dragOffset, editor.dragPointId, editor.dragResize]);
  const pointer = (event: PointerEvent<HTMLDivElement>): Vec2 => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const performDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, input, label, select") || !editor.ready) return;
    event.currentTarget.focus();
    const screen = pointer(event);
    const world = screenToWorld(screen, editor.viewport);
    if (event.button === 1 || editor.spacePressed || editor.tool === "pan") {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      gesture.current = { type: "pan", screen, world, selection: [], moved: false };
      return;
    }
    if (event.button !== 0) return;
    if (editor.tool === "networkCable") {
      const position = updateCursor(world, event.shiftKey);
      if (!editor.networkCableId) {
        confirmNetworkRoute(position, world);
        return;
      }
      const current = useEditorStore.getState();
      useEditorStore.setState({ draft: { ...current.draft, points: [...current.draft.points, position] } });
      return;
    }
    if (editor.tool === "utilityPipe") {
      confirmPipe(updateCursor(world, event.shiftKey));
      return;
    }
    if (editor.tool === "utilityNode") {
      let id = "";
      const position = updateCursor(world, false);
      if (
        useProjectStore.getState().commit("Rohrnetz-Komponente platzieren", (p) => {
          id = addUtilityNode(p, editor.floorId, position, editor.utilityKind, editor.utilityMedium);
        })
      )
        useEditorStore.setState({ selection: [{ kind: "utilityNodes", id }] });
      return;
    }
    if (editor.tool === "connect") {
      const hadStart = useEditorStore.getState().cableStartId;
      confirmConnection(world);
      if (!hadStart && useEditorStore.getState().cableStartId) {
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = { type: "connect", screen, world, selection: [], moved: false };
      }
      return;
    }
    if (editor.tool === "cable") {
      confirmCable(updateCursor(world, event.shiftKey));
      return;
    }
    if (editor.tool === "site") {
      confirmSite(updateCursor(world, event.shiftKey));
      return;
    }
    if (editor.tool === "network") {
      let id = "";
      const position = updateCursor(world, false);
      if (
        useProjectStore.getState().commit("Netzwerkgerät platzieren", (draft) => {
          id = addNetworkNode(
            draft,
            editor.floorId,
            position,
            editor.networkKind,
            editor.zigbeePlacementAddress ?? undefined,
          );
        })
      )
        useEditorStore.setState({ selection: [{ kind: "networkNodes", id }], tool: "select" });
      return;
    }
    if (editor.tool === "electrical") {
      let id = "";
      const position = updateCursor(world, false);
      if (
        useProjectStore.getState().commit("Elektroobjekt platzieren", (draft) => {
          id = editor.solarPlacement
            ? placeSolar(
                draft,
                editor.floorId,
                position,
                editor.solarPlacement.kind,
                editor.solarPlacement.plantId,
              )
            : editor.consumerEntryId
              ? placeConsumer(draft, editor.floorId, position, editor.consumerEntryId)
              : addElectrical(draft, editor.floorId, position, editor.electricalKind);
        })
      )
        useEditorStore.setState({
          selection: [{ kind: editor.electricalKind, id }],
          ...(editor.solarPlacement
            ? {
                solarPlacement: {
                  ...editor.solarPlacement,
                  plantId: solarPlacement(useProjectStore.getState().project.electrical.devices[id]!)!
                    .plantId,
                },
              }
            : {}),
        });
      return;
    }
    if (editor.tool === "furniture") {
      let id = "";
      const position = updateCursor(world, false);
      if (
        useProjectStore.getState().commit("Objekt platzieren", (draft) => {
          id = addFurniture(draft, editor.floorId, position, editor.furnitureType);
        })
      ) {
        useEditorStore.setState({ selection: [{ kind: "furniture", id }] });
      }
      return;
    }
    if (editor.tool === "select") {
      const selected = editor.selection.length === 1 ? editor.selection[0] : null;
      const item = selected?.kind === "furniture" ? project.furniture[selected.id] : null;
      if (
        item &&
        editor.category === "furniture" &&
        !event.shiftKey &&
        !editor.multiSelect &&
        item.floorId === editor.floorId &&
        project.layers[item.layerId]?.visible &&
        !project.layers[item.layerId]?.locked
      ) {
        const radius = (event.pointerType === "touch" ? 22 : 10) / editor.viewport.scale;
        const nearest = resizeHandles
          .map((_, handle) => {
            const p = furnitureHandle(item, handle);
            return { handle, distance: Math.hypot(p.x - world.x, p.y - world.y) };
          })
          .sort((a, b) => a.distance - b.distance)[0]!;
        if (
          nearest.distance <= radius &&
          nearest.distance < Math.hypot(world.x - item.position.x, world.y - item.position.y)
        ) {
          useEditorStore.setState({
            dragResize: { id: item.id, handle: nearest.handle, grid: editor.snapGrid ? editor.gridSize : 0 },
            dragOffset: null,
          });
          event.currentTarget.setPointerCapture(event.pointerId);
          gesture.current = { type: "resize", screen, world, selection: editor.selection, moved: false };
          return;
        }
      }

      const pointHit =
        editor.category === "building" && !event.shiftKey && !editor.multiSelect
          ? hitWallPoint(
              project,
              editor.floorId,
              world,
              editor.viewport.scale,
              event.pointerType === "touch" ? 22 : 12,
            )
          : null;
      if (pointHit) {
        const room = editor.selection.find(
          (s) => s.kind === "rooms" && project.rooms[s.id]?.polygon.pointIds.includes(pointHit.pointId),
        );
        const selection: Selection[] = room ? [room] : [{ kind: "walls", id: pointHit.wallId }];
        useEditorStore.setState({ selection, dragPointId: pointHit.pointId, dragOffset: null });
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = {
          type: "point",
          pointId: pointHit.pointId,
          screen,
          world,
          selection,
          moved: false,
        };
        return;
      }

      const hit = hitTest(project, editor.floorId, world, editor.viewport.scale, false, editor.category);
      let selection: Selection[] = [];
      if (hit) {
        const already = editor.selection.some((s) => s.id === hit.id);
        selection =
          event.shiftKey || editor.multiSelect
            ? already
              ? editor.selection.filter((s) => s.id !== hit.id)
              : [...editor.selection, hit]
            : already
              ? editor.selection
              : [hit];
      }
      useEditorStore.setState({ selection });
      if (hit && !event.shiftKey && !editor.multiSelect) {
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = { type: "move", screen, world, selection, moved: false };
      }
      return;
    }
    if (editor.tool === "door" || editor.tool === "window") {
      const hit = hitTest(project, editor.floorId, world, editor.viewport.scale, true);
      if (!hit) {
        useProjectStore.setState({ error: "Bitte auf eine Wand klicken." });
        return;
      }
      let selected: Selection = hit;
      if (
        useProjectStore.getState().commit(`${toolLabels[editor.tool]} einsetzen`, (draft) => {
          selected = createOpening(
            draft,
            hit.id,
            openingPosition(draft, hit.id, world),
            editor.tool === "door" ? "doors" : "windows",
          );
        })
      )
        useEditorStore.setState({ selection: [selected] });
      return;
    }
    confirmDrawing(updateCursor(world, event.shiftKey));
  };
  const touchPair = () => {
    const [a, b] = [...touches.current.values()];
    if (!a || !b) return null;
    return {
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    };
  };
  const down = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, input, label, select") || !editor.ready) return;
    if (event.pointerType === "touch") {
      if (pen.current !== null) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      touches.current.set(event.pointerId, pointer(event));
      const pair = touchPair();
      if (pair) {
        navigating.current = true;
        pinch.current = { ...pair, viewport: useEditorStore.getState().viewport };
        gesture.current = null;
        useEditorStore.setState({ dragPointId: null, dragResize: null, dragOffset: null });
      } else if (!navigating.current && (editor.tool === "select" || editor.tool === "pan"))
        performDown(event);
      return;
    }
    if (event.pointerType === "pen") {
      if (touches.current.size) return;
      pen.current = event.pointerId;
    }
    performDown(event);
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, input, label, select")) return;
    const screen = pointer(event);
    if (event.pointerType === "touch") {
      if (!touches.current.has(event.pointerId)) return;
      touches.current.set(event.pointerId, screen);
      const pair = touchPair();
      if (navigating.current) {
        if (pair && pinch.current) {
          const initial = pinch.current;
          const scale = Math.max(
            0.003,
            Math.min(2, (initial.viewport.scale * pair.distance) / initial.distance),
          );
          useEditorStore.setState({
            viewport: panBy(
              zoomAt(initial.viewport, initial.center, scale),
              subtract(pair.center, initial.center),
            ),
          });
        }
        return;
      }
    }
    const current = useEditorStore.getState();
    const world = screenToWorld(screen, current.viewport);
    const active = gesture.current;
    if (active?.type === "connect") {
      if (current.tool !== "connect" || !current.cableStartId) {
        gesture.current = null;
        return;
      }
      active.moved ||= Math.hypot(screen.x - active.screen.x, screen.y - active.screen.y) >= 3;
      updateCursor(world, false);
      return;
    }
    if (active?.type === "pan") {
      useEditorStore.setState({ viewport: panBy(current.viewport, subtract(screen, active.screen)) });
      active.screen = screen;
      return;
    }
    if (active?.type === "point" && current.dragPointId !== active.pointId) {
      gesture.current = null;
      return;
    }
    if (active?.type === "resize" && !current.dragResize) {
      gesture.current = null;
      return;
    }
    if (active?.type === "move" || active?.type === "point" || active?.type === "resize") {
      if (Math.hypot(screen.x - active.screen.x, screen.y - active.screen.y) < 3 && !active.moved) return;
      active.moved = true;
      const delta = subtract(world, active.world);
      if (current.snapGrid && active.type !== "resize") {
        delta.x = Math.round(delta.x / current.gridSize) * current.gridSize;
        delta.y = Math.round(delta.y / current.gridSize) * current.gridSize;
      }
      useEditorStore.setState({ dragOffset: delta, cursor: world });
      return;
    }
    updateCursor(world, event.shiftKey);
  };
  const up = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      if (!touches.current.has(event.pointerId)) return;
      touches.current.delete(event.pointerId);
      if (navigating.current) {
        if (!touches.current.size) {
          navigating.current = false;
          pinch.current = null;
        }
        return;
      }
      // Place only on release: a second finger can start navigation without editing the model.
      if (!["select", "pan"].includes(useEditorStore.getState().tool)) performDown(event);
    }
    if (event.pointerType === "pen") {
      if (pen.current !== event.pointerId) return;
      pen.current = null;
    }
    const active = gesture.current;
    const current = useEditorStore.getState();
    if (active?.type === "connect" && active.moved && current.tool === "connect" && current.cableStartId)
      confirmConnection(screenToWorld(pointer(event), current.viewport));
    const offset = useEditorStore.getState().dragOffset;
    if (active?.type === "move" && active.moved && offset)
      useProjectStore
        .getState()
        .commit("Auswahl verschieben", (draft) => moveSelection(draft, active.selection, offset));
    if (active?.type === "point" && active.moved && offset && active.pointId)
      useProjectStore
        .getState()
        .commit("Eckpunkt verschieben", (draft) => movePoint(draft, active.pointId!, offset));
    if (active?.type === "resize" && active.moved && offset && current.dragResize) {
      const resize = current.dragResize;
      useProjectStore
        .getState()
        .commit("Möbelgröße ändern", (draft) =>
          resizeFurniture(draft, resize.id, resize.handle, offset, resize.grid),
        );
    }
    gesture.current = null;
    useEditorStore.setState({ dragPointId: null, dragResize: null, dragOffset: null });
  };
  const zoom = (factor: number) =>
    useEditorStore.setState({
      viewport: zoomAt(
        editor.viewport,
        { x: editor.size.width / 2, y: editor.size.height / 2 },
        Math.max(0.003, Math.min(2, editor.viewport.scale * factor)),
      ),
    });

  const cancel = () => {
    if (gesture.current?.type === "connect") useEditorStore.getState().cancel();
    gesture.current = null;
    touches.current.clear();
    pinch.current = null;
    navigating.current = false;
    pen.current = null;
    useEditorStore.setState({ dragPointId: null, dragResize: null, dragOffset: null });
  };
  return { host, project, editor, preview, down, move, up, cancel, zoom };
}
