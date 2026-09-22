import { expect, it } from "vitest";
import { conductorFixture } from "../simulation/conductorFixture";
import { fillCurrentDefault } from "../../src/electrical/currentDefault";
import { calculateLoad } from "../../src/simulation/load";

it("füllt LED-Ampere nach, rechnet Änderungen nach und erhält manuelle Angaben", () => {
  const { project, device: id } = conductorFixture();
  const device = project.electrical.devices[id]!;
  device.ratedPower = 5;
  fillCurrentDefault(device);
  expect(device.ratedCurrent).toBe(0.021739);
  expect(calculateLoad(device, 230, true)).toMatchObject({ estimated: true, issues: [] });
  expect(calculateLoad(device, 230, false).issues).toContain("Leistungsfaktor fehlt.");
  device.ratedPower = 8;
  fillCurrentDefault(device);
  expect(device.ratedCurrent).toBe(0.034783);
  device.ratedCurrent = 0.1;
  fillCurrentDefault(device);
  device.ratedPower = 10;
  fillCurrentDefault(device);
  expect(device.ratedCurrent).toBe(0.1);
  device.ratedCurrent = null;
  fillCurrentDefault(device);
  expect(device.ratedCurrent).toBe(0.043478);
  device.ratedVoltage = null;
  fillCurrentDefault(device);
  expect(device.ratedCurrent).toBeNull();
});

it("berücksichtigt Drehstrom und Leistungsfaktor und berechnet keine ungültigen Werte", () => {
  const { project, device: id } = conductorFixture();
  const device = project.electrical.devices[id]!;
  Object.assign(device, { ratedPower: 1000, ratedVoltage: 400, phases: 3, powerFactor: 0.8 });
  fillCurrentDefault(device);
  expect(device.ratedCurrent).toBeCloseTo(1000 / (Math.sqrt(3) * 400 * 0.8), 6);
  device.powerFactor = 0;
  fillCurrentDefault(device);
  expect(device.ratedCurrent).toBeNull();
});
