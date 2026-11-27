// DealHound's entry program (Node 22, standard library only). The site is
// this directory's app/ folder: plain static files a browser opens at
// app/index.html (ES modules, CSS, no build step), its 66 deals held in its
// own data file, so nothing it runs, styles or shows loads over the network;
// each deal links out to its store. The program hands the entry in: it copies
// app/ and screenshots/ from beside this file into the output directory and
// writes dossier.json there, the summary the judge reads (the screenshots,
// the first load's files and bytes, and the source), using the vendored
// make.fun library. Leave vendor/makefun-frontend.ts as it is: the scorer
// requires dossier.json to be byte for byte what its own copy writes.
//
// The output directory is handed to this program fresh by the grader, so the
// program only makes sure it exists — it never deletes it. Deleting the
// output directory itself fails when that directory is a mount point
// ("Device or resource busy"), which is how an earlier entry of ours failed
// its first round. Just create it if it is missing.
//
// Serve the site locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";

// The grader gives us a fresh output directory; only make sure it exists.
mkdirSync(out, { recursive: true });

const appDir = join(here, "app");
const shotsDir = join(here, "screenshots");
if (!existsSync(appDir)) throw new Error("app/ is missing beside main.ts");
if (!existsSync(shotsDir)) throw new Error("screenshots/ is missing beside main.ts");

cpSync(appDir, join(out, "app"), { recursive: true });
cpSync(shotsDir, join(out, "screenshots"), { recursive: true });

// Count what landed, so a silent partial copy cannot pass unnoticed.
const countFiles = (dir: string): number =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? countFiles(join(dir, e.name)) : 1),
    0,
  );
const appFiles = countFiles(join(out, "app"));
const shotFiles = readdirSync(join(out, "screenshots")).filter((f) =>
  statSync(join(out, "screenshots", f)).isFile(),
).length;
if (appFiles < 5) throw new Error(`only ${appFiles} files copied into app/`);
if (shotFiles === 0) throw new Error("no screenshots copied");

// Integrity check: every copied file must be byte-identical to its source,
// so a truncated or half-written copy is caught here instead of in grading.
const sha256 = (file: string): string =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
const checkTree = (srcDir: string, dstDir: string): void => {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    const dst = join(dstDir, entry.name);
    if (entry.isDirectory()) {
      checkTree(src, dst);
    } else if (sha256(src) !== sha256(dst)) {
      throw new Error(`copy mismatch: ${entry.name}`);
    }
  }
};
checkTree(appDir, join(out, "app"));
checkTree(shotsDir, join(out, "screenshots"));

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files and directories
// in app/ or 16 MiB of app files: app/ counts beside /output's own
// 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, "dossier.json"),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 16777216,
  }),
);
