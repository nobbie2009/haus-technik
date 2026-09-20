import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const current = JSON.parse(readFileSync("package.json")).version;
const lock = JSON.parse(readFileSync("package-lock.json"));
const parse = (v) => {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(v)) throw Error("Ungültige Releaseversion");
  return v.split(".").map(Number);
};
parse(current);
if (lock.version !== current || lock.packages[""].version !== current)
  throw Error("Lockdatei-Version weicht ab");
const base = process.argv[2];
if (base && !/^0+$/.test(base)) {
  const old = JSON.parse(execFileSync("git", ["show", `${base}:package.json`], { encoding: "utf8" })).version;
  const a = parse(current),
    b = parse(old);
  const first = a.findIndex((n, i) => n !== b[i]);
  if (first < 0 || a[first] < b[first]) throw Error(`Version muss höher als ${old} sein; aktuell ${current}`);
}
console.log(`Releaseversion ${current} geprüft`);
