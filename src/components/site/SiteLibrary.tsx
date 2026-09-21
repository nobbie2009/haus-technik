import { Modal } from "../dialogs/Modal";
import { GpsSurveyDialog } from "./GpsSurveyDialog";
import { useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { useProjectStore } from "../../stores/projectStore";
import { site, siteKinds, siteClosed, addSiteElement, type SiteKind } from "../../site/model";
import { confirmSite } from "../../site/drawing";
import { SelectField } from "../electrical/ElectricalFields";
import { LengthField } from "../Fields";
export function SiteLibrary() {
  const editor = useEditorStore(),
    project = useProjectStore((s) => s.project);
  const [offsetOpen, setOffsetOpen] = useState(false);
  const [gpsOpen, setGpsOpen] = useState(false);
  const [reference, setReference] = useState(""),
    [dx, setDx] = useState(0),
    [dy, setDy] = useState(0);
  const points = Object.values(site(project).elements)
    .filter((e) => e.floorId === editor.floorId && project.layers[e.layerId]?.visible)
    .flatMap((e) => e.vertices.map((p, i) => ({ id: `${e.id}:${i}`, name: `${e.name} · P${i + 1}`, p })));
  const minimum = siteClosed(editor.siteKind) ? 3 : 2;
  return (
    <section className="site-library" aria-label="Grundstück planen">
      <button className="full-width" onClick={() => setGpsOpen(true)}>
        Per GPS erfassen
      </button>
      {gpsOpen && (
        <GpsSurveyDialog
          key={`${project.id}:${editor.floorId}`}
          floorId={editor.floorId}
          onClose={() => setGpsOpen(false)}
        />
      )}
      <SelectField
        label="Außenobjekt"
        value={editor.siteKind}
        onChange={(value) => {
          editor.setTool("site");
          useEditorStore.setState({ siteKind: value as SiteKind });
        }}
      >
        {Object.entries(siteKinds).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </SelectField>
      {editor.siteKind === "path" && (
        <LengthField
          label="Wegbreite (Vorlage)"
          value={editor.siteWidth}
          unit={project.units.display}
          onCommit={(v) => {
            if (v <= 0 || v > 100000) {
              useProjectStore.setState({ error: "Wegbreite größer 0 und höchstens 100 m eingeben." });
              return false;
            }
            useEditorStore.setState({ siteWidth: v });
            return true;
          }}
        />
      )}
      <button className="full-width" onClick={() => editor.setTool("site")}>
        Im Plan zeichnen
      </button>
      <p className="field-hint">
        {editor.siteKind === "reference"
          ? "Position anklicken. Der Punkt dient in allen Bereichen als Fangpunkt."
          : "Eckpunkte nacheinander anklicken. Mit Enter oder „Zeichnung abschließen“ speichern. Shift zeichnet rechtwinklig."}
      </p>
      {editor.tool === "site" && editor.siteKind !== "reference" && (
        <button
          className="full-width"
          disabled={editor.draft.points.length < minimum}
          onClick={() => confirmSite(editor.cursor, true)}
        >
          Zeichnung abschließen
        </button>
      )}
      <button onClick={() => setOffsetOpen(true)}>Abstand zu Bezugspunkt</button>
      {offsetOpen && (
        <Modal title="Abstand zu einem Bezugspunkt" onClose={() => setOffsetOpen(false)}>
          <SelectField label="Bezugspunkt" value={reference} onChange={setReference}>
            <option value="">Punkt wählen</option>
            {points.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </SelectField>
          <LengthField
            label="Versatz X"
            value={dx}
            unit={project.units.display}
            onCommit={(v) => {
              setDx(v);
              return true;
            }}
          />
          <LengthField
            label="Versatz Y"
            value={dy}
            unit={project.units.display}
            onCommit={(v) => {
              setDy(v);
              return true;
            }}
          />
          <button
            className="full-width"
            disabled={!points.some((p) => p.id === reference)}
            onClick={() => {
              const source = points.find((p) => p.id === reference);
              if (!source) return;
              let id = "";
              if (
                useProjectStore.getState().commit("Referenzpunkt mit Abstand setzen", (p) => {
                  id = addSiteElement(p, editor.floorId, "reference", [
                    { x: source.p.x + dx, y: source.p.y + dy },
                  ]);
                })
              ) {
                setOffsetOpen(false);
                editor.cancel();
                useEditorStore.setState({ selection: [{ kind: "siteElements", id }], tool: "select" });
              }
            }}
          >
            Referenzpunkt mit Abstand setzen
          </button>
          <p className="field-hint">
            X nach rechts, Y nach oben. Mit aktivem Punktfang lassen sich Geräte und Leitungswegpunkte genau
            darauf platzieren.
          </p>
        </Modal>
      )}
    </section>
  );
}
