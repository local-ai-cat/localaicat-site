import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneRoot = path.join(root, ".next", "standalone");
const standaloneNextDir = path.join(standaloneRoot, ".next");
const staticSource = path.join(root, ".next", "static");
const staticTarget = path.join(standaloneNextDir, "static");
const publicSource = path.join(root, "public");
const publicTarget = path.join(standaloneRoot, "public");

if (!existsSync(standaloneRoot)) {
  throw new Error("Standalone output is missing. Run `next build` first.");
}

mkdirSync(standaloneNextDir, { recursive: true });

if (existsSync(staticSource)) {
  cpSync(staticSource, staticTarget, { recursive: true });
}

if (existsSync(publicSource)) {
  cpSync(publicSource, publicTarget, { recursive: true });
}

console.log("Prepared standalone assets for Railway");
