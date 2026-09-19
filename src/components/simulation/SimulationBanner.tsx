import { useSimulationStore } from "../../stores/simulationStore";
export function SimulationBanner() {
  const active = useSimulationStore((s) => s.active);
  if (!active) return null;
  return (
    <div className="simulation-banner" role="status">
      <strong>Simulation aktiv</strong>
      <span>
        Lampen leuchten, Verbraucher zeigen ihren Betrieb. Schalter direkt im Plan bedienen. Projektänderungen
        beenden das Szenario.
      </span>
      <button onClick={() => useSimulationStore.getState().stop()}>Simulation beenden</button>
    </div>
  );
}
