import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { WorkspaceSelectionPage } from "./pages/workspace-selection";
import { useToastStore } from "./shared/ui";
import type {
  ChatMessageProfile,
  ClearConversationRequest,
  ClearConversationResult,
  ConversationReadPositionProfile,
  DataIntegrityReport,
  ContactProfile,
  CreateContactRequest,
  CreateContactResult,
  CreateGroupConversationRequest,
  CreateGroupConversationResult,
  ConversationProfile,
  DeleteConversationRequest,
  DeleteConversationResult,
  DeleteContactRequest,
  DeleteContactResult,
  InviteMemberRequest,
  InviteMemberResult,
  ListConversationsRequest,
  ListConversationsResult,
  ListMessagesRequest,
  ListMessagesResult,
  ListContactsRequest,
  ListContactsResult,
  ListMembersRequest,
  ListMembersResult,
  MemberProfile,
  OpenWorkspaceResult,
  RecentWorkspaceEntry,
  RemoveMemberRequest,
  RemoveMemberResult,
  SendMessageRequest,
  SendMessageResult,
  StartPrivateConversationRequest,
  StartPrivateConversationResult,
  TerminalOpenResult,
  UpdateContactRequest,
  UpdateContactResult,
  UpdateConversationSettingsRequest,
  UpdateConversationSettingsResult,
  UpdateGroupConversationMembersRequest,
  UpdateGroupConversationMembersResult,
  UpdateReadPositionRequest,
  UpdateReadPositionResult,
  WindowContextSnapshot,
  WorkspaceSelectionStatus,
} from "./contracts/generated";

const status: WorkspaceSelectionStatus = {
  windowMode: "workspaceSelection",
  canOpenWorkspace: true,
  recentWorkspaceCount: 0,
};

beforeEach(() => {
  useToastStore.getState().clearToast();
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.lang = "";
});

function renderWorkspaceSelection(api: {
  getWorkspaceSelectionStatus: () => Promise<WorkspaceSelectionStatus>;
  listRecentWorkspaces?: () => Promise<RecentWorkspaceEntry[]>;
  pickAndOpenWorkspace: () => Promise<OpenWorkspaceResult | null>;
  openWorkspace?: (
    path: string,
    options?: { conflictResolution?: "move" | "copy" | null },
  ) => Promise<OpenWorkspaceResult>;
  openWorkspaceInFileManager?: (path: string) => Promise<{ path: string; opened: boolean }>;
  memberApi?: Partial<{
    listMembers: (request: ListMembersRequest) => Promise<ListMembersResult>;
    inviteMember: (request: InviteMemberRequest) => Promise<InviteMemberResult>;
    removeMember: (request: RemoveMemberRequest) => Promise<RemoveMemberResult>;
  }>;
  terminalApi?: Partial<{
    openTerminal: (request?: {
      memberId?: string | null;
      attachCurrent?: boolean;
    }) => Promise<TerminalOpenResult>;
  }>;
  contactApi?: Partial<{
    listContacts: (request: ListContactsRequest) => Promise<ListContactsResult>;
    createContact: (request: CreateContactRequest) => Promise<CreateContactResult>;
    updateContact: (request: UpdateContactRequest) => Promise<UpdateContactResult>;
    deleteContact: (request: DeleteContactRequest) => Promise<DeleteContactResult>;
  }>;
  chatApi?: Partial<{
    listConversations: (request: ListConversationsRequest) => Promise<ListConversationsResult>;
    createGroupConversation: (
      request: CreateGroupConversationRequest,
    ) => Promise<CreateGroupConversationResult>;
    updateConversationSettings: (
      request: UpdateConversationSettingsRequest,
    ) => Promise<UpdateConversationSettingsResult>;
    clearConversation: (request: ClearConversationRequest) => Promise<ClearConversationResult>;
    deleteConversation: (request: DeleteConversationRequest) => Promise<DeleteConversationResult>;
    sendMessage: (request: SendMessageRequest) => Promise<SendMessageResult>;
    listMessages: (request: ListMessagesRequest) => Promise<ListMessagesResult>;
    updateReadPosition: (
      request: UpdateReadPositionRequest,
    ) => Promise<UpdateReadPositionResult>;
    updateGroupConversationMembers: (
      request: UpdateGroupConversationMembersRequest,
    ) => Promise<UpdateGroupConversationMembersResult>;
    startPrivateConversation: (
      request: StartPrivateConversationRequest,
    ) => Promise<StartPrivateConversationResult>;
  }>;
}) {
  const { memberApi, terminalApi, contactApi, chatApi, ...workspaceApi } = api;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceSelectionPage
        api={{
          listRecentWorkspaces: () => Promise.resolve([]),
          openWorkspace: () => Promise.reject(new Error("openWorkspace mock missing")),
          openWorkspaceInFileManager: () =>
            Promise.reject(new Error("openWorkspaceInFileManager mock missing")),
          ...workspaceApi,
        }}
        memberApi={{
          listMembers: () => Promise.resolve({ members: [] }),
          inviteMember: () => Promise.reject(new Error("inviteMember mock missing")),
          removeMember: () => Promise.reject(new Error("removeMember mock missing")),
          ...memberApi,
        }}
        terminalApi={{
          openTerminal: () => Promise.reject(new Error("openTerminal mock missing")),
          ...terminalApi,
        }}
        contactApi={{
          listContacts: () => Promise.resolve({ contacts: [] }),
          createContact: () => Promise.reject(new Error("createContact mock missing")),
          updateContact: () => Promise.reject(new Error("updateContact mock missing")),
          deleteContact: () => Promise.reject(new Error("deleteContact mock missing")),
          ...contactApi,
        }}
        chatApi={{
          listConversations: () => Promise.resolve({ conversations: [defaultChannel()] }),
          createGroupConversation: () =>
            Promise.reject(new Error("createGroupConversation mock missing")),
          updateConversationSettings: () =>
            Promise.reject(new Error("updateConversationSettings mock missing")),
          clearConversation: () => Promise.reject(new Error("clearConversation mock missing")),
          deleteConversation: () => Promise.reject(new Error("deleteConversation mock missing")),
          sendMessage: () => Promise.reject(new Error("sendMessage mock missing")),
          listMessages: () =>
            Promise.resolve({
              messages: [],
              hasMore: false,
              nextBeforeMessageId: null,
              readPosition: null,
              conversation: defaultChannel(),
            }),
          updateReadPosition: () =>
            Promise.reject(new Error("updateReadPosition mock missing")),
          updateGroupConversationMembers: () =>
            Promise.reject(new Error("updateGroupConversationMembers mock missing")),
          startPrivateConversation: () =>
            Promise.reject(new Error("startPrivateConversation mock missing")),
          ...chatApi,
        }}
      />
    </QueryClientProvider>,
  );
}

