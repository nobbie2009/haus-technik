import type { ElectricalDevice, Transformer } from "./models";

/** Legacy transformers retain their freely editable single output. */
export function transformerOutputs(transformer: Transformer): number[] {
  return transformer.secondaryVoltages ?? [transformer.secondaryVoltage];
}

export function transformerVoltage(transformer: Transformer, device?: ElectricalDevice): number {
  return device?.transformerVoltage ?? transformer.secondaryVoltage;
}

export function transformerOutputLabel(transformer: Transformer): string {
  return `${transformerOutputs(transformer).join(" / ")} V`;
}
