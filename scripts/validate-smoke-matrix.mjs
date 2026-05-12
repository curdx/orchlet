import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const matrix = JSON.parse(
  readFileSync(resolve(process.cwd(), "fixtures/smoke/desktop-smoke-matrix.json"), "utf8"),
);

const requiredPlatforms = ["windows", "macos", "linux"];
const requiredFlows = [
  "launch",
  "openWorkspace",
  "startShell",
  "sendMessage",
  "terminalOutput",
  "notificationJump",
  "restartRecovery",
];
const allowedStatuses = new Set(["pass", "fail", "manual"]);
const failures = [];

assert(matrix.schemaVersion === 1, "desktop smoke matrix schemaVersion must be 1");
assert(Array.isArray(matrix.platforms), "desktop smoke matrix must include platforms[]");

for (const platform of requiredPlatforms) {
  const platformEntry = matrix.platforms.find((entry) => entry.platform === platform);
  assert(platformEntry, `missing smoke platform ${platform}`);
  assert(typeof platformEntry.runner === "string", `${platform} runner must be a string`);
  assert(Array.isArray(platformEntry.flows), `${platform} flows must be an array`);

  for (const flow of requiredFlows) {
    const flowEntry = platformEntry.flows.find((entry) => entry.id === flow);
    assert(flowEntry, `${platform} missing smoke flow ${flow}`);
    assert(allowedStatuses.has(flowEntry.status), `${platform}.${flow} invalid status`);
    assert("evidence" in flowEntry, `${platform}.${flow} must include evidence`);
    assert(typeof flowEntry.notes === "string", `${platform}.${flow} must include notes`);

    if (flowEntry.status === "fail") {
      failures.push(`${platform}.${flow}`);
    }
  }
}

if (failures.length > 0) {
  throw new Error(`desktop smoke matrix contains failing flows: ${failures.join(", ")}`);
}

console.log(`validated desktop smoke matrix for ${requiredPlatforms.length} platforms`);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
