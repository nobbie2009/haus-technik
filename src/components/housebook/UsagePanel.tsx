import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { homeBook, meterKinds, consumption, localDate, type Meter, type Reading } from "../../housebook/home";
import { newId } from "../../utils/uuid";
import { download, csv } from "../../housebook/export";
import { Field } from "./shared";
import { TargetField, updateHome } from "./HomeShared";
const freshMeter = (): Meter => ({
  id: newId(),
  name: "",
  kind: "electricity",
  unit: "kWh",
  serial: "",
  location: "",
  target: null,
  price: null,
  readings: [],
});
const freshReading = (): Reading => ({ id: newId(), date: localDate(), value: 0, reset: false, note: "" });
const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 3 });
export function UsagePanel({ onClose }: { onClose: () => void }) {
  const p = useProjectStore((s) => s.project),
    b = homeBook(p);
  const [selected, setSelected] = useState(b.meters[0]?.id ?? ""),
    [draft, setDraft] = useState<Meter>(freshMeter),
    [reading, setReading] = useState<Reading>(freshReading),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const meter = b.meters.find((m) => m.id === selected),
    intervals = meter ? consumption(meter, from, to) : [],
    valid = intervals.filter((i) => i.value !== null),
    total = valid.reduce((sum, i) => sum + i.value!, 0),
    days = valid.reduce((sum, i) => sum + i.days, 0),
    max = Math.max(1, ...valid.map((i) => i.value!));
  return (
    <section>
      <h3>Zählerstände & Verbräuche</h3>
      <p>
        Eigene Ableseverläufe für Strom, Wasser, Gas, Wärme und Solarertrag. Preise dienen als Schätzung ohne
        Grundgebühr; Gas wird nicht automatisch in kWh umgerechnet.
      </p>
      <Field label="Zähler auswählen">
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setReading(freshReading());
          }}
        >
          <option value="">Zähler wählen</option>
          {b.meters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.unit}
            </option>
          ))}
        </select>
      </Field>
      <div className="book-actions">
        <button onClick={() => setDraft(freshMeter())}>Neuer Zähler</button>
        {meter && (
          <>
            <button onClick={() => setDraft(structuredClone(meter))}>Zähler bearbeiten</button>
            <button
              onClick={() => {
                if (
                  window.confirm(`Zähler „${meter.name}“ mit allen Ablesungen löschen?`) &&
                  updateHome("Zähler löschen", (b) => {
                    b.meters = b.meters.filter((m) => m.id !== meter.id);
                  })
                ) {
                  setSelected("");
                  setDraft(freshMeter());
                }
              }}
            >
              Zähler löschen
            </button>
          </>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            updateHome("Zähler speichern", (b) => {
              const old = b.meters.find((m) => m.id === draft.id);
              if (old) {
                if (old.readings.length && old.unit !== draft.unit)
                  throw new Error("Einheit bei vorhandenen Ablesungen nicht ändern.");
                Object.assign(old, { ...draft, readings: old.readings });
              } else b.meters.push(draft);
            })
          ) {
            setSelected(draft.id);
            setDraft(freshMeter());
            setReading(freshReading());
          }
        }}
      >
        <h4>{b.meters.some((m) => m.id === draft.id) ? "Zählerdaten bearbeiten" : "Zähler anlegen"}</h4>
        <div className="book-grid">
          <Field label="Zählername">
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>
          <Field label="Zählerart">
            <select
              value={draft.kind}
              onChange={(e) => setDraft({ ...draft, kind: e.target.value as Meter["kind"] })}
            >
              {Object.entries(meterKinds).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Einheit">
            <select
              disabled={draft.readings.length > 0}
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value as Meter["unit"] })}
            >
              {["kWh", "m³", "l"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="Zählernummer">
            <input value={draft.serial} onChange={(e) => setDraft({ ...draft, serial: e.target.value })} />
          </Field>
          <Field label="Zählerstandort">
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </Field>
          <Field label="Rechenpreis (€ je Einheit)">
            <input
              type="number"
              step="any"
              min="0"
              value={draft.price ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, price: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>
          <TargetField
            value={draft.target}
            onChange={(target) => setDraft({ ...draft, target })}
            onClose={onClose}
          />
        </div>
        <div className="book-actions">
          <button>Zähler speichern</button>
        </div>
      </form>
      {meter && (
        <>
          <h4>{meter.name} · Ablesungen</h4>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                updateHome("Ablesung speichern", (b) => {
                  const m = b.meters.find((m) => m.id === meter.id)!;
                  const index = m.readings.findIndex((r) => r.id === reading.id);
                  if (index < 0) m.readings.push(reading);
                  else m.readings[index] = reading;
                })
              )
                setReading(freshReading());
            }}
          >
            <div className="book-grid">
              <Field label="Ablesedatum">
                <input
                  required
                  type="date"
                  value={reading.date}
                  onChange={(e) => setReading({ ...reading, date: e.target.value })}
                />
              </Field>
              <Field label={`Zählerstand (${meter.unit})`}>
                <input
                  required
                  type="number"
                  min="0"
                  step="any"
                  value={reading.value}
                  onChange={(e) => setReading({ ...reading, value: Number(e.target.value) })}
                />
              </Field>
              <Field label="Ablesenotiz">
                <input
                  value={reading.note}
                  onChange={(e) => setReading({ ...reading, note: e.target.value })}
                />
              </Field>
              <Field label="Zählerwechsel / Neustart seit letzter Ablesung">
                <input
                  type="checkbox"
                  checked={reading.reset}
                  onChange={(e) => setReading({ ...reading, reset: e.target.checked })}
                />
              </Field>
            </div>
            <div className="book-actions">
              <button>Ablesung speichern</button>
              <button type="button" onClick={() => setReading(freshReading())}>
                Neue Ablesung
              </button>
            </div>
          </form>
          {[...meter.readings]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((r) => (
              <article className="home-row" key={r.id}>
                <strong>
                  {r.date}: {fmt(r.value)} {meter.unit}
                </strong>
                <span>
                  {r.reset ? "Zählerwechsel · " : ""}
                  {r.note}
                </span>
                <button onClick={() => setReading({ ...r })}>Korrigieren: {r.date}</button>
                <button
                  onClick={() => {
                    if (
                      window.confirm("Ablesung löschen?") &&
                      updateHome("Ablesung löschen", (b) => {
                        const m = b.meters.find((m) => m.id === meter.id)!;
                        m.readings = m.readings.filter((v) => v.id !== r.id);
                      })
                    )
                      setReading(freshReading());
                  }}
                >
                  Ablesung löschen: {r.date}
                </button>
              </article>
            ))}
          <h4>Verbrauchsübersicht</h4>
          <div className="book-grid">
            <Field label="Zeitraum von">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Zeitraum bis">
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <p>
            Es zählen nur vollständig enthaltene Ablesezeiträume. Lücken bei Zählerwechseln bleiben unbekannt;
            keine Hochrechnung auf Kalendermonate.
          </p>
          {from && to && from > to ? (
            <p role="alert">Das Enddatum liegt vor dem Startdatum.</p>
          ) : valid.length ? (
            <p className="home-summary">
              Erfasster Verbrauch:{" "}
              <strong>
                {fmt(total)} {meter.unit}
              </strong>{" "}
              in {days} Tagen · {fmt(total / days)} {meter.unit}/Tag
              {meter.price !== null ? ` · geschätzte Kosten: ${fmt(total * meter.price)} €` : ""}
            </p>
          ) : (
            <p>Noch kein auswertbarer Ablesezeitraum.</p>
          )}
          {intervals.map((i) => (
            <article className="home-row" key={i.to}>
              <span>
                {i.from} – {i.to}
              </span>
              <strong>
                {i.value === null
                  ? "Unbekannt (Zählerwechsel)"
                  : `${fmt(i.value)} ${meter.unit} · ${fmt(i.perDay!)} /Tag`}
              </strong>
              {i.value !== null && (
                <div className="home-bar" aria-hidden="true">
                  <span style={{ width: `${(100 * i.value) / max}%` }} />
                </div>
              )}
            </article>
          ))}
          <div className="book-actions">
            <button
              onClick={() =>
                download(
                  csv([
                    ["Datum", "Stand", "Einheit", "Neustart", "Notiz"],
                    ...[...meter.readings]
                      .sort((a, b) => a.date.localeCompare(b.date))
                      .map((r) => [r.date, String(r.value), meter.unit, r.reset ? "ja" : "nein", r.note]),
                  ]),
                  `${meter.name}-Ablesungen.csv`,
                  "text/csv",
                )
              }
            >
              Ablesungen als CSV
            </button>
            <button
              onClick={() =>
                download(
                  csv([
                    ["Von", "Bis", "Tage", "Verbrauch", "Einheit", "Kosten geschätzt (€)"],
                    ...intervals.map((i) => [
                      i.from,
                      i.to,
                      String(i.days),
                      i.value === null ? "unbekannt" : String(i.value),
                      meter.unit,
                      i.cost === null ? "" : String(i.cost),
                    ]),
                  ]),
                  `${meter.name}-Verbrauch.csv`,
                  "text/csv",
                )
              }
            >
              Verbrauch als CSV
            </button>
          </div>
        </>
      )}
    </section>
  );
}
