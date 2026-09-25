import { startNetworkPath, finishNetworkPath, undoNetworkPoint } from "../../network/drawing";
import { NetworkConnectionDialog } from "./NetworkConnectionDialog";
import { useState } from "react";
import { useEditorStore } from "../../stores/editorStore";
import { networkLabels } from "../../housebook/model";
import type { NetworkKind } from "../../network/model";
import { Modal } from "../dialogs/Modal";
import { NetworkPanel } from "../housebook/NetworkPanel";
import { SelectField } from "../electrical/ElectricalFields";
import { isTvKind, tvCatalog } from "../../network/tv";
import { ZigbeeControls } from "./ZigbeePanel";
import { HaLiveControls } from "../housebook/HaLiveControls";
import { WifiSurvey } from "./WifiSurvey";

export function NetworkLibrary() {
  const tool = useEditorStore((s) => s.tool);
  const kind = useEditorStore((s) => s.networkKind);
  const request = useEditorStore((s) => s.networkRequest);
  const editingCable = useEditorStore((s) => s.networkCableId);
  const [open, setOpen] = useState(false);
  const [tvOpen, setTvOpen] = useState(false);
  const [wifiOpen, setWifiOpen] = useState(false);
  return (
    <section className="network-library" aria-label="Netzwerkgeräte">
      <ZigbeeControls />
      <button onClick={() => setWifiOpen(true)}>WLAN-Messkarte</button>
      {wifiOpen && <WifiSurvey onClose={() => setWifiOpen(false)} />}
      <details>
        <summary>Home-Assistant-Livewerte</summary>
        <HaLiveControls />
      </details>
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
        <option value="zigbee" disabled>
          Zigbee-Gerät aus Geräteliste
        </option>
        {Object.entries(networkLabels)
          .filter(([id]) => !isTvKind(id) && id !== "zigbee")
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
          {editingCable && <button onClick={finishNetworkPath}>Leitungsweg speichern</button>}
          <button onClick={undoNetworkPoint}>Letzten Kabelpunkt entfernen</button>
          <button onClick={() => useEditorStore.getState().cancel()}>Leitungsweg abbrechen</button>
        </>
      )}
      <button onClick={() => useEditorStore.getState().setTool("networkCable")}>
        Netzwerkkabel verlegen
      </button>
      {tool === "networkCable" && !editingCable && (
        <p className="field-hint">
          Startgerät, Wegpunkte und Zielgerät anklicken. Für den Steigweg am letzten Punkt das Geschoss
          wechseln. Danach Ports im Dialog festlegen.
        </p>
      )}
      {request && <NetworkConnectionDialog />}
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
          <NetworkPanel
            onDrawPath={(id) => {
              setOpen(false);
              startNetworkPath(id);
            }}
          />
        </Modal>
      )}
    </section>
  );
}
