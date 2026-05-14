import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const readinessPath = "fixtures/release/mvp-release-readiness.json";
const requiredChecks = [
  "workspaceOpen",
  "memberInvite",
  "messageToTerminalDispatch",
  "terminalOutputBackwrite",
  "notificationJump",
  "restartRecovery",
];
const requiredPlatforms = ["windows", "macos", "linux"];
const requiredSmokeFlows = [
  "launch",
  "openWorkspace",
  "startShell",
  "sendMessage",
  "terminalOutput",
  "notificationJump",
  "restartRecovery",
];
const readinessStatuses = new Set(["pass", "manual", "blocked", "fail"]);
const smokeStatuses = new Set(["pass", "notRun", "blocked", "fail"]);
const requiredReleaseNoteHeadings = [
  "Feature Changes",
  "Data And Schema Changes",
  "Breaking Changes",
  "Security And Privacy Changes",
  "Known Issues And Blockers",
];

function main() {
  const readiness = readJson(readinessPath);
  const errors = validateReleaseReadiness(readiness);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  runValidatorGuardChecks(readiness);
  console.log(`validated MVP release readiness: ${readiness.overallStatus}`);
}

export function validateReleaseReadiness(readiness) {
  const errors = [];

  if (!isPlainObject(readiness)) {
    return ["release readiness must be an object"];
  }

  if (readiness.schemaVersion !== 1) {
    errors.push("release readiness schemaVersion must be 1");
  }

  if (!["ready", "blocked", "fail"].includes(readiness.overallStatus)) {
    errors.push("release readiness overallStatus must be ready, blocked or fail");
  }

  const capabilityRegistry = readLinkedJsonPath(readiness.capabilityRegistry, "capabilityRegistry", errors);
  const smokeResults = readLinkedJsonPath(readiness.smokeResults, "smokeResults", errors);
  const releaseNotes = readLinkedTextPath(readiness.releaseNotes, "releaseNotes", errors);

  if (capabilityRegistry && !Array.isArray(capabilityRegistry.entries)) {
    errors.push("capabilityRegistry must point to a capability registry with entries[]");
  }

  validateReadinessChecks(readiness, errors);

  if (smokeResults) {
    validateSmokeResults(smokeResults, errors);
  }

  if (releaseNotes) {
    validateReleaseNotes(releaseNotes, errors);
  }

  return errors;
}

function validateReadinessChecks(readiness, errors) {
  if (!Array.isArray(readiness.checks) || readiness.checks.length === 0) {
    errors.push("release readiness checks must be a non-empty array");
    return;
  }

  const seen = new Set();
  const checksById = new Map();

  readiness.checks.forEach((check, index) => {
    const context = `checks[${index}]`;

    if (!isPlainObject(check)) {
      errors.push(`${context} must be an object`);
      return;
    }

    assertNonEmptyString(check.id, `${context}.id`, errors);
    if (typeof check.id === "string") {
      if (seen.has(check.id)) {
        errors.push(`duplicate release readiness check id ${check.id}`);
      }
      seen.add(check.id);
      checksById.set(check.id, check);
    }

    assertNonEmptyString(check.domain, `${context}.domain`, errors);
    assertNonEmptyString(check.title, `${context}.title`, errors);
    assertNonEmptyString(check.releaseImpact, `${context}.releaseImpact`, errors);

    if (!readinessStatuses.has(check.status)) {
      errors.push(`${context}.status ${String(check.status)} is invalid`);
    }

    validateEvidenceList(check.evidence, `${context}.evidence`, check.status === "pass", errors);
    validateIssueArrays(check, context, errors);
  });

  for (const checkId of requiredChecks) {
    if (!checksById.has(checkId)) {
      errors.push(`missing release readiness check ${checkId}`);
    }
  }

  if (readiness.overallStatus === "ready") {
    const blockingChecks = readiness.checks.filter((check) => check.status !== "pass");
    if (blockingChecks.length > 0) {
      errors.push("overallStatus ready is invalid while checks are not all pass");
    }
  }
}

