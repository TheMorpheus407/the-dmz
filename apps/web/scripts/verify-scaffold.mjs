import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "src/app.html",
  "src/app.css",
  "src/hooks.server.ts",
  "src/hooks.client.ts",
  "src/routes/(public)/+layout.svelte",
  "src/routes/(public)/+page.svelte",
  "src/routes/(auth)/+layout.svelte",
  "src/routes/(auth)/login/+page.svelte",
  "src/routes/(game)/+layout.svelte",
  "src/routes/(game)/game/+page.svelte",
  "src/routes/(admin)/+layout.svelte",
  "src/routes/(admin)/admin/+page.svelte",
  "src/lib/game/state/events.ts",
  "src/lib/game/state/reducer.ts",
  "src/lib/game/state/selectors.ts",
  "src/lib/game/state/state-machine.ts",
];

const missing = requiredFiles.filter(
  (file) => !fs.existsSync(path.join(root, file)),
);
if (missing.length > 0) {
  throw new Error(`Missing required scaffold files: ${missing.join(", ")}`);
}

const appHtml = fs.readFileSync(path.join(root, "src/app.html"), "utf8");
if (!appHtml.includes('data-theme="green"')) {
  throw new Error('Expected app.html to include data-theme="green" on <html>.');
}

const eventsSource = fs.readFileSync(
  path.join(root, "src/lib/game/state/events.ts"),
  "utf8",
);
if (!/export\s+interface\s+GameEvent/.test(eventsSource)) {
  throw new Error("Expected GameEvent interface stub in events.ts");
}

const reducerSource = fs.readFileSync(
  path.join(root, "src/lib/game/state/reducer.ts"),
  "utf8",
);
if (!/export\s+interface\s+GameState/.test(reducerSource)) {
  throw new Error("Expected GameState interface stub in reducer.ts");
}

console.log("Scaffold verification passed.");
