import type { circuitSupply } from "../../electrical/supply";

export function SupplySummary({ data }: { data: ReturnType<typeof circuitSupply> }) {
  const amps = (value: number | null) =>
    value === null ? "Unbekannt" : `${value.toLocaleString("de-DE")} A`;
  return (
    <section className="supply-summary" aria-label="Geplante Versorgung">
      <h3>Geplante Versorgung</h3>
      <dl>
        <dt>Versorgungsspannung</dt>
        <dd>
          <output aria-label="Versorgungsspannung">{data.voltage.toLocaleString("de-DE")} V</output>
        </dd>
        <dt>Stromkreisabsicherung</dt>
        <dd>
          <output aria-label="Stromkreisabsicherung">{amps(data.overcurrentRating)}</output>
        </dd>
        <dt>Anschlusskapazität je Phase</dt>
        <dd>{amps(data.capacity)}</dd>
      </dl>
      <p>{data.voltageOrigin}</p>
      <p>{data.board ? data.routeLabels.join(" → ") : "Noch keinem Stromkreis zugeordnet."}</p>
      <details>
        <summary>Versorgungsdetails</summary>
        {data.planningCurrentLimit !== null && (
          <p>
            Kleinster erfasster Nennwert: {amps(data.planningCurrentLimit)}. Die Anschlusskapazität teilen
            sich alle angeschlossenen Stromkreise.
          </p>
        )}
        <p>
          Nennwerte, keine aktuelle Stromaufnahme. Sicherungen schalten bei Überlast nach ihrer Kennlinie ab;
          sie regeln den Strom nicht auf diesen Wert.
        </p>
      </details>
      {!data.supply && <p>Einspeisung fehlt: Spannung ist bisher eine Planungsvorgabe.</p>}
      {data.warnings.length > 0 && (
        <ul className="supply-notes">
          {data.warnings.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
