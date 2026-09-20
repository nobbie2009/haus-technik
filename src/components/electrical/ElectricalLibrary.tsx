import { useState } from "react";
import { ConsumerLibraryDialog } from "./ConsumerLibraryDialog";
import { ElectricalSettingsDialog } from "./ElectricalSettingsDialog";
import { useEditorStore } from "../../stores/editorStore";
import type { ElectricalKind } from "../../electrical/models";
import { SelectField } from "./ElectricalFields";
import { CircuitsDialog } from "./CircuitsDialog";
import { SimulationDialog } from "../simulation/SimulationDialog";
import { useSimulationStore } from "../../stores/simulationStore";

export function ElectricalLibrary() {
  const [consumers, setConsumers] = useState(false);
  const [settings, setSettings] = useState(false);
  const kind = useEditorStore((s) => s.electricalKind);
  const tool = useEditorStore((s) => s.tool);
  const [circuits, setCircuits] = useState(false);
  const [simulation, setSimulation] = useState(false);
  return (
    <div className="furniture-library electrical-library">
      <button className="electrical-manage" onClick={() => setConsumers(true)}>
        Verbraucherdatenbank
      </button>
      {consumers && <ConsumerLibraryDialog onClose={() => setConsumers(false)} />}
      <SelectField
        label="Elektroobjekt"
        value={kind}
        onChange={(value) => {
          useEditorStore.getState().setTool("electrical");
          useEditorStore.setState({ electricalKind: value as ElectricalKind });
        }}
      >
        <option value="junctions">Abzweig- / Verbindungspunkt</option>
        <option value="outlets">Steckdose</option>
        <option value="switches">Lichtschalter</option>
        <option value="controls">Wechsel-/Kreuzschaltung / Stromstoßrelais</option>
        <option value="transformers">Transformator / Klingeltrafo</option>
        <option value="devices">Verbraucher / Lampe</option>
        <option value="distributionBoards">Sicherungskasten / Verteiler</option>
        <option value="supplies">Stromeinspeisepunkt</option>
        <option value="meters">Stromzähler</option>
      </SelectField>
      <p>
        {tool === "connect"
          ? "Objekte verbinden: ziehen oder zwei Klicks. Danach Kontakte im Dialog wählen."
          : tool === "cable"
            ? "Startobjekt, Wegpunkte, Endobjekt anklicken. Escape: abbrechen."
            : "Vorlage wählen und platzieren. V oder Escape: Auswahl."}
      </p>
      <button
        className="electrical-manage"
        onClick={() => {
          useEditorStore.getState().cancel();
          useEditorStore.setState({ connectionRequest: { startNodeId: "", endNodeId: "", cableId: null } });
        }}
      >
        Anschlussdialog öffnen
      </button>
      <button className="electrical-manage" onClick={() => setCircuits(true)}>
        Stromkreise verwalten
      </button>
      <button
        className="electrical-manage"
        onClick={() => {
          if (!useSimulationStore.getState().active) useSimulationStore.getState().start();
          setSimulation(true);
        }}
      >
        Stromkreis simulieren
      </button>
      {simulation && <SimulationDialog onClose={() => setSimulation(false)} />}
      <button className="electrical-manage" onClick={() => setSettings(true)}>
        Elektrik-Projektstandard
      </button>
      {settings && <ElectricalSettingsDialog onClose={() => setSettings(false)} />}
      {circuits && <CircuitsDialog onClose={() => setCircuits(false)} />}
    </div>
  );
}
