import { invoke } from "@tauri-apps/api/core";

import type { AppError } from "../../contracts/generated/common";
import type {
  OpenedWorkspace,
  OpenWorkspaceResult,
  RecentWorkspaceEntry,
  WorkspaceSelectionStatus,
} from "../../contracts/generated/workspace";
import type {
  ChatMessageProfile,
  ConversationProfile,
  ListMessagesResult,
} from "../../contracts/generated/chat";
import type {
  DispatchChatMessageResult,
  DispatchTargetResolutionSource,
} from "../../contracts/generated/orchestration";
import type {
  ContactProfile,
  CreateContactResult,
  DeleteContactResult,
  UpdateContactResult,
} from "../../contracts/generated/contact";
import type {
  InviteMemberResult,
  MemberProfile,
  RemoveMemberResult,
  UpdateMemberProfileResult,
  UpdateMemberStatusResult,
} from "../../contracts/generated/member";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauriRuntime() {
  return typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
}

const BROWSER_RECENT_WORKSPACES_STORAGE_KEY = "orchlet.browserRecentWorkspaces";
const BROWSER_MEMBERS_STORAGE_KEY = "orchlet.browserMembers";
const BROWSER_CONTACTS_STORAGE_KEY = "orchlet.browserContacts";
const BROWSER_WORKSPACE_ID = "browser-workspace";
const BROWSER_AVATAR_PRESET_IDS = ["orbit", "ember", "mint", "canyon", "storm"] as const;
const BROWSER_CSS_AVATAR_PREFIX = "css:";

function workspaceNameFromPath(path: string) {
  return path.split(/[\\/]/).filter(Boolean).pop() || "golutra";
}

function browserSeededAvatar(seed: string) {
  if (!seed) {
    return `${BROWSER_CSS_AVATAR_PREFIX}${BROWSER_AVATAR_PRESET_IDS[0]}`;
  }

  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  const preset =
    BROWSER_AVATAR_PRESET_IDS[Math.abs(hash) % BROWSER_AVATAR_PRESET_IDS.length] ??
    BROWSER_AVATAR_PRESET_IDS[0];
  return `${BROWSER_CSS_AVATAR_PREFIX}${preset}`;
}

