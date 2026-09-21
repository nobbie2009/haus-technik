import type { NetworkNode } from "../../network/model";
import { isTvKind, tvDefaults, portName } from "../../network/tv";
import { TextField } from "../Fields";
import { NumberField } from "../electrical/ElectricalFields";

export function TvFields({
  node,
  locked,
  change,
}: {
  node: NetworkNode;
  locked: boolean;
  change: (mutate: (node: NetworkNode) => void) => boolean;
}) {
  if (!isTvKind(node.kind)) return null;
  const tv = node.tv ?? tvDefaults(node.kind);
  const update = (mutate: (value: NonNullable<NetworkNode["tv"]>) => void) =>
    change((n) => {
      if (!isTvKind(n.kind)) return;
      n.tv ??= tvDefaults(n.kind);
      mutate(n.tv);
    });
  return (
    <>
      <TextField
        label="TV-/SAT-Modell"
        value={tv.model}
        disabled={locked}
        onCommit={(value) =>
          update((t) => {
            t.model = value;
          })
        }
      />
      {(node.kind === "satDish" || node.kind === "lnb") && (
        <>
          <TextField
            label="Satellit / Position"
            value={tv.satellite}
            disabled={locked}
            onCommit={(value) =>
              update((t) => {
                t.satellite = value;
              })
            }
          />
          <TextField
            label="LNB-Ausführung"
            value={tv.lnbType}
            disabled={locked}
            onCommit={(value) =>
              update((t) => {
                t.lnbType = value;
              })
            }
          />
          <p className="field-hint">
            Zum Beispiel Single, Twin, Quad, Quattro, Wideband oder Unicable. Anschlussanzahl und -namen
            passend zum Gerät erfassen.
          </p>
        </>
      )}
      {node.kind === "satDish" && (
        <NumberField
          label="Spiegeldurchmesser (mm)"
          value={tv.diameterMm}
          disabled={locked}
          onCommit={(value) =>
            update((t) => {
              t.diameterMm = value;
            })
          }
        />
      )}
      <details>
        <summary>Anschlüsse benennen ({node.ports})</summary>
        {Array.from({ length: node.ports }, (_, i) => (
          <TextField
            key={i}
            label={`Anschluss ${i + 1}`}
            value={portName({ ...node, tv }, i + 1)}
            disabled={locked}
            onCommit={(value) =>
              update((t) => {
                t.portNames = Array.from({ length: node.ports }, (_, p) =>
                  portName({ ...node, tv: t }, p + 1),
                );
                t.portNames[i] = value;
              })
            }
          />
        ))}
      </details>
      <p className="field-hint">
        Anschlussbelegung dokumentieren; Signalpegel und HF-Kompatibilität werden nicht berechnet.
      </p>
    </>
  );
}
