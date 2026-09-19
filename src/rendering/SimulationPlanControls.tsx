import { useProjectStore } from "../stores/projectStore";
import { useEditorStore } from "../stores/editorStore";
import { useSimulationStore } from "../stores/simulationStore";
import { worldToScreen } from "../geometry/coordinates";
import { switchControl } from "../electrical/switchingControls";

/** Zugängliche HTML-Bedienung über dem Canvas; nur das Szenario wird verändert. */
export function SimulationPlanControls() {
  const project = useProjectStore((s) => s.project);
  const { category, floorId, viewport, size } = useEditorStore();
  const { active, scenario, operate } = useSimulationStore();
  if (!active || category !== "electrical") return null;
  return (
    <div className="simulation-plan-controls" aria-label="Lichtschalter direkt im Plan">
      {Object.values(project.electrical.switches)
        .filter((item) => item.floorId === floorId && project.layers[item.layerId]?.visible)
        .map((item) => {
          const p = worldToScreen(item.position, viewport);
          if (p.x < 0 || p.y < 0 || p.x > size.width || p.y > size.height) return null;
          const closed = scenario.switchStates[item.id] ?? item.closed;
          const group = switchControl(project, item.id),
            pulse = group?.mode === "impulseRelay";
          return (
            <button
              key={item.id}
              role={pulse ? "button" : "switch"}
              aria-checked={pulse ? undefined : closed}
              aria-label={`${item.label || item.name} im Plan ${pulse ? "betätigen" : "schalten"}`}
              className={pulse ? "is-pulse" : closed ? "is-on" : "is-off"}
              style={{
                left: Math.max(4, Math.min(p.x - 10, size.width - 76)),
                top: p.y + 74 > size.height ? Math.max(4, p.y - 42) : p.y + 42,
                opacity: project.layers[item.layerId]!.opacity,
              }}
              title={`${item.name}: ${pulse ? "Tastimpuls" : group ? "Stellung wechseln" : closed ? "ausschalten" : "einschalten"}`}
              onKeyDown={(event) => event.stopPropagation()}
              onClick={() => operate(item.id)}
            >
              {pulse ? (
                <span aria-hidden="true">↧</span>
              ) : (
                <span aria-hidden="true" className="switch-track">
                  <span />
                </span>
              )}
              {pulse ? "Tasten" : group ? (closed ? "I" : "II") : closed ? "Ein" : "Aus"}
            </button>
          );
        })}
    </div>
  );
}
