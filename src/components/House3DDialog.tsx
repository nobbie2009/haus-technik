import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Modal } from "./dialogs/Modal";
import { useProjectStore } from "../stores/projectStore";
import { useEditorStore } from "../stores/editorStore";
import { buildHouseScene, disposeHouseScene } from "../rendering/three/houseScene";
import { elementTables } from "../core/elementTables";
import { categoryForObject } from "../editor/categories";
import type { Selection } from "../editor/types";
export function House3DDialog({ onClose }: { onClose: () => void }) {
  const p = useProjectStore((s) => s.project);
  const [floors, setFloors] = useState(p.floorOrder),
    [explode, setExplode] = useState(0),
    [opacity, setOpacity] = useState(1);
  const [error, setError] = useState(""),
    [picked, setPicked] = useState<Selection | null>(null);
  const host = useRef<HTMLDivElement>(null),
    controlsRef = useRef<OrbitControls | null>(null);
  const go = (target: Selection) => {
    const n = elementTables(p)[target.kind][target.id];
    if (!n) return;
    const editor = useEditorStore.getState();
    editor.setCategory(categoryForObject(target.kind));
    editor.setFloor(n.floorId);
    useEditorStore.setState({ tool: "select", selection: [target] });
    onClose();
  };
  useEffect(() => {
    const node = host.current!;
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({ antialias: true });
    } catch {
      setError(
        "3D benötigt WebGL. Bitte Hardwarebeschleunigung aktivieren oder einen aktuellen Browser verwenden. Der Grundriss bleibt nutzbar.",
      );
      return;
    }
    setError("");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    node.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-label", "Hausmodell drehen und zoomen");
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    const scene = new T.Scene();
    scene.background = new T.Color(0xf1f4ef);
    const model = buildHouseScene(p, floors, explode, opacity);
    scene.add(model);
    scene.add(new T.HemisphereLight(0xffffff, 0x82907b, 2));
    const sun = new T.DirectionalLight(0xffffff, 2);
    sun.position.set(10, 20, 10);
    scene.add(sun);
    const camera = new T.PerspectiveCamera(45, 1, 0.01, 10000);
    const bounds = new T.Box3().setFromObject(model);
    const center = bounds.isEmpty() ? new T.Vector3() : bounds.getCenter(new T.Vector3());
    const size = bounds.isEmpty() ? 10 : Math.max(3, bounds.getSize(new T.Vector3()).length());
    camera.position.copy(center).add(new T.Vector3(size * 0.8, size * 0.7, size * 0.8));
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.target.copy(center);
    controls.update();
    controls.saveState();
    const render = () => renderer.render(scene, camera);
    controls.addEventListener("change", render);
    const resize = () => {
      const width = node.clientWidth,
        height = node.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      render();
    };
    let resizeFrame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    });
    observer.observe(node);
    resize();
    let start = { x: 0, y: 0 };
    let dragged = false;
    let pointers = 0;
    const down = (e: PointerEvent) => {
      pointers++;
      if (pointers > 1) dragged = true;
      else {
        start = { x: e.clientX, y: e.clientY };
        dragged = false;
      }
    };
    const move = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) dragged = true;
    };
    const up = (e: PointerEvent) => {
      pointers = Math.max(0, pointers - 1);
      if (dragged) return;
      const r = renderer.domElement.getBoundingClientRect();
      const ray = new T.Raycaster();
      ray.setFromCamera(
        new T.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, (-(e.clientY - r.top) / r.height) * 2 + 1),
        camera,
      );
      const hit = ray.intersectObject(model, true).find((h) => h.object.userData.target);
      setPicked(hit?.object.userData.target ?? null);
    };
    const cancel = () => {
      pointers = 0;
      dragged = true;
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", cancel);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
      controls.dispose();
      controlsRef.current = null;
      disposeHouseScene(model);
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [p, floors, explode, opacity]);
  const selected = picked ? elementTables(p)[picked.kind][picked.id] : undefined;
  return (
    <Modal title="3D-Hausansicht" className="house-3d-dialog" onClose={onClose}>
      <div className="book-actions">
        {p.floorOrder.map((id) => (
          <label key={id}>
            <input
              type="checkbox"
              checked={floors.includes(id)}
              onChange={(e) => setFloors(e.target.checked ? [...floors, id] : floors.filter((f) => f !== id))}
            />{" "}
            {p.floors[id]?.name}
          </label>
        ))}
      </div>
      <div className="book-actions">
        <label>
          Geschosse auseinanderziehen{" "}
          <input
            aria-label="Geschosse auseinanderziehen"
            type="range"
            min={0}
            max={8}
            step={0.5}
            value={explode}
            onChange={(e) => setExplode(Number(e.target.value))}
          />
        </label>
        <label>
          Wanddeckkraft{" "}
          <input
            aria-label="Wanddeckkraft"
            type="range"
            min={0.1}
            max={1}
            step={0.1}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
          />
        </label>
        <button onClick={() => controlsRef.current?.reset()}>Ansicht zurücksetzen</button>
      </div>
      <div className="house-3d-host" ref={host} data-testid="house-3d" />
      {error && <p role="alert">{error}</p>}
      <p>
        Ziehen dreht, Mausrad oder zwei Finger zoomen. Rechts ziehen oder zwei Finger verschieben die Ansicht.
        Modell aus den gespeicherten Maßen; Möbel und Geräte sind vereinfachte Körper. Geräte ohne Montagehöhe
        stehen auf Bodenhöhe. Dach und Leitungen sind in dieser Ansicht noch nicht dargestellt.
      </p>
      <div className="book-actions">
        <button
          onClick={() => {
            const c = controlsRef.current;
            if (c) {
              const offset = c.object.position.clone().sub(c.target);
              offset.applyAxisAngle(new T.Vector3(0, 1, 0), Math.PI / 8);
              c.object.position.copy(c.target).add(offset);
              c.update();
            }
          }}
        >
          Um 22,5° drehen
        </button>
        <button
          onClick={() => {
            const c = controlsRef.current;
            if (c) {
              c.object.position.sub(c.target).multiplyScalar(0.8).add(c.target);
              c.update();
            }
          }}
        >
          Näher
        </button>
        <button
          onClick={() => {
            const c = controlsRef.current;
            if (c) {
              c.object.position.sub(c.target).multiplyScalar(1.25).add(c.target);
              c.update();
            }
          }}
        >
          Weiter
        </button>
      </div>
      {picked && selected && (
        <p role="status">
          Ausgewählt: {"name" in selected ? selected.name : picked.kind}{" "}
          <button onClick={() => go(picked)}>Im Grundriss bearbeiten</button>
        </p>
      )}
      <label>
        Objekt direkt auswählen{" "}
        <select
          value={picked ? `${picked.kind}:${picked.id}` : ""}
          onChange={(e) => {
            const [kind, id] = e.target.value.split(":");
            setPicked(kind && id ? { kind: kind as Selection["kind"], id } : null);
          }}
        >
          <option value="">Objekt wählen</option>
          {Object.entries(elementTables(p))
            .filter(([k]) =>
              [
                "rooms",
                "walls",
                "doors",
                "windows",
                "furniture",
                "devices",
                "outlets",
                "switches",
                "distributionBoards",
                "networkNodes",
                "utilityNodes",
                "transformers",
              ].includes(k),
            )
            .flatMap(([kind, table]) =>
              Object.values(table)
                .filter((n) => floors.includes(n.floorId) && p.layers[n.layerId]?.visible)
                .map((n) => (
                  <option key={n.id} value={`${kind}:${n.id}`}>
                    {p.floors[n.floorId]?.name} · {"name" in n ? n.name : kind}
                  </option>
                )),
            )}
        </select>
      </label>
    </Modal>
  );
}
