import { sharedVersion } from "@the-dmz/shared";

if (typeof sharedVersion !== "string" || sharedVersion.length === 0) {
  throw new Error("Expected sharedVersion to be a non-empty string");
}

if (!/^\d+\.\d+\.\d+$/.test(sharedVersion)) {
  throw new Error(`Expected semver sharedVersion, got: ${sharedVersion}`);
}

console.log("sharedVersion", sharedVersion);
