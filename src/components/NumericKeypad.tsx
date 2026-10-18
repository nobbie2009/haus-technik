export type KeypadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "," | "back" | "sign";

const rows: { key: KeypadKey; label: string }[][] = [
  [
    { key: "7", label: "7" },
    { key: "8", label: "8" },
    { key: "9", label: "9" },
    { key: "back", label: "⌫" },
  ],
  [
    { key: "4", label: "4" },
    { key: "5", label: "5" },
    { key: "6", label: "6" },
    { key: "sign", label: "±" },
  ],
  [
    { key: "1", label: "1" },
    { key: "2", label: "2" },
    { key: "3", label: "3" },
    { key: ",", label: "," },
  ],
  [{ key: "0", label: "0" }],
];

const names: Partial<Record<KeypadKey, string>> = {
  back: "Letzte Ziffer löschen",
  sign: "Vorzeichen wechseln",
  ",": "Komma",
};

/** Ein frischer Wert wird beim ersten Tastendruck ersetzt, wie bei markiertem Feldinhalt. */
export function pressKey(current: string, key: KeypadKey, fresh: boolean): string {
  const text = fresh && key !== "sign" ? "" : current.trim();
  if (key === "back") return text.slice(0, -1).trimEnd();
  if (key === "sign") return text.startsWith("-") ? text.slice(1) : `-${text}`;
  const number = text.replace(/\s*(mm|cm|m)$/i, "");
  if (key === ",") return number.includes(",") ? number : `${number || "0"},`;
  return `${number}${key}`;
}

export function NumericKeypad({ onPress }: { onPress: (key: KeypadKey) => void }) {
  return (
    <div className="numeric-keypad" role="group" aria-label="Ziffernblock">
      {rows.flat().map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={key === "0" ? "wide" : undefined}
          aria-label={names[key] ?? label}
          // Fokus im Maßfeld halten, damit keine Systemtastatur erscheint.
          onPointerDown={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPress(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
