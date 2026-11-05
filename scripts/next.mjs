import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextCli = require.resolve("next/dist/bin/next");
const environment = { ...process.env };

if (process.platform === "win32") {
  const compatibilityModule = new URL("./windows-fs-compat.mjs", import.meta.url);
  environment.NODE_OPTIONS = [
    environment.NODE_OPTIONS,
    '--import "' + compatibilityModule.href + '"',
  ].filter(Boolean).join(" ");
}

const child = spawn(process.execPath, [nextCli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: environment,
});

child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});

