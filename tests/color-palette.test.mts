import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const globalsCss = readFileSync(path.join(projectRoot, "app", "globals.css"), "utf8");

const expectedTokens = {
  "--color-background": "#080b18",
  "--color-primary": "#8b5cf6",
  "--color-secondary": "#38bdf8",
  "--color-accent": "#67e8f9",
  "--color-highlight": "#e0f2fe",
  "--color-text": "#f8fafc",
  "--color-text-muted": "#94a3b8"
};

const legacyColors = [
  "#65a844",
  "#75bb50",
  "#4c8a37",
  "#8fd163",
  "#91cf68",
  "#9cda72",
  "#9ee16e",
  "#a5e878",
  "#a7e17d",
  "#b5f489"
];

const legacyColorUtilities = [
  "from-emerald-",
  "to-lime-",
  "from-sky-",
  "to-cyan-",
  "from-amber-",
  "to-yellow-",
  "from-red-",
  "to-orange-"
];

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(entryPath);
    }

    return /\.(?:css|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

test("the approved palette is exposed as canonical root tokens", () => {
  const rootBlock = globalsCss.match(/:root\s*\{([\s\S]*?)\}/)?.[1];
  assert.ok(rootBlock, "Expected app/globals.css to define a :root block");

  for (const [name, value] of Object.entries(expectedTokens)) {
    const declaration = new RegExp(`${name}\\s*:\\s*${value}\\s*;`, "i");
    assert.match(rootBlock, declaration, `Expected ${name} to equal ${value}`);
  }
});

test("active UI source does not use the retired brand palette", () => {
  const sourceFiles = ["app", "components", "lib"].flatMap((directory) =>
    collectSourceFiles(path.join(projectRoot, directory))
  );
  const violations = sourceFiles.flatMap((file) => {
    const source = readFileSync(file, "utf8").toLowerCase();
    return [...legacyColors, ...legacyColorUtilities]
      .filter((value) => source.includes(value))
      .map((value) => `${path.relative(projectRoot, file)}: ${value}`);
  });

  assert.deepEqual(violations, []);
});
