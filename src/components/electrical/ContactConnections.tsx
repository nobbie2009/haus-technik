import type { Cable } from "../../electrical/models";
import type { Contact } from "../../electrical/contacts";
import { SelectField } from "./ElectricalFields";

export function ContactConnections({
  rows,
  start,
  end,
  onChange,
}: {
  rows: Cable["conductorConnections"];
  start: Contact[];
  end: Contact[];
  onChange: (rows: Cable["conductorConnections"]) => void;
}) {
  return (
    <fieldset className="contact-connections">
      <legend>Kontaktverbindungen</legend>
      {!rows.length && <p>Keine Kontakte belegt. Die Leitung dokumentiert nur den geometrischen Weg.</p>}
      {rows.map((row, index) => {
        const a = start.find((c) => c.id === row.startContactId);
        const b = end.find((c) => c.id === row.endContactId);
        const automatic = a && b && a.role === b.role && ["neutral", "protective"].includes(a.role);
        const editor = (
          <div className="contact-row" key={index}>
            <span className="contact-row-number">{index + 1}</span>
            {(["start", "end"] as const).map((side) => {
              const key = side === "start" ? "startContactId" : "endContactId";
              const all = side === "start" ? start : end;
              const other = (side === "start" ? end : start).find(
                (c) => c.id === row[side === "start" ? "endContactId" : "startContactId"],
              );
              const contacts = all.filter(
                (c) =>
                  (!other || c.role === other.role) && !rows.some((r, i) => i !== index && r[key] === c.id),
              );
              return (
                <SelectField
                  key={side}
                  label={`Verbindung ${index + 1} · ${side === "start" ? "Startkontakt" : "Zielkontakt"}`}
                  value={row[key]}
                  onChange={(value) =>
                    onChange(rows.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
                  }
                >
                  <option value="">Kontakt wählen</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.label}
                    </option>
                  ))}
                </SelectField>
              );
            })}
            <button
              type="button"
              aria-label={`Verbindung ${index + 1} entfernen`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              Entfernen
            </button>
          </div>
        );
        return automatic ? (
          <details key={index} className="automatic-contact">
            <summary>
              {a.role === "neutral" ? "N → N" : "PE → PE"} · vorbelegt · bei Bedarf bearbeiten
            </summary>
            {editor}
          </details>
        ) : (
          editor
        );
      })}
      <button
        type="button"
        disabled={!start.length || !end.length || rows.length >= Math.min(start.length, end.length)}
        onClick={() => onChange([...rows, { startContactId: "", endContactId: "" }])}
      >
        Kontaktverbindung ergänzen
      </button>
    </fieldset>
  );
}