function readBrowserRecentWorkspaces(): RecentWorkspaceEntry[] {
  try {
    const raw = window.localStorage.getItem(BROWSER_RECENT_WORKSPACES_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<RecentWorkspaceEntry>[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => typeof item.path === "string" && item.path.length > 0)
      .map((item) => {
        const now = Date.now();
        const path = item.path as string;
        return {
          projectId: item.projectId || BROWSER_WORKSPACE_ID,
          path,
          name: item.name || workspaceNameFromPath(path),
          firstOpenedAtMs: item.firstOpenedAtMs || now,
          lastOpenedAtMs: item.lastOpenedAtMs || now,
        };
      });
  } catch {
    return [];
  }
}

function writeBrowserRecentWorkspace(entry: RecentWorkspaceEntry) {
  try {
    const existing = readBrowserRecentWorkspaces().filter((item) => item.path !== entry.path);
    window.localStorage.setItem(
      BROWSER_RECENT_WORKSPACES_STORAGE_KEY,
      JSON.stringify([entry, ...existing].slice(0, 8)),
    );
  } catch {
    // Browser preview storage is best-effort and must not affect app behavior.
  }
}

function createBrowserWorkspace(path: string): OpenedWorkspace {
  const now = Date.now();
  const name = workspaceNameFromPath(path);
  const registryEntry = {
    projectId: BROWSER_WORKSPACE_ID,
    path,
    name,
    firstOpenedAtMs: now,
    lastOpenedAtMs: now,
  };

  return {
    rootPath: path,
    metadata: {
      schemaVersion: 1,
      projectId: BROWSER_WORKSPACE_ID,
      name,
      createdAtMs: now,
      updatedAtMs: now,
    },
    created: false,
    accessMode: "readWrite",
    fallbackState: null,
    registryEntry,
    registryAction: "reopened",
  };
}

function baseBrowserMembers(workspaceId: string): MemberProfile[] {
  const now = Date.now();
  const base = {
    workspaceId,
    permissions: { canMention: true, canRemove: true },
    isolation: { sandboxed: true, unlimitedAccess: false },
    createdAtMs: now - 86_400_000,
    updatedAtMs: now,
  };

  return [
    {
      ...base,
      memberId: "owner",
      role: "owner",
      displayName: "Owner",
      avatar: "css:orbit",
      instanceIndex: 0,
      instanceLabel: "Owner",
      status: "online",
      runtime: { kind: "none", runtimeId: null, label: null, command: null },
    },
    {
      ...base,
      memberId: "assistant-amelia",
      role: "assistant",
      displayName: "Amelia",
      avatar: browserSeededAvatar("assistant:Amelia"),
      instanceIndex: 1,
      instanceLabel: "Amelia",
      status: "working",
      runtime: {
        kind: "builtInAiCli",
        runtimeId: "codex",
        label: "Codex",
        command: null,
      },
    },
    {
      ...base,
      memberId: "assistant-sally",
      role: "assistant",
      displayName: "Sally",
      avatar: browserSeededAvatar("assistant:Sally"),
      instanceIndex: 2,
      instanceLabel: "Sally",
      status: "online",
      runtime: {
        kind: "builtInAiCli",
        runtimeId: "designer",
        label: "Designer",
        command: null,
      },
    },
  ];
}

function readStoredBrowserMembers(workspaceId: string): MemberProfile[] {
  try {
    const raw = window.localStorage.getItem(BROWSER_MEMBERS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as MemberProfile[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((member) => member.workspaceId === workspaceId)
      .map((member) => ({
        ...member,
        avatar:
          typeof member.avatar === "string" && member.avatar.trim()
            ? member.avatar
            : browserSeededAvatar(`${member.role}:${member.instanceLabel || member.displayName}`),
      }));
  } catch {
    return [];
  }
}

function writeStoredBrowserMembers(workspaceId: string, members: MemberProfile[]) {
  try {
    const raw = window.localStorage.getItem(BROWSER_MEMBERS_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as MemberProfile[]) : [];
    const otherWorkspaceMembers = Array.isArray(parsed)
      ? parsed.filter((member) => member.workspaceId !== workspaceId)
      : [];
    window.localStorage.setItem(
      BROWSER_MEMBERS_STORAGE_KEY,
      JSON.stringify([...otherWorkspaceMembers, ...members]),
    );
  } catch {
    // Browser preview storage is best-effort and must not affect app behavior.
  }
}

function baseBrowserContacts(): ContactProfile[] {
  const now = Date.now();

  return [
    {
      contactId: "browser-global-admin",
      displayName: "External Admin",
      contactKind: "administrator",
      avatar: "css:orbit",
      status: "offline",
      inviteSource: "adminContactInvite",
      notes: "Browser preview global contact",
      sourceLabel: "Invite Admin Modal",
      createdAtMs: now - 43_200_000,
      updatedAtMs: now - 43_200_000,
    },
  ];
}

function browserContacts(): ContactProfile[] {
  try {
    const raw = window.localStorage.getItem(BROWSER_CONTACTS_STORAGE_KEY);

    if (!raw) {
      return baseBrowserContacts();
    }

    const parsed = JSON.parse(raw) as ContactProfile[];

    if (!Array.isArray(parsed)) {
      return baseBrowserContacts();
    }

    return parsed.map((contact) => ({
      ...contact,
      avatar: contact.avatar || "css:orbit",
      status: contact.status || "offline",
    }));
  } catch {
    return baseBrowserContacts();
  }
}

function writeStoredBrowserContacts(contacts: ContactProfile[]) {
  try {
    window.localStorage.setItem(BROWSER_CONTACTS_STORAGE_KEY, JSON.stringify(contacts));
  } catch {
    // Browser preview storage is best-effort and must not affect app behavior.
  }
}

function browserMembers(workspaceId: string): MemberProfile[] {
  const storedMembers = readStoredBrowserMembers(workspaceId);

  if (storedMembers.length > 0) {
    return storedMembers;
  }

  const members = baseBrowserMembers(workspaceId);
  writeStoredBrowserMembers(workspaceId, members);
  return members;
}

function browserConversationMembers(workspaceId: string) {
  return browserMembers(workspaceId).map((member) => ({
    memberId: member.memberId,
    displayName: member.displayName,
    instanceLabel: member.instanceLabel,
  }));
}

function browserConversations(workspaceId: string): ConversationProfile[] {
  const now = Date.now();
  const members = browserConversationMembers(workspaceId);

  return [
    {
      conversationId: "browser-channel-general",
      workspaceId,
      kind: "channel",
      title: "general",
      isDefault: true,
      isPinned: true,
      isMuted: false,
      unreadCount: 2,
      lastMessagePreview: "UI parity pass is ready for review.",
      participantKind: null,
      participantId: null,
      members,
      createdAtMs: now - 86_400_000,
      updatedAtMs: now,
      lastActivityAtMs: now,
    },
    {
      conversationId: "browser-group-build",
      workspaceId,
      kind: "group",
      title: "Implementation",
      isDefault: false,
      isPinned: false,
      isMuted: false,
      unreadCount: 0,
      lastMessagePreview: "Shell, workspace landing, and chat surface aligned.",
      participantKind: null,
      participantId: null,
      members,
      createdAtMs: now - 72_000_000,
      updatedAtMs: now - 900_000,
      lastActivityAtMs: now - 900_000,
    },
    {
      conversationId: "browser-direct-sally",
      workspaceId,
      kind: "private",
      title: "Sally",
      isDefault: false,
      isPinned: false,
      isMuted: false,
      unreadCount: 0,
      lastMessagePreview: "Visual spacing now follows Golutra.",
      participantKind: "member",
      participantId: "assistant-sally",
      members: members.filter((member) =>
        ["owner", "assistant-sally"].includes(member.memberId),
      ),
      createdAtMs: now - 36_000_000,
      updatedAtMs: now - 1_800_000,
      lastActivityAtMs: now - 1_800_000,
    },
  ];
}

function browserSendDispatchResults(
  workspaceId: string,
  conversation: ConversationProfile,
  message: ChatMessageProfile,
  mentionAll: boolean,
): DispatchChatMessageResult[] {
  const members = browserMembers(workspaceId);
  const targetIds = browserSendDispatchTargetIds(conversation, message, mentionAll);
  const timestamp = Date.now();

  return targetIds.flatMap((memberId) => {
    const member = members.find((candidate) => candidate.memberId === memberId);
    if (!member || member.memberId === message.authorMemberId) {
      return [];
    }

    const source = browserDispatchSource(conversation, message, mentionAll);
    return [
      {
        dispatch: {
          schemaVersion: 1,
          dispatchRequestId: `browser-dispatch-${message.messageId}-${member.memberId}`,
          workspaceId,
          conversationId: conversation.conversationId,
          messageId: message.messageId,
          sourceMessageIds: [message.messageId],
          memberId: member.memberId,
          targetResolution: {
            memberId: member.memberId,
            source,
            reason: browserDispatchReason(source, member.instanceLabel),
          },
          status: "failed",
          terminalSessionId: null,
          failure: {
            code: "browser.dispatch.unsupported",
            message: "浏览器预览不支持终端派发。",
            userAction: "请在 Tauri 桌面应用中验证终端派发。",
            details: null,
          },
          createdAtMs: timestamp,
          updatedAtMs: timestamp,
        },
        terminalSession: null,
        sessionCreated: false,
      } satisfies DispatchChatMessageResult,
    ];
  });
}

function browserSendDispatchTargetIds(
  conversation: ConversationProfile,
  message: ChatMessageProfile,
  mentionAll: boolean,
) {
  const candidates =
    mentionAll && conversation.kind === "channel" && conversation.members.length === 0
      ? browserConversationMembers(message.workspaceId)
      : conversation.members;
  const ids =
    conversation.kind === "private" &&
    conversation.participantKind === "member" &&
    conversation.participantId
      ? [conversation.participantId]
      : mentionAll
        ? candidates.map((member) => member.memberId)
        : message.mentionedMemberIds;

  return [...new Set(ids.filter((memberId) => memberId !== message.authorMemberId))];
}

function browserDispatchSource(
  conversation: ConversationProfile,
  message: ChatMessageProfile,
  mentionAll: boolean,
): DispatchTargetResolutionSource {
  if (conversation.kind === "private") {
    return "privateConversation";
  }

  if (mentionAll) {
    return "allMention";
  }

  return message.mentionedMemberIds.length > 0 ? "explicitMention" : "userSelected";
}

function browserDispatchReason(source: DispatchTargetResolutionSource, label: string) {
  switch (source) {
    case "privateConversation":
      return `当前私聊对象 ${label} 是本次发送目标。`;
    case "allMention":
      return `@all 指向成员 ${label}。`;
    case "explicitMention":
      return `消息明确提及 ${label}。`;
    default:
      return `浏览器预览选择了 ${label}。`;
  }
}

function browserHasAllMentionToken(body: string) {
  return body.split(/[\s,.!?;:，。！？；：]+/).some((token) => token === "@all");
}

function browserMessages(workspaceId: string, conversationId: string): ChatMessageProfile[] {
  const now = Date.now();

  return [
    {
      messageId: `${conversationId}-m1`,
      workspaceId,
      conversationId,
      authorMemberId: "assistant-sally",
      body: "I matched the Golutra shell density: left navigation, translucent panels, and the compact chat header.",
      mentionedMemberIds: [],
      status: "sent",
      createdAtMs: now - 900_000,
      updatedAtMs: now - 900_000,
    },
    {
      messageId: `${conversationId}-m2`,
      workspaceId,
      conversationId,
      authorMemberId: "assistant-amelia",
      body: "Next slice should replace the remaining legacy management panels with the Golutra modal flows.",
      mentionedMemberIds: ["owner"],
      status: "sent",
      createdAtMs: now - 420_000,
      updatedAtMs: now - 420_000,
    },
    {
      messageId: `${conversationId}-m3`,
      workspaceId,
      conversationId,
      authorMemberId: "owner",
      body: "Good. Keep the UI and behavior aligned with the Vue reference, React only changes the implementation stack.",
      mentionedMemberIds: [],
      status: "sent",
      createdAtMs: now - 120_000,
      updatedAtMs: now - 120_000,
    },
  ];
}

function invokeBrowserFallback<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const browserProfile = {
    schemaVersion: 1,
    displayName: "Owner",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    status: "online",
    statusMessage: null,
    avatar: {
      kind: "placeholder",
      presetId: null,
      uploadId: null,
      sourceFileName: null,
      contentType: null,
      sizeBytes: null,
      libraryRelativePath: null,
      updatedAtMs: Date.now(),
    },
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
  };

  if (command === "workspace_selection_status") {
    return Promise.resolve({
      windowMode: "workspaceSelection",
      canOpenWorkspace: true,
      recentWorkspaceCount: 0,
    } satisfies WorkspaceSelectionStatus as T);
  }

  if (command === "workspace_recent_list") {
    return Promise.resolve(readBrowserRecentWorkspaces() as T);
  }

  if (command === "workspace_open") {
    const request = (args?.request ?? {}) as { path?: string | null };
    const workspace = createBrowserWorkspace(request.path?.trim() || "/Users/wdx/opc/golutra");
    writeBrowserRecentWorkspace(workspace.registryEntry);

    return Promise.resolve({
      status: "opened",
      workspace,
      conflict: null,
    } satisfies OpenWorkspaceResult as T);
  }

  if (command === "members_list") {
    const request = (args?.request ?? {}) as { workspaceId?: string | null };
    return Promise.resolve({
      members: browserMembers(request.workspaceId || BROWSER_WORKSPACE_ID),
    } as T);
  }

  if (command === "member_invite") {
    const request = (args?.request ?? {}) as {
      workspaceId?: string | null;
      memberType?: "assistant" | "member";
      displayName?: string | null;
      runtime?: MemberProfile["runtime"] | null;
      instanceCount?: number | null;
      permissions?: MemberProfile["permissions"] | null;
      isolation?: MemberProfile["isolation"] | null;
    };
    const workspaceId = request.workspaceId || BROWSER_WORKSPACE_ID;
    const currentMembers = browserMembers(workspaceId);
    const displayName =
      request.displayName?.trim() ||
      (request.memberType === "member" ? "Local Collaborator" : "Codex Reviewer");
    const instanceCount = Math.max(1, Math.min(20, request.instanceCount ?? 1));
    const now = Date.now();
    const invitedMembers = Array.from({ length: instanceCount }, (_, index) => ({
      memberId: `browser-${request.memberType ?? "assistant"}-${now}-${index + 1}`,
      workspaceId,
      role: request.memberType ?? "assistant",
      displayName,
      avatar: browserSeededAvatar(
        `${request.memberType ?? "assistant"}:${
          instanceCount > 1 ? `${displayName} ${index + 1}` : displayName
        }`,
      ),
      instanceIndex: index + 1,
      instanceLabel: instanceCount > 1 ? `${displayName} ${index + 1}` : displayName,
      status: "online",
      runtime: request.runtime ?? {
        kind: "builtInAiCli",
        runtimeId: "codex",
        label: "Codex",
        command: null,
      },
      permissions: request.permissions ?? { canMention: true, canRemove: true },
      isolation: request.isolation ?? { sandboxed: true, unlimitedAccess: false },
      createdAtMs: now,
      updatedAtMs: now,
    })) satisfies MemberProfile[];
    const members = [...currentMembers, ...invitedMembers];
    writeStoredBrowserMembers(workspaceId, members);

    return Promise.resolve({
      member: invitedMembers[0],
      invitedMembers,
      members,
    } satisfies InviteMemberResult as T);
  }

  if (command === "member_remove") {
    const request = (args?.request ?? {}) as {
      workspaceId?: string | null;
      memberId?: string | null;
    };
    const workspaceId = request.workspaceId || BROWSER_WORKSPACE_ID;
    const removedMemberId = request.memberId || "";
    const members = browserMembers(workspaceId).filter(
      (member) => member.memberId !== removedMemberId,
    );
    writeStoredBrowserMembers(workspaceId, members);

    return Promise.resolve({
      removedMemberId,
      members,
    } satisfies RemoveMemberResult as T);
  }

  if (command === "member_profile_update") {
    const request = (args?.request ?? {}) as {
      workspaceId?: string | null;
      memberId?: string | null;
      displayName?: string | null;
    };
    const workspaceId = request.workspaceId || BROWSER_WORKSPACE_ID;
    const displayName = request.displayName?.trim() || "Renamed Member";
    const members = browserMembers(workspaceId).map((member) =>
      member.memberId === request.memberId
        ? {
            ...member,
            displayName,
            instanceLabel: displayName,
            updatedAtMs: Date.now(),
          }
        : member,
    );
    const member =
      members.find((item) => item.memberId === request.memberId) ?? members[0];
    writeStoredBrowserMembers(workspaceId, members);

    return Promise.resolve({
      member,
      members,
    } satisfies UpdateMemberProfileResult as T);
  }

  if (command === "member_status_update") {
    const request = (args?.request ?? {}) as {
      workspaceId?: string | null;
      memberId?: string | null;
      status?: MemberProfile["status"] | null;
    };
    const workspaceId = request.workspaceId || BROWSER_WORKSPACE_ID;
    const members = browserMembers(workspaceId).map((member) =>
      member.memberId === request.memberId
        ? { ...member, status: request.status ?? member.status, updatedAtMs: Date.now() }
        : member,
    );
    const member =
      members.find((item) => item.memberId === request.memberId) ?? members[0];
    writeStoredBrowserMembers(workspaceId, members);

    return Promise.resolve({
      member,
      members,
    } satisfies UpdateMemberStatusResult as T);
  }

  if (command === "contacts_list") {
    return Promise.resolve({ contacts: browserContacts() } as T);
  }

  if (command === "contact_create") {
    const request = (args?.request ?? {}) as {
      displayName?: string | null;
      contactKind?: ContactProfile["contactKind"] | null;
      notes?: string | null;
      sourceLabel?: string | null;
    };
    const now = Date.now();
    const contact: ContactProfile = {
      contactId: `browser-contact-${now}`,
      displayName: request.displayName?.trim() || "External Admin",
      contactKind: request.contactKind ?? "contact",
      avatar: "css:orbit",
      status: "offline",
      inviteSource: "adminContactInvite",
      notes: request.notes ?? null,
      sourceLabel: request.sourceLabel ?? null,
      createdAtMs: now,
      updatedAtMs: now,
    };
    const contacts = [...browserContacts(), contact];
    writeStoredBrowserContacts(contacts);

    return Promise.resolve({
      contact,
      contacts,
      adminMember: null,
    } satisfies CreateContactResult as T);
  }

  if (command === "contact_update") {
    const request = (args?.request ?? {}) as {
      contactId?: string | null;
      displayName?: string | null;
      contactKind?: ContactProfile["contactKind"] | null;
      status?: ContactProfile["status"] | null;
      notes?: string | null;
      sourceLabel?: string | null;
    };
    const now = Date.now();
    const contacts = browserContacts().map((contact) =>
      contact.contactId === request.contactId
        ? {
            ...contact,
            displayName: request.displayName?.trim() || contact.displayName,
            contactKind: request.contactKind ?? contact.contactKind,
            status: request.status ?? contact.status,
            notes: request.notes ?? null,
            sourceLabel: request.sourceLabel ?? null,
            updatedAtMs: now,
          }
        : contact,
    );
    const contact = contacts.find((item) => item.contactId === request.contactId) ?? contacts[0];
    writeStoredBrowserContacts(contacts);

    return Promise.resolve({
      contact,
      contacts,
    } satisfies UpdateContactResult as T);
  }

  if (command === "contact_delete") {
    const request = (args?.request ?? {}) as { contactId?: string | null };
    const deletedContactId = request.contactId || "";
    const contacts = browserContacts().filter((contact) => contact.contactId !== deletedContactId);
    writeStoredBrowserContacts(contacts);

    return Promise.resolve({
      deletedContactId,
      contacts,
    } satisfies DeleteContactResult as T);
  }

  if (command === "skills_library_list") {
    return Promise.resolve({ skills: [] } as T);
  }

  if (command === "workspace_skill_links_list") {
    return Promise.resolve({ skills: [] } as T);
  }

  if (command === "roadmap_tasks_list") {
    return Promise.resolve({ tasks: [] } as T);
  }

  if (command === "roadmap_goals_list") {
    return Promise.resolve({ goals: [] } as T);
  }

  if (command === "chat_conversations_list") {
    const request = (args?.request ?? {}) as { workspaceId?: string | null };
    return Promise.resolve({
      conversations: browserConversations(request.workspaceId || BROWSER_WORKSPACE_ID),
    } as T);
  }

  if (command === "chat_messages_page") {
    const request = (args?.request ?? {}) as {
      workspaceId?: string | null;
      conversationId?: string | null;
    };
    const workspaceId = request.workspaceId || BROWSER_WORKSPACE_ID;
    const conversations = browserConversations(workspaceId);
    const conversation =
      conversations.find((item) => item.conversationId === request.conversationId) ??
      conversations[0];
    const messages = browserMessages(workspaceId, conversation.conversationId);

    return Promise.resolve({
      messages,
      hasMore: false,
      nextBeforeMessageId: null,
      readPosition: {
        workspaceId,
        conversationId: conversation.conversationId,
        lastReadMessageId: messages[messages.length - 1]?.messageId ?? "",
        lastReadAtMs: Date.now(),
        updatedAtMs: Date.now(),
      },
      conversation,
    } satisfies ListMessagesResult as T);
  }

  if (command === "chat_read_position_update") {
    const request = (args?.request ?? {}) as {
      workspaceId?: string | null;
      conversationId?: string | null;
      messageId?: string | null;
    };
    const workspaceId = request.workspaceId || BROWSER_WORKSPACE_ID;
    const conversation =
      browserConversations(workspaceId).find(
        (item) => item.conversationId === request.conversationId,
      ) ?? browserConversations(workspaceId)[0];

    return Promise.resolve({
      readPosition: {
        workspaceId,
        conversationId: conversation.conversationId,
        lastReadMessageId: request.messageId || "",
        lastReadAtMs: Date.now(),
        updatedAtMs: Date.now(),
      },
      conversation,
    } as T);
  }

  if (command === "chat_message_send" || command === "chat_message_send_and_dispatch") {
    const request = (args?.request ?? {}) as {
      workspaceId?: string | null;
      conversationId?: string | null;
      body?: string | null;
      mentionedMemberIds?: string[] | null;
      mentionAll?: boolean | null;
    };
    const workspaceId = request.workspaceId || BROWSER_WORKSPACE_ID;
    const conversation =
      browserConversations(workspaceId).find(
        (item) => item.conversationId === request.conversationId,
      ) ?? browserConversations(workspaceId)[0];
    const message = {
      messageId: `browser-message-${Date.now()}`,
      workspaceId,
      conversationId: conversation.conversationId,
      authorMemberId: "owner",
      body: request.body?.trim() || "",
      mentionedMemberIds: request.mentionedMemberIds ?? [],
      status: "sent",
      createdAtMs: Date.now(),
      updatedAtMs: Date.now(),
    } satisfies ChatMessageProfile;

    const result = {
      message,
      conversation: {
        ...conversation,
        lastMessagePreview: message.body,
        lastActivityAtMs: message.createdAtMs,
        updatedAtMs: message.updatedAtMs,
      },
      readPosition: {
        workspaceId,
        conversationId: conversation.conversationId,
        lastReadMessageId: message.messageId,
        lastReadAtMs: message.createdAtMs,
        updatedAtMs: message.updatedAtMs,
      },
    };

    return Promise.resolve(
      (command === "chat_message_send_and_dispatch"
        ? {
            ...result,
            dispatches: browserSendDispatchResults(
              workspaceId,
              conversation,
              message,
              Boolean(request.mentionAll) || browserHasAllMentionToken(message.body),
            ),
          }
        : result) as T,
    );
  }

  if (command === "diagnostics_overview_get") {
    const request = (args?.request ?? {}) as { workspaceId?: string | null };
    return Promise.resolve({
      workspaceId: request.workspaceId ?? "browser-workspace",
      generatedAtMs: Date.now(),
      runs: [],
      keyEvents: [],
      consistencySummary: {
        terminalIssueCount: 0,
        chatIssueCount: 0,
        severityCounts: { info: 0, warning: 0, error: 0 },
        recentIssueCodes: [],
        recommendedNextActions: [],
      },
      validationSummary: {
        availability: "notAvailable",
        status: null,
        message: "浏览器预览环境没有诊断存储。",
        reportId: null,
        generatedAtMs: null,
        totalChecks: 0,
        passedChecks: 0,
        failedChecks: 0,
        skippedChecks: 0,
      },
      hasMore: false,
      nextCursor: null,
    } as T);
  }

  if (command === "diagnostics_export_generate") {
    const request = (args?.request ?? {}) as { workspaceId?: string | null };
    return Promise.resolve({
      package: {
        schemaVersion: 1,
        generatedAtMs: Date.now(),
        workspaceRef: `workspace:${request.workspaceId ?? "browser-workspace"}`,
        runs: [],
        keyEvents: [],
        consistencySummary: null,
        validationSummary: null,
        appMetadata: [
          { key: "schemaVersion", value: "1" },
          { key: "generator", value: "orchlet.diagnostics.export" },
          { key: "localOnly", value: "true" },
        ],
        additionalContext: [],
      },
      redactionSummary: {
        redactedFields: 0,
        omittedFields: 0,
        warningCount: 0,
        truncatedSections: [],
      },
      warnings: [],
      hasMore: false,
      nextCursor: null,
    } as T);
  }

  if (command === "profile_settings_get") {
    return Promise.resolve({
      profile: browserProfile,
    } as T);
  }

  if (command === "profile_settings_update") {
    const request = (args?.request ?? {}) as {
      displayName?: string | null;
      timezone?: string | null;
      status?: string | null;
      statusMessage?: string | null;
    };

    return Promise.resolve({
      profile: {
        ...browserProfile,
        displayName: request.displayName?.trim() || "Owner",
        timezone: request.timezone || "UTC",
        status: request.status || "online",
        statusMessage: request.statusMessage?.trim() || null,
        updatedAtMs: Date.now(),
      },
    } as T);
  }

  if (command === "profile_avatar_preset_select") {
    const request = (args?.request ?? {}) as { presetId?: string | null };
    return Promise.resolve({
      profile: {
        ...browserProfile,
        avatar: {
          kind: "preset",
          presetId: request.presetId || "orchid",
          uploadId: null,
          sourceFileName: null,
          contentType: null,
          sizeBytes: null,
          libraryRelativePath: null,
          updatedAtMs: Date.now(),
        },
        updatedAtMs: Date.now(),
      },
    } as T);
  }

  if (command === "profile_avatar_upload") {
    const request = (args?.request ?? {}) as { sourcePath?: string | null };
    return Promise.resolve({
      profile: {
        ...browserProfile,
        avatar: {
          kind: "uploaded",
          presetId: null,
          uploadId: "browser-upload",
          sourceFileName: request.sourcePath?.split(/[\\/]/).pop() || "avatar.png",
          contentType: "image/png",
          sizeBytes: 3,
          libraryRelativePath: "avatars/uploads/browser-upload.png",
          previewDataUrl: "data:image/png;base64,cG5n",
          updatedAtMs: Date.now(),
        },
        updatedAtMs: Date.now(),
      },
    } as T);
  }

  if (command === "profile_avatar_reset" || command === "profile_avatar_delete_uploaded") {
    return Promise.resolve({
      profile: browserProfile,
    } as T);
  }

  return Promise.reject({
    code: "ipc.command.unavailable",
    message: `命令 ${command} 在当前运行环境不可用。`,
    severity: "error",
    recoverable: true,
    userAction: "请在 Tauri 桌面运行时中重试。",
    details: null,
    correlationId: null,
  } satisfies AppError);
}

export function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntime()) {
    return invokeBrowserFallback<T>(command, args);
  }

  return invoke<T>(command, args);
}

export type { WorkspaceSelectionStatus };
