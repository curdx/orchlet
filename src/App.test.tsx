import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App, { NotificationPreviewPage } from "./App";
import { WorkspaceSelectionPage } from "./pages/workspace-selection";
import { useToastStore } from "./shared/ui";
import type {
  ChatMessageProfile,
  ClearConversationRequest,
  ClearConversationResult,
  ConversationReadPositionProfile,
  DataIntegrityReport,
  DiagnosticsExportResult,
  DiagnosticsExportRequest,
  DiagnosticsOverviewResult,
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
  DispatchChatMessageRequest,
  DispatchChatMessageResult,
  DispatchQueueResumeRequest,
  DispatchQueueResumeResult,
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
  NotificationIgnoreAllRequest,
  NotificationIgnoreAllResult,
  NotificationNavigationAction,
  NotificationNavigationPendingResult,
  NotificationNavigationRequest,
  NotificationNavigationResult,
  NotificationPreferencesSnapshot,
  NotificationPreferencesUpdateRequest,
  NotificationPreferencesUpdateResult,
  NotificationUnreadConversation,
  NotificationUnreadSummary,
  NotificationUnreadUpdateRequest,
  NotificationUnreadUpdateResult,
  OpenWorkspaceResult,
  ProfileAvatarSnapshot,
  ProfileSettingsSnapshot,
  ProfileStatus,
  RecentWorkspaceEntry,
  RemoveMemberRequest,
  RemoveMemberResult,
  SendMessageRequest,
  SendMessageAndDispatchRequest,
  SendMessageAndDispatchResult,
  SendMessageResult,
  CreateRoadmapGoalResult,
  CreateRoadmapTaskResult,
  DeleteRoadmapGoalResult,
  DeleteRoadmapTaskResult,
  ImportLocalSkillFolderResult,
  DeleteSkillResult,
  LinkWorkspaceSkillResult,
  ListRoadmapGoalsResult,
  ListRoadmapTasksResult,
  ListWorkspaceSkillLinksResult,
  OpenSkillFolderResult,
  RoadmapGoalEntry,
  RoadmapTaskEntry,
  StartPrivateConversationRequest,
  StartPrivateConversationResult,
  SkillLibraryEntry,
  SkillLibraryListResult,
  ChatTerminalOutputPreferencesSnapshot,
  TerminalOutputEventPayload,
  TerminalOpenResult,
  TerminalStatusEventPayload,
  UpdateContactRequest,
  UpdateContactResult,
  UpdateConversationSettingsRequest,
  UpdateConversationSettingsResult,
  UpdateGroupConversationMembersRequest,
  UpdateRoadmapGoalResult,
  UpdateRoadmapTaskResult,
  UpdateMemberStatusRequest,
  UpdateMemberStatusResult,
  UpdateProfileSettingsResult,
  UploadProfileAvatarResult,
  SelectProfileAvatarPresetResult,
  ResetProfileAvatarResult,
  ResetShortcutPreferencesRequest,
  ResetShortcutPreferencesResult,
  DeleteUploadedProfileAvatarResult,
  ShortcutKeymapProfile,
  ShortcutPreferencesSnapshot,
  TerminalConfigurationSnapshot,
  UpdateGroupConversationMembersResult,
  UpdateReadPositionRequest,
  UpdateReadPositionResult,
  UpdateMemberProfileRequest,
  UpdateMemberProfileResult,
  UpdateShortcutPreferencesRequest,
  UpdateShortcutPreferencesResult,
  UpdateChatTerminalOutputPreferencesRequest,
  UpdateChatTerminalOutputPreferencesResult,
  UpdateTerminalConfigurationRequest,
  UpdateTerminalConfigurationResult,
  ResetTerminalConfigurationResult,
  WindowContextSnapshot,
  WorkspaceSelectionStatus,
  UnlinkWorkspaceSkillResult,
  WorkspaceSkillLinkEntry,
} from "./contracts/generated";
import type {
  ClearWorkspaceChatDataRequest,
  ClearWorkspaceChatDataResult,
  RepairWorkspaceChatDataRequest,
  RepairWorkspaceChatDataResult,
} from "./contracts/generated/chat";

const status: WorkspaceSelectionStatus = {
  windowMode: "workspaceSelection",
  canOpenWorkspace: true,
  recentWorkspaceCount: 0,
};

