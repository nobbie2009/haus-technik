import type { Vec2 } from "../models/common";
import type { Background } from "../housebook/model";

/** Image coordinates point downwards; plan coordinates point upwards. */
export function alignAerial(image: Background, pixels: Vec2[], targets: Vec2[]): Background {
  if (pixels.length !== 2 || targets.length !== 2)
    throw new Error("Zwei Bildpunkte und zwei Planpunkte wählen.");
  const a = pixels[0]!,
    b = pixels[1]!,
    c = targets[0]!,
    d = targets[1]!;
  const pixelLength = Math.hypot(b.x - a.x, b.y - a.y);
  const length = Math.hypot(d.x - c.x, d.y - c.y);
  if (pixelLength < 2 || length < 1) throw new Error("Die Bezugspunkte liegen zu nah zusammen.");
  const scale = length / pixelLength;
  const angle = Math.atan2(-(d.y - c.y), d.x - c.x) - Math.atan2(b.y - a.y, b.x - a.x);
  const x = scale * (a.x * Math.cos(angle) - a.y * Math.sin(angle));
  const y = scale * (a.x * Math.sin(angle) + a.y * Math.cos(angle));
  return {
    ...image,
    width: image.pixelWidth * scale,
    rotation: (angle * 180) / Math.PI,
    position: { x: c.x - x, y: c.y + y },
  };
}
export function aerialCorners(image: Background): Vec2[] {
  const a = ((image.rotation ?? 0) * Math.PI) / 180;
  const h = (image.width * image.pixelHeight) / image.pixelWidth;
  return [
    [0, 0],
    [image.width, 0],
    [image.width, h],
    [0, h],
  ].map(([x, y]) => ({
    x: image.position.x + x! * Math.cos(a) - y! * Math.sin(a),
    y: image.position.y - x! * Math.sin(a) - y! * Math.cos(a),
  }));
}
