import { beforeEach, afterEach, it, expect, vi } from "vitest";
import {
  readSharedAccess,
  writeSharedAccess,
  clearSharedAccess,
  sharedAccessKey,
} from "../../src/persistence/sharedAccess";
import { authenticateShared, useSharedProjects } from "../../src/persistence/sharedProjects";
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
    removeItem: (k: string) => data.delete(k),
    clear: () => data.clear(),
  };
}
beforeEach(() => {
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("sessionStorage", storage());
});
afterEach(() => vi.unstubAllGlobals());
it("merkt Zugang und Abgleichbasis nur nach ausdrücklicher Auswahl über neue Tabs hinweg", () => {
  const value = {
    token: "fixture-access-only",
    links: { project: { etag: '"revision"', hash: "fingerprint" } },
    remember: true,
  };
  expect(writeSharedAccess(value)).toBe("");
  sessionStorage.clear();
  expect(readSharedAccess()).toEqual(value);
  expect(writeSharedAccess({ ...value, remember: false })).toBe("");
  expect(localStorage.getItem(sharedAccessKey)).toBeNull();
  expect(readSharedAccess().token).toBe(value.token);
  sessionStorage.clear();
  expect(readSharedAccess().token).toBe("");
});
it("entfernt beide Speicher und behandelt blockierten Browser-Speicher ohne Absturz", () => {
  writeSharedAccess({ token: "fixture-access-only", links: {}, remember: true });
  expect(clearSharedAccess()).toBe("");
  expect(readSharedAccess().token).toBe("");
  vi.stubGlobal("localStorage", {
    getItem() {
      throw new Error();
    },
    setItem() {
      throw new Error();
    },
    removeItem() {
      throw new Error();
    },
  });
  expect(writeSharedAccess({ token: "test", links: {}, remember: true })).toMatch(/nicht speichern/);
  expect(() => readSharedAccess()).not.toThrow();
  expect(clearSharedAccess()).toMatch(/nicht vollständig/);
});
it("speichert einen Schlüssel erst nach erfolgreicher Authentifizierung", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 401 })));
  await expect(authenticateShared("invalid", true)).rejects.toThrow(/ungültig/);
  expect(localStorage.getItem(sharedAccessKey)).toBeNull();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ projects: [] })));
  await authenticateShared("fixture-access-only", true);
  expect(readSharedAccess().remember).toBe(true);
  expect(useSharedProjects.getState().token).toBe("fixture-access-only");
});
