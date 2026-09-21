import { useEditorStore } from "../../stores/editorStore";
import { solarKinds, type SolarKind } from "../../electrical/solarPlan";
import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { assetSchema, type Asset } from "../../housebook/model";
import {
  solarPlants,
  setSolarPlants,
  newSolarPlant,
  modulePower,
  ensureSolarMeter,
  type SolarPlant,
} from "../../housebook/solar";
import { homeBook, consumption } from "../../housebook/home";
import type { OpenSection } from "../../housebook/setup";
import { readPlanImage } from "../../housebook/images";
import { newId } from "../../utils/uuid";
import { Field } from "./shared";
import { focusObject } from "../../housebook/navigation";
function ComponentFields({
  title,
  value,
  onChange,
}: {
  title: string;
  value: Asset;
  onChange: (v: Asset) => void;
}) {
  return (
    <fieldset>
      <legend>{title}</legend>
      <div className="book-grid">
        {(
          [
            ["manufacturer", "Hersteller"],
            ["model", "Modell"],
            ["serial", "Seriennummer"],
            ["documentUrl", "Unterlagen-Link"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={`${title}: ${label}`}>
            <input
              type={key === "documentUrl" ? "url" : "text"}
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            />
          </Field>
        ))}
      </div>
    </fieldset>
  );
}
export function SolarPanel({
  initialId,
  onOpen,
  onClose,
}: {
  initialId?: string | undefined;
  onOpen: OpenSection;
  onClose: () => void;
}) {
  const p = useProjectStore((s) => s.project),
    plants = solarPlants(p),
    meters = homeBook(p).meters;
  const [draft, setDraft] = useState<SolarPlant>(
      () => plants.find((s) => s.id === initialId) ?? newSolarPlant(),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const change = (v: Partial<SolarPlant>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, ...v }));
  };
  const meter = meters.find((m) => m.id === draft.meterId),
    power = modulePower(draft),
    intervals = meter?.kind === "solar" && meter.unit === "kWh" ? consumption(meter) : [],
    known = intervals.filter((i) => i.value !== null);
  const save = (createMeter = false, afterSave?: () => void) => {
    let id = draft.meterId;
    const ok = useProjectStore.getState().commit("Balkonkraftwerk speichern", (p) => {
      const rows = solarPlants(p),
        index = rows.findIndex((s) => s.id === draft.id);
      if (index < 0) rows.push(draft);
      else rows[index] = draft;
      setSolarPlants(p, rows);
      if (createMeter) id = ensureSolarMeter(p, draft.id);
    });
    if (ok) {
      setDraft(solarPlants(useProjectStore.getState().project).find((s) => s.id === draft.id)!);
      setSaved(true);
      afterSave?.();
    }
    return ok ? id : null;
  };
  return (
    <section>
      <h3>Balkonkraftwerk</h3>
      <div className="book-actions">
        {Object.entries(solarKinds).map(([kind, preset]) => (
          <button
            key={kind}
            disabled={busy}
            onClick={() =>
              save(false, () => {
                useEditorStore.getState().setCategory("electrical");
                useEditorStore.getState().setTool("electrical");
                useEditorStore.setState({
                  electricalKind: "devices",
                  solarPlacement: { plantId: draft.id, kind: kind as SolarKind },
                });
                onClose();
              })
            }
          >
            Im Plan platzieren: {preset.name}
          </button>
        ))}
      </div>
      <p>
        Module, Wechselrichter, optionalen Speicher, Anschluss und Unterlagen dokumentieren. Ertragsablesungen
        werden in der bestehenden Zähleransicht geführt.
      </p>
      <div className="book-actions">
        <button
          onClick={() => {
            setDraft(newSolarPlant());
            setSaved(false);
          }}
        >
          Neue Solaranlage
        </button>
      </div>
      {plants.map((s) => (
        <article key={s.id} className="home-row">
          <strong>{s.name}</strong>
          <span>
            {s.location} · {modulePower(s) === null ? "Modulleistung offen" : `${modulePower(s)} Wp`}
          </span>
          <button
            onClick={() => {
              setDraft(structuredClone(s));
              setSaved(false);
            }}
          >
            Öffnen: {s.name}
          </button>
          <button
            onClick={() => {
              if (
                window.confirm(`„${s.name}“ löschen? Der Ertragszähler bleibt erhalten.`) &&
                useProjectStore.getState().commit("Solaranlage löschen", (p) =>
                  setSolarPlants(
                    p,
                    solarPlants(p).filter((v) => v.id !== s.id),
                  ),
                )
              ) {
                if (draft.id === s.id) setDraft(newSolarPlant());
              }
            }}
          >
            Löschen: {s.name}
          </button>
        </article>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <h4>Anlagendaten</h4>
        <div className="book-grid">
          <Field label="Anlagenname">
            <input required value={draft.name} onChange={(e) => change({ name: e.target.value })} />
          </Field>
          <Field label="Anlagenstandort">
            <input value={draft.location} onChange={(e) => change({ location: e.target.value })} />
          </Field>
          <Field label="In Betrieb seit">
            <input
              type="date"
              value={draft.installed}
              onChange={(e) => change({ installed: e.target.value })}
            />
          </Field>
          <Field label="Ausrichtung">
            <input value={draft.orientation} onChange={(e) => change({ orientation: e.target.value })} />
          </Field>
          <Field label="Neigung (Grad)">
            <input
              type="number"
              min="0"
              max="180"
              step="any"
              value={draft.tilt ?? ""}
              onChange={(e) => change({ tilt: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </Field>
          <Field label="Anlagennotizen">
            <textarea
              value={draft.asset.notes}
              onChange={(e) => change({ asset: { ...draft.asset, notes: e.target.value } })}
            />
          </Field>
          <Field label="Anlagenunterlagen">
            <input
              type="url"
              value={draft.asset.documentUrl}
              onChange={(e) => change({ asset: { ...draft.asset, documentUrl: e.target.value } })}
            />
          </Field>
        </div>
        <h4>Solarmodule</h4>
        <p>
          Gleiche Module als Gruppe erfassen. Einzelne Seriennummern können als getrennte Gruppen mit Anzahl 1
          hinterlegt werden.
        </p>
        {draft.modules.map((m, index) => (
          <fieldset key={m.id}>
            <legend>Modulgruppe {index + 1}</legend>
            <div className="book-grid">
              <Field label={`Modulgruppe ${index + 1}: Anzahl`}>
                <input
                  required
                  type="number"
                  min="1"
                  max="1000"
                  value={m.quantity}
                  onChange={(e) =>
                    change({
                      modules: draft.modules.map((v) =>
                        v.id === m.id ? { ...v, quantity: Number(e.target.value) } : v,
                      ),
                    })
                  }
                />
              </Field>
              <Field label={`Modulgruppe ${index + 1}: Wp je Modul`}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={m.wp ?? ""}
                  onChange={(e) =>
                    change({
                      modules: draft.modules.map((v) =>
                        v.id === m.id
                          ? { ...v, wp: e.target.value === "" ? null : Number(e.target.value) }
                          : v,
                      ),
                    })
                  }
                />
              </Field>
            </div>
            <ComponentFields
              title={`Modulgruppe ${index + 1}`}
              value={m.asset}
              onChange={(asset) =>
                change({ modules: draft.modules.map((v) => (v.id === m.id ? { ...v, asset } : v)) })
              }
            />
            <button
              type="button"
              onClick={() => change({ modules: draft.modules.filter((v) => v.id !== m.id) })}
            >
              Modulgruppe {index + 1} entfernen
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          onClick={() =>
            change({
              modules: [
                ...draft.modules,
                { id: newId(), quantity: 1, wp: null, asset: assetSchema.parse({}) },
              ],
            })
          }
        >
          Modulgruppe hinzufügen
        </button>
        <p>
          Dokumentierte Modulleistung:{" "}
          <strong>{power === null ? "Noch unvollständig" : `${power} Wp`}</strong>
        </p>
        <ComponentFields
          title="Wechselrichter"
          value={draft.inverter.asset}
          onChange={(asset) => change({ inverter: { ...draft.inverter, asset } })}
        />
        <Field label="Wechselrichter: AC-Nennleistung (W)">
          <input
            type="number"
            min="0"
            step="any"
            value={draft.inverter.powerW ?? ""}
            onChange={(e) =>
              change({
                inverter: {
                  ...draft.inverter,
                  powerW: e.target.value === "" ? null : Number(e.target.value),
                },
              })
            }
          />
        </Field>
        <Field label="Speicher vorhanden">
          <input
            type="checkbox"
            checked={!!draft.battery}
            onChange={(e) => {
              if (!e.target.checked && !window.confirm("Speicherangaben aus diesem Entwurf entfernen?"))
                return;
              change({
                battery: e.target.checked ? { capacityWh: null, asset: assetSchema.parse({}) } : null,
              });
            }}
          />
        </Field>
        {draft.battery && (
          <>
            <ComponentFields
              title="Speicher"
              value={draft.battery.asset}
              onChange={(asset) => change({ battery: { ...draft.battery!, asset } })}
            />
            <Field label="Speicherkapazität (Wh)">
              <input
                type="number"
                min="0"
                step="any"
                value={draft.battery.capacityWh ?? ""}
                onChange={(e) =>
                  change({
                    battery: {
                      ...draft.battery!,
                      capacityWh: e.target.value === "" ? null : Number(e.target.value),
                    },
                  })
                }
              />
            </Field>
          </>
        )}
        <Field label="Anschluss-Steckdose">
          <select value={draft.outletId ?? ""} onChange={(e) => change({ outletId: e.target.value || null })}>
            <option value="">Noch nicht zugeordnet</option>
            {draft.outletId && !p.electrical.outlets[draft.outletId] && (
              <option value={draft.outletId}>Steckdose wurde entfernt</option>
            )}
            {Object.values(p.electrical.outlets).map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} · {o.label} · {p.floors[o.floorId]?.name}
              </option>
            ))}
          </select>
        </Field>
        {draft.outletId && p.electrical.outlets[draft.outletId] && (
          <button
            type="button"
            onClick={() => {
              if (focusObject({ kind: "outlets", id: draft.outletId! })) onClose();
              else setError("Bitte die Elektrikebene im Plan einblenden.");
            }}
          >
            Anschluss im Plan zeigen
          </button>
        )}
        <Field label="Ertragszähler">
          <select value={draft.meterId ?? ""} onChange={(e) => change({ meterId: e.target.value || null })}>
            <option value="">Noch nicht zugeordnet</option>
            {draft.meterId && (!meter || meter.kind !== "solar" || meter.unit !== "kWh") && (
              <option value={draft.meterId}>Zähler fehlt oder passt nicht (Solar/kWh)</option>
            )}
            {meters
              .filter((m) => m.kind === "solar" && m.unit === "kWh")
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </Field>
        <p>
          {known.length
            ? `Erfasster Ertrag: ${known.reduce((sum, i) => sum + i.value!, 0).toLocaleString("de-DE")} kWh in ${known.reduce((sum, i) => sum + i.days, 0)} erfassten Tagen.`
            : "Noch kein auswertbarer Ertragszeitraum."}{" "}
          {intervals.some((i) => i.value === null) ? "Zählerwechsel enthalten unbekannte Zeiträume." : ""}
        </p>
        <Field label="Anlagenfoto">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const id = draft.id;
              setBusy(true);
              setError("");
              try {
                const image = await readPlanImage(f);
                setDraft((d) => (d.id === id ? { ...d, asset: { ...d.asset, photo: image.data } } : d));
                setSaved(false);
              } catch (err) {
                setError(String(err));
              } finally {
                setBusy(false);
              }
            }}
          />
        </Field>
        {draft.asset.photo && (
          <>
            <img className="home-photo" src={draft.asset.photo} alt={`Anlagenfoto: ${draft.name}`} />
            <button type="button" onClick={() => change({ asset: { ...draft.asset, photo: "" } })}>
              Anlagenfoto entfernen
            </button>
          </>
        )}
        <p>
          Die Anschlusszuordnung dokumentiert den Standort. Sie speist keine simulierte Leistung ein.
          Modulleistung (Wp), Wechselrichterleistung (W) und tatsächlicher Ertrag (kWh) bleiben getrennt.
        </p>
        {error && <p role="alert">{error}</p>}
        {saved && <p role="status">Anlage gespeichert.</p>}
        <div className="book-actions">
          <button disabled={busy}>Solaranlage speichern</button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const id = save(true);
              if (id) onOpen("usage", id);
            }}
          >
            Speichern und Ertragszähler öffnen
          </button>
        </div>
      </form>
    </section>
  );
}
