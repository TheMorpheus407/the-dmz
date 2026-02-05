import fs from "node:fs";
import path from "node:path";

const source = path.resolve(".env.example");
const target = path.resolve(".env");

if (!fs.existsSync(source)) {
  console.error("Missing .env.example. Create one before running env:setup.");
  process.exit(1);
}

if (fs.existsSync(target)) {
  console.log(".env already exists. No changes made.");
  process.exit(0);
}

fs.copyFileSync(source, target);
console.log("Created .env from .env.example.");
