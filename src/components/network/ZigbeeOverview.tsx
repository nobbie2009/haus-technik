import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useZigbeeStore } from "../../stores/zigbeeStore";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { housebook } from "../../housebook/model";
import { emptyZigbee } from "../../network/zigbeeModel";
import { batteryLabel } from "../../network/zigbeeBattery";
import { hasLowBattery } from "../../network/zigbeeHealth";

const date = (value: string) => new Date(value).toLocaleString("de-DE");
export function ZigbeeOverview() {
  const open = useZigbeeStore((s) => s.overviewOpen);
  const id = useProjectStore((s) => s.project.id);
  return open ? <OverviewWindow key={id} /> : null;
}
function OverviewWindow() {
  const state = useZigbeeStore();
  const project = useProjectStore((s) => s.project);
  const book = housebook(project);
  const current = state.projectId === project.id;
  const snapshot = current ? state.snapshot : (book.zigbee ?? emptyZigbee());
  const live = current ? state.live : {};
  const [threshold, setThreshold] = useState(20);
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [position, setPosition] = useState({
    x: Math.max(8, window.innerWidth - 448),
    y: Math.min(160, window.innerHeight / 4),
  });
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const clamp = (x: number, y: number) => {
    const box = ref.current?.getBoundingClientRect();
    return {
      x: Math.max(8, Math.min(x, window.innerWidth - (box?.width ?? 420) - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - (box?.height ?? 60) - 8)),
    };
  };
  useEffect(() => {
    const adjust = () => setPosition((p) => clamp(p.x, p.y));
    adjust();
    window.addEventListener("resize", adjust);
    const observer = new ResizeObserver(adjust);
    if (ref.current) observer.observe(ref.current);
    return () => {
      window.removeEventListener("resize", adjust);
      observer.disconnect();
    };
  }, [collapsed]);
  const devices = snapshot.devices;
  const routers = devices.filter((d) => d.type === "Router");
  const low = devices.filter((d) => hasLowBattery(live[d.address], threshold));
  const offline = devices.filter((d) => live[d.address]?.availability === "offline");
  const unknown = devices.filter((d) => !["online", "offline"].includes(live[d.address]?.availability ?? ""));
  const groups = [
    { title: "Router", items: routers },
    { title: "Batterie niedrig", items: low },
    { title: "Nicht erreichbar (Z2M)", items: offline },
    { title: "Erreichbarkeit unbekannt", items: unknown },
  ];
  return createPortal(
    <section
      ref={ref}
      className="zigbee-overview"
      role="dialog"
      aria-modal="false"
      aria-label="Zigbee-Übersicht"
      style={{ left: position.x, top: position.y }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") useZigbeeStore.setState({ overviewOpen: false });
      }}
      onKeyUp={(e) => e.stopPropagation()}
    >
      <header>
        <button
          className="zigbee-overview-handle"
          aria-label="Zigbee-Übersicht verschieben"
          title="Ziehen oder mit Pfeiltasten verschieben"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, left: position.x, top: position.y };
          }}
          onPointerMove={(e) => {
            if (drag.current)
              setPosition(
                clamp(
                  drag.current.left + e.clientX - drag.current.x,
                  drag.current.top + e.clientY - drag.current.y,
                ),
              );
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onKeyDown={(e) => {
            const delta = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[
              e.key
            ];
            if (delta) {
              e.preventDefault();
              setPosition(clamp(position.x + delta[0]!, position.y + delta[1]!));
            }
          }}
        >
          Zigbee-Übersicht
        </button>
        <button
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Übersicht aufklappen" : "Übersicht einklappen"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "+" : "−"}
        </button>
        <button
          aria-label="Zigbee-Übersicht schließen"
          onClick={() => useZigbeeStore.setState({ overviewOpen: false })}
        >
          ×
        </button>
      </header>
      <p className="zigbee-overview-counts">
        {routers.length} Router · {low.length} Batterie niedrig · {offline.length} offline
      </p>
      {!collapsed && (
        <div className="zigbee-overview-body">
          <p role="status">
            {current && state.connected
              ? "Live-Empfang aktiv"
              : "Empfang nicht aktiv – letzter bekannter Stand"}
            {current && state.refreshedAt && ` · Stand ${date(state.refreshedAt)}`}
          </p>
          {state.error && current && <p role="alert">{state.error}</p>}
          {!state.running && <p>Zum Aktualisieren unter Netzwerk → Zigbee2MQTT den Live-Empfang starten.</p>}
          {state.running && <button onClick={() => state.stop()}>Empfang stoppen</button>}
          <label className="field">
            Batteriewarnung bis einschließlich
            <select value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}>
              {[10, 20, 30].map((v) => (
                <option key={v} value={v}>
                  {v} %
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Geräte filtern
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          {!devices.length && <p>Noch keine Geräteliste. Zuerst Geräte auslesen.</p>}
          {groups.map((group, index) => (
            <details key={group.title} open={index < 3}>
              <summary>
                {group.title} ({group.items.length})
              </summary>
              {!group.items.length && <p>Keine Geräte in dieser Gruppe.</p>}
              {group.items
                .filter((d) => {
                  const node = book.networkNodes.find((n) => n.zigbeeAddress === d.address);
                  return `${d.name} ${d.address} ${node?.name ?? ""}`
                    .toLocaleLowerCase()
                    .includes(search.toLocaleLowerCase());
                })
                .map((d) => {
                  const value = live[d.address];
                  const node = book.networkNodes.find((n) => n.zigbeeAddress === d.address);
                  const room = node?.roomId ? project.rooms[node.roomId] : undefined;
                  return (
                    <article key={d.address} className="zigbee-health-device">
                      <strong>{node?.name ?? d.name}</strong>
                      {node?.name && node.name !== d.name && <small>Z2M: {d.name}</small>}
                      <small>
                        {node
                          ? `${project.floors[node.floorId]?.name ?? "Etage unbekannt"}${room?.floorId === node.floorId ? ` · ${room.name}` : ""}`
                          : "Noch nicht im Plan platziert"}
                      </small>
                      <p>
                        {value?.availability === "offline"
                          ? "Offline gemeldet"
                          : value?.availability === "online"
                            ? "Online gemeldet"
                            : "Erreichbarkeit unbekannt"}{" "}
                        · {batteryLabel(value)}
                      </p>
                      {value?.availability === "offline" && (
                        <p>
                          {value.offlineRetained
                            ? "Ausfallbeginn unbekannt (gespeicherte Offline-Meldung)."
                            : "Ausfallbeginn unbekannt; Z2M meldet offline."}
                          {value.offlineObservedAt &&
                            ` In dieser Sitzung seit ${date(value.offlineObservedAt)} als offline beobachtet.`}
                        </p>
                      )}
                      <small>
                        Letzte Zigbee-Nachricht (Z2M): {value?.lastSeen ? date(value.lastSeen) : "unbekannt"}
                      </small>
                      {value?.batteryReceivedAt && hasLowBattery(value, threshold) && (
                        <small>
                          Batteriewert empfangen: {date(value.batteryReceivedAt)}
                          {value.batteryRetained ? " · gespeicherte MQTT-Nachricht" : ""}
                        </small>
                      )}
                      {node && (
                        <button
                          onClick={() => {
                            const editor = useEditorStore.getState();
                            editor.setCategory("network");
                            editor.setFloor(node.floorId);
                            useEditorStore.setState({
                              selection: [{ kind: "networkNodes", id: node.id }],
                              viewport: {
                                ...editor.viewport,
                                originPx: {
                                  x: editor.size.width / 2 - node.position.x * editor.viewport.scale,
                                  y: editor.size.height / 2 + node.position.y * editor.viewport.scale,
                                },
                              },
                            });
                          }}
                        >
                          Im Plan zeigen: {node.name}
                        </button>
                      )}
                    </article>
                  );
                })}
            </details>
          ))}
          <p className="field-hint">
            Batteriewarnungen des Geräts gelten unabhängig vom Grenzwert. Unbekannt heißt nicht offline. Für
            Erreichbarkeit in Z2M „Availability“, für letzte Zigbee-Nachrichten „last_seen“ aktivieren. Sende-
            und Empfangspausen beweisen keinen Ausfall. Zeitangaben werden bei einem neuen Live-Start neu
            erfasst.
          </p>
        </div>
      )}
    </section>,
    document.body,
  );
}
