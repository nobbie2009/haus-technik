import { useState } from "react";
import { Modal } from "../dialogs/Modal";
import { Field } from "./shared";
import { useProjectStore } from "../../stores/projectStore";
import { elementTables } from "../../core/elementTables";
import type { Selection } from "../../editor/types";
import { asset, setAsset, statusLabels, type Asset } from "../../housebook/model";
import { readPlanImage } from "../../housebook/images";
export function AssetDialog({ target, onClose }: { target: Selection; onClose: () => void }) {
  const project = useProjectStore((s) => s.project),
    entity = elementTables(project)[target.kind][target.id]!;
  const [draft, setDraft] = useState<Asset>(() => asset(entity)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const locked = project.layers[entity.layerId]?.locked;
  const update = (patch: Partial<Asset>) => setDraft({ ...draft, ...patch });
  return (
    <Modal
      title={`Objektakte · ${"name" in entity ? entity.name : target.kind}`}
      className="asset-dialog"
      onClose={onClose}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            useProjectStore
              .getState()
              .commit("Objektakte ändern", (p) => setAsset(elementTables(p)[target.kind][target.id]!, draft))
          )
            onClose();
          else setError(useProjectStore.getState().error ?? "Speichern fehlgeschlagen.");
        }}
      >
        <fieldset disabled={locked || busy} className="book-fieldset">
          <div className="book-grid">
            <Field label="Umbauzustand">
              <select
                value={draft.status}
                onChange={(e) => update({ status: e.target.value as Asset["status"] })}
              >
                {Object.entries(statusLabels).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hersteller">
              <input value={draft.manufacturer} onChange={(e) => update({ manufacturer: e.target.value })} />
            </Field>
            <Field label="Modell">
              <input value={draft.model} onChange={(e) => update({ model: e.target.value })} />
            </Field>
            <Field label="Seriennummer">
              <input value={draft.serial} onChange={(e) => update({ serial: e.target.value })} />
            </Field>
            <Field label="Nächste Wartung">
              <input
                type="date"
                value={draft.maintenanceDate}
                onChange={(e) => update({ maintenanceDate: e.target.value })}
              />
            </Field>
            <Field label="Anleitung / Dokument (HTTP-/HTTPS-Link)">
              <input
                type="url"
                value={draft.documentUrl}
                onChange={(e) => update({ documentUrl: e.target.value })}
              />
            </Field>
            <Field label="Home-Assistant-Entität (optional)">
              <input
                placeholder="light.wohnzimmer"
                value={draft.homeAssistantEntity}
                onChange={(e) => update({ homeAssistantEntity: e.target.value })}
              />
            </Field>
            <Field label="Foto hinzufügen">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  try {
                    update({ photo: (await readPlanImage(file)).data });
                  } catch (error) {
                    setError(String(error));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </Field>
          </div>
          {draft.photo && (
            <div>
              <img className="asset-photo" src={draft.photo} alt="Foto des Objekts" />
              <button type="button" onClick={() => update({ photo: "" })}>
                Foto entfernen
              </button>
            </div>
          )}
          <Field label="Notizen und Wartungshinweise">
            <textarea rows={5} value={draft.notes} onChange={(e) => update({ notes: e.target.value })} />
          </Field>
          {"position" in entity && typeof entity.position === "object" && (
            <details>
              <summary>Wandbefestigung und Montagehöhe</summary>
              <p>
                Abstand vom Wandanfang entlang der Wand. Der seitliche Versatz ist positiv links der
                Wandrichtung. Die Montagehöhe ist eine Bestandsangabe.
              </p>
              <Field label="Befestigungswand">
                <select
                  value={draft.mounting?.wallId ?? ""}
                  onChange={(e) =>
                    update({
                      mounting: e.target.value
                        ? { wallId: e.target.value, distance: 0, offset: 0, height: 300 }
                        : null,
                    })
                  }
                >
                  <option value="">Frei positioniert</option>
                  {Object.values(project.walls)
                    .filter((w) => w.floorId === entity.floorId)
                    .map((w, i) => (
                      <option key={w.id} value={w.id}>
                        Wand {i + 1} · {w.material || w.id.slice(0, 8)}
                      </option>
                    ))}
                </select>
              </Field>
              {draft.mounting && (
                <div className="book-grid">
                  {(
                    [
                      ["distance", "Abstand vom Wandanfang (mm)"],
                      ["offset", "Seitlicher Versatz (mm)"],
                      ["height", "Montagehöhe (mm)"],
                    ] as const
                  ).map(([key, label]) => (
                    <Field key={key} label={label}>
                      <input
                        type="number"
                        min={key === "offset" ? undefined : 0}
                        value={draft.mounting![key]}
                        onChange={(e) =>
                          update({ mounting: { ...draft.mounting!, [key]: Number(e.target.value) } })
                        }
                      />
                    </Field>
                  ))}
                </div>
              )}
            </details>
          )}
          <div className="book-actions">
            <button type="submit">Objektakte speichern</button>
          </div>
        </fieldset>
        {locked && <p>Die Ebene ist gesperrt.</p>}
        {error && <p role="alert">{error}</p>}
      </form>
    </Modal>
  );
}
