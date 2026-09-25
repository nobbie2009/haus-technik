import { describe, it, expect, vi, afterEach } from "vitest";
import { alignAerial, aerialCorners } from "../../src/site/aerial";
import { housebook, setHousebook, asset } from "../../src/housebook/model";
import { replaceDevice } from "../../src/housebook/replaceDevice";
import { rectangleFixture } from "../fixtures";
import { simulationFixture } from "../simulation/fixture";
import { addNetworkNode } from "../../src/network/model";
import { parseProject } from "../../src/core/validation";
import { buildHouseScene, disposeHouseScene, wallPanels } from "../../src/rendering/three/houseScene";
import { useHomeAssistantStore } from "../../src/stores/homeAssistantStore";
vi.mock("../../src/persistence/homeAssistantConnection", () => ({
  loadHomeAssistantConnection: () => ({ url: "https://ha.example.test", token: "test-only" }),
}));
afterEach(() => {
  useHomeAssistantStore.getState().stop(true);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("Räumliche Planung und Livewerte", () => {
  it("richtet ein Luftbild gedreht und maßstäblich aus und speichert es getrennt", () => {
    const { project } = rectangleFixture();
    const image = {
      name: "Test",
      data: "data:image/png;base64,AAAA",
      pixelWidth: 100,
      pixelHeight: 50,
      width: 100,
      position: { x: 0, y: 0 },
      opacity: 0.5,
      visible: true,
    };
    const aligned = alignAerial(
      image,
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      [
        { x: 1000, y: 2000 },
        { x: 1000, y: 3000 },
      ],
    );
    expect(aligned.width).toBeCloseTo(1000);
    expect(aligned.rotation).toBeCloseTo(-90);
    const corners = aerialCorners(aligned);
    expect(corners[1]!.x).toBeCloseTo(1000);
    expect(corners[1]!.y).toBeCloseTo(3000);
    const b = housebook(project);
    b.backgrounds[project.floorOrder[0]!] = image;
    b.aerials = { [project.floorOrder[0]!]: aligned };
    setHousebook(project, b);
    const restored = parseProject(JSON.parse(JSON.stringify(project)));
    expect(housebook(restored).backgrounds).toEqual(b.backgrounds);
    expect(housebook(restored).aerials).toEqual(b.aerials);
    expect(() =>
      alignAerial(
        image,
        [
          { x: 0, y: 0 },
          { x: 0, y: 0 },
        ],
        [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
        ],
      ),
    ).toThrow();
  });
  it("erhält beim Verbrauchertausch IDs, Position und Stromkreis und erneuert Stammdaten", () => {
    const { project, devices } = simulationFixture();
    const id = devices[0]!,
      before = structuredClone(project.electrical.devices[id]!);
    replaceDevice(project, "devices", id, {
      name: "Neue Lampe",
      manufacturer: "Demo",
      model: "LED",
      serial: "Beispiel",
      entity: "light.neu",
      power: 6,
    });
    const after = project.electrical.devices[id]!;
    for (const key of [
      "id",
      "position",
      "floorId",
      "roomId",
      "connectionPointId",
      "circuitId",
      "switchId",
      "phases",
      "ratedVoltage",
    ] as const)
      expect(after[key]).toEqual(before[key]);
    expect(asset(after).homeAssistantEntity).toBe("light.neu");
    expect(after.ratedPower).toBe(6);
    expect(parseProject(project)).toBeTruthy();
  });
  it("verhindert den Verlust belegter Netzwerkports beim Ersetzen", () => {
    const { project } = rectangleFixture();
    const floor = project.floorOrder[0]!;
    const from = addNetworkNode(project, floor, { x: 0, y: 0 }, "switch"),
      to = addNetworkNode(project, floor, { x: 1000, y: 0 }, "client");
    const b = housebook(project);
    b.networkLinks.push({
      id: crypto.randomUUID(),
      name: "LAN",
      from,
      to,
      fromPort: 8,
      toPort: 1,
      cableType: "Cat 6",
      allowance: 0,
    });
    setHousebook(project, b);
    const change = { name: "Neuer Switch", manufacturer: "", model: "", serial: "", entity: "", ports: 4 };
    expect(() => replaceDevice(project, "networkNodes", from, change)).toThrow(/belegten/);
    replaceDevice(project, "networkNodes", from, { ...change, ports: 16 });
    expect(housebook(project).networkLinks).toEqual(b.networkLinks);
    expect(parseProject(project)).toBeTruthy();
  });
  it("schneidet Türöffnungen aus Wänden aus und baut ein entsorgbares Hausmodell", () => {
    const panels = wallPanels(4000, 2500, [{ position: 2000, width: 1000, height: 2000 }]);
    const area = panels.reduce((n, p) => n + (p.right - p.left) * (p.top - p.bottom), 0);
    expect(area).toBe(4000 * 2500 - 1000 * 2000);
    const { project } = rectangleFixture();
    const root = buildHouseScene(project, project.floorOrder, 0, 1);
    expect(root.children).toHaveLength(1);
    expect(root.children[0]!.children.length).toBeGreaterThan(4);
    disposeHouseScene(root);
  });
  it("pollt ohne Überlappung, stoppt und verwirft verspätete Antworten", async () => {
    vi.useFakeTimers();
    let resolve!: (response: Response) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<Response>((r) => {
          resolve = r;
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    useHomeAssistantStore.getState().start(5);
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    useHomeAssistantStore.getState().stop(true);
    resolve(new Response(JSON.stringify([{ entity_id: "sensor.demo", state: "21" }])));
    await vi.advanceTimersByTimeAsync(10000);
    expect(useHomeAssistantStore.getState().states).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("aktualisiert Werte und beendet weitere Abrufe nach Stopp", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(
      async () =>
        new Response(
          JSON.stringify([
            { entity_id: "sensor.demo", state: "21", attributes: { unit_of_measurement: "°C" } },
          ]),
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    useHomeAssistantStore.getState().start(5);
    await vi.advanceTimersByTimeAsync(1);
    expect(useHomeAssistantStore.getState().states[0]?.state).toBe("21");
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetcher).toHaveBeenCalledTimes(2);
    useHomeAssistantStore.getState().stop();
    await vi.advanceTimersByTimeAsync(20000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
