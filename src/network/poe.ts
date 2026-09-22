import type { Housebook } from "../housebook/model";
import type { NetworkKind, NetworkNode } from "./model";

export const poeStandards = {
  af: { label: "IEEE 802.3af (PoE)", sourceW: 15.4, consumerW: 12.95 },
  at: { label: "IEEE 802.3at (PoE+)", sourceW: 30, consumerW: 25.5 },
};

export function poeDefaults(kind: NetworkKind, ports: number): NetworkNode["poe"] {
  if (!["poeSwitch", "poeDevice", "poeDoorbell"].includes(kind)) return undefined;
  return {
    role: kind === "poeSwitch" ? "source" : "consumer",
    standard: kind === "poeSwitch" ? "at" : "af",
    // A new generic switch needs its real budget entered before it can supply devices.
    budgetW: 0,
    powerW: kind === "poeDoorbell" ? 12 : 0,
    voltageV: 48,
    inputPort: 1,
    enabledPorts: kind === "poeSwitch" ? Array.from({ length: ports }, (_, i) => i + 1) : [],
  };
}

export interface PoeConsumerStatus {
  nodeId: string;
  sourceId?: string;
  sourcePort?: number;
  reservedW: number;
  currentA: number;
  ready: boolean;
  message: string;
}

/** Derived only from Ethernet links, never from a second independent supply assignment.
 * Passive patching is deliberately not inferred from unpaired front ports.
 * This is a compatibility/budget check, not a mains or Ethernet negotiation simulation.
 */
export function analyzePoe(book: Housebook) {
  const consumers: PoeConsumerStatus[] = [];
  const sources = new Map<string, { reservedW: number; budgetW: number }>();
  for (const node of book.networkNodes)
    if (node.poe?.role === "source") sources.set(node.id, { reservedW: 0, budgetW: node.poe.budgetW });
  for (const node of book.networkNodes) {
    const poe = node.poe;
    if (poe?.role !== "consumer") continue;
    const status: PoeConsumerStatus = {
      nodeId: node.id,
      reservedW: poeStandards[poe.standard].sourceW,
      currentA: poe.powerW / poe.voltageV,
      ready: false,
      message: "Keine direkte Ethernet-Verbindung zum PoE-Switch.",
    };
    consumers.push(status);
    const links = book.networkLinks.filter(
      (l) =>
        l.medium !== "coax" &&
        ((l.from === node.id && l.fromPort === poe.inputPort) ||
          (l.to === node.id && l.toPort === poe.inputPort)),
    );
    if (links.length !== 1) continue;
    const link = links[0]!;
    const sourceId = link.from === node.id ? link.to : link.from;
    const sourcePort = link.from === node.id ? link.toPort : link.fromPort;
    const source = book.networkNodes.find((n) => n.id === sourceId);
    if (source?.poe?.role !== "source") continue;
    status.sourceId = source.id;
    status.sourcePort = sourcePort;
    if (sourcePort > source.ports || !source.poe.enabledPorts.includes(sourcePort)) {
      status.message = "PoE ist an diesem Switch-Port ausgeschaltet.";
    } else if (poe.standard === "at" && source.poe.standard === "af") {
      status.message = "Verbraucher benötigt PoE+, der Switch unterstützt nur PoE.";
    } else if (poe.powerW <= 0) {
      status.message = "Leistung des PoE-Verbrauchers eintragen.";
    } else if (poe.powerW > poeStandards[poe.standard].consumerW) {
      status.message = "Verbraucherleistung überschreitet den gewählten PoE-Standard.";
    } else {
      sources.get(source.id)!.reservedW += status.reservedW;
      status.ready = true;
      status.message = "PoE-Verbindung und Leistungsbudget passen (Planungsprüfung).";
    }
  }
  for (const status of consumers) {
    const source = status.sourceId ? sources.get(status.sourceId) : undefined;
    if (status.ready && source && source.reservedW > source.budgetW) {
      status.ready = false;
      status.message =
        source.budgetW === 0
          ? "PoE-Gesamtbudget am Switch eintragen."
          : "PoE-Gesamtbudget überschritten. Keine gesicherte Versorgung aller Verbraucher.";
    }
  }
  return { consumers, sources };
}