beforeEach(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => undefined;
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => undefined;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => undefined;
  }
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
    updateMemberProfile: (request: UpdateMemberProfileRequest) => Promise<UpdateMemberProfileResult>;
    updateMemberStatus: (request: UpdateMemberStatusRequest) => Promise<UpdateMemberStatusResult>;
  }>;
  terminalApi?: Partial<{
    openTerminal: (request?: {
      memberId?: string | null;
      attachCurrent?: boolean;
    }) => Promise<TerminalOpenResult>;
    subscribeOutput: (
      handler: (event: TerminalOutputEventPayload) => void,
    ) => Promise<() => void>;
    subscribeStatus: (
      handler: (event: TerminalStatusEventPayload) => void,
    ) => Promise<() => void>;
  }>;
  terminalDispatchApi?: Partial<{
    dispatchChatMessage: (
      request: DispatchChatMessageRequest,
    ) => Promise<DispatchChatMessageResult>;
    resumeMemberDispatchQueue: (
      request: DispatchQueueResumeRequest,
    ) => Promise<DispatchQueueResumeResult>;
  }>;
  notificationApi?: Partial<{
    getNotificationPreferences: () => Promise<{ preferences: NotificationPreferencesSnapshot }>;
    updateNotificationPreferences: (
      request: NotificationPreferencesUpdateRequest,
    ) => Promise<NotificationPreferencesUpdateResult>;
    updateUnreadSummary: (
      request: NotificationUnreadUpdateRequest,
    ) => Promise<NotificationUnreadUpdateResult>;
    ignoreAllUnread: (request: NotificationIgnoreAllRequest) => Promise<NotificationIgnoreAllResult>;
    getPendingNavigation: () => Promise<NotificationNavigationPendingResult>;
    dispatchNavigation: (
      request: NotificationNavigationRequest,
    ) => Promise<NotificationNavigationResult>;
    subscribeNavigation: (
      handler: (action: NotificationNavigationAction) => void,
    ) => Promise<() => void>;
  }>;
  diagnosticsApi?: Partial<{
    getOverview: (request: {
      workspaceId: string;
      cursor: string | null;
      limit: number | null;
    }) => Promise<DiagnosticsOverviewResult>;
    generateExport: (request: {
      workspaceId: string;
      cursor: string | null;
      maxEvents: number | null;
      includeSections: Array<
        | "runs"
        | "events"
        | "validationReports"
        | "consistencySummaries"
        | "appMetadata"
        | "additionalContext"
      >;
      additionalContext: Array<{ key: string; value: string }>;
    }) => Promise<DiagnosticsExportResult>;
  }>;
  skillsApi?: Partial<{
    listSkills: () => Promise<SkillLibraryListResult>;
    importLocalFolder: () => Promise<ImportLocalSkillFolderResult | null>;
    openSkillFolder: (skillId: string) => Promise<OpenSkillFolderResult>;
    deleteSkill: (skillId: string, workspaceRoot: string | null) => Promise<DeleteSkillResult>;
    listWorkspaceLinks: (workspaceRoot: string) => Promise<ListWorkspaceSkillLinksResult>;
    linkWorkspaceSkill: (
      workspaceRoot: string,
      skillId: string,
    ) => Promise<LinkWorkspaceSkillResult>;
    unlinkWorkspaceSkill: (
      workspaceRoot: string,
      skillId: string,
    ) => Promise<UnlinkWorkspaceSkillResult>;
  }>;
  roadmapApi?: Partial<{
    listTasks: (workspaceRoot: string) => Promise<ListRoadmapTasksResult>;
    listGoals: (workspaceRoot: string) => Promise<ListRoadmapGoalsResult>;
    createTask: (
      workspaceRoot: string,
      input: { title: string; detail: string | null; status: "pending" | "inProgress" | "done" },
    ) => Promise<CreateRoadmapTaskResult>;
    updateTask: (
      workspaceRoot: string,
      taskId: string,
      input: {
        title?: string | null;
        detail?: string | null;
        status?: "pending" | "inProgress" | "done" | null;
        sortOrder?: number | null;
      },
    ) => Promise<UpdateRoadmapTaskResult>;
    deleteTask: (workspaceRoot: string, taskId: string) => Promise<DeleteRoadmapTaskResult>;
    createGoal: (
      workspaceRoot: string,
      input: { title: string; taskIds: string[] },
    ) => Promise<CreateRoadmapGoalResult>;
    updateGoal: (
      workspaceRoot: string,
      goalId: string,
      input: { title?: string | null; taskIds?: string[] | null; sortOrder?: number | null },
    ) => Promise<UpdateRoadmapGoalResult>;
    deleteGoal: (workspaceRoot: string, goalId: string) => Promise<DeleteRoadmapGoalResult>;
  }>;
  settingsApi?: Partial<{
    getProfileSettings: () => Promise<{ profile: ProfileSettingsSnapshot }>;
    updateProfileSettings: (input: {
      displayName: string;
      timezone: string;
      status: ProfileStatus;
      statusMessage: string;
    }) => Promise<UpdateProfileSettingsResult>;
    selectAvatarImage: () => Promise<string | null>;
    uploadProfileAvatar: (sourcePath: string) => Promise<UploadProfileAvatarResult>;
    selectProfileAvatarPreset: (presetId: string) => Promise<SelectProfileAvatarPresetResult>;
    resetProfileAvatar: () => Promise<ResetProfileAvatarResult>;
    deleteUploadedProfileAvatar: () => Promise<DeleteUploadedProfileAvatarResult>;
    getShortcutPreferences: () => Promise<{ preferences: ShortcutPreferencesSnapshot }>;
    updateShortcutPreferences: (
      input: UpdateShortcutPreferencesRequest,
    ) => Promise<UpdateShortcutPreferencesResult>;
    resetShortcutPreferences: (
      input: ResetShortcutPreferencesRequest,
    ) => Promise<ResetShortcutPreferencesResult>;
    getChatTerminalOutputPreferences: () => Promise<{
      preferences: ChatTerminalOutputPreferencesSnapshot;
    }>;
    updateChatTerminalOutputPreferences: (
      input: UpdateChatTerminalOutputPreferencesRequest,
    ) => Promise<UpdateChatTerminalOutputPreferencesResult>;
    getTerminalConfiguration: () => Promise<{ configuration: TerminalConfigurationSnapshot }>;
    updateTerminalConfiguration: (
      input: UpdateTerminalConfigurationRequest,
    ) => Promise<UpdateTerminalConfigurationResult>;
    resetTerminalConfiguration: () => Promise<ResetTerminalConfigurationResult>;
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
    repairWorkspaceData: (
      request: RepairWorkspaceChatDataRequest,
    ) => Promise<RepairWorkspaceChatDataResult>;
    clearWorkspaceData: (
      request: ClearWorkspaceChatDataRequest,
    ) => Promise<ClearWorkspaceChatDataResult>;
    deleteConversation: (request: DeleteConversationRequest) => Promise<DeleteConversationResult>;
    sendMessage: (request: SendMessageRequest) => Promise<SendMessageResult>;
    sendMessageAndDispatch: (
      request: SendMessageAndDispatchRequest,
    ) => Promise<SendMessageAndDispatchResult>;
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
  parityWorkbench?: boolean;
  parityView?: "chat" | "friends" | "workspaces" | "store" | "plugins" | "settings";
  windowContext?: WindowContextSnapshot | null;
  onPreferencesChange?: (update: {
    theme?: WindowContextSnapshot["preferences"]["theme"] | null;
    language?: WindowContextSnapshot["preferences"]["language"] | null;
  }) => Promise<void>;
}) {
  const {
    memberApi,
    notificationApi,
    diagnosticsApi,
    skillsApi,
    roadmapApi,
    settingsApi,
    terminalApi,
    terminalDispatchApi,
    contactApi,
    chatApi,
    parityWorkbench,
    parityView,
    windowContext,
    onPreferencesChange,
    ...workspaceApi
  } = api;
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
        parityWorkbench={parityWorkbench}
        parityView={parityView}
        windowContext={windowContext}
        onPreferencesChange={onPreferencesChange}
        memberApi={{
          listMembers: () => Promise.resolve({ members: [] }),
          inviteMember: () => Promise.reject(new Error("inviteMember mock missing")),
          removeMember: () => Promise.reject(new Error("removeMember mock missing")),
          updateMemberProfile: () =>
            Promise.reject(new Error("updateMemberProfile mock missing")),
          updateMemberStatus: () =>
            Promise.reject(new Error("updateMemberStatus mock missing")),
          ...memberApi,
        }}
        terminalApi={{
          openTerminal: () => Promise.reject(new Error("openTerminal mock missing")),
          subscribeOutput: () => Promise.resolve(() => undefined),
          subscribeStatus: () => Promise.resolve(() => undefined),
          ...terminalApi,
        }}
        notificationApi={{
          getNotificationPreferences: () =>
            Promise.resolve({ preferences: notificationPreferencesSnapshot() }),
          updateNotificationPreferences: (request) =>
            Promise.resolve({
              preferences: notificationPreferencesSnapshot({
                desktopNotificationsEnabled:
                  request.desktopNotificationsEnabled ?? undefined,
                soundEnabled: request.soundEnabled ?? undefined,
                mentionsOnly: request.mentionsOnly ?? undefined,
                messagePreviewEnabled: request.messagePreviewEnabled ?? undefined,
                dndEnabled: request.dndEnabled ?? undefined,
                dndStartMinutes: request.dndStartMinutes ?? undefined,
                dndEndMinutes: request.dndEndMinutes ?? undefined,
              }),
            }),
          updateUnreadSummary: (request) =>
            Promise.resolve({ summary: notificationSummary({ request }) }),
          ignoreAllUnread: () =>
            Promise.resolve({
              summary: notificationSummary(),
              ignoredCount: 0,
            }),
          getPendingNavigation: () => Promise.resolve({ action: null }),
          dispatchNavigation: (request: NotificationNavigationRequest) =>
            Promise.resolve({ action: notificationNavigationAction(request) }),
          subscribeNavigation: () => Promise.resolve(() => undefined),
          ...notificationApi,
        }}
        diagnosticsApi={{
          getOverview: () => Promise.resolve(diagnosticsOverviewResult()),
          generateExport: () => Promise.resolve(diagnosticsExportResult()),
          ...diagnosticsApi,
        }}
        skillsApi={{
          listSkills: () => Promise.resolve({ skills: [] }),
          importLocalFolder: () => Promise.reject(new Error("importLocalFolder mock missing")),
          openSkillFolder: () => Promise.reject(new Error("openSkillFolder mock missing")),
          deleteSkill: () => Promise.reject(new Error("deleteSkill mock missing")),
          listWorkspaceLinks: () => Promise.resolve({ skills: [] }),
          linkWorkspaceSkill: () => Promise.reject(new Error("linkWorkspaceSkill mock missing")),
          unlinkWorkspaceSkill: () =>
            Promise.reject(new Error("unlinkWorkspaceSkill mock missing")),
          ...skillsApi,
        }}
        roadmapApi={{
          listTasks: () => Promise.resolve({ tasks: [] }),
          listGoals: () => Promise.resolve({ goals: [] }),
          createTask: () => Promise.reject(new Error("createTask mock missing")),
          updateTask: () => Promise.reject(new Error("updateTask mock missing")),
          deleteTask: () => Promise.reject(new Error("deleteTask mock missing")),
          createGoal: () => Promise.reject(new Error("createGoal mock missing")),
          updateGoal: () => Promise.reject(new Error("updateGoal mock missing")),
          deleteGoal: () => Promise.reject(new Error("deleteGoal mock missing")),
          ...roadmapApi,
        }}
        settingsApi={{
          getProfileSettings: () => Promise.resolve({ profile: profileSettingsSnapshot() }),
          updateProfileSettings: () =>
            Promise.reject(new Error("updateProfileSettings mock missing")),
          selectAvatarImage: () => Promise.resolve(null),
          uploadProfileAvatar: () =>
            Promise.reject(new Error("uploadProfileAvatar mock missing")),
          selectProfileAvatarPreset: () =>
            Promise.reject(new Error("selectProfileAvatarPreset mock missing")),
          resetProfileAvatar: () =>
            Promise.reject(new Error("resetProfileAvatar mock missing")),
          deleteUploadedProfileAvatar: () =>
            Promise.reject(new Error("deleteUploadedProfileAvatar mock missing")),
          getShortcutPreferences: () =>
            Promise.resolve({ preferences: shortcutPreferencesSnapshot() }),
          updateShortcutPreferences: (input) =>
            Promise.resolve({
              preferences: shortcutPreferencesSnapshot({
                profile: input.profile ?? undefined,
                shortcutsEnabled: input.shortcutsEnabled ?? undefined,
                shortcutHintsEnabled: input.shortcutHintsEnabled ?? undefined,
                disabledActionIds: input.disabledActionIds ?? undefined,
              }),
            }),
          resetShortcutPreferences: (input) =>
            Promise.resolve({
              preferences: shortcutPreferencesSnapshot({
                profile: input.profile ?? undefined,
              }),
            }),
          getChatTerminalOutputPreferences: () =>
            Promise.resolve({ preferences: chatTerminalOutputPreferencesSnapshot() }),
          updateChatTerminalOutputPreferences: (input) =>
            Promise.resolve({
              preferences: chatTerminalOutputPreferencesSnapshot({
                displayMode: input.displayMode,
                updatedAtMs: 1760000091000,
              }),
            }),
          getTerminalConfiguration: () =>
            Promise.resolve({ configuration: terminalConfigurationSnapshot() }),
          updateTerminalConfiguration: (input) =>
            Promise.resolve({
              configuration: terminalConfigurationSnapshot({
                builtInCliEntries: input.builtInCliEntries,
                customCliEntries: input.customCliEntries,
                customTerminalEntries: input.customTerminalEntries,
                defaultTerminalId: input.defaultTerminalId,
                updatedAtMs: 1760000081000,
              }),
            }),
          resetTerminalConfiguration: () =>
            Promise.resolve({
              configuration: terminalConfigurationSnapshot({
                customCliEntries: [],
                customTerminalEntries: [],
                defaultTerminalId: null,
                updatedAtMs: 1760000082000,
              }),
            }),
          ...settingsApi,
        }}
        terminalDispatchApi={{
          dispatchChatMessage: () =>
            Promise.reject(new Error("dispatchChatMessage mock missing")),
          resumeMemberDispatchQueue: () =>
            Promise.reject(new Error("resumeMemberDispatchQueue mock missing")),
          ...terminalDispatchApi,
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
          repairWorkspaceData: () =>
            Promise.reject(new Error("repairWorkspaceData mock missing")),
          clearWorkspaceData: () =>
            Promise.reject(new Error("clearWorkspaceData mock missing")),
          deleteConversation: () => Promise.reject(new Error("deleteConversation mock missing")),
          sendMessage: () => Promise.reject(new Error("sendMessage mock missing")),
          sendMessageAndDispatch: () =>
            Promise.reject(new Error("sendMessageAndDispatch mock missing")),
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

function workspaceWindowContext(
  language: WindowContextSnapshot["preferences"]["language"] = "zh-CN",
): WindowContextSnapshot {
  return windowContextSnapshot({
    currentWindow: {
      label: "main",
      mode: "main",
    },
    activeWorkspace: openedWorkspaceResult().workspace,
    preferences: {
      theme: "system",
      language,
    },
  });
}

function notificationPreviewSnapshot(
  overrides: Partial<WindowContextSnapshot> = {},
): WindowContextSnapshot {
  return windowContextSnapshot({
    currentWindow: {
      label: "notification-preview",
      mode: "notificationPreview",
    },
    activeWorkspace: openedWorkspaceResult().workspace,
    ...overrides,
  });
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
      cols: 120,
      rows: 30,
      snapshot: {
        lastSeq: 0,
        text: "",
        truncated: false,
        updatedAtMs: null,
      },
      exitReason: null,
      createdAtMs: 1760000000000,
      updatedAtMs: 1760000000001,
    },
    ...overrides,
  };
}

function terminalOutputEvent(
  overrides: Partial<TerminalOutputEventPayload> = {},
): TerminalOutputEventPayload {
  return {
    schemaVersion: 1,
    terminalSessionId: "01KTERMINAL00000000000020",
    workspaceId: "01K00000000000000000000000",
    memberId: null,
    seq: 1,
    chunk: "ready\n",
    kind: "stdout",
    emittedAtMs: 1760000004000,
    ...overrides,
  };
}

function terminalStatusEvent(
  overrides: Partial<TerminalStatusEventPayload> = {},
): TerminalStatusEventPayload {
  return {
    schemaVersion: 1,
    terminalSessionId: "01KTERMINAL00000000000020",
    workspaceId: "01K00000000000000000000000",
    memberId: null,
    title: "Workspace terminal",
    status: "running",
    cols: 120,
    rows: 30,
    snapshot: {
      lastSeq: 0,
      text: "",
      truncated: false,
      updatedAtMs: null,
    },
    exitReason: null,
    emittedAtMs: 1760000004000,
    ...overrides,
  };
}

function notificationSummary({
  request,
  overrides = {},
}: {
  request?: NotificationUnreadUpdateRequest;
  overrides?: Partial<Omit<NotificationUnreadSummary, "conversations">> & {
    conversations?: Array<
      Omit<NotificationUnreadConversation, "terminalMemberId"> &
        Partial<Pick<NotificationUnreadConversation, "terminalMemberId">>
    >;
  };
} = {}): NotificationUnreadSummary {
  const conversations = (request?.conversations ?? overrides.conversations ?? []).map(
    (conversation) => ({
      terminalMemberId: null,
      ...conversation,
    }),
  );
  const totalUnreadCount =
    overrides.totalUnreadCount ??
    conversations.reduce((total, conversation) => total + conversation.unreadCount, 0);

  return {
    schemaVersion: 1,
    workspaceId: request?.workspaceId ?? overrides.workspaceId ?? null,
    workspaceName: request?.workspaceName ?? overrides.workspaceName ?? null,
    totalUnreadCount,
    conversations,
    tray: overrides.tray ?? {
      unreadCount: totalUnreadCount,
      badgeLabel: totalUnreadCount > 0 ? String(totalUnreadCount) : null,
      hasUnread: totalUnreadCount > 0,
    },
    updatedAtMs: overrides.updatedAtMs ?? 1760000005000,
    sourceWindowLabel: request?.sourceWindowLabel ?? overrides.sourceWindowLabel ?? null,
  };
}

function notificationNavigationAction(
  request: NotificationNavigationRequest,
  overrides: Partial<NotificationNavigationAction> = {},
): NotificationNavigationAction {
  return {
    schemaVersion: 1,
    kind: request.kind,
    workspaceId: request.workspaceId,
    conversationId: request.conversationId,
    memberId: request.memberId,
    updatedAtMs: overrides.updatedAtMs ?? 1760000006000,
    sourceWindowLabel: request.sourceWindowLabel,
    ...overrides,
  };
}

function skillLibraryEntry(overrides: Partial<SkillLibraryEntry> = {}): SkillLibraryEntry {
  return {
    schemaVersion: 1,
    skillId: "01K00000000000000000000100",
    name: "Local Review",
    description: "Review helper",
    source: "localFolder",
    sourcePath: "/fixtures/skills/local-review",
    manifestPath: "/fixtures/skills/local-review/SKILL.md",
    importedAtMs: 1760000010000,
    updatedAtMs: 1760000010000,
    lastValidatedAtMs: 1760000010000,
    ...overrides,
  };
}

function workspaceSkillLinkEntry(
  overrides: Partial<WorkspaceSkillLinkEntry> = {},
): WorkspaceSkillLinkEntry {
  return {
    schemaVersion: 1,
    skillId: "01K00000000000000000000100",
    name: "Local Review",
    description: "Review helper",
    sourcePath: "/fixtures/skills/local-review",
    manifestPath: "/fixtures/skills/local-review/SKILL.md",
    linkPath:
      "/fixtures/workspaces/orchlet-demo/.orchlet/skills/local-review-01K00000000000000000000100",
    linkMode: "symlink",
    unavailableReason: null,
    linkedAtMs: 1760000020000,
    updatedAtMs: 1760000020000,
    ...overrides,
  };
}

function roadmapTaskEntry(overrides: Partial<RoadmapTaskEntry> = {}): RoadmapTaskEntry {
  return {
    schemaVersion: 1,
    taskId: "01K00000000000000000000200",
    title: "Ship MVP",
    detail: "Complete the first release track",
    status: "pending",
    sortOrder: 0,
    createdAtMs: 1760000030000,
    updatedAtMs: 1760000030000,
    ...overrides,
  };
}

function roadmapGoalEntry(overrides: Partial<RoadmapGoalEntry> = {}): RoadmapGoalEntry {
  return {
    schemaVersion: 1,
    goalId: "01K00000000000000000000300",
    title: "First release",
    taskIds: ["01K00000000000000000000200"],
    sortOrder: 0,
    createdAtMs: 1760000040000,
    updatedAtMs: 1760000040000,
    ...overrides,
  };
}

function profileSettingsSnapshot(
  overrides: Partial<ProfileSettingsSnapshot> = {},
): ProfileSettingsSnapshot {
  return {
    schemaVersion: 1,
    displayName: "Owner",
    timezone: "UTC",
    status: "online",
    statusMessage: null,
    avatar: profileAvatarSnapshot(),
    createdAtMs: 1760000050000,
    updatedAtMs: 1760000050000,
    ...overrides,
  };
}

function notificationPreferencesSnapshot(
  overrides: Partial<NotificationPreferencesSnapshot> = {},
): NotificationPreferencesSnapshot {
  return {
    schemaVersion: 1,
    desktopNotificationsEnabled: true,
    soundEnabled: true,
    mentionsOnly: false,
    messagePreviewEnabled: true,
    dndEnabled: false,
    dndStartMinutes: 22 * 60,
    dndEndMinutes: 8 * 60,
    permission: {
      state: "unavailable",
      message: "系统通知权限适配器当前不可用。",
      userAction: "当前版本仍会保存本地通知偏好；启用系统通知需要后续平台适配。",
    },
    createdAtMs: 1760000060000,
    updatedAtMs: 1760000060000,
    ...overrides,
  };
}

function shortcutPreferencesSnapshot(
  overrides: Partial<ShortcutPreferencesSnapshot> = {},
): ShortcutPreferencesSnapshot {
  const profile = overrides.profile ?? "default";
  const disabledActionIds = overrides.disabledActionIds ?? [];

  return {
    schemaVersion: 1,
    profile,
    shortcutsEnabled: true,
    shortcutHintsEnabled: true,
    disabledActionIds,
    bindings: shortcutBindingsForProfile(profile, disabledActionIds),
    createdAtMs: 1760000070000,
    updatedAtMs: 1760000070000,
    ...overrides,
  };
}

function chatTerminalOutputPreferencesSnapshot(
  overrides: Partial<ChatTerminalOutputPreferencesSnapshot> = {},
): ChatTerminalOutputPreferencesSnapshot {
  return {
    schemaVersion: 1,
    displayMode: "stream",
    createdAtMs: 1760000090000,
    updatedAtMs: 1760000090000,
    ...overrides,
  };
}

function terminalConfigurationSnapshot(
  overrides: Partial<TerminalConfigurationSnapshot> = {},
): TerminalConfigurationSnapshot {
  const builtInCliEntries =
    overrides.builtInCliEntries ?? [
      { runtimeId: "claude-code", label: "Claude Code", command: "claude" },
      { runtimeId: "codex", label: "Codex CLI", command: "codex" },
      { runtimeId: "gemini-cli", label: "Gemini CLI", command: "gemini" },
      { runtimeId: "opencode", label: "OpenCode", command: "opencode" },
      { runtimeId: "qwen-code", label: "Qwen Code", command: "qwen" },
    ];

  return {
    schemaVersion: 1,
    builtInCliEntries,
    customCliEntries: [],
    customTerminalEntries: [],
    defaultTerminalId: null,
    createdAtMs: 1760000080000,
    updatedAtMs: 1760000080000,
    ...overrides,
  };
}

function shortcutBindingsForProfile(
  profile: ShortcutKeymapProfile,
  disabledActionIds: string[] = [],
): ShortcutPreferencesSnapshot["bindings"] {
  const chatSendKeys = profile === "vscode" ? ["Ctrl+Enter", "Meta+Enter"] : ["Enter"];
  const specs = [
    ["chat.send", "发送聊天消息", chatSendKeys, true, null],
    ["chat.newline", "聊天输入换行", ["Shift+Enter"], true, null],
    ["chat.emoji.close", "关闭 Emoji 面板", ["Esc"], true, null],
    ["mention.insert", "插入提及建议", ["Enter", "Tab"], true, null],
    ["conversation.focus", "聚焦会话列表", ["Tab"], true, null],
    ["terminal.find.next", "终端查找下一个", ["Enter"], true, null],
    ["terminal.find.previous", "终端查找上一个", ["Shift+Enter"], true, null],
    ["terminal.find.close", "关闭终端查找", ["Esc"], true, null],
    ["settings.save", "保存设置", ["Enter"], true, null],
    ["notification.viewAll", "通知查看全部", ["Tab", "Enter"], true, null],
    ["notification.ignoreAll", "通知忽略全部", ["Tab", "Enter"], true, null],
    ["notification.openTerminal", "通知打开终端", ["Tab", "Enter"], true, null],
    [
      "app.globalOpenSettings",
      "全局打开设置",
      ["Ctrl+,"],
      false,
      "当前版本尚未注册 OS 全局快捷键。",
    ],
  ] as const;

  return specs.map(([actionId, label, keys, available, unavailableReason]) => ({
    actionId,
    label,
    keys: [...keys],
    enabled: available && !disabledActionIds.includes(actionId),
    available,
    unavailableReason,
  }));
}

function profileAvatarSnapshot(
  overrides: Partial<ProfileAvatarSnapshot> = {},
): ProfileAvatarSnapshot {
  return {
    kind: "placeholder",
    presetId: null,
    uploadId: null,
    sourceFileName: null,
    contentType: null,
    sizeBytes: null,
    libraryRelativePath: null,
    updatedAtMs: 1760000050000,
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

function diagnosticsOverviewResult(
  overrides: Partial<DiagnosticsOverviewResult> = {},
): DiagnosticsOverviewResult {
  return {
    workspaceId: "01K00000000000000000000000",
    generatedAtMs: 1760000010000,
    runs: [
      {
        runId: "01K00000000000000000000800",
        workspaceId: "01K00000000000000000000000",
        status: "active",
        reason: "support handoff",
        initiatedBy: "test",
        outcome: null,
        summary: null,
        startedAtMs: 1760000008000,
        completedAtMs: null,
        updatedAtMs: 1760000008000,
      },
    ],
    keyEvents: [
      {
        eventId: "01K00000000000000000000810",
        runId: "01K00000000000000000000800",
        workspaceId: "01K00000000000000000000000",
        scope: "terminal",
        eventName: "terminal.snapshot.stale",
        severity: "warning",
        correlations: {
          workspaceId: "01K00000000000000000000000",
          conversationId: null,
          messageId: null,
          memberId: null,
          terminalSessionId: "01K000000000000000000000AA",
          terminalTabId: null,
          windowLabel: null,
          dispatchId: null,
        },
        metadata: [{ key: "latestSeq", value: "3" }],
        recordedAtMs: 1760000009000,
      },
    ],
    consistencySummary: {
      terminalIssueCount: 1,
      chatIssueCount: 0,
      severityCounts: {
        info: 0,
        warning: 1,
        error: 0,
      },
      recentIssueCodes: ["terminal.snapshot.stale"],
      recommendedNextActions: ["重新 attach 受影响终端会话，并检查终端快照/退出状态。"],
    },
    validationSummary: {
      availability: "notAvailable",
      status: null,
      message: "当前诊断导出不持久化数据完整性报告；请从数据验证面板重新运行。",
      reportId: null,
      generatedAtMs: null,
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      skippedChecks: 0,
    },
    hasMore: false,
    nextCursor: null,
    ...overrides,
  };
}

function diagnosticsExportResult(
  overrides: Partial<DiagnosticsExportResult> = {},
): DiagnosticsExportResult {
  return {
    package: {
      schemaVersion: 1,
      generatedAtMs: 1760000010000,
      workspaceRef: "workspace:01K00000000000000000000000",
      runs: diagnosticsOverviewResult().runs,
      keyEvents: diagnosticsOverviewResult().keyEvents,
      consistencySummary: diagnosticsOverviewResult().consistencySummary,
      validationSummary: diagnosticsOverviewResult().validationSummary,
      appMetadata: [
        { key: "schemaVersion", value: "1" },
        { key: "generator", value: "orchlet.diagnostics.export" },
        { key: "localOnly", value: "true" },
      ],
      additionalContext: [],
    },
    redactionSummary: {
      redactedFields: 1,
      omittedFields: 0,
      warningCount: 1,
      truncatedSections: [],
    },
    warnings: [
      {
        section: "runs",
        field: "reason",
        reason: "privatePath",
        message: "本机私有路径已脱敏。",
      },
    ],
    hasMore: true,
    nextCursor: "25",
    ...overrides,
  };
}

function memberProfile(overrides: Partial<MemberProfile> = {}): MemberProfile {
  const base: MemberProfile = {
    memberId: "01KMEMBER000000000000000000",
    workspaceId: "01K00000000000000000000000",
    role: "owner",
    displayName: "Workspace Owner",
    avatar: "css:orbit",
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
    avatar: "css:orbit",
    status: "offline",
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

function repairWorkspaceChatDataResult(
  overrides: Partial<RepairWorkspaceChatDataResult> = {},
): RepairWorkspaceChatDataResult {
  return {
    workspaceId: "01K00000000000000000000000",
    affectedScope: "workspace-chat",
    repairedCount: 2,
    failedCount: 0,
    skippedCount: 0,
    repairedItems: [
      {
        affectedScope: "message_mentions",
        label: "孤立消息提及",
        status: "repaired",
        count: 2,
        details: "已删除不再指向有效消息的提及行。",
        followUpAction: null,
      },
    ],
    failedItems: [],
    skippedItems: [],
    conversations: [defaultChannel()],
    followUpAction: "已刷新会话列表；如仍有异常，请再次运行数据验证。",
    completedAtMs: 1760000015000,
    ...overrides,
  };
}

function clearWorkspaceChatDataResult(
  overrides: Partial<ClearWorkspaceChatDataResult> = {},
): ClearWorkspaceChatDataResult {
  return {
    workspaceId: "01K00000000000000000000000",
    affectedScope: "workspace-chat",
    clearedMessageCount: 3,
    clearedMentionCount: 1,
    clearedReadPositionCount: 1,
    clearedDispatchCount: 1,
    conversations: [defaultChannel()],
    followUpAction: "已清空当前工作区本地聊天消息；成员、会话和设置已保留。",
    completedAtMs: 1760000016000,
    ...overrides,
  };
}

describe("App workspace entry", () => {
  it("opens to a usable workspace selection surface", async () => {
    render(<App />);

    expect(screen.getByText("Workspaces - golutra")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "工作区选择" })).toBeInTheDocument();
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

  it("exposes the Golutra titlebar and workspace entry action", () => {
    render(<App />);

    expect(screen.getByText("Workspaces - golutra")).toBeInTheDocument();
    expect(screen.getByLabelText("打开文件夹")).toBeInTheDocument();
  });

  it("opens the shell context menu from the global host", () => {
    render(<App />);

    fireEvent.contextMenu(screen.getByRole("button", { name: "打开文件夹" }), {
      clientX: 120,
      clientY: 120,
    });

    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "复制" })).toBeDisabled();
    expect(within(menu).getByRole("menuitem", { name: "粘贴" })).toBeDisabled();
    expect(within(menu).getByRole("menuitem", { name: "全选" })).toBeDisabled();
  });

  it("applies browser fallback theme and language from saved preferences", async () => {
    window.localStorage.setItem(
      "orchlet.appPreferences",
      JSON.stringify({ theme: "dark", language: "en-US" }),
    );

    render(<App />);

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(document.documentElement.lang).toBe("en-US");
    expect(await screen.findByRole("button", { name: "Open Folder" })).toBeInTheDocument();
    expect(screen.getByText("Pick a folder to start or resume a workspace")).toBeInTheDocument();
    expect(screen.getByText("Open a folder to start your first workspace.")).toBeInTheDocument();
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

  it("routes opened workspaces into the Golutra-style chat workbench when parity shell is enabled", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      parityWorkbench: true,
      memberApi: { listMembers: () => Promise.resolve({ members: [memberProfile()] }) },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [defaultChannel()] }),
        listMessages: () =>
          Promise.resolve({
            messages: [chatMessage()],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: defaultChannel(),
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const workbench = await screen.findByRole("region", { name: "聊天工作台" });
    expect(within(workbench).getAllByText("orchlet-demo").length).toBeGreaterThan(0);
    expect(await within(workbench).findByText("Hello workspace")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "工作区已打开" })).not.toBeInTheDocument();
  });

  it("shows workspace members in the parity chat member rail when a channel has no member summaries", async () => {
    const user = userEvent.setup();
    const owner = memberProfile();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
      avatar: "css:mint",
      status: "working",
      permissions: {
        canMention: true,
        canRemove: true,
      },
    });
    const channel = defaultChannel({ members: [] });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      parityWorkbench: true,
      memberApi: { listMembers: () => Promise.resolve({ members: [owner, reviewer] }) },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages: () =>
          Promise.resolve({
            messages: [],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const workbench = await screen.findByRole("region", { name: "聊天工作台" });
    expect((await within(workbench).findAllByText("Reviewer")).length).toBeGreaterThan(0);
    expect(within(workbench).getByTitle("工作中")).toBeInTheDocument();
    expect(within(workbench).queryByText("暂无成员")).not.toBeInTheDocument();
  });

  it("resolves a private member conversation from participant metadata when member summaries are empty", async () => {
    const user = userEvent.setup();
    const owner = memberProfile();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
      avatar: "css:ember",
      status: "online",
      permissions: {
        canMention: true,
        canRemove: true,
      },
    });
    const privateConversation = conversationProfile({
      conversationId: "01KPRIVATE000000000000001",
      title: "Outdated title",
      kind: "private",
      participantKind: "member",
      participantId: reviewer.memberId,
      members: [],
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      parityWorkbench: true,
      memberApi: { listMembers: () => Promise.resolve({ members: [owner, reviewer] }) },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [privateConversation] }),
        listMessages: () =>
          Promise.resolve({
            messages: [],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: privateConversation,
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const workbench = await screen.findByRole("region", { name: "聊天工作台" });
    expect((await within(workbench).findAllByText("Reviewer")).length).toBeGreaterThan(0);
    expect(within(workbench).getAllByText("Owner").length).toBeGreaterThan(0);
    expect(within(workbench).queryByText("Outdated title")).not.toBeInTheDocument();
    expect(within(workbench).queryByText("暂无成员")).not.toBeInTheDocument();
  });

  it("localizes parity chat workbench and invite menu from Chinese preferences", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      parityWorkbench: true,
      memberApi: { listMembers: () => Promise.resolve({ members: [] }) },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages: () =>
          Promise.resolve({
            messages: [],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const workbench = await screen.findByRole("region", { name: "聊天工作台" });
    expect(within(workbench).getByText("频道")).toBeInTheDocument();
    expect(within(workbench).getByText("私信")).toBeInTheDocument();
    expect(within(workbench).getByText("默认工作区频道")).toBeInTheDocument();
    expect(within(workbench).getAllByText("成员").length).toBeGreaterThan(0);
    expect(await within(workbench).findByText("暂无消息")).toBeInTheDocument();
    expect(within(workbench).getByPlaceholderText("消息")).toBeInTheDocument();
    expect(within(workbench).getByText("总结最新讨论")).toBeInTheDocument();
    expect(within(workbench).queryByText("0/1200")).not.toBeInTheDocument();

    expect(within(workbench).queryByText("CHANNELS")).not.toBeInTheDocument();
    expect(within(workbench).queryByText("DIRECT MESSAGES")).not.toBeInTheDocument();
    expect(within(workbench).queryByText("Default workspace channel")).not.toBeInTheDocument();
    expect(within(workbench).queryByText("Summarize the latest discussion")).not.toBeInTheDocument();

    await user.click(within(workbench).getByRole("button", { name: "添加" }));

    expect(await within(workbench).findByText("邀请加入服务器")).toBeInTheDocument();
    expect(within(workbench).getByText("生成唯一邀请链接")).toBeInTheDocument();
    expect(within(workbench).getByText("以管理员身份邀请")).toBeInTheDocument();
    expect(within(workbench).getByText("以助手身份邀请")).toBeInTheDocument();
    expect(within(workbench).getByText("普通成员")).toBeInTheDocument();
    expect(within(workbench).queryByText("Invite to Server")).not.toBeInTheDocument();
    expect(within(workbench).queryByText("Invite as Admin")).not.toBeInTheDocument();
  });

  it("localizes member invite modal and submits the selected Codex runtime", async () => {
    const user = userEvent.setup();
    const inviteMember = vi.fn((request: InviteMemberRequest) => {
      const invited = memberProfile({
        memberId: "01KCODEXMEMBER0000000000000",
        role: request.memberType,
        displayName: request.displayName,
        instanceLabel: request.displayName,
        runtime: request.runtime,
        permissions: request.permissions ?? undefined,
        isolation: request.isolation ?? undefined,
      });

      return Promise.resolve({
        member: invited,
        invitedMembers: [invited],
        members: [invited],
      } satisfies InviteMemberResult);
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      parityWorkbench: true,
      memberApi: {
        listMembers: () => Promise.resolve({ members: [] }),
        inviteMember,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const workbench = await screen.findByRole("region", { name: "聊天工作台" });
    await user.click(within(workbench).getByRole("button", { name: "添加" }));
    await user.click(await within(workbench).findByRole("button", { name: /普通成员/ }));

    expect(await screen.findByRole("form", { name: "邀请成员" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "以成员身份邀请" })).toBeInTheDocument();
    expect(screen.getByText("选择要加入工作区的 AI 模型")).toBeInTheDocument();
    expect(screen.getByText("实例数量")).toBeInTheDocument();
    expect(screen.getByText("无限制模式")).toBeInTheDocument();
    expect(screen.getByText("沙盒环境")).toBeInTheDocument();
    expect(screen.queryByText("Invite as Member")).not.toBeInTheDocument();
    expect(screen.queryByText("Select an AI model to join the workspace")).not.toBeInTheDocument();
    expect(screen.queryByText("Send Invitation")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Codex" }));
    await user.click(screen.getByRole("button", { name: "发送邀请" }));

    await waitFor(() =>
      expect(inviteMember).toHaveBeenCalledWith(
        expect.objectContaining({
          memberType: "member",
          displayName: "Codex",
          runtime: expect.objectContaining({
            kind: "builtInAiCli",
            runtimeId: "codex",
            label: "Codex",
            command: "codex",
          }),
        }),
      ),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("成员已邀请");
    expect(screen.getByRole("status")).toHaveTextContent("Codex 已保存为成员。");
    expect(screen.getByRole("status")).not.toHaveTextContent("Member invited");
  });

  it("shows read-only fallback inside the parity chat workbench", async () => {
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
      parityWorkbench: true,
      memberApi: { listMembers: () => Promise.resolve({ members: [memberProfile()] }) },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const workbench = await screen.findByRole("region", { name: "聊天工作台" });
    expect(within(workbench).getByText("工作区本地数据只读")).toBeInTheDocument();
    expect(within(workbench).getByText(/无法创建 \.orchlet\/workspace\.json/)).toBeInTheDocument();
    expect(screen.queryByText("只读模式")).not.toBeInTheDocument();
  });

  it("uses the Golutra-style conversation menu in the parity chat workbench", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const channel = defaultChannel();
    let projectRoom = conversationProfile({
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
      projectRoom = {
        ...projectRoom,
        title: request.title ?? projectRoom.title,
        isPinned: request.isPinned ?? projectRoom.isPinned,
        isMuted: request.isMuted ?? projectRoom.isMuted,
      };

      return Promise.resolve({
        conversation: projectRoom,
        conversations: [channel, projectRoom],
      } satisfies UpdateConversationSettingsResult);
    });
    const clearConversation = vi.fn(() =>
      Promise.resolve({
        conversation: {
          ...projectRoom,
          unreadCount: 0,
          lastMessagePreview: null,
        },
        clearedMessageCount: 2,
        conversations: [channel, projectRoom],
      } satisfies ClearConversationResult),
    );
    const deleteConversation = vi.fn(() =>
      Promise.resolve({
        deletedConversationId: projectRoom.conversationId,
        conversations: [channel],
      } satisfies DeleteConversationResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      parityWorkbench: true,
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel, projectRoom] }),
        updateConversationSettings,
        clearConversation,
        deleteConversation,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    const workbench = await screen.findByRole("region", { name: "聊天工作台" });

    await user.click(within(workbench).getByRole("button", { name: "Project Room 的操作" }));
    await user.click(within(workbench).getByRole("menuitem", { name: "置顶" }));

    expect(updateConversationSettings).toHaveBeenLastCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: projectRoom.conversationId,
      title: null,
      isPinned: true,
      isMuted: null,
    });

    await user.click(within(workbench).getByRole("button", { name: "Project Room 的操作" }));
    await user.click(within(workbench).getByRole("menuitem", { name: "修改群聊名称" }));
    await user.clear(within(workbench).getByLabelText("群聊名称"));
    await user.type(within(workbench).getByLabelText("群聊名称"), "Renamed Room");
    await user.click(within(workbench).getByRole("button", { name: "保存" }));

    expect(updateConversationSettings).toHaveBeenLastCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: projectRoom.conversationId,
      title: "Renamed Room",
      isPinned: null,
      isMuted: null,
    });

    await user.click(within(workbench).getByRole("button", { name: "Renamed Room 的操作" }));
    await user.click(within(workbench).getByRole("menuitem", { name: "消息免打扰" }));

    expect(updateConversationSettings).toHaveBeenLastCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: projectRoom.conversationId,
      title: null,
      isPinned: null,
      isMuted: true,
    });

    await user.click(within(workbench).getByRole("button", { name: "Renamed Room 的操作" }));
    await user.click(within(workbench).getByRole("menuitem", { name: "清空聊天记录" }));

    await waitFor(() =>
      expect(clearConversation).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
        conversationId: projectRoom.conversationId,
      }),
    );

    await user.click(within(workbench).getByRole("button", { name: "Renamed Room 的操作" }));
    await user.click(within(workbench).getByRole("menuitem", { name: "删除群聊" }));

    await waitFor(() =>
      expect(deleteConversation).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
        conversationId: projectRoom.conversationId,
      }),
    );
    expect(confirm).toHaveBeenCalledWith("清空 Renamed Room 的本地消息？");
    expect(confirm).toHaveBeenCalledWith("删除会话 Renamed Room？");
    confirm.mockRestore();
  });

  it("uses parity chat input overlays for prompts emoji mentions and attachments", async () => {
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
    const channel = defaultChannel({
      members: [
        {
          memberId: reviewer.memberId,
          displayName: reviewer.displayName,
          instanceLabel: reviewer.instanceLabel,
        },
      ],
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      parityWorkbench: true,
      memberApi: { listMembers: () => Promise.resolve({ members: [reviewer] }) },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages: () =>
          Promise.resolve({
            messages: [],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
      },
      roadmapApi: {
        listTasks: () => Promise.resolve({ tasks: [roadmapTaskEntry({ title: "Parity QA" })] }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    const workbench = await screen.findByRole("region", { name: "聊天工作台" });
    const input = within(workbench).getByPlaceholderText("消息");

    await user.click(
      within(workbench).getByRole("button", { name: "总结最新讨论" }),
    );
    expect(input).toHaveValue("总结最新讨论");

    await user.click(within(workbench).getByRole("button", { name: "打开表情面板" }));
    await user.click(within(workbench).getByRole("button", { name: "grinning face 😀" }));
    expect(input).toHaveValue("总结最新讨论😀");

    await user.click(within(workbench).getByRole("button", { name: "提及成员" }));
    expect(input).toHaveValue("总结最新讨论😀 @Reviewer ");
    expect(within(workbench).getByLabelText("消息编辑状态")).toHaveTextContent(
      "@Reviewer",
    );

    await user.click(within(workbench).getByRole("button", { name: "添加图片附件" }));
    expect(within(workbench).getByLabelText("消息编辑状态")).toHaveTextContent(
      "图片待附加",
    );

    await user.click(within(workbench).getByRole("button", { name: "添加路线图引用" }));
    await user.click(within(workbench).getByRole("button", { name: /Parity QA/ }));
    expect(within(workbench).getByLabelText("消息编辑状态")).toHaveTextContent(
      "Parity QA",
    );
  });

  it("renders settings parity avatar menu and exact keybind availability badges", async () => {
    const user = userEvent.setup();
    const uploadedProfile = profileSettingsSnapshot({
      avatar: profileAvatarSnapshot({
        kind: "uploaded",
        uploadId: "01KAVATARUPLOAD000000000001",
        sourceFileName: "dana.png",
        contentType: "image/png",
        sizeBytes: 3,
        libraryRelativePath: "avatars/uploads/01KAVATARUPLOAD000000000001.png",
        previewDataUrl: "data:image/png;base64,cG5n",
      }),
    });
    const selectProfileAvatarPreset = vi.fn((presetId: string) =>
      Promise.resolve({
        profile: profileSettingsSnapshot({
          avatar: profileAvatarSnapshot({ kind: "preset", presetId }),
          updatedAtMs: 1760000055000,
        }),
      } satisfies SelectProfileAvatarPresetResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      windowContext: workspaceWindowContext("en-US"),
      parityWorkbench: true,
      parityView: "settings",
      settingsApi: {
        getProfileSettings: () => Promise.resolve({ profile: uploadedProfile }),
        getShortcutPreferences: () =>
          Promise.resolve({
            preferences: shortcutPreferencesSnapshot({
              profile: "vscode",
              disabledActionIds: ["chat.send"],
            }),
          }),
        selectProfileAvatarPreset,
      },
    });

    const settings = await screen.findByRole("region", { name: "Settings" });

    await user.click(within(settings).getByRole("button", { name: "Change avatar" }));
    const avatarMenu = await within(settings).findByRole("menu");
    expect(within(avatarMenu).getByText("Uploads")).toBeInTheDocument();
    expect(within(avatarMenu).getByRole("button", { name: "Delete uploaded avatar" })).toBeInTheDocument();

    await user.click(within(avatarMenu).getByRole("menuitem", { name: "Select Forest avatar preset" }));

    expect(selectProfileAvatarPreset).toHaveBeenCalledWith("forest");

    const keybinds = within(settings).getByRole("region", { name: "Keybinds" });
    expect(within(keybinds).getByText("Disabled")).toBeInTheDocument();
    expect(within(keybinds).getByText("Unavailable")).toBeInTheDocument();
    expect(within(keybinds).getByText("Ctrl+Enter / Meta+Enter")).toBeInTheDocument();
    expect(
      within(keybinds).getByText("当前版本尚未注册 OS 全局快捷键。"),
    ).toBeInTheDocument();

    await user.click(within(keybinds).getByRole("combobox", { name: "Profile" }));
    await user.click(await screen.findByRole("option", { name: "Default" }));
    expect(within(keybinds).queryByText("Ctrl+Enter / Meta+Enter")).not.toBeInTheDocument();
    expect(within(keybinds).getAllByText("Enter").length).toBeGreaterThan(0);
  });

  it("localizes settings parity from preferences and dispatches language changes", async () => {
    const user = userEvent.setup();
    const onPreferencesChange = vi.fn(() => Promise.resolve());

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      windowContext: workspaceWindowContext("zh-CN"),
      onPreferencesChange,
      parityWorkbench: true,
      parityView: "settings",
    });

    const settings = await screen.findByRole("region", { name: "设置" });
    expect(within(settings).getByRole("heading", { name: "偏好设置" })).toBeInTheDocument();
    expect(within(settings).getByRole("region", { name: "语言" })).toBeInTheDocument();
    expect(within(settings).getByRole("region", { name: "外观" })).toBeInTheDocument();
    expect(within(settings).getByText("中文（简体）")).toBeInTheDocument();
    expect(within(settings).getByText("深色")).toBeInTheDocument();

    await user.click(within(settings).getByRole("button", { name: /英文（美国）/ }));

    expect(onPreferencesChange).toHaveBeenCalledWith({ language: "en-US" });
  });

  it("uses settings parity custom member and terminal card flows for terminal configuration", async () => {
    const user = userEvent.setup();
    const updateTerminalConfiguration = vi.fn((request: UpdateTerminalConfigurationRequest) =>
      Promise.resolve({
        configuration: terminalConfigurationSnapshot({
          builtInCliEntries: request.builtInCliEntries,
          customCliEntries: request.customCliEntries,
          customTerminalEntries: request.customTerminalEntries,
          defaultTerminalId: request.defaultTerminalId,
          updatedAtMs: 1760000083000,
        }),
      } satisfies UpdateTerminalConfigurationResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      windowContext: workspaceWindowContext("en-US"),
      parityWorkbench: true,
      parityView: "settings",
      settingsApi: { updateTerminalConfiguration },
    });

    const settings = await screen.findByRole("region", { name: "Settings" });
    const memberRegion = within(settings).getByRole("region", { name: "Default Member" });

    await user.click(within(memberRegion).getByRole("button", { name: "Custom CLI" }));
    await user.type(within(memberRegion).getByLabelText("Member Name"), "Local Reviewer");
    await user.type(within(memberRegion).getByPlaceholderText("reviewer --stdio"), "reviewer --stdio");
    await user.click(within(memberRegion).getByRole("button", { name: "Confirm custom member" }));

    await user.click(within(memberRegion).getByRole("button", { name: "Actions for Local Reviewer" }));
    await user.click(within(memberRegion).getByRole("menuitem", { name: "Edit" }));
    const memberCommand = within(memberRegion).getByPlaceholderText("reviewer --stdio");
    await user.clear(memberCommand);
    await user.type(memberCommand, "reviewer --json");
    await user.click(within(memberRegion).getByRole("button", { name: "Confirm custom member" }));

    await user.click(within(memberRegion).getByRole("button", { name: "Custom Terminal" }));
    await user.type(within(memberRegion).getByLabelText("Terminal Name"), "Workspace Zsh");
    await user.type(within(memberRegion).getByLabelText("Terminal Path"), "/bin/zsh");
    await user.click(within(memberRegion).getByRole("button", { name: "Confirm custom terminal" }));

    await user.click(within(memberRegion).getByRole("button", { name: "Save CLI and terminal" }));

    await waitFor(() =>
      expect(updateTerminalConfiguration).toHaveBeenCalledWith({
        builtInCliEntries: terminalConfigurationSnapshot().builtInCliEntries,
        customCliEntries: [
          {
            cliId: "custom-cli-1",
            label: "Local Reviewer",
            command: "reviewer --json",
          },
        ],
        customTerminalEntries: [
          {
            terminalId: "terminal-1",
            label: "Workspace Zsh",
            command: "/bin/zsh",
          },
        ],
        defaultTerminalId: "terminal-1",
      }),
    );

    await user.click(within(memberRegion).getByRole("button", { name: "Actions for Local Reviewer" }));
    await user.click(within(memberRegion).getByRole("menuitem", { name: "Remove" }));

    expect(within(memberRegion).queryByText("reviewer --json")).not.toBeInTheDocument();
  });

  it("opens a workspace terminal from the settings parity test action", async () => {
    const user = userEvent.setup();
    const openTerminal = vi.fn(() => Promise.resolve(terminalOpenResult()));

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      windowContext: workspaceWindowContext("en-US"),
      parityWorkbench: true,
      parityView: "settings",
      terminalApi: { openTerminal },
    });

    const settings = await screen.findByRole("region", { name: "Settings" });
    const memberRegion = within(settings).getByRole("region", { name: "Default Member" });

    await user.click(within(memberRegion).getByRole("button", { name: "Actions for Claude Code" }));
    await user.click(within(memberRegion).getByRole("menuitem", { name: "Test" }));

    await waitFor(() => expect(openTerminal).toHaveBeenCalledWith());
  });

  it("saves profile settings and reflects them on the owner member surface", async () => {
    const user = userEvent.setup();
    const owner = memberProfile({ displayName: "Workspace Owner", status: "online" });
    const updateProfileSettings = vi.fn(
      (input: {
        displayName: string;
        timezone: string;
        status: ProfileStatus;
        statusMessage: string;
      }) =>
      Promise.resolve({
        profile: profileSettingsSnapshot({
          displayName: input.displayName,
          timezone: input.timezone,
          status: input.status,
          statusMessage: input.statusMessage,
          updatedAtMs: 1760000051000,
        }),
      } satisfies UpdateProfileSettingsResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: { listMembers: () => Promise.resolve({ members: [owner] }) },
      settingsApi: { updateProfileSettings },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    const initialMembersPanel = await screen.findByRole("region", { name: "Owner 与邀请成员" });
    expect(within(initialMembersPanel).getByText("Owner · 在线 · 无运行时")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "打开设置" }));
    const form = await screen.findByRole("form", { name: "个人资料设置" });
    await user.clear(within(form).getByLabelText("显示名称"));
    await user.type(within(form).getByLabelText("显示名称"), "Dana");
    await user.selectOptions(within(form).getByLabelText("时区"), "Asia/Shanghai");
    await user.selectOptions(within(form).getByLabelText("状态"), "working");
    await user.type(within(form).getByLabelText("状态消息"), "Reviewing Story 7.1");
    await user.click(within(form).getByRole("button", { name: "保存资料" }));

    expect(updateProfileSettings).toHaveBeenCalledWith({
      displayName: "Dana",
      timezone: "Asia/Shanghai",
      status: "working",
      statusMessage: "Reviewing Story 7.1",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("个人资料已保存");

    const membersPanel = await screen.findByRole("region", { name: "Owner 与邀请成员" });
    expect(within(membersPanel).getByText("Dana")).toBeInTheDocument();
    expect(within(membersPanel).getByText("Owner · 工作中 · 无运行时")).toBeInTheDocument();
  });

  it("keeps editable profile drafts visible when validation fails", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: { listMembers: () => Promise.resolve({ members: [memberProfile()] }) },
      settingsApi: {
        updateProfileSettings: () =>
          Promise.reject({
            code: "settings.profile.invalidDisplayName",
            message: "显示名称不能为空。",
            severity: "error",
            recoverable: true,
            userAction: "请输入显示名称后重试。",
            details: "field=displayName",
            correlationId: null,
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    await user.clear(within(form).getByLabelText("显示名称"));
    await user.type(within(form).getByLabelText("显示名称"), "Draft Name");
    await user.click(within(form).getByRole("button", { name: "保存资料" }));

    expect(await screen.findByRole("status")).toHaveTextContent("显示名称不能为空。");
    expect(within(form).getByLabelText("显示名称")).toHaveValue("Draft Name");
    expect(within(form).getByText("显示名称不能为空。")).toBeInTheDocument();
  });

  it("saves notification preferences from settings controls", async () => {
    const user = userEvent.setup();
    const updateNotificationPreferences = vi.fn(
      (request: NotificationPreferencesUpdateRequest) =>
        Promise.resolve({
          preferences: notificationPreferencesSnapshot({
            desktopNotificationsEnabled: request.desktopNotificationsEnabled ?? true,
            soundEnabled: request.soundEnabled ?? true,
            mentionsOnly: request.mentionsOnly ?? false,
            messagePreviewEnabled: request.messagePreviewEnabled ?? true,
            dndEnabled: request.dndEnabled ?? false,
            dndStartMinutes: request.dndStartMinutes ?? 22 * 60,
            dndEndMinutes: request.dndEndMinutes ?? 8 * 60,
            updatedAtMs: 1760000061000,
          }),
        } satisfies NotificationPreferencesUpdateResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      notificationApi: { updateNotificationPreferences },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    await user.click(within(form).getByLabelText("桌面通知"));
    await user.click(within(form).getByLabelText("声音提醒"));
    await user.click(within(form).getByLabelText("仅提及我"));
    await user.click(within(form).getByLabelText("显示消息预览"));
    await user.click(within(form).getByLabelText("免打扰时段"));
    fireEvent.change(within(form).getByLabelText("免打扰开始时间"), {
      target: { value: "09:00" },
    });
    fireEvent.change(within(form).getByLabelText("免打扰结束时间"), {
      target: { value: "17:30" },
    });
    await user.click(within(form).getByRole("button", { name: "保存通知" }));

    expect(updateNotificationPreferences).toHaveBeenCalledWith({
      desktopNotificationsEnabled: false,
      soundEnabled: false,
      mentionsOnly: true,
      messagePreviewEnabled: false,
      dndEnabled: true,
      dndStartMinutes: 9 * 60,
      dndEndMinutes: 17 * 60 + 30,
    });
    expect(await screen.findByRole("status")).toHaveTextContent("通知设置已保存");
    expect(within(form).getByLabelText("免打扰开始时间")).toHaveValue("09:00");
  });

  it("restores notification preferences and shows unavailable permission action", async () => {
    const user = userEvent.setup();
    const savedPreferences = notificationPreferencesSnapshot({
      desktopNotificationsEnabled: false,
      soundEnabled: false,
      mentionsOnly: true,
      messagePreviewEnabled: false,
      dndEnabled: true,
      dndStartMinutes: 21 * 60 + 15,
      dndEndMinutes: 7 * 60 + 45,
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      notificationApi: {
        getNotificationPreferences: () => Promise.resolve({ preferences: savedPreferences }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    expect(within(form).getByLabelText("桌面通知")).not.toBeChecked();
    expect(within(form).getByLabelText("声音提醒")).not.toBeChecked();
    expect(within(form).getByLabelText("仅提及我")).toBeChecked();
    expect(within(form).getByLabelText("显示消息预览")).not.toBeChecked();
    expect(within(form).getByLabelText("免打扰时段")).toBeChecked();
    expect(within(form).getByLabelText("免打扰开始时间")).toHaveValue("21:15");
    expect(within(form).getByLabelText("免打扰结束时间")).toHaveValue("07:45");
    expect(within(form).getByText("系统通知权限适配器当前不可用。")).toBeInTheDocument();
    expect(
      within(form).getByText("当前版本仍会保存本地通知偏好；启用系统通知需要后续平台适配。"),
    ).toBeInTheDocument();
  });

  it("saves shortcut preferences and shows enabled disabled and unavailable states", async () => {
    const user = userEvent.setup();
    const updateShortcutPreferences = vi.fn((request: UpdateShortcutPreferencesRequest) =>
      Promise.resolve({
        preferences: shortcutPreferencesSnapshot({
          profile: request.profile ?? "default",
          shortcutsEnabled: request.shortcutsEnabled ?? true,
          shortcutHintsEnabled: request.shortcutHintsEnabled ?? true,
          disabledActionIds: request.disabledActionIds ?? [],
          updatedAtMs: 1760000071000,
        }),
      } satisfies UpdateShortcutPreferencesResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      settingsApi: { updateShortcutPreferences },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    await user.selectOptions(within(form).getByLabelText("键位方案"), "vscode");
    await user.click(within(form).getByLabelText("显示快捷键提示"));
    await user.click(within(form).getByLabelText("发送聊天消息 快捷键"));
    const saveShortcutsButton = within(form).getByRole("button", { name: "保存快捷键" });
    saveShortcutsButton.focus();
    await user.keyboard("{Enter}");

    expect(updateShortcutPreferences).toHaveBeenCalledWith({
      profile: "vscode",
      shortcutsEnabled: true,
      shortcutHintsEnabled: false,
      disabledActionIds: ["chat.send"],
    });
    expect(await screen.findByRole("status")).toHaveTextContent("快捷键设置已保存");

    const shortcutList = within(form).getByLabelText("快捷键列表");
    expect(within(shortcutList).getAllByText("已启用").length).toBeGreaterThan(0);
    expect(within(shortcutList).getByText("已停用")).toBeInTheDocument();
    expect(within(shortcutList).getByText("不可用")).toBeInTheDocument();
    expect(within(shortcutList).getByText("Ctrl+Enter / Meta+Enter")).toBeInTheDocument();
    expect(
      within(shortcutList).getByText("当前版本尚未注册 OS 全局快捷键。"),
    ).toBeInTheDocument();
  });

  it("restores shortcut defaults for the selected profile", async () => {
    const user = userEvent.setup();
    const resetShortcutPreferences = vi.fn((request: ResetShortcutPreferencesRequest) =>
      Promise.resolve({
        preferences: shortcutPreferencesSnapshot({
          profile: request.profile ?? "default",
          updatedAtMs: 1760000072000,
        }),
      } satisfies ResetShortcutPreferencesResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      settingsApi: { resetShortcutPreferences },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    await user.selectOptions(within(form).getByLabelText("键位方案"), "slack");
    await user.click(within(form).getByRole("button", { name: "恢复默认快捷键" }));

    expect(resetShortcutPreferences).toHaveBeenCalledWith({ profile: "slack" });
    expect(await screen.findByRole("status")).toHaveTextContent("快捷键已恢复默认");
  });

  it("saves CLI and terminal configuration from keyboard controls", async () => {
    const user = userEvent.setup();
    const updateTerminalConfiguration = vi.fn((request: UpdateTerminalConfigurationRequest) =>
      Promise.resolve({
        configuration: terminalConfigurationSnapshot({
          builtInCliEntries: request.builtInCliEntries,
          customCliEntries: request.customCliEntries,
          customTerminalEntries: request.customTerminalEntries,
          defaultTerminalId: request.defaultTerminalId,
          updatedAtMs: 1760000083000,
        }),
      } satisfies UpdateTerminalConfigurationResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      settingsApi: { updateTerminalConfiguration },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    const terminalSection = within(form).getByRole("region", { name: "CLI 与终端配置" });
    await user.clear(within(terminalSection).getByLabelText("Codex CLI 命令"));
    await user.type(
      within(terminalSection).getByLabelText("Codex CLI 命令"),
      "/opt/homebrew/bin/codex",
    );
    await user.click(within(terminalSection).getAllByRole("button", { name: "添加" })[0]);
    await user.clear(within(terminalSection).getByLabelText("自定义 CLI CLI ID"));
    await user.type(within(terminalSection).getByLabelText("自定义 CLI CLI ID"), "local-reviewer");
    await user.clear(within(terminalSection).getByLabelText("自定义 CLI 名称"));
    await user.type(within(terminalSection).getByLabelText("自定义 CLI 名称"), "Local Reviewer");
    await user.type(
      within(terminalSection).getByLabelText("自定义 CLI 命令"),
      "reviewer --stdio",
    );
    await user.click(within(terminalSection).getAllByRole("button", { name: "添加" })[1]);
    await user.clear(within(terminalSection).getByLabelText("自定义终端 终端 ID"));
    await user.type(
      within(terminalSection).getByLabelText("自定义终端 终端 ID"),
      "workspace-zsh",
    );
    await user.clear(within(terminalSection).getByLabelText("自定义终端 名称"));
    await user.type(within(terminalSection).getByLabelText("自定义终端 名称"), "Workspace Zsh");
    await user.type(within(terminalSection).getByLabelText("自定义终端 命令"), "/bin/zsh");
    await user.selectOptions(within(terminalSection).getByLabelText("默认工作区终端"), "workspace-zsh");
    const saveButton = within(terminalSection).getByRole("button", {
      name: "保存 CLI 与终端",
    });
    saveButton.focus();
    await user.keyboard("{Enter}");

    expect(updateTerminalConfiguration).toHaveBeenCalledWith({
      builtInCliEntries: expect.arrayContaining([
        expect.objectContaining({
          runtimeId: "codex",
          command: "/opt/homebrew/bin/codex",
        }),
      ]),
      customCliEntries: [
        {
          cliId: "local-reviewer",
          label: "Local Reviewer",
          command: "reviewer --stdio",
        },
      ],
      customTerminalEntries: [
        {
          terminalId: "workspace-zsh",
          label: "Workspace Zsh",
          command: "/bin/zsh",
        },
      ],
      defaultTerminalId: "workspace-zsh",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("CLI 与终端设置已保存");
  });

  it("saves chat terminal output preference from the keyboard and applies it to new output", async () => {
    const user = userEvent.setup();
    let outputHandler: ((event: TerminalOutputEventPayload) => void) | null = null;
    let statusHandler: ((event: TerminalStatusEventPayload) => void) | null = null;
    const subscribeOutput = vi.fn(async (handler: (event: TerminalOutputEventPayload) => void) => {
      outputHandler = handler;
      return vi.fn();
    });
    const subscribeStatus = vi.fn(async (handler: (event: TerminalStatusEventPayload) => void) => {
      statusHandler = handler;
      return vi.fn();
    });
    const updateChatTerminalOutputPreferences = vi.fn(
      (request: UpdateChatTerminalOutputPreferencesRequest) =>
        Promise.resolve({
          preferences: chatTerminalOutputPreferencesSnapshot({
            displayMode: request.displayMode,
            updatedAtMs: 1760000093000,
          }),
        }),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      terminalApi: {
        subscribeOutput,
        subscribeStatus,
      },
      settingsApi: {
        getChatTerminalOutputPreferences: () =>
          Promise.resolve({ preferences: chatTerminalOutputPreferencesSnapshot() }),
        updateChatTerminalOutputPreferences,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await waitFor(() => expect(subscribeOutput).toHaveBeenCalled());
    await waitFor(() => expect(subscribeStatus).toHaveBeenCalled());
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    const streamToggle = within(form).getByLabelText("聊天流式输出");
    expect(streamToggle).toBeChecked();

    await user.click(streamToggle);
    const saveButton = within(form).getByRole("button", { name: "保存聊天输出" });
    saveButton.focus();
    await user.keyboard("{Enter}");

    expect(updateChatTerminalOutputPreferences).toHaveBeenCalledWith({
      displayMode: "finalOnly",
    });
    expect(await screen.findByRole("status")).toHaveTextContent("聊天输出设置已保存");
    await waitFor(() =>
      expect(within(form).getByText("当前模式：仅显示最终输出")).toBeInTheDocument(),
    );

    act(() => {
      outputHandler?.(
        terminalOutputEvent({
          terminalSessionId: "01KTERMINAL00000000000027",
          seq: 1,
          chunk: "hidden after successful save\n",
          emittedAtMs: 1760000011000,
        }),
      );
    });

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    });
    expect(within(messageLog).queryByText("hidden after successful save")).not.toBeInTheDocument();

    act(() => {
      statusHandler?.(
        terminalStatusEvent({
          terminalSessionId: "01KTERMINAL00000000000027",
          status: "exited",
          snapshot: {
            lastSeq: 1,
            text: "saved final result\n",
            truncated: false,
            updatedAtMs: 1760000011200,
          },
          emittedAtMs: 1760000011300,
        }),
      );
    });

    await waitFor(() =>
      expect(within(messageLog).getByLabelText("终端输出流")).toHaveTextContent(
        "saved final result",
      ),
    );
  });

  it("reports chat terminal output preference save failure without changing active stream mode", async () => {
    const user = userEvent.setup();
    let outputHandler: ((event: TerminalOutputEventPayload) => void) | null = null;
    const subscribeOutput = vi.fn(async (handler: (event: TerminalOutputEventPayload) => void) => {
      outputHandler = handler;
      return vi.fn();
    });
    const updateChatTerminalOutputPreferences = vi.fn(
      (_request: UpdateChatTerminalOutputPreferencesRequest) =>
        Promise.reject({
          code: "settings.chatTerminalOutput.renameFailed",
          message: "无法保存聊天终端输出展示偏好。",
          userAction: "当前已生效偏好保持不变，请检查 settings/chat-terminal-output.json 权限后重试。",
          recoverable: true,
          severity: "warning",
        }),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      terminalApi: { subscribeOutput },
      settingsApi: {
        getChatTerminalOutputPreferences: () =>
          Promise.resolve({ preferences: chatTerminalOutputPreferencesSnapshot() }),
        updateChatTerminalOutputPreferences,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await waitFor(() => expect(subscribeOutput).toHaveBeenCalled());
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    await user.click(within(form).getByLabelText("聊天流式输出"));
    await user.click(within(form).getByRole("button", { name: "保存聊天输出" }));

    expect(updateChatTerminalOutputPreferences).toHaveBeenCalledWith({
      displayMode: "finalOnly",
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "无法保存聊天终端输出展示偏好。",
    );

    act(() => {
      outputHandler?.(
        terminalOutputEvent({
          terminalSessionId: "01KTERMINAL00000000000024",
          seq: 1,
          chunk: "still streaming after failed save\n",
          emittedAtMs: 1760000009000,
        }),
      );
    });

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
    await waitFor(() =>
      expect(within(messageLog).getByLabelText("终端输出流")).toHaveTextContent(
        "still streaming after failed save",
      ),
    );
  });

  it("repairs workspace chat data from settings after confirmation", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const repairedChannel = defaultChannel({
      lastMessagePreview: null,
      unreadCount: 0,
      updatedAtMs: 1760000015000,
    });
    const repairWorkspaceData = vi.fn(() =>
      Promise.resolve(
        repairWorkspaceChatDataResult({
          conversations: [repairedChannel],
        }),
      ),
    );

    try {
      renderWorkspaceSelection({
        getWorkspaceSelectionStatus: () => Promise.resolve(status),
        pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
        chatApi: {
          repairWorkspaceData,
          listConversations: () =>
            Promise.resolve({
              conversations: [
                defaultChannel({
                  unreadCount: 2,
                  lastMessagePreview: "stale",
                }),
              ],
            }),
        },
      });

      await user.click(screen.getByRole("button", { name: "打开文件夹" }));
      await user.click(await screen.findByRole("button", { name: "打开设置" }));
      const form = await screen.findByRole("form", { name: "个人资料设置" });

      await user.click(within(form).getByRole("button", { name: "修复消息" }));

      expect(confirm).toHaveBeenCalledWith(
        "修复 orchlet-demo 的本地聊天数据？此操作可能删除无效消息索引。",
      );
      expect(repairWorkspaceData).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
      });
      const inlineResult = await within(form).findByRole("status", {
        name: "聊天数据维护结果",
      });
      expect(inlineResult).toHaveTextContent("状态：完成");
      expect(inlineResult).toHaveTextContent("已修复 2 项，失败 0 项，跳过 0 项");
      expect(await screen.findByText("聊天数据修复完成")).toBeInTheDocument();
    } finally {
      confirm.mockRestore();
    }
  });

  it("shows repair failure result without changing chat state", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const channel = defaultChannel({
      lastMessagePreview: "Keep visible",
    });
    const message = chatMessage({ body: "Keep visible" });
    const repairWorkspaceData = vi.fn(() =>
      Promise.reject({
        code: "chatDataRepair.transaction.beginFailed",
        message: "聊天数据维护失败。",
        userAction: "请运行数据验证后重试。",
        details: "workspaceId=01K00000000000000000000000 scope=workspace-chat",
        recoverable: true,
        severity: "warning",
      }),
    );

    try {
      renderWorkspaceSelection({
        getWorkspaceSelectionStatus: () => Promise.resolve(status),
        pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
        chatApi: {
          repairWorkspaceData,
          listConversations: () => Promise.resolve({ conversations: [channel] }),
          listMessages: () =>
            Promise.resolve({
              messages: [message],
              hasMore: false,
              nextBeforeMessageId: null,
              readPosition: null,
              conversation: channel,
            }),
          updateReadPosition: () =>
            Promise.resolve({
              readPosition: readPosition(),
              conversation: channel,
            }),
        },
      });

      await user.click(screen.getByRole("button", { name: "打开文件夹" }));
      const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
      const messageLog = await within(conversationPanel).findByRole("log", {
        name: "消息历史",
      });
      expect(await within(messageLog).findByText("Keep visible")).toBeInTheDocument();
      await user.click(await screen.findByRole("button", { name: "打开设置" }));
      const form = await screen.findByRole("form", { name: "个人资料设置" });

      await user.click(within(form).getByRole("button", { name: "修复消息" }));

      const inlineResult = await within(form).findByRole("status", {
        name: "聊天数据维护结果",
      });
      expect(inlineResult).toHaveTextContent("状态：失败");
      expect(inlineResult).toHaveTextContent("请运行数据验证后重试");
      expect(within(messageLog).getByText("Keep visible")).toBeInTheDocument();
    } finally {
      confirm.mockRestore();
    }
  });

  it("clears all workspace chat data after strong confirmation and resets cached messages", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("orchlet-demo");
    const channel = defaultChannel({
      unreadCount: 3,
      lastMessagePreview: "Clear all",
    });
    const clearedChannel = defaultChannel({
      unreadCount: 0,
      lastMessagePreview: null,
      updatedAtMs: 1760000016000,
      lastActivityAtMs: 1760000016000,
    });
    const clearWorkspaceData = vi.fn(() =>
      Promise.resolve(
        clearWorkspaceChatDataResult({
          conversations: [clearedChannel],
        }),
      ),
    );

    try {
      renderWorkspaceSelection({
        getWorkspaceSelectionStatus: () => Promise.resolve(status),
        pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
        chatApi: {
          clearWorkspaceData,
          listConversations: () => Promise.resolve({ conversations: [channel] }),
          listMessages: () =>
            Promise.resolve({
              messages: [chatMessage({ body: "Clear all" })],
              hasMore: false,
              nextBeforeMessageId: null,
              readPosition: readPosition(),
              conversation: channel,
            }),
          updateReadPosition: () =>
            Promise.resolve({
              readPosition: readPosition(),
              conversation: channel,
            }),
        },
      });

      await user.click(screen.getByRole("button", { name: "打开文件夹" }));
      const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
      const messageLog = await within(conversationPanel).findByRole("log", {
        name: "消息历史",
      });
      expect(await within(messageLog).findByText("Clear all")).toBeInTheDocument();
      await user.click(await screen.findByRole("button", { name: "打开设置" }));
      const form = await screen.findByRole("form", { name: "个人资料设置" });

      await user.click(within(form).getByRole("button", { name: "清空所有消息" }));

      expect(confirm).toHaveBeenCalledWith(
        "清空 orchlet-demo 的所有本地聊天消息？会话、成员和设置会保留。",
      );
      expect(prompt).toHaveBeenCalledWith(
        "输入 orchlet-demo 或 01K00000000000000000000000 确认清空所有消息",
      );
      expect(clearWorkspaceData).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
      });
      expect(await within(messageLog).findByText("暂无消息")).toBeInTheDocument();
      const inlineResult = await within(form).findByRole("status", {
        name: "聊天数据维护结果",
      });
      expect(inlineResult).toHaveTextContent("状态：完成");
      expect(inlineResult).toHaveTextContent("已清除 3 条消息");
      expect(await screen.findByText("工作区聊天消息已清空")).toBeInTheDocument();
    } finally {
      confirm.mockRestore();
      prompt.mockRestore();
    }
  });

  it("preserves messages when workspace clear is cancelled", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const prompt = vi.spyOn(window, "prompt");
    const channel = defaultChannel();
    const clearWorkspaceData = vi.fn();

    try {
      renderWorkspaceSelection({
        getWorkspaceSelectionStatus: () => Promise.resolve(status),
        pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
        chatApi: {
          clearWorkspaceData,
          listConversations: () => Promise.resolve({ conversations: [channel] }),
          listMessages: () =>
            Promise.resolve({
              messages: [chatMessage({ body: "Do not clear" })],
              hasMore: false,
              nextBeforeMessageId: null,
              readPosition: null,
              conversation: channel,
            }),
          updateReadPosition: () =>
            Promise.resolve({
              readPosition: readPosition(),
              conversation: channel,
            }),
        },
      });

      await user.click(screen.getByRole("button", { name: "打开文件夹" }));
      const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
      const messageLog = await within(conversationPanel).findByRole("log", {
        name: "消息历史",
      });
      expect(await within(messageLog).findByText("Do not clear")).toBeInTheDocument();
      await user.click(await screen.findByRole("button", { name: "打开设置" }));
      const form = await screen.findByRole("form", { name: "个人资料设置" });

      await user.click(within(form).getByRole("button", { name: "清空所有消息" }));

      expect(confirm).toHaveBeenCalled();
      expect(prompt).not.toHaveBeenCalled();
      expect(clearWorkspaceData).not.toHaveBeenCalled();
      expect(within(messageLog).getByText("Do not clear")).toBeInTheDocument();
    } finally {
      confirm.mockRestore();
      prompt.mockRestore();
    }
  });

  it("preserves messages and reports failure when workspace clear fails", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("orchlet-demo");
    const channel = defaultChannel();
    const clearWorkspaceData = vi.fn(() =>
      Promise.reject({
        code: "chatDataClear.messagesFailed",
        message: "聊天数据维护失败。",
        userAction: "请运行数据验证后重试。",
        details: "workspaceId=01K00000000000000000000000 scope=messages",
        recoverable: true,
        severity: "error",
      }),
    );

    try {
      renderWorkspaceSelection({
        getWorkspaceSelectionStatus: () => Promise.resolve(status),
        pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
        chatApi: {
          clearWorkspaceData,
          listConversations: () => Promise.resolve({ conversations: [channel] }),
          listMessages: () =>
            Promise.resolve({
              messages: [chatMessage({ body: "Still here" })],
              hasMore: false,
              nextBeforeMessageId: null,
              readPosition: null,
              conversation: channel,
            }),
          updateReadPosition: () =>
            Promise.resolve({
              readPosition: readPosition(),
              conversation: channel,
            }),
        },
      });

      await user.click(screen.getByRole("button", { name: "打开文件夹" }));
      const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
      const messageLog = await within(conversationPanel).findByRole("log", {
        name: "消息历史",
      });
      expect(await within(messageLog).findByText("Still here")).toBeInTheDocument();
      await user.click(await screen.findByRole("button", { name: "打开设置" }));
      const form = await screen.findByRole("form", { name: "个人资料设置" });

      await user.click(within(form).getByRole("button", { name: "清空所有消息" }));

      const inlineResult = await within(form).findByRole("status", {
        name: "聊天数据维护结果",
      });
      expect(inlineResult).toHaveTextContent("状态：失败");
      expect(inlineResult).toHaveTextContent("scope=messages");
      expect(within(messageLog).getByText("Still here")).toBeInTheDocument();
    } finally {
      confirm.mockRestore();
      prompt.mockRestore();
    }
  });

  it("restores saved profile values into settings and member surfaces", async () => {
    const user = userEvent.setup();
    const savedProfile = profileSettingsSnapshot({
      displayName: "Restored Dana",
      timezone: "Europe/London",
      status: "doNotDisturb",
      statusMessage: "Focus block",
      updatedAtMs: 1760000053000,
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: { listMembers: () => Promise.resolve({ members: [memberProfile()] }) },
      settingsApi: {
        getProfileSettings: () => Promise.resolve({ profile: savedProfile }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const membersPanel = await screen.findByRole("region", { name: "Owner 与邀请成员" });
    expect(await within(membersPanel).findByText("Restored Dana")).toBeInTheDocument();
    expect(within(membersPanel).getByText("Owner · 请勿打扰 · 无运行时")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "打开设置" }));
    const form = await screen.findByRole("form", { name: "个人资料设置" });
    expect(within(form).getByLabelText("显示名称")).toHaveValue("Restored Dana");
    expect(within(form).getByLabelText("时区")).toHaveValue("Europe/London");
    expect(within(form).getByLabelText("状态")).toHaveValue("doNotDisturb");
    expect(within(form).getByLabelText("状态消息")).toHaveValue("Focus block");
  });

  it("uploads a profile avatar and reflects it in settings and owner surfaces", async () => {
    const user = userEvent.setup();
    const uploadedProfile = profileSettingsSnapshot({
      avatar: profileAvatarSnapshot({
        kind: "uploaded",
        uploadId: "01KAVATARUPLOAD000000000001",
        sourceFileName: "dana.png",
        contentType: "image/png",
        sizeBytes: 3,
        libraryRelativePath: "avatars/uploads/01KAVATARUPLOAD000000000001.png",
        previewDataUrl: "data:image/png;base64,cG5n",
        updatedAtMs: 1760000054000,
      }),
      updatedAtMs: 1760000054000,
    });
    const selectAvatarImage = vi.fn(() => Promise.resolve("/fixtures/avatars/dana.png"));
    const uploadProfileAvatar = vi.fn(() =>
      Promise.resolve({ profile: uploadedProfile } satisfies UploadProfileAvatarResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: { listMembers: () => Promise.resolve({ members: [memberProfile()] }) },
      settingsApi: { selectAvatarImage, uploadProfileAvatar },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    await user.click(within(form).getByRole("button", { name: "上传图片" }));

    expect(selectAvatarImage).toHaveBeenCalled();
    expect(uploadProfileAvatar).toHaveBeenCalledWith("/fixtures/avatars/dana.png");
    expect(await screen.findByRole("status")).toHaveTextContent("头像已上传");
    expect(within(form).getByText("上传头像")).toBeInTheDocument();
    expect(screen.getAllByAltText("Owner 头像").length).toBeGreaterThan(0);
  });

  it("selects preset avatars and reflects the selected preset", async () => {
    const user = userEvent.setup();
    const presetProfile = profileSettingsSnapshot({
      avatar: profileAvatarSnapshot({
        kind: "preset",
        presetId: "forest",
        updatedAtMs: 1760000055000,
      }),
      updatedAtMs: 1760000055000,
    });
    const selectProfileAvatarPreset = vi.fn(() =>
      Promise.resolve({
        profile: presetProfile,
      } satisfies SelectProfileAvatarPresetResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: { listMembers: () => Promise.resolve({ members: [memberProfile()] }) },
      settingsApi: { selectProfileAvatarPreset },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    await user.click(within(form).getByRole("button", { name: "选择 Forest 头像预设" }));

    expect(selectProfileAvatarPreset).toHaveBeenCalledWith("forest");
    expect(await screen.findByRole("status")).toHaveTextContent("头像预设已保存");
    expect(screen.getAllByLabelText("Forest 头像预设").length).toBeGreaterThan(0);
  });

  it("deletes uploaded avatars and resets avatar selection to placeholder", async () => {
    const user = userEvent.setup();
    const uploadedProfile = profileSettingsSnapshot({
      avatar: profileAvatarSnapshot({
        kind: "uploaded",
        uploadId: "01KAVATARUPLOAD000000000001",
        sourceFileName: "dana.png",
        contentType: "image/png",
        sizeBytes: 3,
        libraryRelativePath: "avatars/uploads/01KAVATARUPLOAD000000000001.png",
        previewDataUrl: "data:image/png;base64,cG5n",
      }),
    });
    const placeholderProfile = profileSettingsSnapshot({
      avatar: profileAvatarSnapshot({ kind: "placeholder", updatedAtMs: 1760000056000 }),
      updatedAtMs: 1760000056000,
    });
    const deleteUploadedProfileAvatar = vi.fn(() =>
      Promise.resolve({
        profile: placeholderProfile,
      } satisfies DeleteUploadedProfileAvatarResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: { listMembers: () => Promise.resolve({ members: [memberProfile()] }) },
      settingsApi: {
        getProfileSettings: () => Promise.resolve({ profile: uploadedProfile }),
        deleteUploadedProfileAvatar,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    expect(within(form).getByText("dana.png")).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "删除上传头像" }));

    expect(deleteUploadedProfileAvatar).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("上传头像已删除");
    expect(within(form).getByText("默认头像")).toBeInTheDocument();
  });

  it("resets profile avatar to the generated placeholder", async () => {
    const user = userEvent.setup();
    const resetProfileAvatar = vi.fn(() =>
      Promise.resolve({
        profile: profileSettingsSnapshot({
          avatar: profileAvatarSnapshot({ kind: "placeholder", updatedAtMs: 1760000057000 }),
          updatedAtMs: 1760000057000,
        }),
      } satisfies ResetProfileAvatarResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: { listMembers: () => Promise.resolve({ members: [memberProfile()] }) },
      settingsApi: {
        getProfileSettings: () =>
          Promise.resolve({
            profile: profileSettingsSnapshot({
              avatar: profileAvatarSnapshot({ kind: "preset", presetId: "lagoon" }),
            }),
          }),
        resetProfileAvatar,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "打开设置" }));

    const form = await screen.findByRole("form", { name: "个人资料设置" });
    await user.click(within(form).getByRole("button", { name: "恢复默认" }));

    expect(resetProfileAvatar).toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("头像已恢复默认");
    expect(within(form).getByText("默认头像")).toBeInTheDocument();
  });

  it("imports a local skill folder and shows it in the skill library", async () => {
    const user = userEvent.setup();
    const importedSkill = skillLibraryEntry();
    const listSkills = vi.fn(() => Promise.resolve({ skills: [] }));
    const importLocalFolder = vi.fn(() =>
      Promise.resolve({
        skill: importedSkill,
        skills: [importedSkill],
        status: "imported",
      } satisfies ImportLocalSkillFolderResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      skillsApi: { listSkills, importLocalFolder },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const skillsPanel = await screen.findByRole("region", { name: "我的技能库" });
    expect(within(skillsPanel).getByText("我的技能库里暂无可用技能")).toBeInTheDocument();

    await user.click(within(skillsPanel).getByRole("button", { name: "导入技能" }));

    expect(importLocalFolder).toHaveBeenCalled();
    expect(await within(skillsPanel).findByText("Local Review")).toBeInTheDocument();
    expect(within(skillsPanel).getByText("Review helper")).toBeInTheDocument();
    expect(within(skillsPanel).getByText("/fixtures/skills/local-review")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("技能已导入");
  });

  it("keeps the skill library empty when import validation fails", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      skillsApi: {
        listSkills: () => Promise.resolve({ skills: [] }),
        importLocalFolder: () =>
          Promise.reject({
            code: "skill.manifest.missing",
            message: "技能文件夹缺少 SKILL.md。",
            severity: "error",
            recoverable: true,
            userAction: "请选择包含 SKILL.md 的技能文件夹后重试。",
            details: "/fixtures/skills/invalid/SKILL.md",
            correlationId: null,
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const skillsPanel = await screen.findByRole("region", { name: "我的技能库" });
    await user.click(within(skillsPanel).getByRole("button", { name: "导入技能" }));

    expect(await screen.findByRole("status")).toHaveTextContent("技能文件夹缺少 SKILL.md。");
    expect(screen.getByRole("status")).toHaveTextContent("请选择包含 SKILL.md");
    expect(within(skillsPanel).getByText("我的技能库里暂无可用技能")).toBeInTheDocument();
  });

  it("updates the existing skill row when duplicate import returns updatedExisting", async () => {
    const user = userEvent.setup();
    const existingSkill = skillLibraryEntry({ name: "Old Review", updatedAtMs: 1760000010000 });
    const updatedSkill = skillLibraryEntry({ name: "Updated Review", updatedAtMs: 1760000011000 });
    const importLocalFolder = vi.fn(() =>
      Promise.resolve({
        skill: updatedSkill,
        skills: [updatedSkill],
        status: "updatedExisting",
      } satisfies ImportLocalSkillFolderResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      skillsApi: {
        listSkills: () => Promise.resolve({ skills: [existingSkill] }),
        importLocalFolder,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const skillsPanel = await screen.findByRole("region", { name: "我的技能库" });
    expect(await within(skillsPanel).findByText("Old Review")).toBeInTheDocument();

    await user.click(within(skillsPanel).getByRole("button", { name: "导入技能" }));

    expect(await within(skillsPanel).findByText("Updated Review")).toBeInTheDocument();
    expect(within(skillsPanel).queryByText("Old Review")).not.toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("技能已更新");
    expect(screen.getByRole("status")).toHaveTextContent("已更新已有技能记录");
  });

  it("links a library skill to the current workspace", async () => {
    const user = userEvent.setup();
    const librarySkill = skillLibraryEntry();
    const linkedSkill = workspaceSkillLinkEntry();
    const linkWorkspaceSkill = vi.fn(() =>
      Promise.resolve({
        skill: linkedSkill,
        skills: [linkedSkill],
        status: "linked",
      } satisfies LinkWorkspaceSkillResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      skillsApi: {
        listSkills: () => Promise.resolve({ skills: [librarySkill] }),
        listWorkspaceLinks: () => Promise.resolve({ skills: [] }),
        linkWorkspaceSkill,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const skillsPanel = await screen.findByRole("region", { name: "我的技能库" });
    expect(await within(skillsPanel).findByText("Local Review")).toBeInTheDocument();

    await user.click(within(skillsPanel).getByRole("button", { name: "关联" }));

    expect(linkWorkspaceSkill).toHaveBeenCalledWith("/tmp/orchlet-demo", librarySkill.skillId);
    expect(await within(skillsPanel).findByText("已关联")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("工作区技能已关联");
  });

  it("unlinks a workspace skill without removing it from the library", async () => {
    const user = userEvent.setup();
    const librarySkill = skillLibraryEntry();
    const linkedSkill = workspaceSkillLinkEntry();
    const unlinkWorkspaceSkill = vi.fn(() =>
      Promise.resolve({
        removedSkillId: linkedSkill.skillId,
        skills: [],
      } satisfies UnlinkWorkspaceSkillResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      skillsApi: {
        listSkills: () => Promise.resolve({ skills: [librarySkill] }),
        listWorkspaceLinks: () => Promise.resolve({ skills: [linkedSkill] }),
        unlinkWorkspaceSkill,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const skillsPanel = await screen.findByRole("region", { name: "我的技能库" });
    await user.click(await within(skillsPanel).findByRole("button", { name: "取消关联" }));

    expect(unlinkWorkspaceSkill).toHaveBeenCalledWith("/tmp/orchlet-demo", linkedSkill.skillId);
    expect(await within(skillsPanel).findByText("当前工作区还没有关联技能")).toBeInTheDocument();
    expect(within(skillsPanel).getByText("Local Review")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("工作区技能已取消关联");
  });

  it("surfaces manifest fallback state for linked workspace skills", async () => {
    const user = userEvent.setup();
    const librarySkill = skillLibraryEntry();
    const linkedSkill = workspaceSkillLinkEntry({
      linkMode: "manifest",
      unavailableReason: "symlink unavailable in test",
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      skillsApi: {
        listSkills: () => Promise.resolve({ skills: [librarySkill] }),
        listWorkspaceLinks: () => Promise.resolve({ skills: [linkedSkill] }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const skillsPanel = await screen.findByRole("region", { name: "我的技能库" });
    expect(await within(skillsPanel).findByText(/清单链接：symlink unavailable/)).toBeInTheDocument();
  });

  it("opens a local skill folder from the skill library", async () => {
    const user = userEvent.setup();
    const librarySkill = skillLibraryEntry();
    const openSkillFolder = vi.fn(() =>
      Promise.resolve({
        skillId: librarySkill.skillId,
        path: librarySkill.sourcePath,
        opened: true,
      } satisfies OpenSkillFolderResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      skillsApi: {
        listSkills: () => Promise.resolve({ skills: [librarySkill] }),
        listWorkspaceLinks: () => Promise.resolve({ skills: [] }),
        openSkillFolder,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const skillsPanel = await screen.findByRole("region", { name: "我的技能库" });
    await user.click(await within(skillsPanel).findByRole("button", { name: "打开文件夹" }));

    expect(openSkillFolder).toHaveBeenCalledWith(librarySkill.skillId);
    expect(await screen.findByRole("status")).toHaveTextContent("技能文件夹已打开");
    expect(screen.getByRole("status")).toHaveTextContent(librarySkill.sourcePath);
  });

  it("deletes a library skill and clears the current workspace link without deleting source folder", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const librarySkill = skillLibraryEntry();
    const linkedSkill = workspaceSkillLinkEntry();
    const deleteSkill = vi.fn(() =>
      Promise.resolve({
        removedSkillId: librarySkill.skillId,
        skills: [],
        workspaceSkills: [],
      } satisfies DeleteSkillResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      skillsApi: {
        listSkills: () => Promise.resolve({ skills: [librarySkill] }),
        listWorkspaceLinks: () => Promise.resolve({ skills: [linkedSkill] }),
        deleteSkill,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const skillsPanel = await screen.findByRole("region", { name: "我的技能库" });
    await user.click(await within(skillsPanel).findByRole("button", { name: "删除技能" }));

    expect(confirmSpy).toHaveBeenCalledWith("从技能库删除该技能？源文件夹不会被删除。");
    expect(deleteSkill).toHaveBeenCalledWith(librarySkill.skillId, "/tmp/orchlet-demo");
    expect(await within(skillsPanel).findByText("当前工作区还没有关联技能")).toBeInTheDocument();
    expect(within(skillsPanel).getByText("我的技能库里暂无可用技能")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("源文件夹没有被删除");

    confirmSpy.mockRestore();
  });

  it("distinguishes local skills, skill store placeholders and future remote plugins", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      skillsApi: {
        listSkills: () => Promise.resolve({ skills: [skillLibraryEntry()] }),
        listWorkspaceLinks: () => Promise.resolve({ skills: [] }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const classification = await screen.findByLabelText("技能能力分类");
    expect(within(classification).getByText("本地技能")).toBeInTheDocument();
    expect(within(classification).getByText("技能商店")).toBeInTheDocument();
    expect(within(classification).getByText("远程插件")).toBeInTheDocument();
    expect(within(classification).getByText("已实现")).toBeInTheDocument();
    expect(within(classification).getAllByText("占位")).toHaveLength(2);

    await user.click(within(classification).getByRole("button", { name: "打开技能商店" }));
    expect(await screen.findByRole("status")).toHaveTextContent("技能商店暂未启用");

    await user.click(within(classification).getByRole("button", { name: "启用远程插件" }));
    expect(await screen.findByRole("status")).toHaveTextContent("远程插件暂未启用");
  });

  it("renders marketplace parity import cards with Golutra copy and placeholder plugin actions", async () => {
    const user = userEvent.setup();
    const importLocalFolder = vi.fn(() => Promise.resolve(null));

    const { unmount } = renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      parityWorkbench: true,
      parityView: "store",
      skillsApi: {
        listSkills: () => Promise.resolve({ skills: [] }),
        listWorkspaceLinks: () => Promise.resolve({ skills: [] }),
        importLocalFolder,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    const skillStore = await screen.findByRole("region", { name: "技能商店" });
    await user.click(within(skillStore).getByRole("tab", { name: "我的技能" }));
    const importSkillButton = within(skillStore).getByRole("button", {
      name: /导入技能.*从 URL 或本地文件/,
    });
    expect(importSkillButton).toBeInTheDocument();
    expect(importSkillButton).toHaveTextContent("从 URL 或本地文件");
    await user.click(importSkillButton);
    expect(importLocalFolder).toHaveBeenCalledTimes(1);

    unmount();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      parityWorkbench: true,
      parityView: "plugins",
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    const marketplace = await screen.findByRole("region", { name: "插件市场" });
    await user.click(within(marketplace).getByRole("tab", { name: "我的插件" }));
    const importPluginButton = within(marketplace).getByRole("button", {
      name: /导入插件.*从 URL 或本地文件/,
    });
    expect(importPluginButton).toBeInTheDocument();
    expect(importPluginButton).toHaveTextContent("从 URL 或本地文件");
    await user.click(importPluginButton);
  });

  it("creates, edits and deletes roadmap tasks from the Roadmap modal", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const createdTask = roadmapTaskEntry({ title: "新任务", detail: null, status: "pending" });
    const renamedTask = roadmapTaskEntry({
      title: "Ship beta",
      detail: null,
      status: "pending",
      updatedAtMs: 1760000031000,
    });
    const inProgressTask = roadmapTaskEntry({
      title: "Ship beta",
      detail: null,
      status: "inProgress",
      updatedAtMs: 1760000032000,
    });
    const createTask = vi.fn(() =>
      Promise.resolve({
        task: createdTask,
        tasks: [createdTask],
      } satisfies CreateRoadmapTaskResult),
    );
    const updateTask = vi
      .fn()
      .mockResolvedValueOnce({
        task: renamedTask,
        tasks: [renamedTask],
      } satisfies UpdateRoadmapTaskResult)
      .mockResolvedValueOnce({
        task: inProgressTask,
        tasks: [inProgressTask],
      } satisfies UpdateRoadmapTaskResult);
    const deleteTask = vi.fn(() =>
      Promise.resolve({
        removedTaskId: inProgressTask.taskId,
        tasks: [],
      } satisfies DeleteRoadmapTaskResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      roadmapApi: {
        listTasks: () => Promise.resolve({ tasks: [] }),
        createTask,
        updateTask,
        deleteTask,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "Roadmap" }));

    const modal = await screen.findByRole("dialog", { name: "路线图" });
    expect(within(modal).getByText("暂无路线图任务")).toBeInTheDocument();

    await user.click(within(modal).getByRole("button", { name: "添加任务" }));

    expect(createTask).toHaveBeenCalledWith("/tmp/orchlet-demo", {
      title: "新任务",
      detail: null,
      status: "pending",
    });
    expect(await within(modal).findByDisplayValue("新任务")).toBeInTheDocument();

    const titleInput = within(modal).getByLabelText("任务标题");
    await user.clear(titleInput);
    await user.type(titleInput, "Ship beta");
    fireEvent.blur(titleInput);

    await waitFor(() =>
      expect(updateTask).toHaveBeenCalledWith("/tmp/orchlet-demo", createdTask.taskId, {
        title: "Ship beta",
      }),
    );

    await user.selectOptions(within(modal).getByLabelText("任务状态"), "inProgress");
    await waitFor(() =>
      expect(updateTask).toHaveBeenLastCalledWith("/tmp/orchlet-demo", createdTask.taskId, {
        status: "inProgress",
      }),
    );

    await user.click(within(modal).getByRole("button", { name: "删除" }));

    expect(confirmSpy).toHaveBeenCalledWith("删除这个路线图任务？");
    expect(deleteTask).toHaveBeenCalledWith("/tmp/orchlet-demo", createdTask.taskId);
    expect(await within(modal).findByText("暂无路线图任务")).toBeInTheDocument();

    confirmSpy.mockRestore();
  });

  it("shows configured roadmap goals with related tasks and progress", async () => {
    const user = userEvent.setup();
    const firstTask = roadmapTaskEntry({
      taskId: "01K00000000000000000000200",
      title: "Ship MVP",
      status: "pending",
      sortOrder: 0,
    });
    const secondTask = roadmapTaskEntry({
      taskId: "01K00000000000000000000201",
      title: "Write launch notes",
      status: "done",
      sortOrder: 1,
    });
    const goal = roadmapGoalEntry({
      title: "Launch beta",
      taskIds: [firstTask.taskId, secondTask.taskId],
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      roadmapApi: {
        listTasks: () => Promise.resolve({ tasks: [firstTask, secondTask] }),
        listGoals: () => Promise.resolve({ goals: [goal] }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "Roadmap" }));

    const modal = await screen.findByRole("dialog", { name: "路线图" });
    const goalCard = within(modal).getByRole("group", { name: "路线图目标 Launch beta" });

    expect(within(goalCard).getByDisplayValue("Launch beta")).toBeInTheDocument();
    expect(within(goalCard).getByText("Ship MVP")).toBeInTheDocument();
    expect(within(goalCard).getByText("Write launch notes")).toBeInTheDocument();
    expect(within(goalCard).getByText("1/2 完成（50%）")).toBeInTheDocument();
    expect(within(modal).getByText("任务完成 1/2（50%）")).toBeInTheDocument();
  });

  it("recalculates roadmap goal progress when task status changes", async () => {
    const user = userEvent.setup();
    const pendingTask = roadmapTaskEntry({ status: "pending" });
    const doneTask = roadmapTaskEntry({ status: "done", updatedAtMs: 1760000032000 });
    const goal = roadmapGoalEntry({ taskIds: [pendingTask.taskId] });
    const updateTask = vi.fn(() =>
      Promise.resolve({
        task: doneTask,
        tasks: [doneTask],
      } satisfies UpdateRoadmapTaskResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      roadmapApi: {
        listTasks: () => Promise.resolve({ tasks: [pendingTask] }),
        listGoals: () => Promise.resolve({ goals: [goal] }),
        updateTask,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "Roadmap" }));

    const modal = await screen.findByRole("dialog", { name: "路线图" });
    expect(within(modal).getByText("0/1 完成（0%）")).toBeInTheDocument();

    await user.selectOptions(within(modal).getByLabelText("任务状态"), "done");

    await waitFor(() =>
      expect(updateTask).toHaveBeenCalledWith("/tmp/orchlet-demo", pendingTask.taskId, {
        status: "done",
      }),
    );
    expect(await within(modal).findByText("1/1 完成（100%）")).toBeInTheDocument();
    expect(within(modal).getByText("任务完成 1/1（100%）")).toBeInTheDocument();
  });

  it("keeps unsaved roadmap goal input visible when saving fails", async () => {
    const user = userEvent.setup();
    const goal = roadmapGoalEntry();
    const updateGoal = vi.fn(() =>
      Promise.reject({
        code: "roadmap.goals.writeFailed",
        message: "无法写入工作区路线图目标。",
        severity: "error",
        recoverable: true,
        userAction: "请检查工作区权限后重试。",
        details: "/tmp/orchlet-demo/.orchlet/roadmap/goals.json",
        correlationId: null,
      }),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      roadmapApi: {
        listTasks: () => Promise.resolve({ tasks: [] }),
        listGoals: () => Promise.resolve({ goals: [goal] }),
        updateGoal,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await user.click(await screen.findByRole("button", { name: "Roadmap" }));

    const modal = await screen.findByRole("dialog", { name: "路线图" });
    const titleInput = within(modal).getByLabelText("目标标题");

    await user.clear(titleInput);
    await user.type(titleInput, "Uncommitted goal");
    fireEvent.blur(titleInput);

    await waitFor(() =>
      expect(updateGoal).toHaveBeenCalledWith("/tmp/orchlet-demo", goal.goalId, {
        title: "Uncommitted goal",
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "无法写入工作区路线图目标。",
    );
    expect(titleInput).toHaveValue("Uncommitted goal");
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

  it("selects a conversation from the list by keyboard", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel();
    const projectRoom = conversationProfile({
      conversationId: "01K00000000000000000000066",
      kind: "group",
      title: "Project Room",
      participantKind: null,
      participantId: null,
      members: [],
    });
    const listMessages = vi.fn((request: ListMessagesRequest) =>
      Promise.resolve({
        messages: [],
        hasMore: false,
        nextBeforeMessageId: null,
        readPosition: null,
        conversation:
          request.conversationId === projectRoom.conversationId ? projectRoom : channel,
      } satisfies ListMessagesResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel, projectRoom] }),
        listMessages,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const projectRoomButton = await within(conversationPanel).findByRole("button", {
      name: /Project Room/,
    });
    projectRoomButton.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(listMessages).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
        conversationId: projectRoom.conversationId,
        beforeMessageId: null,
        limit: 30,
      });
    });
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
    let resolveSend!: (result: SendMessageAndDispatchResult) => void;
    const sendPromise = new Promise<SendMessageAndDispatchResult>((resolve) => {
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
    const sendMessageAndDispatch = vi.fn(() => sendPromise);
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
        sendMessageAndDispatch,
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
    expect(sendMessageAndDispatch).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: channel.conversationId,
      body: "Ship it",
      mentionedMemberIds: [],
      mentionAll: false,
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
      dispatches: [],
    });

    expect((await within(messageLog).findAllByText("sent")).length).toBeGreaterThan(0);
    expect(within(messageLog).getByText("Ship it")).toBeInTheDocument();
  });

  it("updates chat send keyboard behavior from shortcut preferences", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel();
    const sendMessageAndDispatch = vi.fn(() =>
      Promise.resolve({
        message: chatMessage({ body: "Ship it" }),
        conversation: channel,
        readPosition: readPosition(),
        dispatches: [],
      } satisfies SendMessageAndDispatchResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      settingsApi: {
        getShortcutPreferences: () =>
          Promise.resolve({
            preferences: shortcutPreferencesSnapshot({ profile: "vscode" }),
          }),
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        sendMessageAndDispatch,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const composer = within(conversationPanel).getByLabelText("输入消息");
    await user.type(composer, "Ship it");

    fireEvent.keyDown(composer, { key: "Enter" });
    expect(sendMessageAndDispatch).not.toHaveBeenCalled();

    fireEvent.keyDown(composer, { key: "Enter", ctrlKey: true });
    await waitFor(() => {
      expect(sendMessageAndDispatch).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
        conversationId: channel.conversationId,
        body: "Ship it",
        mentionedMemberIds: [],
        mentionAll: false,
      });
    });
  });

  it("hides quick prompts when shortcut hints are disabled", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      settingsApi: {
        getShortcutPreferences: () =>
          Promise.resolve({
            preferences: shortcutPreferencesSnapshot({ shortcutHintsEnabled: false }),
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    expect(within(conversationPanel).queryByLabelText("快捷提示")).not.toBeInTheDocument();
  });

  it("publishes aggregated workspace unread state and shows the main unread total", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel({
      unreadCount: 4,
      lastMessagePreview: "Latest note",
    });
    const projectRoom = conversationProfile({
      conversationId: "01K00000000000000000000080",
      kind: "group",
      title: "Project Room",
      participantKind: null,
      participantId: null,
      unreadCount: 2,
      lastMessagePreview: "Review ready",
      members: [],
      updatedAtMs: 1760000003000,
      lastActivityAtMs: 1760000003000,
    });
    const updateUnreadSummary = vi.fn((request: NotificationUnreadUpdateRequest) =>
      Promise.resolve({ summary: notificationSummary({ request }) }),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel, projectRoom] }),
        listMessages: () =>
          Promise.resolve({
            messages: [],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
      },
      notificationApi: {
        updateUnreadSummary,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    expect(await screen.findByLabelText("工作区未读总数")).toHaveTextContent("未读 6");
    await waitFor(() =>
      expect(updateUnreadSummary).toHaveBeenLastCalledWith({
        workspaceId: "01K00000000000000000000000",
        workspaceName: "orchlet-demo",
        conversations: [
          {
            conversationId: channel.conversationId,
            title: channel.title,
            unreadCount: 4,
            lastMessagePreview: "Latest note",
            terminalMemberId: null,
            workspacePath: "/tmp/orchlet-demo",
            conversationType: "channel",
            updatedAtMs: channel.updatedAtMs,
          },
          {
            conversationId: projectRoom.conversationId,
            title: projectRoom.title,
            unreadCount: 2,
            lastMessagePreview: "Review ready",
            terminalMemberId: null,
            workspacePath: "/tmp/orchlet-demo",
            conversationType: "group",
            updatedAtMs: projectRoom.updatedAtMs,
          },
        ],
        sourceWindowLabel: "main",
      }),
    );
  });

  it("republishes cleared unread state after a read-position update without refresh", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel({
      unreadCount: 2,
      lastMessagePreview: "Needs review",
    });
    const latestMessage = chatMessage({
      body: "Needs review",
      createdAtMs: 1760000003000,
      updatedAtMs: 1760000003000,
    });
    const updateUnreadSummary = vi.fn((request: NotificationUnreadUpdateRequest) =>
      Promise.resolve({ summary: notificationSummary({ request }) }),
    );
    const updateReadPosition = vi.fn(() =>
      Promise.resolve({
        readPosition: readPosition({
          lastReadMessageId: latestMessage.messageId,
          lastReadAtMs: latestMessage.createdAtMs,
        }),
        conversation: {
          ...channel,
          unreadCount: 0,
          updatedAtMs: 1760000004000,
        },
      } satisfies UpdateReadPositionResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages: () =>
          Promise.resolve({
            messages: [latestMessage],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
        updateReadPosition,
      },
      notificationApi: {
        updateUnreadSummary,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    expect(await screen.findByLabelText("工作区未读总数")).toHaveTextContent("未读 2");
    await waitFor(() => expect(updateReadPosition).toHaveBeenCalled());
    await waitFor(() =>
      expect(updateUnreadSummary).toHaveBeenLastCalledWith({
        workspaceId: "01K00000000000000000000000",
        workspaceName: "orchlet-demo",
        conversations: [],
        sourceWindowLabel: "main",
      }),
    );
    expect(screen.getByLabelText("工作区未读总数")).toHaveTextContent("未读 0");
  });

  it("updates the notification preview from unread summary events", async () => {
    let unreadHandler: ((summary: NotificationUnreadSummary) => void) | null = null;
    const initialSummary = notificationSummary({
      overrides: {
        workspaceId: "01K00000000000000000000000",
        workspaceName: "orchlet-demo",
        conversations: [
          {
            conversationId: "01K00000000000000000000080",
            title: "Project Room",
            unreadCount: 1,
            lastMessagePreview: "Review ready",
            updatedAtMs: 1760000003000,
          },
        ],
      },
    });
    const nextSummary = notificationSummary({
      overrides: {
        workspaceId: "01K00000000000000000000000",
        workspaceName: "orchlet-demo",
        conversations: [
          {
            conversationId: "01K00000000000000000000081",
            title: "Ops Room",
            unreadCount: 3,
            lastMessagePreview: "Deploy done",
            updatedAtMs: 1760000004000,
          },
        ],
      },
    });

    render(
      <NotificationPreviewPage
        snapshot={notificationPreviewSnapshot()}
        api={{
          getUnreadSummary: () => Promise.resolve({ summary: initialSummary }),
          subscribeUnreadSummary: async (handler: (summary: NotificationUnreadSummary) => void) => {
            unreadHandler = handler;
            return () => undefined;
          },
          dispatchNavigation: (request) =>
            Promise.resolve({ action: notificationNavigationAction(request) }),
          ignoreAllUnread: () => Promise.resolve({ summary: notificationSummary(), ignoredCount: 0 }),
          setPreviewHovered: () => Promise.resolve(),
          hidePreview: () => Promise.resolve(),
        }}
        onPreferencesChange={() => Promise.resolve()}
        onOpenWindowMode={() => Promise.resolve()}
      />,
    );

    expect(await screen.findByRole("heading", { name: "未读状态" })).toBeInTheDocument();
    expect(screen.getByLabelText("通知未读总数")).toHaveTextContent("1");
    expect(screen.getByText("Project Room")).toBeInTheDocument();
    expect(screen.getByText("托盘 1")).toBeInTheDocument();

    act(() => {
      unreadHandler?.(nextSummary);
    });

    expect(await screen.findByText("Ops Room")).toBeInTheDocument();
    expect(screen.getByLabelText("通知未读总数")).toHaveTextContent("3");
    expect(screen.getByText("托盘 3")).toBeInTheDocument();
  });

  it("dispatches view-all unread navigation from notification preview", async () => {
    const user = userEvent.setup();
    const summary = notificationSummary({
      overrides: {
        workspaceId: "01K00000000000000000000000",
        workspaceName: "orchlet-demo",
        conversations: [
          {
            conversationId: "01K00000000000000000000080",
            title: "Project Room",
            unreadCount: 2,
            lastMessagePreview: "Review ready",
            updatedAtMs: 1760000003000,
          },
        ],
      },
    });
    const dispatchNavigation = vi.fn((request: NotificationNavigationRequest) =>
      Promise.resolve({ action: notificationNavigationAction(request) }),
    );
    const hidePreview = vi.fn(() => Promise.resolve());
    const onOpenWindowMode = vi.fn(() => Promise.resolve());

    render(
      <NotificationPreviewPage
        snapshot={notificationPreviewSnapshot()}
        api={{
          getUnreadSummary: () => Promise.resolve({ summary }),
          subscribeUnreadSummary: () => Promise.resolve(() => undefined),
          dispatchNavigation,
          ignoreAllUnread: () => Promise.resolve({ summary: notificationSummary(), ignoredCount: 0 }),
          setPreviewHovered: () => Promise.resolve(),
          hidePreview,
        }}
        onPreferencesChange={() => Promise.resolve()}
        onOpenWindowMode={onOpenWindowMode}
      />,
    );

    const viewAllButton = await screen.findByRole("button", { name: "查看全部未读" });
    viewAllButton.focus();
    await user.keyboard("{Enter}");

    expect(onOpenWindowMode).toHaveBeenCalledWith("main");
    expect(hidePreview).toHaveBeenCalledTimes(1);
    expect(dispatchNavigation).toHaveBeenCalledWith({
      kind: "allUnread",
      workspaceId: "01K00000000000000000000000",
      conversationId: null,
      memberId: null,
      sourceWindowLabel: "notification-preview",
    });
    expect(hidePreview.mock.invocationCallOrder[0]).toBeLessThan(
      dispatchNavigation.mock.invocationCallOrder[0],
    );
  });

  it("reports notification preview hover state to native lifecycle APIs", async () => {
    const user = userEvent.setup();
    const setPreviewHovered = vi.fn(() => Promise.resolve());
    const summary = notificationSummary({
      overrides: {
        workspaceId: "01K00000000000000000000000",
        workspaceName: "orchlet-demo",
        conversations: [
          {
            conversationId: "01K00000000000000000000080",
            title: "Project Room",
            unreadCount: 1,
            lastMessagePreview: "Review ready",
            updatedAtMs: 1760000003000,
          },
        ],
      },
    });

    render(
      <NotificationPreviewPage
        snapshot={notificationPreviewSnapshot()}
        api={{
          getUnreadSummary: () => Promise.resolve({ summary }),
          subscribeUnreadSummary: () => Promise.resolve(() => undefined),
          dispatchNavigation: (request) =>
            Promise.resolve({ action: notificationNavigationAction(request) }),
          ignoreAllUnread: () => Promise.resolve({ summary: notificationSummary(), ignoredCount: 0 }),
          setPreviewHovered,
          hidePreview: () => Promise.resolve(),
        }}
        onPreferencesChange={() => Promise.resolve()}
        onOpenWindowMode={() => Promise.resolve()}
      />,
    );

    const previewCard = (await screen.findByRole("heading", { name: "未读状态" })).closest(
      ".notification-preview-card",
    );
    expect(previewCard).not.toBeNull();

    await user.hover(previewCard as Element);
    await user.unhover(previewCard as Element);

    expect(setPreviewHovered).toHaveBeenNthCalledWith(1, true);
    expect(setPreviewHovered).toHaveBeenNthCalledWith(2, false);
  });

  it("dispatches conversation navigation from a notification preview row", async () => {
    const user = userEvent.setup();
    const summary = notificationSummary({
      overrides: {
        workspaceId: "01K00000000000000000000000",
        workspaceName: "orchlet-demo",
        conversations: [
          {
            conversationId: "01K00000000000000000000080",
            title: "Project Room",
            unreadCount: 1,
            lastMessagePreview: "Review ready",
            updatedAtMs: 1760000003000,
          },
        ],
      },
    });
    const dispatchNavigation = vi.fn((request: NotificationNavigationRequest) =>
      Promise.resolve({ action: notificationNavigationAction(request) }),
    );

    render(
      <NotificationPreviewPage
        snapshot={notificationPreviewSnapshot()}
        api={{
          getUnreadSummary: () => Promise.resolve({ summary }),
          subscribeUnreadSummary: () => Promise.resolve(() => undefined),
          dispatchNavigation,
          ignoreAllUnread: () => Promise.resolve({ summary: notificationSummary(), ignoredCount: 0 }),
          setPreviewHovered: () => Promise.resolve(),
          hidePreview: () => Promise.resolve(),
        }}
        onPreferencesChange={() => Promise.resolve()}
        onOpenWindowMode={() => Promise.resolve()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "打开会话 Project Room" }));

    expect(dispatchNavigation).toHaveBeenCalledWith({
      kind: "conversation",
      workspaceId: "01K00000000000000000000000",
      conversationId: "01K00000000000000000000080",
      memberId: null,
      sourceWindowLabel: "notification-preview",
    });
  });

  it("opens a member terminal from notification preview when a terminal target exists", async () => {
    const user = userEvent.setup();
    const summary = notificationSummary({
      overrides: {
        workspaceId: "01K00000000000000000000000",
        workspaceName: "orchlet-demo",
        conversations: [
          {
            conversationId: "01K00000000000000000000090",
            title: "Codex",
            unreadCount: 1,
            lastMessagePreview: "Done",
            terminalMemberId: "01K00000000000000000000021",
            updatedAtMs: 1760000003000,
          },
        ],
      },
    });
    const openTerminal = vi.fn(() => Promise.resolve(terminalOpenResult()));

    render(
      <NotificationPreviewPage
        snapshot={notificationPreviewSnapshot()}
        api={{
          getUnreadSummary: () => Promise.resolve({ summary }),
          subscribeUnreadSummary: () => Promise.resolve(() => undefined),
          dispatchNavigation: (request) =>
            Promise.resolve({ action: notificationNavigationAction(request) }),
          ignoreAllUnread: () => Promise.resolve({ summary: notificationSummary(), ignoredCount: 0 }),
          setPreviewHovered: () => Promise.resolve(),
          hidePreview: () => Promise.resolve(),
        }}
        terminalApi={{ openTerminal }}
        onPreferencesChange={() => Promise.resolve()}
        onOpenWindowMode={() => Promise.resolve()}
      />,
    );

    const openTerminalButton = await screen.findByRole("button", { name: "打开终端" });
    openTerminalButton.focus();
    await user.keyboard("{Enter}");

    expect(openTerminal).toHaveBeenCalledWith({
      memberId: "01K00000000000000000000021",
    });
  });

  it("ignores all unread notifications after the command succeeds", async () => {
    const user = userEvent.setup();
    const summary = notificationSummary({
      overrides: {
        workspaceId: "01K00000000000000000000000",
        workspaceName: "orchlet-demo",
        conversations: [
          {
            conversationId: "01K00000000000000000000080",
            title: "Project Room",
            unreadCount: 2,
            lastMessagePreview: "Review ready",
            updatedAtMs: 1760000003000,
          },
        ],
      },
    });
    const clearedSummary = notificationSummary({
      overrides: {
        workspaceId: "01K00000000000000000000000",
        workspaceName: "orchlet-demo",
        conversations: [],
        totalUnreadCount: 0,
      },
    });
    const ignoreAllUnread = vi.fn(() =>
      Promise.resolve({
        summary: clearedSummary,
        ignoredCount: 1,
      }),
    );

    render(
      <NotificationPreviewPage
        snapshot={notificationPreviewSnapshot()}
        api={{
          getUnreadSummary: () => Promise.resolve({ summary }),
          subscribeUnreadSummary: () => Promise.resolve(() => undefined),
          dispatchNavigation: (request) =>
            Promise.resolve({ action: notificationNavigationAction(request) }),
          ignoreAllUnread,
          setPreviewHovered: () => Promise.resolve(),
          hidePreview: () => Promise.resolve(),
        }}
        onPreferencesChange={() => Promise.resolve()}
        onOpenWindowMode={() => Promise.resolve()}
      />,
    );

    const ignoreAllButton = await screen.findByRole("button", { name: "忽略全部" });
    ignoreAllButton.focus();
    await user.keyboard("{Enter}");

    expect(ignoreAllUnread).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      sourceWindowLabel: "notification-preview",
    });
    expect(await screen.findByText("暂无未读会话")).toBeInTheDocument();
    expect(screen.getByLabelText("通知未读总数")).toHaveTextContent("0");
    expect(screen.getByText("无未读")).toBeInTheDocument();
  });

  it("keeps visible unread notifications and shows a recoverable error when ignore-all fails", async () => {
    const user = userEvent.setup();
    const summary = notificationSummary({
      overrides: {
        workspaceId: "01K00000000000000000000000",
        workspaceName: "orchlet-demo",
        conversations: [
          {
            conversationId: "01K00000000000000000000080",
            title: "Project Room",
            unreadCount: 2,
            lastMessagePreview: "Review ready",
            updatedAtMs: 1760000003000,
          },
        ],
      },
    });

    render(
      <NotificationPreviewPage
        snapshot={notificationPreviewSnapshot()}
        api={{
          getUnreadSummary: () => Promise.resolve({ summary }),
          subscribeUnreadSummary: () => Promise.resolve(() => undefined),
          dispatchNavigation: (request) =>
            Promise.resolve({ action: notificationNavigationAction(request) }),
          ignoreAllUnread: () => Promise.reject(new Error("无法忽略全部未读通知。")),
          setPreviewHovered: () => Promise.resolve(),
          hidePreview: () => Promise.resolve(),
        }}
        onPreferencesChange={() => Promise.resolve()}
        onOpenWindowMode={() => Promise.resolve()}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "忽略全部" }));

    expect(await screen.findByText("无法忽略全部未读通知。")).toBeInTheDocument();
    expect(screen.getByText("Project Room")).toBeInTheDocument();
    expect(screen.getByLabelText("通知未读总数")).toHaveTextContent("2");
  });

  it("opens the main workspace unread view from a pending notification navigation action", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel({ unreadCount: 0 });
    const projectRoom = conversationProfile({
      conversationId: "01K00000000000000000000080",
      kind: "group",
      title: "Project Room",
      participantKind: null,
      participantId: null,
      unreadCount: 2,
      lastMessagePreview: "Review ready",
      members: [],
      updatedAtMs: 1760000003000,
      lastActivityAtMs: 1760000003000,
    });
    const action = notificationNavigationAction({
      kind: "allUnread",
      workspaceId: "01K00000000000000000000000",
      conversationId: null,
      memberId: null,
      sourceWindowLabel: "notification-preview",
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel, projectRoom] }),
        listMessages: ({ conversationId }) =>
          Promise.resolve({
            messages: [],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: conversationId === projectRoom.conversationId ? projectRoom : channel,
          }),
      },
      notificationApi: {
        getPendingNavigation: () => Promise.resolve({ action }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    expect(await screen.findByRole("button", { name: "未读 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByText("Project Room").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /默认频道/ })).not.toBeInTheDocument();
  });

  it("selects a conversation in the main workspace from notification navigation events", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel({ unreadCount: 0 });
    const projectRoom = conversationProfile({
      conversationId: "01K00000000000000000000080",
      kind: "group",
      title: "Project Room",
      participantKind: null,
      participantId: null,
      unreadCount: 1,
      lastMessagePreview: "Review ready",
      members: [],
      updatedAtMs: 1760000003000,
      lastActivityAtMs: 1760000003000,
    });
    let navigationHandler: ((action: NotificationNavigationAction) => void) | null = null;
    const listMessages = vi.fn(({ conversationId }: ListMessagesRequest) =>
      Promise.resolve({
        messages: [],
        hasMore: false,
        nextBeforeMessageId: null,
        readPosition: null,
        conversation: conversationId === projectRoom.conversationId ? projectRoom : channel,
      }),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel, projectRoom] }),
        listMessages,
      },
      notificationApi: {
        subscribeNavigation: async (handler) => {
          navigationHandler = handler;
          return () => undefined;
        },
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    expect(await screen.findByRole("button", { name: /默认频道/ })).toBeInTheDocument();

    act(() => {
      navigationHandler?.(
        notificationNavigationAction({
          kind: "conversation",
          workspaceId: "01K00000000000000000000000",
          conversationId: projectRoom.conversationId,
          memberId: null,
          sourceWindowLabel: "notification-preview",
        }),
      );
    });

    await waitFor(() =>
      expect(listMessages).toHaveBeenLastCalledWith({
        workspaceId: "01K00000000000000000000000",
        conversationId: projectRoom.conversationId,
        beforeMessageId: null,
        limit: 30,
      }),
    );
    expect(screen.getByRole("button", { name: "全部" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps terminal output observable while unread aggregation updates", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel({
      unreadCount: 1,
      lastMessagePreview: "Ping",
    });
    let outputHandler: ((event: TerminalOutputEventPayload) => void) | null = null;
    const subscribeOutput = vi.fn(async (handler: (event: TerminalOutputEventPayload) => void) => {
      outputHandler = handler;
      return vi.fn();
    });
    const updateUnreadSummary = vi.fn((request: NotificationUnreadUpdateRequest) =>
      Promise.resolve({ summary: notificationSummary({ request }) }),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages: () =>
          Promise.resolve({
            messages: [],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
      },
      terminalApi: {
        subscribeOutput,
      },
      notificationApi: {
        updateUnreadSummary,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await waitFor(() => expect(updateUnreadSummary).toHaveBeenCalled());
    await waitFor(() => expect(subscribeOutput).toHaveBeenCalled());

    act(() => {
      outputHandler?.(
        terminalOutputEvent({
          terminalSessionId: "01KTERMINAL00000000000023",
          seq: 1,
          chunk: "still streaming\n",
          emittedAtMs: 1760000008000,
        }),
      );
    });

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
    await waitFor(() =>
      expect(within(messageLog).getByLabelText("终端输出流")).toHaveTextContent(
        "still streaming",
      ),
    );
    expect(screen.getByLabelText("工作区未读总数")).toHaveTextContent("未读 1");
  });

  it("renders terminal output streams in sequence order", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
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
    });
    let outputHandler: ((event: TerminalOutputEventPayload) => void) | null = null;
    let statusHandler: ((event: TerminalStatusEventPayload) => void) | null = null;
    const subscribeOutput = vi.fn(async (handler: (event: TerminalOutputEventPayload) => void) => {
      outputHandler = handler;
      return vi.fn();
    });
    const subscribeStatus = vi.fn(async (handler: (event: TerminalStatusEventPayload) => void) => {
      statusHandler = handler;
      return vi.fn();
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer] }),
      },
      terminalApi: {
        subscribeOutput,
        subscribeStatus,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await waitFor(() => expect(subscribeOutput).toHaveBeenCalled());
    await waitFor(() => expect(subscribeStatus).toHaveBeenCalled());

    act(() => {
      statusHandler?.(
        terminalStatusEvent({
          memberId: reviewer.memberId,
          title: "Reviewer shell",
          emittedAtMs: 1760000004000,
        }),
      );
      outputHandler?.(
        terminalOutputEvent({
          memberId: reviewer.memberId,
          seq: 2,
          chunk: "second\n",
          emittedAtMs: 1760000004020,
        }),
      );
      outputHandler?.(
        terminalOutputEvent({
          memberId: reviewer.memberId,
          seq: 1,
          chunk: "first\n",
          emittedAtMs: 1760000004010,
        }),
      );
    });

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
    const stream = await within(messageLog).findByLabelText("终端输出流");

    expect(stream).toHaveTextContent("Reviewer");
    expect(stream).toHaveTextContent("Reviewer shell");
    expect(stream).toHaveTextContent("运行中");
    await waitFor(() =>
      expect(stream.querySelector("pre")?.textContent).toBe("first\nsecond\n"),
    );
  });

  it("shows only final terminal output in chat when final-only preference is active", async () => {
    const user = userEvent.setup();
    let outputHandler: ((event: TerminalOutputEventPayload) => void) | null = null;
    let statusHandler: ((event: TerminalStatusEventPayload) => void) | null = null;
    const subscribeOutput = vi.fn(async (handler: (event: TerminalOutputEventPayload) => void) => {
      outputHandler = handler;
      return vi.fn();
    });
    const subscribeStatus = vi.fn(async (handler: (event: TerminalStatusEventPayload) => void) => {
      statusHandler = handler;
      return vi.fn();
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      terminalApi: {
        subscribeOutput,
        subscribeStatus,
      },
      settingsApi: {
        getChatTerminalOutputPreferences: () =>
          Promise.resolve({
            preferences: chatTerminalOutputPreferencesSnapshot({ displayMode: "finalOnly" }),
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await waitFor(() => expect(subscribeOutput).toHaveBeenCalled());
    await waitFor(() => expect(subscribeStatus).toHaveBeenCalled());

    act(() => {
      outputHandler?.(
        terminalOutputEvent({
          terminalSessionId: "01KTERMINAL00000000000025",
          seq: 1,
          chunk: "live hidden\n",
          emittedAtMs: 1760000010000,
        }),
      );
    });

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    });
    expect(within(messageLog).queryByText("live hidden")).not.toBeInTheDocument();

    act(() => {
      statusHandler?.(
        terminalStatusEvent({
          terminalSessionId: "01KTERMINAL00000000000025",
          status: "exited",
          snapshot: {
            lastSeq: 1,
            text: "final result\n",
            truncated: false,
            updatedAtMs: 1760000010200,
          },
          emittedAtMs: 1760000010300,
        }),
      );
    });

    await waitFor(() =>
      expect(within(messageLog).getByLabelText("终端输出流")).toHaveTextContent(
        "final result",
      ),
    );
  });

  it("keeps newer final-only terminal output when a stale exit snapshot arrives", async () => {
    const user = userEvent.setup();
    let statusHandler: ((event: TerminalStatusEventPayload) => void) | null = null;
    const subscribeStatus = vi.fn(async (handler: (event: TerminalStatusEventPayload) => void) => {
      statusHandler = handler;
      return vi.fn();
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      terminalApi: {
        subscribeStatus,
      },
      settingsApi: {
        getChatTerminalOutputPreferences: () =>
          Promise.resolve({
            preferences: chatTerminalOutputPreferencesSnapshot({ displayMode: "finalOnly" }),
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await waitFor(() => expect(subscribeStatus).toHaveBeenCalled());

    act(() => {
      statusHandler?.(
        terminalStatusEvent({
          terminalSessionId: "01KTERMINAL00000000000031",
          status: "exited",
          snapshot: {
            lastSeq: 2,
            text: "newer final result\n",
            truncated: false,
            updatedAtMs: 1760000013100,
          },
          emittedAtMs: 1760000013200,
        }),
      );
    });

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
    await waitFor(() =>
      expect(within(messageLog).getByLabelText("终端输出流")).toHaveTextContent(
        "newer final result",
      ),
    );

    act(() => {
      statusHandler?.(
        terminalStatusEvent({
          terminalSessionId: "01KTERMINAL00000000000031",
          status: "exited",
          snapshot: {
            lastSeq: 1,
            text: "stale final result\n",
            truncated: false,
            updatedAtMs: 1760000013000,
          },
          emittedAtMs: 1760000013300,
        }),
      );
    });

    await waitFor(() => {
      const streamText =
        within(messageLog).getByLabelText("终端输出流").querySelector("pre")?.textContent ?? "";

      expect(streamText).toBe("newer final result\n");
      expect(streamText).not.toContain("stale final result");
    });
  });

  it("uses bounded final-only buffered output when the exit snapshot is empty", async () => {
    const user = userEvent.setup();
    let outputHandler: ((event: TerminalOutputEventPayload) => void) | null = null;
    let statusHandler: ((event: TerminalStatusEventPayload) => void) | null = null;
    const subscribeOutput = vi.fn(async (handler: (event: TerminalOutputEventPayload) => void) => {
      outputHandler = handler;
      return vi.fn();
    });
    const subscribeStatus = vi.fn(async (handler: (event: TerminalStatusEventPayload) => void) => {
      statusHandler = handler;
      return vi.fn();
    });
    const terminalSessionId = "01KTERMINAL00000000000032";

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      terminalApi: {
        subscribeOutput,
        subscribeStatus,
      },
      settingsApi: {
        getChatTerminalOutputPreferences: () =>
          Promise.resolve({
            preferences: chatTerminalOutputPreferencesSnapshot({ displayMode: "finalOnly" }),
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await waitFor(() => expect(subscribeOutput).toHaveBeenCalled());
    await waitFor(() => expect(subscribeStatus).toHaveBeenCalled());

    act(() => {
      for (let seq = 1; seq <= 1050; seq += 1) {
        outputHandler?.(
          terminalOutputEvent({
            terminalSessionId,
            seq,
            chunk:
              seq === 1
                ? `old-prefix${"x".repeat(4100)}`
                : seq === 1050
                  ? "fresh-tail"
                  : `line-${seq}\n`,
            emittedAtMs: 1760000014000 + seq,
          }),
        );
      }
    });

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    });
    expect(within(messageLog).queryByText("fresh-tail")).not.toBeInTheDocument();

    act(() => {
      statusHandler?.(
        terminalStatusEvent({
          terminalSessionId,
          status: "exited",
          snapshot: {
            lastSeq: 0,
            text: "",
            truncated: false,
            updatedAtMs: null,
          },
          emittedAtMs: 1760000015200,
        }),
      );
    });

    await waitFor(() => {
      const streamText =
        within(messageLog).getByLabelText("终端输出流").querySelector("pre")?.textContent ?? "";

      expect(streamText).toContain("fresh-tail");
      expect(streamText).not.toContain("old-prefix");
      expect(streamText.length).toBeLessThanOrEqual(4000);
    });
  });

  it("keeps existing conversation messages unchanged while new output follows final-only mode", async () => {
    const user = userEvent.setup();
    let outputHandler: ((event: TerminalOutputEventPayload) => void) | null = null;
    let statusHandler: ((event: TerminalStatusEventPayload) => void) | null = null;
    const subscribeOutput = vi.fn(async (handler: (event: TerminalOutputEventPayload) => void) => {
      outputHandler = handler;
      return vi.fn();
    });
    const subscribeStatus = vi.fn(async (handler: (event: TerminalStatusEventPayload) => void) => {
      statusHandler = handler;
      return vi.fn();
    });
    const existingMessage = chatMessage({
      messageId: "01K00000000000000000000177",
      body: "Existing streamed transcript stays untouched",
      createdAtMs: 1760000007000,
      updatedAtMs: 1760000007000,
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      terminalApi: {
        subscribeOutput,
        subscribeStatus,
      },
      settingsApi: {
        getChatTerminalOutputPreferences: () =>
          Promise.resolve({
            preferences: chatTerminalOutputPreferencesSnapshot({ displayMode: "finalOnly" }),
          }),
      },
      chatApi: {
        listMessages: () =>
          Promise.resolve({
            messages: [existingMessage],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: defaultChannel(),
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await waitFor(() => expect(subscribeOutput).toHaveBeenCalled());
    await waitFor(() => expect(subscribeStatus).toHaveBeenCalled());

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
    expect(await within(messageLog).findByText("Existing streamed transcript stays untouched"))
      .toBeInTheDocument();

    act(() => {
      outputHandler?.(
        terminalOutputEvent({
          terminalSessionId: "01KTERMINAL00000000000028",
          seq: 1,
          chunk: "new live chunk stays hidden\n",
          emittedAtMs: 1760000012000,
        }),
      );
    });

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    });
    expect(within(messageLog).queryByText("new live chunk stays hidden")).not.toBeInTheDocument();
    expect(within(messageLog).getByText("Existing streamed transcript stays untouched"))
      .toBeInTheDocument();

    act(() => {
      statusHandler?.(
        terminalStatusEvent({
          terminalSessionId: "01KTERMINAL00000000000028",
          status: "exited",
          snapshot: {
            lastSeq: 1,
            text: "new final transcript\n",
            truncated: false,
            updatedAtMs: 1760000012200,
          },
          emittedAtMs: 1760000012300,
        }),
      );
    });

    await waitFor(() =>
      expect(within(messageLog).getByLabelText("终端输出流")).toHaveTextContent(
        "new final transcript",
      ),
    );
    expect(within(messageLog).getByText("Existing streamed transcript stays untouched"))
      .toBeInTheDocument();
  });

  it("shows terminal runtime status on members without overwriting manual status", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
      status: "online",
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
    });
    let statusHandler: ((event: TerminalStatusEventPayload) => void) | null = null;
    const subscribeStatus = vi.fn(async (handler: (event: TerminalStatusEventPayload) => void) => {
      statusHandler = handler;
      return vi.fn();
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer] }),
      },
      terminalApi: {
        subscribeStatus,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await waitFor(() => expect(subscribeStatus).toHaveBeenCalled());

    act(() => {
      statusHandler?.(
        terminalStatusEvent({
          terminalSessionId: "01KTERMINAL00000000000021",
          memberId: reviewer.memberId,
          title: "Reviewer shell",
          status: "running",
          emittedAtMs: 1760000005000,
        }),
      );
    });

    expect(await screen.findByText(/终端：运行中 · 000021/)).toBeInTheDocument();
    expect(screen.getByText(/Assistant · 在线 · Codex CLI/)).toBeInTheDocument();

    act(() => {
      statusHandler?.(
        terminalStatusEvent({
          terminalSessionId: "01KTERMINAL00000000000021",
          memberId: reviewer.memberId,
          title: "Reviewer shell",
          status: "exited",
          exitReason: {
            code: "process.exit",
            message: "进程退出",
            occurredAtMs: 1760000006000,
          },
          emittedAtMs: 1760000006000,
        }),
      );
    });

    expect(await screen.findByText(/终端：已退出 · 000021 · 进程退出/))
      .toBeInTheDocument();
    expect(screen.getByText(/Assistant · 在线 · Codex CLI/)).toBeInTheDocument();
  });

  it("keeps high-volume terminal output bounded while chat input remains usable", async () => {
    const user = userEvent.setup();
    let outputHandler: ((event: TerminalOutputEventPayload) => void) | null = null;
    const subscribeOutput = vi.fn(async (handler: (event: TerminalOutputEventPayload) => void) => {
      outputHandler = handler;
      return vi.fn();
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      terminalApi: {
        subscribeOutput,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await waitFor(() => expect(subscribeOutput).toHaveBeenCalled());

    act(() => {
      outputHandler?.(
        terminalOutputEvent({
          terminalSessionId: "01KTERMINAL00000000000022",
          seq: 1,
          chunk: `old-prefix${"x".repeat(4100)}fresh-tail`,
          emittedAtMs: 1760000007000,
        }),
      );
    });

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const messageLog = await within(conversationPanel).findByRole("log", { name: "消息历史" });
    await waitFor(() => {
      const stream = within(messageLog).getByLabelText("终端输出流");
      const streamText = stream.querySelector("pre")?.textContent ?? "";

      expect(streamText).toContain("fresh-tail");
      expect(streamText).not.toContain("old-prefix");
      expect(streamText.length).toBeLessThanOrEqual(4000);
    });
    expect(within(conversationPanel).getByLabelText("输入消息")).toBeEnabled();
  });

  it("dispatches a mentioned chat message to the member terminal", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
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
    });
    const channel = defaultChannel();
    const message = chatMessage({
      body: "@Reviewer please review",
      mentionedMemberIds: [reviewer.memberId],
    });
    const dispatchChatMessage = vi.fn(() =>
      Promise.resolve({
        dispatch: {
          schemaVersion: 1,
          dispatchRequestId: "01KDISPATCH00000000000001",
          workspaceId: channel.workspaceId,
          conversationId: channel.conversationId,
          messageId: message.messageId,
          sourceMessageIds: [message.messageId],
          memberId: reviewer.memberId,
          targetResolution: {
            memberId: reviewer.memberId,
            source: "explicitMention",
            reason: "消息明确提及 Reviewer。",
          },
          status: "dispatched",
          terminalSessionId: "01KTERMINAL00000000000010",
          failure: null,
          createdAtMs: 1760000002000,
          updatedAtMs: 1760000002001,
        },
        terminalSession: terminalOpenResult({
          session: {
            ...terminalOpenResult().session,
            terminalSessionId: "01KTERMINAL00000000000010",
            memberId: reviewer.memberId,
            title: "Reviewer",
          },
        }).session,
        sessionCreated: true,
      } satisfies DispatchChatMessageResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer] }),
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages: () =>
          Promise.resolve({
            messages: [message],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
        updateReadPosition: () =>
          Promise.resolve({
            readPosition: readPosition({
              lastReadMessageId: message.messageId,
            }),
            conversation: channel,
          }),
      },
      terminalDispatchApi: {
        dispatchChatMessage,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.click(await within(conversationPanel).findByRole("button", {
      name: "派发到 Reviewer",
    }));

    expect(dispatchChatMessage).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: channel.conversationId,
      messageId: message.messageId,
      memberId: null,
    });
    expect(await within(conversationPanel).findByText(/已派发到 Reviewer/))
      .toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("消息已派发");
  });

  it("shows skipped dispatch state for a do-not-disturb member", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
      status: "doNotDisturb",
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
    });
    const channel = defaultChannel();
    const message = chatMessage({
      body: "@Reviewer please review",
      mentionedMemberIds: [reviewer.memberId],
    });
    const dispatchChatMessage = vi.fn(() =>
      Promise.resolve({
        dispatch: {
          schemaVersion: 1,
          dispatchRequestId: "01KDISPATCH00000000000005",
          workspaceId: channel.workspaceId,
          conversationId: channel.conversationId,
          messageId: message.messageId,
          sourceMessageIds: [message.messageId],
          memberId: reviewer.memberId,
          targetResolution: {
            memberId: reviewer.memberId,
            source: "explicitMention",
            reason: "消息明确提及 Reviewer。",
          },
          status: "skipped",
          terminalSessionId: null,
          failure: null,
          createdAtMs: 1760000002000,
          updatedAtMs: 1760000002001,
        },
        terminalSession: null,
        sessionCreated: false,
      } satisfies DispatchChatMessageResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer] }),
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages: () =>
          Promise.resolve({
            messages: [message],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
        updateReadPosition: () =>
          Promise.resolve({
            readPosition: readPosition({
              lastReadMessageId: message.messageId,
            }),
            conversation: channel,
          }),
      },
      terminalDispatchApi: {
        dispatchChatMessage,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.click(await within(conversationPanel).findByRole("button", {
      name: "派发到 Reviewer",
    }));

    expect(await within(conversationPanel).findAllByText(/已跳过/)).not.toHaveLength(0);
    expect(
      within(conversationPanel).getByText("Reviewer 正在请勿打扰，派发已跳过。"),
    ).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("派发已跳过");
  });

  it("shows queued dispatch state for a working member", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
      status: "working",
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
    });
    const channel = defaultChannel();
    const message = chatMessage({
      body: "@Reviewer please review",
      mentionedMemberIds: [reviewer.memberId],
    });
    const dispatchChatMessage = vi.fn(() =>
      Promise.resolve({
        dispatch: {
          schemaVersion: 1,
          dispatchRequestId: "01KDISPATCH00000000000006",
          workspaceId: channel.workspaceId,
          conversationId: channel.conversationId,
          messageId: message.messageId,
          sourceMessageIds: [message.messageId],
          memberId: reviewer.memberId,
          targetResolution: {
            memberId: reviewer.memberId,
            source: "explicitMention",
            reason: "消息明确提及 Reviewer。",
          },
          status: "queued",
          terminalSessionId: null,
          failure: null,
          createdAtMs: 1760000002000,
          updatedAtMs: 1760000002001,
        },
        terminalSession: null,
        sessionCreated: false,
      } satisfies DispatchChatMessageResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer] }),
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages: () =>
          Promise.resolve({
            messages: [message],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
        updateReadPosition: () =>
          Promise.resolve({
            readPosition: readPosition({
              lastReadMessageId: message.messageId,
            }),
            conversation: channel,
          }),
      },
      terminalDispatchApi: {
        dispatchChatMessage,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.click(await within(conversationPanel).findByRole("button", {
      name: "派发到 Reviewer",
    }));

    expect(await within(conversationPanel).findByText(/已排队/)).toBeInTheDocument();
    expect(
      within(conversationPanel).getByText("Reviewer 正在工作中，任务已加入队列。"),
    ).toBeInTheDocument();
    expect(
      within(conversationPanel).getByText("成员设为在线后会继续下一条队列任务。"),
    ).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("任务已排队");
  });

  it("resumes one queued dispatch when a working member is set online", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
      status: "working",
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
    });
    const onlineReviewer: MemberProfile = {
      ...reviewer,
      status: "online",
      updatedAtMs: 1760000003000,
    };
    const channel = defaultChannel();
    const message = chatMessage({
      body: "@Reviewer please review",
      mentionedMemberIds: [reviewer.memberId],
    });
    const dispatchChatMessage = vi.fn(() =>
      Promise.resolve({
        dispatch: {
          schemaVersion: 1,
          dispatchRequestId: "01KDISPATCH00000000000007",
          workspaceId: channel.workspaceId,
          conversationId: channel.conversationId,
          messageId: message.messageId,
          sourceMessageIds: [message.messageId],
          memberId: reviewer.memberId,
          targetResolution: {
            memberId: reviewer.memberId,
            source: "explicitMention",
            reason: "消息明确提及 Reviewer。",
          },
          status: "queued",
          terminalSessionId: null,
          failure: null,
          createdAtMs: 1760000002000,
          updatedAtMs: 1760000002001,
        },
        terminalSession: null,
        sessionCreated: false,
      } satisfies DispatchChatMessageResult),
    );
    const updateMemberStatus = vi.fn(() =>
      Promise.resolve({
        member: onlineReviewer,
        members: [onlineReviewer],
      } satisfies UpdateMemberStatusResult),
    );
    const resumeMemberDispatchQueue = vi.fn(() =>
      Promise.resolve({
        dispatch: {
          schemaVersion: 1,
          dispatchRequestId: "01KDISPATCH00000000000007",
          workspaceId: channel.workspaceId,
          conversationId: channel.conversationId,
          messageId: message.messageId,
          sourceMessageIds: [message.messageId],
          memberId: reviewer.memberId,
          targetResolution: {
            memberId: reviewer.memberId,
            source: "explicitMention",
            reason: "消息明确提及 Reviewer。",
          },
          status: "dispatched",
          terminalSessionId: "01KTERMINAL00000000000013",
          failure: null,
          createdAtMs: 1760000002000,
          updatedAtMs: 1760000003001,
        },
        terminalSession: terminalOpenResult({
          session: {
            ...terminalOpenResult().session,
            terminalSessionId: "01KTERMINAL00000000000013",
            memberId: reviewer.memberId,
            title: "Reviewer",
          },
        }).session,
        sessionCreated: true,
        queueRemaining: 0,
      } satisfies DispatchQueueResumeResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer] }),
        updateMemberStatus,
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages: () =>
          Promise.resolve({
            messages: [message],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
        updateReadPosition: () =>
          Promise.resolve({
            readPosition: readPosition({
              lastReadMessageId: message.messageId,
            }),
            conversation: channel,
          }),
      },
      terminalDispatchApi: {
        dispatchChatMessage,
        resumeMemberDispatchQueue,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.click(await within(conversationPanel).findByRole("button", {
      name: "派发到 Reviewer",
    }));
    expect(await within(conversationPanel).findByText(/已排队/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reviewer 操作" }));
    await user.click(screen.getByRole("menuitem", { name: "状态：在线" }));

    expect(updateMemberStatus).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      memberId: reviewer.memberId,
      status: "online",
    });
    expect(resumeMemberDispatchQueue).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      memberId: reviewer.memberId,
    });
    expect(await within(conversationPanel).findByText(/已派发到 Reviewer/))
      .toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("队列已继续");
  });

  it("keeps recoverable dispatch failure visible on the message", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
      runtime: {
        kind: "customCli",
        runtimeId: "missing",
        label: "Missing CLI",
        command: "missing-cli",
      },
      permissions: {
        canMention: true,
        canRemove: true,
      },
    });
    const channel = defaultChannel();
    const message = chatMessage({
      body: "@Reviewer run checks",
      mentionedMemberIds: [reviewer.memberId],
    });
    const dispatchChatMessage = vi.fn(() =>
      Promise.resolve({
        dispatch: {
          schemaVersion: 1,
          dispatchRequestId: "01KDISPATCH00000000000002",
          workspaceId: channel.workspaceId,
          conversationId: channel.conversationId,
          messageId: message.messageId,
          sourceMessageIds: [message.messageId],
          memberId: reviewer.memberId,
          targetResolution: {
            memberId: reviewer.memberId,
            source: "explicitMention",
            reason: "消息明确提及 Reviewer。",
          },
          status: "failed",
          terminalSessionId: null,
          failure: {
            code: "terminal.command.missing",
            message: "终端启动失败：未在 PATH 中找到配置的终端命令。",
            userAction: "请安装该 CLI，或把成员运行时命令更新为有效命令后重试。",
            details: "command=missing-cli",
          },
          createdAtMs: 1760000002000,
          updatedAtMs: 1760000002001,
        },
        terminalSession: null,
        sessionCreated: false,
      } satisfies DispatchChatMessageResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer] }),
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages: () =>
          Promise.resolve({
            messages: [message],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
        updateReadPosition: () =>
          Promise.resolve({
            readPosition: readPosition({
              lastReadMessageId: message.messageId,
            }),
            conversation: channel,
          }),
      },
      terminalDispatchApi: {
        dispatchChatMessage,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.click(await within(conversationPanel).findByRole("button", {
      name: "派发到 Reviewer",
    }));

    expect(await within(conversationPanel).findByText(/派发失败/)).toBeInTheDocument();
    expect(
      within(conversationPanel).getByText(
        "请安装该 CLI，或把成员运行时命令更新为有效命令后重试。",
      ),
    ).toBeInTheDocument();
    expect(within(conversationPanel).getByText("@Reviewer run checks")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent("派发失败");
  });

  it("dispatches a private conversation message through backend target fallback", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
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
    });
    const privateConversation = conversationProfile({
      conversationId: "01KPRIVATE000000000000001",
      title: "Reviewer",
      kind: "private",
      participantKind: "member",
      participantId: reviewer.memberId,
    });
    const message = chatMessage({
      conversationId: privateConversation.conversationId,
      body: "Please inspect this context",
      mentionedMemberIds: [],
    });
    const dispatchChatMessage = vi.fn(() =>
      Promise.resolve({
        dispatch: {
          schemaVersion: 1,
          dispatchRequestId: "01KDISPATCH00000000000003",
          workspaceId: privateConversation.workspaceId,
          conversationId: privateConversation.conversationId,
          messageId: message.messageId,
          sourceMessageIds: [message.messageId],
          memberId: reviewer.memberId,
          targetResolution: {
            memberId: reviewer.memberId,
            source: "privateConversation",
            reason: "当前私聊对象 Reviewer 是可运行终端的成员。",
          },
          status: "dispatched",
          terminalSessionId: "01KTERMINAL00000000000011",
          failure: null,
          createdAtMs: 1760000002000,
          updatedAtMs: 1760000002001,
        },
        terminalSession: terminalOpenResult({
          session: {
            ...terminalOpenResult().session,
            terminalSessionId: "01KTERMINAL00000000000011",
            memberId: reviewer.memberId,
            title: "Reviewer",
          },
        }).session,
        sessionCreated: true,
      } satisfies DispatchChatMessageResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer] }),
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [privateConversation] }),
        listMessages: () =>
          Promise.resolve({
            messages: [message],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: privateConversation,
          }),
        updateReadPosition: () =>
          Promise.resolve({
            readPosition: readPosition({
              conversationId: privateConversation.conversationId,
              lastReadMessageId: message.messageId,
            }),
            conversation: privateConversation,
          }),
      },
      terminalDispatchApi: {
        dispatchChatMessage,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.click(await within(conversationPanel).findByRole("button", {
      name: "派发到 Reviewer",
    }));

    expect(dispatchChatMessage).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: privateConversation.conversationId,
      messageId: message.messageId,
      memberId: null,
    });
    expect(
      await within(conversationPanel).findByText(
        "当前私聊对象 Reviewer 是可运行终端的成员。",
      ),
    ).toBeInTheDocument();
  });

  it("auto-dispatches a sent private conversation message to the member terminal", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
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
    });
    const privateConversation = conversationProfile({
      conversationId: "01KPRIVATE000000000000001",
      title: "Reviewer",
      kind: "private",
      participantKind: "member",
      participantId: reviewer.memberId,
    });
    const sentMessage = chatMessage({
      messageId: "01K00000000000000000000075",
      conversationId: privateConversation.conversationId,
      body: "Please inspect this context",
      mentionedMemberIds: [],
      createdAtMs: 1760000005000,
      updatedAtMs: 1760000005000,
    });
    const sentDispatch: DispatchChatMessageResult = {
      dispatch: {
        schemaVersion: 1,
        dispatchRequestId: "01KDISPATCH00000000000008",
        workspaceId: privateConversation.workspaceId,
        conversationId: privateConversation.conversationId,
        messageId: sentMessage.messageId,
        sourceMessageIds: [sentMessage.messageId],
        memberId: reviewer.memberId,
        targetResolution: {
          memberId: reviewer.memberId,
          source: "privateConversation",
          reason: "当前私聊对象 Reviewer 是可运行终端的成员。",
        },
        status: "dispatched",
        terminalSessionId: "01KTERMINAL00000000000014",
        failure: null,
        createdAtMs: 1760000005000,
        updatedAtMs: 1760000005001,
      },
      terminalSession: terminalOpenResult({
        session: {
          ...terminalOpenResult().session,
          terminalSessionId: "01KTERMINAL00000000000014",
          memberId: reviewer.memberId,
          title: "Reviewer",
        },
      }).session,
      sessionCreated: true,
    };
    const sendMessageAndDispatch = vi.fn(() =>
      Promise.resolve({
        message: sentMessage,
        conversation: {
          ...privateConversation,
          lastMessagePreview: sentMessage.body,
          lastActivityAtMs: sentMessage.createdAtMs,
          updatedAtMs: sentMessage.updatedAtMs,
        },
        readPosition: readPosition({
          conversationId: privateConversation.conversationId,
          lastReadMessageId: sentMessage.messageId,
          lastReadAtMs: sentMessage.createdAtMs,
        }),
        dispatches: [sentDispatch],
      } satisfies SendMessageAndDispatchResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer] }),
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [privateConversation] }),
        listMessages: () =>
          Promise.resolve({
            messages: [],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: privateConversation,
          }),
        sendMessageAndDispatch,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.type(within(conversationPanel).getByLabelText("输入消息"), sentMessage.body);
    await user.click(within(conversationPanel).getByRole("button", { name: "发送" }));

    await waitFor(() => {
      expect(sendMessageAndDispatch).toHaveBeenCalledWith({
        workspaceId: "01K00000000000000000000000",
        conversationId: privateConversation.conversationId,
        body: sentMessage.body,
        mentionedMemberIds: [],
        mentionAll: false,
      });
    });
    expect(
      await within(conversationPanel).findByText(
        "当前私聊对象 Reviewer 是可运行终端的成员。",
      ),
    ).toBeInTheDocument();
  });

  it("asks for target selection when mentioned dispatch targets are ambiguous", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
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
    });
    const builder = memberProfile({
      memberId: "01KMEMBER000000000000000011",
      role: "assistant",
      displayName: "Builder",
      instanceLabel: "Builder",
      runtime: {
        kind: "builtInAiCli",
        runtimeId: "gemini",
        label: "Gemini CLI",
        command: "gemini",
      },
      permissions: {
        canMention: true,
        canRemove: true,
      },
    });
    const channel = defaultChannel();
    const message = chatMessage({
      body: "@Reviewer @Builder please decide",
      mentionedMemberIds: [reviewer.memberId, builder.memberId],
    });
    const dispatchChatMessage = vi.fn((request: DispatchChatMessageRequest) =>
      Promise.resolve({
        dispatch: {
          schemaVersion: 1,
          dispatchRequestId: "01KDISPATCH00000000000004",
          workspaceId: channel.workspaceId,
          conversationId: channel.conversationId,
          messageId: message.messageId,
          sourceMessageIds: [message.messageId],
          memberId: request.memberId ?? builder.memberId,
          targetResolution: {
            memberId: request.memberId ?? builder.memberId,
            source: "userSelected",
            reason: "用户选择了派发目标 Builder。",
          },
          status: "dispatched",
          terminalSessionId: "01KTERMINAL00000000000012",
          failure: null,
          createdAtMs: 1760000002000,
          updatedAtMs: 1760000002001,
        },
        terminalSession: terminalOpenResult({
          session: {
            ...terminalOpenResult().session,
            terminalSessionId: "01KTERMINAL00000000000012",
            memberId: request.memberId ?? builder.memberId,
            title: "Builder",
          },
        }).session,
        sessionCreated: true,
      } satisfies DispatchChatMessageResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer, builder] }),
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        listMessages: () =>
          Promise.resolve({
            messages: [message],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation: channel,
          }),
        updateReadPosition: () =>
          Promise.resolve({
            readPosition: readPosition({
              lastReadMessageId: message.messageId,
            }),
            conversation: channel,
          }),
      },
      terminalDispatchApi: {
        dispatchChatMessage,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.click(await within(conversationPanel).findByRole("button", {
      name: "选择派发目标",
    }));
    expect(
      await within(conversationPanel).findByLabelText("派发目标选择"),
    ).toBeInTheDocument();

    await user.click(within(conversationPanel).getByRole("button", { name: "Builder" }));

    expect(dispatchChatMessage).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: channel.conversationId,
      messageId: message.messageId,
      memberId: builder.memberId,
    });
    expect(await within(conversationPanel).findByText(/已派发到 Builder/))
      .toBeInTheDocument();
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
    const sendMessageAndDispatch = vi.fn((request: SendMessageAndDispatchRequest) =>
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
        dispatches: [],
      } satisfies SendMessageAndDispatchResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer, silent] }),
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        sendMessageAndDispatch,
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

    expect(sendMessageAndDispatch).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: channel.conversationId,
      body: "@Reviewer please review",
      mentionedMemberIds: [reviewer.memberId],
      mentionAll: false,
    });
  });

  it("sends @all as a structured fan-out request", async () => {
    const user = userEvent.setup();
    const reviewer = memberProfile({
      memberId: "01KMEMBER000000000000000010",
      role: "assistant",
      displayName: "Reviewer",
      instanceLabel: "Reviewer",
      runtime: {
        kind: "builtInAiCli",
        runtimeId: "codex",
        label: "Codex CLI",
        command: "codex",
      },
    });
    const builder = memberProfile({
      memberId: "01KMEMBER000000000000000011",
      role: "assistant",
      displayName: "Builder",
      instanceLabel: "Builder",
      runtime: {
        kind: "builtInAiCli",
        runtimeId: "gemini",
        label: "Gemini CLI",
        command: "gemini",
      },
    });
    const channel = defaultChannel();
    const sentMessage = chatMessage({
      messageId: "01K00000000000000000000076",
      body: "please review @all",
      mentionedMemberIds: [],
      createdAtMs: 1760000006000,
      updatedAtMs: 1760000006000,
    });
    const sendMessageAndDispatch = vi.fn((request: SendMessageAndDispatchRequest) =>
      Promise.resolve({
        message: sentMessage,
        conversation: {
          ...channel,
          lastMessagePreview: request.body,
          lastActivityAtMs: sentMessage.createdAtMs,
          updatedAtMs: sentMessage.updatedAtMs,
        },
        readPosition: readPosition({
          lastReadMessageId: sentMessage.messageId,
          lastReadAtMs: sentMessage.createdAtMs,
        }),
        dispatches: [reviewer, builder].map((member, index) => ({
          dispatch: {
            schemaVersion: 1,
            dispatchRequestId: `01KDISPATCH0000000000001${index}`,
            workspaceId: channel.workspaceId,
            conversationId: channel.conversationId,
            messageId: sentMessage.messageId,
            sourceMessageIds: [sentMessage.messageId],
            memberId: member.memberId,
            targetResolution: {
              memberId: member.memberId,
              source: "allMention",
              reason: `@all 指向可运行终端的成员 ${member.instanceLabel}。`,
            },
            status: "dispatched",
            terminalSessionId: `01KTERMINAL0000000000001${index}`,
            failure: null,
            createdAtMs: 1760000006000,
            updatedAtMs: 1760000006001,
          },
          terminalSession: terminalOpenResult({
            session: {
              ...terminalOpenResult().session,
              terminalSessionId: `01KTERMINAL0000000000001${index}`,
              memberId: member.memberId,
              title: member.instanceLabel,
            },
          }).session,
          sessionCreated: true,
        })),
      } satisfies SendMessageAndDispatchResult),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: {
        listMembers: () => Promise.resolve({ members: [reviewer, builder] }),
      },
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        sendMessageAndDispatch,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.type(within(conversationPanel).getByLabelText("输入消息"), "please review @all");

    await user.click(within(conversationPanel).getByRole("button", { name: "发送" }));

    expect(sendMessageAndDispatch).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      conversationId: channel.conversationId,
      body: "please review @all",
      mentionedMemberIds: [],
      mentionAll: true,
    });
    expect(await within(conversationPanel).findByText(/已派发到 Reviewer, Builder/))
      .toBeInTheDocument();
    expect(within(conversationPanel).getByText("已派发到 2 个终端成员。")).toBeInTheDocument();
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

  it("keeps the emoji panel open when the close shortcut is disabled", async () => {
    const user = userEvent.setup();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      settingsApi: {
        getShortcutPreferences: () =>
          Promise.resolve({
            preferences: shortcutPreferencesSnapshot({
              disabledActionIds: ["chat.emoji.close"],
            }),
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    await user.click(within(conversationPanel).getByRole("button", { name: "Emoji" }));
    expect(
      await within(conversationPanel).findByRole("dialog", { name: "Emoji 面板" }),
    ).toBeInTheDocument();

    fireEvent.keyDown(within(conversationPanel).getByLabelText("输入消息"), { key: "Escape" });
    expect(within(conversationPanel).getByRole("dialog", { name: "Emoji 面板" }))
      .toBeInTheDocument();
  });

  it("appends quick prompts and exposes removable attachment composition state", async () => {
    const user = userEvent.setup();
    const referencedTask = roadmapTaskEntry();

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      roadmapApi: {
        listTasks: () => Promise.resolve({ tasks: [referencedTask] }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const conversationPanel = await screen.findByRole("region", { name: "会话列表" });
    const composer = within(conversationPanel).getByLabelText("输入消息");
    await user.type(composer, "Existing");
    await user.click(within(conversationPanel).getByRole("button", { name: "请评审" }));

    expect(composer).toHaveValue("Existing\n请评审这次变更并指出阻塞风险。");

    await user.click(within(conversationPanel).getByRole("button", { name: "图片入口" }));
    await user.click(within(conversationPanel).getByRole("button", { name: "路线图引用" }));
    const roadmapPicker = await within(conversationPanel).findByRole("dialog", {
      name: "选择路线图任务",
    });
    await user.click(within(roadmapPicker).getByRole("button", { name: /Ship MVP/ }));

    expect(within(conversationPanel).getByRole("button", { name: /图片待附加/ }))
      .toBeInTheDocument();
    const roadmapChip = within(conversationPanel).getByRole("button", {
      name: /路线图：Ship MVP/,
    });
    expect(roadmapChip).toBeInTheDocument();

    await user.click(roadmapChip);
    const roadmapModal = await screen.findByRole("dialog", { name: "路线图" });
    expect(within(roadmapModal).getByText("已聚焦")).toBeInTheDocument();

    await user.click(within(conversationPanel).getByRole("button", { name: /图片待附加/ }));
    expect(within(conversationPanel).queryByRole("button", { name: /图片待附加/ }))
      .not.toBeInTheDocument();
  });

  it("keeps a failed message visible when send fails", async () => {
    const user = userEvent.setup();
    const channel = defaultChannel();
    const sendMessageAndDispatch = vi.fn(() => Promise.reject(new Error("disk full")));

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      chatApi: {
        listConversations: () => Promise.resolve({ conversations: [channel] }),
        sendMessageAndDispatch,
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
        sandboxed: false,
        unlimitedAccess: true,
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
    expect(within(membersPanel).getByText("Owner")).toBeInTheDocument();
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
        sandboxed: false,
        unlimitedAccess: true,
      },
    });
    expect(await within(membersPanel).findByText("Codex Reviewer 1")).toBeInTheDocument();
    expect(within(membersPanel).getByText("Codex Reviewer 2")).toBeInTheDocument();
    expect(within(membersPanel).getAllByText("Assistant · 离线 · Gemini CLI")).toHaveLength(2);
    expect(within(membersPanel).getAllByText((content) => content.includes("@可用"))).toHaveLength(2);
    expect(await screen.findByRole("status")).toHaveTextContent("终端不会自动启动");
  });

  it("saves invited assistant runtime from configured custom CLI entries", async () => {
    const user = userEvent.setup();
    const owner = memberProfile();
    const invitedAssistant = memberProfile({
      memberId: "01KMEMBER000000000000000021",
      role: "assistant",
      displayName: "Local Reviewer Bot",
      instanceIndex: 1,
      instanceLabel: "Local Reviewer Bot",
      status: "offline",
      runtime: {
        kind: "customCli",
        runtimeId: "local-reviewer",
        label: "Local Reviewer",
        command: "reviewer --stdio",
      },
      permissions: {
        canMention: true,
        canRemove: true,
      },
      isolation: {
        sandboxed: false,
        unlimitedAccess: true,
      },
    });
    const listMembers = vi
      .fn()
      .mockResolvedValueOnce({ members: [owner] })
      .mockResolvedValueOnce({ members: [owner, invitedAssistant] });
    const inviteMember = vi.fn(() =>
      Promise.resolve({
        member: invitedAssistant,
        invitedMembers: [invitedAssistant],
        members: [owner, invitedAssistant],
      }),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      memberApi: { listMembers, inviteMember },
      settingsApi: {
        getTerminalConfiguration: () =>
          Promise.resolve({
            configuration: terminalConfigurationSnapshot({
              customCliEntries: [
                {
                  cliId: "local-reviewer",
                  label: "Local Reviewer",
                  command: "reviewer --stdio",
                },
              ],
            }),
          }),
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    const membersPanel = await screen.findByRole("region", { name: "Owner 与邀请成员" });
    await user.type(within(membersPanel).getByLabelText("显示名称"), "Local Reviewer Bot");
    await user.selectOptions(within(membersPanel).getByLabelText("Runtime"), "customCli");
    await user.selectOptions(await within(membersPanel).findByLabelText("自定义 CLI"), "local-reviewer");
    expect(await within(membersPanel).findByText("命令：reviewer --stdio")).toBeInTheDocument();

    await user.click(within(membersPanel).getByRole("button", { name: "发送邀请" }));

    expect(inviteMember).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      memberType: "assistant",
      displayName: "Local Reviewer Bot",
      runtime: {
        kind: "customCli",
        runtimeId: "local-reviewer",
        label: "Local Reviewer",
        command: "reviewer --stdio",
      },
      instanceCount: 1,
      permissions: {
        canMention: true,
        canRemove: true,
      },
      isolation: {
        sandboxed: false,
        unlimitedAccess: true,
      },
    });
    expect(await within(membersPanel).findByText("Local Reviewer Bot")).toBeInTheDocument();
    expect(within(membersPanel).getByText("Assistant · 离线 · Local Reviewer")).toBeInTheDocument();
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
          terminalApi={{
            openTerminal,
            subscribeOutput: () => Promise.resolve(() => undefined),
            subscribeStatus: () => Promise.resolve(() => undefined),
          }}
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

  it("loads diagnostics overview and generates a batched redacted export", async () => {
    const user = userEvent.setup();
    const getOverview = vi.fn(() => Promise.resolve(diagnosticsOverviewResult()));
    const generateExport = vi.fn((request: DiagnosticsExportRequest) =>
      Promise.resolve(
        diagnosticsExportResult({
          hasMore: request.cursor === null,
          nextCursor: request.cursor === null ? "25" : null,
        }),
      ),
    );

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      diagnosticsApi: {
        getOverview,
        generateExport,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));

    expect(await screen.findByRole("heading", { name: "诊断信息" })).toBeInTheDocument();
    expect(getOverview).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      cursor: null,
      limit: 25,
    });
    expect(await screen.findByText("terminal.snapshot.stale")).toBeInTheDocument();
    expect(screen.getByText("终端 1 · 聊天 0")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "生成导出" }));

    expect(generateExport).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "01K00000000000000000000000",
        cursor: null,
        maxEvents: 25,
      }),
    );
    expect(await screen.findByLabelText("诊断导出结果")).toHaveTextContent("导出包 v1");
    expect(screen.getByText(/本机私有路径已脱敏/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "下一批" }));
    expect(generateExport).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "25" }));

    await user.click(screen.getByRole("button", { name: "停止导出" }));
    expect(screen.queryByLabelText("诊断导出结果")).not.toBeInTheDocument();
  });

  it("ignores a diagnostics export batch that resolves after the user stops export", async () => {
    const user = userEvent.setup();
    let resolveNextBatch: ((result: DiagnosticsExportResult) => void) | null = null;
    const getOverview = vi.fn(() => Promise.resolve(diagnosticsOverviewResult()));
    const generateExport = vi.fn((request: DiagnosticsExportRequest) => {
      if (request.cursor === "25") {
        return new Promise<DiagnosticsExportResult>((resolve) => {
          resolveNextBatch = resolve;
        });
      }

      return Promise.resolve(
        diagnosticsExportResult({
          hasMore: true,
          nextCursor: "25",
        }),
      );
    });

    renderWorkspaceSelection({
      getWorkspaceSelectionStatus: () => Promise.resolve(status),
      pickAndOpenWorkspace: () => Promise.resolve(openedWorkspaceResult()),
      diagnosticsApi: {
        getOverview,
        generateExport,
      },
    });

    await user.click(screen.getByRole("button", { name: "打开文件夹" }));
    await screen.findByRole("heading", { name: "诊断信息" });

    await user.click(screen.getByRole("button", { name: "生成导出" }));
    expect(await screen.findByLabelText("诊断导出结果")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "下一批" }));
    expect(generateExport).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: "25" }));

    await user.click(screen.getByRole("button", { name: "停止导出" }));
    expect(screen.queryByLabelText("诊断导出结果")).not.toBeInTheDocument();

    await act(async () => {
      resolveNextBatch?.(
        diagnosticsExportResult({
          hasMore: false,
          nextCursor: null,
        }),
      );
    });

    expect(screen.queryByLabelText("诊断导出结果")).not.toBeInTheDocument();
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
        Promise.resolve({ ...status, recentWorkspaceCount: 4 }),
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
          {
            projectId: "01K00000000000000000000003",
            path: "/work/beta",
            name: "beta",
            firstOpenedAtMs: 1760000000000,
            lastOpenedAtMs: 1760000000500,
          },
          {
            projectId: "01K00000000000000000000004",
            path: "/work/gamma",
            name: "gamma",
            firstOpenedAtMs: 1760000000000,
            lastOpenedAtMs: 1760000000200,
          },
        ]),
      pickAndOpenWorkspace: () => Promise.resolve(null),
      openWorkspace,
    });

    expect(await screen.findByText("newer")).toBeInTheDocument();
    expect(screen.getByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("beta")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("搜索文件夹..."), "gamma");

    expect(screen.getByText("gamma")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "打开 gamma" }));

    expect(openWorkspace).toHaveBeenCalledWith("/work/gamma");
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
