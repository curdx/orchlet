import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.cwd();
const registryPath = "fixtures/capabilities/mvp-capability-status.json";
const validStatuses = new Set(["implemented", "alternative", "placeholder", "abandoned"]);
const validEvidenceKinds = new Set([
  "story",
  "requirement",
  "test",
  "fixture",
  "script",
  "decision",
  "doc",
]);
const requiredDomains = new Set([
  "workspace",
  "chat",
  "members",
  "terminal",
  "notifications",
  "settings",
  "skills",
  "data-diagnostics",
  "platform",
]);
const forbiddenReleaseResultKeys = new Set([
  "releaseReadiness",
  "releaseNotes",
  "smokeEvidence",
  "smokeResult",
  "smokeResults",
  "platformSmokeResults",
]);

export function validateCapabilityRegistry(registry, options = {}) {
  const validationRoot = options.root ?? root;
  const errors = [];

  if (!isPlainObject(registry)) {
    return ["registry must be an object"];
  }

  if (registry.schemaVersion !== 1) {
    errors.push("schemaVersion must be 1");
  }

  if (registry.source !== undefined) {
    validateEvidenceLike(registry.source, "source", validationRoot, errors);
  }

  if (!Array.isArray(registry.entries) || registry.entries.length === 0) {
    errors.push("entries must be a non-empty array");
    return errors;
  }

  const seenIds = new Set();
  const seenDomains = new Set();

  registry.entries.forEach((entry, index) => {
    const context = `entries[${index}]`;

    if (!isPlainObject(entry)) {
      errors.push(`${context} must be an object`);
      return;
    }

    for (const key of Object.keys(entry)) {
      if (forbiddenReleaseResultKeys.has(key)) {
        errors.push(`${context}.${key} belongs to Story 8.5 release evidence, not capability status`);
      }
    }

    assertNonEmptyString(entry.id, `${context}.id`, errors);
    if (typeof entry.id === "string") {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id)) {
        errors.push(`${context}.id must be kebab-case`);
      }
      if (seenIds.has(entry.id)) {
        errors.push(`duplicate capability id ${entry.id}`);
      }
      seenIds.add(entry.id);
    }

    assertNonEmptyString(entry.domain, `${context}.domain`, errors);
    if (typeof entry.domain === "string") {
      seenDomains.add(entry.domain);
      if (!requiredDomains.has(entry.domain)) {
        errors.push(`${context}.domain ${entry.domain} is not one of the required MVP domains`);
      }
    }

    assertNonEmptyString(entry.title, `${context}.title`, errors);
    assertNonEmptyString(entry.reason, `${context}.reason`, errors);

    if (!validStatuses.has(entry.status)) {
      errors.push(`${context}.status ${String(entry.status)} is not supported`);
    }

    if (entry.title?.includes(".golutra") && entry.status !== "alternative") {
      errors.push(`${context} is .golutra-specific and must be marked alternative`);
    }

    if (entry.status === "placeholder" || entry.status === "abandoned") {
      const hasUserFacingState = isNonEmptyString(entry.userFacingState);
      const hasDecisionReason = isNonEmptyString(entry.decisionReason);

      if (!hasUserFacingState && !hasDecisionReason) {
        errors.push(`${context}.${entry.status} requires userFacingState or decisionReason`);
      }
    }

    if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) {
      errors.push(`${context}.evidence must be a non-empty array`);
      return;
    }

    let hasExistingPathEvidence = false;

    entry.evidence.forEach((evidence, evidenceIndex) => {
      const evidenceContext = `${context}.evidence[${evidenceIndex}]`;
      const pathExists = validateEvidenceLike(evidence, evidenceContext, validationRoot, errors);
      hasExistingPathEvidence ||= pathExists;
    });

    if (
      (entry.status === "implemented" || entry.status === "alternative") &&
      !hasExistingPathEvidence
    ) {
      errors.push(`${context}.${entry.status} requires at least one existing path evidence`);
    }
  });

  for (const domain of requiredDomains) {
    if (!seenDomains.has(domain)) {
      errors.push(`missing required capability domain ${domain}`);
    }
  }

  validateParityChecklistCoverage(registry, validationRoot, errors);

  return errors;
}

