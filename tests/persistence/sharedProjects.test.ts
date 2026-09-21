import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createProject } from "../../src/core/projectFactory";
import { useProjectStore } from "../../src/stores/projectStore";
import {
  connectShared,
  linkShared,
  syncShared,
  useSharedProjects,
} from "../../src/persistence/sharedProjects";
describe("Abgleich gemeinsamer Projekte", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", { setItem: vi.fn(), removeItem: vi.fn() });
    useSharedProjects.setState({ busy: false });
    connectShared("test-only-key");
  });
  afterEach(() => vi.unstubAllGlobals());
  it("überschreibt bei beidseitigen Änderungen weder Server noch lokalen Entwurf", async () => {
    const p = createProject("Basis");
    linkShared(p, '"old"');
    const local = { ...p, name: "Lokaler Entwurf" };
    useProjectStore.getState().replace(local);
    const fetch = vi.fn().mockResolvedValue(Response.json({ projects: [{ id: p.id, etag: '"new"' }] }));
    vi.stubGlobal("fetch", fetch);
    await syncShared();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(useProjectStore.getState().project.name).toBe("Lokaler Entwurf");
    expect(useSharedProjects.getState().links[p.id]!.etag).toBe('"old"');
    expect(useSharedProjects.getState().message).toMatch(/Konflikt/);
  });
  it("verwendet die Basisrevision beim Hochladen und behält sie bei Netzfehlern", async () => {
    const p = createProject("Basis");
    linkShared(p, '"old"');
    useProjectStore.getState().replace({ ...p, name: "Neue Eingabe" });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ projects: [{ id: p.id, etag: '"old"' }] }))
      .mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetch);
    await syncShared();
    expect(fetch.mock.calls[1]![1].headers["If-Match"]).toBe('"old"');
    expect(useSharedProjects.getState().links[p.id]!.etag).toBe('"old"');
    expect(useProjectStore.getState().project.name).toBe("Neue Eingabe");
    expect(useSharedProjects.getState().busy).toBe(false);
  });
});
