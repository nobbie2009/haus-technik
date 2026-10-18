import { describe, expect, it } from "vitest";
import { pressKey } from "../../src/components/NumericKeypad";

describe("Ziffernblock", () => {
  it("ersetzt den markierten Wert beim ersten Tastendruck", () => {
    expect(pressKey("4,350 m", "3", true)).toBe("3");
    expect(pressKey("4,350 m", ",", true)).toBe("0,");
  });

  it("hängt Ziffern an, setzt nur ein Komma und löscht rückwärts", () => {
    let value = pressKey("4,350 m", "2", true);
    for (const key of [",", "5", ",", "0"] as const) value = pressKey(value, key, false);
    expect(value).toBe("2,50");
    expect(pressKey(value, "back", false)).toBe("2,5");
    expect(pressKey("4,350 m", "back", true)).toBe("");
  });

  it("wechselt das Vorzeichen für Nischen ohne den Wert zu verwerfen", () => {
    expect(pressKey("0,4", "sign", true)).toBe("-0,4");
    expect(pressKey("-0,4", "sign", false)).toBe("0,4");
  });
});
