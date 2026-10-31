import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (...parts) => readFileSync(join(root, ...parts), "utf8");
const manifest = JSON.parse(read("package.json"));
const shrinkwrap = JSON.parse(read("npm-shrinkwrap.json"));
assert.equal(shrinkwrap.version, manifest.version, "Shrinkwrap version must match the manifest");
assert.equal(shrinkwrap.packages[""].version, manifest.version, "Locked package version must match");
assert.equal(manifest.main, "index.html");
assert.equal(manifest.features.minAPI, "1.2.7");

const npmPath = process.env.npm_execpath;
assert(npmPath, "Run this check through npm run verify-package");
const [packed] = JSON.parse(execFileSync(process.execPath,
  [npmPath, "pack", "--dry-run", "--json"], { cwd: root, encoding: "utf8" }));
const files = new Set(packed.files.map((file) => file.path));
for (const file of ["README.md", "IMPLEMENTATION.md", "MANUAL_TESTS.md", "LICENSE",
  `dist/${manifest.main}`, `dist/${manifest.icon}`]) {
  assert(files.has(file), `Package is missing ${file}`);
}

for (const match of read("README.md").matchAll(/\]\((\.\/[^)#]+)(?:#[^)]*)?\)|\bsrc="(\.\/[^"]+)"/g)) {
  const file = (match[1] ?? match[2]).slice(2);
  assert(files.has(file), `Packaged README link is missing its target: ${file}`);
}

const html = read("dist", manifest.main);
assert(!/type=["']module["']|crossorigin/.test(html), "PPTB entry point must not require ES modules");
assert(html.indexOf("<script") > html.indexOf("<body>"), "IIFE script must run after the root exists");
const script = /<script[^>]*src="\.\/([^"]+)"/.exec(html)?.[1];
assert(script && files.has(`dist/${script}`), "Entry point script must be packaged");
const source = ts.createSourceFile(script, read("dist", ...script.split("/")), ts.ScriptTarget.Latest, true);
function checkEval(node) {
  assert(!(ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "eval"),
    "Built bundle contains an eval call");
  ts.forEachChild(node, checkEval);
}
checkEval(source);
console.log("Verified package versions, entry point, icon, README links, manual checklist and eval-free IIFE.");
