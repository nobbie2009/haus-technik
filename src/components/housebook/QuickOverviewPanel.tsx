import { useState } from "react";
import { useProjectStore } from "../../stores/projectStore";
import { life, setLife, type HouseContact } from "../../housebook/life";
import { searchEntries } from "../../housebook/search";
import { quickOverviewPdf } from "../../housebook/housePrint";
import { utilities } from "../../utilities/model";
import { newId } from "../../utils/uuid";
import { Field } from "./shared";
const newContact = (): HouseContact => ({ id: newId(), name: "", role: "", phone: "", email: "", notes: "" });
export function QuickOverviewPanel() {
  const p = useProjectStore((s) => s.project),
    b = life(p),
    entries = searchEntries(p),
    [key, setKey] = useState(""),
    [contact, setContact] = useState(newContact),
    [place, setPlace] = useState({ id: newId(), title: "", location: "", instructions: "" }),
    [notes, setNotes] = useState(b.quickNotes),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const change = (fn: (b: ReturnType<typeof life>) => void) =>
    useProjectStore.getState().commit("Haus-Schnellübersicht ändern", (p) => {
      const b = life(p);
      fn(b);
      setLife(p, b);
    });
  return (
    <section>
      <h3>Haus-Schnellübersicht</h3>
      <p>Wichtige Stellen und eigene Ansprechpartner sammeln und als PDF ausdrucken.</p>
      <Field label="Vorhandene Akte zur Schnellübersicht">
        <select value={key} onChange={(e) => setKey(e.target.value)}>
          <option value="">Eintrag auswählen</option>
          {entries.map((r) => (
            <option key={r.key} value={r.key}>
              {r.title} · {r.category} · {r.location}
            </option>
          ))}
        </select>
      </Field>
      <div className="book-actions">
        <button
          disabled={!key}
          onClick={() =>
            change((b) => {
              if (!b.quickKeys.includes(key)) b.quickKeys.push(key);
            })
          }
        >
          Eintrag aufnehmen
        </button>
        <button
          onClick={() =>
            change((b) => {
              const keys = entries
                .filter(
                  (r) =>
                    r.target?.kind === "distributionBoards" ||
                    r.category === "Absperrstelle" ||
                    (r.target?.kind === "utilityNodes" && utilities(p).nodes[r.target.id]?.kind === "valve"),
                )
                .map((r) => r.key);
              b.quickKeys = [...new Set([...b.quickKeys, ...keys])];
            })
          }
        >
          Sicherungskästen und Absperrstellen übernehmen
        </button>
      </div>
      {b.quickKeys.map((key) => {
        const r = entries.find((r) => r.key === key);
        return (
          <article className="home-row" key={key}>
            <strong>{r?.title ?? "Eintrag wurde entfernt"}</strong>
            <span>{r?.location}</span>
            <button
              onClick={() =>
                change((b) => {
                  b.quickKeys = b.quickKeys.filter((k) => k !== key);
                })
              }
            >
              Aus Liste entfernen: {r?.title ?? key}
            </button>
          </article>
        );
      })}
      <h4>Eigene wichtige Stellen</h4>
      {b.places.map((v) => (
        <article className="home-row" key={v.id}>
          <strong>{v.title}</strong>
          <span>{v.location}</span>
          <button onClick={() => setPlace({ ...v })}>Ort bearbeiten: {v.title}</button>
          <button
            onClick={() => {
              if (
                change((b) => {
                  b.places = b.places.filter((p) => p.id !== v.id);
                }) &&
                place.id === v.id
              )
                setPlace({ id: newId(), title: "", location: "", instructions: "" });
            }}
          >
            Ort entfernen: {v.title}
          </button>
        </article>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            change((b) => {
              const i = b.places.findIndex((v) => v.id === place.id);
              if (i < 0) b.places.push(place);
              else b.places[i] = place;
            })
          )
            setPlace({ id: newId(), title: "", location: "", instructions: "" });
        }}
      >
        <div className="book-grid">
          <Field label="Wichtige Stelle">
            <input
              required
              value={place.title}
              onChange={(e) => setPlace({ ...place, title: e.target.value })}
            />
          </Field>
          <Field label="Genaue Lage">
            <input
              value={place.location}
              onChange={(e) => setPlace({ ...place, location: e.target.value })}
            />
          </Field>
          <Field label="Eigene Bedienhinweise">
            <textarea
              value={place.instructions}
              onChange={(e) => setPlace({ ...place, instructions: e.target.value })}
            />
          </Field>
        </div>
        <button>Wichtige Stelle speichern</button>
      </form>
      <h4>Ansprechpartner</h4>
      {b.contacts.map((c) => (
        <article key={c.id} className="home-row">
          <strong>{c.name}</strong>
          <span>
            {c.role} · {c.phone} · {c.email}
          </span>
          <button onClick={() => setContact({ ...c })}>Kontakt bearbeiten: {c.name}</button>
          <button
            onClick={() => {
              if (
                change((b) => {
                  b.contacts = b.contacts.filter((v) => v.id !== c.id);
                }) &&
                contact.id === c.id
              )
                setContact(newContact());
            }}
          >
            Kontakt entfernen: {c.name}
          </button>
        </article>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            change((b) => {
              const i = b.contacts.findIndex((v) => v.id === contact.id);
              if (i < 0) b.contacts.push(contact);
              else b.contacts[i] = contact;
            })
          )
            setContact(newContact());
        }}
      >
        <div className="book-grid">
          {(
            [
              ["name", "Kontaktname"],
              ["role", "Zuständig für"],
              ["phone", "Telefon"],
              ["email", "E-Mail"],
              ["notes", "Kontakthinweise"],
            ] as const
          ).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                type={key === "email" ? "email" : "text"}
                required={key === "name"}
                value={contact[key]}
                onChange={(e) => setContact({ ...contact, [key]: e.target.value })}
              />
            </Field>
          ))}
        </div>
        <button>Kontakt speichern</button>
      </form>
      <Field label="Hinweise für die Hausübersicht">
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="book-actions">
        <button
          onClick={() =>
            change((b) => {
              b.quickNotes = notes;
            })
          }
        >
          Hinweise speichern
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            if (
              !change((b) => {
                b.quickNotes = notes;
              })
            )
              return;
            setBusy(true);
            setError("");
            try {
              const doc = await quickOverviewPdf(useProjectStore.getState().project);
              doc.save("Haus-Schnelluebersicht.pdf");
            } catch (e) {
              setError(String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Hausübersicht als PDF
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
