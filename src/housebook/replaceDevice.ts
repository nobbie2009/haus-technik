import type { Project } from "../models/project";
import { asset, setAsset, housebook, setHousebook } from "./model";
export interface Replacement {
  name: string;
  manufacturer: string;
  model: string;
  serial: string;
  entity: string;
  ports?: number;
  zigbeeAddress?: string;
  power?: number | null;
}
export function replaceDevice(
  p: Project,
  kind: "devices" | "networkNodes",
  id: string,
  replacement: Replacement,
) {
  if (!replacement.name.trim()) throw new Error("Gerätename fehlt.");
  if (kind === "devices") {
    const device = p.electrical.devices[id];
    if (!device) throw new Error("Verbraucher fehlt.");
    if (p.layers[device.layerId]?.locked) throw new Error("Ebene gesperrt.");
    const previous = asset(device);
    device.metadata.lastReplacement = {
      at: new Date().toISOString(),
      name: device.name,
      manufacturer: previous.manufacturer,
      model: previous.model,
      serial: previous.serial,
    };
    device.name = replacement.name;
    if (replacement.power !== undefined) {
      device.ratedPower = replacement.power;
      device.ratedCurrent =
        replacement.power !== null && device.ratedVoltage && device.phases === 1
          ? replacement.power / (device.ratedVoltage * (device.powerFactor ?? 1))
          : null;
    }
    setAsset(device, {
      ...previous,
      manufacturer: replacement.manufacturer,
      model: replacement.model,
      serial: replacement.serial,
      homeAssistantEntity: replacement.entity,
      photo: "",
      documentUrl: "",
      maintenanceDate: "",
    });
  } else {
    const book = housebook(p),
      device = book.networkNodes.find((n) => n.id === id);
    if (!device) throw new Error("Netzwerkgerät fehlt.");
    if (Object.values(p.layers).some((l) => l.kind === "network" && l.locked))
      throw new Error("Netzwerkebene gesperrt.");
    const ports = replacement.ports ?? device.ports;
    if (device.tv && ports !== device.ports)
      throw new Error("Bei TV-/SAT-Geräten muss die vorhandene Anschlussbelegung erhalten bleiben.");
    const used = book.networkLinks.flatMap((l) =>
      l.from === id ? [l.fromPort] : l.to === id ? [l.toPort] : [],
    );
    if (!Number.isInteger(ports) || ports < Math.max(1, ...used) || ports > 256)
      throw new Error(
        "Das Ersatzgerät benötigt mindestens alle bisher belegten Portnummern (maximal 256 Ports).",
      );
    if (device.kind === "zigbee") {
      if (!book.zigbee?.devices.some((d) => d.address === replacement.zigbeeAddress))
        throw new Error("Ersatzgerät zuerst aus Zigbee2MQTT einlesen.");
      if (book.networkNodes.some((n) => n.id !== id && n.zigbeeAddress === replacement.zigbeeAddress))
        throw new Error("Dieses Zigbee-Gerät ist bereits platziert.");
      device.zigbeeAddress = replacement.zigbeeAddress;
    }
    const previous = asset({ id, metadata: device.metadata ?? {} });
    device.metadata ??= {};
    device.metadata.lastReplacement = {
      at: new Date().toISOString(),
      name: device.name,
      manufacturer: previous.manufacturer,
      model: previous.model,
      serial: previous.serial,
    };
    device.name = replacement.name;
    device.ports = ports;
    if (device.poe) device.poe.enabledPorts = device.poe.enabledPorts.filter((port) => port <= ports);
    if (device.poe && device.poe.inputPort > ports)
      throw new Error("Der PoE-Eingangsport liegt außerhalb des Ersatzgeräts.");
    setAsset(
      { id, metadata: device.metadata },
      {
        ...previous,
        manufacturer: replacement.manufacturer,
        model: replacement.model,
        serial: replacement.serial,
        homeAssistantEntity: replacement.entity,
        photo: "",
        documentUrl: "",
        maintenanceDate: "",
      },
    );
    setHousebook(p, book);
  }
}
