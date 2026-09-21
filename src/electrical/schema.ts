import { z } from "zod";
import type { ElectricalModel } from "./models";

const id = z.uuid();
const finite = z.number().finite();
const name = z.string().trim().min(1);
const entity = { id, metadata: z.record(z.string(), z.json()) };
const positive = finite.positive().nullable();
const placement = {
  ...entity,
  floorId: id,
  layerId: id,
  name,
  label: z.string(),
  labelMode: z.enum(["label", "name", "number", "circuit", "none"]),
  position: z.strictObject({ x: finite, y: finite }),
  roomId: id.nullable(),
};
const ratings = {
  ratedVoltage: positive,
  ratedCurrent: finite.nonnegative().nullable(),
  phases: z.union([z.literal(1), z.literal(3)]),
};
export const version4ElectricalSchema = z.strictObject({
  junctions: z.record(
    id,
    z.strictObject({ ...placement, type: z.enum(["junctionBox", "terminal", "connectionPoint"]) }),
  ),
  cables: z.record(
    id,
    z.strictObject({
      ...entity,
      floorId: id,
      layerId: id,
      name,
      label: z.string(),
      type: name,
      startNodeId: id,
      endNodeId: id,
      path: z.array(z.strictObject({ x: finite, y: finite })),
      circuitId: id.nullable(),
      conductorCount: z.number().int().positive().nullable(),
      conductorCrossSection: positive,
      material: z.string(),
      installationMethod: z.string(),
      ratedVoltage: positive,
      lengthAllowance: finite.nonnegative(),
    }),
  ),
  outlets: z.record(
    id,
    z.strictObject({
      ...placement,
      ...ratings,
      number: z.string(),
      wallId: id.nullable(),
      circuitId: id.nullable(),
      socketType: name,
    }),
  ),
  devices: z.record(
    id,
    z.strictObject({
      ...placement,
      ...ratings,
      type: name,
      furnitureId: id.nullable(),
      connectionPointId: id.nullable(),
      circuitId: id.nullable(),
      ratedPower: finite.nonnegative().nullable(),
      powerFactor: finite.min(0).max(1).nullable(),
      operatingMode: z.enum(["on", "off", "standby"]),
    }),
  ),
  distributionBoards: z.record(id, z.strictObject(placement)),
  circuits: z.record(
    id,
    z.strictObject({
      ...entity,
      name,
      label: z.string(),
      distributionBoardId: id,
      protectionDeviceId: id.nullable(),
      phase: z.enum(["L1", "L2", "L3", "L1/L2/L3", "unknown"]),
      nominalVoltage: positive,
    }),
  ),
  protectionDevices: z.record(
    id,
    z.strictObject({
      ...entity,
      distributionBoardId: id,
      type: z.enum(["MCB", "RCD", "RCBO", "fuse", "other"]),
      label: name,
      ratedCurrent: positive,
      characteristic: z.string(),
      poles: z.number().int().min(1).max(4),
      residualCurrent: positive,
      breakingCapacity: positive,
    }),
  ),
});
export const version5ElectricalSchema = version4ElectricalSchema.extend({
  settings: z.strictObject({ phaseNeutralVoltage: finite.positive(), phasePhaseVoltage: finite.positive() }),
  supplies: z.record(
    id,
    z.strictObject({
      ...placement,
      phaseNeutralVoltage: positive,
      phasePhaseVoltage: positive,
      phases: z.union([z.literal(1), z.literal(3)]),
      ratedCurrent: positive,
    }),
  ),
  meters: z.record(
    id,
    z.strictObject({
      ...placement,
      supplyId: id.nullable(),
      serialNumber: z.string(),
      readingKWh: finite.nonnegative().nullable(),
    }),
  ),
  distributionBoards: z.record(
    id,
    version4ElectricalSchema.shape.distributionBoards.valueType.extend({
      supplyId: id.nullable(),
      meterId: id.nullable(),
    }),
  ),
  protectionDevices: z.record(
    id,
    version4ElectricalSchema.shape.protectionDevices.valueType.extend({
      upstreamProtectionDeviceId: id.nullable(),
    }),
  ),
});
export const version6ElectricalSchema = version5ElectricalSchema.extend({
  distributionBoards: z.record(
    id,
    version5ElectricalSchema.shape.distributionBoards.valueType.extend({ upstreamCircuitId: id.nullable() }),
  ),
});
export const version7ElectricalSchema = version6ElectricalSchema.extend({
  switches: z.record(
    id,
    z.strictObject({
      ...placement,
      type: z.literal("singlePole"),
      circuitId: id.nullable(),
      wallId: id.nullable(),
      closed: z.boolean(),
    }),
  ),
  devices: z.record(id, version6ElectricalSchema.shape.devices.valueType.extend({ switchId: id.nullable() })),
});
export const version8ElectricalSchema = version7ElectricalSchema.extend({
  cables: z.record(
    id,
    version7ElectricalSchema.shape.cables.valueType.extend({
      conductorConnections: z
        .array(z.strictObject({ startContactId: z.string().min(1), endContactId: z.string().min(1) }))
        .max(5),
      connectionAssignment: z.enum(["none", "switch", "outlet"]),
    }),
  ),
});
export const version9ElectricalSchema = version8ElectricalSchema.extend({
  switches: z.record(
    id,
    version8ElectricalSchema.shape.switches.valueType.extend({
      supply: z.discriminatedUnion("kind", [
        z.strictObject({ kind: z.literal("circuit") }),
        z.strictObject({ kind: z.literal("switch"), switchId: id }),
        z.strictObject({ kind: z.literal("disconnected") }),
      ]),
    }),
  ),
});
export const electricalSchema = version9ElectricalSchema.extend({
  controls: z.record(
    id,
    z.strictObject({
      ...placement,
      mode: z.enum(["changeover", "impulseRelay"]),
      circuitId: id.nullable(),
      switchIds: z.array(id),
      initialOn: z.boolean(),
      inverted: z.boolean(),
    }),
  ),
  transformers: z.record(
    id,
    z.strictObject({
      ...placement,
      circuitId: id.nullable(),
      primaryVoltage: finite.positive(),
      distributionBoardId: id.nullable().optional(),
      secondaryVoltages: z.array(finite.positive()).min(1).max(12).optional(),
      secondaryVoltage: finite.positive(),
      ratedVA: finite.positive(),
    }),
  ),
  devices: z.record(
    id,
    version9ElectricalSchema.shape.devices.valueType.extend({
      controlId: id.nullable(),
      transformerId: id.nullable(),
      transformerVoltage: finite.positive().nullable().optional(),
    }),
  ),
  cables: z.record(
    id,
    version9ElectricalSchema.shape.cables.valueType.extend({
      riser: z.strictObject({ x: finite, y: finite }).nullable(),
      endPath: z.array(z.strictObject({ x: finite, y: finite })),
    }),
  ),
}) satisfies z.ZodType<ElectricalModel>;
