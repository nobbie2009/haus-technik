/** Editierbare Dokumentationsvorlagen; keine Prüfung der HF-Kompatibilität. */
export const tvCatalog = {
  satDish: { label: "SAT-Schüssel mit LNB", symbol: "SAT", ports: ["VL", "HL", "VH", "HH"] },
  lnb: { label: "LNB", symbol: "LNB", ports: ["VL", "HL", "VH", "HH"] },
  multiswitch: {
    label: "Multischalter",
    symbol: "MS",
    ports: [
      "SAT VL",
      "SAT HL",
      "SAT VH",
      "SAT HH",
      "Terrestrisch",
      ...Array.from({ length: 8 }, (_, i) => `Teilnehmer ${i + 1}`),
    ],
  },
  antenna: { label: "Terrestrische Antenne", symbol: "ANT", ports: ["Ausgang"] },
  tvAmplifier: { label: "Antennenverstärker", symbol: "AMP", ports: ["Eingang", "Ausgang"] },
  coaxSplitter: {
    label: "Koax-Verteiler / Abzweiger",
    symbol: "VT",
    ports: ["Eingang", "Ausgang 1", "Ausgang 2"],
  },
  tvSocket: { label: "TV-/SAT-Antennendose", symbol: "DO", ports: ["Zuleitung", "SAT", "TV", "Radio"] },
  satReceiver: { label: "SAT-Receiver", symbol: "REC", ports: ["SAT 1", "SAT 2"] },
  television: { label: "Fernseher", symbol: "TV", ports: ["Antenne / SAT"] },
};
export type TvKind = keyof typeof tvCatalog;
export function isTvKind(kind: string): kind is TvKind {
  return Object.hasOwn(tvCatalog, kind);
}
export function tvDefaults(kind: TvKind) {
  return {
    portNames: [...tvCatalog[kind].ports],
    satellite: "",
    lnbType: kind === "satDish" || kind === "lnb" ? "Quattro" : "",
    diameterMm: null as number | null,
    model: "",
  };
}
export function portName(
  node: { tv?: { portNames: string[] } | undefined; ports: number },
  port: number,
): string {
  return node.tv?.portNames[port - 1] || `Port ${port}`;
}
