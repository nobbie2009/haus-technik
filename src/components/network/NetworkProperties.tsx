import { useProjectStore } from "../../stores/projectStore";
import { housebook, networkLabels } from "../../housebook/model";
import { changeNetworkNode, networkLayer, type NetworkNode } from "../../network/model";
import { TextField } from "../Fields";
import { NumberField, SelectField } from "../electrical/ElectricalFields";
import { isTvKind, tvDefaults } from "../../network/tv";
import { networkPorts } from "../../network/model";
import { TvFields } from "./TvFields";
import { useState } from "react";
import { networkPower, ensureNetworkPower } from "../../network/power";
import { useEditorStore } from "../../stores/editorStore";
import { DeviceFields } from "../electrical/DeviceFields";
import { Modal } from "../dialogs/Modal";
import { PoeFields } from "./PoeFields";
import { poeDefaults } from "../../network/poe";
import { ZigbeeProperties } from "./ZigbeeProperties";

export function NetworkProperties({ id }: { id: string }) {
  const project = useProjectStore((s) => s.project),
    commit = useProjectStore((s) => s.commit);
  const book = housebook(project),
    node = book.networkNodes.find((n) => n.id === id)!;
  const locked = networkLayer(project)?.locked ?? false;
  const tv = isTvKind(node.kind);
  const power = networkPower(project, id);
  const [powerOpen, setPowerOpen] = useState(false);
  const change = (mutate: (node: NetworkNode) => void) =>
    commit("Netzwerkgerät bearbeiten", (p) => changeNetworkNode(p, id, mutate));
  if (node.kind === "zigbee") return <ZigbeeProperties node={node} locked={locked} change={change} />;
  return (
    <>
      <PoeFields node={node} book={book} locked={locked} change={change} />
      {!tv && (
        <SelectField
          label="PoE-Funktion"
          value={node.poe?.role ?? "none"}
          disabled={locked}
          onChange={(value) =>
            change((n) => {
              if (value === "none") delete n.poe;
              else n.poe = poeDefaults(value === "source" ? "poeSwitch" : "poeDevice", n.ports)!;
            })
          }
        >
          <option value="none">Kein PoE</option>
          <option value="source">PoE bereitstellen (Switch / Injector)</option>
          <option value="consumer">Über PoE versorgen (Verbraucher)</option>
        </SelectField>
      )}
      {node.poe?.role !== "consumer" && (
        <>
          <h3>Stromversorgung</h3>
          <p className="field-hint">
            Für einen Netzanschluss einen Stromanschluss einrichten und mit einer Steckdose verbinden. Reine
            Datenports oder PoE sind keine Netzspannungsanschlüsse.
          </p>
          <button
            disabled={locked}
            onClick={() => {
              let deviceId = power?.id ?? "";
              if (
                !deviceId &&
                !commit("Netzwerk-Stromanschluss einrichten", (d) => {
                  deviceId = ensureNetworkPower(d, id);
                })
              )
                return;
              const cable = Object.values(project.electrical.cables).find(
                (c) =>
                  c.connectionAssignment === "outlet" &&
                  (c.startNodeId === deviceId || c.endNodeId === deviceId),
              );
              useEditorStore.setState({
                connectionRequest: {
                  startNodeId: cable?.startNodeId ?? deviceId,
                  endNodeId: cable?.endNodeId ?? "",
                  cableId: cable?.id ?? null,
                  preserveSelection: true,
                },
              });
            }}
          >
            Mit Steckdose verbinden
          </button>
          {power && (
            <>
              <p className="field-hint">
                {power.connectionPointId
                  ? `Steckdose: ${project.electrical.outlets[power.connectionPointId]?.label}`
                  : "Noch keiner Steckdose zugeordnet"}
              </p>
              <button onClick={() => setPowerOpen(true)}>Stromanschluss konfigurieren</button>
              {powerOpen && (
                <Modal title={`Stromanschluss · ${node.name}`} onClose={() => setPowerOpen(false)}>
                  <fieldset disabled={locked}>
                    <DeviceFields id={power.id} />
                  </fieldset>
                </Modal>
              )}
            </>
          )}
        </>
      )}
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
            n.poe = poeDefaults(n.kind, n.ports);
            if (!n.poe) delete n.poe;
            if (isTvKind(n.kind)) {
              n.tv = tvDefaults(n.kind);
              n.ports = networkPorts[n.kind];
            }
          })
        }
      >
        {Object.entries(networkLabels)
          .filter(([id]) => id !== "zigbee" && isTvKind(id) === tv)
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
