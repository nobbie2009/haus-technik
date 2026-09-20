import { mkdirSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const version = JSON.parse(readFileSync("package.json")).version;
const dir = "exports/release-stage";
// A fresh staging directory avoids stale build files in published artifacts.
const stage = `${dir}-${Date.now()}`;
mkdirSync(stage, { recursive: true });
cpSync("dist", `${stage}/dist`, { recursive: true });
mkdirSync(`${stage}/deploy`);
cpSync(".agents/skills/home-technik-proxmox-lxc/scripts/update.py", `${stage}/deploy/update.py`);
cpSync(".agents/skills/home-technik-proxmox-lxc/scripts/update_api.py", `${stage}/deploy/update_api.py`);
cpSync(
  ".agents/skills/home-technik-proxmox-lxc/assets/home-technik-update.service",
  `${stage}/deploy/home-technik-update.service`,
);
cpSync(
  ".agents/skills/home-technik-proxmox-lxc/assets/home-technik.conf",
  `${stage}/deploy/home-technik.conf`,
);
const archive = `exports/home-technik-${version}.tar.gz`;
execFileSync("tar", ["-czf", archive, "-C", stage, "dist", "deploy"]);
const hash = createHash("sha256").update(readFileSync(archive)).digest("hex");
writeFileSync(`${archive}.sha256`, `${hash}  home-technik-${version}.tar.gz\n`);
console.log(archive);
