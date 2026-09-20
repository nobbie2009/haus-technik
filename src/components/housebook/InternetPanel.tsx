import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { homeBook } from "../../housebook/home";
import { housebook } from "../../housebook/model";
import { NetworkPanel } from "./NetworkPanel";
import { Field, updateBook } from "./shared";
import { updateHome } from "./HomeShared";
const empty = () => ({ ssid: "", band: "", ip: "", mac: "", location: "", notes: "" });
export function InternetPanel() {
  const p = useProjectStore((s) => s.project),
    nodes = housebook(p).networkNodes;
  const [internet, setInternet] = useState(() => homeBook(p).internet),
    [id, setId] = useState(""),
    [details, setDetails] = useState(empty);
  return (
    <section>
      <h3>Internet & WLAN</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateHome("Internetanschluss speichern", (b) => {
            b.internet = internet;
          });
        }}
      >
        <div className="book-grid">
          {(
            [
              ["provider", "Anbieter"],
              ["technology", "Anschlussart"],
              ["notes", "Anschlussnotizen"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                value={internet[key]}
                onChange={(e) => setInternet({ ...internet, [key]: e.target.value })}
              />
            </Field>
          ))}
          {(
            [
              ["downloadMbps", "Download (Mbit/s)"],
              ["uploadMbps", "Upload (Mbit/s)"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type="number"
                min="0"
                step="any"
                value={internet[key] ?? ""}
                onChange={(e) =>
                  setInternet({ ...internet, [key]: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </Field>
          ))}
        </div>
        <div className="book-actions">
          <button>Internetanschluss speichern</button>
        </div>
      </form>
      <h4>WLAN- und Geräteangaben</h4>
      <p>
        Router, Access Points, Repeater und Clients unten im Netzwerkplan anlegen. WLAN-Namen, Frequenzbänder
        und die beobachtete Versorgung manuell dokumentieren.
      </p>
      <Field label="Gerät für WLAN-Angaben">
        <select
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setDetails(nodes.find((n) => n.id === e.target.value)?.details ?? empty());
          }}
        >
          <option value="">Gerät wählen</option>
          {nodes.map((n) => (
            <option value={n.id} key={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </Field>
      {id && nodes.some((n) => n.id === id) && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateBook("WLAN-Angaben speichern", (b) => {
              const n = b.networkNodes.find((n) => n.id === id);
              if (n) n.details = details;
            });
          }}
        >
          <div className="book-grid">
            {(
              [
                ["ssid", "WLAN-Name (SSID)"],
                ["band", "Frequenzbänder"],
                ["ip", "IP-Adresse"],
                ["mac", "MAC-Adresse"],
                ["location", "Standort / versorgte Räume"],
                ["notes", "Verbindung / Empfang / Notizen"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  value={details[key]}
                  onChange={(e) => setDetails({ ...details, [key]: e.target.value })}
                />
              </Field>
            ))}
          </div>
          <div className="book-actions">
            <button>WLAN-Angaben speichern</button>
          </div>
        </form>
      )}
      <NetworkPanel />
    </section>
  );
}
