import { consumerShape } from "../../electrical/consumerLibrary";
import { asset, setAsset } from "../../housebook/model";
import { usePropertyFields } from "../properties/usePropertyFields";
import { TextField } from "../Fields";
import { NumberField } from "./ElectricalFields";

export function ConsumerFields({ id }: { id: string }) {
  const { project, locked, change, lengthField } = usePropertyFields({ kind: "devices", id });
  const device = project.electrical.devices[id]!,
    shape = consumerShape(device);
  if (!shape) return null;
  const record = asset(device);
  return (
    <section className="property-section">
      <h3>Gerätedaten und Maße</h3>
      {(
        [
          ["manufacturer", "Hersteller"],
          ["model", "Modell"],
          ["serial", "Seriennummer"],
        ] as const
      ).map(([key, label]) => (
        <TextField
          key={key}
          label={label}
          value={record[key]}
          disabled={locked}
          onCommit={(value) =>
            change((p) => {
              const d = p.electrical.devices[id]!;
              setAsset(d, { ...asset(d), [key]: value });
            })
          }
        />
      ))}
      {(
        [
          ["width", "Breite"],
          ["depth", "Tiefe"],
          ["height", "Höhe"],
        ] as const
      ).map(([key, label]) =>
        lengthField(label, shape[key], (p, value) => {
          const d = p.electrical.devices[id]!;
          d.metadata.consumerShape = { ...consumerShape(d)!, [key]: value };
        }),
      )}
      <NumberField
        label="Drehung (°)"
        value={(shape.rotation * 180) / Math.PI}
        disabled={locked}
        onCommit={(value) =>
          change((p) => {
            if (value === null) throw new Error("Drehwinkel fehlt.");
            const d = p.electrical.devices[id]!;
            d.metadata.consumerShape = { ...consumerShape(d)!, rotation: ((value % 360) * Math.PI) / 180 };
          })
        }
      />
      <NumberField
        label="Jahresverbrauch (kWh/Jahr)"
        value={shape.annualEnergyKWh}
        disabled={locked}
        onCommit={(value) =>
          change((p) => {
            const d = p.electrical.devices[id]!;
            d.metadata.consumerShape = { ...consumerShape(d)!, annualEnergyKWh: value };
          })
        }
      />
      <p className="field-hint">
        Eigenständiges Elektrogerät mit maßstäblichem Grundriss. Der Jahresverbrauch ist keine momentane
        Anschlussleistung. Anschluss und Nennwerte weiter unten bearbeiten.
      </p>
    </section>
  );
}
