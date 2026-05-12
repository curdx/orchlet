import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = process.cwd();

validateWorkspaceMetadata("fixtures/schema/valid-workspace/.orchlet/workspace.json");
validateWorkspaceMetadata("fixtures/data-integrity/valid-json-stores/workspace/.orchlet/workspace.json");
validateWorkspaceRegistry("fixtures/data-integrity/valid-json-stores/app-data/workspace-registry.json");
validateWorkspaceFallbacks("fixtures/data-integrity/valid-json-stores/app-data/workspace-fallbacks.json");
validateSqliteScaffold("fixtures/schema/sqlite-workspace-v1/schema-manifest.json");
validateMemberProfiles("fixtures/schema/members-v1/member-profiles.json");
validateContactProfiles("fixtures/schema/contacts-v1/contact-profiles.json");
validateConversationList("fixtures/schema/conversations-v1/conversation-list.json");
validateMessageHistory("fixtures/schema/messages-v1/message-history.json");
validateTerminalTabs("fixtures/schema/terminal-tabs-v1/terminal-tabs.json");
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
      schema.tables.includes("terminal_tabs"),
    `${path} must include current member, conversation and message schema tables`,
  );
  assert(schema.tables.length === 8, `${path} must include only current workspace tables`);
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

function assertValidUlid(value, path) {
  assert(typeof value === "string" && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value), `${path} must be a ULID string`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
