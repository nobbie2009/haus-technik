import type { NetworkNode } from "../../network/model";
import { housebook } from "../../housebook/model";
import { useProjectStore } from "../../stores/projectStore";
import { useZigbeeStore } from "../../stores/zigbeeStore";
import { emptyZigbee } from "../../network/zigbeeModel";
import { NumberField } from "../electrical/ElectricalFields";
import { TextField } from "../Fields";

export function ZigbeeProperties({
  node,
  locked,
  change,
}: {
  node: NetworkNode;
  locked: boolean;
  change: (f: (n: NetworkNode) => void) => boolean;
}) {
  const project = useProjectStore((s) => s.project),
    state = useZigbeeStore();
  const snapshot =
    state.projectId === project.id ? state.snapshot : (housebook(project).zigbee ?? emptyZigbee());
  const device = snapshot.devices.find((d) => d.address === node.zigbeeAddress);
  const live = state.projectId === project.id ? state.live[node.zigbeeAddress!] : undefined;
  const links = snapshot.links.filter((l) => l.from === node.zigbeeAddress || l.to === node.zigbeeAddress);
  return (
    <>
      <h3>Zigbee · {device?.type ?? "Nicht mehr in Geräteliste"}</h3>
      <TextField
        label="Zigbee-Planname"
        value={node.name}
        disabled={locked}
        onCommit={(name) =>
          change((n) => {
            n.name = name;
          })
        }
      />
      <p>
        {device?.vendor} {device?.model}
        <br />
        {node.zigbeeAddress}
      </p>
      {(["x", "y"] as const).map((axis) => (
        <NumberField
          key={axis}
          label={`Zigbee-Position ${axis.toUpperCase()} (mm)`}
          value={node.position[axis]}
          disabled={locked}
          onCommit={(v) =>
            change((n) => {
              if (v === null) throw new Error("Position eingeben.");
              n.position[axis] = v;
            })
          }
        />
      ))}
      <p>
        {state.running ? "Live-Empfang aktiv" : "Empfang gestoppt"} ·{" "}
        {live?.availability ?? "Verfügbarkeit unbekannt"}
      </p>
      {live && (
        <p>
          Geräte-LQI: {live.lqi ?? "unbekannt"} · Batterie: {live.battery ?? "unbekannt"} %<br />
          Nachricht empfangen: {new Date(live.receivedAt).toLocaleTimeString("de-DE")}
        </p>
      )}
      <p>
        Kartenstand:{" "}
        {snapshot.scannedAt
          ? new Date(snapshot.scannedAt).toLocaleString("de-DE")
          : "Zeitpunkt unbekannt / kein Scan"}
      </p>
      <h4>Gemeldete Funkverbindungen ({links.length})</h4>
      {!links.length && (
        <p>
          Keine Verbindung im Kartenstand. Schlafende Geräte oder fehlende Scanantworten können die Ursache
          sein; dies beweist kein Funkloch.
        </p>
      )}
      <ul>
        {links.map((link, i) => (
          <li key={i}>
            {snapshot.devices.find((d) => d.address === link.from)?.name ?? link.from} →{" "}
            {snapshot.devices.find((d) => d.address === link.to)?.name ?? link.to}
            <br />
            LQI: {link.lqi ?? "unbekannt"} · Tiefe: {link.depth ?? "unbekannt"} · Beziehungscode:{" "}
            {link.relationship ?? "unbekannt"}
            <br />
            Routenziele:{" "}
            {link.routes.length
              ? link.routes.map((r) => `0x${r.toString(16).padStart(4, "0")}`).join(", ")
              : "keine gemeldet"}
          </li>
        ))}
      </ul>
      <p>
        Geräte-LQI und die gerichteten Link-LQI des letzten Scans sind unterschiedliche Messwerte. Die Karte
        zeigt gemeldete Nachbarschaften und Routen, keine berechnete Funkabdeckung.
      </p>
    </>
  );
}
