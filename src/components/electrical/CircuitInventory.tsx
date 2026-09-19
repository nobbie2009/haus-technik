import { circuitMembers } from "../../electrical/selectors";
import { cableLengths } from "../../electrical/cables";
import type { ElectricalTarget } from "../../editor/interaction/focusElectrical";
import { useProjectStore } from "../../stores/projectStore";
import { formatLength } from "../../utils/units";

export function CircuitInventory({ id, onShow }: { id: string; onShow: (target: ElectricalTarget) => void }) {
  const project = useProjectStore((s) => s.project);
  const members = circuitMembers(project, id);
  const rows = [
    ...members.controls.map((item) => ({
      item,
      kind: "controls" as const,
      type: "Schaltgruppe / Relais",
      detail: `${item.switchIds.length} Schaltstellen`,
    })),
    ...members.transformers.map((item) => ({
      item,
      kind: "transformers" as const,
      type: "Transformator",
      detail: `${item.primaryVoltage} / ${item.secondaryVoltage} V · ${item.ratedVA} VA`,
    })),
    ...members.switches.map((item) => ({
      item,
      kind: "switches" as const,
      type: "Lichtschalter",
      detail: item.closed ? "Dokumentiert: Ein" : "Dokumentiert: Aus",
    })),
    ...members.boards.map((item) => ({
      item,
      kind: "distributionBoards" as const,
      type: "Unterverteilung",
      detail: "Versorgung über diesen Stromkreis",
    })),
    ...members.outlets.map((item) => ({
      item,
      kind: "outlets" as const,
      type: "Steckdose",
      detail: item.socketType,
    })),
    ...members.devices.map((item) => ({
      item,
      kind: "devices" as const,
      type: "Verbraucher",
      detail: `${item.ratedPower === null ? "Leistung unbekannt" : `${item.ratedPower.toLocaleString("de-DE")} W`} · ${item.connectionPointId ? `über ${project.electrical.outlets[item.connectionPointId]!.label || project.electrical.outlets[item.connectionPointId]!.name}` : "Festanschluss"}`,
    })),
    ...members.cables.map((item) => ({
      item,
      kind: "cables" as const,
      type: "Leitung",
      detail: `${item.type} · ${formatLength(cableLengths(project, item).totalLength, "m")} inkl. Zuschlag`,
    })),
  ];
  return (
    <section className="circuit-summary" aria-label="Stromkreisbestand">
      <h3>Zugeordnete Objekte</h3>
      {members.boards.length > 0 && (
        <p>
          {members.boards.length} nachgeschaltete Verteilungen. Die folgenden Leistungs- und Objektzahlen
          betreffen nur direkt zugeordnete Verbraucher; weitere Verbraucher stehen in den Stromkreisen der
          Unterverteilungen.
        </p>
      )}
      <strong>
        {members.outlets.length} Steckdosen · {members.devices.length} Verbraucher
      </strong>
      {members.switches.length > 0 && <p>{members.switches.length} Lichtschalter</p>}
      <p>Erfasste Nennleistung: {members.knownPower.toLocaleString("de-DE")} W</p>
      <p>
        {members.missingPower
          ? `${members.missingPower} Verbraucher ohne Leistungsangabe.`
          : members.devices.length
            ? "Leistungsangaben aller zugeordneten Verbraucher erfasst."
            : "Noch keine Verbraucher zugeordnet."}{" "}
        Summe der Typenschildwerte, keine Verbrauchs- oder Lastberechnung.
      </p>
      <p>
        <strong>
          {members.cables.length} Leitungen · {formatLength(members.totalLength, "m")} Gesamtlänge
        </strong>
        <br />
        Planlänge {formatLength(members.planLength, "m")} + Steigstrecken und Zuschläge{" "}
        {formatLength(members.totalLength - members.planLength, "m")}
      </p>
      <p>
        Alle Etagen. Nur ausdrücklich zugeordnete Leitungen werden gezählt; Verbindungen allein erzeugen keine
        Stromkreiszuordnung.
      </p>
      {!rows.length && (
        <p>
          Noch keine Objekte zugeordnet. Die Zuordnung erfolgt in den Eigenschaften des jeweiligen Objekts.
        </p>
      )}
      <ul className="circuit-inventory">
        {rows.map(({ item, kind, type, detail }) => {
          const layer = project.layers[item.layerId]!;
          const room = "roomId" in item && item.roomId ? project.rooms[item.roomId]?.name : null;
          return (
            <li key={item.id}>
              <div>
                <strong>{item.label || item.name}</strong> · {item.name}
                <span>
                  {type} · {project.floors[item.floorId]!.name}
                  {room ? ` · ${room}` : ""}
                </span>
                <span>{detail}</span>
                {(!layer.visible || layer.locked) && (
                  <span>{!layer.visible ? "Ebene ausgeblendet" : "Ebene gesperrt · nur ansehen"}</span>
                )}
              </div>
              <button
                disabled={!layer.visible}
                aria-label={`${item.label || item.name} im Plan anzeigen`}
                onClick={() => onShow({ kind, id: item.id })}
              >
                Im Plan
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