function validateEvidenceLike(evidence, context, validationRoot, errors) {
  if (!isPlainObject(evidence)) {
    errors.push(`${context} must be an object`);
    return false;
  }

  if ("kind" in evidence && !validEvidenceKinds.has(evidence.kind)) {
    errors.push(`${context}.kind ${String(evidence.kind)} is not supported`);
  }

  assertNonEmptyString(evidence.reference, `${context}.reference`, errors);

  if (!("path" in evidence)) {
    return false;
  }

  assertNonEmptyString(evidence.path, `${context}.path`, errors);

  if (typeof evidence.path !== "string" || evidence.path.trim().length === 0) {
    return false;
  }

  const exists = existsSync(resolve(validationRoot, evidence.path));
  if (!exists) {
    errors.push(`${context}.path does not exist: ${evidence.path}`);
  }

  return exists;
}

function runValidatorGuardChecks(registry) {
  const cases = [
    {
      name: "missing parity checklist item",
      mutate(copy) {
        copy.entries.shift();
      },
      expected: "missing parity checklist item",
    },
    {
      name: "duplicate id",
      mutate(copy) {
        copy.entries[1].id = copy.entries[0].id;
      },
      expected: "duplicate capability id",
    },
    {
      name: "unknown status",
      mutate(copy) {
        copy.entries[0].status = "done";
      },
      expected: "status done is not supported",
    },
    {
      name: "missing reason",
      mutate(copy) {
        copy.entries[0].reason = "";
      },
      expected: "reason must be a non-empty string",
    },
    {
      name: "missing evidence",
      mutate(copy) {
        copy.entries[0].evidence = [];
      },
      expected: "evidence must be a non-empty array",
    },
    {
      name: "placeholder without user-facing wording",
      mutate(copy) {
        const entry = copy.entries.find((item) => item.status === "placeholder");
        delete entry.userFacingState;
        delete entry.decisionReason;
      },
      expected: "placeholder requires userFacingState or decisionReason",
    },
    {
      name: "implemented without existing path evidence",
      mutate(copy) {
        const entry = copy.entries.find((item) => item.status === "implemented");
        entry.evidence = [{ kind: "story", reference: "Story only reference" }];
      },
      expected: "implemented requires at least one existing path evidence",
    },
  ];

  for (const testCase of cases) {
    const copy = JSON.parse(JSON.stringify(registry));
    testCase.mutate(copy);
    const errors = validateCapabilityRegistry(copy);

    if (!errors.some((error) => error.includes(testCase.expected))) {
      throw new Error(
        `validator guard failed for ${testCase.name}; expected ${testCase.expected}, got ${errors.join("; ")}`,
      );
    }
  }
}

function validateParityChecklistCoverage(registry, validationRoot, errors) {
  const sourcePath = registry.source?.path;

  if (typeof sourcePath !== "string" || sourcePath.trim().length === 0) {
    errors.push("source.path must point to the parity checklist");
    return;
  }

  const absoluteSourcePath = resolve(validationRoot, sourcePath);

  if (!existsSync(absoluteSourcePath)) {
    return;
  }

  const checklist = readFileSync(absoluteSourcePath, "utf8");
  const requiredTitles = parseMarkdownTableCapabilityTitles(checklist);
  const entryTitles = new Set(registry.entries.map((entry) => entry.title));

  for (const title of requiredTitles) {
    if (!entryTitles.has(title)) {
      errors.push(`missing parity checklist item ${title}`);
    }
  }
}

function parseMarkdownTableCapabilityTitles(markdown) {
  const titles = [];

  for (const line of markdown.split(/\r?\n/)) {
    const match = line.match(/^\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/);

    if (!match) {
      continue;
    }

    const title = match[1].trim();

    if (!title || title === "项" || /^-+$/.test(title)) {
      continue;
    }

    titles.push(title);
  }

  return titles;
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function assertNonEmptyString(value, context, errors) {
  if (!isNonEmptyString(value)) {
    errors.push(`${context} must be a non-empty string`);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function main() {
  const registry = readJson(registryPath);
  const errors = validateCapabilityRegistry(registry);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }

  runValidatorGuardChecks(registry);
  console.log(`validated ${registry.entries.length} MVP capability status entries`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