function openedWorkspaceResult(overrides: Partial<OpenWorkspaceResult> = {}): OpenWorkspaceResult {
  return {
    status: "opened",
    conflict: null,
    workspace: {
      rootPath: "/tmp/orchlet-demo",
      created: true,
      accessMode: "readWrite",
      fallbackState: null,
      registryAction: "created",
      registryEntry: {
        projectId: "01K00000000000000000000000",
        path: "/tmp/orchlet-demo",
        name: "orchlet-demo",
        firstOpenedAtMs: 1760000000000,
        lastOpenedAtMs: 1760000000000,
      },
      metadata: {
        schemaVersion: 1,
        projectId: "01K00000000000000000000000",
        name: "orchlet-demo",
        createdAtMs: 1760000000000,
        updatedAtMs: 1760000000000,
      },
    },
    ...overrides,
  };
}

function windowContextSnapshot(
  overrides: Partial<WindowContextSnapshot> = {},
): WindowContextSnapshot {
  return {
    schemaVersion: 1,
    currentWindow: {
      label: "main",
      mode: "workspaceSelection",
    },
    activeWorkspace: null,
    preferences: {
      theme: "system",
      language: "zh-CN",
    },
    updatedAtMs: 1760000000000,
    sourceWindowLabel: null,
    ...overrides,
  };
}

function terminalOpenResult(overrides: Partial<TerminalOpenResult> = {}): TerminalOpenResult {
  return {
    window: {
      label: "terminal",
      mode: "terminal",
    },
    windowOpened: true,
    sessionCreated: true,
    session: {
      schemaVersion: 1,
      terminalSessionId: "01KTERMINAL00000000000001",
      workspaceId: "01K00000000000000000000000",
      memberId: null,
      title: "orchlet-demo",
      status: "running",
      createdAtMs: 1760000000000,
      updatedAtMs: 1760000000001,
    },
    ...overrides,
  };
}

function dataIntegrityReport(
  overrides: Partial<DataIntegrityReport> = {},
): DataIntegrityReport {
  return {
    schemaVersion: 1,
    reportId: "01KDATAINTEGRITY0000000000",
    generatedAtMs: 1760000000000,
    manifest: [],
    checks: [],
    totalChecks: 0,
    passedChecks: 0,
    failedChecks: 0,
    skippedChecks: 0,
    hasFailures: false,
    batched: true,
    ...overrides,
  };
}

function memberProfile(overrides: Partial<MemberProfile> = {}): MemberProfile {
  const base: MemberProfile = {
    memberId: "01KMEMBER000000000000000000",
    workspaceId: "01K00000000000000000000000",
    role: "owner",
    displayName: "Workspace Owner",
    instanceIndex: 1,
    instanceLabel: "Workspace Owner",
    status: "online",
    runtime: {
      kind: "none",
      runtimeId: null,
      label: null,
      command: null,
    },
    permissions: {
      canMention: false,
      canRemove: false,
    },
    isolation: {
      sandboxed: false,
      unlimitedAccess: true,
    },
    createdAtMs: 1760000000000,
    updatedAtMs: 1760000000000,
  };
  const profile: MemberProfile = {
    ...base,
    ...overrides,
  };

  return {
    ...profile,
    instanceLabel: overrides.instanceLabel ?? overrides.displayName ?? profile.instanceLabel,
  };
}

function contactProfile(overrides: Partial<ContactProfile> = {}): ContactProfile {
  return {
    contactId: "01KCONTACT0000000000000000",
    displayName: "External Admin",
    contactKind: "administrator",
    inviteSource: "adminContactInvite",
    notes: "Local administrator contact",
    sourceLabel: "Invite Admin Modal",
    createdAtMs: 1760000000000,
    updatedAtMs: 1760000000000,
    ...overrides,
  };
}

function conversationProfile(overrides: Partial<ConversationProfile> = {}): ConversationProfile {
  return {
    conversationId: "01K00000000000000000000050",
    workspaceId: "01K00000000000000000000000",
    kind: "private",
    title: "External Admin",
    isDefault: false,
    isPinned: false,
    isMuted: false,
    unreadCount: 0,
    lastMessagePreview: null,
    participantKind: "contact",
    participantId: "01KCONTACT0000000000000000",
    members: [],
    createdAtMs: 1760000000000,
    updatedAtMs: 1760000000000,
    lastActivityAtMs: 1760000000000,
    ...overrides,
  };
}

function defaultChannel(overrides: Partial<ConversationProfile> = {}): ConversationProfile {
  return conversationProfile({
    conversationId: "01K00000000000000000000060",
    kind: "channel",
    title: "默认频道",
    isDefault: true,
    isPinned: true,
    participantKind: null,
    participantId: null,
    ...overrides,
  });
}

function chatMessage(overrides: Partial<ChatMessageProfile> = {}): ChatMessageProfile {
  return {
    messageId: "01K00000000000000000000070",
    workspaceId: "01K00000000000000000000000",
    conversationId: "01K00000000000000000000060",
    authorMemberId: "01KMEMBER000000000000000000",
    body: "Hello workspace",
    mentionedMemberIds: [],
    status: "sent",
    createdAtMs: 1760000001000,
    updatedAtMs: 1760000001000,
    ...overrides,
  };
}

function readPosition(
  overrides: Partial<ConversationReadPositionProfile> = {},
): ConversationReadPositionProfile {
  return {
    workspaceId: "01K00000000000000000000000",
    conversationId: "01K00000000000000000000060",
    lastReadMessageId: "01K00000000000000000000070",
    lastReadAtMs: 1760000001000,
    updatedAtMs: 1760000001000,
    ...overrides,
  };
}

