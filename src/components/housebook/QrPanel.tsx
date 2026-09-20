import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { searchEntries } from "../../housebook/search";
import { qrLabelsPdf } from "../../housebook/housePrint";
import { qrLink } from "../../housebook/qr";
import { Field } from "./shared";
export function QrPanel() {
  const p = useProjectStore((s) => s.project),
    rows = searchEntries(p),
    [base, setBase] = useState(`${window.location.origin}${window.location.pathname}`),
    [filter, setFilter] = useState(""),
    [keys, setKeys] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const selected = rows.filter((r) => keys.includes(r.key));
  return (
    <section>
      <h3>QR-Aufkleber</h3>
      <p>
        Mit der iPad-Kamera scannen und direkt die zugehörige Hausakte öffnen. Das passende Projekt muss auf
        dem Zielgerät importiert sein. Der QR-Code enthält nur Projekt- und Objektkennung, keine Fotos oder
        Kontaktdaten.
      </p>
      <Field label="WLAN-Adresse der Anwendung">
        <input type="url" value={base} onChange={(e) => setBase(e.target.value)} />
      </Field>
      {/localhost|127\.0\.0\.1/.test(base) && (
        <p>
          Für das iPad hier die WLAN-Adresse des PCs eintragen. localhost erreicht nur das aktuelle Gerät.
        </p>
      )}
      <p>
        Die Adresse sollte erreichbar bleiben, z. B. durch eine feste IP-Zuweisung im Router. Ein Aufkleber
        überträgt keine Projektdatei.
      </p>
      <Field label="Akten für QR filtern">
        <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      </Field>
      <p>{selected.length} Aufkleber ausgewählt</p>
      <div className="book-actions">
        <button onClick={() => setKeys([])}>Auswahl leeren</button>
        <button
          disabled={busy || !selected.length}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const doc = await qrLabelsPdf(p, selected, base);
              doc.save("Hausakte-QR-Aufkleber.pdf");
            } catch (e) {
              setError(String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          QR-Aufkleber als PDF
        </button>
      </div>
      {rows
        .filter((r) => `${r.title} ${r.category} ${r.location}`.toLowerCase().includes(filter.toLowerCase()))
        .slice(0, 100)
        .map((r) => (
          <article className="home-row" key={r.key}>
            <label>
              <input
                type="checkbox"
                checked={keys.includes(r.key)}
                onChange={(e) =>
                  setKeys(e.target.checked ? [...keys, r.key] : keys.filter((k) => k !== r.key))
                }
              />{" "}
              {r.title} · {r.category} · {r.location}
            </label>
            <button
              onClick={() => {
                try {
                  const hash = new URL(qrLink(base, p.id, r.key)).hash;
                  if (window.location.hash === hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
                  else window.location.hash = hash;
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              Ziel testen: {r.title}
            </button>
          </article>
        ))}
      <p>
        Bis zu 100 Treffer werden angezeigt. Zum Eingrenzen den Filter verwenden. Das PDF enthält acht
        Aufkleber je A4-Seite mit Schnittlinien.
      </p>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
