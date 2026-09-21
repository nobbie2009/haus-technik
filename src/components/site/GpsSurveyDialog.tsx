import { useState } from "react";
import { Modal } from "../dialogs/Modal";
import { Field } from "../housebook/shared";
import { useProjectStore } from "../../stores/projectStore";
import { useEditorStore } from "../../stores/editorStore";
import { site, siteKinds, siteClosed, type SiteKind } from "../../site/model";
import {
  gpsReference,
  gpsReferenceSchema,
  gpsToPlan,
  freshFix,
  saveGpsSurvey,
  type GpsFix,
} from "../../site/gps";
import { useGps } from "../../site/useGps";
import { GpsPreview } from "./GpsPreview";
import { fitView } from "../../editor/interaction/commands";
import { parseLength } from "../../utils/units";
import type { Vec2 } from "../../models/common";

export function GpsSurveyDialog({ floorId, onClose }: { floorId: string; onClose: () => void }) {
  const project = useProjectStore((s) => s.project),
    gps = useGps(),
    reference = gpsReference(project, floorId);
  const [anchor, setAnchor] = useState("origin"),
    [angle, setAngle] = useState(String(reference?.northAngle ?? 0));
  const [kind, setKind] = useState<SiteKind>(useEditorStore.getState().siteKind),
    [width, setWidth] = useState("1 m");
  const [fixes, setFixes] = useState<GpsFix[]>([]),
    [candidate, setCandidate] = useState<GpsFix | null>(null);
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [allowRough, setAllowRough] = useState(false);
  const anchors = [
    { id: "origin", name: "Planursprung (X 0 / Y 0)", position: { x: 0, y: 0 } },
    ...Object.values(site(project).elements)
      .filter((s) => s.floorId === floorId && project.layers[s.layerId]?.visible)
      .flatMap((s) =>
        s.vertices.map((position, i) => ({ id: `${s.id}:${i}`, name: `${s.name} · P${i + 1}`, position })),
      ),
    ...Object.values(project.points)
      .filter((p) => p.floorId === floorId)
      .map((p, i) => ({
        id: p.id,
        name: `Grundrisspunkt ${i + 1} · ${(p.position.x / 1000).toFixed(2)} / ${(p.position.y / 1000).toFixed(2)} m`,
        position: p.position,
      })),
  ];
  const fresh = freshFix(gps.fix, gps.now),
    quality = Boolean(gps.fix && (gps.fix.accuracy <= 10 || allowRough));
  const activeFix = candidate ?? gps.fix;
  let current: Vec2 | null = null,
    projectionError = "";
  if (reference && activeFix)
    try {
      current = gpsToPlan(reference, activeFix);
    } catch (e) {
      projectionError = (e as Error).message;
    }
  const points = reference ? fixes.map((f) => gpsToPlan(reference, f)) : [];
  const radius = reference && activeFix ? (reference.fix.accuracy + activeFix.accuracy) * 1000 : 0;
  const changeReference = (capture: boolean) => {
    setError("");
    try {
      if (capture && (!fresh || !quality || !gps.fix))
        throw new Error("Bitte eine aktuelle Position mit ausreichender Genauigkeit abwarten.");
      const selected = anchors.find((a) => a.id === anchor);
      if (capture && !selected) throw new Error("Bitte einen vorhandenen Bezugspunkt wählen.");
      if (!capture && !reference) return;
      const northAngle = Number(angle.replace(",", "."));
      if (!angle.trim() || !Number.isFinite(northAngle))
        throw new Error("Bitte eine gültige Nordrichtung von 0 bis unter 360° eingeben.");
      const next = gpsReferenceSchema.parse(
        capture
          ? { fix: gps.fix, position: selected!.position, label: selected!.name, northAngle }
          : { ...reference, northAngle },
      );
      if (
        useProjectStore.getState().commit("GPS-Referenz festlegen", (p) => {
          p.floors[floorId]!.metadata.gpsReference = next;
        })
      ) {
        setCandidate(null);
        setMessage("GPS-Referenz gespeichert. Jetzt zu den aufzunehmenden Punkten gehen.");
      } else setError(useProjectStore.getState().error ?? "Referenz konnte nicht gespeichert werden.");
    } catch {
      setError(
        "Referenz prüfen: aktuelle Position, vorhandener Bezugspunkt und Nordrichtung von 0 bis unter 360° erforderlich.",
      );
    }
  };
  const close = () => {
    if (!fixes.length || window.confirm("Ungespeicherte GPS-Punkte verwerfen und schließen?")) {
      gps.stop();
      onClose();
    }
  };
  const save = () => {
    if (!reference) return;
    setError("");
    let id = "";
    const ok = useProjectStore.getState().commit("GPS-Aufnahme speichern", (p) => {
      id = saveGpsSurvey(p, floorId, kind, kind === "path" ? parseLength(width) : 1000, reference, fixes);
    });
    if (!ok) {
      setError(useProjectStore.getState().error ?? "Aufnahme konnte nicht gespeichert werden.");
      return;
    }
    useEditorStore.getState().cancel();
    useEditorStore.setState({ selection: [{ kind: "siteElements", id }], tool: "select" });
    fitView();
    setFixes([]);
    setCandidate(null);
    setMessage(`${siteKinds[kind]} gespeichert. Weitere Punkte aufnehmen oder Dialog schließen.`);
  };
  return (
    <Modal title="Grundstück per GPS erfassen" className="gps-dialog" onClose={close}>
      <p>
        Am gewünschten Punkt stehen bleiben und die Position prüfen. GPS dient zur Groberfassung; genaue
        Grenzen und Leitungsverläufe anschließend mit gemessenen Maßen korrigieren.
      </p>
      <div className="gps-actions">
        <button
          onClick={() => {
            setCandidate(null);
            setError("");
            gps.active ? gps.stop() : gps.start();
          }}
        >
          {gps.active ? "Ortung stoppen" : "Ortung starten"}
        </button>
        <span role="status">
          {gps.active
            ? gps.fix
              ? `Genauigkeit ±${gps.fix.accuracy.toFixed(1)} m · ${fresh ? "aktuell" : "Position veraltet"}`
              : "Standort wird gesucht …"
            : "Ortung aus"}
        </span>
      </div>
      {gps.error && (
        <p role="alert" className="connection-error">
          {gps.error}
        </p>
      )}
      <label className="gps-check">
        <input type="checkbox" checked={allowRough} onChange={(e) => setAllowRough(e.target.checked)} />
        Messungen mit mehr als 10 m Ungenauigkeit zulassen
      </label>
      <details open={!reference} className="gps-reference">
        <summary>1. GPS-Referenz und Ausrichtung {reference ? `· ${reference.label}` : "festlegen"}</summary>
        <p>
          Stelle dich an einen bekannten Punkt und wähle dessen Position im Plan. Ohne vorhandenen Plan kann
          dein Startpunkt der Planursprung sein.
        </p>
        <Field label="GPS-Bezugspunkt im Plan">
          <select value={anchor} disabled={fixes.length > 0} onChange={(e) => setAnchor(e.target.value)}>
            {anchors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nordrichtung im Plan (Grad)">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="359.999"
            step="any"
            value={angle}
            disabled={fixes.length > 0}
            onChange={(e) => setAngle(e.target.value)}
          />
        </Field>
        <p className="field-hint">
          0° = Norden oben, 90° = Norden rechts, 180° = unten, 270° = links. Die Ausrichtung muss zum Hausplan
          passen; sie wird nicht automatisch vom Kompass übernommen.
        </p>
        <div className="gps-actions">
          <button disabled={!fresh || !quality || fixes.length > 0} onClick={() => changeReference(true)}>
            Aktuellen Standort als GPS-Referenz setzen
          </button>
          {reference && (
            <button disabled={fixes.length > 0} onClick={() => changeReference(false)}>
              Ausrichtung speichern
            </button>
          )}
        </div>
        {reference && (
          <p>
            Gespeicherte Referenz: X {(reference.position.x / 1000).toFixed(2)} m / Y{" "}
            {(reference.position.y / 1000).toFixed(2)} m · ±{reference.fix.accuracy.toFixed(1)} m
          </p>
        )}
        <p className="field-hint">Eine neue Referenz verändert bereits gespeicherte Objekte nicht.</p>
      </details>
      <h3>2. Punkte aufnehmen</h3>
      <Field label="GPS-Außenobjekt">
        <select
          value={kind}
          disabled={fixes.length > 0}
          onChange={(e) => {
            setKind(e.target.value as SiteKind);
            setCandidate(null);
          }}
        >
          {Object.entries(siteKinds).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {kind === "path" && (
        <Field label="GPS-Wegbreite">
          <input value={width} onChange={(e) => setWidth(e.target.value)} />
        </Field>
      )}
      {!reference && <p>Zuerst eine GPS-Referenz setzen.</p>}
      {reference && (
        <>
          <GpsPreview points={points} current={current} radius={radius} closed={siteClosed(kind)} />
          {current && (
            <p>
              Position: X {(current.x / 1000).toFixed(2)} m / Y {(current.y / 1000).toFixed(2)} m
            </p>
          )}
          <p className="field-hint">
            Der Kreis berücksichtigt die gemeldete Standort- und Referenzungenauigkeit als Orientierungswert.
            Fehler in der Nordrichtung kommen hinzu.
          </p>
          <div className="gps-actions">
            <button
              disabled={
                !fresh ||
                !quality ||
                Boolean(projectionError) ||
                fixes.length >= 500 ||
                (kind === "reference" && fixes.length > 0)
              }
              onClick={() => {
                setCandidate(gps.fix);
                setError("");
                setMessage("");
              }}
            >
              Position prüfen
            </button>
            {candidate && (
              <button
                disabled={
                  !gps.active ||
                  Boolean(projectionError) ||
                  !freshFix(candidate, gps.now) ||
                  (candidate.accuracy > 10 && !allowRough)
                }
                onClick={() => {
                  if (!freshFix(candidate)) {
                    setError("Position veraltet. Bitte erneut prüfen.");
                    return;
                  }
                  const p = gpsToPlan(reference, candidate),
                    last = points.at(-1);
                  if (last && Math.hypot(p.x - last.x, p.y - last.y) < 1) {
                    setError("Dieser Punkt wurde bereits übernommen. Bitte zum nächsten Punkt gehen.");
                    return;
                  }
                  setFixes([...fixes, candidate]);
                  setCandidate(null);
                  setMessage(`Punkt ${fixes.length + 1} übernommen.`);
                }}
              >
                Punkt übernehmen
              </button>
            )}
          </div>
          {candidate && (
            <p>
              Geprüfte Messung: ±{candidate.accuracy.toFixed(1)} m.{" "}
              {freshFix(candidate, gps.now)
                ? "Mit „Punkt übernehmen“ bestätigen."
                : "Veraltet – erneut „Position prüfen“ wählen."}
            </p>
          )}
        </>
      )}
      {projectionError && (
        <p role="alert" className="connection-error">
          {projectionError}
        </p>
      )}
      <p>
        <strong>{fixes.length} Punkte aufgenommen</strong>
      </p>
      {fixes.length > 0 && (
        <details>
          <summary>Aufgenommene Punkte prüfen</summary>
          <ol>
            {fixes.map((f, i) => (
              <li key={i}>
                P{i + 1}: X {(points[i]!.x / 1000).toFixed(2)} m / Y {(points[i]!.y / 1000).toFixed(2)} m · ±
                {f.accuracy.toFixed(1)} m
              </li>
            ))}
          </ol>
        </details>
      )}
      <div className="gps-actions">
        <button
          disabled={!fixes.length}
          onClick={() => {
            setFixes(fixes.slice(0, -1));
            setCandidate(null);
          }}
        >
          Letzten GPS-Punkt entfernen
        </button>
        <button
          disabled={fixes.length < (kind === "reference" ? 1 : siteClosed(kind) ? 3 : 2)}
          onClick={save}
        >
          GPS-Objekt speichern
        </button>
      </div>
      {error && (
        <p role="alert" className="connection-error">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <p className="field-hint">
        Standortdaten werden im lokalen Projekt und dessen Export gespeichert. Beim Schließen oder Wechsel in
        den Hintergrund stoppt die Ortung.
      </p>
    </Modal>
  );
}
