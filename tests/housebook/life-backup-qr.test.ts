import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { parseProject } from "../../src/core/validation";
import { life, setLife, newEvent } from "../../src/housebook/life";
import {
  projectFingerprint,
  recordExport,
  backupStatus,
  useBackupLog,
} from "../../src/persistence/backupLog";
import { qrLink, readQrLink } from "../../src/housebook/qr";
import { searchProject } from "../../src/housebook/search";
import { useProjectStore } from "../../src/stores/projectStore";
describe("Hausalltag, Sicherungen und QR", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
    });
    useBackupLog.setState({ records: {} });
  });
  afterEach(() => vi.unstubAllGlobals());
  it("erhält Chronik und Kontakte im JSON und lässt alte Projekte unverändert", () => {
    const p = createProject();
    expect(life(p).events).toEqual([]);
    expect(p.metadata.houseLife).toBeUndefined();
    const b = life(p);
    b.events.push({
      ...newEvent(),
      title: "Heizung repariert",
      cost: 125.5,
      receipt: { name: "Rechnung.pdf", data: "data:application/pdf;base64,JVBERi0=" },
    });
    b.contacts.push({
      id: crypto.randomUUID(),
      name: "Service",
      role: "Heizung",
      phone: "0123",
      email: "service@example.org",
      notes: "",
    });
    setLife(p, b);
    expect(life(parseProject(JSON.parse(JSON.stringify(p))))).toEqual(b);
    expect(searchProject(p, "Rechnung.pdf")[0]!.section).toBe("chronicle");
  });
  it("weist ungültige Belege, Kosten und Datumswerte zurück", () => {
    const p = createProject(),
      b = life(p);
    b.events.push({ ...newEvent(), title: "Test", cost: -1 });
    expect(() => setLife(p, b)).toThrow();
    b.events[0]!.cost = null;
    b.events[0]!.date = "2026-02-30";
    expect(() => setLife(p, b)).toThrow();
    b.events[0]!.date = "2026-02-28";
    b.events[0]!.receipt = { name: "Datei", data: "data:text/html;base64,AAAA" };
    expect(() => setLife(p, b)).toThrow();
  });
  it("vergleicht Inhalte unabhängig von der Schlüsselreihenfolge", () => {
    const p = createProject(),
      reordered = Object.fromEntries(Object.entries(p).reverse()) as typeof p;
    expect(projectFingerprint(p)).toBe(projectFingerprint(reordered));
    const changed = structuredClone(p);
    changed.name = "Anderes Haus";
    expect(projectFingerprint(changed)).not.toBe(projectFingerprint(p));
  });
  it("unterscheidet Exportstart, geprüfte Datei, neue Änderungen und Alter", () => {
    const p = createProject();
    expect(backupStatus(p).needsBackup).toBe(true);
    recordExport(p);
    expect(backupStatus(p).text).toContain("noch nicht geprüft");
    recordExport(p, true);
    expect(backupStatus(p).needsBackup).toBe(false);
    expect(backupStatus(p, Date.now() + 8 * 86400000).needsBackup).toBe(true);
    p.name = "Geändert";
    expect(backupStatus(p).needsBackup).toBe(true);
  });
  it("behauptet bei alleiniger Dateiprüfung keinen Export", () => {
    const p = createProject();
    recordExport(p, true);
    expect(useBackupLog.getState().records[p.id]!.at).toBeNull();
    expect(useBackupLog.getState().records[p.id]!.verifiedAt).not.toBeNull();
  });
  it("bildet QR-Ziele ohne vertrauliche Projektdaten ab", () => {
    const p = createProject("Privater Name"),
      url = qrLink("http://192.168.1.10:4173/app/?old=1", p.id, "home:abc");
    expect(url).not.toContain("Privater");
    expect(url).not.toContain("old=");
    expect(readQrLink(new URL(url).hash)).toEqual({ projectId: p.id, key: "home:abc" });
    expect(readQrLink("#haus=invalid&akte=abc")).toBeNull();
    expect(() => qrLink("javascript:alert(1)", p.id, "x")).toThrow();
    expect(() => qrLink("https://user:password@example.org", p.id, "x")).toThrow();
  });
  it("unterstützt Undo/Redo für die Hauschronik", () => {
    useProjectStore.getState().replace(createProject());
    useProjectStore.getState().commit("Chronik", (p) => {
      const b = life(p);
      b.events.push({ ...newEvent(), title: "Reparatur" });
      setLife(p, b);
    });
    useProjectStore.getState().undo();
    expect(life(useProjectStore.getState().project).events).toHaveLength(0);
    useProjectStore.getState().redo();
    expect(life(useProjectStore.getState().project).events).toHaveLength(1);
  });
});