describe("App workspace entry", () => {
  it("opens to a usable workspace selection surface", async () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "orchlet" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "打开文件夹" }),
    ).toBeInTheDocument();
    expect(screen.getByText("选择一个文件夹开始或恢复工作区")).toBeInTheDocument();
    expect(screen.getByText("最近的工作区")).toBeInTheDocument();
    expect(screen.getByText("暂无最近工作区")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "打开文件夹" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "请在 Tauri 桌面应用中打开文件夹。",
    );
  });

  it("exposes accessible labels for icon-only shell actions", () => {
    render(<App />);

    expect(screen.getByLabelText("刷新最近工作区")).toBeInTheDocument();
    expect(screen.getByLabelText("打开设置")).toBeInTheDocument();
  });

  it("applies browser fallback theme and language updates without restart", async () => {
    const user = userEvent.setup();

    render(<App />);

    await user.click(await screen.findByRole("button", { name: "深色" }));
    expect(document.documentElement.dataset.theme).toBe("dark");

    await user.click(screen.getByRole("button", { name: "English" }));
    expect(document.documentElement.lang).toBe("en-US");
  });

  it("renders opened workspace state after successful metadata creation", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    expect(await screen.findByRole("heading", { name: "工作区已打开" })).toBeInTheDocument();
    expect(screen.getByText("orchlet-demo")).toBeInTheDocument();
    expect(screen.getByText("01K00000000000000000000000")).toBeInTheDocument();
    expect(screen.getByText("Schema v1")).toBeInTheDocument();
    expect(screen.getByText("可写模式")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开文件管理器" })).toBeInTheDocument();
  });

  it("loads conversations and creates then updates group membership", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
      permissions: {
        canMention: true,
        canRemove: true,
      },
    });
    const builder = memberProfile({
      memberId: "01KMEMBER000000000000000011",
      role: "member",
      displayName: "Builder",
      instanceLabel: "Builder",
      permissions: {
        canMention: true,
        canRemove: true,
      },
    });
    const createdGroup = conversationProfile({
      conversationId: "01K00000000000000000000061",
      kind: "group",
      title: "Review Room",
      unreadCount: 3,
      lastMessagePreview: "Draft ready",
      participantKind: null,
      participantId: null,
      members: [
        {
          memberId: reviewer.memberId,
          displayName: reviewer.displayName,
          instanceLabel: reviewer.instanceLabel,
        },
      ],
      lastActivityAtMs: 1760000002000,
      updatedAtMs: 1760000002000,
    });
    const updatedGroup = {
      ...createdGroup,
      members: [
        {
          memberId: builder.memberId,
          displayName: builder.displayName,
          instanceLabel: builder.instanceLabel,
        },
      ],
      updatedAtMs: 1760000003000,
      lastActivityAtMs: 1760000003000,
    };
    const listConversations = vi.fn(() =>
      Promise.resolve({ conversations: [defaultChannel()] }),
    );
    const createGroupConversation = vi.fn(() =>
      Promise.resolve({
        conversation: createdGroup,
        conversations: [defaultChannel(), createdGroup],
      }),
    );
    const updateGroupConversationMembers = vi.fn(() =>
      Promise.resolve({
        conversation: updatedGroup,
        conversations: [defaultChannel(), updatedGroup],
      }),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer, builder] }),
      },
      chatApi: {
        listConversations,
        createGroupConversation,
        updateGroupConversationMembers,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    expect(listConversations).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
    });
    expect(within(conversationPanel).getAllByText("默认频道").length).toBeGreaterThan(0);

    const createForm = within(conversationPanel).getByRole("form", { name: "新建群聊" });
    await user.type(within(createForm).getByLabelText("名称"), "Review Room");
    await user.click(within(createForm).getByLabelText("Reviewer"));
    await user.click(within(createForm).getByRole("button", { name: "创建群聊" }));

    expect(createGroupConversation).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      title: "Review Room",
      memberIds: [reviewer.memberId],
    });
    expect(await within(conversationPanel).findAllByText("Review Room")).not.toHaveLength(0);
    expect(within(conversationPanel).getByText("3")).toBeInTheDocument();
    expect(within(conversationPanel).getByText(/Draft ready/)).toBeInTheDocument();

    const updateForm = await within(conversationPanel).findByRole("form", { name: "群聊成员" });
    await user.click(within(updateForm).getByLabelText("Reviewer"));
    await user.click(within(updateForm).getByLabelText("Builder"));
    await user.click(within(updateForm).getByRole("button", { name: "更新成员" }));

    expect(updateGroupConversationMembers).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: createdGroup.conversationId,
      memberIds: [builder.memberId],
    });
    expect((await within(conversationPanel).findAllByText(/Builder/)).length).toBeGreaterThan(0);
  });

  it("updates pin mute and rename state in the conversation list and header", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel();
    let managedConversation = conversationProfile({
      conversationId: "01K00000000000000000000064",
      kind: "group",
      title: "Project Room",
      participantKind: null,
      participantId: null,
      members: [],
      lastActivityAtMs: 1760000002000,
      updatedAtMs: 1760000002000,
    });
    const updateConversationSettings = vi.fn((request: UpdateConversationSettingsRequest) => {
      managedConversation = {
        ...managedConversation,
        title: request.title ?? managedConversation.title,
        isPinned: request.isPinned ?? managedConversation.isPinned,
        isMuted: request.isMuted ?? managedConversation.isMuted,
        updatedAtMs: 1760000003000,
      };

      return Promise.resolve({
        conversation: managedConversation,
        conversations: [channel, managedConversation],
      } satisfies UpdateConversationSettingsResult);
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      chatApi: {
        listConversations: () =>
          Promise.resolve({ conversations: [channel, managedConversation] }),
        updateConversationSettings,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.click(within(conversationPanel).getByRole("button", { name: /Project Room/ }));
    await user.click(within(conversationPanel).getByRole("button", { name: "置顶" }));

    expect(updateConversationSettings).toHaveBeenLastCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: managedConversation.conversationId,
      title: null,
      isPinned: true,
      isMuted: null,
    });
    expect(await within(conversationPanel).findByRole("button", { name: "取消置顶" }))
      .toBeInTheDocument();

    await user.click(within(conversationPanel).getByRole("button", { name: "静音" }));
    expect(updateConversationSettings).toHaveBeenLastCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: managedConversation.conversationId,
      title: null,
      isPinned: null,
      isMuted: true,
    });
    expect(await within(conversationPanel).findByRole("button", { name: "取消静音" }))
      .toBeInTheDocument();

    const renameForm = within(conversationPanel).getByRole("form", { name: "重命名会话" });
    await user.clear(within(renameForm).getByLabelText("名称"));
    await user.type(within(renameForm).getByLabelText("名称"), "Renamed Room");
    await user.click(within(renameForm).getByRole("button", { name: "重命名" }));

    expect(updateConversationSettings).toHaveBeenLastCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: managedConversation.conversationId,
      title: "Renamed Room",
      isPinned: null,
      isMuted: null,
    });
    expect((await within(conversationPanel).findAllByText("Renamed Room")).length)
      .toBeGreaterThan(0);
    expect(await screen.findByRole("status")).toHaveTextContent("会话已更新");
  });

  it("clears messages, deletes non-default conversations and keeps default delete disabled", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const channel = defaultChannel();
    const managedConversation = conversationProfile({
      conversationId: "01K00000000000000000000065",
      kind: "private",
      title: "Project DM",
      participantKind: "member",
      participantId: "01KMEMBER000000000000000010",
      unreadCount: 1,
      lastMessagePreview: "Keep this local",
      lastActivityAtMs: 1760000002000,
      updatedAtMs: 1760000002000,
    });
    const message = chatMessage({
      conversationId: managedConversation.conversationId,
      body: "Keep this local",
    });
    const clearedConversation = {
      ...managedConversation,
      unreadCount: 0,
      lastMessagePreview: null,
      updatedAtMs: 1760000003000,
      lastActivityAtMs: 1760000003000,
    };
    const clearConversation = vi.fn(() =>
      Promise.resolve({
        conversation: clearedConversation,
        clearedMessageCount: 1,
        conversations: [clearedConversation, channel],
      } satisfies ClearConversationResult),
    );
    const deleteConversation = vi.fn(() =>
      Promise.resolve({
        deletedConversationId: managedConversation.conversationId,
        conversations: [channel],
      } satisfies DeleteConversationResult),
    );

    try {
      renderWorkspaceSelection({
        getWorkspaceSelectionStatus: () => Promise.resolve(status),
        pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
        chatApi: {
          listConversations: () =>
            Promise.resolve({ conversations: [managedConversation, channel] }),
          listMessages: (request) =>
            Promise.resolve({
              messages:
                request.conversationId === managedConversation.conversationId ? [message] : [],
              hasMore: false,
              nextBeforeMessageId: null,
              readPosition: null,
              conversation:
                request.conversationId === managedConversation.conversationId
                  ? managedConversation
                  : channel,
            }),
          updateReadPosition: () =>
            Promise.resolve({
              readPosition: readPosition({
                conversationId: managedConversation.conversationId,
                lastReadMessageId: message.messageId,
              }),
              conversation: {
                ...managedConversation,
                unreadCount: 0,
              },
            }),
          clearConversation,
          deleteConversation,
        },
      });

      await user.click(screen.getByRole("button", { name: "打开文件夹" }));

      const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
      await user.click(within(conversationPanel).getByRole("button", { name: /Project DM/ }));
      const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
      expect(await within(messageLog).findByText("Keep this local")).toBeInTheDocument();

      await user.click(within(conversationPanel).getByRole("button", { name: "清空消息" }));

      expect(confirm).toHaveBeenCalledWith("清空 Project DM 的本地消息？");
      expect(clearConversation).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
        conversationId: managedConversation.conversationId,
      });
      expect(await within(messageLog).findByText("暂无消息")).toBeInTheDocument();
      expect(await screen.findByRole("status")).toHaveTextContent("已清除 1 条本地消息");

      await user.click(within(conversationPanel).getByRole("button", { name: "删除会话" }));

      expect(confirm).toHaveBeenCalledWith("删除会话 Project DM？");
      expect(deleteConversation).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
        conversationId: managedConversation.conversationId,
      });
      expect(await screen.findByRole("status")).toHaveTextContent(
        managedConversation.conversationId,
      );
      expect(within(conversationPanel).queryByRole("button", { name: /Project DM/ }))
        .not.toBeInTheDocument();
      expect(within(conversationPanel).getByRole("button", { name: "删除会话" }))
        .toBeDisabled();
    } finally {
      confirm.mockRestore();
    }
  });

  it("loads message history, sends with visible status and loads older messages without blocking input", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel({
      unreadCount: 2,
      lastMessagePreview: "Latest note",
    });
    const olderMessage = chatMessage({
      messageId: "01K00000000000000000000071",
      body: "Earlier context",
      createdAtMs: 1760000000000,
      updatedAtMs: 1760000000000,
    });
    const latestMessage = chatMessage({
      messageId: "01K00000000000000000000072",
      body: "Latest note",
      createdAtMs: 1760000002000,
      updatedAtMs: 1760000002000,
    });
    const sentMessage = chatMessage({
      messageId: "01K00000000000000000000073",
      body: "Ship it",
      createdAtMs: 1760000003000,
      updatedAtMs: 1760000003000,
    });
    let resolveOlder!: (result: ListMessagesResult) => void;
    const olderPromise = new Promise<ListMessagesResult>((resolve) => {
      resolveOlder = resolve;
    });
    let resolveSend!: (result: SendMessageResult) => void;
    const sendPromise = new Promise<SendMessageResult>((resolve) => {
      resolveSend = resolve;
    });
    const listMessages = vi.fn((request: ListMessagesRequest) => {
      if (request.beforeMessageId) {
        return olderPromise;
      }

      return Promise.resolve({
        messages: [latestMessage],
        hasMore: true,
        nextBeforeMessageId: latestMessage.messageId,
        readPosition: null,
        conversation: channel,
      } satisfies ListMessagesResult);
    });
    const sendMessage = vi.fn(() => sendPromise);
    const updateReadPosition = vi.fn(() =>
      Promise.resolve({
        readPosition: readPosition({
          lastReadMessageId: latestMessage.messageId,
          lastReadAtMs: latestMessage.createdAtMs,
        }),
        conversation: {
          ...channel,
          unreadCount: 0,
        },
      } satisfies UpdateReadPositionResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages,
        sendMessage,
        updateReadPosition,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
    expect(within(messageLog).getByText("Latest note")).toBeInTheDocument();
    expect(updateReadPosition).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: channel.conversationId,
      messageId: latestMessage.messageId,
    });

    const composer = within(conversationPanel).getByLabelText("输入消息");
    await user.click(within(conversationPanel).getByRole("button", { name: "加载更早" }));
    expect(listMessages).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: channel.conversationId,
      beforeMessageId: latestMessage.messageId,
      limit: 30,
    });
    expect(composer).toBeEnabled();

    resolveOlder({
      messages: [olderMessage],
      hasMore: false,
      nextBeforeMessageId: null,
      readPosition: null,
      conversation: channel,
    });
    expect(await within(messageLog).findByText("Earlier context")).toBeInTheDocument();

    await user.type(composer, "Ship it");
    await user.click(within(conversationPanel).getByRole("button", { name: "发送" }));
    expect(await within(messageLog).findByText("sending")).toBeInTheDocument();
    expect(sendMessage).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: channel.conversationId,
      body: "Ship it",
      mentionedMemberIds: [],
    });

    resolveSend({
      message: sentMessage,
      conversation: {
        ...channel,
        unreadCount: 0,
        lastMessagePreview: "Ship it",
        lastActivityAtMs: sentMessage.createdAtMs,
        updatedAtMs: sentMessage.updatedAtMs,
      },
      readPosition: readPosition({
        lastReadMessageId: sentMessage.messageId,
        lastReadAtMs: sentMessage.createdAtMs,
      }),
    });

    expect((await within(messageLog).findAllByText("sent")).length).toBeGreaterThan(0);
    expect(within(messageLog).getByText("Ship it")).toBeInTheDocument();
  });

  it("inserts member mention suggestions as chips and sends structured mention ids", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
      permissions: {
        canMention: true,
        canRemove: true,
      },
    });
    const silent = memberProfile({
      memberId: "01KMEMBER000000000000000011",
      role: "member",
      displayName: "Silent",
      instanceLabel: "Silent",
      permissions: {
        canMention: false,
        canRemove: true,
      },
    });
    const channel = defaultChannel();
    const sendMessage = vi.fn((request: SendMessageRequest) =>
      Promise.resolve({
        message: chatMessage({
          messageId: "01K00000000000000000000074",
          body: request.body,
          mentionedMemberIds: request.mentionedMemberIds,
          createdAtMs: 1760000004000,
          updatedAtMs: 1760000004000,
        }),
        conversation: {
          ...channel,
          lastMessagePreview: request.body,
          lastActivityAtMs: 1760000004000,
          updatedAtMs: 1760000004000,
        },
        readPosition: readPosition({
          lastReadMessageId: "01K00000000000000000000074",
          lastReadAtMs: 1760000004000,
        }),
      } satisfies SendMessageResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer, silent] }),
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        sendMessage,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const composer = within(conversationPanel).getByLabelText("输入消息");
    await user.type(composer, "@Rev");

    const suggestions = await within(conversationPanel).findByRole("listbox", {
      name: "提及建议",
    });
    await user.click(within(suggestions).getByRole("option", { name: /Reviewer/ }));
    await user.type(composer, "please review");

    expect(within(conversationPanel).getByRole("button", { name: /Reviewer/ }))
      .toBeInTheDocument();
    expect(within(conversationPanel).queryByRole("option", { name: /Silent/ }))
      .not.toBeInTheDocument();

    await user.click(within(conversationPanel).getByRole("button", { name: "发送" }));

    expect(sendMessage).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: channel.conversationId,
      body: "@Reviewer please review",
      mentionedMemberIds: [reviewer.memberId],
    });
  });

  it("shows explicit MVP abandonment for @all without sending", async () => {
    const user = userEvent.setup();
    const sendMessage = vi.fn(() =>
      Promise.resolve({
        message: chatMessage(),
        conversation: defaultChannel(),
        readPosition: readPosition(),
      } satisfies SendMessageResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      chatApi: {
        sendMessage,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.type(within(conversationPanel).getByLabelText("输入消息"), "please review @all");

    expect(within(conversationPanel).getByText(/@all 暂未在 MVP 中启用/))
      .toBeInTheDocument();

    await user.click(within(conversationPanel).getByRole("button", { name: "发送" }));

    expect(sendMessage).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("@all 暂未启用");
  });

  it("supports emoji search, recent emoji cache and Escape close", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.click(within(conversationPanel).getByRole("button", { name: "Emoji" }));
    const emojiPanel = await within(conversationPanel).findByRole("dialog", {
      name: "Emoji 面板",
    });
    await user.type(within(emojiPanel).getByPlaceholderText("搜索 emoji"), "test");
    await user.click(within(emojiPanel).getByRole("button", { name: /测试/ }));

    const composer = within(conversationPanel).getByLabelText("输入消息");
    expect(composer).toHaveValue("🧪");

    await user.click(within(conversationPanel).getByRole("button", { name: "Emoji" }));
    expect(
      await within(conversationPanel).findByRole("button", { name: "最近 🧪" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(composer, { key: "Escape" });
    expect(within(conversationPanel).queryByRole("dialog", { name: "Emoji 面板" }))
      .not.toBeInTheDocument();
  });

  it("appends quick prompts and exposes removable attachment composition state", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const composer = within(conversationPanel).getByLabelText("输入消息");
    await user.type(composer, "Existing");
    await user.click(within(conversationPanel).getByRole("button", { name: "请评审" }));

    expect(composer).toHaveValue("Existing\n请评审这次变更并指出阻塞风险。");

    await user.click(within(conversationPanel).getByRole("button", { name: "图片入口" }));
    await user.click(within(conversationPanel).getByRole("button", { name: "路线图引用" }));

    expect(within(conversationPanel).getByRole("button", { name: /图片待附加/ }))
      .toBeInTheDocument();
    const roadmapChip = within(conversationPanel).getByRole("button", {
      name: /路线图待引用/,
    });
    expect(roadmapChip).toBeInTheDocument();

    await user.click(roadmapChip);
    expect(within(conversationPanel).queryByRole("button", { name: /路线图待引用/ }))
      .not.toBeInTheDocument();
  });

  it("keeps a failed message visible when send fails", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel();
    const sendMessage = vi.fn(() => Promise.reject(new Error("disk full")));

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        sendMessage,
        updateReadPosition: () =>
          Promise.resolve({
            readPosition: readPosition(),
            conversation: channel,
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.type(within(conversationPanel).getByLabelText("输入消息"), "Will fail");
    await user.click(within(conversationPanel).getByRole("button", { name: "发送" }));

    const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
    expect(await within(messageLog).findByText("failed")).toBeInTheDocument();
    expect(within(messageLog).getByText("Will fail")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("消息发送失败");
  });

  it("loads default owner and saves invited assistant instances without launching terminal", async () => {
    const user = userEvent.setup();
    const owner = memberProfile();
    const invitedAssistant = memberProfile({
      memberId: "01KMEMBER000000000000000001",
      role: "assistant",
      displayName: "Codex Reviewer",
      instanceIndex: 1,
      instanceLabel: "Codex Reviewer 1",
      status: "offline",
      runtime: {
        kind: "builtInAiCli",
        runtimeId: "gemini-cli",
        label: "Gemini CLI",
        command: "gemini",
      },
      permissions: {
        canMention: true,
        canRemove: true,
      },
      isolation: {
        sandboxed: true,
        unlimitedAccess: false,
      },
    });
    const secondInvitedAssistant = memberProfile({
      ...invitedAssistant,
      memberId: "01KMEMBER000000000000000002",
      instanceIndex: 2,
      instanceLabel: "Codex Reviewer 2",
    });
    const listMembers = vi
      .fn()
      .mockResolvedValueOnce({ members: [owner] })
      .mockResolvedValueOnce({ members: [owner, invitedAssistant, secondInvitedAssistant] });
    const inviteMember = vi.fn(() =>
      Promise.resolve({
        member: invitedAssistant,
        invitedMembers: [invitedAssistant, secondInvitedAssistant],
        members: [owner, invitedAssistant, secondInvitedAssistant],
      }),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: { listMembers, inviteMember },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const membersPanel = await screen.findByRole("region", { name: "Owner 与邀请成员" });
    expect(within(membersPanel).getByText("Workspace Owner")).toBeInTheDocument();
    expect(within(membersPanel).getByText("Owner · 在线 · 无运行时")).toBeInTheDocument();

    await user.type(within(membersPanel).getByLabelText("显示名称"), "Codex Reviewer");
    await user.selectOptions(within(membersPanel).getByLabelText("内置运行时"), "gemini-cli");
    fireEvent.change(within(membersPanel).getByLabelText("实例数量"), { target: { value: "2" } });
    await user.click(within(membersPanel).getByRole("button", { name: "发送邀请" }));

    expect(inviteMember).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      memberType: "assistant",
      displayName: "Codex Reviewer",
      runtime: {
        kind: "builtInAiCli",
        runtimeId: "gemini-cli",
        label: "Gemini CLI",
        command: "gemini",
      },
      instanceCount: 2,
      permissions: {
        canMention: true,
        canRemove: true,
      },
      isolation: {
        sandboxed: true,
        unlimitedAccess: false,
      },
    });
    expect(await within(membersPanel).findByText("Codex Reviewer 1")).toBeInTheDocument();
    expect(within(membersPanel).getByText("Codex Reviewer 2")).toBeInTheDocument();
    expect(within(membersPanel).getAllByText("Assistant · 离线 · Gemini CLI")).toHaveLength(2);
    expect(within(membersPanel).getAllByText((content) => content.includes("@可用"))).toHaveLength(2);
    expect(await screen.findByRole("status")).toHaveTextContent("终端不会自动启动");
  });

  it("shows member action menu and removes members according to permissions", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const owner = memberProfile();
    const assistant = memberProfile({
      memberId: "01KMEMBER000000000000000003",
      role: "assistant",
      displayName: "Agent",
      instanceLabel: "Agent 1",
      status: "offline",
      runtime: {
        kind: "builtInAiCli",
        runtimeId: "codex",
        label: "Codex CLI",
        command: "codex",
      },
      permissions: {
        canMention: true,
        canRemove: true,
      },
      isolation: {
        sandboxed: true,
        unlimitedAccess: false,
      },
    });
    const listMembers = vi
      .fn()
      .mockResolvedValueOnce({ members: [owner, assistant] })
      .mockResolvedValueOnce({ members: [owner] });
    const removeMember = vi.fn(() =>
      Promise.resolve({
        removedMemberId: assistant.memberId,
        members: [owner],
      }),
    );
    const openTerminal = vi.fn(() =>
      Promise.resolve(terminalOpenResult()),
    );
    const startPrivateConversation = vi.fn(() =>
      Promise.resolve({
        conversation: conversationProfile({
          conversationId: "01K00000000000000000000062",
          title: "Agent 1",
          participantKind: "member",
          participantId: assistant.memberId,
        }),
        created: true,
      } satisfies StartPrivateConversationResult),
    );

    try {
      renderWorkspaceSelection({
        getWorkspaceSelectionStatus: () => Promise.resolve(status),
        pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
        memberApi: { listMembers, removeMember },
        terminalApi: { openTerminal },
        chatApi: { startPrivateConversation },
      });

      await user.click(screen.getByRole("button", { name: "打开文件夹" }));

      const membersPanel = await screen.findByRole("region", { name: "Owner 与邀请成员" });
      expect(within(membersPanel).getByText("Agent 1")).toBeInTheDocument();
      expect(within(membersPanel).getByText((content) => content.includes("@可用"))).toBeInTheDocument();
      expect(within(membersPanel).getAllByText((content) => content.includes("沙盒 · 受限"))).toHaveLength(1);

      await user.click(screen.getByRole("button", { name: "打开终端" }));

      expect(openTerminal).toHaveBeenCalledWith();
      expect(await screen.findByRole("status")).toHaveTextContent("终端已打开");

      await user.click(screen.getByRole("button", { name: "Agent 1 操作" }));
      await user.click(screen.getByRole("menuitem", { name: "发送消息" }));

      expect(startPrivateConversation).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
        participantKind: "member",
        participantId: assistant.memberId,
      });
      expect(await screen.findByRole("status")).toHaveTextContent("私聊已创建");

      await user.click(screen.getByRole("button", { name: "Agent 1 操作" }));
      await user.click(screen.getByRole("menuitem", { name: "@成员" }));

      expect(await screen.findByRole("status")).toHaveTextContent("@Agent 1");

      await user.click(screen.getByRole("button", { name: "Agent 1 操作" }));
      await user.click(screen.getByRole("menuitem", { name: "打开终端" }));

      expect(openTerminal).toHaveBeenCalledWith({ memberId: assistant.memberId });
      expect(await screen.findByRole("status")).toHaveTextContent("成员终端已打开");

      await user.click(screen.getByRole("button", { name: "Agent 1 操作" }));
      await user.click(screen.getByRole("menuitem", { name: "移除成员" }));

      expect(confirm).toHaveBeenCalledWith("移除 Agent 1？");
      expect(removeMember).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
        memberId: assistant.memberId,
      });
      expect(await screen.findByRole("status")).toHaveTextContent("成员已移除");
    } finally {
      confirm.mockRestore();
    }
  });

  it("creates edits deletes contacts and starts private chat from a contact", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const owner = memberProfile();
    const adminMember = memberProfile({
      memberId: "01KMEMBER000000000000000004",
      role: "admin",
      displayName: "External Admin",
      instanceLabel: "External Admin",
      status: "offline",
      runtime: {
        kind: "none",
        runtimeId: null,
        label: null,
        command: null,
      },
      permissions: {
        canMention: true,
        canRemove: true,
      },
      isolation: {
        sandboxed: true,
        unlimitedAccess: false,
      },
    });
    const contact = contactProfile();
    const updatedContact = contactProfile({
      displayName: "External Admin Updated",
      contactKind: "contact",
      notes: null,
      sourceLabel: null,
      updatedAtMs: 1760000001000,
    });
    const listMembers = vi
      .fn()
      .mockResolvedValueOnce({ members: [owner] })
      .mockResolvedValueOnce({ members: [owner, adminMember] });
    const listContacts = vi
      .fn()
      .mockResolvedValueOnce({ contacts: [] })
      .mockResolvedValueOnce({ contacts: [contact] })
      .mockResolvedValueOnce({ contacts: [updatedContact] })
      .mockResolvedValueOnce({ contacts: [] });
    const createContact = vi.fn(() =>
      Promise.resolve({
        contact,
        contacts: [contact],
        adminMember,
      }),
    );
    const updateContact = vi.fn(() =>
      Promise.resolve({
        contact: updatedContact,
        contacts: [updatedContact],
      }),
    );
    const deleteContact = vi.fn(() =>
      Promise.resolve({
        deletedContactId: updatedContact.contactId,
        contacts: [],
      }),
    );
    const startPrivateConversation = vi.fn(() =>
      Promise.resolve({
        conversation: conversationProfile({
          conversationId: "01K00000000000000000000063",
          title: "External Admin",
          participantKind: "contact",
          participantId: contact.contactId,
        }),
        created: true,
      } satisfies StartPrivateConversationResult),
    );

    try {
      renderWorkspaceSelection({
        getWorkspaceSelectionStatus: () => Promise.resolve(status),
        pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
        memberApi: { listMembers },
        contactApi: { listContacts, createContact, updateContact, deleteContact },
        chatApi: { startPrivateConversation },
      });

      await user.click(screen.getByRole("button", { name: "打开文件夹" }));

      const contactsPanel = await screen.findByRole("region", {
        name: "联系人与管理员邀请",
      });

      await user.selectOptions(within(contactsPanel).getByLabelText("邀请类型"), "administrator");
      await user.type(within(contactsPanel).getByLabelText("显示名称"), "External Admin");
      await user.type(within(contactsPanel).getByLabelText("备注"), "Local administrator contact");
      await user.click(within(contactsPanel).getByRole("button", { name: "添加联系人" }));

      expect(createContact).toHaveBeenCalledWith({
        displayName: "External Admin",
        contactKind: "administrator",
        notes: "Local administrator contact",
        sourceLabel: "管理员/联系人邀请",
        workspaceId: "01K00000000000000000000000",
      });
      expect(await screen.findByText("本地管理员 · adminContactInvite")).toBeInTheDocument();
      expect(await screen.findByText("Admin · 离线 · 无运行时")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "发送消息" }));

      expect(startPrivateConversation).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
        participantKind: "contact",
        participantId: contact.contactId,
      });
      expect(await screen.findByText("最近私聊：External Admin")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "编辑" }));
      await user.clear(within(contactsPanel).getByLabelText("显示名称"));
      await user.type(within(contactsPanel).getByLabelText("显示名称"), "External Admin Updated");
      await user.selectOptions(within(contactsPanel).getByLabelText("邀请类型"), "contact");
      await user.clear(within(contactsPanel).getByLabelText("备注"));
      await user.click(within(contactsPanel).getByRole("button", { name: "保存联系人" }));

      expect(updateContact).toHaveBeenCalledWith({
        contactId: contact.contactId,
        displayName: "External Admin Updated",
        contactKind: "contact",
        notes: null,
        sourceLabel: "联系人区域",
      });
      expect(await screen.findByText("External Admin Updated")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "删除" }));

      expect(confirm).toHaveBeenCalledWith("删除联系人 External Admin Updated？");
      expect(deleteContact).toHaveBeenCalledWith({ contactId: updatedContact.contactId });
      expect(await screen.findByRole("status")).toHaveTextContent("已有私聊记录不会被静默删除");
    } finally {
      confirm.mockRestore();
    }
  });

  it("renders read-only fallback details after workspace-local metadata cannot be written", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () =>
        Promise.resolve(
          openedWorkspaceResult({
            workspace: {
              ...openedWorkspaceResult().workspace!,
              accessMode: "readOnly",
              fallbackState: {
                reason: "无法创建 .orchlet/workspace.json。 无法创建 .orchlet 工作区目录。",
                fallbackPath: "/app-data/workspace-fallbacks.json",
                limitedActions: ["工作区本地元数据写入", "依赖 .orchlet 的后续本地设置写入"],
                userAction: "授予该工作区目录写权限后重新打开。",
              },
            },
          }),
        ),
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    expect(await screen.findByText("只读模式")).toBeInTheDocument();
    expect(screen.getByText("工作区本地数据只读")).toBeInTheDocument();
    expect(screen.getByText(/工作区本地元数据写入/)).toBeInTheDocument();
    expect(screen.getByText(/workspace-fallbacks\.json/)).toBeInTheDocument();
    expect(screen.getByText("授予该工作区目录写权限后重新打开。")).toBeInTheDocument();
  });

  it("surfaces synchronized context controls and opens requested window modes", async () => {
    const user = userEvent.setup();
    const onPreferencesChange = vi.fn(() => Promise.resolve());
    const onOpenWindowMode = vi.fn(() => Promise.resolve());
    const openTerminal = vi.fn(() => Promise.resolve(terminalOpenResult()));

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(null),
    });

    expect(screen.queryByLabelText("窗口上下文")).not.toBeInTheDocument();

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <WorkspaceSelectionPage
          api={{
            getWorkspaceSelectionStatus: () => Promise.resolve(status),
            listRecentWorkspaces: () => Promise.resolve([]),
            pickAndOpenWorkspace: () => Promise.resolve(null),
            openWorkspace: () => Promise.reject(new Error("unused")),
            openWorkspaceInFileManager: () => Promise.reject(new Error("unused")),
          }}
          windowContext={windowContextSnapshot()}
          onPreferencesChange={onPreferencesChange}
          onOpenWindowMode={onOpenWindowMode}
          terminalApi={{ openTerminal }}
        />
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "浅色" }));
    await user.click(screen.getByRole("button", { name: "打开终端窗口" }));

    expect(onPreferencesChange).toHaveBeenCalledWith({ theme: "light" });
    expect(openTerminal).toHaveBeenCalledWith();
    expect(onOpenWindowMode).not.toHaveBeenCalledWith("terminal");
  });

  it("runs data integrity validation and renders failed affected paths", async () => {
    const user = userEvent.setup();
    const validate = vi.fn(() =>
      Promise.resolve({
        report: dataIntegrityReport({
          checks: [
            {
              checkId: "workspace.registry.load_validate",
              category: "workspaceRegistry",
              status: "failed",
              severity: "error",
              message: "工作区 registry 不是有效 JSON。",
              affectedPaths: ["/app-data/workspace-registry.json"],
              userAction: "请先备份或修复应用数据中的 workspace-registry.json 后重试。",
              details: "invalid json",
            },
          ],
          totalChecks: 1,
          failedChecks: 1,
          hasFailures: true,
        }),
      }),
    );

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <WorkspaceSelectionPage
          api={{
            getWorkspaceSelectionStatus: () => Promise.resolve(status),
            listRecentWorkspaces: () => Promise.resolve([]),
            pickAndOpenWorkspace: () => Promise.resolve(null),
            openWorkspace: () => Promise.reject(new Error("unused")),
            openWorkspaceInFileManager: () => Promise.reject(new Error("unused")),
          }}
          windowContext={windowContextSnapshot({
            activeWorkspace: openedWorkspaceResult().workspace,
          })}
          integrityApi={{ validate }}
        />
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "运行数据验证" }));

    expect(validate).toHaveBeenCalledWith({ workspaceRoot: "/tmp/orchlet-demo" });
    expect(await screen.findByText("发现需要处理的数据问题")).toBeInTheDocument();
    expect(screen.getByText("工作区 registry 不是有效 JSON。")).toBeInTheDocument();
    expect(screen.getByText("/app-data/workspace-registry.json")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("数据验证发现问题");
  });

  it("opens the current workspace in the system file manager", async () => {
    const user = userEvent.setup();
    const openWorkspaceInFileManager = vi.fn(() =>
      Promise.resolve({ path: "/tmp/orchlet-demo", opened: true }),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      openWorkspaceInFileManager,
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开文件管理器" }));

    expect(openWorkspaceInFileManager).toHaveBeenCalledWith("/tmp/orchlet-demo");
    expect(await screen.findByRole("status")).toHaveTextContent("已请求打开文件管理器");
  });

  it("shows recoverable feedback when file manager opening fails", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      openWorkspaceInFileManager: () =>
        Promise.reject({
          code: "workspace.fileManager.openFailed",
          message: "无法打开系统文件管理器。",
          severity: "warning",
          recoverable: true,
          userAction: "请检查系统文件管理器是否可用，或手动打开该路径。",
          details: "/tmp/orchlet-demo: opener unavailable",
          correlationId: null,
        }),
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开文件管理器" }));

    expect(await screen.findByRole("status")).toHaveTextContent("无法打开系统文件管理器。");
    expect(screen.getByRole("status")).toHaveTextContent("手动打开该路径");
  });

  it("keeps the current page unchanged when directory selection is cancelled", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(null),
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    expect(screen.queryByText("工作区已打开")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders recent workspaces sorted from the API and filters by name or path", async () => {
    const user = userEvent.setup();
    const openWorkspace = vi.fn(() => Promise.resolve(openedWorkspaceResult()));

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () =>
        Promise.resolve({ ...status, recentWorkspaceCount: 2 }),
      listRecentWorkspaces: () =>
        Promise.resolve([
          {
            projectId: "01K00000000000000000000002",
            path: "/work/newer",
            name: "newer",
            firstOpenedAtMs: 1760000000000,
            lastOpenedAtMs: 1760000002000,
          },
          {
            projectId: "01K00000000000000000000001",
            path: "/work/alpha",
            name: "alpha",
            firstOpenedAtMs: 1760000000000,
            lastOpenedAtMs: 1760000001000,
          },
        ]),
      pickAndOpenWorkspace: () => Promise.resolve(null),
      openWorkspace,
    });

    expect(await screen.findByText("newer")).toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("搜索文件夹..."), "alpha");

    expect(screen.queryByText("newer")).not.toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "打开 alpha" }));

    expect(openWorkspace).toHaveBeenCalledWith("/work/alpha");
  });

  it("shows conflict modal and retries with move resolution", async () => {
    const user = userEvent.setup();
    const openWorkspace = vi
      .fn()
      .mockResolvedValueOnce({
        status: "conflict",
        workspace: null,
        conflict: {
          projectId: "01K00000000000000000000001",
          name: "alpha",
          existingPath: "/work/original",
          selectedPath: "/work/moved",
        },
      } satisfies OpenWorkspaceResult)
      .mockResolvedValueOnce(openedWorkspaceResult());

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () =>
        Promise.resolve({ ...status, recentWorkspaceCount: 1 }),
      listRecentWorkspaces: () =>
        Promise.resolve([
          {
            projectId: "01K00000000000000000000001",
            path: "/work/moved",
            name: "alpha",
            firstOpenedAtMs: 1760000000000,
            lastOpenedAtMs: 1760000001000,
          },
        ]),
      pickAndOpenWorkspace: () => Promise.resolve(null),
      openWorkspace,
    });

    await user.click(await screen.findByRole("button", { name: "打开 alpha" }));

    const dialog = await screen.findByRole("dialog", { name: "工作区位置变化" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("/work/original")).toBeInTheDocument();
    expect(within(dialog).getByText("/work/moved")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "移动了" }));

    expect(openWorkspace).toHaveBeenLastCalledWith("/work/moved", {
      conflictResolution: "move",
    });
  });

  it("shows recoverable toast when recent workspaces fail to load", async () => {
    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      listRecentWorkspaces: () =>
        Promise.reject({
          code: "workspace.registry.invalidJson",
          message: "工作区 registry 不是有效 JSON。",
          severity: "error",
          recoverable: true,
          userAction: "请先备份或修复应用数据中的 workspace-registry.json 后重试。",
          details: "workspace-registry.json",
          correlationId: null,
        }),
      pickAndOpenWorkspace: () => Promise.resolve(null),
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "工作区 registry 不是有效 JSON。",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "请先备份或修复应用数据中的 workspace-registry.json 后重试。",
    );
  });

  it("shows recoverable toast for invalid metadata errors", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () =>
        Promise.reject({
          code: "workspace.metadata.invalidJson",
          message: "工作区元数据不是有效 JSON。",
          severity: "error",
          recoverable: true,
          userAction: "请先备份或修复 .orchlet/workspace.json 后重试。",
          details: ".orchlet/workspace.json",
          correlationId: null,
        }),
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    expect(await screen.findByRole("status")).toHaveTextContent("工作区元数据不是有效 JSON。");
    expect(screen.getByRole("status")).toHaveTextContent(
      "请先备份或修复 .orchlet/workspace.json 后重试。",
    );
  });
});
