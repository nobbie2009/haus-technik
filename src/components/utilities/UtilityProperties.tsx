import { asset } from "../../housebook/model";
import {
  utilities,
  nodeMedia,
  media,
  nodeKinds,
  pipeLength,
  type UtilityNode,
  type UtilityPipe,
} from "../../utilities/model";
import { usePropertyFields } from "../properties/usePropertyFields";
import { TextField } from "../Fields";
import { NumberField, SelectField } from "../electrical/ElectricalFields";
import { useEditorStore } from "../../stores/editorStore";

export function UtilityProperties({ id, kind }: { id: string; kind: "utilityNodes" | "utilityPipes" }) {
  const { project, locked, change, lengthField } = usePropertyFields({ id, kind });
  const net = utilities(project);
  const node = kind === "utilityNodes" ? net.nodes[id] : undefined,
    pipe = kind === "utilityPipes" ? net.pipes[id] : undefined;
  const item = (node ?? pipe)!;
  const patchNode = (patch: Partial<UtilityNode>) =>
    change((p) => {
      Object.assign(utilities(p).nodes[id]!, patch);
    });
  const patchPipe = (patch: Partial<UtilityPipe>) =>
    change((p) => {
      Object.assign(utilities(p).pipes[id]!, patch);
    });
  return (
    <fieldset disabled={locked} className="book-fieldset">
      <TextField
        label="Rohrnetz-Name"
        value={item.name}
        onCommit={(name) => (node ? patchNode({ name }) : patchPipe({ name }))}
      />
      {node && (
        <>
          {node.kind === "meter" && (
            <TextField
              label="Zählernummer"
              value={asset(node).serial}
              onCommit={(serial) =>
                change((p) => {
                  const n = utilities(p).nodes[id]!;
                  n.metadata.asset = { ...asset(n), serial };
                })
              }
            />
          )}
          <p>
            {nodeKinds[node.kind]} ·{" "}
            {nodeMedia(node)
              .map((m) => media[m].label)
              .join(" / ")}
          </p>
          {lengthField("Position X", node.position.x, (p, x) => {
            utilities(p).nodes[id]!.position.x = x;
          })}
          {lengthField("Position Y", node.position.y, (p, y) => {
            utilities(p).nodes[id]!.position.y = y;
          })}
          {lengthField("Anschlusshöhe über Etage", node.elevation, (p, v) => {
            utilities(p).nodes[id]!.elevation = v;
          })}
          {(
            [
              ["width", "Breite"],
              ["depth", "Tiefe"],
              ["height", "Höhe"],
            ] as const
          ).map(([key, label]) =>
            lengthField(label, node[key], (p, v) => {
              utilities(p).nodes[id]![key] = v;
            }),
          )}
          <NumberField
            label="Drehung (°)"
            value={(node.rotation * 180) / Math.PI}
            hint=""
            onCommit={(v) => v !== null && patchNode({ rotation: (v * Math.PI) / 180 })}
          />
          <NumberField
            label="Heizleistung (W)"
            value={node.heatOutputW}
            onCommit={(v) => patchNode({ heatOutputW: v })}
          />
          <NumberField
            label="Dokumentierter Druck (bar)"
            value={node.pressureBar}
            onCommit={(v) => patchNode({ pressureBar: v })}
          />
          <NumberField
            label="Dokumentierte Temperatur (°C)"
            value={node.temperatureC}
            onCommit={(v) => patchNode({ temperatureC: v })}
          />
          {node.kind === "valve" && (
            <SelectField
              label="Ventilstellung"
              value={node.closed ? "closed" : "open"}
              onChange={(v) => patchNode({ closed: v === "closed" })}
            >
              <option value="open">Offen</option>
              <option value="closed">Geschlossen</option>
            </SelectField>
          )}
          <h3>Anschlüsse</h3>
          {nodeMedia(node).map((m) => {
            const pipes = Object.values(net.pipes).filter(
              (p) => p.medium === m && (p.from === id || p.to === id),
            );
            return (
              <p key={m}>
                {media[m].short}: {pipes.length ? `${pipes.length} Leitung(en)` : "Noch nicht verbunden"}
              </p>
            );
          })}
          <button
            onClick={() => {
              const editor = useEditorStore.getState();
              editor.setTool("utilityPipe");
              useEditorStore.setState({
                utilityMedium: nodeMedia(node)[0]!,
                cableStartId: id,
                draft: { points: [node.position], cursor: node.position, input: "" },
              });
            }}
          >
            Rohrleitung hier beginnen
          </button>
        </>
      )}
      {pipe && (
        <>
          <p>
            {media[pipe.medium].label}: {net.nodes[pipe.from]?.name} → {net.nodes[pipe.to]?.name}
          </p>
          <p>
            <strong>{(pipeLength(project, pipe) / 1000).toFixed(2)} m</strong> · Planlänge einschließlich
            Höhenunterschied und Zuschlag.
          </p>
          <TextField
            label="Rohrmaterial"
            value={pipe.material}
            onCommit={(material) => patchPipe({ material })}
          />
          <NumberField
            label="Nennweite (DN)"
            value={pipe.nominalDiameter}
            onCommit={(nominalDiameter) => patchPipe({ nominalDiameter })}
          />
          {lengthField("Dämmstärke", pipe.insulation, (p, v) => {
            utilities(p).pipes[id]!.insulation = v;
          })}
          {lengthField("Längenzuschlag", pipe.allowance, (p, v) => {
            utilities(p).pipes[id]!.allowance = v;
          })}
          {pipe.riser && (
            <>
              <h3>Steigpunkt</h3>
              <p>
                {project.floors[net.nodes[pipe.from]!.floorId]?.name} ↔{" "}
                {project.floors[net.nodes[pipe.to]!.floorId]?.name}
              </p>
              {lengthField("Steigpunkt X", pipe.riser.x, (p, v) => {
                utilities(p).pipes[id]!.riser!.x = v;
              })}
              {lengthField("Steigpunkt Y", pipe.riser.y, (p, v) => {
                utilities(p).pipes[id]!.riser!.y = v;
              })}
            </>
          )}
          <details>
            <summary>Leitungsverlauf · {pipe.path.length} Wegpunkte</summary>
            {pipe.path.map((point, index) => (
              <div key={index}>
                {lengthField(`Punkt ${index + 1} X`, point.x, (p, v) => {
                  utilities(p).pipes[id]!.path[index]!.x = v;
                })}
                {lengthField(`Punkt ${index + 1} Y`, point.y, (p, v) => {
                  utilities(p).pipes[id]!.path[index]!.y = v;
                })}
                <button onClick={() => patchPipe({ path: pipe.path.filter((_, i) => i !== index) })}>
                  Punkt {index + 1} entfernen
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const p = pipe.path.at(-1) ?? net.nodes[pipe.from]!.position;
                patchPipe({ path: [...pipe.path, { x: p.x + 500, y: p.y }] });
              }}
            >
              Wegpunkt ergänzen
            </button>
          </details>
        </>
      )}
    </fieldset>
  );
}
