import { newId } from "../utils/uuid";
import { z } from "zod";
import { projectSchema } from "../core/projectSchema";
import { isJsonTree } from "../core/json";
import { parseProject } from "../core/validation";
import type { Project } from "../models/project";
import { emptyElectrical, defaultElectricalSettings } from "../electrical/models";
import {
  version4ElectricalSchema,
  version5ElectricalSchema,
  version6ElectricalSchema,
  version7ElectricalSchema,
  version8ElectricalSchema,
  version9ElectricalSchema,
} from "../electrical/schema";

const version9Schema = projectSchema.extend({
  schemaVersion: z.literal(9),
  electrical: version9ElectricalSchema,
});

const version8Schema = projectSchema.extend({
  schemaVersion: z.literal(8),
  electrical: version8ElectricalSchema,
});

const version7Schema = projectSchema.extend({
  schemaVersion: z.literal(7),
  electrical: version7ElectricalSchema,
});

const version6Schema = projectSchema.extend({
  schemaVersion: z.literal(6),
  electrical: version6ElectricalSchema,
});

const version5Schema = projectSchema.extend({
  schemaVersion: z.literal(5),
  electrical: version5ElectricalSchema,
});

const version4Schema = projectSchema.extend({
  schemaVersion: z.literal(4),
  electrical: version4ElectricalSchema,
});

const version3Schema = projectSchema.extend({
  schemaVersion: z.literal(3),
  electrical: version4ElectricalSchema.omit({ junctions: true, cables: true }),
});
const version2Schema = projectSchema.omit({ electrical: true }).extend({ schemaVersion: z.literal(2) });
const legacySchema = version2Schema.omit({ furniture: true }).extend({ schemaVersion: z.literal(1) });
export function migrateProject(raw: unknown): Project {
  if (!isJsonTree(raw)) return parseProject(raw);
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("schemaVersion" in raw) ||
    ![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(Number(raw.schemaVersion))
  )
    return parseProject(raw);
  if (raw.schemaVersion === 9) {
    const legacy = version9Schema.parse(raw);
    return parseProject({
      ...legacy,
      schemaVersion: 10,
      electrical: {
        ...legacy.electrical,
        controls: {},
        transformers: {},
        devices: Object.fromEntries(
          Object.entries(legacy.electrical.devices).map(([id, item]) => [
            id,
            { ...item, controlId: null, transformerId: null },
          ]),
        ),
        cables: Object.fromEntries(
          Object.entries(legacy.electrical.cables).map(([id, item]) => [
            id,
            { ...item, riser: null, endPath: [] },
          ]),
        ),
      },
    });
  }
  if (raw.schemaVersion === 8) {
    const legacy = version8Schema.parse(raw);
    return migrateProject({
      ...legacy,
      schemaVersion: 9,
      electrical: {
        ...legacy.electrical,
        switches: Object.fromEntries(
          Object.entries(legacy.electrical.switches).map(([id, item]) => [
            id,
            { ...item, supply: { kind: "circuit" } },
          ]),
        ),
      },
    });
  }
  if (raw.schemaVersion === 7) {
    const legacy = version7Schema.parse(raw);
    return migrateProject({
      ...legacy,
      schemaVersion: 8,
      electrical: {
        ...legacy.electrical,
        cables: Object.fromEntries(
          Object.entries(legacy.electrical.cables).map(([id, cable]) => [
            id,
            { ...cable, conductorConnections: [], connectionAssignment: "none" },
          ]),
        ),
      },
    });
  }
  if (raw.schemaVersion === 6) {
    const legacy = version6Schema.parse(raw);
    return migrateProject({
      ...legacy,
      schemaVersion: 7,
      electrical: {
        ...legacy.electrical,
        switches: {},
        devices: Object.fromEntries(
          Object.entries(legacy.electrical.devices).map(([id, device]) => [
            id,
            { ...device, switchId: null },
          ]),
        ),
      },
    });
  }
  if (raw.schemaVersion === 5) {
    const legacy = version5Schema.parse(raw);
    return migrateProject({
      ...legacy,
      schemaVersion: 6,
      electrical: {
        ...legacy.electrical,
        distributionBoards: Object.fromEntries(
          Object.entries(legacy.electrical.distributionBoards).map(([id, board]) => [
            id,
            { ...board, upstreamCircuitId: null },
          ]),
        ),
      },
    });
  }
  if (raw.schemaVersion === 3 || raw.schemaVersion === 4) {
    const legacy = raw.schemaVersion === 3 ? version3Schema.parse(raw) : version4Schema.parse(raw);
    return migrateProject({
      ...legacy,
      schemaVersion: 6,
      electrical: {
        junctions: {},
        cables: {},
        ...legacy.electrical,
        settings: defaultElectricalSettings(),
        supplies: {},
        meters: {},
        distributionBoards: Object.fromEntries(
          Object.entries(legacy.electrical.distributionBoards).map(([id, item]) => [
            id,
            { ...item, supplyId: null, meterId: null, upstreamCircuitId: null },
          ]),
        ),
        protectionDevices: Object.fromEntries(
          Object.entries(legacy.electrical.protectionDevices).map(([id, item]) => [
            id,
            { ...item, upstreamProtectionDeviceId: null },
          ]),
        ),
      },
    });
  }
  const legacy =
    raw.schemaVersion === 1 ? { ...legacySchema.parse(raw), furniture: {} } : version2Schema.parse(raw);
  if (!Object.values(legacy.layers).some((layer) => layer.kind === "furniture")) {
    const id = newId();
    legacy.layers[id] = {
      id,
      kind: "furniture",
      name: "Möbel",
      visible: true,
      locked: false,
      opacity: 1,
      metadata: {},
    };
    legacy.layerOrder.push(id);
  }
  if (!Object.values(legacy.layers).some((layer) => layer.kind === "electrical")) {
    const id = newId();
    legacy.layers[id] = {
      id,
      kind: "electrical",
      name: "Elektrik",
      visible: true,
      locked: false,
      opacity: 1,
      metadata: {},
    };
    legacy.layerOrder.push(id);
  }
  return parseProject({ ...legacy, schemaVersion: 10, electrical: emptyElectrical() });
}
