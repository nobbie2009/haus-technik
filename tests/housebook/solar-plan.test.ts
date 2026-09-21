import { it, expect } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { parseProject } from "../../src/core/validation";
import { newSolarPlant, solarPlants, setSolarPlants } from "../../src/housebook/solar";
import { placeSolar, solarPlacement, solarPlanDetails } from "../../src/electrical/solarPlan";
import { newId } from "../../src/utils/uuid";
import { assetSchema } from "../../src/housebook/model";
import { transact } from "../../src/editor/history/transaction";
import { materialRows, planPrimitives } from "../../src/housebook/export";
import { useProjectStore } from "../../src/stores/projectStore";

it("legt eine Solarakte beim Platzieren an und ergänzt einen Speicher", () => {
  const project = createProject(),
    floor = project.floorOrder[0]!;
  const id = placeSolar(project, floor, { x: 0, y: 0 }, "plant", null);
  const plantId = solarPlacement(project.electrical.devices[id]!)!.plantId;
  placeSolar(project, floor, { x: 2000, y: 0 }, "battery", plantId);
  expect(solarPlants(project)).toHaveLength(1);
  expect(solarPlants(project)[0]!.battery).not.toBeNull();
  expect(() => parseProject(JSON.parse(JSON.stringify(project)))).not.toThrow();
  expect(materialRows(project).filter((r) => r[0] === "Solar")).toHaveLength(2);
  expect(planPrimitives(project, floor).some((p) => p.kind === "text" && p.text === "BAT")).toBe(true);
});
it("platziert vorhandene Module einzeln und erhält zentrale Leistungsdaten", () => {
  const project = createProject(),
    floor = project.floorOrder[0]!;
  const plant = newSolarPlant();
  plant.name = "Balkon";
  plant.modules = [{ id: newId(), quantity: 2, wp: 440, asset: assetSchema.parse({ model: "Testmodul" }) }];
  plant.inverter.powerW = 800;
  setSolarPlants(project, [plant]);
  const a = placeSolar(project, floor, { x: 0, y: 0 }, "module", plant.id);
  const b = placeSolar(project, floor, { x: 1200, y: 0 }, "module", plant.id);
  expect(solarPlacement(project.electrical.devices[a]!)!.index).toBe(0);
  expect(solarPlacement(project.electrical.devices[b]!)!.index).toBe(1);
  expect(() => placeSolar(project, floor, { x: 0, y: 0 }, "module", plant.id)).toThrow("bereits platziert");
  expect(solarPlants(project)).toHaveLength(1);
  expect(solarPlanDetails(project, project.electrical.devices[a]!)).toContain("440 Wp");
  plant.modules[0]!.wp = 450;
  setSolarPlants(project, [plant]);
  expect(solarPlanDetails(project, project.electrical.devices[a]!)).toContain("450 Wp");
  expect(project.electrical.devices[a]!.ratedPower).toBeNull();
  const inverter = placeSolar(project, floor, { x: 0, y: 2000 }, "inverter", plant.id);
  expect(solarPlanDetails(project, project.electrical.devices[inverter]!)).toContain("800 W AC");
  expect(() => placeSolar(project, floor, { x: 0, y: 0 }, "inverter", plant.id)).toThrow("bereits platziert");
  expect(() => parseProject(project)).not.toThrow();
});
it("respektiert die Elektrikebenensperre ohne neue Solarakte zu hinterlassen", () => {
  const project = createProject();
  Object.values(project.layers).find((l) => l.kind === "electrical")!.locked = true;
  expect(() =>
    transact(project, (draft) => {
      placeSolar(draft, draft.floorOrder[0]!, { x: 0, y: 0 }, "plant", null);
    }),
  ).toThrow();
  expect(solarPlants(project)).toHaveLength(0);
});
it("nimmt Planobjekt und neu angelegte Solarakte gemeinsam zurück", () => {
  const store = useProjectStore.getState();
  store.replace(createProject());
  expect(
    store.commit("Solaranlage platzieren", (draft) => {
      placeSolar(draft, draft.floorOrder[0]!, { x: 0, y: 0 }, "inverter", null);
    }),
  ).toBe(true);
  expect(solarPlants(useProjectStore.getState().project)).toHaveLength(1);
  store.undo();
  expect(solarPlants(useProjectStore.getState().project)).toHaveLength(0);
  expect(Object.values(useProjectStore.getState().project.electrical.devices)).toHaveLength(0);
  store.redo();
  expect(solarPlants(useProjectStore.getState().project)).toHaveLength(1);
  expect(Object.values(useProjectStore.getState().project.electrical.devices)).toHaveLength(1);
});
it("weist Solarobjekte ohne gültige Planmaße beim Import zurück", () => {
  const project = createProject();
  const id = placeSolar(project, project.floorOrder[0]!, { x: 0, y: 0 }, "plant", null);
  delete project.electrical.devices[id]!.metadata.consumerShape;
  expect(() => parseProject(project)).toThrow();
});
