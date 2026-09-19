import { expect, it } from "vitest";
import { simulationFixture } from "./fixture";
import { simulate } from "../../src/simulation/solve";
import { emptyScenario } from "../../src/simulation/models";
import { deviceAppearance, deviceSymbolKind } from "../../src/rendering/deviceAppearance";

it("zeigt Leuchten und Betrieb nur für tatsächlich berechnete aktive Lasten", () => {
  const { project, devices, source } = simulationFixture([25, 600]);
  const lamp = project.electrical.devices[devices[0]!]!,
    device = project.electrical.devices[devices[1]!]!;
  lamp.type = "lamp";
  const scenario = emptyScenario();
  let result = simulate(project, scenario);
  expect(deviceAppearance(lamp, result.devices[lamp.id])).toMatchObject({
    running: true,
    label: "Leuchtet",
    kind: "lamp",
  });
  expect(deviceAppearance(device, result.devices[device.id])).toMatchObject({
    running: true,
    label: "In Betrieb",
    kind: "device",
  });
  scenario.disabledNodeIds.push(source);
  result = simulate(project, scenario);
  expect(deviceAppearance(lamp, result.devices[lamp.id])).toMatchObject({
    running: false,
    label: "Ohne Versorgung",
  });
  scenario.disabledNodeIds = [];
  scenario.deviceStates[lamp.id] = "off";
  expect(deviceAppearance(lamp, simulate(project, scenario).devices[lamp.id])).toMatchObject({
    running: false,
    label: "Aus",
  });
  delete scenario.deviceStates[lamp.id];
  scenario.assumeUnityPowerFactor = false;
  expect(deviceAppearance(lamp, simulate(project, scenario).devices[lamp.id])).toMatchObject({
    running: false,
    label: "Daten fehlen",
  });
  lamp.ratedPower = 0;
  lamp.powerFactor = 1;
  expect(deviceAppearance(lamp, simulate(project, scenario).devices[lamp.id])).toMatchObject({
    running: false,
    label: "Bereit · 0 W",
  });
  expect(deviceAppearance(lamp)).toMatchObject({ running: false, state: "idle", label: "" });
});

it("erkennt Lampentypen und Lichtnamen und respektiert eine explizite Symbolwahl ohne den Gerätetyp zu verändern", () => {
  const { project, devices } = simulationFixture([25]);
  const device = project.electrical.devices[devices[0]!]!;
  device.name = "LICHT";
  expect(deviceSymbolKind(device)).toBe("lamp");
  device.metadata.electricalSymbol = "device";
  expect(deviceSymbolKind(device)).toBe("device");
  device.name = "Anderer Verbraucher";
  device.metadata.electricalSymbol = "lamp";
  expect(deviceSymbolKind(device)).toBe("lamp");
  expect(device.type).toBe("other");
});
