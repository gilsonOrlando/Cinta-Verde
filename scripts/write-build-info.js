import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { resolve } from "path";

function obtenerCommit() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "local";
  }
}

const info = {
  commit: obtenerCommit(),
  builtAt: new Date().toISOString(),
};

writeFileSync(
  resolve(process.cwd(), "public/build-info.json"),
  `${JSON.stringify(info, null, 2)}\n`,
  "utf8"
);

console.log(`[build-info] ${info.commit} @ ${info.builtAt}`);
