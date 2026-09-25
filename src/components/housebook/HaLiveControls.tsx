import { useHomeAssistantStore } from "../../stores/homeAssistantStore";
export function HaLiveControls() {
  const live = useHomeAssistantStore();
  return (
    <section aria-label="Home-Assistant-Livewerte">
      <label>
        Aktualisierung{" "}
        <select
          aria-label="Livewerte-Intervall"
          value={live.seconds}
          disabled={live.running}
          onChange={(e) => useHomeAssistantStore.setState({ seconds: Number(e.target.value) })}
        >
          <option value={5}>5 Sekunden</option>
          <option value={10}>10 Sekunden</option>
        </select>
      </label>
      <button onClick={() => (live.running ? live.stop() : live.start(live.seconds))}>
        {live.running ? "Livewerte stoppen" : "Livewerte starten"}
      </button>
      <label>
        <input
          type="checkbox"
          checked={live.visible}
          onChange={(e) => useHomeAssistantStore.setState({ visible: e.target.checked })}
        />{" "}
        Werte im Plan anzeigen
      </label>
      <p role="status">
        {live.running ? "Automatische Aktualisierung aktiv." : "Aktualisierung gestoppt."}{" "}
        {live.readAt
          ? `Letzter Empfang: ${new Date(live.readAt).toLocaleString("de-DE")}.`
          : "Noch keine Werte empfangen."}
      </p>
      {live.error && <p role="alert">{live.error}</p>}
    </section>
  );
}
