import { create } from "zustand";
import { useProjectStore } from "./projectStore";
import { emptyScenario } from "../simulation/models";
import type { SimulationResult, SimulationScenario } from "../simulation/models";
import { simulate } from "../simulation/solve";
import { operateSwitch } from "../simulation/operateSwitch";

interface SimulationState {
  active: boolean;
  scenario: SimulationScenario;
  result: SimulationResult | null;
  start: () => void;
  stop: () => void;
  operate: (id: string) => void;
  update: (change: (scenario: SimulationScenario) => void) => void;
}
export const useSimulationStore = create<SimulationState>((set, get) => ({
  active: false,
  scenario: emptyScenario(),
  result: null,
  operate(id) {
    get().update((scenario) => operateSwitch(useProjectStore.getState().project, scenario, id));
  },
  start() {
    const scenario = emptyScenario();
    set({ active: true, scenario, result: simulate(useProjectStore.getState().project, scenario) });
  },
  stop() {
    set({ active: false, scenario: emptyScenario(), result: null });
  },
  update(change) {
    const scenario = structuredClone(get().scenario);
    change(scenario);
    set({ active: true, scenario, result: simulate(useProjectStore.getState().project, scenario) });
  },
}));
// Ergebnisse sind sitzungsbezogen. Jede Dokumentänderung beendet ein laufendes Szenario.
useProjectStore.subscribe((state, previous) => {
  if (state.project !== previous.project && useSimulationStore.getState().active)
    useSimulationStore.getState().stop();
});
