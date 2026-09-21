import { useProjectStore } from "../../stores/projectStore";
import { housebook, networkLabels } from "../../housebook/model";
import { changeNetworkNode, networkLayer, type NetworkNode } from "../../network/model";
import { TextField } from "../Fields";
import { NumberField, SelectField } from "../electrical/ElectricalFields";
import { isTvKind, tvDefaults } from "../../network/tv";
import { networkPorts } from "../../network/model";
import { TvFields } from "./TvFields";

export function NetworkProperties({ id }: { id: string }) {
  const project = useProjectStore((s) => s.project),
    commit = useProjectStore((s) => s.commit);
  const book = housebook(project),
    node = book.networkNodes.find((n) => n.id === id)!;
  const locked = networkLayer(project)?.locked ?? false;
  const tv = isTvKind(node.kind);
  const change = (mutate: (node: NetworkNode) => void) =>
    commit("Netzwerkgerät bearbeiten", (p) => changeNetworkNode(p, id, mutate));
  return (
    <>
      <TextField
        label={tv ? "TV-/SAT-Name" : "Netzwerkname"}
        value={node.name}
        disabled={locked}
        onCommit={(value) =>
          change((n) => {
            n.name = value;
          })
        }
      />
      <SelectField
        label={tv ? "TV-/SAT-Geräteart" : "Netzwerkgeräteart"}
        value={node.kind}
        disabled={locked}
        onChange={(value) =>
          change((n) => {
            n.kind = value as NetworkNode["kind"];
            if (isTvKind(n.kind)) {
              n.tv = tvDefaults(n.kind);
              n.ports = networkPorts[n.kind];
            }
          })
        }
      >
        {Object.entries(networkLabels)
          .filter(([id]) => isTvKind(id) === tv)
          .map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
      </SelectField>
      <NumberField
        label={tv ? "Anzahl Koaxanschlüsse" : "Anzahl Netzwerkports"}
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
      {tv && <TvFields node={node} locked={locked} change={change} />}
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
      )
        .filter(([key]) => !tv || key === "location" || key === "notes")
        .map(([key, label]) => (
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
        Kabel oben unter {tv ? "„TV / SAT & Koaxleitungen“" : "„Ports, Kabel & WLAN“"} zuordnen.
      </p>
    </>
  );
}
