import type { ReactNode } from "react";
import { TextField } from "../Fields";
import { useProjectStore } from "../../stores/projectStore";

export function NumberField({
  label,
  value,
  disabled = false,
  hint = "Leer = unbekannt",
  onCommit,
}: {
  label: string;
  value: number | null;
  disabled?: boolean;
  hint?: string;
  onCommit: (value: number | null) => boolean;
}) {
  return (
    <TextField
      label={label}
      value={value === null ? "" : String(value).replace(".", ",")}
      disabled={disabled}
      hint={hint}
      onCommit={(text) => {
        const normalized = text.trim().replace(",", ".");
        if (normalized && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) {
          useProjectStore.setState({
            error: "Bitte eine Zahl ohne Einheit eingeben oder das Feld leer lassen.",
          });
          return false;
        }
        return onCommit(normalized ? Number(normalized) : null);
      }}
    />
  );
}
export function SelectField({
  label,
  value,
  disabled = false,
  onChange,
  children,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}
