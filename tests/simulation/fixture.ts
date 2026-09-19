import { distributionFixture } from "../electrical/distributionFixture";
import { addElectrical } from "../../src/electrical/actions";

export function simulationFixture(powers = [130, 600, 25, 1500]) {
  const data = distributionFixture();
  const { project, sub, feeder, terminal, outlet, upper } = data;
  project.electrical.distributionBoards[sub]!.upstreamCircuitId = feeder;
  const names = ["Fernseher", "PC", "Lampe", "Kaffeemaschine"];
  const devices = powers.map((power, i) => {
    const id = addElectrical(project, upper.id, { x: 4000 + i * 700, y: 1000 }, "devices");
    Object.assign(project.electrical.devices[id]!, {
      name: names[i] ?? "Verbraucher",
      ratedPower: power,
      operatingMode: "on",
      connectionPointId: outlet,
    });
    return id;
  });
  return { ...data, terminal, devices };
}
