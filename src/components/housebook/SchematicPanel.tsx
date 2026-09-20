import { useMemo, useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { buildSupplyGraph } from "../../simulation/graph";
import { elementKinds, elementTables } from "../../core/elementTables";
import { focusObject } from "../../housebook/navigation";
import { contactsFor } from "../../electrical/contacts";
import type { Contact } from "../../electrical/contacts";

type SchematicView = "supply" | "connections";

const contactColor: Record<Contact["role"], string> = {
  line: "#b66a22",
  neutral: "#3573a8",
  protective: "#2f855a",
  secondary: "#7650a6",
};

function contactY(index: number) {
  return 66 + index * 25;
}
export function SchematicPanel({ onClose }: { onClose: () => void }) {
  const project = useProjectStore((s) => s.project),
    selection = useEditorStore((s) => s.selection),
    [search, setSearch] = useState(""),
    [view, setView] = useState<SchematicView>("supply");
  const graph = useMemo(() => buildSupplyGraph(project), [project]);
  const all = {
    ...Object.assign({}, ...Object.values(elementTables(project))),
    ...project.electrical.circuits,
    ...project.electrical.protectionDevices,
  } as Record<string, { name?: string; label?: string; distributionBoardId?: string }>;
  const name = (id: string) => [all[id]?.label, all[id]?.name].filter(Boolean).join(" · ") || id.slice(0, 8);
  const nodes = Object.values(graph.nodes),
    children = new Map<string, string[]>();
  nodes.forEach((n) => {
    if (n.parentId) children.set(n.parentId, [...(children.get(n.parentId) ?? []), n.id]);
  });
  const order: { id: string; depth: number }[] = [],
    visited = new Set<string>();
  const visit = (id: string, depth: number) => {
    if (visited.has(id)) return;
    visited.add(id);
    order.push({ id, depth });
    for (const child of children.get(id) ?? []) visit(child, depth + 1);
  };
  nodes.filter((n) => !n.parentId).forEach((n) => visit(n.id, 0));
  nodes.forEach((n) => {
    if (!visited.has(n.id)) visit(n.id, 0);
  });
  const locations = new Map(order.map((n, i) => [n.id, { x: n.depth * 210 + 15, y: i * 58 + 15 }]));
  const kinds = {
    supply: "Einspeisung",
    meter: "Zähler",
    board: "Verteiler",
    protection: "Schutzgerät",
    circuit: "Stromkreis",
    outlet: "Steckdose",
    device: "Verbraucher",
    switch: "Schalter",
    control: "Schaltgruppe",
    transformer: "Transformator",
  };
  const electricalNames = (id: string) => name(id);
  const connectionCables = Object.values(project.electrical.cables).filter(
    (cable) => cable.conductorConnections.length > 0,
  );
  const connectionRows = connectionCables.map((cable) => {
    const startContacts = contactsFor(project, cable.startNodeId),
      endContacts = contactsFor(project, cable.endNodeId);
    return { cable, startContacts, endContacts };
  });
  const openNode = (id: string) => {
    const kind = elementKinds.find((k) => elementTables(project)[k][id]);
    if (kind && focusObject({ kind, id })) onClose();
  };
  return (
    <section>
      <h3>Versorgungsschema</h3>
      <p>
        Automatisch aus den ausdrücklich zugeordneten Versorgungswegen. Objekt anklicken, um es im Grundriss
        zu öffnen. Im Anschlussplan werden Pole und Schaltkontakte getrennt vom Grundriss als
        Verbindungsschema dargestellt.
      </p>
      <div className="schematic-tabs" role="tablist" aria-label="Schematische Ansichten">
        <button
          type="button"
          role="tab"
          aria-selected={view === "supply"}
          className={view === "supply" ? "active" : ""}
          onClick={() => setView("supply")}
        >
          Versorgungskette
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "connections"}
          className={view === "connections" ? "active" : ""}
          onClick={() => setView("connections")}
        >
          Anschlussplan
        </button>
      </div>
      <label className="book-field">
        Objekt suchen
        <input value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      {view === "connections" ? (
        !connectionRows.length ? (
          <p>
            Noch keine belegten Pol- oder Kontaktverbindungen vorhanden. Eine Leitung im Grundriss zeichnen
            und danach ihre Kontakte zuordnen.
          </p>
        ) : (
          <div className="schematic-scroll connection-schematic">
            <svg
              role="img"
              aria-label="Schematischer Anschlussplan mit Polen und Schaltkontakten"
              width="940"
              height={Math.max(180, connectionRows.length * 190 + 20)}
            >
              {connectionRows.map(({ cable, startContacts, endContacts }, rowIndex) => {
                const top = rowIndex * 190 + 12,
                  leftX = 20,
                  rightX = 650,
                  maxRows = Math.max(startContacts.length, endContacts.length, 1),
                  height = Math.max(96, maxRows * 25 + 38),
                  startById = new Map(startContacts.map((contact, index) => [contact.id, index])),
                  endById = new Map(endContacts.map((contact, index) => [contact.id, index]));
                return (
                  <g key={cable.id}>
                    <text x="20" y={top + 12} fontSize="11" fill="#657572">
                      {cable.label} · {cable.name}
                    </text>
                    <rect
                      x={leftX}
                      y={top + 20}
                      width="270"
                      height={height}
                      rx="8"
                      fill="#fff"
                      stroke="#b4c7bd"
                    />
                    <rect
                      x={rightX}
                      y={top + 20}
                      width="270"
                      height={height}
                      rx="8"
                      fill="#fff"
                      stroke="#b4c7bd"
                    />
                    <text
                      x={leftX + 12}
                      y={top + 42}
                      fontSize="13"
                      fontWeight="600"
                      fill="#23383b"
                      role="button"
                      tabIndex={0}
                      onClick={() => openNode(cable.startNodeId)}
                    >
                      {electricalNames(cable.startNodeId)}
                    </text>
                    <text
                      x={rightX + 12}
                      y={top + 42}
                      fontSize="13"
                      fontWeight="600"
                      fill="#23383b"
                      role="button"
                      tabIndex={0}
                      onClick={() => openNode(cable.endNodeId)}
                    >
                      {electricalNames(cable.endNodeId)}
                    </text>
                    {startContacts.map((contact, index) => (
                      <g key={`start-${contact.id}`}>
                        <circle
                          cx={leftX + 10}
                          cy={top + contactY(index)}
                          r="5"
                          fill={contactColor[contact.role]}
                        />
                        <text x={leftX + 22} y={top + contactY(index) + 4} fontSize="11" fill="#23383b">
                          {contact.label}
                        </text>
                      </g>
                    ))}
                    {endContacts.map((contact, index) => (
                      <g key={`end-${contact.id}`}>
                        <circle
                          cx={rightX + 260}
                          cy={top + contactY(index)}
                          r="5"
                          fill={contactColor[contact.role]}
                        />
                        <text
                          x={rightX + 248}
                          y={top + contactY(index) + 4}
                          textAnchor="end"
                          fontSize="11"
                          fill="#23383b"
                        >
                          {contact.label}
                        </text>
                      </g>
                    ))}
                    {cable.conductorConnections.map((connection, index) => {
                      const startIndex = startById.get(connection.startContactId),
                        endIndex = endById.get(connection.endContactId);
                      if (startIndex === undefined || endIndex === undefined) return null;
                      const start = startContacts[startIndex]!,
                        y1 = top + contactY(startIndex),
                        y2 = top + contactY(endIndex);
                      return (
                        <path
                          key={`${connection.startContactId}-${connection.endContactId}-${index}`}
                          d={`M ${leftX + 10} ${y1} C 380 ${y1}, 560 ${y2}, ${rightX + 260} ${y2}`}
                          fill="none"
                          stroke={contactColor[start.role]}
                          strokeWidth="2"
                          opacity="0.85"
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
            <p className="schematic-legend">
              <span>
                <i className="legend-dot legend-line" /> Außenleiter / Schaltkontakt
              </span>
              <span>
                <i className="legend-dot legend-neutral" /> Neutralleiter
              </span>
              <span>
                <i className="legend-dot legend-protective" /> Schutzleiter
              </span>
              <span>
                <i className="legend-dot legend-secondary" /> Kleinspannung
              </span>
            </p>
          </div>
        )
      ) : !nodes.length ? (
        <p>Noch keine Elektroobjekte vorhanden.</p>
      ) : (
        <div className="schematic-scroll">
          <svg
            role="img"
            aria-label="Schematische Versorgungskette"
            width={Math.max(750, ...order.map((n) => (n.depth + 1) * 210 + 20))}
            height={order.length * 58 + 20}
          >
            {graph.edges.map((edge) => {
              const a = locations.get(edge.from),
                b = locations.get(edge.to);
              return a && b ? (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={`M ${a.x + 190} ${a.y + 22} H ${a.x + 200} V ${b.y + 22} H ${b.x}`}
                  stroke="#96b2aa"
                  fill="none"
                />
              ) : null;
            })}
            {order.map(({ id }) => {
              const p = locations.get(id)!,
                n = graph.nodes[id]!,
                selected = selection.some((s) => s.id === id),
                match = !search || name(id).toLocaleLowerCase().includes(search.toLocaleLowerCase());
              let kind = elementKinds.find((k) => elementTables(project)[k][id]),
                targetId = id;
              if (!kind && all[id]?.distributionBoardId) {
                kind = "distributionBoards";
                targetId = all[id]!.distributionBoardId!;
              }
              const target = kind ? { kind, id: targetId } : null,
                object = target ? elementTables(project)[target.kind][target.id] : null;
              const available = !!object && project.layers[object.layerId]?.visible;
              const open = () => {
                if (target && available && focusObject(target)) onClose();
              };
              return (
                <g
                  key={id}
                  role="button"
                  aria-label={`Im Plan: ${name(id)}`}
                  aria-disabled={!available}
                  tabIndex={available ? 0 : -1}
                  onClick={open}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      open();
                    }
                  }}
                  style={{ cursor: available ? "pointer" : "default", opacity: match ? 1 : 0.25 }}
                >
                  <title>
                    {name(id)}
                    {available ? "" : " – Ebene ausgeblendet"}
                  </title>
                  <rect
                    x={p.x}
                    y={p.y}
                    width="190"
                    height="44"
                    rx="6"
                    fill={selected ? "#e8f3ed" : "white"}
                    stroke={selected ? "#167863" : "#b4c7bd"}
                    strokeWidth={selected ? 2 : 1}
                  />
                  <text x={p.x + 9} y={p.y + 15} fontSize="10" fill="#657572">
                    {kinds[n.kind]}
                  </text>
                  <text x={p.x + 9} y={p.y + 32} fontSize="12" fill="#23383b">
                    {name(id).length > 25 ? name(id).slice(0, 24) + "…" : name(id)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
