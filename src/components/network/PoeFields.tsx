import type { Housebook } from "../../housebook/model";
import type { NetworkNode } from "../../network/model";
import { analyzePoe, poeStandards } from "../../network/poe";
import { NumberField, SelectField } from "../electrical/ElectricalFields";

export function PoeFields({
  node,
  book,
  locked,
  change,
}: {
  node: NetworkNode;
  book: Housebook;
  locked: boolean;
  change: (mutate: (node: NetworkNode) => void) => boolean;
}) {
  const poe = node.poe;
  if (!poe) return null;
  const analysis = analyzePoe(book);
  const status = analysis.consumers.find((c) => c.nodeId === node.id);
  const source = analysis.sources.get(node.id);
  return (
    <fieldset disabled={locked}>
      <legend>Power over Ethernet (PoE)</legend>
      <SelectField
        label="PoE-Standard"
        value={poe.standard}
        onChange={(value) =>
          change((n) => {
            n.poe!.standard = value as "af" | "at";
          })
        }
      >
        {Object.entries(poeStandards).map(([key, item]) => (
          <option key={key} value={key}>
            {item.label}
          </option>
        ))}
      </SelectField>
      {poe.role === "source" ? (
        <>
          <NumberField
            label="PoE-Gesamtbudget (W)"
            hint="0 = Budget noch unbekannt"
            value={poe.budgetW}
            onCommit={(value) =>
              change((n) => {
                n.poe!.budgetW = value ?? 0;
              })
            }
          />
          <p className="field-hint">
            Budget laut Switch-Datenblatt eintragen. Reservierung pro Gerät: 15,4 W (PoE) bzw. 30 W (PoE+),
            einschließlich Leitungsverlusten.
          </p>
          <p>
            Reserviert: {source?.reservedW.toLocaleString("de-DE")} W / {poe.budgetW} W
          </p>
          <details>
            <summary>PoE-Ports aktivieren</summary>
            {Array.from({ length: node.ports }, (_, i) => i + 1).map((port) => (
              <label key={port} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 44 }}>
                <input
                  type="checkbox"
                  checked={poe.enabledPorts.includes(port)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    change((n) => {
                      n.poe!.enabledPorts = checked
                        ? [...n.poe!.enabledPorts, port]
                        : n.poe!.enabledPorts.filter((p) => p !== port);
                    });
                  }}
                />{" "}
                Port {port}
              </label>
            ))}
          </details>
          {analysis.consumers
            .filter((c) => c.sourceId === node.id)
            .map((c) => (
              <p key={c.nodeId}>
                Port {c.sourcePort}: {book.networkNodes.find((n) => n.id === c.nodeId)?.name} — {c.message}
              </p>
            ))}
        </>
      ) : (
        <>
          <NumberField
            label="PoE-Eingangsport"
            hint="Leer setzt Port 1"
            value={poe.inputPort}
            onCommit={(value) =>
              change((n) => {
                n.poe!.inputPort = value ?? 1;
              })
            }
          />
          <NumberField
            label="PoE-Verbraucherleistung (W)"
            hint="0 = Leistung noch unbekannt"
            value={poe.powerW}
            onCommit={(value) =>
              change((n) => {
                n.poe!.powerW = value ?? 0;
              })
            }
          />
          <NumberField
            label="PoE-Nennspannung (V)"
            hint="Leer setzt 48 V"
            value={poe.voltageV}
            onCommit={(value) =>
              change((n) => {
                n.poe!.voltageV = value ?? 48;
              })
            }
          />
          <p>
            Planungsstrom: {(poe.powerW / poe.voltageV).toLocaleString("de-DE", { maximumFractionDigits: 3 })}{" "}
            A (P / U)
          </p>
          {node.kind === "poeDoorbell" && (
            <p className="field-hint">
              Reolink Video Doorbell PoE: aktives 802.3af, 48 V. 12 W als konservativer Planungswert, kein
              Durchschnittsverbrauch. WLAN- und Akkuvarianten sind andere Geräte.
            </p>
          )}
          <p role="status">{status?.message}</p>
          {status?.sourceId && (
            <p>
              Quelle: {book.networkNodes.find((n) => n.id === status.sourceId)?.name} · Port{" "}
              {status.sourcePort}
            </p>
          )}
        </>
      )}
      <p className="field-hint">
        Die Netzwerkleitung ordnet die PoE-Quelle automatisch zu. Direkte Switch-Verbindungen werden geprüft;
        eine Durchleitung über Patchpanel oder Netzwerkdosen ist noch nicht modelliert. Diese Planung prüft
        keine reale Netzversorgung des Switches und fließt nicht in die 230-V-Lastsimulation ein.
      </p>
    </fieldset>
  );
}
