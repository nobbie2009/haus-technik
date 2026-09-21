import { useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { networkLabels } from "../../housebook/model";
import type { NetworkKind } from "../../network/model";
import { Modal } from "../dialogs/Modal";
import { NetworkPanel } from "../housebook/NetworkPanel";
import { SelectField } from "../electrical/ElectricalFields";

export function NetworkLibrary() {
  const kind = useEditorStore((s) => s.networkKind);
  const [open, setOpen] = useState(false);
  return (
    <section className="network-library" aria-label="Netzwerkgeräte">
      <SelectField
        label="Netzwerkgerät platzieren"
        value={kind}
        onChange={(value) => {
          useEditorStore.getState().setTool("network");
          useEditorStore.setState({ networkKind: value as NetworkKind });
        }}
      >
        {Object.entries(networkLabels).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </SelectField>
      <button className="full-width" onClick={() => useEditorStore.getState().setTool("network")}>
        Im Grundriss platzieren
      </button>
      <p className="field-hint">
        Gerät wählen und im Plan anklicken. Mit „Auswahl“ Geräte verschieben und rechts bearbeiten.
      </p>
      <button className="full-width" onClick={() => setOpen(true)}>
        Ports, Kabel & WLAN
      </button>
      {open && (
        <Modal title="Netzwerk und Verbindungen" onClose={() => setOpen(false)}>
          <NetworkPanel />
        </Modal>
      )}
    </section>
  );
}
