import { useProjectStore } from "../../stores/projectStore";
import { housebook, networkLabels } from "../../housebook/model";
import { changeNetworkNode, networkLayer, type NetworkNode } from "../../network/model";
import { TextField } from "../Fields";
import { NumberField, SelectField } from "../electrical/ElectricalFields";

export function NetworkProperties({ id }: { id: string }) {
  const project = useProjectStore((s) => s.project),
    commit = useProjectStore((s) => s.commit);
  const book = housebook(project),
    node = book.networkNodes.find((n) => n.id === id)!;
  const locked = networkLayer(project)?.locked ?? false;
  const change = (mutate: (node: NetworkNode) => void) =>
    commit("Netzwerkgerät bearbeiten", (p) => changeNetworkNode(p, id, mutate));
  return (
    <>
      <TextField
        label="Netzwerkname"
        value={node.name}
        disabled={locked}
        onCommit={(value) =>
          change((n) => {
            n.name = value;
          })
        }
      />
      <SelectField
        label="Netzwerkgeräteart"
        value={node.kind}
        disabled={locked}
        onChange={(value) =>
          change((n) => {
            n.kind = value as NetworkNode["kind"];
          })
        }
      >
        {Object.entries(networkLabels).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </SelectField>
      <NumberField
        label="Anzahl Netzwerkports"
        value={node.ports}
        disabled={locked}
        onCommit={(value) =>
          change((n) => {
            if (value === null || !Number.isInteger(value) || value < 1 || value > 256)
              throw new Error("1 bis 256 Ports eingeben.");
            n.ports = value;
          })
        }
      />
      {(["x", "y"] as const).map((axis) => (
        <NumberField
          key={axis}
          label={`Netzwerkposition ${axis.toUpperCase()} (mm)`}
          value={node.position[axis]}
          disabled={locked}
          onCommit={(value) =>
            change((n) => {
              if (value === null) throw new Error("Position eingeben.");
              n.position[axis] = value;
            })
          }
        />
      ))}
      {(
        [
          ["ssid", "WLAN-Name (SSID)"],
          ["ip", "IP-Adresse"],
          ["mac", "MAC-Adresse"],
          ["location", "Standort"],
          ["notes", "Netzwerknotizen"],
        ] as const
      ).map(([key, label]) => (
        <TextField
          key={key}
          label={label}
          value={node.details?.[key] ?? ""}
          disabled={locked}
          onCommit={(value) =>
            change((n) => {
              n.details ??= { ssid: "", band: "", ip: "", mac: "", location: "", notes: "" };
              n.details[key] = value;
            })
          }
        />
      ))}
      <p className="field-hint">
        {book.networkLinks.filter((l) => l.from === id || l.to === id).length} Kabelverbindungen. Ports und
        Kabel links unter „Ports, Kabel & WLAN“ zuordnen.
      </p>
    </>
  );
}