function validateSmokeResults(smokeResults, errors) {
  if (!isPlainObject(smokeResults)) {
    errors.push("smokeResults must be an object");
    return;
  }

  if (smokeResults.schemaVersion !== 1) {
    errors.push("smokeResults schemaVersion must be 1");
  }

  if (!["ready", "blocked", "fail"].includes(smokeResults.overallStatus)) {
    errors.push("smokeResults overallStatus must be ready, blocked or fail");
  }

  assertExistingPath(smokeResults.sourceMatrix, "smokeResults.sourceMatrix", errors);

  if (!Array.isArray(smokeResults.requiredFlows)) {
    errors.push("smokeResults.requiredFlows must be an array");
  } else {
    for (const flow of requiredSmokeFlows) {
      if (!smokeResults.requiredFlows.includes(flow)) {
        errors.push(`smokeResults.requiredFlows missing ${flow}`);
      }
    }
  }

  if (!Array.isArray(smokeResults.platforms)) {
    errors.push("smokeResults.platforms must be an array");
    return;
  }

  const platformsById = new Map();

  smokeResults.platforms.forEach((platform, platformIndex) => {
    const context = `smokeResults.platforms[${platformIndex}]`;

    if (!isPlainObject(platform)) {
      errors.push(`${context} must be an object`);
      return;
    }

    assertNonEmptyString(platform.platform, `${context}.platform`, errors);
    if (typeof platform.platform === "string") {
      if (platformsById.has(platform.platform)) {
        errors.push(`duplicate smoke platform ${platform.platform}`);
      }
      platformsById.set(platform.platform, platform);
    }

    assertNonEmptyString(platform.runner, `${context}.runner`, errors);
    if (!["ready", "blocked", "fail"].includes(platform.coverageStatus)) {
      errors.push(`${context}.coverageStatus must be ready, blocked or fail`);
    }

    validateIssueArrays(platform, context, errors);

    if (!Array.isArray(platform.flows)) {
      errors.push(`${context}.flows must be an array`);
      return;
    }

    const flowIds = new Set();

    platform.flows.forEach((flow, flowIndex) => {
      const flowContext = `${context}.flows[${flowIndex}]`;

      if (!isPlainObject(flow)) {
        errors.push(`${flowContext} must be an object`);
        return;
      }

      assertNonEmptyString(flow.id, `${flowContext}.id`, errors);
      if (typeof flow.id === "string") {
        if (flowIds.has(flow.id)) {
          errors.push(`duplicate smoke flow ${platform.platform}.${flow.id}`);
        }
        flowIds.add(flow.id);
      }

      if (!smokeStatuses.has(flow.status)) {
        errors.push(`${flowContext}.status ${String(flow.status)} is invalid`);
      }

      validateEvidenceList(flow.evidence, `${flowContext}.evidence`, flow.status === "pass", errors);
      validateIssueArrays(flow, flowContext, errors);
    });

    for (const flowId of requiredSmokeFlows) {
      if (!flowIds.has(flowId)) {
        errors.push(`${context}.flows missing ${flowId}`);
      }
    }
  });

  for (const platform of requiredPlatforms) {
    if (!platformsById.has(platform)) {
      errors.push(`missing smoke platform ${platform}`);
    }
  }

  if (smokeResults.overallStatus === "ready") {
    const nonPassing = smokeResults.platforms.flatMap((platform) =>
      platform.flows.filter((flow) => flow.status !== "pass"),
    );
    if (nonPassing.length > 0) {
      errors.push("smokeResults overallStatus ready is invalid while flows are not all pass");
    }
  }
}

function validateReleaseNotes(markdown, errors) {
  for (const heading of requiredReleaseNoteHeadings) {
    const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, "m");

    if (!pattern.test(markdown)) {
      errors.push(`release notes missing section ${heading}`);
    }
  }
}

function validateEvidenceList(evidence, context, requireExistingPath, errors) {
  if (!Array.isArray(evidence)) {
    errors.push(`${context} must be an array`);
    return;
  }

  if (requireExistingPath && evidence.length === 0) {
    errors.push(`${context} must include evidence for pass status`);
  }

  let hasExistingPath = false;

  evidence.forEach((item, index) => {
    const itemContext = `${context}[${index}]`;

    if (!isPlainObject(item)) {
      errors.push(`${itemContext} must be an object`);
      return;
    }

    assertNonEmptyString(item.reference, `${itemContext}.reference`, errors);

    if ("path" in item) {
      assertExistingPath(item.path, `${itemContext}.path`, errors);
      hasExistingPath ||= typeof item.path === "string" && existsSync(resolve(root, item.path));
    }
  });

  if (requireExistingPath && !hasExistingPath) {
    errors.push(`${context} must include at least one existing path for pass status`);
  }
}

