import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();

validateWorkspaceMetadata("fixtures/schema/valid-workspace/.orchlet/workspace.json");
validateWorkspaceMetadata("fixtures/data-integrity/valid-json-stores/workspace/.orchlet/workspace.json");
validateWorkspaceRegistry("fixtures/data-integrity/valid-json-stores/app-data/workspace-registry.json");
validateWorkspaceFallbacks("fixtures/data-integrity/valid-json-stores/app-data/workspace-fallbacks.json");
validateAppPreferences("fixtures/schema/settings-v1/app-preferences.json");
validateAppPreferences("fixtures/data-integrity/valid-json-stores/app-data/settings/preferences.json");
validateShortcutPreferences("fixtures/schema/settings-v1/shortcut-preferences.json");
validateShortcutPreferences("fixtures/data-integrity/valid-json-stores/app-data/settings/shortcuts.json");
validateChatTerminalOutputPreferences("fixtures/schema/settings-v1/chat-terminal-output.json");
validateChatTerminalOutputPreferences("fixtures/data-integrity/valid-json-stores/app-data/settings/chat-terminal-output.json");
validateNotificationPreferences("fixtures/schema/settings-v1/notification-preferences.json");
validateNotificationPreferences("fixtures/data-integrity/valid-json-stores/app-data/settings/notifications.json");
validateProfileSettings("fixtures/schema/settings-v1/profile-settings.json");
validateProfileSettings("fixtures/data-integrity/valid-json-stores/app-data/settings/profile.json");
validateSqliteScaffold("fixtures/schema/sqlite-workspace-v1/schema-manifest.json");
validateMemberProfiles("fixtures/schema/members-v1/member-profiles.json");
validateContactProfiles("fixtures/schema/contacts-v1/contact-profiles.json");
validateConversationList("fixtures/schema/conversations-v1/conversation-list.json");
validateMessageHistory("fixtures/schema/messages-v1/message-history.json");
validateTerminalTabs("fixtures/schema/terminal-tabs-v1/terminal-tabs.json");
validateSkillLibrary("fixtures/schema/skills-v1/skill-library.json");
validateSkillLibrary("fixtures/data-integrity/valid-json-stores/app-data/skills/skill-library.json");
validateWorkspaceSkillLinks("fixtures/schema/skills-v1/workspace-skill-links.json");
validateWorkspaceSkillLinks("fixtures/data-integrity/valid-json-stores/workspace/.orchlet/skills/skill-links.json");
validateRoadmapTasks("fixtures/schema/roadmap-v1/roadmap-tasks.json");
validateRoadmapTasks("fixtures/data-integrity/valid-json-stores/workspace/.orchlet/roadmap/tasks.json");
validateRoadmapGoals("fixtures/schema/roadmap-v1/roadmap-goals.json");
validateRoadmapGoals("fixtures/data-integrity/valid-json-stores/workspace/.orchlet/roadmap/goals.json");
validateDataIntegrityReport("fixtures/data-integrity/reports/passed-report.json");
validateDataIntegrityReport("fixtures/data-integrity/reports/failed-registry-report.json");
validateTerminalStreams("fixtures/terminal-streams");

console.log("validated schema, data-integrity and terminal stream fixtures");

