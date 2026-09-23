import { z } from "zod";

const address = z
  .string()
  .regex(/^0x[0-9a-f]{16}$/i)
  .transform((v) => v.toLowerCase());
export const zigbeeDeviceSchema = z.object({
  address,
  name: z.string().max(150),
  type: z.enum(["Coordinator", "Router", "EndDevice", "Unknown"]),
  model: z.string().max(200),
  vendor: z.string().max(200),
});
export const zigbeeLinkSchema = z.object({
  from: address,
  to: address,
  lqi: z.number().min(0).max(255).nullable(),
  depth: z.number().int().nonnegative().nullable(),
  relationship: z.number().int().nullable(),
  routes: z.array(z.number().int().min(0).max(65535)).max(1000),
});
export const zigbeeSchema = z.object({
  baseTopic: z.string().max(200).optional(),
  devices: z.array(zigbeeDeviceSchema).max(1000),
  links: z.array(zigbeeLinkSchema).max(10000),
  scannedAt: z.string().nullable(),
  failures: z.array(z.string().max(200)).max(1000).optional(),
});
export type ZigbeeDevice = z.infer<typeof zigbeeDeviceSchema>;
export type ZigbeeLink = z.infer<typeof zigbeeLinkSchema>;
export type ZigbeeSnapshot = z.infer<typeof zigbeeSchema>;
export const emptyZigbee = (): ZigbeeSnapshot => ({ devices: [], links: [], scannedAt: null });
const deviceInput = z.object({
  ieee_address: address,
  friendly_name: z.string(),
  type: z.string(),
  definition: z.object({ model: z.string().optional(), vendor: z.string().optional() }).nullish(),
});
export function readZigbeeDevices(payload: unknown): ZigbeeDevice[] {
  const devices = z
    .array(deviceInput)
    .max(1000)
    .parse(payload)
    .map((d) => ({
      address: d.ieee_address,
      name: d.friendly_name.slice(0, 150),
      type: (["Coordinator", "Router", "EndDevice"].includes(d.type)
        ? d.type
        : "Unknown") as ZigbeeDevice["type"],
      model: (d.definition?.model ?? "").slice(0, 200),
      vendor: (d.definition?.vendor ?? "").slice(0, 200),
    }));
  if (new Set(devices.map((d) => d.address)).size !== devices.length)
    throw new Error("Doppelte Zigbee-Geräteadresse.");
  return devices;
}
const rawLink = z.object({
  source: z.object({ ieeeAddr: address }),
  target: z.object({ ieeeAddr: address }),
  lqi: z.number().min(0).max(255).optional(),
  linkquality: z.number().min(0).max(255).optional(),
  depth: z.number().int().nonnegative().optional(),
  relationship: z.number().int().optional(),
  routes: z
    .array(z.object({ destinationAddress: z.number().int().min(0).max(65535) }))
    .max(1000)
    .default([]),
});
export function readZigbeeMap(payload: unknown): ZigbeeLink[] {
  const response = z
    .object({
      status: z.literal("ok"),
      data: z.object({ type: z.literal("raw"), value: z.object({ links: z.array(rawLink).max(10000) }) }),
    })
    .parse(payload);
  return response.data.value.links.map((l) => ({
    from: l.source.ieeeAddr,
    to: l.target.ieeeAddr,
    lqi: l.lqi ?? l.linkquality ?? null,
    depth: l.depth ?? null,
    relationship: l.relationship ?? null,
    routes: l.routes.map((r) => r.destinationAddress),
  }));
}

export function readZigbeeScanFailures(payload: unknown): string[] {
  const response = z
    .object({
      data: z.object({
        value: z.object({
          nodes: z
            .array(z.object({ ieeeAddr: address, failed: z.array(z.string()).optional() }))
            .max(1000)
            .optional(),
        }),
      }),
    })
    .parse(payload);
  return (response.data.value.nodes ?? [])
    .filter((n) => n.failed?.length)
    .map((n) => `${n.ieeeAddr}: ${n.failed!.join(", ")}`.slice(0, 200));
}