function validateIssueArrays(entry, context, errors) {
  for (const key of ["knownIssues", "blockingFailures"]) {
    if (!Array.isArray(entry[key])) {
      errors.push(`${context}.${key} must be an array`);
      continue;
    }

    for (const [index, value] of entry[key].entries()) {
      assertNonEmptyString(value, `${context}.${key}[${index}]`, errors);
    }
  }

  const knownIssues = Array.isArray(entry.knownIssues) ? entry.knownIssues : [];
  const blockingFailures = Array.isArray(entry.blockingFailures) ? entry.blockingFailures : [];

  if (entry.status === "manual" || entry.status === "notRun") {
    if (knownIssues.length === 0 && blockingFailures.length === 0) {
      errors.push(`${context}.${entry.status} requires knownIssues or blockingFailures`);
    }
  }

  if (
    entry.status === "blocked" ||
    entry.status === "fail" ||
    entry.coverageStatus === "blocked" ||
    entry.coverageStatus === "fail"
  ) {
    if (blockingFailures.length === 0) {
      errors.push(`${context} blocked/fail status requires blockingFailures`);
    }
  }
}

function runValidatorGuardChecks(readiness) {
  const cases = [
    {
      name: "missing required check",
      mutate(copy) {
        copy.checks = copy.checks.filter((check) => check.id !== "restartRecovery");
      },
      expected: "missing release readiness check restartRecovery",
    },
    {
      name: "duplicate check id",
      mutate(copy) {
        copy.checks[1].id = copy.checks[0].id;
      },
      expected: "duplicate release readiness check id",
    },
    {
      name: "pass without path evidence",
      mutate(copy) {
        copy.checks[0].evidence = [{ kind: "story", reference: "Story without path" }];
      },
      expected: "must include at least one existing path for pass status",
    },
    {
      name: "smoke notRun without blocker",
      mutate(copy) {
        const smoke = readJson(copy.smokeResults);
        smoke.platforms[0].flows[0].knownIssues = [];
        smoke.platforms[0].flows[0].blockingFailures = [];
        copy.smokeResults = writeVirtualSmoke(smoke);
      },
      expected: "notRun requires knownIssues or blockingFailures",
    },
    {
      name: "missing release notes category",
      mutate(copy) {
        copy.releaseNotes = "README.md";
      },
      expected: "release notes missing section Feature Changes",
    },
  ];

  for (const testCase of cases) {
    const copy = JSON.parse(JSON.stringify(readiness));
    testCase.mutate(copy);
    const errors = validateReleaseReadiness(copy);

    if (!errors.some((error) => error.includes(testCase.expected))) {
      throw new Error(
        `validator guard failed for ${testCase.name}; expected ${testCase.expected}, got ${errors.join("; ")}`,
      );
    }
  }
}

function writeVirtualSmoke(smoke) {
  const virtualPath = "fixtures/release/__virtual-smoke-results.json";
  virtualFiles.set(resolve(root, virtualPath), JSON.stringify(smoke));
  return virtualPath;
}

const virtualFiles = new Map();

function readLinkedJsonPath(path, context, errors) {
  if (!assertExistingPath(path, context, errors)) {
    const virtual = virtualFiles.get(resolve(root, path));
    return virtual ? JSON.parse(virtual) : null;
  }

  return readJson(path);
}

function readLinkedTextPath(path, context, errors) {
  if (!assertExistingPath(path, context, errors)) {
    return null;
  }

  return readFileSync(resolve(root, path), "utf8");
}

function readJson(path) {
  const resolved = resolve(root, path);
  const virtual = virtualFiles.get(resolved);

  if (virtual) {
    return JSON.parse(virtual);
  }

  return JSON.parse(readFileSync(resolved, "utf8"));
}

function assertExistingPath(path, context, errors) {
  assertNonEmptyString(path, context, errors);

  if (typeof path !== "string" || path.trim().length === 0) {
    return false;
  }

  const exists = existsSync(resolve(root, path)) || virtualFiles.has(resolve(root, path));

  if (!exists) {
    errors.push(`${context} path does not exist: ${path}`);
  }

  return exists;
}

function assertNonEmptyString(value, context, errors) {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${context} must be a non-empty string`);
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

main();