function validateWorkspaceMetadata(path) {
  const metadata = readJson(path);
  assert(metadata.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assertValidUlid(metadata.projectId, `${path}.projectId`);
  assertNonEmptyString(metadata.name, `${path}.name`);
  assertPositiveTimestamp(metadata.createdAtMs, `${path}.createdAtMs`);
  assert(
    metadata.updatedAtMs >= metadata.createdAtMs,
    `${path}.updatedAtMs must be >= createdAtMs`,
  );
}

function validateWorkspaceRegistry(path) {
  const registry = readJson(path);
  assert(registry.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(Array.isArray(registry.entries), `${path}.entries must be an array`);
  for (const entry of registry.entries) {
    assertValidUlid(entry.projectId, `${path}.entries[].projectId`);
    assertNonEmptyString(entry.path, `${path}.entries[].path`);
    assertNonEmptyString(entry.name, `${path}.entries[].name`);
    assertPositiveTimestamp(entry.firstOpenedAtMs, `${path}.entries[].firstOpenedAtMs`);
    assert(
      entry.lastOpenedAtMs >= entry.firstOpenedAtMs,
      `${path}.entries[].lastOpenedAtMs must be >= firstOpenedAtMs`,
    );
  }
}

function validateWorkspaceFallbacks(path) {
  const fallbacks = readJson(path);
  assert(fallbacks.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(Array.isArray(fallbacks.entries), `${path}.entries must be an array`);
  for (const entry of fallbacks.entries) {
    assertNonEmptyString(entry.path, `${path}.entries[].path`);
    assertValidUlid(entry.projectId, `${path}.entries[].projectId`);
    assertNonEmptyString(entry.name, `${path}.entries[].name`);
    assertPositiveTimestamp(entry.createdAtMs, `${path}.entries[].createdAtMs`);
    assert(
      entry.updatedAtMs >= entry.createdAtMs,
      `${path}.entries[].updatedAtMs must be >= createdAtMs`,
    );
  }
}

function validateProfileSettings(path) {
  const profile = readJson(path);
  assert(profile.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assertNonEmptyString(profile.displayName, `${path}.displayName`);
  assert(profile.displayName.trim() === profile.displayName, `${path}.displayName must be normalized`);
  assert(
    [
      "UTC",
      "Asia/Shanghai",
      "Asia/Tokyo",
      "Europe/London",
      "Europe/Berlin",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "Australia/Sydney",
    ].includes(profile.timezone),
    `${path}.timezone must be supported`,
  );
  assert(
    ["online", "offline", "working", "doNotDisturb"].includes(profile.status),
    `${path}.status invalid`,
  );
  if (profile.statusMessage !== null) {
    assertNonEmptyString(profile.statusMessage, `${path}.statusMessage`);
    assert(profile.statusMessage.length <= 160, `${path}.statusMessage too long`);
  }
  assertPositiveTimestamp(profile.createdAtMs, `${path}.createdAtMs`);
  assert(profile.updatedAtMs >= profile.createdAtMs, `${path}.updatedAtMs must be >= createdAtMs`);
  validateProfileAvatar(profile.avatar, `${path}.avatar`);
}

function validateAppPreferences(path) {
  const preferences = readJson(path);
  assert(preferences.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(["system", "light", "dark"].includes(preferences.theme), `${path}.theme invalid`);
  assert(["zh-CN", "en-US"].includes(preferences.language), `${path}.language invalid`);
  assertPositiveTimestamp(preferences.createdAtMs, `${path}.createdAtMs`);
  assert(
    preferences.updatedAtMs >= preferences.createdAtMs,
    `${path}.updatedAtMs must be >= createdAtMs`,
  );
}

function validateNotificationPreferences(path) {
  const preferences = readJson(path);
  assert(preferences.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(
    typeof preferences.desktopNotificationsEnabled === "boolean",
    `${path}.desktopNotificationsEnabled must be boolean`,
  );
  assert(typeof preferences.soundEnabled === "boolean", `${path}.soundEnabled must be boolean`);
  assert(typeof preferences.mentionsOnly === "boolean", `${path}.mentionsOnly must be boolean`);
  assert(
    typeof preferences.messagePreviewEnabled === "boolean",
    `${path}.messagePreviewEnabled must be boolean`,
  );
  assert(typeof preferences.dndEnabled === "boolean", `${path}.dndEnabled must be boolean`);
  assertDndMinutes(preferences.dndStartMinutes, `${path}.dndStartMinutes`);
  assertDndMinutes(preferences.dndEndMinutes, `${path}.dndEndMinutes`);
  if (preferences.dndEnabled) {
    assert(
      preferences.dndStartMinutes !== preferences.dndEndMinutes,
      `${path}.dndStartMinutes and dndEndMinutes must differ when DND is enabled`,
    );
  }
  assert(
    typeof preferences.permission === "object" && preferences.permission !== null,
    `${path}.permission must be an object`,
  );
  assert(
    ["granted", "denied", "prompt", "unavailable"].includes(preferences.permission.state),
    `${path}.permission.state invalid`,
  );
  assertNonEmptyString(preferences.permission.message, `${path}.permission.message`);
  assertNonEmptyString(preferences.permission.userAction, `${path}.permission.userAction`);
  assertPositiveTimestamp(preferences.createdAtMs, `${path}.createdAtMs`);
  assert(
    preferences.updatedAtMs >= preferences.createdAtMs,
    `${path}.updatedAtMs must be >= createdAtMs`,
  );
}

function validateShortcutPreferences(path) {
  const preferences = readJson(path);
  const supportedActions = [
    "chat.send",
    "chat.newline",
    "chat.emoji.close",
    "mention.insert",
    "conversation.focus",
    "terminal.find.next",
    "terminal.find.previous",
    "terminal.find.close",
    "settings.save",
    "notification.viewAll",
    "notification.ignoreAll",
    "notification.openTerminal",
    "app.globalOpenSettings",
  ];

  assert(preferences.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(["default", "vscode", "slack"].includes(preferences.profile), `${path}.profile invalid`);
  assert(typeof preferences.shortcutsEnabled === "boolean", `${path}.shortcutsEnabled must be boolean`);
  assert(typeof preferences.shortcutHintsEnabled === "boolean", `${path}.shortcutHintsEnabled must be boolean`);
  assert(Array.isArray(preferences.disabledActionIds), `${path}.disabledActionIds must be an array`);
  for (const actionId of preferences.disabledActionIds) {
    assert(supportedActions.includes(actionId), `${path}.disabledActionIds contains unknown action`);
  }
  assert(Array.isArray(preferences.bindings), `${path}.bindings must be an array`);
  assert(preferences.bindings.length === supportedActions.length, `${path}.bindings length invalid`);
  const seen = new Set();
  for (const binding of preferences.bindings) {
    assert(supportedActions.includes(binding.actionId), `${path}.bindings[].actionId invalid`);
    assert(!seen.has(binding.actionId), `${path}.bindings duplicate actionId`);
    seen.add(binding.actionId);
    assertNonEmptyString(binding.label, `${path}.bindings[].label`);
    assert(Array.isArray(binding.keys) && binding.keys.length > 0, `${path}.bindings[].keys invalid`);
    binding.keys.forEach((key) => assertNonEmptyString(key, `${path}.bindings[].keys[]`));
    assert(typeof binding.enabled === "boolean", `${path}.bindings[].enabled must be boolean`);
    assert(typeof binding.available === "boolean", `${path}.bindings[].available must be boolean`);
    if (!binding.available) {
      assertNonEmptyString(binding.unavailableReason, `${path}.bindings[].unavailableReason`);
      assert(binding.enabled === false, `${path}.bindings unavailable entries must not be enabled`);
    }
  }
  assertPositiveTimestamp(preferences.createdAtMs, `${path}.createdAtMs`);
  assert(preferences.updatedAtMs >= preferences.createdAtMs, `${path}.updatedAtMs must be >= createdAtMs`);
}

function validateChatTerminalOutputPreferences(path) {
  const preferences = readJson(path);
  assert(preferences.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(
    ["stream", "finalOnly"].includes(preferences.displayMode),
    `${path}.displayMode invalid`,
  );
  assertPositiveTimestamp(preferences.createdAtMs, `${path}.createdAtMs`);
  assert(
    preferences.updatedAtMs >= preferences.createdAtMs,
    `${path}.updatedAtMs must be >= createdAtMs`,
  );
}

function validateProfileAvatar(avatar, context) {
  assert(typeof avatar === "object" && avatar !== null, `${context} must be an object`);
  assert(["placeholder", "preset", "uploaded"].includes(avatar.kind), `${context}.kind invalid`);
  assertPositiveTimestamp(avatar.updatedAtMs, `${context}.updatedAtMs`);

  if (avatar.kind === "placeholder") {
    assert(avatar.presetId === null, `${context}.presetId must be null for placeholder`);
    assert(avatar.uploadId === null, `${context}.uploadId must be null for placeholder`);
    assert(avatar.libraryRelativePath === null, `${context}.libraryRelativePath must be null for placeholder`);
    return;
  }

  if (avatar.kind === "preset") {
    assert(["orchid", "lagoon", "sunrise", "forest"].includes(avatar.presetId), `${context}.presetId invalid`);
    assert(avatar.uploadId === null, `${context}.uploadId must be null for preset`);
    assert(avatar.libraryRelativePath === null, `${context}.libraryRelativePath must be null for preset`);
    return;
  }

  assertNonEmptyString(avatar.uploadId, `${context}.uploadId`);
  assertNonEmptyString(avatar.sourceFileName, `${context}.sourceFileName`);
  assert(["image/png", "image/jpeg", "image/webp", "image/gif"].includes(avatar.contentType), `${context}.contentType invalid`);
  assert(Number.isInteger(avatar.sizeBytes) && avatar.sizeBytes > 0, `${context}.sizeBytes invalid`);
  assert(avatar.sizeBytes <= 2 * 1024 * 1024, `${context}.sizeBytes too large`);
  assertNonEmptyString(avatar.libraryRelativePath, `${context}.libraryRelativePath`);
  assert(
    avatar.libraryRelativePath.startsWith("avatars/uploads/") &&
      !avatar.libraryRelativePath.includes(".."),
    `${context}.libraryRelativePath must stay under avatar uploads`,
  );
}

function validateSqliteScaffold(path) {
  const schema = readJson(path);
  assert(schema.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(schema.status === "implemented", `${path}.status must be implemented`);
  assert(schema.databaseScope === "workspace", `${path}.databaseScope must be workspace`);
  assert(
    Array.isArray(schema.tables) &&
      schema.tables.includes("schema_migrations") &&
      schema.tables.includes("members") &&
      schema.tables.includes("conversations") &&
      schema.tables.includes("conversation_members") &&
      schema.tables.includes("messages") &&
      schema.tables.includes("message_mentions") &&
      schema.tables.includes("conversation_read_positions") &&
      schema.tables.includes("terminal_tabs") &&
      schema.tables.includes("diagnostics_runs") &&
      schema.tables.includes("diagnostic_events"),
    `${path} must include current member, conversation, message, terminal and diagnostics schema tables`,
  );
  assert(schema.tables.length === 10, `${path} must include only current workspace tables`);
  assert(!schema.tables.includes("terminal_sessions"), `${path} must not include future terminal tables`);
  assert(Array.isArray(schema.migrationFiles), `${path}.migrationFiles must be an array`);
  assert(
    schema.migrationFiles.includes("202605112300__members.sql"),
    `${path} must include the member migration file`,
  );
  assert(
    schema.migrationFiles.includes("202605120930__member_permissions.sql"),
    `${path} must include the member permissions migration file`,
  );
  assert(
    schema.migrationFiles.includes("202605121210__private_conversations.sql"),
    `${path} must include the private conversations migration file`,
  );
  assert(
    schema.migrationFiles.includes("202605121300__conversation_list_groups.sql"),
    `${path} must include the conversation list and group membership migration file`,
  );
  assert(
    schema.migrationFiles.includes("202605121430__messages_read_positions.sql"),
    `${path} must include the messages and read positions migration file`,
  );
  assert(
    schema.migrationFiles.includes("202605121600__conversation_management.sql"),
    `${path} must include the conversation management migration file`,
  );
  assert(
    schema.migrationFiles.includes("202605121700__message_mentions.sql"),
    `${path} must include the message mentions migration file`,
  );
  assert(
    schema.migrationFiles.includes("202605121900__terminal_tabs.sql"),
    `${path} must include the terminal tabs migration file`,
  );
  assert(
    schema.migrationFiles.includes("202605122100__diagnostics_runs.sql"),
    `${path} must include the diagnostics migration file`,
  );
  assert(
    Array.isArray(schema.ownedByFutureStories) && schema.ownedByFutureStories.includes("notification"),
    `${path} must identify future story ownership`,
  );
}

function validateTerminalTabs(path) {
  const fixture = readJson(path);
  assert(fixture.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assertValidUlid(fixture.workspaceId, `${path}.workspaceId`);
  assert(Array.isArray(fixture.tabs) && fixture.tabs.length >= 2, `${path}.tabs must include open and closed tabs`);

  const tabIds = new Set();
  for (const tab of fixture.tabs) {
    assert(tab.schemaVersion === 1, `${path}.tabs[].schemaVersion must be 1`);
    assertValidUlid(tab.tabId, `${path}.tabs[].tabId`);
    assert(!tabIds.has(tab.tabId), `${path}.tabs[].tabId must be unique`);
    tabIds.add(tab.tabId);
    assert(tab.workspaceId === fixture.workspaceId, `${path}.tabs[].workspaceId must match`);
    assertValidUlid(tab.terminalSessionId, `${path}.tabs[].terminalSessionId`);
    if (tab.memberId !== null) assertValidUlid(tab.memberId, `${path}.tabs[].memberId`);
    assertNonEmptyString(tab.label, `${path}.tabs[].label`);
    assertNonEmptyString(tab.shell, `${path}.tabs[].shell`);
    assert(["open", "closed"].includes(tab.status), `${path}.tabs[].status invalid`);
    assert(typeof tab.isPinned === "boolean", `${path}.tabs[].isPinned must be boolean`);
    assert(Number.isInteger(tab.sortIndex) && tab.sortIndex >= 0, `${path}.tabs[].sortIndex must be non-negative`);
    assertPositiveTimestamp(tab.createdAtMs, `${path}.tabs[].createdAtMs`);
    assert(tab.updatedAtMs >= tab.createdAtMs, `${path}.tabs[].updatedAtMs must be >= createdAtMs`);
    if (tab.status === "closed") {
      assertPositiveTimestamp(tab.closedAtMs, `${path}.tabs[].closedAtMs`);
    } else {
      assert(tab.closedAtMs === null, `${path}.open tabs must not have closedAtMs`);
    }
  }

  assert(fixture.tabs.some((tab) => tab.isPinned), `${path} must include a pinned tab`);
  assert(fixture.tabs.some((tab) => tab.status === "closed"), `${path} must include a closed tab`);
  assert(Array.isArray(fixture.excludedPayloads), `${path}.excludedPayloads must be an array`);
  assert(
    fixture.excludedPayloads.some((item) => item.includes("output")),
    `${path} must document excluded terminal output`,
  );
}

function validateSkillLibrary(path) {
  const fixture = readJson(path);
  assert(fixture.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(Array.isArray(fixture.skills), `${path}.skills must be an array`);

  const skillIds = new Set();
  const sourcePaths = new Set();
  for (const skill of fixture.skills) {
    assert(skill.schemaVersion === 1, `${path}.skills[].schemaVersion must be 1`);
    assertValidUlid(skill.skillId, `${path}.skills[].skillId`);
    assert(!skillIds.has(skill.skillId), `${path}.skills[].skillId must be unique`);
    skillIds.add(skill.skillId);
    assertNonEmptyString(skill.name, `${path}.skills[].name`);
    if (skill.description !== null) assertNonEmptyString(skill.description, `${path}.skills[].description`);
    assert(skill.source === "localFolder", `${path}.skills[].source must be localFolder`);
    assertNonEmptyString(skill.sourcePath, `${path}.skills[].sourcePath`);
    assert(!sourcePaths.has(skill.sourcePath), `${path}.skills[].sourcePath must be unique`);
    sourcePaths.add(skill.sourcePath);
    assert(skill.manifestPath.endsWith("/SKILL.md"), `${path}.skills[].manifestPath must end with SKILL.md`);
    assertPositiveTimestamp(skill.importedAtMs, `${path}.skills[].importedAtMs`);
    assert(skill.updatedAtMs >= skill.importedAtMs, `${path}.skills[].updatedAtMs must be >= importedAtMs`);
    assert(
      skill.lastValidatedAtMs >= skill.importedAtMs,
      `${path}.skills[].lastValidatedAtMs must be >= importedAtMs`,
    );
  }

  if (fixture.excludedPayloads) {
    assert(
      fixture.excludedPayloads.some((item) => item.includes("contents")),
      `${path}.excludedPayloads must document skill content exclusion`,
    );
  }
}

function validateWorkspaceSkillLinks(path) {
  const fixture = readJson(path);
  assert(fixture.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(Array.isArray(fixture.skills), `${path}.skills must be an array`);

  const skillIds = new Set();
  const linkPaths = new Set();
  for (const skill of fixture.skills) {
    assert(skill.schemaVersion === 1, `${path}.skills[].schemaVersion must be 1`);
    assertValidUlid(skill.skillId, `${path}.skills[].skillId`);
    assert(!skillIds.has(skill.skillId), `${path}.skills[].skillId must be unique`);
    skillIds.add(skill.skillId);
    assertNonEmptyString(skill.name, `${path}.skills[].name`);
    if (skill.description !== null) assertNonEmptyString(skill.description, `${path}.skills[].description`);
    assertNonEmptyString(skill.sourcePath, `${path}.skills[].sourcePath`);
    assert(skill.manifestPath.endsWith("/SKILL.md"), `${path}.skills[].manifestPath must end with SKILL.md`);
    assertNonEmptyString(skill.linkPath, `${path}.skills[].linkPath`);
    assert(!linkPaths.has(skill.linkPath), `${path}.skills[].linkPath must be unique`);
    linkPaths.add(skill.linkPath);
    assert(["symlink", "manifest"].includes(skill.linkMode), `${path}.skills[].linkMode is invalid`);
    if (skill.linkMode === "manifest") {
      assertNonEmptyString(skill.unavailableReason, `${path}.skills[].unavailableReason`);
    }
    assertPositiveTimestamp(skill.linkedAtMs, `${path}.skills[].linkedAtMs`);
    assert(skill.updatedAtMs >= skill.linkedAtMs, `${path}.skills[].updatedAtMs must be >= linkedAtMs`);
  }

  if (fixture.excludedPayloads) {
    assert(
      fixture.excludedPayloads.some((item) => item.includes("contents")),
      `${path}.excludedPayloads must document skill content exclusion`,
    );
  }
}

function validateRoadmapTasks(path) {
  const fixture = readJson(path);
  assert(fixture.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(Array.isArray(fixture.tasks), `${path}.tasks must be an array`);

  const taskIds = new Set();
  const sortOrders = new Set();
  let previousSortOrder = -1;

  for (const task of fixture.tasks) {
    assert(task.schemaVersion === 1, `${path}.tasks[].schemaVersion must be 1`);
    assertValidUlid(task.taskId, `${path}.tasks[].taskId`);
    assert(!taskIds.has(task.taskId), `${path}.tasks[].taskId must be unique`);
    taskIds.add(task.taskId);
    assertNonEmptyString(task.title, `${path}.tasks[].title`);
    if (task.detail !== null) assertNonEmptyString(task.detail, `${path}.tasks[].detail`);
    assert(["pending", "inProgress", "done"].includes(task.status), `${path}.tasks[].status invalid`);
    assert(
      Number.isInteger(task.sortOrder) && task.sortOrder >= 0,
      `${path}.tasks[].sortOrder must be non-negative`,
    );
    assert(!sortOrders.has(task.sortOrder), `${path}.tasks[].sortOrder must be unique`);
    assert(task.sortOrder > previousSortOrder, `${path}.tasks must be sorted by sortOrder`);
    sortOrders.add(task.sortOrder);
    previousSortOrder = task.sortOrder;
    assertPositiveTimestamp(task.createdAtMs, `${path}.tasks[].createdAtMs`);
    assert(task.updatedAtMs >= task.createdAtMs, `${path}.tasks[].updatedAtMs must be >= createdAtMs`);
  }

  assertNonEmptyString(fixture.orderingRule, `${path}.orderingRule`);
  assert(
    Array.isArray(fixture.excludedFutureFields) &&
      fixture.excludedFutureFields.some((item) => item.includes("dependencies") || item.includes("remote sync")),
    `${path}.excludedFutureFields must document future roadmap task exclusions`,
  );
}

function validateRoadmapGoals(path) {
  const fixture = readJson(path);
  assert(fixture.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(Array.isArray(fixture.goals), `${path}.goals must be an array`);

  const goalIds = new Set();
  const sortOrders = new Set();
  let previousSortOrder = -1;

  for (const goal of fixture.goals) {
    assert(goal.schemaVersion === 1, `${path}.goals[].schemaVersion must be 1`);
    assertValidUlid(goal.goalId, `${path}.goals[].goalId`);
    assert(!goalIds.has(goal.goalId), `${path}.goals[].goalId must be unique`);
    goalIds.add(goal.goalId);
    assertNonEmptyString(goal.title, `${path}.goals[].title`);
    assert(Array.isArray(goal.taskIds), `${path}.goals[].taskIds must be an array`);

    const taskIds = new Set();
    for (const taskId of goal.taskIds) {
      assertValidUlid(taskId, `${path}.goals[].taskIds[]`);
      assert(!taskIds.has(taskId), `${path}.goals[].taskIds[] must be unique per goal`);
      taskIds.add(taskId);
    }

    assert(
      Number.isInteger(goal.sortOrder) && goal.sortOrder >= 0,
      `${path}.goals[].sortOrder must be non-negative`,
    );
    assert(!sortOrders.has(goal.sortOrder), `${path}.goals[].sortOrder must be unique`);
    assert(goal.sortOrder > previousSortOrder, `${path}.goals must be sorted by sortOrder`);
    sortOrders.add(goal.sortOrder);
    previousSortOrder = goal.sortOrder;
    assertPositiveTimestamp(goal.createdAtMs, `${path}.goals[].createdAtMs`);
    assert(goal.updatedAtMs >= goal.createdAtMs, `${path}.goals[].updatedAtMs must be >= createdAtMs`);
  }

  assertNonEmptyString(fixture.orderingRule, `${path}.orderingRule`);
  assert(
    typeof fixture.progressRule === "string" && fixture.progressRule.includes("derived"),
    `${path}.progressRule must document derived progress`,
  );
}

function validateMemberProfiles(path) {
  const fixture = readJson(path);
  assert(fixture.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assertValidUlid(fixture.workspaceId, `${path}.workspaceId`);
  assert(Array.isArray(fixture.members) && fixture.members.length >= 2, `${path}.members must include owner and invitee`);

  const ownerCount = fixture.members.filter((member) => member.role === "owner").length;
  assert(ownerCount === 1, `${path} must include exactly one owner`);

  for (const member of fixture.members) {
    assertValidUlid(member.memberId, `${path}.members[].memberId`);
    assert(member.workspaceId === fixture.workspaceId, `${path}.members[].workspaceId must match fixture workspaceId`);
    assert(["owner", "admin", "assistant", "member"].includes(member.role), `${path} invalid member role`);
    assertNonEmptyString(member.displayName, `${path}.members[].displayName`);
    assert(Number.isInteger(member.instanceIndex) && member.instanceIndex >= 1, `${path}.members[].instanceIndex must be positive`);
    assertNonEmptyString(member.instanceLabel, `${path}.members[].instanceLabel`);
    assert(["online", "offline", "working", "doNotDisturb"].includes(member.status), `${path} invalid member status`);
    assert(member.runtime && typeof member.runtime === "object", `${path}.members[].runtime is required`);
    assert(
      ["none", "builtInAiCli", "customCli", "shell"].includes(member.runtime.kind),
      `${path} invalid runtime kind`,
    );
    if (member.runtime.kind !== "none") {
      assertNonEmptyString(member.runtime.label, `${path}.members[].runtime.label`);
      assertNonEmptyString(member.runtime.command, `${path}.members[].runtime.command`);
    }
    assert(typeof member.permissions?.canMention === "boolean", `${path}.members[].permissions.canMention must be boolean`);
    assert(typeof member.permissions?.canRemove === "boolean", `${path}.members[].permissions.canRemove must be boolean`);
    assert(typeof member.isolation?.sandboxed === "boolean", `${path}.members[].isolation.sandboxed must be boolean`);
    assert(typeof member.isolation?.unlimitedAccess === "boolean", `${path}.members[].isolation.unlimitedAccess must be boolean`);
    assertPositiveTimestamp(member.createdAtMs, `${path}.members[].createdAtMs`);
    assert(member.updatedAtMs >= member.createdAtMs, `${path}.members[].updatedAtMs must be >= createdAtMs`);
  }
}

function validateContactProfiles(path) {
  const fixture = readJson(path);
  assert(fixture.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assert(fixture.databaseScope === "global", `${path}.databaseScope must be global`);
  assert(fixture.databaseFile === "global/orchlet.sqlite", `${path}.databaseFile must be global/orchlet.sqlite`);
  assert(Array.isArray(fixture.contacts) && fixture.contacts.length >= 1, `${path}.contacts must include contacts`);

  for (const contact of fixture.contacts) {
    assertValidUlid(contact.contactId, `${path}.contacts[].contactId`);
    assertNonEmptyString(contact.displayName, `${path}.contacts[].displayName`);
    assert(["contact", "administrator"].includes(contact.contactKind), `${path} invalid contactKind`);
    assert(contact.inviteSource === "adminContactInvite", `${path} invalid inviteSource`);
    if (contact.notes !== null) assertNonEmptyString(contact.notes, `${path}.contacts[].notes`);
    if (contact.sourceLabel !== null) assertNonEmptyString(contact.sourceLabel, `${path}.contacts[].sourceLabel`);
    assertPositiveTimestamp(contact.createdAtMs, `${path}.contacts[].createdAtMs`);
    assert(contact.updatedAtMs >= contact.createdAtMs, `${path}.contacts[].updatedAtMs must be >= createdAtMs`);
  }
}

function validateConversationList(path) {
  const fixture = readJson(path);
  assert(fixture.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assertValidUlid(fixture.workspaceId, `${path}.workspaceId`);
  assert(Array.isArray(fixture.conversations) && fixture.conversations.length >= 3, `${path}.conversations must cover channel, group and private entries`);

  const defaultChannels = fixture.conversations.filter(
    (conversation) => conversation.kind === "channel" && conversation.isDefault,
  );
  assert(defaultChannels.length === 1, `${path} must include exactly one default channel`);

  for (const conversation of fixture.conversations) {
    assertValidUlid(conversation.conversationId, `${path}.conversations[].conversationId`);
    assert(conversation.workspaceId === fixture.workspaceId, `${path}.conversations[].workspaceId must match`);
    assert(["channel", "group", "private"].includes(conversation.kind), `${path} invalid conversation kind`);
    assertNonEmptyString(conversation.title, `${path}.conversations[].title`);
    assert(typeof conversation.isDefault === "boolean", `${path}.conversations[].isDefault must be boolean`);
    assert(typeof conversation.isPinned === "boolean", `${path}.conversations[].isPinned must be boolean`);
    assert(typeof conversation.isMuted === "boolean", `${path}.conversations[].isMuted must be boolean`);
    assert(Number.isInteger(conversation.unreadCount) && conversation.unreadCount >= 0, `${path}.conversations[].unreadCount must be non-negative`);
    if (conversation.lastMessagePreview !== null) assertNonEmptyString(conversation.lastMessagePreview, `${path}.conversations[].lastMessagePreview`);
    if (conversation.kind === "private") {
      assert(["member", "contact"].includes(conversation.participantKind), `${path}.private participantKind is required`);
      assertValidUlid(conversation.participantId, `${path}.private participantId`);
    } else {
      assert(conversation.participantKind === null, `${path}.nonPrivate participantKind must be null`);
      assert(conversation.participantId === null, `${path}.nonPrivate participantId must be null`);
    }
    assert(Array.isArray(conversation.members), `${path}.conversations[].members must be an array`);
    assertPositiveTimestamp(conversation.createdAtMs, `${path}.conversations[].createdAtMs`);
    assert(conversation.updatedAtMs >= conversation.createdAtMs, `${path}.conversations[].updatedAtMs must be >= createdAtMs`);
    assert(conversation.lastActivityAtMs >= conversation.createdAtMs, `${path}.conversations[].lastActivityAtMs must be >= createdAtMs`);
  }

  assert(Array.isArray(fixture.conversationMembers) && fixture.conversationMembers.length >= 1, `${path}.conversationMembers must include group membership`);
  for (const membership of fixture.conversationMembers) {
    assertValidUlid(membership.conversationId, `${path}.conversationMembers[].conversationId`);
    assert(membership.workspaceId === fixture.workspaceId, `${path}.conversationMembers[].workspaceId must match`);
    assertValidUlid(membership.memberId, `${path}.conversationMembers[].memberId`);
    assertPositiveTimestamp(membership.createdAtMs, `${path}.conversationMembers[].createdAtMs`);
  }
}

function validateMessageHistory(path) {
  const fixture = readJson(path);
  assert(fixture.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assertValidUlid(fixture.workspaceId, `${path}.workspaceId`);
  assertValidUlid(fixture.conversationId, `${path}.conversationId`);
  assert(Array.isArray(fixture.messages) && fixture.messages.length >= 2, `${path}.messages must include paged history`);

  for (const message of fixture.messages) {
    assertValidUlid(message.messageId, `${path}.messages[].messageId`);
    assert(message.workspaceId === fixture.workspaceId, `${path}.messages[].workspaceId must match`);
    assert(message.conversationId === fixture.conversationId, `${path}.messages[].conversationId must match`);
    assertValidUlid(message.authorMemberId, `${path}.messages[].authorMemberId`);
    assertNonEmptyString(message.body, `${path}.messages[].body`);
    assert(Array.isArray(message.mentionedMemberIds), `${path}.messages[].mentionedMemberIds must be an array`);
    for (const memberId of message.mentionedMemberIds) {
      assertValidUlid(memberId, `${path}.messages[].mentionedMemberIds[]`);
    }
    assert(["sending", "sent", "failed"].includes(message.status), `${path}.messages[].status invalid`);
    assertPositiveTimestamp(message.createdAtMs, `${path}.messages[].createdAtMs`);
    assert(message.updatedAtMs >= message.createdAtMs, `${path}.messages[].updatedAtMs must be >= createdAtMs`);
  }

  assert(Array.isArray(fixture.messageMentions), `${path}.messageMentions must be an array`);
  for (const mention of fixture.messageMentions) {
    assert(mention.workspaceId === fixture.workspaceId, `${path}.messageMentions[].workspaceId must match`);
    assert(mention.conversationId === fixture.conversationId, `${path}.messageMentions[].conversationId must match`);
    assertValidUlid(mention.messageId, `${path}.messageMentions[].messageId`);
    assertValidUlid(mention.memberId, `${path}.messageMentions[].memberId`);
    assertPositiveTimestamp(mention.createdAtMs, `${path}.messageMentions[].createdAtMs`);
    const message = fixture.messages.find((item) => item.messageId === mention.messageId);
    assert(
      message?.mentionedMemberIds.includes(mention.memberId),
      `${path}.messageMentions[] must agree with message mentionedMemberIds`,
    );
  }

  assert(Array.isArray(fixture.readPositions) && fixture.readPositions.length >= 1, `${path}.readPositions must include a read cursor`);
  for (const readPosition of fixture.readPositions) {
    assert(readPosition.workspaceId === fixture.workspaceId, `${path}.readPositions[].workspaceId must match`);
    assert(readPosition.conversationId === fixture.conversationId, `${path}.readPositions[].conversationId must match`);
    assertValidUlid(readPosition.lastReadMessageId, `${path}.readPositions[].lastReadMessageId`);
    assertPositiveTimestamp(readPosition.lastReadAtMs, `${path}.readPositions[].lastReadAtMs`);
    assert(readPosition.updatedAtMs >= readPosition.lastReadAtMs, `${path}.readPositions[].updatedAtMs must be >= lastReadAtMs`);
  }
}

function validateDataIntegrityReport(path) {
  const report = readJson(path);
  assert(report.schemaVersion === 1, `${path} schemaVersion must be 1`);
  assertValidUlid(report.reportId, `${path}.reportId`);
  assertPositiveTimestamp(report.generatedAtMs, `${path}.generatedAtMs`);
  assert(Array.isArray(report.checks), `${path}.checks must be an array`);

  const counts = report.checks.reduce(
    (next, check) => {
      assert(["passed", "failed", "skipped"].includes(check.status), `${path} invalid check status`);
      assert(["info", "warning", "error"].includes(check.severity), `${path} invalid severity`);
      next.total += 1;
      if (check.status === "passed") next.passed += 1;
      if (check.status === "failed") next.failed += 1;
      if (check.status === "skipped") next.skipped += 1;
      return next;
    },
    { total: 0, passed: 0, failed: 0, skipped: 0 },
  );

  assert(report.totalChecks === counts.total, `${path}.totalChecks does not match checks length`);
  assert(report.passedChecks === counts.passed, `${path}.passedChecks does not match checks`);
  assert(report.failedChecks === counts.failed, `${path}.failedChecks does not match checks`);
  assert(report.skippedChecks === counts.skipped, `${path}.skippedChecks does not match checks`);
  assert(report.hasFailures === counts.failed > 0, `${path}.hasFailures does not match failures`);
}

function validateTerminalStreams(directory) {
  const absoluteDirectory = resolve(root, directory);
  const files = readdirSync(absoluteDirectory)
    .filter((file) => file.endsWith(".json"))
    .map((file) => join(directory, file));

  assert(files.length >= 3, "terminal stream fixtures must cover ordering and snapshot paths");

  for (const file of files) {
    const fixture = readJson(file);
    assert(fixture.schemaVersion === 1, `${file} schemaVersion must be 1`);
    assert(Array.isArray(fixture.events), `${file}.events must be an array`);
    assert(fixture.expectedSnapshot, `${file} must include expectedSnapshot`);

    const baseText = fixture.baseSnapshot?.text ?? "";
    const events = [...fixture.events].sort((a, b) => a.seq - b.seq);
    const sessionIds = new Set(events.map((event) => event.sessionId));

    assert(sessionIds.size === 1, `${file} must use one sessionId`);

    let lastSeq = fixture.baseSnapshot?.lastSeq ?? 0;
    let text = baseText;

    for (const event of events) {
      assert(event.schemaVersion === 1, `${file} event schemaVersion must be 1`);
      assert(event.seq === lastSeq + 1, `${file} seq must be contiguous after sorting`);
      assert(["stdout", "stderr", "system"].includes(event.kind), `${file} invalid event kind`);
      assertPositiveTimestamp(event.emittedAtMs, `${file}.events[].emittedAtMs`);
      text += event.chunk;
      lastSeq = event.seq;
    }

    assert(fixture.expectedSnapshot.lastSeq === lastSeq, `${file} snapshot lastSeq mismatch`);
    assert(fixture.expectedSnapshot.text === text, `${file} snapshot text mismatch`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function assertNonEmptyString(value, path) {
  assert(typeof value === "string" && value.trim().length > 0, `${path} must be a non-empty string`);
}

function assertPositiveTimestamp(value, path) {
  assert(Number.isInteger(value) && value > 0, `${path} must be a positive integer timestamp`);
}

function assertDndMinutes(value, path) {
  assert(Number.isInteger(value) && value >= 0 && value < 24 * 60, `${path} must be minutes in a day`);
}

function assertValidUlid(value, path) {
  assert(typeof value === "string" && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value), `${path} must be a ULID string`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
