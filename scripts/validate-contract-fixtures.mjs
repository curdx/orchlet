import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const manifest = readJson("fixtures/contracts/contract-fixtures.manifest.json");
const requiredCommands = new Set([
  "workspace_open",
  "data_integrity_validate",
  "members_list",
  "member_invite",
  "member_remove",
  "terminal_open",
  "terminal_attach",
  "terminal_input",
  "terminal_resize",
  "terminal_close",
  "terminal_tabs_list",
  "terminal_environments_list",
  "terminal_tab_create",
  "terminal_tab_close",
  "terminal_tab_restore",
  "terminal_tab_update",
  "orchestration_dispatch_chat_message",
  "contacts_list",
  "contact_create",
  "contact_update",
  "contact_delete",
  "chat_conversations_list",
  "chat_group_conversation_create",
  "chat_conversation_settings_update",
  "chat_conversation_clear",
  "chat_conversation_delete",
  "chat_message_send",
  "chat_messages_page",
  "chat_read_position_update",
  "chat_group_conversation_members_update",
  "chat_private_conversation_start",
]);

assert(manifest.schemaVersion === 1, "contract fixture manifest schemaVersion must be 1");
assert(Array.isArray(manifest.contracts), "contract fixture manifest must include contracts[]");

const seenCommands = new Set();

for (const contract of manifest.contracts) {
  assert(typeof contract.domain === "string", "contract.domain must be a string");
  assert(typeof contract.command === "string", "contract.command must be a string");
  assert(!seenCommands.has(contract.command), `duplicate contract command ${contract.command}`);
  seenCommands.add(contract.command);

  for (const field of ["requestFixture", "successResultFixture", "errorFixture"]) {
    assert(typeof contract[field] === "string", `${contract.command}.${field} must be a path`);
    const fixture = readJson(contract[field]);
    assertCamelCaseKeys(fixture, contract[field]);
  }

  if (contract.eventFixture) {
    assert(typeof contract.eventFixture === "string", `${contract.command}.eventFixture must be a path`);
    const fixture = readJson(contract.eventFixture);
    assertCamelCaseKeys(fixture, contract.eventFixture);
  }

  assert(
    Array.isArray(contract.requirements) && contract.requirements.includes("NFR36"),
    `${contract.command} must trace to NFR36`,
  );
}

for (const command of requiredCommands) {
  assert(seenCommands.has(command), `missing required contract fixture for ${command}`);
}

console.log(`validated ${manifest.contracts.length} contract fixture groups`);

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function assertCamelCaseKeys(value, context) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertCamelCaseKeys(item, `${context}[${index}]`));
    return;
  }

  if (typeof value !== "object" || value === null) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    assert(!key.includes("_"), `${context} contains non-camelCase key ${key}`);
    assertCamelCaseKeys(child, `${context}.${key}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
