import { useEffect, useId, useState } from "react";
import { formatLength, parseLength } from "../utils/units";
import type { DisplayUnit } from "../models/common";
import { useProjectStore } from "../stores/projectStore";

export function TextField({
  label,
  value,
  onCommit,
  disabled = false,
  hint,
}: {
  label: string;
  value: string;
  onCommit: (value: string) => boolean;
  disabled?: boolean;
  hint?: string;
}) {
  const [input, setInput] = useState(value);
  const id = useId();
  useEffect(() => setInput(value), [value]);
  const submit = () => {
    if (input !== value && !onCommit(input)) setInput(value);
  };
  return (
    <label className="field" htmlFor={id}>
      <span id={`${id}-label`}>{label}</span>
      <input
        id={id}
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        value={input}
        disabled={disabled}
        onChange={(event) => setInput(event.target.value)}
        onBlur={submit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            setInput(value);
            event.stopPropagation();
          }
        }}
      />
      {hint && (
        <span className="field-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </label>
  );
}

export function LengthField({
  label,
  value,
  onCommit,
  unit,
  disabled = false,
  hint,
}: {
  label: string;
  value: number;
  onCommit: (value: number) => boolean;
  unit: DisplayUnit;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <TextField
      label={label}
      value={formatLength(value, unit)}
      disabled={disabled}
      {...(hint ? { hint } : {})}
      onCommit={(input) => {
        try {
          return onCommit(parseLength(input, unit));
        } catch (error) {
          useProjectStore.setState({ error: error instanceof Error ? error.message : "Ungültiges Maß." });
          return false;
        }
      }}
    />
  );
}
