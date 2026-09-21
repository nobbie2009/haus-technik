import { startNetworkPath, finishNetworkPath } from "../../network/drawing";
import { useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { networkLabels } from "../../housebook/model";
import type { NetworkKind } from "../../network/model";
import { Modal } from "../dialogs/Modal";
import { NetworkPanel } from "../housebook/NetworkPanel";
import { SelectField } from "../electrical/ElectricalFields";
import { isTvKind, tvCatalog } from "../../network/tv";

export function NetworkLibrary() {
  const tool = useEditorStore((s) => s.tool);
  const kind = useEditorStore((s) => s.networkKind);
  const [open, setOpen] = useState(false);
  const [tvOpen, setTvOpen] = useState(false);
  return (
    <section className="network-library" aria-label="Netzwerkgeräte">
      <SelectField
        label="Netzwerkgerät platzieren"
        value={isTvKind(kind) ? "" : kind}
        onChange={(value) => {
          useEditorStore.getState().setTool("network");
          useEditorStore.setState({ networkKind: value as NetworkKind });
        }}
      >
        <option value="" disabled>
          Netzwerkgerät wählen
        </option>
        {Object.entries(networkLabels)
          .filter(([id]) => !isTvKind(id))
          .map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
      </SelectField>
      <SelectField
        label="TV-/SAT-Gerät platzieren"
        value={isTvKind(kind) ? kind : ""}
        onChange={(value) => {
          useEditorStore.getState().setTool("network");
          useEditorStore.setState({ networkKind: value as NetworkKind });
        }}
      >
        <option value="" disabled>
          TV / SAT wählen
        </option>
        {Object.entries(tvCatalog).map(([id, item]) => (
          <option key={id} value={id}>
            {item.label}
          </option>
        ))}
      </SelectField>
      <button className="full-width" onClick={() => useEditorStore.getState().setTool("network")}>
        Im Grundriss platzieren
      </button>
      {tool === "networkCable" && (
        <>
          <button onClick={finishNetworkPath}>Leitungsweg speichern</button>
          <button onClick={() => useEditorStore.getState().cancel()}>Leitungsweg abbrechen</button>
        </>
      )}
      <p className="field-hint">
        Gerät wählen und im Plan anklicken. Mit „Auswahl“ Geräte verschieben und rechts bearbeiten.
      </p>
      <button className="full-width" onClick={() => setOpen(true)}>
        Ports, Kabel & WLAN
      </button>
      <button onClick={() => setTvOpen(true)}>TV / SAT & Koaxleitungen</button>
      {tvOpen && (
        <Modal title="TV / SAT & Koaxleitungen" onClose={() => setTvOpen(false)}>
          <NetworkPanel
            tvOnly
            onDrawPath={(id) => {
              setTvOpen(false);
              startNetworkPath(id);
            }}
          />
        </Modal>
      )}
      {open && (
        <Modal title="Netzwerk und Verbindungen" onClose={() => setOpen(false)}>
          <NetworkPanel />
        </Modal>
      )}
    </section>
  );
}
