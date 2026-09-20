import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import {
  homeBook,
  setHomeBook,
  placeOutdoorLight,
  homeKinds,
  newHomeItem,
  type HomeKind,
  type HomeItem,
} from "../../housebook/home";
import { utilities, media } from "../../utilities/model";
import { readPlanImage } from "../../housebook/images";
import { focusObject } from "../../housebook/navigation";
import { Field } from "./shared";
import { TargetField, updateHome } from "./HomeShared";
import type { OpenSection } from "../../housebook/setup";
export function HomeItemsPanel({
  kinds,
  onClose,
  initialId,
  initialLocation,
  onOpen,
}: {
  kinds: HomeKind[];
  onClose: () => void;
  initialId?: string | undefined;
  initialLocation?: string | undefined;
  onOpen?: OpenSection | undefined;
}) {
  const p = useProjectStore((s) => s.project),
    b = homeBook(p);
  const [draft, setDraft] = useState<HomeItem>(
      () =>
        b.items.find((i) => i.id === initialId && kinds.includes(i.kind)) ?? {
          ...newHomeItem(kinds[0]!),
          location: initialLocation ?? "",
        },
    ),
    [filter, setFilter] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const change = (v: Partial<HomeItem>) => setDraft((d) => ({ ...d, ...v }));
  const rows = b.items.filter(
    (i) =>
      kinds.includes(i.kind) &&
      `${i.name} ${i.location} ${i.asset.serial}`.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <section>
      <h3>{kinds.length > 1 ? "Garten & Außenbeleuchtung" : homeKinds[kinds[0]!]}</h3>
      <p>
        Standorte, Fotos und Prüftermine für deine persönliche Übersicht. Verknüpfe Außenleuchten mit einem
        elektrischen Verbraucher, um dessen Anschluss im Plan zu pflegen.
      </p>
      <Field label="Einträge durchsuchen">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      </Field>
      <div className="book-actions">
        <button onClick={() => setDraft(newHomeItem(kinds[0]!))}>Neuer Eintrag</button>
      </div>
      {rows.map((i) => (
        <article className="home-row" key={i.id}>
          <strong>{i.name}</strong>
          <span>
            {i.location} · {homeKinds[i.kind]}
          </span>
          <button onClick={() => setDraft(structuredClone(i))}>Bearbeiten: {i.name}</button>
          {kinds.includes("garden") && onOpen && (
            <button onClick={() => onOpen("maintenance", `item:${i.id}`)}>Pflege planen: {i.name}</button>
          )}
          <button
            onClick={() => {
              if (window.confirm(`„${i.name}“ löschen?`)) {
                if (
                  updateHome("Hausobjekt löschen", (b) => {
                    b.items = b.items.filter((v) => v.id !== i.id);
                    b.tasks.forEach((t) => {
                      if (t.itemId === i.id) t.itemId = null;
                    });
                  }) &&
                  draft.id === i.id
                )
                  setDraft(newHomeItem(kinds[0]!));
              }
            }}
          >
            Löschen: {i.name}
          </button>
        </article>
      ))}
      {kinds.includes("shutoff") && (
        <div>
          <h4>Absperrventile aus dem Leitungsplan</h4>
          {Object.values(utilities(p).nodes)
            .filter((n) => n.kind === "valve")
            .map((n) => (
              <article className="home-row" key={n.id}>
                <strong>{n.name}</strong>
                <span>
                  {n.media.map((m) => media[m].label).join(", ")} · {p.floors[n.floorId]?.name} ·{" "}
                  {n.closed ? "geschlossen" : "offen"}
                </span>
                <button
                  onClick={() => {
                    if (focusObject({ kind: "utilityNodes", id: n.id })) onClose();
                  }}
                >
                  Ventil im Plan
                </button>
              </article>
            ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            updateHome("Hausobjekt speichern", (b) => {
              const index = b.items.findIndex((i) => i.id === draft.id);
              if (index < 0) b.items.push(draft);
              else b.items[index] = draft;
            })
          )
            setDraft(newHomeItem(kinds[0]!));
        }}
      >
        <h4>{b.items.some((i) => i.id === draft.id) ? "Eintrag bearbeiten" : "Eintrag anlegen"}</h4>
        <div className="book-grid">
          {kinds.length > 1 && (
            <Field label="Objektart">
              <select value={draft.kind} onChange={(e) => change({ kind: e.target.value as HomeKind })}>
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {homeKinds[k]}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {draft.kind === "garden" && (
            <Field label="Gartenbereich">
              <select
                value={draft.gardenRole ?? "other"}
                onChange={(e) =>
                  change({ gardenRole: e.target.value as NonNullable<HomeItem["gardenRole"]> })
                }
              >
                <option value="other">Gartenobjekt</option>
                <option value="irrigationZone">Bewässerungszone</option>
                <option value="outdoorTap">Außenwasserstelle</option>
              </select>
            </Field>
          )}
          <Field label="Bezeichnung">
            <input required value={draft.name} onChange={(e) => change({ name: e.target.value })} />
          </Field>
          <Field label="Standort">
            <input value={draft.location} onChange={(e) => change({ location: e.target.value })} />
          </Field>
          {(
            [
              ["manufacturer", "Hersteller"],
              ["model", "Modell"],
              ["serial", "Seriennummer"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                value={draft.asset[key]}
                onChange={(e) => change({ asset: { ...draft.asset, [key]: e.target.value } })}
              />
            </Field>
          ))}
          <Field label={draft.kind === "shutoff" ? "Sperrt / versorgt" : "Steuerung / Bedienung"}>
            <input value={draft.controls} onChange={(e) => change({ controls: e.target.value })} />
          </Field>
          {draft.kind === "smoke" && (
            <Field label="Batterie / Versorgung">
              <input value={draft.battery} onChange={(e) => change({ battery: e.target.value })} />
            </Field>
          )}
          {draft.kind === "outdoorLight" && (
            <Field label="Leistung (W)">
              <input
                type="number"
                min="0"
                step="any"
                value={draft.powerW ?? ""}
                onChange={(e) => change({ powerW: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </Field>
          )}
          {(
            [
              ["installed", "Installiert am"],
              ["lastCheck", "Zuletzt geprüft"],
              ["nextCheck", "Nächste Prüfung"],
              ["replaceBy", "Austausch geplant"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input type="date" value={draft[key]} onChange={(e) => change({ [key]: e.target.value })} />
            </Field>
          ))}
          <Field label="Notizen / Pflege">
            <textarea value={draft.details} onChange={(e) => change({ details: e.target.value })} />
          </Field>
          <Field label="Unterlagen-Link">
            <input
              type="url"
              value={draft.asset.documentUrl}
              onChange={(e) => change({ asset: { ...draft.asset, documentUrl: e.target.value } })}
            />
          </Field>
          <TargetField value={draft.target} onChange={(target) => change({ target })} onClose={onClose} />
        </div>
        <div className="book-actions">
          <button
            type="button"
            onClick={() => {
              const e = useEditorStore.getState();
              change({ floorId: e.floorId, position: { ...e.cursor } });
            }}
          >
            Letzte Planposition übernehmen
          </button>
          <button type="button" onClick={() => change({ floorId: null, position: null })}>
            Planmarkierung entfernen
          </button>
        </div>
        {draft.position && (
          <div className="book-grid">
            <Field label="Geschoss">
              <select value={draft.floorId ?? ""} onChange={(e) => change({ floorId: e.target.value })}>
                {Object.values(p.floors).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </Field>
            {(["x", "y"] as const).map((axis) => (
              <Field key={axis} label={`Markierung ${axis.toUpperCase()} (mm)`}>
                <input
                  type="number"
                  value={draft.position![axis]}
                  onChange={(e) =>
                    change({ position: { ...draft.position!, [axis]: Number(e.target.value) } })
                  }
                />
              </Field>
            ))}
          </div>
        )}
        <Field label="Foto hinzufügen">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              setError("");
              try {
                const image = await readPlanImage(f);
                setDraft((d) => ({ ...d, asset: { ...d.asset, photo: image.data } }));
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
            <img className="home-photo" src={draft.asset.photo} alt={`Foto: ${draft.name}`} />
            <button type="button" onClick={() => change({ asset: { ...draft.asset, photo: "" } })}>
              Foto entfernen
            </button>
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="book-actions">
          <button disabled={busy}>Eintrag speichern</button>
          {draft.kind === "outdoorLight" && (
            <button
              type="button"
              disabled={busy || !draft.position || Boolean(draft.target)}
              onClick={() => {
                if (
                  useProjectStore.getState().commit("Außenleuchte im Plan anlegen", (p) => {
                    const item = structuredClone(draft);
                    placeOutdoorLight(p, item);
                    const b = homeBook(p),
                      index = b.items.findIndex((i) => i.id === item.id);
                    if (index < 0) b.items.push(item);
                    else b.items[index] = item;
                    setHomeBook(p, b);
                  })
                )
                  setDraft(newHomeItem("outdoorLight"));
              }}
            >
              Als elektrischen Verbraucher anlegen
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
