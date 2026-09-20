import { describe, it, expect, vi, afterEach } from "vitest";
import { latestVersion, newer } from "../../src/updates/check";
afterEach(() => vi.unstubAllGlobals());
describe("Updateprüfung", () => {
  it("vergleicht Versionsbestandteile numerisch und ignoriert ungültige Versionen", () => {
    expect(newer("v0.22.0", "0.9.9")).toBe(true);
    for (const value of ["0.21.9", "0.22.0", "0.23.0-beta", "hello", null])
      expect(newer(value, "0.22.0")).toBe(false);
  });
  it("liest stabile Releases und unterscheidet kein Release von Netzwerkfehlern", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ tag_name: "v0.23.0" }))));
    expect(await latestVersion()).toBe("0.23.0");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 404 })));
    expect(await latestVersion()).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 403 })));
    await expect(latestVersion()).rejects.toThrow();
  });
});
