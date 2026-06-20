// Bundles the runtime entry points into dist/ as standalone files.
// Everything they import (including commander) is inlined, so the shipped
// plugin runs with plain `node` and no node_modules on disk.
import { build } from "esbuild";
import { cpSync, rmSync } from "node:fs";

// Start clean so dist only ever holds the current bundles, not stale per-file output.
rmSync("dist", { recursive: true, force: true });

// The only files external callers invoke directly: the CLI (status line,
// on/off, watch, narrate, serve) and the two capture hooks.
const entryPoints = [
  "src/cli/index.ts",
  "src/capture/hook-emit.ts",
  "src/capture/intervene-check.ts",
];

await build({
  entryPoints,
  outdir: "dist",
  outbase: "src",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  // commander is CommonJS and calls require() for node builtins. The ESM output has no
  // require, so provide one built from import.meta.url. esbuild keeps the entry's shebang
  // on the first line, above this banner.
  banner: {
    js: "import { createRequire as __createRequire } from 'node:module';\nconst require = __createRequire(import.meta.url);",
  },
});

// The timeline server reads its page from dist/serve/public at runtime.
cpSync("src/serve/public", "dist/serve/public", { recursive: true });

console.log("Codey build complete: bundled", entryPoints.length, "entry points into dist/");
