import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode, RefObject } from "react";
import * as Select from "@radix-ui/react-select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  AtSign,
  Bell,
  BellOff,
  Bot,
  CheckCircle2,
  Edit3,
  Eraser,
  Eye,
  FileDown,
  FolderOpen,
  Hash,
  History,
  Image as ImageIcon,
  Info,
  Keyboard,
  Link2,
  ListTodo,
  MessageSquare,
  MoreVertical,
  Moon,
  Pin,
  Plus,
  RefreshCw,
  Send,
  Search,
  Settings,
  ShieldCheck,
  Smile,
  SquareTerminal,
  Trash2,
  Unlink,
  Upload,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  chatApi,
  contactApi,
  dataIntegrityApi,
  diagnosticsApi,
  memberApi,
  notificationApi,
  normalizeAppError,
  roadmapApi,
  settingsApi,
  skillsApi,
  terminalDispatchApi,
  terminalApi,
  workspaceApi,
} from "../../../shared/api";
import {
  EMOJI_DATA as GOLUTRA_EMOJI_DATA,
  EMOJI_GROUPS as GOLUTRA_EMOJI_GROUPS,
} from "./golutra-emoji-data";
import anyCliIconUrl from "../../../assets/runtime-icons/any-cli.svg";
import claudeCodeIconUrl from "../../../assets/runtime-icons/claude-code.png";
import codexIconUrl from "../../../assets/runtime-icons/codex.png";
import geminiIconUrl from "../../../assets/runtime-icons/gemini.png";
import opencodeIconUrl from "../../../assets/runtime-icons/opencode.svg";
import qwenIconUrl from "../../../assets/runtime-icons/qwen.png";
import type {
  EmojiEntry as GolutraEmojiEntry,
  EmojiGroup as GolutraEmojiGroup,
} from "./golutra-emoji-data";
import type { ChatApi } from "../../../shared/api/chat-api";
import type { ContactApi } from "../../../shared/api/contact-api";
import type { DataIntegrityApi } from "../../../shared/api/data-integrity-api";
import type { DataIntegrityReport } from "../../../contracts/generated/data_integrity";
import type { DiagnosticsApi } from "../../../shared/api/diagnostics-api";
import type {
  DiagnosticsExportResult,
  DiagnosticsOverviewResult,
} from "../../../contracts/generated/diagnostics";
import type { MemberApi } from "../../../shared/api/member-api";
import type { NotificationApi } from "../../../shared/api/notification-api";
import type {
  RoadmapApi,
  UpdateRoadmapGoalInput,
  UpdateRoadmapTaskInput,
} from "../../../shared/api/roadmap-api";
import type { SettingsApi } from "../../../shared/api/settings-api";
import type { SkillsApi } from "../../../shared/api/skills-api";
import type { TerminalDispatchApi } from "../../../shared/api/terminal-dispatch-api";
import type { TerminalApi } from "../../../shared/api/terminal-api";
import type {
  ChatMessageProfile,
  ClearWorkspaceChatDataResult,
  ConversationProfile,
  ListConversationsResult,
  ListMessagesResult,
  RepairWorkspaceChatDataResult,
} from "../../../contracts/generated/chat";
import type { ContactKind, ContactProfile } from "../../../contracts/generated/contact";
import type { DispatchRequestProfile } from "../../../contracts/generated/orchestration";
import type {
  TerminalOutputEventPayload,
  TerminalSessionStatus,
} from "../../../contracts/generated/terminal";
import type {
  InvitedMemberType,
  MemberProfile,
  MemberRuntimeKind,
  MemberRuntimeProfile,
} from "../../../contracts/generated/member";
import type {
  AppLanguage,
  AppTheme,
  NotificationNavigationAction,
  NotificationPreferencesSnapshot,
  OpenWorkspaceResult,
  OpenedWorkspace,
  WindowContextSnapshot,
  WindowMode,
  WorkspaceConflictResolution,
  WorkspaceRegistryConflict,
} from "../../../contracts/generated";
import type {
  SkillImportStatus,
  SkillLibraryEntry,
  WorkspaceSkillLinkEntry,
} from "../../../contracts/generated/skill";
import type {
  RoadmapGoalEntry,
  RoadmapTaskEntry,
  RoadmapTaskStatus,
} from "../../../contracts/generated/roadmap";
import type {
  ChatTerminalOutputDisplayMode,
  ChatTerminalOutputPreferencesSnapshot,
  ProfileAvatarSnapshot,
  ProfileSettingsSnapshot,
  ProfileStatus,
  ShortcutKeymapProfile,
  ShortcutPreferencesSnapshot,
  TerminalBuiltInCliEntry,
  TerminalConfigurationSnapshot,
  TerminalCustomCliEntry,
  TerminalCustomTerminalEntry,
} from "../../../contracts/generated/settings";
import {
  capabilityStatusMeta,
  type CapabilityStatus,
} from "../../../shared/capabilities/status";
import { SHORTCUT_ACTION, shortcutEventMatches } from "../../../shared/shortcuts";
import { IconButton, Toast, useToastStore } from "../../../shared/ui";
import type { WorkspaceApi } from "../../../shared/api/workspace-api";

type WorkspaceSelectionPageProps = {
  api?: Pick<
    WorkspaceApi,
    | "getWorkspaceSelectionStatus"
    | "listRecentWorkspaces"
    | "pickAndOpenWorkspace"
    | "openWorkspace"
    | "openWorkspaceInFileManager"
  >;
  windowContext?: WindowContextSnapshot | null;
  onPreferencesChange?: (update: {
    theme?: AppTheme | null;
    language?: AppLanguage | null;
  }) => Promise<void>;
  onOpenWindowMode?: (mode: WindowMode) => Promise<void>;
  onWorkspaceOpened?: (workspace: OpenedWorkspace) => void;
  showCompatibilityControls?: boolean;
  renderLocalToast?: boolean;
  parityWorkbench?: boolean;
  parityView?: "chat" | "friends" | "workspaces" | "store" | "plugins" | "settings";
  integrityApi?: Pick<DataIntegrityApi, "validate">;
  diagnosticsApi?: Pick<DiagnosticsApi, "getOverview" | "generateExport">;
  memberApi?: Pick<
    MemberApi,
    "listMembers" | "inviteMember" | "removeMember" | "updateMemberProfile" | "updateMemberStatus"
  >;
  notificationApi?: Pick<
    NotificationApi,
    | "getNotificationPreferences"
    | "updateNotificationPreferences"
    | "updateUnreadSummary"
    | "getPendingNavigation"
    | "subscribeNavigation"
  >;
  skillsApi?: Pick<
    SkillsApi,
    | "listSkills"
    | "importLocalFolder"
    | "openSkillFolder"
    | "deleteSkill"
    | "listWorkspaceLinks"
    | "linkWorkspaceSkill"
    | "unlinkWorkspaceSkill"
  >;
  roadmapApi?: Pick<
    RoadmapApi,
    | "listTasks"
    | "createTask"
    | "updateTask"
    | "deleteTask"
    | "listGoals"
    | "createGoal"
    | "updateGoal"
    | "deleteGoal"
  >;
  settingsApi?: Pick<
    SettingsApi,
    | "getProfileSettings"
    | "updateProfileSettings"
    | "selectAvatarImage"
    | "uploadProfileAvatar"
    | "selectProfileAvatarPreset"
    | "resetProfileAvatar"
    | "deleteUploadedProfileAvatar"
    | "getShortcutPreferences"
    | "updateShortcutPreferences"
    | "resetShortcutPreferences"
    | "getChatTerminalOutputPreferences"
    | "updateChatTerminalOutputPreferences"
    | "getTerminalConfiguration"
    | "updateTerminalConfiguration"
    | "resetTerminalConfiguration"
  >;
  terminalApi?: Pick<TerminalApi, "openTerminal" | "subscribeOutput" | "subscribeStatus">;
  terminalDispatchApi?: Pick<
    TerminalDispatchApi,
    "dispatchChatMessage" | "resumeMemberDispatchQueue"
  >;
  contactApi?: Pick<ContactApi, "listContacts" | "createContact" | "updateContact" | "deleteContact">;
  chatApi?: Pick<
    ChatApi,
    | "listConversations"
    | "createGroupConversation"
    | "updateConversationSettings"
    | "clearConversation"
    | "repairWorkspaceData"
    | "clearWorkspaceData"
    | "deleteConversation"
    | "sendMessage"
    | "listMessages"
    | "updateReadPosition"
    | "updateGroupConversationMembers"
    | "startPrivateConversation"
  >;
};

type PendingConflict = {
  conflict: WorkspaceRegistryConflict;
};

type AttachmentEntry =
  | { kind: "image" }
  | { kind: "roadmap"; taskId: string; title: string };
type ConversationFilter = "all" | "unread";
type DispatchTargetCandidate = {
  memberId: string;
  memberLabel: string;
};
type MessageDispatchState = {
  status: "selecting" | "dispatching" | "queued" | "skipped" | "dispatched" | "failed";
  dispatchRequestId?: string;
  memberId?: string;
  memberLabel?: string;
  terminalSessionId?: string | null;
  message?: string;
  userAction?: string;
  candidates?: DispatchTargetCandidate[];
};
type DispatchResolutionState = {
  target: MemberProfile | null;
  candidates: MemberProfile[];
};
type TerminalChatStreamEntry = {
  terminalSessionId: string;
  workspaceId: string;
  memberId: string | null;
  memberLabel: string;
  title: string;
  status: TerminalSessionStatus;
  exitReasonMessage: string | null;
  text: string;
  lastSeq: number;
  updatedAtMs: number;
};
type MemberTerminalActivity = {
  terminalSessionId: string;
  title: string;
  status: TerminalSessionStatus;
  exitReasonMessage: string | null;
  updatedAtMs: number;
};
type ProfileSettingsDraft = {
  displayName: string;
  timezone: string;
  status: ProfileStatus;
  statusMessage: string;
};
type ProfileSettingsField = keyof ProfileSettingsDraft;
type ProfileAvatarAction = "upload" | "preset" | "reset" | "delete";
type NotificationPreferencesDraft = {
  desktopNotificationsEnabled: boolean;
  soundEnabled: boolean;
  mentionsOnly: boolean;
  messagePreviewEnabled: boolean;
  dndEnabled: boolean;
  dndStartTime: string;
  dndEndTime: string;
};
type ShortcutPreferencesDraft = {
  profile: ShortcutKeymapProfile;
  shortcutsEnabled: boolean;
  shortcutHintsEnabled: boolean;
  disabledActionIds: string[];
};
type ChatTerminalOutputPreferencesDraft = {
  displayMode: ChatTerminalOutputDisplayMode;
};
type ChatMaintenanceResultView = {
  status: "completed" | "failed";
  title: string;
  summary: string;
  details: string[];
  action: string | null;
};
type TerminalConfigurationDraft = {
  builtInCliEntries: TerminalBuiltInCliEntry[];
  customCliEntries: TerminalCustomCliEntry[];
  customTerminalEntries: TerminalCustomTerminalEntry[];
  defaultTerminalId: string | null;
};
type RuntimeOption = {
  id: string;
  label: string;
  command: string;
};

const MESSAGE_PAGE_LIMIT = 30;
const RECENT_EMOJI_STORAGE_KEY = "orchlet.chat.recentEmojis";
const RECENT_EMOJI_GROUP_ID = -1;
const DEFAULT_EMOJI_GROUP_ID = 0;
const RECENT_EMOJI_MAX_COUNT = 24;
const TERMINAL_STREAM_FLUSH_MS = 100;
const TERMINAL_STREAM_MAX_CHARS = 4000;
const TERMINAL_STREAM_MAX_BUFFER_EVENTS = 1000;
const PROFILE_TIMEZONE_OPTIONS = [
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
] as const;
const PROFILE_AVATAR_PRESETS = [
  { id: "orchid", label: "Orchid", className: "bg-[#f4e8ff] text-[#69417f] ring-[#d8b9ef]" },
  { id: "lagoon", label: "Lagoon", className: "bg-[#dff4f2] text-[#1f6862] ring-[#a8d7d2]" },
  { id: "sunrise", label: "Sunrise", className: "bg-[#fff0d7] text-[#85551f] ring-[#e5c083]" },
  { id: "forest", label: "Forest", className: "bg-[#e3f2df] text-[#315f35] ring-[#a9c99d]" },
] as const;
const DEFAULT_PROFILE_SETTINGS: ProfileSettingsSnapshot = {
  schemaVersion: 1,
  displayName: "Owner",
  timezone: "UTC",
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
    updatedAtMs: 1,
  },
  createdAtMs: 1,
  updatedAtMs: 1,
};
const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesSnapshot = {
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
  createdAtMs: 1,
  updatedAtMs: 1,
};
const DEFAULT_SHORTCUT_PREFERENCES: ShortcutPreferencesSnapshot = {
  schemaVersion: 1,
  profile: "default",
  shortcutsEnabled: true,
  shortcutHintsEnabled: true,
  disabledActionIds: [],
  bindings: [
    shortcutBinding("chat.send", "发送聊天消息", ["Enter"], true),
    shortcutBinding("chat.newline", "聊天输入换行", ["Shift+Enter"], true),
    shortcutBinding("chat.emoji.close", "关闭 Emoji 面板", ["Esc"], true),
    shortcutBinding("mention.insert", "插入提及建议", ["Enter", "Tab"], true),
    shortcutBinding("conversation.focus", "聚焦会话列表", ["Tab"], true),
    shortcutBinding("terminal.find.next", "终端查找下一个", ["Enter"], true),
    shortcutBinding("terminal.find.previous", "终端查找上一个", ["Shift+Enter"], true),
    shortcutBinding("terminal.find.close", "关闭终端查找", ["Esc"], true),
    shortcutBinding("settings.save", "保存设置", ["Enter"], true),
    shortcutBinding("notification.viewAll", "通知查看全部", ["Tab", "Enter"], true),
    shortcutBinding("notification.ignoreAll", "通知忽略全部", ["Tab", "Enter"], true),
    shortcutBinding("notification.openTerminal", "通知打开终端", ["Tab", "Enter"], true),
    shortcutBinding(
      "app.globalOpenSettings",
      "全局打开设置",
      ["Ctrl+,"],
      false,
      "当前版本尚未注册 OS 全局快捷键。",
    ),
  ],
  createdAtMs: 1,
  updatedAtMs: 1,
};
const DEFAULT_CHAT_TERMINAL_OUTPUT_PREFERENCES: ChatTerminalOutputPreferencesSnapshot = {
  schemaVersion: 1,
  displayMode: "stream",
  createdAtMs: 1,
  updatedAtMs: 1,
};
const DEFAULT_TERMINAL_CONFIGURATION: TerminalConfigurationSnapshot = {
  schemaVersion: 1,
  builtInCliEntries: [
    { runtimeId: "claude-code", label: "Claude Code", command: "claude" },
    { runtimeId: "codex", label: "Codex CLI", command: "codex" },
    { runtimeId: "gemini-cli", label: "Gemini CLI", command: "gemini" },
    { runtimeId: "opencode", label: "OpenCode", command: "opencode" },
    { runtimeId: "qwen-code", label: "Qwen Code", command: "qwen" },
  ],
  customCliEntries: [],
  customTerminalEntries: [],
  defaultTerminalId: null,
  createdAtMs: 1,
  updatedAtMs: 1,
};
const GOLUTRA_INVITE_RUNTIME_ORDER = [
  "gemini-cli",
  "codex",
  "claude-code",
  "opencode",
  "qwen-code",
] as const;
const GOLUTRA_INVITE_RUNTIME_LABELS: Record<string, string> = {
  "gemini-cli": "Gemini CLI",
  codex: "Codex",
  "claude-code": "Claude Code",
  opencode: "opencode",
  "qwen-code": "Qwen Code",
};

function normalizeGolutraInviteRuntimeOptions(options: RuntimeOption[]): RuntimeOption[] {
  const byId = new Map(
    options.map((option) => [
      option.id,
      {
        ...option,
        label: GOLUTRA_INVITE_RUNTIME_LABELS[option.id] ?? option.label,
      },
    ]),
  );
  const orderedOptions = GOLUTRA_INVITE_RUNTIME_ORDER.flatMap((runtimeId) => {
    const option = byId.get(runtimeId);
    return option ? [option] : [];
  });
  const extraOptions = options
    .filter((option) => !GOLUTRA_INVITE_RUNTIME_ORDER.includes(option.id as never))
    .map((option) => ({
      ...option,
      label: GOLUTRA_INVITE_RUNTIME_LABELS[option.id] ?? option.label,
    }));

  return [...orderedOptions, ...extraOptions];
}

const WORKSPACE_SELECTION_TEXT = {
  "zh-CN": {
    loadingEntry: "检查入口状态中",
    workspaceOpened: "工作区已打开",
    workspaceSelection: "工作区选择",
    unread: "未读",
    unreadCountLabel: "工作区未读总数",
    refreshRecentWorkspaces: "刷新最近工作区",
    openSettings: "打开设置",
    openFolder: "打开文件夹",
    openingFolder: "打开目录中",
    openFolderSubtitle: "选择一个文件夹开始或恢复工作区",
    recentWorkspaces: "最近的工作区",
    recordsSuffix: "个记录",
    searchFolders: "搜索文件夹",
    searchFoldersPlaceholder: "搜索文件夹...",
    openRecentPrefix: "打开",
    open: "打开",
    noRecentWorkspaces: "暂无最近工作区",
    noRecentWorkspacesHint: "打开文件夹以创建你的第一个工作区。",
    noMatchingWorkspaces: "未找到匹配的工作区",
  },
  "en-US": {
    loadingEntry: "Checking entry status",
    workspaceOpened: "Workspace open",
    workspaceSelection: "Workspace selection",
    unread: "Unread",
    unreadCountLabel: "Workspace unread total",
    refreshRecentWorkspaces: "Refresh recent workspaces",
    openSettings: "Open settings",
    openFolder: "Open Folder",
    openingFolder: "Opening Folder",
    openFolderSubtitle: "Pick a folder to start or resume a workspace",
    recentWorkspaces: "Recent workspaces",
    recordsSuffix: "records",
    searchFolders: "Search folders",
    searchFoldersPlaceholder: "Search folders...",
    openRecentPrefix: "Open",
    open: "Open",
    noRecentWorkspaces: "No recent workspaces",
    noRecentWorkspacesHint: "Open a folder to start your first workspace.",
    noMatchingWorkspaces: "No matching workspaces",
  },
} as const satisfies Record<AppLanguage, Record<string, string>>;
const WINDOW_CONTEXT_TEXT = {
  "zh-CN": {
    windowContext: "窗口上下文",
    currentWindow: "当前窗口",
    openWindowPrefix: "打开",
  },
  "en-US": {
    windowContext: "Window context",
    currentWindow: "Current window",
    openWindowPrefix: "Open ",
  },
} as const satisfies Record<AppLanguage, Record<string, string>>;

export function WorkspaceSelectionPage({
  api = workspaceApi,
  windowContext = null,
  onPreferencesChange,
  onOpenWindowMode,
  onWorkspaceOpened,
  showCompatibilityControls = true,
  renderLocalToast = true,
  parityWorkbench = false,
  parityView = "chat",
  integrityApi = dataIntegrityApi,
  diagnosticsApi: localDiagnosticsApi = diagnosticsApi,
  memberApi: membersApi = memberApi,
  notificationApi: notificationsApi = notificationApi,
  skillsApi: localSkillsApi = skillsApi,
  roadmapApi: localRoadmapApi = roadmapApi,
  settingsApi: profileSettingsApi = settingsApi,
  terminalApi: terminalsApi = terminalApi,
  terminalDispatchApi: dispatchApi = terminalDispatchApi,
  contactApi: contactsApi = contactApi,
  chatApi: conversationsApi = chatApi,
}: WorkspaceSelectionPageProps) {
  const queryClient = useQueryClient();
  const language = windowContext?.preferences.language ?? "zh-CN";
  const text = WORKSPACE_SELECTION_TEXT[language];
  const [isOpening, setIsOpening] = useState(false);
  const [isOpeningFileManager, setIsOpeningFileManager] = useState(false);
  const [isSyncActionPending, setIsSyncActionPending] = useState(false);
  const [isValidatingIntegrity, setIsValidatingIntegrity] = useState(false);
  const [isImportingSkill, setIsImportingSkill] = useState(false);
  const [pendingSkillOpenId, setPendingSkillOpenId] = useState<string | null>(null);
  const [pendingSkillDeleteId, setPendingSkillDeleteId] = useState<string | null>(null);
  const [pendingSkillLinkId, setPendingSkillLinkId] = useState<string | null>(null);
  const [pendingSkillUnlinkId, setPendingSkillUnlinkId] = useState<string | null>(null);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);
  const [focusedRoadmapTaskId, setFocusedRoadmapTaskId] = useState<string | null>(null);
  const [isRoadmapAttachmentPickerOpen, setIsRoadmapAttachmentPickerOpen] = useState(false);
  const [isCreatingRoadmapTask, setIsCreatingRoadmapTask] = useState(false);
  const [isCreatingRoadmapGoal, setIsCreatingRoadmapGoal] = useState(false);
  const [pendingRoadmapUpdateId, setPendingRoadmapUpdateId] = useState<string | null>(null);
  const [pendingRoadmapDeleteId, setPendingRoadmapDeleteId] = useState<string | null>(null);
  const [pendingRoadmapGoalUpdateId, setPendingRoadmapGoalUpdateId] = useState<string | null>(
    null,
  );
  const [pendingRoadmapGoalDeleteId, setPendingRoadmapGoalDeleteId] = useState<string | null>(
    null,
  );
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [isSavingProfileSettings, setIsSavingProfileSettings] = useState(false);
  const [pendingProfileAvatarAction, setPendingProfileAvatarAction] =
    useState<ProfileAvatarAction | null>(null);
  const [profileSettingsDraft, setProfileSettingsDraft] = useState<ProfileSettingsDraft>(
    profileSnapshotToDraft(DEFAULT_PROFILE_SETTINGS),
  );
  const [profileSettingsFieldError, setProfileSettingsFieldError] = useState<{
    field: ProfileSettingsField;
    message: string;
  } | null>(null);
  const [notificationPreferencesDraft, setNotificationPreferencesDraft] =
    useState<NotificationPreferencesDraft>(
      notificationPreferencesToDraft(DEFAULT_NOTIFICATION_PREFERENCES),
    );
  const [notificationPreferencesError, setNotificationPreferencesError] = useState<string | null>(
    null,
  );
  const [isSavingNotificationPreferences, setIsSavingNotificationPreferences] = useState(false);
  const [shortcutPreferencesDraft, setShortcutPreferencesDraft] =
    useState<ShortcutPreferencesDraft>(
      shortcutPreferencesToDraft(DEFAULT_SHORTCUT_PREFERENCES),
    );
  const [shortcutPreferencesError, setShortcutPreferencesError] = useState<string | null>(null);
  const [isSavingShortcutPreferences, setIsSavingShortcutPreferences] = useState(false);
  const [chatTerminalOutputPreferencesDraft, setChatTerminalOutputPreferencesDraft] =
    useState<ChatTerminalOutputPreferencesDraft>(
      chatTerminalOutputPreferencesToDraft(DEFAULT_CHAT_TERMINAL_OUTPUT_PREFERENCES),
    );
  const [chatTerminalOutputPreferencesError, setChatTerminalOutputPreferencesError] = useState<
    string | null
  >(null);
  const [isSavingChatTerminalOutputPreferences, setIsSavingChatTerminalOutputPreferences] =
    useState(false);
  const [terminalConfigurationDraft, setTerminalConfigurationDraft] =
    useState<TerminalConfigurationDraft>(
      terminalConfigurationToDraft(DEFAULT_TERMINAL_CONFIGURATION),
    );
  const [terminalConfigurationError, setTerminalConfigurationError] = useState<string | null>(
    null,
  );
  const [isSavingTerminalConfiguration, setIsSavingTerminalConfiguration] = useState(false);
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [openedWorkspace, setOpenedWorkspace] = useState<OpenedWorkspace | null>(null);
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [diagnosticsOverview, setDiagnosticsOverview] =
    useState<DiagnosticsOverviewResult | null>(null);
  const [diagnosticsExportResult, setDiagnosticsExportResult] =
    useState<DiagnosticsExportResult | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [isExportingDiagnostics, setIsExportingDiagnostics] = useState(false);
  const [inviteType, setInviteType] = useState<InvitedMemberType>("assistant");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [runtimeKind, setRuntimeKind] = useState<MemberRuntimeKind>("builtInAiCli");
  const [builtinRuntimeId, setBuiltinRuntimeId] = useState("gemini-cli");
  const [customRuntimeCliId, setCustomRuntimeCliId] = useState("");
  const [customRuntimeCommand, setCustomRuntimeCommand] = useState("");
  const [inviteInstanceCount, setInviteInstanceCount] = useState(1);
  const [inviteCanMention, setInviteCanMention] = useState(true);
  const [inviteCanRemove, setInviteCanRemove] = useState(true);
  const [inviteSandboxed, setInviteSandboxed] = useState(false);
  const [inviteUnlimitedAccess, setInviteUnlimitedAccess] = useState(true);
  const [memberActionMenuId, setMemberActionMenuId] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactDisplayName, setContactDisplayName] = useState("");
  const [contactKind, setContactKind] = useState<ContactKind>("contact");
  const [contactNotes, setContactNotes] = useState("");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [isCreatingGroupConversation, setIsCreatingGroupConversation] = useState(false);
  const [isUpdatingGroupMembers, setIsUpdatingGroupMembers] = useState(false);
  const [isUpdatingConversationSettings, setIsUpdatingConversationSettings] = useState(false);
  const [isClearingConversation, setIsClearingConversation] = useState(false);
  const [isRepairingChatData, setIsRepairingChatData] = useState(false);
  const [isClearingWorkspaceChatData, setIsClearingWorkspaceChatData] = useState(false);
  const [chatMaintenanceResult, setChatMaintenanceResult] =
    useState<ChatMaintenanceResultView | null>(null);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [lastPrivateConversation, setLastPrivateConversation] =
    useState<ConversationProfile | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>("all");
  const [pendingNotificationNavigation, setPendingNotificationNavigation] =
    useState<NotificationNavigationAction | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [mentionedMemberIds, setMentionedMemberIds] = useState<string[]>([]);
  const [attachmentEntries, setAttachmentEntries] = useState<AttachmentEntry[]>([]);
  const [messages, setMessages] = useState<ChatMessageProfile[]>([]);
  const [messageDispatchStates, setMessageDispatchStates] = useState<
    Record<string, MessageDispatchState>
  >({});
  const [terminalChatStreams, setTerminalChatStreams] = useState<
    Record<string, TerminalChatStreamEntry>
  >({});
  const [memberTerminalActivity, setMemberTerminalActivity] = useState<
    Record<string, MemberTerminalActivity>
  >({});
  const [nextBeforeMessageId, setNextBeforeMessageId] = useState<string | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [recentSearch, setRecentSearch] = useState("");
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null);
  const conflictPrimaryButtonRef = useRef<HTMLButtonElement>(null);
  const conflictTriggerRef = useRef<HTMLElement | null>(null);
  const lastReadUpdateRef = useRef<string | null>(null);
  const lastUnreadPublishKeyRef = useRef<string | null>(null);
  const lastHandledNavigationKeyRef = useRef<string | null>(null);
  const terminalOutputBufferRef = useRef(new Map<string, TerminalOutputEventPayload[]>());
  const terminalFinalOnlyOutputBufferRef = useRef(
    new Map<string, TerminalOutputEventPayload[]>(),
  );
  const terminalOutputFlushTimerRef = useRef<number | null>(null);
  const chatTerminalOutputDisplayModeRef =
    useRef<ChatTerminalOutputDisplayMode>("stream");
  const diagnosticsExportGenerationRef = useRef(0);
  const membersRef = useRef<MemberProfile[]>([]);
  const { toast, showToast, clearToast } = useToastStore();
  const { data: status, isLoading } = useQuery({
    queryKey: ["workspace-selection-status"],
    queryFn: api.getWorkspaceSelectionStatus,
  });
  const recentQuery = useQuery({
    queryKey: ["recent-workspaces"],
    queryFn: api.listRecentWorkspaces,
    retry: false,
  });
  const recentWorkspaces = recentQuery.data ?? [];
  const activeWorkspace = openedWorkspace ?? windowContext?.activeWorkspace ?? null;
  const activeWorkspaceId = activeWorkspace?.metadata.projectId ?? null;
  const activeWorkspaceRoot = activeWorkspace?.rootPath ?? null;

  useEffect(() => {
    diagnosticsExportGenerationRef.current += 1;
    if (!activeWorkspaceId) {
      setDiagnosticsOverview(null);
      setDiagnosticsExportResult(null);
      setIsExportingDiagnostics(false);
      return;
    }

    let disposed = false;
    setIsLoadingDiagnostics(true);
    void localDiagnosticsApi
      .getOverview({
        workspaceId: activeWorkspaceId,
        cursor: null,
        limit: 25,
      })
      .then((result) => {
        if (!disposed) {
          setDiagnosticsOverview(result);
        }
      })
      .catch((error) => {
        if (!disposed) {
          const appError = normalizeAppError(error);
          showToast({
            tone: appError.severity,
            title: "无法加载诊断信息",
            message: appError.message,
            action: appError.userAction ?? undefined,
          });
        }
      })
      .finally(() => {
        if (!disposed) {
          setIsLoadingDiagnostics(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [activeWorkspaceId, localDiagnosticsApi, showToast]);

  const conversationQueryKey = ["chat-conversations", activeWorkspaceId] as const;
  const workspaceSkillLinksQueryKey = ["workspace-skill-links", activeWorkspaceRoot] as const;
  const roadmapTasksQueryKey = ["roadmap-tasks", activeWorkspaceRoot] as const;
  const roadmapGoalsQueryKey = ["roadmap-goals", activeWorkspaceRoot] as const;
  const memberQuery = useQuery({
    queryKey: ["members", activeWorkspaceId],
    queryFn: () =>
      membersApi.listMembers({
        workspaceId: activeWorkspaceId ?? "",
      }),
    enabled: Boolean(activeWorkspaceId),
    retry: false,
  });
  const members = memberQuery.data?.members ?? [];
  const contactQuery = useQuery({
    queryKey: ["contacts"],
    queryFn: () => contactsApi.listContacts({}),
    enabled: Boolean(activeWorkspaceId),
    retry: false,
  });
  const contacts = contactQuery.data?.contacts ?? [];
  const conversationQuery = useQuery({
    queryKey: conversationQueryKey,
    queryFn: () =>
      conversationsApi.listConversations({
        workspaceId: activeWorkspaceId ?? "",
      }),
    enabled: Boolean(activeWorkspaceId),
    retry: false,
  });
  const conversations = conversationQuery.data?.conversations ?? [];
  const skillQuery = useQuery({
    queryKey: ["skills-library"],
    queryFn: localSkillsApi.listSkills,
    enabled: Boolean(activeWorkspaceId),
    retry: false,
  });
  const skills = skillQuery.data?.skills ?? [];
  const workspaceSkillLinksQuery = useQuery({
    queryKey: workspaceSkillLinksQueryKey,
    queryFn: () => localSkillsApi.listWorkspaceLinks(activeWorkspaceRoot ?? ""),
    enabled: Boolean(activeWorkspaceRoot),
    retry: false,
  });
  const linkedSkills = workspaceSkillLinksQuery.data?.skills ?? [];
  const linkedSkillIds = useMemo(
    () => new Set(linkedSkills.map((skill) => skill.skillId)),
    [linkedSkills],
  );
  const roadmapTasksQuery = useQuery({
    queryKey: roadmapTasksQueryKey,
    queryFn: () => localRoadmapApi.listTasks(activeWorkspaceRoot ?? ""),
    enabled: Boolean(activeWorkspaceRoot),
    retry: false,
  });
  const roadmapTasks = roadmapTasksQuery.data?.tasks ?? [];
  const roadmapGoalsQuery = useQuery({
    queryKey: roadmapGoalsQueryKey,
    queryFn: () => localRoadmapApi.listGoals(activeWorkspaceRoot ?? ""),
    enabled: Boolean(activeWorkspaceRoot),
    retry: false,
  });
  const roadmapGoals = roadmapGoalsQuery.data?.goals ?? [];
  const profileSettingsQuery = useQuery({
    queryKey: ["profile-settings"],
    queryFn: profileSettingsApi.getProfileSettings,
    retry: false,
  });
  const profileSettings = profileSettingsQuery.data?.profile ?? DEFAULT_PROFILE_SETTINGS;
  const notificationPreferencesQuery = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: notificationsApi.getNotificationPreferences,
    retry: false,
  });
  const notificationPreferences =
    notificationPreferencesQuery.data?.preferences ?? DEFAULT_NOTIFICATION_PREFERENCES;
  const shortcutPreferencesQuery = useQuery({
    queryKey: ["shortcut-preferences"],
    queryFn: profileSettingsApi.getShortcutPreferences,
    retry: false,
  });
  const shortcutPreferences =
    shortcutPreferencesQuery.data?.preferences ?? DEFAULT_SHORTCUT_PREFERENCES;
  const chatTerminalOutputPreferencesQuery = useQuery({
    queryKey: ["chat-terminal-output-preferences"],
    queryFn: profileSettingsApi.getChatTerminalOutputPreferences,
    retry: false,
  });
  const chatTerminalOutputPreferences =
    chatTerminalOutputPreferencesQuery.data?.preferences ??
    DEFAULT_CHAT_TERMINAL_OUTPUT_PREFERENCES;
  chatTerminalOutputDisplayModeRef.current = chatTerminalOutputPreferences.displayMode;
  const terminalConfigurationQuery = useQuery({
    queryKey: ["terminal-configuration"],
    queryFn: profileSettingsApi.getTerminalConfiguration,
    retry: false,
  });
  const terminalConfiguration =
    terminalConfigurationQuery.data?.configuration ?? DEFAULT_TERMINAL_CONFIGURATION;
  const builtInRuntimeOptions = useMemo(
    () =>
      normalizeGolutraInviteRuntimeOptions(
        terminalConfiguration.builtInCliEntries.map((entry) => ({
          id: entry.runtimeId,
          label: entry.label,
          command: entry.command,
        })),
      ),
    [terminalConfiguration.builtInCliEntries],
  );
  const customCliRuntimeOptions = useMemo(
    () =>
      terminalConfiguration.customCliEntries.map((entry) => ({
        id: entry.cliId,
        label: entry.label,
        command: entry.command,
      })),
    [terminalConfiguration.customCliEntries],
  );
  const profiledMembers = useMemo(
    () => applyProfileSettingsToOwnerMembers(members, profileSettings),
    [members, profileSettings],
  );
  const selectedConversation =
    conversations.find((conversation) => conversation.conversationId === selectedConversationId) ??
    conversations[0] ??
    null;
  const terminalChatStreamEntries = Object.values(terminalChatStreams)
    .filter((stream) => stream.workspaceId === activeWorkspaceId)
    .sort((left, right) => {
      if (left.updatedAtMs !== right.updatedAtMs) {
        return left.updatedAtMs - right.updatedAtMs;
      }

      return left.terminalSessionId.localeCompare(right.terminalSessionId);
    });
  const unreadConversations = useMemo(
    () =>
      conversations
        .filter((conversation) => conversation.unreadCount > 0)
        .map((conversation) => {
          const participantMember =
            conversation.kind === "private" && conversation.participantKind === "member"
              ? profiledMembers.find((member) => member.memberId === conversation.participantId)
              : null;
          const terminalMemberId = participantMember?.memberId ?? null;

          return {
            conversationId: conversation.conversationId,
            title: conversation.title,
            unreadCount: conversation.unreadCount,
            lastMessagePreview: conversation.lastMessagePreview,
            terminalMemberId,
            workspacePath: activeWorkspace?.rootPath ?? null,
            conversationType: conversation.kind,
            memberCount: conversation.members.length > 0 ? conversation.members.length : null,
            senderId: participantMember?.memberId ?? null,
            senderName: participantMember?.displayName ?? null,
            senderAvatar: participantMember ? memberFriendAvatar(participantMember) : null,
            senderCanOpenTerminal: participantMember
              ? isTerminalCapableMember(participantMember)
              : false,
            updatedAtMs: conversation.updatedAtMs,
          };
        }),
    [activeWorkspace?.rootPath, conversations, profiledMembers],
  );
  const workspaceUnreadCount = unreadConversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0,
  );
  const visibleConversations =
    conversationFilter === "unread"
      ? conversations.filter((conversation) => conversation.unreadCount > 0)
      : conversations;
  const messageQueryKey = [
    "chat-messages",
    activeWorkspaceId,
    selectedConversation?.conversationId ?? null,
  ] as const;
  const messageQuery = useQuery({
    queryKey: messageQueryKey,
    queryFn: () =>
      conversationsApi.listMessages({
        workspaceId: activeWorkspaceId ?? "",
        conversationId: selectedConversation?.conversationId ?? "",
        beforeMessageId: null,
        limit: MESSAGE_PAGE_LIMIT,
      }),
    enabled: Boolean(activeWorkspaceId && selectedConversation?.conversationId),
    retry: false,
  });
  const filteredRecentWorkspaces = useMemo(() => {
    const query = recentSearch.trim().toLocaleLowerCase();

    if (!query) {
      return recentWorkspaces;
    }

    return recentWorkspaces.filter((workspace) => {
      const name = workspace.name.toLocaleLowerCase();
      const path = workspace.path.toLocaleLowerCase();

      return name.includes(query) || path.includes(query);
    });
  }, [recentSearch, recentWorkspaces]);
  const recentPrimaryWorkspaces = useMemo(
    () => recentWorkspaces.slice(0, 3),
    [recentWorkspaces],
  );
  const recentMoreWorkspaces = useMemo(
    () => recentWorkspaces.slice(3),
    [recentWorkspaces],
  );
  const filteredMoreWorkspaces = useMemo(() => {
    const query = recentSearch.trim().toLocaleLowerCase();

    if (!query) {
      return recentMoreWorkspaces;
    }

    return recentMoreWorkspaces.filter((workspace) => {
      const name = workspace.name.toLocaleLowerCase();
      const path = formatWorkspacePath(workspace.path).toLocaleLowerCase();

      return name.includes(query) || path.includes(query);
    });
  }, [recentMoreWorkspaces, recentSearch]);
  const modeLabel =
    activeWorkspace
      ? text.workspaceOpened
      : status?.windowMode === "workspaceSelection"
        ? text.workspaceSelection
        : (status?.windowMode ?? text.workspaceSelection);

  useEffect(() => {
    if (pendingConflict) {
      conflictPrimaryButtonRef.current?.focus();
      return;
    }

    conflictTriggerRef.current?.focus();
  }, [pendingConflict]);

  useEffect(() => {
    if (!recentQuery.error) {
      return;
    }

    const appError = normalizeAppError(recentQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载最近工作区",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [recentQuery.error, showToast]);

  useEffect(() => {
    if (!conversationQuery.error) {
      return;
    }

    const appError = normalizeAppError(conversationQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载会话列表",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [conversationQuery.error, showToast]);

  useEffect(() => {
    if (!messageQuery.error) {
      return;
    }

    const appError = normalizeAppError(messageQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载消息",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [messageQuery.error, showToast]);

  useEffect(() => {
    if (!skillQuery.error) {
      return;
    }

    const appError = normalizeAppError(skillQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载技能库",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [skillQuery.error, showToast]);

  useEffect(() => {
    if (!workspaceSkillLinksQuery.error) {
      return;
    }

    const appError = normalizeAppError(workspaceSkillLinksQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载工作区技能",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [workspaceSkillLinksQuery.error, showToast]);

  useEffect(() => {
    if (!roadmapTasksQuery.error) {
      return;
    }

    const appError = normalizeAppError(roadmapTasksQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载路线图",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [roadmapTasksQuery.error, showToast]);

  useEffect(() => {
    if (!roadmapGoalsQuery.error) {
      return;
    }

    const appError = normalizeAppError(roadmapGoalsQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载路线图目标",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [roadmapGoalsQuery.error, showToast]);

  useEffect(() => {
    if (!profileSettingsQuery.error) {
      return;
    }

    const appError = normalizeAppError(profileSettingsQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载个人资料",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [profileSettingsQuery.error, showToast]);

  useEffect(() => {
    if (!notificationPreferencesQuery.error) {
      return;
    }

    const appError = normalizeAppError(notificationPreferencesQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载通知设置",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [notificationPreferencesQuery.error, showToast]);

  useEffect(() => {
    if (!shortcutPreferencesQuery.error) {
      return;
    }

    const appError = normalizeAppError(shortcutPreferencesQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载快捷键设置",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [shortcutPreferencesQuery.error, showToast]);

  useEffect(() => {
    if (!chatTerminalOutputPreferencesQuery.error) {
      return;
    }

    const appError = normalizeAppError(chatTerminalOutputPreferencesQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载聊天输出设置",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [chatTerminalOutputPreferencesQuery.error, showToast]);

  useEffect(() => {
    if (!terminalConfigurationQuery.error) {
      return;
    }

    const appError = normalizeAppError(terminalConfigurationQuery.error);

    showToast({
      tone: appError.severity,
      title: "无法加载 CLI 与终端设置",
      message: appError.message,
      action: appError.userAction ?? undefined,
    });
  }, [terminalConfigurationQuery.error, showToast]);

  useEffect(() => {
    if (isProfileSettingsOpen) {
      return;
    }

    setProfileSettingsDraft(profileSnapshotToDraft(profileSettings));
    setProfileSettingsFieldError(null);
    setNotificationPreferencesDraft(notificationPreferencesToDraft(notificationPreferences));
    setNotificationPreferencesError(null);
    setShortcutPreferencesDraft(shortcutPreferencesToDraft(shortcutPreferences));
    setShortcutPreferencesError(null);
    setChatTerminalOutputPreferencesDraft(
      chatTerminalOutputPreferencesToDraft(chatTerminalOutputPreferences),
    );
    setChatTerminalOutputPreferencesError(null);
    setTerminalConfigurationDraft(terminalConfigurationToDraft(terminalConfiguration));
    setTerminalConfigurationError(null);
  }, [
    chatTerminalOutputPreferences,
    isProfileSettingsOpen,
    notificationPreferences,
    profileSettings,
    shortcutPreferences,
    terminalConfiguration,
  ]);

  useEffect(() => {
    if (
      builtInRuntimeOptions.length > 0 &&
      !builtInRuntimeOptions.some((option) => option.id === builtinRuntimeId)
    ) {
      setBuiltinRuntimeId(builtInRuntimeOptions[0].id);
    }
  }, [builtInRuntimeOptions, builtinRuntimeId]);

  useEffect(() => {
    if (
      runtimeKind === "customCli" &&
      customCliRuntimeOptions.length > 0 &&
      !customRuntimeCliId &&
      !customRuntimeCommand.trim()
    ) {
      setCustomRuntimeCliId(customCliRuntimeOptions[0].id);
    }
  }, [customCliRuntimeOptions, customRuntimeCliId, customRuntimeCommand, runtimeKind]);

  useEffect(() => {
    membersRef.current = profiledMembers;
  }, [profiledMembers]);

  useEffect(() => {
    let cancelled = false;
    const avatarKey = unreadConversations[0]?.senderAvatar ?? null;
    const request = {
      workspaceId: activeWorkspaceId,
      workspaceName: activeWorkspace?.metadata.name ?? null,
      conversations: activeWorkspaceId ? unreadConversations : [],
      sourceWindowLabel: windowContext?.currentWindow.label ?? "main",
      avatarPng: null as number[] | null,
    };
    const publishKey = JSON.stringify({ ...request, avatarKey });

    if (lastUnreadPublishKeyRef.current === publishKey) {
      return () => {
        cancelled = true;
      };
    }
    lastUnreadPublishKeyRef.current = publishKey;

    async function publishUnreadSummary() {
      request.avatarPng = await renderNotificationAvatarPng(avatarKey);
      if (cancelled) {
        return;
      }

      notificationsApi.updateUnreadSummary(request).catch((error) => {
        const appError = normalizeAppError(error);
        showToast({
          tone: appError.severity,
          title: "无法同步未读状态",
          message: appError.message,
          action: appError.userAction ?? undefined,
        });
      });
    }

    void publishUnreadSummary();

    return () => {
      cancelled = true;
    };
  }, [
    activeWorkspace?.metadata.name,
    activeWorkspaceId,
    notificationsApi,
    showToast,
    unreadConversations,
    windowContext?.currentWindow.label,
  ]);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    function queueNavigation(action: NotificationNavigationAction | null) {
      if (!action) {
        return;
      }

      const navigationKey = notificationNavigationKey(action);
      if (lastHandledNavigationKeyRef.current === navigationKey) {
        return;
      }

      setPendingNotificationNavigation(action);
    }

    async function subscribeNavigation() {
      try {
        const pending = await notificationsApi.getPendingNavigation();
        if (!disposed) {
          queueNavigation(pending.action);
        }

        unsubscribe = await notificationsApi.subscribeNavigation((action) => {
          if (!disposed) {
            queueNavigation(action);
          }
        });

        if (disposed) {
          unsubscribe();
        }
      } catch (error) {
        if (!disposed) {
          const appError = normalizeAppError(error);
          showToast({
            tone: appError.severity,
            title: "无法同步通知跳转",
            message: appError.message,
            action: appError.userAction ?? undefined,
          });
        }
      }
    }

    void subscribeNavigation();

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [notificationsApi, showToast]);

  useEffect(() => {
    if (!pendingNotificationNavigation || !activeWorkspaceId || conversationQuery.isLoading) {
      return;
    }

    if (
      pendingNotificationNavigation.workspaceId &&
      pendingNotificationNavigation.workspaceId !== activeWorkspaceId
    ) {
      lastHandledNavigationKeyRef.current = notificationNavigationKey(
        pendingNotificationNavigation,
      );
      setPendingNotificationNavigation(null);
      return;
    }

    const navigationKey = notificationNavigationKey(pendingNotificationNavigation);
    if (lastHandledNavigationKeyRef.current === navigationKey) {
      setPendingNotificationNavigation(null);
      return;
    }

    if (pendingNotificationNavigation.kind === "allUnread") {
      setConversationFilter("unread");
      const firstUnreadConversation = conversations.find(
        (conversation) => conversation.unreadCount > 0,
      );
      if (firstUnreadConversation) {
        setSelectedConversationId(firstUnreadConversation.conversationId);
      }
      lastHandledNavigationKeyRef.current = navigationKey;
      setPendingNotificationNavigation(null);
      return;
    }

    if (pendingNotificationNavigation.kind === "conversation") {
      const targetConversation = conversations.find(
        (conversation) =>
          conversation.conversationId === pendingNotificationNavigation.conversationId,
      );

      if (!targetConversation) {
        showToast({
          tone: "warning",
          title: "未找到通知会话",
          message: "该通知引用的会话不在当前工作区会话列表中。",
          action: "请查看全部未读",
        });
      } else {
        setConversationFilter("all");
        setSelectedConversationId(targetConversation.conversationId);
      }

      lastHandledNavigationKeyRef.current = navigationKey;
      setPendingNotificationNavigation(null);
      return;
    }

    lastHandledNavigationKeyRef.current = navigationKey;
    setPendingNotificationNavigation(null);
  }, [
    activeWorkspaceId,
    conversationQuery.isLoading,
    conversations,
    pendingNotificationNavigation,
    showToast,
  ]);

  useEffect(() => {
    terminalOutputBufferRef.current.clear();
    terminalFinalOnlyOutputBufferRef.current.clear();
    if (terminalOutputFlushTimerRef.current !== null) {
      window.clearTimeout(terminalOutputFlushTimerRef.current);
      terminalOutputFlushTimerRef.current = null;
    }
    setTerminalChatStreams({});
    setMemberTerminalActivity({});
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (!activeWorkspaceId) {
      return;
    }

    let disposed = false;
    let unsubscribeOutput: (() => void) | null = null;
    let unsubscribeStatus: (() => void) | null = null;

    function flushTerminalOutput() {
      terminalOutputFlushTimerRef.current = null;
      const bufferedEvents = [...terminalOutputBufferRef.current.values()]
        .flat()
        .filter((event) => event.workspaceId === activeWorkspaceId)
        .sort((left, right) => {
          const sessionCompare = left.terminalSessionId.localeCompare(right.terminalSessionId);
          if (sessionCompare !== 0) {
            return sessionCompare;
          }

          if (left.seq !== right.seq) {
            return left.seq - right.seq;
          }

          return left.emittedAtMs - right.emittedAtMs;
        });

      terminalOutputBufferRef.current.clear();
      if (bufferedEvents.length === 0) {
        return;
      }

      setTerminalChatStreams((current) => {
        let next = current;

        for (const event of bufferedEvents) {
          const existing = next[event.terminalSessionId];
          if (existing && event.seq <= existing.lastSeq) {
            continue;
          }

          const memberLabel = terminalMemberLabel(
            event.memberId,
            membersRef.current,
            existing?.title ?? null,
          );
          const updatedText = `${existing?.text ?? ""}${event.chunk}`.slice(
            -TERMINAL_STREAM_MAX_CHARS,
          );

          if (next === current) {
            next = { ...current };
          }

          next[event.terminalSessionId] = {
            terminalSessionId: event.terminalSessionId,
            workspaceId: event.workspaceId,
            memberId: event.memberId,
            memberLabel,
            title: existing?.title ?? memberLabel,
            status: existing?.status ?? "running",
            exitReasonMessage: existing?.exitReasonMessage ?? null,
            text: updatedText,
            lastSeq: event.seq,
            updatedAtMs: event.emittedAtMs,
          };
        }

        return next;
      });
    }

    function scheduleTerminalOutputFlush() {
      if (terminalOutputFlushTimerRef.current !== null) {
        return;
      }

      terminalOutputFlushTimerRef.current = window.setTimeout(
        flushTerminalOutput,
        TERMINAL_STREAM_FLUSH_MS,
      );
    }

    function bufferedTerminalOutputText(
      events: TerminalOutputEventPayload[],
      lastRenderedSeq: number,
    ) {
      const orderedEvents = compactTerminalOutputEvents(events);
      let text = "";
      let lastSeq = lastRenderedSeq;

      for (const event of orderedEvents) {
        if (event.seq <= lastSeq) {
          continue;
        }

        text = `${text}${event.chunk}`.slice(-TERMINAL_STREAM_MAX_CHARS);
        lastSeq = event.seq;
      }

      return { text, lastSeq };
    }

    function compactTerminalOutputEvents(events: TerminalOutputEventPayload[]) {
      const orderedEvents = events
        .filter((event) => event.workspaceId === activeWorkspaceId)
        .sort((left, right) => {
          if (left.seq !== right.seq) {
            return left.seq - right.seq;
          }

          return left.emittedAtMs - right.emittedAtMs;
        });
      const uniqueEvents: TerminalOutputEventPayload[] = [];
      let lastSeq = 0;

      for (const event of orderedEvents) {
        if (event.seq <= lastSeq) {
          continue;
        }

        uniqueEvents.push(event);
        lastSeq = event.seq;
      }

      const retainedEvents: TerminalOutputEventPayload[] = [];
      let retainedChars = 0;

      for (let index = uniqueEvents.length - 1; index >= 0; index -= 1) {
        if (retainedEvents.length >= TERMINAL_STREAM_MAX_BUFFER_EVENTS) {
          break;
        }

        if (retainedChars >= TERMINAL_STREAM_MAX_CHARS && uniqueEvents[index].chunk.length > 0) {
          break;
        }

        retainedEvents.push(uniqueEvents[index]);
        retainedChars += uniqueEvents[index].chunk.length;
      }

      return retainedEvents.reverse();
    }

    async function subscribeTerminalEvents() {
      try {
        unsubscribeOutput = await terminalsApi.subscribeOutput((event) => {
          if (disposed || event.workspaceId !== activeWorkspaceId) {
            return;
          }

          if (chatTerminalOutputDisplayModeRef.current === "finalOnly") {
            const sessionEvents =
              terminalFinalOnlyOutputBufferRef.current.get(event.terminalSessionId) ?? [];
            terminalFinalOnlyOutputBufferRef.current.set(
              event.terminalSessionId,
              compactTerminalOutputEvents([...sessionEvents, event]),
            );
            return;
          }

          const sessionEvents = terminalOutputBufferRef.current.get(event.terminalSessionId) ?? [];
          terminalOutputBufferRef.current.set(event.terminalSessionId, [
            ...sessionEvents,
            event,
          ]);
          scheduleTerminalOutputFlush();
        });

        unsubscribeStatus = await terminalsApi.subscribeStatus((event) => {
          if (disposed || event.workspaceId !== activeWorkspaceId) {
            return;
          }

          const memberLabel = terminalMemberLabel(event.memberId, membersRef.current, event.title);
          const snapshotText = event.snapshot.text.slice(-TERMINAL_STREAM_MAX_CHARS);
          const exitReasonMessage = event.exitReason?.message ?? null;
          const displayMode = chatTerminalOutputDisplayModeRef.current;
          const finalOnlyBufferedEvents =
            terminalFinalOnlyOutputBufferRef.current.get(event.terminalSessionId) ?? [];

          setTerminalChatStreams((current) => {
            const existing = current[event.terminalSessionId];
            const existingLastSeq = existing?.lastSeq ?? 0;
            const finalOnlyFallback = bufferedTerminalOutputText(
              finalOnlyBufferedEvents,
              existingLastSeq,
            );
            const shouldUseSnapshot =
              displayMode === "stream" &&
              event.snapshot.lastSeq > existingLastSeq &&
              snapshotText.length > 0;
            const isFinalOnlyExit = displayMode === "finalOnly" && event.status === "exited";
            const shouldUseFinalOnlySnapshot =
              isFinalOnlyExit &&
              event.snapshot.lastSeq > existingLastSeq &&
              event.snapshot.lastSeq >= finalOnlyFallback.lastSeq &&
              snapshotText.length > 0;
            const shouldUseFinalOnlyFallback =
              isFinalOnlyExit &&
              !shouldUseFinalOnlySnapshot &&
              finalOnlyFallback.lastSeq > existingLastSeq &&
              finalOnlyFallback.text.length > 0;
            const text = shouldUseFinalOnlySnapshot
              ? snapshotText
              : shouldUseFinalOnlyFallback
                ? `${existing?.text ?? ""}${finalOnlyFallback.text}`.slice(
                    -TERMINAL_STREAM_MAX_CHARS,
                  )
                : shouldUseSnapshot
                  ? snapshotText
                  : (existing?.text ?? "");
            const lastSeq = shouldUseFinalOnlySnapshot
              ? Math.max(existingLastSeq, event.snapshot.lastSeq, finalOnlyFallback.lastSeq)
              : shouldUseFinalOnlyFallback
                ? Math.max(existingLastSeq, finalOnlyFallback.lastSeq)
                : shouldUseSnapshot
                  ? Math.max(existingLastSeq, event.snapshot.lastSeq)
                  : existingLastSeq;

            return {
              ...current,
              [event.terminalSessionId]: {
                terminalSessionId: event.terminalSessionId,
                workspaceId: event.workspaceId,
                memberId: event.memberId,
                memberLabel,
                title: event.title,
                status: event.status,
                exitReasonMessage,
                text,
                lastSeq,
                updatedAtMs: event.emittedAtMs,
              },
            };
          });

          if (displayMode === "finalOnly" && event.status === "exited") {
            terminalFinalOnlyOutputBufferRef.current.delete(event.terminalSessionId);
          }

          if (event.memberId) {
            setMemberTerminalActivity((current) => {
              const existing = current[event.memberId!];
              if (existing && existing.updatedAtMs > event.emittedAtMs) {
                return current;
              }

              return {
                ...current,
                [event.memberId!]: {
                  terminalSessionId: event.terminalSessionId,
                  title: event.title,
                  status: event.status,
                  exitReasonMessage,
                  updatedAtMs: event.emittedAtMs,
                },
              };
            });
          }
        });
      } catch (error) {
        if (disposed) {
          return;
        }

        const appError = normalizeAppError(error);
        showToast({
          tone: appError.severity,
          title: "无法订阅终端事件",
          message: appError.message,
          action: appError.userAction ?? undefined,
        });
      }
    }

    void subscribeTerminalEvents();

    return () => {
      disposed = true;
      unsubscribeOutput?.();
      unsubscribeStatus?.();
      terminalOutputBufferRef.current.clear();
      terminalFinalOnlyOutputBufferRef.current.clear();
      if (terminalOutputFlushTimerRef.current !== null) {
        window.clearTimeout(terminalOutputFlushTimerRef.current);
        terminalOutputFlushTimerRef.current = null;
      }
    };
  }, [activeWorkspaceId, terminalsApi, showToast]);

  useEffect(() => {
    const data = messageQuery.data;

    if (!data) {
      setMessages([]);
      setNextBeforeMessageId(null);
      setHasOlderMessages(false);
      lastReadUpdateRef.current = null;
      return;
    }

    setMessages(data.messages);
    setNextBeforeMessageId(data.nextBeforeMessageId);
    setHasOlderMessages(data.hasMore);
    updateConversationInCache(data.conversation);
  }, [messageQuery.data]);

  useEffect(() => {
    if (!activeWorkspaceId || !selectedConversation || messages.length === 0) {
      return;
    }

    const latestPersistedMessage = [...messages]
      .reverse()
      .find((message) => !message.messageId.startsWith("pending-"));

    if (!latestPersistedMessage) {
      return;
    }

    const updateKey = `${selectedConversation.conversationId}:${latestPersistedMessage.messageId}`;
    if (lastReadUpdateRef.current === updateKey) {
      return;
    }
    lastReadUpdateRef.current = updateKey;

    conversationsApi
      .updateReadPosition({
        workspaceId: activeWorkspaceId,
        conversationId: selectedConversation.conversationId,
        messageId: latestPersistedMessage.messageId,
      })
      .then((result) => {
        updateConversationInCache(result.conversation);
      })
      .catch((error) => {
        const appError = normalizeAppError(error);
        showToast({
          tone: appError.severity,
          title: "无法更新已读位置",
          message: appError.message,
          action: appError.userAction ?? undefined,
        });
      });
  }, [activeWorkspaceId, conversationsApi, messages, selectedConversation, showToast]);

  useEffect(() => {
    if (selectedConversation?.kind !== "group") {
      setSelectedGroupMemberIds([]);
      return;
    }

    setSelectedGroupMemberIds(selectedConversation.members.map((member) => member.memberId));
  }, [selectedConversation?.conversationId, selectedConversation?.kind, selectedConversation?.members]);

  useEffect(() => {
    setRenameDraft(selectedConversation?.title ?? "");
  }, [selectedConversation?.conversationId, selectedConversation?.title]);

  async function handleOpenWorkspace() {
    await runOpenFlow(() => api.pickAndOpenWorkspace());
  }

  async function handleOpenRecent(path: string) {
    await runOpenFlow(() => api.openWorkspace(path));
  }

  async function handleResolveConflict(resolution: WorkspaceConflictResolution) {
    const selectedPath = pendingConflict?.conflict.selectedPath;

    if (!selectedPath) {
      return;
    }

    setPendingConflict(null);
    await runOpenFlow(() => api.openWorkspace(selectedPath, { conflictResolution: resolution }));
  }

  function handleCancelConflict() {
    setPendingConflict(null);
  }

  async function handlePreferenceChange(update: {
    theme?: AppTheme | null;
    language?: AppLanguage | null;
  }) {
    if (!onPreferencesChange) {
      return;
    }

    setIsSyncActionPending(true);

    try {
      await onPreferencesChange(update);
      clearToast();
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法同步窗口偏好",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSyncActionPending(false);
    }
  }

  async function handleOpenWindowMode(mode: WindowMode) {
    if (!onOpenWindowMode) {
      return;
    }

    setIsSyncActionPending(true);

    try {
      if (mode === "terminal") {
        await terminalsApi.openTerminal();
      } else {
        await onOpenWindowMode(mode);
      }
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法打开窗口",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSyncActionPending(false);
    }
  }

  async function handleOpenWorkspaceTerminal() {
    if (!activeWorkspace) {
      return;
    }

    setIsSyncActionPending(true);

    try {
      const result = await terminalsApi.openTerminal();
      showToast({
        tone: "info",
        title: result.sessionCreated ? "终端已打开" : "终端已复用",
        message: `${activeWorkspace.metadata.name} 的终端窗口已准备好。`,
        action: result.session.terminalSessionId,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法打开终端",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSyncActionPending(false);
    }
  }

  async function handleOpenMemberTerminal(member: MemberProfile) {
    if (!activeWorkspace || !isTerminalCapableMember(member)) {
      return;
    }

    setIsSyncActionPending(true);

    try {
      const result = await terminalsApi.openTerminal({ memberId: member.memberId });
      setMemberActionMenuId(null);
      showToast({
        tone: "info",
        title: result.sessionCreated ? "成员终端已打开" : "成员终端已复用",
        message: `${member.instanceLabel} 的终端会话已准备好。`,
        action: result.session.terminalSessionId,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法打开成员终端",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSyncActionPending(false);
    }
  }

  async function handleOpenInFileManager() {
    if (!activeWorkspace) {
      return;
    }

    setIsOpeningFileManager(true);

    try {
      await api.openWorkspaceInFileManager(activeWorkspace.rootPath);
      showToast({
        tone: "info",
        title: "已请求打开文件管理器",
        message: "系统文件管理器正在打开当前工作区路径。",
        action: activeWorkspace.rootPath,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法打开文件管理器",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsOpeningFileManager(false);
    }
  }

  async function handleValidateDataIntegrity() {
    setIsValidatingIntegrity(true);

    try {
      const workspaceRoot =
        activeWorkspace?.rootPath ?? null;
      const result = await integrityApi.validate({ workspaceRoot });

      setIntegrityReport(result.report);
      showToast({
        tone: result.report.hasFailures ? "warning" : "info",
        title: result.report.hasFailures ? "数据验证发现问题" : "数据验证通过",
        message: `${result.report.passedChecks} 项通过，${result.report.failedChecks} 项失败，${result.report.skippedChecks} 项跳过。`,
        action: result.report.hasFailures
          ? "查看页面中的数据完整性报告。"
          : "当前已实现存储项没有发现损坏。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法运行数据验证",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsValidatingIntegrity(false);
    }
  }

  async function handleRefreshDiagnostics() {
    if (!activeWorkspaceId) {
      return;
    }

    setIsLoadingDiagnostics(true);

    try {
      const result = await localDiagnosticsApi.getOverview({
        workspaceId: activeWorkspaceId,
        cursor: null,
        limit: 25,
      });

      setDiagnosticsOverview(result);
      showToast({
        tone: "info",
        title: "诊断信息已刷新",
        message: `已读取 ${result.runs.length} 个 run 和 ${result.keyEvents.length} 条事件。`,
        action: result.hasMore ? "还有更多诊断事件，可通过导出分批获取。" : undefined,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法刷新诊断信息",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsLoadingDiagnostics(false);
    }
  }

  async function handleGenerateDiagnosticsExport(cursor: string | null = null) {
    if (!activeWorkspaceId) {
      return;
    }

    const exportGeneration = diagnosticsExportGenerationRef.current + 1;
    diagnosticsExportGenerationRef.current = exportGeneration;
    setIsExportingDiagnostics(true);

    try {
      const result = await localDiagnosticsApi.generateExport({
        workspaceId: activeWorkspaceId,
        cursor,
        maxEvents: 25,
        includeSections: [
          "runs",
          "events",
          "validationReports",
          "consistencySummaries",
          "appMetadata",
          "additionalContext",
        ],
        additionalContext: [],
      });

      if (diagnosticsExportGenerationRef.current !== exportGeneration) {
        return;
      }
      setDiagnosticsExportResult(result);
      showToast({
        tone: result.warnings.length > 0 ? "warning" : "info",
        title: result.warnings.length > 0 ? "诊断导出已生成，包含脱敏提醒" : "诊断导出已生成",
        message: `本批包含 ${result.package.runs.length} 个 run 和 ${result.package.keyEvents.length} 条事件。`,
        action: result.hasMore ? "可继续生成下一批，或停止当前导出。" : "导出包已完成脱敏处理。",
      });
    } catch (error) {
      if (diagnosticsExportGenerationRef.current !== exportGeneration) {
        return;
      }
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法生成诊断导出",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      if (diagnosticsExportGenerationRef.current === exportGeneration) {
        setIsExportingDiagnostics(false);
      }
    }
  }

  function handleClearDiagnosticsExport() {
    diagnosticsExportGenerationRef.current += 1;
    setIsExportingDiagnostics(false);
    setDiagnosticsExportResult(null);
  }

  async function handleInviteMember() {
    if (!activeWorkspace) {
      return;
    }

    setIsInvitingMember(true);

    try {
      const runtime = selectedRuntimeProfile(
        runtimeKind,
        builtinRuntimeId,
        customRuntimeCliId,
        customRuntimeCommand,
        builtInRuntimeOptions,
        customCliRuntimeOptions,
      );
      const resolvedInviteDisplayName =
        inviteDisplayName.trim() ||
        runtime.label?.trim() ||
        (inviteType === "member" ? "Local Collaborator" : "Codex Reviewer");
      const result = await membersApi.inviteMember({
        workspaceId: activeWorkspace.metadata.projectId,
        memberType: inviteType,
        displayName: resolvedInviteDisplayName,
        runtime,
        instanceCount: inviteInstanceCount,
        permissions: {
          canMention: inviteCanMention,
          canRemove: inviteCanRemove,
        },
        isolation: {
          sandboxed: inviteSandboxed,
          unlimitedAccess: inviteUnlimitedAccess,
        },
      });

      setInviteDisplayName("");
      await memberQuery.refetch();
      const inviteFeedbackText =
        language === "en-US"
          ? {
              title: "Member invited",
              multiple: "Saved {count} {role} instances.",
              single: "{name} saved as {role}.",
              action: "Runtime config saved; the terminal will not start automatically.",
            }
          : {
              title: "成员已邀请",
              multiple: "已保存 {count} 个{role}实例。",
              single: "{name} 已保存为{role}。",
              action: "运行时配置已保存，终端不会自动启动。",
            };
      const invitedRoleLabel = parityMemberRoleLabel(result.member.role, language);
      showToast({
        tone: "info",
        title: inviteFeedbackText.title,
        message:
          result.invitedMembers.length > 1
            ? formatChatText(inviteFeedbackText.multiple, {
                count: result.invitedMembers.length,
                role: invitedRoleLabel,
              })
            : formatChatText(inviteFeedbackText.single, {
                name: result.member.instanceLabel,
                role: invitedRoleLabel,
              }),
        action: inviteFeedbackText.action,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法邀请成员",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsInvitingMember(false);
    }
  }

  async function handleRemoveMember(member: MemberProfile) {
    if (!activeWorkspace || !member.permissions.canRemove) {
      return;
    }

    const confirmed = window.confirm(`移除 ${member.instanceLabel}？`);

    if (!confirmed) {
      return;
    }

    try {
      await membersApi.removeMember({
        workspaceId: activeWorkspace.metadata.projectId,
        memberId: member.memberId,
      });
      setMemberActionMenuId(null);
      await memberQuery.refetch();
      showToast({
        tone: "info",
        title: "成员已移除",
        message: `${member.instanceLabel} 已从当前工作区移除。`,
        action: "未处理未来聊天或终端数据。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法移除成员",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    }
  }

  async function handleUpdateMemberProfile(member: MemberProfile, displayName: string) {
    if (!activeWorkspaceId) {
      return;
    }

    try {
      const result = await membersApi.updateMemberProfile({
        workspaceId: activeWorkspaceId,
        memberId: member.memberId,
        displayName,
      });
      queryClient.setQueryData(["members", activeWorkspaceId], { members: result.members });
      showToast({
        tone: "info",
        title: "成员资料已更新",
        message: `${result.member.instanceLabel} 已保存。`,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法更新成员资料",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
      throw error;
    }
  }

  async function handleUpdateMemberStatus(member: MemberProfile, status: MemberProfile["status"]) {
    if (!activeWorkspaceId) {
      return;
    }

    try {
      const result = await membersApi.updateMemberStatus({
        workspaceId: activeWorkspaceId,
        memberId: member.memberId,
        status,
      });
      queryClient.setQueryData(["members", activeWorkspaceId], { members: result.members });
      setMemberActionMenuId(null);
      showToast({
        tone: "info",
        title: "成员状态已更新",
        message: `${result.member.instanceLabel} 已设为${memberStatusLabel(result.member.status)}。`,
      });

      if (status === "online") {
        const resumed = await dispatchApi.resumeMemberDispatchQueue({
          workspaceId: activeWorkspaceId,
          memberId: member.memberId,
        });

        if (resumed.dispatch) {
          const resumedMember =
            result.members.find(
              (item) => item.memberId === resumed.dispatch?.targetResolution.memberId,
            ) ?? result.member;
          setMessageDispatchStates((current) => ({
            ...current,
            [resumed.dispatch!.messageId]: stateForDispatchProfile(
              resumed.dispatch!,
              resumedMember,
            ),
          }));
          showToast({
            tone: resumed.dispatch.status === "failed" ? "error" : "info",
            title: resumed.dispatch.status === "failed" ? "队列恢复失败" : "队列已继续",
            message:
              resumed.dispatch.status === "failed"
                ? (resumed.dispatch.failure?.message ?? "队列任务未能启动。")
                : `${resumedMember.instanceLabel} 已收到下一条队列任务。`,
            action: resumed.queueRemaining > 0 ? `剩余 ${resumed.queueRemaining} 条` : undefined,
          });
        }
      }
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法更新成员状态",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    }
  }

  function handleMentionMember(member: MemberProfile) {
    if (!member.permissions.canMention) {
      return;
    }

    setMemberActionMenuId(null);
    addMentionMember(member);
    showToast({
      tone: "info",
      title: "已准备提及成员",
      message: `${member.instanceLabel} 的提及入口已记录。`,
      action: `@${member.instanceLabel}`,
    });
  }

  function handleMessageDraftChange(value: string) {
    setMessageDraft(value);
  }

  function addMentionMember(member: MemberProfile) {
    if (!member.permissions.canMention) {
      return;
    }

    setMentionedMemberIds((current) =>
      current.includes(member.memberId) ? current : [...current, member.memberId],
    );
    setMessageDraft((current) => insertMentionText(current, member));
  }

  function removeMentionMember(memberId: string) {
    setMentionedMemberIds((current) => current.filter((id) => id !== memberId));
  }

  function addImageAttachmentEntry() {
    setAttachmentEntries((current) =>
      current.some((entry) => entry.kind === "image") ? current : [...current, { kind: "image" }],
    );
  }

  function openRoadmapAttachmentPicker() {
    if (roadmapTasks.length === 0) {
      setFocusedRoadmapTaskId(null);
      setIsRoadmapOpen(true);
      showToast({
        tone: "warning",
        title: "暂无可引用路线图任务",
        message: "先创建一个路线图任务，再从聊天里引用它。",
      });
      return;
    }

    setIsRoadmapAttachmentPickerOpen((current) => !current);
  }

  function addRoadmapAttachmentEntry(task: RoadmapTaskEntry) {
    setAttachmentEntries((current) =>
      current.some((entry) => entry.kind === "roadmap" && entry.taskId === task.taskId)
        ? current
        : [...current, { kind: "roadmap", taskId: task.taskId, title: task.title }],
    );
    setIsRoadmapAttachmentPickerOpen(false);
  }

  function openRoadmapReference(taskId: string) {
    setFocusedRoadmapTaskId(taskId);
    setIsRoadmapOpen(true);
  }

  function removeAttachmentEntry(entry: AttachmentEntry) {
    setAttachmentEntries((current) =>
      current.filter((item) => attachmentEntryKey(item) !== attachmentEntryKey(entry)),
    );
  }

  function handleToggleCreateGroupMember(memberId: string) {
    setGroupMemberIds((current) => toggleId(current, memberId));
  }

  function handleToggleSelectedGroupMember(memberId: string) {
    setSelectedGroupMemberIds((current) => toggleId(current, memberId));
  }

  async function handleCreateGroupConversation() {
    if (!activeWorkspace) {
      return;
    }

    setIsCreatingGroupConversation(true);

    try {
      const result = await conversationsApi.createGroupConversation({
        workspaceId: activeWorkspace.metadata.projectId,
        title: groupTitle,
        memberIds: groupMemberIds,
      });

      queryClient.setQueryData<ListConversationsResult>(conversationQueryKey, {
        conversations: result.conversations,
      });
      setSelectedConversationId(result.conversation.conversationId);
      setGroupTitle("");
      setGroupMemberIds([]);
      showToast({
        tone: "info",
        title: "群聊已创建",
        message: `${result.conversation.title} 已加入会话列表。`,
        action: `${result.conversation.members.length} 个成员`,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法创建群聊",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsCreatingGroupConversation(false);
    }
  }

  async function handleUpdateGroupMembers() {
    if (!activeWorkspace || selectedConversation?.kind !== "group") {
      return;
    }

    setIsUpdatingGroupMembers(true);

    try {
      const result = await conversationsApi.updateGroupConversationMembers({
        workspaceId: activeWorkspace.metadata.projectId,
        conversationId: selectedConversation.conversationId,
        memberIds: selectedGroupMemberIds,
      });

      queryClient.setQueryData<ListConversationsResult>(conversationQueryKey, {
        conversations: result.conversations,
      });
      setSelectedConversationId(result.conversation.conversationId);
      showToast({
        tone: "info",
        title: "群聊成员已更新",
        message: `${result.conversation.title} 当前包含 ${result.conversation.members.length} 个成员。`,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法更新群聊成员",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsUpdatingGroupMembers(false);
    }
  }

  async function handleUpdateConversationSettings(update: {
    title?: string;
    isPinned?: boolean;
    isMuted?: boolean;
  }, targetConversation: ConversationProfile | null = selectedConversation) {
    if (!activeWorkspaceId || !targetConversation) {
      return;
    }

    setIsUpdatingConversationSettings(true);

    try {
      const result = await conversationsApi.updateConversationSettings({
        workspaceId: activeWorkspaceId,
        conversationId: targetConversation.conversationId,
        title: update.title ?? null,
        isPinned: update.isPinned ?? null,
        isMuted: update.isMuted ?? null,
      });

      queryClient.setQueryData<ListConversationsResult>(conversationQueryKey, {
        conversations: result.conversations,
      });
      setSelectedConversationId(result.conversation.conversationId);
      setRenameDraft(result.conversation.title);
      showToast({
        tone: "info",
        title: "会话已更新",
        message: `${result.conversation.title} 的会话状态已保存。`,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法更新会话",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsUpdatingConversationSettings(false);
    }
  }

  async function handleRenameConversation() {
    const title = renameDraft.trim();

    if (!title) {
      showToast({
        tone: "warning",
        title: "会话名称为空",
        message: "请输入会话名称后再保存。",
      });
      return;
    }

    await handleUpdateConversationSettings({ title });
  }

  async function handleClearConversation(targetConversation: ConversationProfile | null = selectedConversation) {
    if (!activeWorkspaceId || !targetConversation) {
      return;
    }

    const confirmed = window.confirm(`清空 ${targetConversation.title} 的本地消息？`);

    if (!confirmed) {
      return;
    }

    setIsClearingConversation(true);

    try {
      const result = await conversationsApi.clearConversation({
        workspaceId: activeWorkspaceId,
        conversationId: targetConversation.conversationId,
      });

      queryClient.setQueryData<ListConversationsResult>(conversationQueryKey, {
        conversations: result.conversations,
      });
      queryClient.setQueryData<ListMessagesResult>(messageQueryKey, (current) =>
        current
          ? {
              ...current,
              messages: [],
              hasMore: false,
              nextBeforeMessageId: null,
              readPosition: null,
              conversation: result.conversation,
            }
          : current,
      );
      setSelectedConversationId(result.conversation.conversationId);
      setMessages([]);
      setNextBeforeMessageId(null);
      setHasOlderMessages(false);
      showToast({
        tone: "info",
        title: "会话已清空",
        message: `${result.conversation.title} 已清除 ${result.clearedMessageCount} 条本地消息。`,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法清空会话",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsClearingConversation(false);
    }
  }

  async function handleRepairWorkspaceChatData() {
    if (!activeWorkspaceId) {
      return;
    }

    const workspaceLabel = activeWorkspace?.metadata.name ?? activeWorkspaceId;
    const confirmed = window.confirm(
      `修复 ${workspaceLabel} 的本地聊天数据？此操作可能删除无效消息索引。`,
    );

    if (!confirmed) {
      return;
    }

    setIsRepairingChatData(true);

    try {
      const result = await conversationsApi.repairWorkspaceData({
        workspaceId: activeWorkspaceId,
      });

      queryClient.setQueryData<ListConversationsResult>(conversationQueryKey, {
        conversations: result.conversations,
      });
      await queryClient.invalidateQueries({ queryKey: messageQueryKey });
      setChatMaintenanceResult(chatRepairResultView(result));
      showToast({
        tone: result.failedCount > 0 ? "warning" : "info",
        title: result.failedCount > 0 ? "聊天数据修复有遗留项" : "聊天数据修复完成",
        message: `已修复 ${result.repairedCount} 项，失败 ${result.failedCount} 项，跳过 ${result.skippedCount} 项。`,
        action: result.followUpAction,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      setChatMaintenanceResult({
        status: "failed",
        title: "聊天数据修复失败",
        summary: `范围：workspace-chat。${appError.message}`,
        details: appError.details ? [appError.details] : [],
        action: appError.userAction ?? "请运行数据验证后重试。",
      });
      showToast({
        tone: appError.severity,
        title: "无法修复聊天数据",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsRepairingChatData(false);
    }
  }

  async function handleClearWorkspaceChatData() {
    if (!activeWorkspaceId) {
      return;
    }

    const workspaceLabel = activeWorkspace?.metadata.name ?? activeWorkspaceId;
    const confirmed = window.confirm(
      `清空 ${workspaceLabel} 的所有本地聊天消息？会话、成员和设置会保留。`,
    );

    if (!confirmed) {
      return;
    }

    const typed = window.prompt(
      `输入 ${workspaceLabel} 或 ${activeWorkspaceId} 确认清空所有消息`,
    );
    const confirmation = typed?.trim() ?? "";

    if (confirmation !== workspaceLabel && confirmation !== activeWorkspaceId) {
      if (typed !== null) {
        showToast({
          tone: "warning",
          title: "未清空聊天数据",
          message: "确认内容不匹配，当前工作区消息保持不变。",
        });
      }
      return;
    }

    setIsClearingWorkspaceChatData(true);

    try {
      const result = await conversationsApi.clearWorkspaceData({
        workspaceId: activeWorkspaceId,
      });
      const nextSelectedConversation =
        result.conversations.find(
          (conversation) => conversation.conversationId === selectedConversation?.conversationId,
        ) ??
        result.conversations[0] ??
        null;

      queryClient.setQueryData<ListConversationsResult>(conversationQueryKey, {
        conversations: result.conversations,
      });
      queryClient.setQueriesData<ListMessagesResult>(
        { queryKey: ["chat-messages", activeWorkspaceId] },
        (current) => {
          if (!current) {
            return current;
          }

          const conversation =
            result.conversations.find(
              (item) => item.conversationId === current.conversation.conversationId,
            ) ?? current.conversation;

          return {
            ...current,
            messages: [],
            hasMore: false,
            nextBeforeMessageId: null,
            readPosition: null,
            conversation,
          };
        },
      );
      setSelectedConversationId(nextSelectedConversation?.conversationId ?? null);
      setMessages([]);
      setNextBeforeMessageId(null);
      setHasOlderMessages(false);
      setMessageDispatchStates({});
      lastReadUpdateRef.current = null;
      setChatMaintenanceResult(chatClearResultView(result));
      showToast({
        tone: "info",
        title: "工作区聊天消息已清空",
        message: `已清除 ${result.clearedMessageCount} 条消息、${result.clearedMentionCount} 条提及和 ${result.clearedReadPositionCount} 条已读位置。`,
        action: result.followUpAction,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      setChatMaintenanceResult({
        status: "failed",
        title: "聊天数据清空失败",
        summary: `范围：workspace-chat。${appError.message}`,
        details: appError.details ? [appError.details] : [],
        action: appError.userAction ?? "请运行数据验证后重试。",
      });
      showToast({
        tone: appError.severity,
        title: "无法清空聊天数据",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsClearingWorkspaceChatData(false);
    }
  }

  async function handleDeleteConversation(targetConversation: ConversationProfile | null = selectedConversation) {
    if (!activeWorkspaceId || !targetConversation) {
      return;
    }

    const confirmed = window.confirm(`删除会话 ${targetConversation.title}？`);

    if (!confirmed) {
      return;
    }

    setIsDeletingConversation(true);

    try {
      const result = await conversationsApi.deleteConversation({
        workspaceId: activeWorkspaceId,
        conversationId: targetConversation.conversationId,
      });
      const nextConversation = result.conversations[0] ?? null;

      queryClient.setQueryData<ListConversationsResult>(conversationQueryKey, {
        conversations: result.conversations,
      });
      queryClient.removeQueries({ queryKey: messageQueryKey });
      setSelectedConversationId(nextConversation?.conversationId ?? null);
      setMessages([]);
      setNextBeforeMessageId(null);
      setHasOlderMessages(false);
      showToast({
        tone: "info",
        title: "会话已删除",
        message: `已删除 ${result.deletedConversationId}。`,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法删除会话",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsDeletingConversation(false);
    }
  }

  function updateConversationInCache(conversation: ConversationProfile) {
    queryClient.setQueryData<ListConversationsResult>(conversationQueryKey, (current) => {
      if (!current) {
        return { conversations: [conversation] };
      }

      const exists = current.conversations.some(
        (item) => item.conversationId === conversation.conversationId,
      );
      const conversations = exists
        ? current.conversations.map((item) =>
            item.conversationId === conversation.conversationId ? conversation : item,
          )
        : [conversation, ...current.conversations];

      return { conversations: sortConversationsForDisplay(conversations) };
    });
  }

  async function handleLoadOlderMessages() {
    if (!activeWorkspaceId || !selectedConversation || !nextBeforeMessageId) {
      return;
    }

    setIsLoadingOlderMessages(true);

    try {
      const result = await conversationsApi.listMessages({
        workspaceId: activeWorkspaceId,
        conversationId: selectedConversation.conversationId,
        beforeMessageId: nextBeforeMessageId,
        limit: MESSAGE_PAGE_LIMIT,
      });

      setMessages((current) => mergeMessagePages(result.messages, current));
      setNextBeforeMessageId(result.nextBeforeMessageId);
      setHasOlderMessages(result.hasMore);
      updateConversationInCache(result.conversation);
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法加载更早消息",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsLoadingOlderMessages(false);
    }
  }

  async function handleSendMessage() {
    if (!activeWorkspaceId || !selectedConversation) {
      return;
    }

    const body = messageDraft.trim();
    if (!body) {
      showToast({
        tone: "warning",
        title: "消息为空",
        message: "请输入消息内容后再发送。",
      });
      return;
    }

    if (hasAllMentionToken(body)) {
      showToast({
        tone: "warning",
        title: "@all 暂未启用",
        message: "请选择具体成员提及；群体派发会在后续编排故事中明确实现。",
      });
      return;
    }

    const timestamp = Date.now();
    const pendingMessage: ChatMessageProfile = {
      messageId: `pending-${timestamp}`,
      workspaceId: activeWorkspaceId,
      conversationId: selectedConversation.conversationId,
      authorMemberId: "local",
      body,
      mentionedMemberIds,
      status: "sending",
      createdAtMs: timestamp,
      updatedAtMs: timestamp,
    };

    setMessageDraft("");
    setMentionedMemberIds([]);
    setAttachmentEntries([]);
    setIsSendingMessage(true);
    setMessages((current) => mergeMessagePages(current, [pendingMessage]));

    try {
      const result = await conversationsApi.sendMessage({
        workspaceId: activeWorkspaceId,
        conversationId: selectedConversation.conversationId,
        body,
        mentionedMemberIds,
      });

      setMessages((current) =>
        current.map((message) =>
          message.messageId === pendingMessage.messageId ? result.message : message,
        ),
      );
      updateConversationInCache(result.conversation);
      queryClient.setQueryData<ListMessagesResult>(messageQueryKey, (current) =>
        current
          ? {
              ...current,
              messages: mergeMessagePages(current.messages, [result.message]),
              readPosition: result.readPosition,
              conversation: result.conversation,
            }
          : current,
      );
    } catch (error) {
      const appError = normalizeAppError(error);

      setMessages((current) =>
        current.map((message) =>
          message.messageId === pendingMessage.messageId
            ? { ...message, status: "failed" }
            : message,
        ),
      );
      showToast({
        tone: appError.severity,
        title: "消息发送失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSendingMessage(false);
    }
  }

  async function handleDispatchMessage(message: ChatMessageProfile, selectedMemberId?: string) {
    if (!activeWorkspaceId || !selectedConversation) {
      return;
    }

    const resolution = dispatchResolutionForMessage(message, profiledMembers, selectedConversation);
    const target = selectedMemberId
      ? profiledMembers.find((member) => member.memberId === selectedMemberId) ?? null
      : resolution.target;
    if (!target) {
      if (resolution.candidates.length > 1) {
        setMessageDispatchStates((current) => ({
          ...current,
          [message.messageId]: {
            status: "selecting",
            candidates: resolution.candidates.map((member) => ({
              memberId: member.memberId,
              memberLabel: member.instanceLabel,
            })),
            message: "请选择派发目标。",
            userAction: "多个成员都可以接收这条任务。",
          },
        }));
        return;
      }

      showToast({
        tone: "warning",
        title: "无法派发消息",
        message: "请选择一名可运行终端的成员后再派发。",
      });
      return;
    }

    setMessageDispatchStates((current) => ({
      ...current,
      [message.messageId]: {
        status: "dispatching",
        memberId: target.memberId,
        memberLabel: target.instanceLabel,
      },
    }));

    try {
      const result = await dispatchApi.dispatchChatMessage({
        workspaceId: activeWorkspaceId,
        conversationId: selectedConversation.conversationId,
        messageId: message.messageId,
        memberId: selectedMemberId ?? null,
      });
      const resolvedMember =
        profiledMembers.find(
          (member) => member.memberId === result.dispatch.targetResolution.memberId,
        ) ?? target;

      if (result.dispatch.status === "failed") {
        setMessageDispatchStates((current) => ({
          ...current,
          [message.messageId]: {
            status: "failed",
            dispatchRequestId: result.dispatch.dispatchRequestId,
            memberId: resolvedMember.memberId,
            memberLabel: resolvedMember.instanceLabel,
            message: result.dispatch.failure?.message ?? "派发未能启动。",
            userAction: result.dispatch.failure?.userAction ?? "请修复问题后重试派发。",
          },
        }));
        showToast({
          tone: "error",
          title: "派发失败",
          message: result.dispatch.failure?.message ?? "派发未能启动。",
          action: result.dispatch.failure?.userAction ?? undefined,
        });
        return;
      }

      if (result.dispatch.status === "queued" || result.dispatch.status === "skipped") {
        const isQueued = result.dispatch.status === "queued";
        const dispatchStatus: "queued" | "skipped" = isQueued ? "queued" : "skipped";
        setMessageDispatchStates((current) => ({
          ...current,
          [message.messageId]: {
            status: dispatchStatus,
            dispatchRequestId: result.dispatch.dispatchRequestId,
            memberId: resolvedMember.memberId,
            memberLabel: resolvedMember.instanceLabel,
            message: isQueued
              ? `${resolvedMember.instanceLabel} 正在工作中，任务已加入队列。`
              : `${resolvedMember.instanceLabel} 正在请勿打扰，派发已跳过。`,
            userAction: isQueued ? "成员设为在线后会继续下一条队列任务。" : "成员可用后可重新派发。",
          },
        }));
        showToast({
          tone: isQueued ? "info" : "warning",
          title: isQueued ? "任务已排队" : "派发已跳过",
          message: isQueued
            ? `${resolvedMember.instanceLabel} 正在工作中。`
            : `${resolvedMember.instanceLabel} 正在请勿打扰。`,
        });
        return;
      }

      setMessageDispatchStates((current) => ({
        ...current,
        [message.messageId]: {
          status: "dispatched",
          dispatchRequestId: result.dispatch.dispatchRequestId,
          memberId: resolvedMember.memberId,
          memberLabel: resolvedMember.instanceLabel,
          terminalSessionId: result.dispatch.terminalSessionId,
          message: result.dispatch.targetResolution.reason,
        },
      }));
      showToast({
        tone: "info",
        title: "消息已派发",
        message: `${resolvedMember.instanceLabel} 的终端已收到任务。`,
        action: result.dispatch.terminalSessionId ?? undefined,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      setMessageDispatchStates((current) => ({
        ...current,
        [message.messageId]: {
          status: "failed",
          memberId: target.memberId,
          memberLabel: target.instanceLabel,
          message: appError.message,
          userAction: appError.userAction ?? undefined,
        },
      }));
      showToast({
        tone: appError.severity,
        title: "派发失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    }
  }

  async function handleStartPrivateConversation(
    participantKind: "member" | "contact",
    participantId: string,
  ) {
    if (!activeWorkspace) {
      return;
    }

    setIsStartingConversation(true);

    try {
      const result = await conversationsApi.startPrivateConversation({
        workspaceId: activeWorkspace.metadata.projectId,
        participantKind,
        participantId,
      });

      setMemberActionMenuId(null);
      setLastPrivateConversation(result.conversation);
      setSelectedConversationId(result.conversation.conversationId);
      await conversationQuery.refetch();
      showToast({
        tone: "info",
        title: result.created ? "私聊已创建" : "私聊已复用",
        message: `${result.conversation.title} 的私聊入口已准备好。`,
        action: result.conversation.conversationId,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法打开私聊",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsStartingConversation(false);
    }
  }

  async function handleSaveContact() {
    if (!activeWorkspace) {
      return;
    }

    setIsSavingContact(true);

    try {
      const isEditing = editingContactId !== null;
      const contactUpdate = {
        displayName: contactDisplayName,
        contactKind,
        notes: contactNotes.trim() || null,
        sourceLabel: contactKind === "administrator" ? "管理员/联系人邀请" : "联系人区域",
      };
      let adminMemberCreated = false;
      const result = isEditing
        ? await contactsApi.updateContact({
            contactId: editingContactId,
            ...contactUpdate,
          })
        : await contactsApi
            .createContact({
              ...contactUpdate,
              workspaceId: activeWorkspace.metadata.projectId,
            })
            .then((createResult) => {
              adminMemberCreated = Boolean(createResult.adminMember);
              return createResult;
            });

      setContactDisplayName("");
      setContactKind("contact");
      setContactNotes("");
      setEditingContactId(null);
      await contactQuery.refetch();
      if (adminMemberCreated) {
        await memberQuery.refetch();
      }
      showToast({
        tone: "info",
        title: isEditing ? "联系人已更新" : "联系人已保存",
        message: `${result.contact.displayName} 已保存到全局联系人。`,
        action: adminMemberCreated
          ? "已同时创建本地管理员成员；不包含远程权限。"
          : contactKind === "administrator"
            ? "本地管理员/联系人记录；不包含远程权限。"
            : undefined,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法保存联系人",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSavingContact(false);
    }
  }

  function handleEditContact(contact: ContactProfile) {
    setEditingContactId(contact.contactId);
    setContactDisplayName(contact.displayName);
    setContactKind(contact.contactKind);
    setContactNotes(contact.notes ?? "");
  }

  async function handleDeleteContact(contact: ContactProfile) {
    const confirmed = window.confirm(`删除联系人 ${contact.displayName}？`);

    if (!confirmed) {
      return;
    }

    try {
      await contactsApi.deleteContact({ contactId: contact.contactId });
      await contactQuery.refetch();
      if (editingContactId === contact.contactId) {
        setEditingContactId(null);
        setContactDisplayName("");
        setContactNotes("");
        setContactKind("contact");
      }
      showToast({
        tone: "info",
        title: "联系人已删除",
        message: `${contact.displayName} 已从全局联系人移除。`,
        action: "已有私聊记录不会被静默删除。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法删除联系人",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    }
  }

  async function handleRenameContact(contact: ContactProfile, displayName: string) {
    try {
      const result = await contactsApi.updateContact({
        contactId: contact.contactId,
        displayName,
        contactKind: contact.contactKind,
        notes: contact.notes,
        sourceLabel: contact.sourceLabel,
      });
      queryClient.setQueryData(["contacts"], { contacts: result.contacts });
      showToast({
        tone: "info",
        title: "联系人已更新",
        message: `${result.contact.displayName} 已保存到全局联系人。`,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法更新联系人",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
      throw error;
    }
  }

  async function handleUpdateContactStatus(contact: ContactProfile, status: MemberProfile["status"]) {
    try {
      const result = await contactsApi.updateContact({
        contactId: contact.contactId,
        displayName: contact.displayName,
        contactKind: contact.contactKind,
        status,
        notes: contact.notes,
        sourceLabel: contact.sourceLabel,
      });
      queryClient.setQueryData(["contacts"], { contacts: result.contacts });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法更新联系人状态",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    }
  }

  async function runOpenFlow(openAction: () => Promise<OpenWorkspaceResult | null>) {
    setIsOpening(true);

    try {
      const result = await openAction();

      await applyOpenResult(result);
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "无法打开工作区",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsOpening(false);
    }
  }

  async function applyOpenResult(result: OpenWorkspaceResult | null) {
    if (!result) {
      return;
    }

    if (result.status === "conflict" && result.conflict) {
      conflictTriggerRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setPendingConflict({ conflict: result.conflict });
      return;
    }

    if (!result.workspace) {
      return;
    }

    setOpenedWorkspace(result.workspace);
    onWorkspaceOpened?.(result.workspace);
    await recentQuery.refetch();

    if (result.status === "focusedExisting") {
      showToast({
        tone: "info",
        title: "工作区已打开",
        message: "已切换到现有工作区窗口。",
        action: "没有创建重复主窗口。",
      });
      return;
    }

    clearToast();
  }

  async function handleImportSkill() {
    setIsImportingSkill(true);

    try {
      const result = await localSkillsApi.importLocalFolder();

      if (!result) {
        return;
      }

      queryClient.setQueryData(["skills-library"], { skills: result.skills });
      showToast({
        tone: "info",
        title: result.status === "updatedExisting" ? "技能已更新" : "技能已导入",
        message: result.skill.name,
        action: skillImportStatusAction(result.status),
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "导入技能失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsImportingSkill(false);
    }
  }

  async function handleOpenSkillFolder(skillId: string) {
    setPendingSkillOpenId(skillId);

    try {
      const result = await localSkillsApi.openSkillFolder(skillId);

      showToast({
        tone: "info",
        title: "技能文件夹已打开",
        message: result.path,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "打开技能文件夹失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setPendingSkillOpenId(null);
    }
  }

  async function handleDeleteSkill(skillId: string) {
    const confirmed = window.confirm("从技能库删除该技能？源文件夹不会被删除。");

    if (!confirmed) {
      return;
    }

    setPendingSkillDeleteId(skillId);

    try {
      const result = await localSkillsApi.deleteSkill(skillId, activeWorkspaceRoot);

      queryClient.setQueryData(["skills-library"], { skills: result.skills });
      queryClient.setQueryData(workspaceSkillLinksQueryKey, { skills: result.workspaceSkills });
      showToast({
        tone: "info",
        title: "技能已从库中移除",
        message: "源文件夹没有被删除。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "删除技能失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setPendingSkillDeleteId(null);
    }
  }

  async function handleLinkWorkspaceSkill(skillId: string) {
    if (!activeWorkspaceRoot) {
      return;
    }

    setPendingSkillLinkId(skillId);

    try {
      const result = await localSkillsApi.linkWorkspaceSkill(activeWorkspaceRoot, skillId);

      queryClient.setQueryData(workspaceSkillLinksQueryKey, { skills: result.skills });
      showToast({
        tone: "info",
        title: result.status === "updatedExisting" ? "工作区技能已更新" : "工作区技能已关联",
        message: result.skill.name,
        action: workspaceSkillLinkModeAction(result.skill),
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "关联技能失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setPendingSkillLinkId(null);
    }
  }

  async function handleUnlinkWorkspaceSkill(skillId: string) {
    if (!activeWorkspaceRoot) {
      return;
    }

    setPendingSkillUnlinkId(skillId);

    try {
      const result = await localSkillsApi.unlinkWorkspaceSkill(activeWorkspaceRoot, skillId);

      queryClient.setQueryData(workspaceSkillLinksQueryKey, { skills: result.skills });
      showToast({
        tone: "info",
        title: "工作区技能已取消关联",
        message: "技能仍保留在我的技能库中。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "取消关联失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setPendingSkillUnlinkId(null);
    }
  }

  function handleUnavailableCapability(title: string, status: CapabilityStatus) {
    const meta = capabilityStatusMeta(status);

    showToast({
      tone: "warning",
      title: `${title}暂未启用`,
      message: meta.description,
      action: `该能力已标记为${meta.label}，不会作为已完成 MVP 功能处理。`,
    });
  }

  async function handleCreateRoadmapTask() {
    if (!activeWorkspaceRoot) {
      return;
    }

    setIsCreatingRoadmapTask(true);

    try {
      const result = await localRoadmapApi.createTask(activeWorkspaceRoot, {
        title: "新任务",
        detail: null,
        status: "pending",
      });

      queryClient.setQueryData(roadmapTasksQueryKey, { tasks: result.tasks });
      setFocusedRoadmapTaskId(result.task.taskId);
      setIsRoadmapOpen(true);
      showToast({
        tone: "info",
        title: "路线图任务已创建",
        message: result.task.title,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "创建路线图任务失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsCreatingRoadmapTask(false);
    }
  }

  async function handleUpdateRoadmapTask(taskId: string, input: UpdateRoadmapTaskInput) {
    if (!activeWorkspaceRoot) {
      return;
    }

    setPendingRoadmapUpdateId(taskId);

    try {
      const result = await localRoadmapApi.updateTask(activeWorkspaceRoot, taskId, input);

      queryClient.setQueryData(roadmapTasksQueryKey, { tasks: result.tasks });
      setAttachmentEntries((current) =>
        current.map((entry) =>
          entry.kind === "roadmap" && entry.taskId === result.task.taskId
            ? { ...entry, title: result.task.title }
            : entry,
        ),
      );
      showToast({
        tone: "info",
        title: "路线图任务已保存",
        message: result.task.title,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "保存路线图任务失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setPendingRoadmapUpdateId(null);
    }
  }

  async function handleDeleteRoadmapTask(taskId: string) {
    if (!activeWorkspaceRoot) {
      return;
    }

    const confirmed = window.confirm("删除这个路线图任务？");

    if (!confirmed) {
      return;
    }

    setPendingRoadmapDeleteId(taskId);

    try {
      const result = await localRoadmapApi.deleteTask(activeWorkspaceRoot, taskId);

      queryClient.setQueryData(roadmapTasksQueryKey, { tasks: result.tasks });
      queryClient.setQueryData<{ goals: RoadmapGoalEntry[] }>(roadmapGoalsQueryKey, (current) => ({
        goals:
          current?.goals.map((goal) => ({
            ...goal,
            taskIds: goal.taskIds.filter((relatedTaskId) => relatedTaskId !== taskId),
          })) ?? [],
      }));
      setAttachmentEntries((current) =>
        current.filter((entry) => entry.kind !== "roadmap" || entry.taskId !== taskId),
      );
      if (focusedRoadmapTaskId === taskId) {
        setFocusedRoadmapTaskId(null);
      }
      showToast({
        tone: "info",
        title: "路线图任务已删除",
        message: "聊天里的对应引用也已移除。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "删除路线图任务失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setPendingRoadmapDeleteId(null);
    }
  }

  async function handleCreateRoadmapGoal() {
    if (!activeWorkspaceRoot) {
      return;
    }

    setIsCreatingRoadmapGoal(true);

    try {
      const result = await localRoadmapApi.createGoal(activeWorkspaceRoot, {
        title: "新目标",
        taskIds: [],
      });

      queryClient.setQueryData(roadmapGoalsQueryKey, { goals: result.goals });
      showToast({
        tone: "info",
        title: "路线图目标已创建",
        message: result.goal.title,
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "创建路线图目标失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsCreatingRoadmapGoal(false);
    }
  }

  async function handleUpdateRoadmapGoal(
    goalId: string,
    input: UpdateRoadmapGoalInput,
  ): Promise<RoadmapGoalEntry | null> {
    if (!activeWorkspaceRoot) {
      return null;
    }

    setPendingRoadmapGoalUpdateId(goalId);

    try {
      const result = await localRoadmapApi.updateGoal(activeWorkspaceRoot, goalId, input);

      queryClient.setQueryData(roadmapGoalsQueryKey, { goals: result.goals });
      showToast({
        tone: "info",
        title: "路线图目标已保存",
        message: result.goal.title,
      });

      return result.goal;
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "保存路线图目标失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });

      return null;
    } finally {
      setPendingRoadmapGoalUpdateId(null);
    }
  }

  async function handleDeleteRoadmapGoal(goalId: string) {
    if (!activeWorkspaceRoot) {
      return;
    }

    const confirmed = window.confirm("删除这个路线图目标？");

    if (!confirmed) {
      return;
    }

    setPendingRoadmapGoalDeleteId(goalId);

    try {
      const result = await localRoadmapApi.deleteGoal(activeWorkspaceRoot, goalId);

      queryClient.setQueryData(roadmapGoalsQueryKey, { goals: result.goals });
      showToast({
        tone: "info",
        title: "路线图目标已删除",
        message: "相关任务不会被删除。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "删除路线图目标失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setPendingRoadmapGoalDeleteId(null);
    }
  }

  function openProfileSettings() {
    setProfileSettingsDraft(profileSnapshotToDraft(profileSettings));
    setProfileSettingsFieldError(null);
    setNotificationPreferencesDraft(notificationPreferencesToDraft(notificationPreferences));
    setNotificationPreferencesError(null);
    setShortcutPreferencesDraft(shortcutPreferencesToDraft(shortcutPreferences));
    setShortcutPreferencesError(null);
    setChatTerminalOutputPreferencesDraft(
      chatTerminalOutputPreferencesToDraft(chatTerminalOutputPreferences),
    );
    setChatTerminalOutputPreferencesError(null);
    setTerminalConfigurationDraft(terminalConfigurationToDraft(terminalConfiguration));
    setTerminalConfigurationError(null);
    setIsProfileSettingsOpen(true);
  }

  async function handleSaveProfileSettings() {
    setIsSavingProfileSettings(true);
    setProfileSettingsFieldError(null);

    try {
      const result = await profileSettingsApi.updateProfileSettings(profileSettingsDraft);

      queryClient.setQueryData(["profile-settings"], { profile: result.profile });
      setProfileSettingsDraft(profileSnapshotToDraft(result.profile));
      setIsProfileSettingsOpen(false);
      showToast({
        tone: "info",
        title: "个人资料已保存",
        message: `${result.profile.displayName} · ${memberStatusLabel(result.profile.status)}`,
      });
    } catch (error) {
      const appError = normalizeAppError(error);
      const field = profileSettingsFieldFromError(appError);

      if (field) {
        setProfileSettingsFieldError({ field, message: appError.message });
      }

      showToast({
        tone: appError.severity,
        title: "个人资料保存失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSavingProfileSettings(false);
    }
  }

  async function handleSaveNotificationPreferences() {
    setIsSavingNotificationPreferences(true);
    setNotificationPreferencesError(null);

    const dndStartMinutes = timeInputToMinutes(notificationPreferencesDraft.dndStartTime);
    const dndEndMinutes = timeInputToMinutes(notificationPreferencesDraft.dndEndTime);

    if (dndStartMinutes === null || dndEndMinutes === null) {
      setNotificationPreferencesError("请输入有效的静默时段。");
      setIsSavingNotificationPreferences(false);
      return;
    }

    try {
      const result = await notificationsApi.updateNotificationPreferences({
        desktopNotificationsEnabled: notificationPreferencesDraft.desktopNotificationsEnabled,
        soundEnabled: notificationPreferencesDraft.soundEnabled,
        mentionsOnly: notificationPreferencesDraft.mentionsOnly,
        messagePreviewEnabled: notificationPreferencesDraft.messagePreviewEnabled,
        dndEnabled: notificationPreferencesDraft.dndEnabled,
        dndStartMinutes,
        dndEndMinutes,
      });

      queryClient.setQueryData(["notification-preferences"], {
        preferences: result.preferences,
      });
      setNotificationPreferencesDraft(notificationPreferencesToDraft(result.preferences));
      showToast({
        tone: "info",
        title: "通知设置已保存",
        message: result.preferences.dndEnabled ? "静默时段已生效。" : "通知偏好已应用。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      setNotificationPreferencesError(appError.message);
      showToast({
        tone: appError.severity,
        title: "通知设置保存失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSavingNotificationPreferences(false);
    }
  }

  async function handleSaveShortcutPreferences() {
    setIsSavingShortcutPreferences(true);
    setShortcutPreferencesError(null);

    try {
      const result = await profileSettingsApi.updateShortcutPreferences({
        profile: shortcutPreferencesDraft.profile,
        shortcutsEnabled: shortcutPreferencesDraft.shortcutsEnabled,
        shortcutHintsEnabled: shortcutPreferencesDraft.shortcutHintsEnabled,
        disabledActionIds: shortcutPreferencesDraft.disabledActionIds,
      });

      queryClient.setQueryData(["shortcut-preferences"], {
        preferences: result.preferences,
      });
      setShortcutPreferencesDraft(shortcutPreferencesToDraft(result.preferences));
      showToast({
        tone: "info",
        title: "快捷键设置已保存",
        message: result.preferences.shortcutsEnabled ? "快捷键偏好已生效。" : "快捷键已停用。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      setShortcutPreferencesError(appError.message);
      showToast({
        tone: appError.severity,
        title: "快捷键设置保存失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSavingShortcutPreferences(false);
    }
  }

  async function handleResetShortcutPreferences() {
    setIsSavingShortcutPreferences(true);
    setShortcutPreferencesError(null);

    try {
      const result = await profileSettingsApi.resetShortcutPreferences({
        profile: shortcutPreferencesDraft.profile,
      });

      queryClient.setQueryData(["shortcut-preferences"], {
        preferences: result.preferences,
      });
      setShortcutPreferencesDraft(shortcutPreferencesToDraft(result.preferences));
      showToast({
        tone: "info",
        title: "快捷键已恢复默认",
        message: "当前键位方案的默认绑定已恢复。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      setShortcutPreferencesError(appError.message);
      showToast({
        tone: appError.severity,
        title: "快捷键恢复失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSavingShortcutPreferences(false);
    }
  }

  async function handleSaveChatTerminalOutputPreferences() {
    setIsSavingChatTerminalOutputPreferences(true);
    setChatTerminalOutputPreferencesError(null);

    try {
      const result = await profileSettingsApi.updateChatTerminalOutputPreferences({
        displayMode: chatTerminalOutputPreferencesDraft.displayMode,
      });

      queryClient.setQueryData(["chat-terminal-output-preferences"], {
        preferences: result.preferences,
      });
      setChatTerminalOutputPreferencesDraft(
        chatTerminalOutputPreferencesToDraft(result.preferences),
      );
      showToast({
        tone: "info",
        title: "聊天输出设置已保存",
        message:
          result.preferences.displayMode === "stream"
            ? "新的终端输出会实时显示在聊天中。"
            : "新的终端输出会在终端退出后显示最终结果。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      setChatTerminalOutputPreferencesError(appError.message);
      showToast({
        tone: appError.severity,
        title: "聊天输出设置保存失败",
        message: appError.message,
        action: appError.userAction ?? "之前保存的聊天输出偏好仍在生效。",
      });
    } finally {
      setIsSavingChatTerminalOutputPreferences(false);
    }
  }

  async function handleSaveTerminalConfiguration() {
    setIsSavingTerminalConfiguration(true);
    setTerminalConfigurationError(null);

    try {
      const result = await profileSettingsApi.updateTerminalConfiguration({
        builtInCliEntries: terminalConfigurationDraft.builtInCliEntries.map((entry) => ({
          ...entry,
        })),
        customCliEntries: terminalConfigurationDraft.customCliEntries.map((entry) => ({
          ...entry,
        })),
        customTerminalEntries: terminalConfigurationDraft.customTerminalEntries.map((entry) => ({
          ...entry,
        })),
        defaultTerminalId: terminalConfigurationDraft.defaultTerminalId,
      });

      queryClient.setQueryData(["terminal-configuration"], {
        configuration: result.configuration,
      });
      setTerminalConfigurationDraft(terminalConfigurationToDraft(result.configuration));
      showToast({
        tone: "info",
        title: "CLI 与终端设置已保存",
        message: "成员运行时和工作区终端会使用新的本地配置。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      setTerminalConfigurationError(appError.message);
      showToast({
        tone: appError.severity,
        title: "CLI 与终端设置保存失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSavingTerminalConfiguration(false);
    }
  }

  async function handleResetTerminalConfiguration() {
    setIsSavingTerminalConfiguration(true);
    setTerminalConfigurationError(null);

    try {
      const result = await profileSettingsApi.resetTerminalConfiguration();

      queryClient.setQueryData(["terminal-configuration"], {
        configuration: result.configuration,
      });
      setTerminalConfigurationDraft(terminalConfigurationToDraft(result.configuration));
      showToast({
        tone: "info",
        title: "CLI 与终端已恢复默认",
        message: "自定义 CLI 与默认终端选择已清空。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      setTerminalConfigurationError(appError.message);
      showToast({
        tone: appError.severity,
        title: "CLI 与终端恢复失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setIsSavingTerminalConfiguration(false);
    }
  }

  function applyProfileSettingsResult(profile: ProfileSettingsSnapshot) {
    queryClient.setQueryData(["profile-settings"], { profile });
    setProfileSettingsDraft(profileSnapshotToDraft(profile));
  }

  async function handleUploadProfileAvatar() {
    setPendingProfileAvatarAction("upload");

    try {
      const sourcePath = await profileSettingsApi.selectAvatarImage();

      if (!sourcePath) {
        return;
      }

      const result = await profileSettingsApi.uploadProfileAvatar(sourcePath);
      applyProfileSettingsResult(result.profile);
      showToast({
        tone: "info",
        title: "头像已上传",
        message: result.profile.avatar?.sourceFileName ?? "上传头像已保存。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "头像上传失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setPendingProfileAvatarAction(null);
    }
  }

  async function handleSelectProfileAvatarPreset(presetId: string) {
    setPendingProfileAvatarAction("preset");

    try {
      const result = await profileSettingsApi.selectProfileAvatarPreset(presetId);
      applyProfileSettingsResult(result.profile);
      showToast({
        tone: "info",
        title: "头像预设已保存",
        message: profileAvatarLabel(result.profile.avatar),
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "头像预设保存失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setPendingProfileAvatarAction(null);
    }
  }

  async function handleResetProfileAvatar() {
    setPendingProfileAvatarAction("reset");

    try {
      const result = await profileSettingsApi.resetProfileAvatar();
      applyProfileSettingsResult(result.profile);
      showToast({
        tone: "info",
        title: "头像已恢复默认",
        message: "当前资料将使用生成的占位头像。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "头像恢复失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setPendingProfileAvatarAction(null);
    }
  }

  async function handleDeleteUploadedProfileAvatar() {
    setPendingProfileAvatarAction("delete");

    try {
      const result = await profileSettingsApi.deleteUploadedProfileAvatar();
      applyProfileSettingsResult(result.profile);
      showToast({
        tone: "info",
        title: "上传头像已删除",
        message: "当前资料已回到默认头像。",
      });
    } catch (error) {
      const appError = normalizeAppError(error);

      showToast({
        tone: appError.severity,
        title: "头像删除失败",
        message: appError.message,
        action: appError.userAction ?? undefined,
      });
    } finally {
      setPendingProfileAvatarAction(null);
    }
  }

  if (!activeWorkspace) {
    return (
      <WorkspaceSelectionLanding
        text={text}
        language={language}
        isOpening={isOpening}
        isLoading={isLoading}
        recentPrimaryWorkspaces={recentPrimaryWorkspaces}
        recentMoreWorkspaces={recentMoreWorkspaces}
        filteredMoreWorkspaces={filteredMoreWorkspaces}
        recentSearch={recentSearch}
        windowContext={windowContext}
        integrityReport={integrityReport}
        isValidatingIntegrity={isValidatingIntegrity}
        isSyncActionPending={isSyncActionPending}
        showCompatibilityControls={showCompatibilityControls}
        statusRecentWorkspaceCount={status?.recentWorkspaceCount ?? 0}
        pendingConflict={pendingConflict}
        conflictPrimaryButtonRef={conflictPrimaryButtonRef}
        toast={renderLocalToast ? toast : null}
        onOpenWorkspace={handleOpenWorkspace}
        onOpenRecent={handleOpenRecent}
        onRecentSearchChange={setRecentSearch}
        onRefreshRecent={() => void recentQuery.refetch()}
        onThemeChange={(theme) => void handlePreferenceChange({ theme })}
        onLanguageChange={(language) => void handlePreferenceChange({ language })}
        onOpenWindowMode={(mode) => void handleOpenWindowMode(mode)}
        onValidateIntegrity={() => void handleValidateDataIntegrity()}
        onResolveConflict={handleResolveConflict}
        onCancelConflict={handleCancelConflict}
        onClearToast={clearToast}
      />
    );
  }

  if (parityWorkbench) {
    const renderParitySurface = (surface: ReactNode) => (
      <>
        {surface}
        {renderLocalToast && toast ? <Toast toast={toast} onClose={clearToast} /> : null}
      </>
    );

    if (parityView === "friends") {
      return renderParitySurface(
        <FriendsMembersParity
          language={language}
          members={profiledMembers}
          contacts={contacts}
          terminalActivity={memberTerminalActivity}
          isLoading={memberQuery.isLoading}
          isInviting={isInvitingMember}
          runtimeKind={runtimeKind}
          builtinRuntimeId={builtinRuntimeId}
          customRuntimeCliId={customRuntimeCliId}
          customRuntimeCommand={customRuntimeCommand}
          builtInRuntimeOptions={builtInRuntimeOptions}
          customCliRuntimeOptions={customCliRuntimeOptions}
          instanceCount={inviteInstanceCount}
          sandboxed={inviteSandboxed}
          unlimitedAccess={inviteUnlimitedAccess}
          onInviteTypeChange={setInviteType}
          onDisplayNameChange={setInviteDisplayName}
          onRuntimeKindChange={setRuntimeKind}
          onBuiltinRuntimeChange={setBuiltinRuntimeId}
          onCustomRuntimeCliChange={setCustomRuntimeCliId}
          onCustomRuntimeCommandChange={setCustomRuntimeCommand}
          onInstanceCountChange={setInviteInstanceCount}
          onSandboxedChange={setInviteSandboxed}
          onUnlimitedAccessChange={setInviteUnlimitedAccess}
          onStartPrivateConversation={(member) =>
            void handleStartPrivateConversation("member", member.memberId)
          }
          onOpenMemberTerminal={(member) => void handleOpenMemberTerminal(member)}
          onRenameMember={handleUpdateMemberProfile}
          onRenameContact={handleRenameContact}
          onUpdateContactStatus={handleUpdateContactStatus}
          onStartContactConversation={(contact) =>
            void handleStartPrivateConversation("contact", contact.contactId)
          }
          onRemoveContact={(contact) => void handleDeleteContact(contact)}
          onUpdateMemberStatus={(member, status) =>
            void handleUpdateMemberStatus(member, status)
          }
          onRemoveMember={(member) => void handleRemoveMember(member)}
          onInvite={() => void handleInviteMember()}
          onUnavailable={(capability) => handleUnavailableCapability(capability, "placeholder")}
        />,
      );
    }

    if (parityView === "settings") {
      return renderParitySurface(
        <SettingsParity
          profileDraft={profileSettingsDraft}
          savedProfile={profileSettings}
          notificationDraft={notificationPreferencesDraft}
          savedNotificationPreferences={notificationPreferences}
          shortcutDraft={shortcutPreferencesDraft}
          savedShortcutPreferences={shortcutPreferences}
          chatTerminalOutputDraft={chatTerminalOutputPreferencesDraft}
          savedChatTerminalOutputPreferences={chatTerminalOutputPreferences}
          terminalDraft={terminalConfigurationDraft}
          savedTerminalConfiguration={terminalConfiguration}
          activeWorkspaceId={activeWorkspaceId}
          activeWorkspaceName={activeWorkspace.metadata.name}
          chatMaintenanceResult={chatMaintenanceResult}
          fieldError={profileSettingsFieldError}
          notificationError={notificationPreferencesError}
          shortcutError={shortcutPreferencesError}
          chatTerminalOutputError={chatTerminalOutputPreferencesError}
          terminalError={terminalConfigurationError}
          isLoading={profileSettingsQuery.isLoading}
          isSaving={isSavingProfileSettings}
          isNotificationLoading={notificationPreferencesQuery.isLoading}
          isNotificationSaving={isSavingNotificationPreferences}
          isShortcutLoading={shortcutPreferencesQuery.isLoading}
          isShortcutSaving={isSavingShortcutPreferences}
          isChatTerminalOutputLoading={chatTerminalOutputPreferencesQuery.isLoading}
          isChatTerminalOutputSaving={isSavingChatTerminalOutputPreferences}
          isRepairingChatData={isRepairingChatData}
          isClearingWorkspaceChatData={isClearingWorkspaceChatData}
          isTerminalLoading={terminalConfigurationQuery.isLoading}
          isTerminalSaving={isSavingTerminalConfiguration}
          pendingAvatarAction={pendingProfileAvatarAction}
          theme={windowContext?.preferences.theme ?? "system"}
          language={language}
          onDraftChange={setProfileSettingsDraft}
          onNotificationDraftChange={setNotificationPreferencesDraft}
          onShortcutDraftChange={setShortcutPreferencesDraft}
          onChatTerminalOutputDraftChange={setChatTerminalOutputPreferencesDraft}
          onTerminalDraftChange={setTerminalConfigurationDraft}
          onUploadAvatar={() => void handleUploadProfileAvatar()}
          onSelectAvatarPreset={(presetId) => void handleSelectProfileAvatarPreset(presetId)}
          onResetAvatar={() => void handleResetProfileAvatar()}
          onDeleteUploadedAvatar={() => void handleDeleteUploadedProfileAvatar()}
          onSave={() => void handleSaveProfileSettings()}
          onSaveNotifications={() => void handleSaveNotificationPreferences()}
          onSaveShortcuts={() => void handleSaveShortcutPreferences()}
          onResetShortcuts={() => void handleResetShortcutPreferences()}
          onSaveChatTerminalOutput={() => void handleSaveChatTerminalOutputPreferences()}
          onRepairChatData={() => void handleRepairWorkspaceChatData()}
          onClearWorkspaceChatData={() => void handleClearWorkspaceChatData()}
          onSaveTerminalConfiguration={() => void handleSaveTerminalConfiguration()}
          onResetTerminalConfiguration={() => void handleResetTerminalConfiguration()}
          onTestTerminal={() => void handleOpenWorkspaceTerminal()}
          onThemeChange={(theme) => void handlePreferenceChange({ theme })}
          onLanguageChange={(language) => void handlePreferenceChange({ language })}
        />,
      );
    }

    if (parityView === "store") {
      return renderParitySurface(
        <SkillStoreParity
          language={language}
          skills={skills}
          linkedSkillIds={linkedSkillIds}
          isLoading={skillQuery.isLoading}
          isLoadingLinks={workspaceSkillLinksQuery.isLoading}
          isImporting={isImportingSkill}
          pendingOpenId={pendingSkillOpenId}
          pendingDeleteId={pendingSkillDeleteId}
          pendingLinkId={pendingSkillLinkId}
          pendingUnlinkId={pendingSkillUnlinkId}
          onImport={() => void handleImportSkill()}
          onOpen={(skillId) => void handleOpenSkillFolder(skillId)}
          onDelete={(skillId) => void handleDeleteSkill(skillId)}
          onLink={(skillId) => void handleLinkWorkspaceSkill(skillId)}
          onUnlink={(skillId) => void handleUnlinkWorkspaceSkill(skillId)}
        />,
      );
    }

    if (parityView === "plugins") {
      return renderParitySurface(
        <PluginMarketplaceParity
          language={language}
          onUnavailableCapability={handleUnavailableCapability}
        />,
      );
    }

    if (parityView !== "chat") {
      return renderParitySurface(<ParityTabPlaceholder tab={parityView} />);
    }

    return renderParitySurface(
      <ChatWorkbenchParity
        language={language}
        activeWorkspace={activeWorkspace}
        conversations={visibleConversations}
        selectedConversation={selectedConversation}
        messages={messages}
        members={profiledMembers}
        messageDraft={messageDraft}
        mentionedMemberIds={mentionedMemberIds}
        attachmentEntries={attachmentEntries}
        roadmapTasks={roadmapTasks}
        isRoadmapAttachmentPickerOpen={isRoadmapAttachmentPickerOpen}
        isLoadingConversations={conversationQuery.isLoading}
        isLoadingMessages={messageQuery.isLoading}
        isLoadingOlderMessages={isLoadingOlderMessages}
        hasOlderMessages={hasOlderMessages}
        isSendingMessage={isSendingMessage}
        isUpdatingSettings={isUpdatingConversationSettings}
        isClearingConversation={isClearingConversation}
        isDeletingConversation={isDeletingConversation}
        renameDraft={renameDraft}
        inviteRuntimeKind={runtimeKind}
        inviteBuiltinRuntimeId={builtinRuntimeId}
        inviteCustomRuntimeCliId={customRuntimeCliId}
        inviteCustomRuntimeCommand={customRuntimeCommand}
        builtInRuntimeOptions={builtInRuntimeOptions}
        customCliRuntimeOptions={customCliRuntimeOptions}
        inviteInstanceCount={inviteInstanceCount}
        inviteSandboxed={inviteSandboxed}
        inviteUnlimitedAccess={inviteUnlimitedAccess}
        isInviting={isInvitingMember}
        onSelectConversation={setSelectedConversationId}
        onMessageDraftChange={handleMessageDraftChange}
        onAddMention={addMentionMember}
        onRemoveMention={removeMentionMember}
        onAddImageAttachment={addImageAttachmentEntry}
        onOpenRoadmapAttachmentPicker={openRoadmapAttachmentPicker}
        onSelectRoadmapAttachment={addRoadmapAttachmentEntry}
        onOpenRoadmapReference={openRoadmapReference}
        onRemoveAttachmentEntry={removeAttachmentEntry}
        onSendMessage={() => void handleSendMessage()}
        onLoadOlderMessages={() => void handleLoadOlderMessages()}
        onTogglePinned={(conversation) =>
          void handleUpdateConversationSettings({ isPinned: !conversation.isPinned }, conversation)
        }
        onToggleMuted={(conversation) =>
          void handleUpdateConversationSettings({ isMuted: !conversation.isMuted }, conversation)
        }
        onRenameDraftChange={setRenameDraft}
        onRenameConversation={() => void handleRenameConversation()}
        onClearConversation={(conversation) => void handleClearConversation(conversation)}
        onDeleteConversation={(conversation) => void handleDeleteConversation(conversation)}
        onOpenRoadmap={() => {
          setFocusedRoadmapTaskId(null);
          setIsRoadmapOpen(true);
        }}
        onOpenSkills={() => handleUnavailableCapability("技能管理", "placeholder")}
        onOpenMembers={() => undefined}
        onInviteTypeChange={setInviteType}
        onInviteDisplayNameChange={setInviteDisplayName}
        onInviteRuntimeKindChange={setRuntimeKind}
        onInviteBuiltinRuntimeChange={setBuiltinRuntimeId}
        onInviteCustomRuntimeCliChange={setCustomRuntimeCliId}
        onInviteCustomRuntimeCommandChange={setCustomRuntimeCommand}
        onInviteInstanceCountChange={setInviteInstanceCount}
        onInviteSandboxedChange={setInviteSandboxed}
        onInviteUnlimitedAccessChange={setInviteUnlimitedAccess}
        onInviteMember={() => void handleInviteMember()}
        onStartPrivateConversation={(member) =>
          void handleStartPrivateConversation("member", member.memberId)
        }
        onOpenMemberTerminal={(member) => void handleOpenMemberTerminal(member)}
        onMentionMember={handleMentionMember}
        onRenameMember={handleUpdateMemberProfile}
        onUpdateMemberStatus={(member, status) => void handleUpdateMemberStatus(member, status)}
        onRemoveMember={(member) => void handleRemoveMember(member)}
        onUnavailable={(capability) => handleUnavailableCapability(capability, "placeholder")}
      />,
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f7f2] text-[#17211b]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5">
        <header className="flex h-12 items-center justify-between border-b border-[#dbe4d7]">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-normal">orchlet</h1>
            <span className="text-xs font-medium text-[#637064]">
              {isLoading ? text.loadingEntry : modeLabel}
            </span>
            {activeWorkspace ? (
              <span
                aria-label={text.unreadCountLabel}
                className={
                  workspaceUnreadCount > 0
                    ? "rounded-full border border-[#b9d0b2] bg-[#eef6ea] px-2 py-0.5 text-xs font-semibold text-[#2f5038]"
                    : "rounded-full border border-[#d8e2d4] bg-white px-2 py-0.5 text-xs font-medium text-[#6a786c]"
                }
              >
                {text.unread} {unreadBadgeLabel(workspaceUnreadCount)}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              icon={RefreshCw}
              label={text.refreshRecentWorkspaces}
              tooltip={text.refreshRecentWorkspaces}
              onClick={() => void recentQuery.refetch()}
            />
            <IconButton
              icon={Settings}
              label={text.openSettings}
              tooltip={text.openSettings}
              onClick={openProfileSettings}
            />
          </div>
        </header>

        <section className="grid flex-1 place-items-center py-10">
          <div className="w-full max-w-[720px]">
            <button
              type="button"
              aria-label={text.openFolder}
              disabled={isOpening}
              onClick={handleOpenWorkspace}
              className="group flex min-h-[168px] w-full items-center gap-5 rounded-lg border border-[#ccd9c8] bg-white p-6 text-left shadow-sm transition hover:border-[#8fad87] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
            >
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#e7f1e2] text-[#2f6f55]">
                <FolderOpen aria-hidden="true" size={30} strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-semibold tracking-normal text-[#17211b]">
                  {isOpening ? text.openingFolder : text.openFolder}
                </span>
                <span className="mt-2 block text-base text-[#5e6d61]">
                  {text.openFolderSubtitle}
                </span>
              </span>
            </button>

            {windowContext && onPreferencesChange && onOpenWindowMode ? (
              <WindowContextControls
                snapshot={windowContext}
                language={language}
                disabled={isSyncActionPending}
                onThemeChange={(theme) => void handlePreferenceChange({ theme })}
                onLanguageChange={(language) => void handlePreferenceChange({ language })}
                onOpenWindowMode={(mode) => void handleOpenWindowMode(mode)}
              />
            ) : null}

            {windowContext ? (
              <DataIntegrityPanel
                report={integrityReport}
                disabled={isValidatingIntegrity}
                onValidate={() => void handleValidateDataIntegrity()}
              />
            ) : null}

            {activeWorkspace ? (
              <DiagnosticsPanel
                overview={diagnosticsOverview}
                exportResult={diagnosticsExportResult}
                isLoading={isLoadingDiagnostics}
                isExporting={isExportingDiagnostics}
                onRefresh={() => void handleRefreshDiagnostics()}
                onExport={() => void handleGenerateDiagnosticsExport(null)}
                onExportNext={(cursor) => void handleGenerateDiagnosticsExport(cursor)}
                onClearExport={handleClearDiagnosticsExport}
              />
            ) : null}

            {activeWorkspace ? (
              <section
                aria-labelledby="opened-workspace-title"
                className="mt-6 rounded-lg border border-[#b7cfb0] bg-[#f8fbf6] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 id="opened-workspace-title" className="text-sm font-semibold">
                      工作区已打开
                    </h2>
                    <p className="mt-2 truncate text-xl font-semibold text-[#17211b]">
                      {activeWorkspace.metadata.name}
                    </p>
                    <p
                      className="mt-1 truncate text-sm text-[#61705f]"
                      title={activeWorkspace.rootPath}
                    >
                      {activeWorkspace.rootPath}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <span className="rounded-md border border-[#cfe0c9] bg-white px-2.5 py-1 text-xs font-medium text-[#37533e]">
                      Schema v{activeWorkspace.metadata.schemaVersion}
                    </span>
                    <span
                      className={
                        activeWorkspace.accessMode === "readOnly"
                          ? "rounded-md border border-[#e0c37b] bg-[#fff8e6] px-2.5 py-1 text-xs font-medium text-[#765400]"
                          : "rounded-md border border-[#cfe0c9] bg-white px-2.5 py-1 text-xs font-medium text-[#37533e]"
                      }
                    >
                      {activeWorkspace.accessMode === "readOnly" ? "只读模式" : "可写模式"}
                    </span>
                    <button
                      type="button"
                      onClick={openProfileSettings}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 py-1 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
                    >
                      <Settings aria-hidden="true" size={14} strokeWidth={2} />
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFocusedRoadmapTaskId(null);
                        setIsRoadmapOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 py-1 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
                    >
                      <ListTodo aria-hidden="true" size={14} strokeWidth={2} />
                      Roadmap
                    </button>
                    <button
                      type="button"
                      disabled={isSyncActionPending}
                      onClick={() => void handleOpenWorkspaceTerminal()}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 py-1 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
                    >
                      <SquareTerminal aria-hidden="true" size={14} strokeWidth={2} />
                      打开终端
                    </button>
                    <button
                      type="button"
                      disabled={isOpeningFileManager}
                      onClick={handleOpenInFileManager}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 py-1 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
                    >
                      <FolderOpen aria-hidden="true" size={14} strokeWidth={2} />
                      打开文件管理器
                    </button>
                  </div>
                </div>
                {activeWorkspace.accessMode === "readOnly" && activeWorkspace.fallbackState ? (
                  <div className="mt-4 rounded-md border border-[#e0c37b] bg-[#fffaf0] p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#fff1cf] text-[#8a5c00]">
                        <AlertTriangle aria-hidden="true" size={18} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold text-[#5f4300]">工作区本地数据只读</p>
                        <p className="mt-1 text-[#6a5524]">
                          {activeWorkspace.fallbackState.reason}
                        </p>
                        <p className="mt-2 text-[#6a5524]">
                          受限操作：{activeWorkspace.fallbackState.limitedActions.join("、")}。
                        </p>
                        <p className="mt-2 break-all text-xs text-[#806a34]">
                          fallback 状态：{activeWorkspace.fallbackState.fallbackPath}
                        </p>
                        <p className="mt-2 text-[#6a5524]">
                          {activeWorkspace.fallbackState.userAction}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-[#6a786c]">Project ID</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-[#253129]">
                      {activeWorkspace.metadata.projectId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-[#6a786c]">Updated</dt>
                    <dd className="mt-1 text-xs text-[#253129]">
                      {new Date(activeWorkspace.metadata.updatedAtMs).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </section>
            ) : null}

            {activeWorkspace ? (
              <ConversationPanel
                conversations={visibleConversations}
                selectedConversation={selectedConversation}
                messages={messages}
                dispatchStates={messageDispatchStates}
                terminalStreams={terminalChatStreamEntries}
                members={profiledMembers}
                conversationFilter={conversationFilter}
                unreadConversationCount={unreadConversations.length}
                isLoading={conversationQuery.isLoading}
                isLoadingMessages={messageQuery.isLoading}
                isLoadingOlderMessages={isLoadingOlderMessages}
                hasOlderMessages={hasOlderMessages}
                isSendingMessage={isSendingMessage}
                isCreating={isCreatingGroupConversation}
                isUpdating={isUpdatingGroupMembers}
                isUpdatingSettings={isUpdatingConversationSettings}
                isClearing={isClearingConversation}
                isDeleting={isDeletingConversation}
                renameDraft={renameDraft}
                messageDraft={messageDraft}
                mentionedMemberIds={mentionedMemberIds}
                attachmentEntries={attachmentEntries}
                shortcutPreferences={shortcutPreferences}
                roadmapTasks={roadmapTasks}
                isRoadmapAttachmentPickerOpen={isRoadmapAttachmentPickerOpen}
                groupTitle={groupTitle}
                groupMemberIds={groupMemberIds}
                selectedGroupMemberIds={selectedGroupMemberIds}
                onSelectConversation={setSelectedConversationId}
                onConversationFilterChange={setConversationFilter}
                onRenameDraftChange={setRenameDraft}
                onRenameConversation={() => void handleRenameConversation()}
                onTogglePinned={(isPinned) =>
                  void handleUpdateConversationSettings({ isPinned })
                }
                onToggleMuted={(isMuted) =>
                  void handleUpdateConversationSettings({ isMuted })
                }
                onClearConversation={() => void handleClearConversation()}
                onDeleteConversation={() => void handleDeleteConversation()}
                onMessageDraftChange={handleMessageDraftChange}
                onAddMention={addMentionMember}
                onRemoveMention={removeMentionMember}
                onAddImageAttachment={addImageAttachmentEntry}
                onOpenRoadmapAttachmentPicker={openRoadmapAttachmentPicker}
                onSelectRoadmapAttachment={addRoadmapAttachmentEntry}
                onOpenRoadmapReference={openRoadmapReference}
                onRemoveAttachmentEntry={removeAttachmentEntry}
                onSendMessage={() => void handleSendMessage()}
                onDispatchMessage={(message, memberId) => void handleDispatchMessage(message, memberId)}
                onLoadOlderMessages={() => void handleLoadOlderMessages()}
                onGroupTitleChange={setGroupTitle}
                onToggleCreateGroupMember={handleToggleCreateGroupMember}
                onToggleSelectedGroupMember={handleToggleSelectedGroupMember}
                onCreateGroup={() => void handleCreateGroupConversation()}
                onUpdateGroupMembers={() => void handleUpdateGroupMembers()}
              />
            ) : null}

            {activeWorkspace ? (
              <MembersPanel
                members={profiledMembers}
                ownerAvatar={profileSettings.avatar}
                terminalActivity={memberTerminalActivity}
                isLoading={memberQuery.isLoading}
                isInviting={isInvitingMember}
                inviteType={inviteType}
                displayName={inviteDisplayName}
                runtimeKind={runtimeKind}
                builtinRuntimeId={builtinRuntimeId}
                customRuntimeCliId={customRuntimeCliId}
                customRuntimeCommand={customRuntimeCommand}
                builtInRuntimeOptions={builtInRuntimeOptions}
                customCliRuntimeOptions={customCliRuntimeOptions}
                instanceCount={inviteInstanceCount}
                canMention={inviteCanMention}
                canRemove={inviteCanRemove}
                sandboxed={inviteSandboxed}
                unlimitedAccess={inviteUnlimitedAccess}
                openActionMenuId={memberActionMenuId}
                onInviteTypeChange={setInviteType}
                onDisplayNameChange={setInviteDisplayName}
                onRuntimeKindChange={setRuntimeKind}
                onBuiltinRuntimeChange={setBuiltinRuntimeId}
                onCustomRuntimeCliChange={setCustomRuntimeCliId}
                onCustomRuntimeCommandChange={setCustomRuntimeCommand}
                onInstanceCountChange={setInviteInstanceCount}
                onCanMentionChange={setInviteCanMention}
                onCanRemoveChange={setInviteCanRemove}
                onSandboxedChange={setInviteSandboxed}
                onUnlimitedAccessChange={setInviteUnlimitedAccess}
                onToggleActionMenu={(memberId) =>
                  setMemberActionMenuId((current) => (current === memberId ? null : memberId))
                }
                onStartPrivateConversation={(member) =>
                  void handleStartPrivateConversation("member", member.memberId)
                }
                onOpenMemberTerminal={(member) => void handleOpenMemberTerminal(member)}
                onMentionMember={handleMentionMember}
                onUpdateMemberStatus={(member, status) =>
                  void handleUpdateMemberStatus(member, status)
                }
                onRemoveMember={(member) => void handleRemoveMember(member)}
                onInvite={() => void handleInviteMember()}
              />
            ) : null}

            {activeWorkspace ? (
              <ContactsPanel
                contacts={contacts}
                isLoading={contactQuery.isLoading}
                isSaving={isSavingContact}
                isStartingConversation={isStartingConversation}
                displayName={contactDisplayName}
                contactKind={contactKind}
                notes={contactNotes}
                editingContactId={editingContactId}
                lastConversation={lastPrivateConversation}
                onDisplayNameChange={setContactDisplayName}
                onContactKindChange={setContactKind}
                onNotesChange={setContactNotes}
                onEditContact={handleEditContact}
                onDeleteContact={(contact) => void handleDeleteContact(contact)}
                onStartPrivateConversation={(contact) =>
                  void handleStartPrivateConversation("contact", contact.contactId)
                }
                onCancelEdit={() => {
                  setEditingContactId(null);
                  setContactDisplayName("");
                  setContactNotes("");
                  setContactKind("contact");
                }}
                onSaveContact={() => void handleSaveContact()}
              />
            ) : null}

            {activeWorkspace ? (
              <SkillLibraryPanel
                skills={skills}
                linkedSkills={linkedSkills}
                linkedSkillIds={linkedSkillIds}
                isLoading={skillQuery.isLoading}
                isLoadingLinks={workspaceSkillLinksQuery.isLoading}
                isImporting={isImportingSkill}
                pendingOpenId={pendingSkillOpenId}
                pendingDeleteId={pendingSkillDeleteId}
                pendingLinkId={pendingSkillLinkId}
                pendingUnlinkId={pendingSkillUnlinkId}
                onImport={() => void handleImportSkill()}
                onOpen={(skillId) => void handleOpenSkillFolder(skillId)}
                onDelete={(skillId) => void handleDeleteSkill(skillId)}
                onLink={(skillId) => void handleLinkWorkspaceSkill(skillId)}
                onUnlink={(skillId) => void handleUnlinkWorkspaceSkill(skillId)}
                onUnavailableCapability={handleUnavailableCapability}
              />
            ) : null}

            {isProfileSettingsOpen ? (
              <ProfileSettingsModal
                draft={profileSettingsDraft}
                savedProfile={profileSettings}
                notificationDraft={notificationPreferencesDraft}
                savedNotificationPreferences={notificationPreferences}
                shortcutDraft={shortcutPreferencesDraft}
                savedShortcutPreferences={shortcutPreferences}
                chatTerminalOutputDraft={chatTerminalOutputPreferencesDraft}
                savedChatTerminalOutputPreferences={chatTerminalOutputPreferences}
                terminalDraft={terminalConfigurationDraft}
                savedTerminalConfiguration={terminalConfiguration}
                activeWorkspaceId={activeWorkspaceId}
                activeWorkspaceName={activeWorkspace?.metadata.name ?? null}
                chatMaintenanceResult={chatMaintenanceResult}
                fieldError={profileSettingsFieldError}
                notificationError={notificationPreferencesError}
                shortcutError={shortcutPreferencesError}
                chatTerminalOutputError={chatTerminalOutputPreferencesError}
                terminalError={terminalConfigurationError}
                isLoading={profileSettingsQuery.isLoading}
                isSaving={isSavingProfileSettings}
                isNotificationLoading={notificationPreferencesQuery.isLoading}
                isNotificationSaving={isSavingNotificationPreferences}
                isShortcutLoading={shortcutPreferencesQuery.isLoading}
                isShortcutSaving={isSavingShortcutPreferences}
                isChatTerminalOutputLoading={chatTerminalOutputPreferencesQuery.isLoading}
                isChatTerminalOutputSaving={isSavingChatTerminalOutputPreferences}
                isRepairingChatData={isRepairingChatData}
                isClearingWorkspaceChatData={isClearingWorkspaceChatData}
                isTerminalLoading={terminalConfigurationQuery.isLoading}
                isTerminalSaving={isSavingTerminalConfiguration}
                pendingAvatarAction={pendingProfileAvatarAction}
                onDraftChange={setProfileSettingsDraft}
                onNotificationDraftChange={setNotificationPreferencesDraft}
                onShortcutDraftChange={setShortcutPreferencesDraft}
                onChatTerminalOutputDraftChange={setChatTerminalOutputPreferencesDraft}
                onTerminalDraftChange={setTerminalConfigurationDraft}
                onUploadAvatar={() => void handleUploadProfileAvatar()}
                onSelectAvatarPreset={(presetId) => void handleSelectProfileAvatarPreset(presetId)}
                onResetAvatar={() => void handleResetProfileAvatar()}
                onDeleteUploadedAvatar={() => void handleDeleteUploadedProfileAvatar()}
                onClose={() => setIsProfileSettingsOpen(false)}
                onSave={() => void handleSaveProfileSettings()}
                onSaveNotifications={() => void handleSaveNotificationPreferences()}
                onSaveShortcuts={() => void handleSaveShortcutPreferences()}
                onResetShortcuts={() => void handleResetShortcutPreferences()}
                onSaveChatTerminalOutput={() => void handleSaveChatTerminalOutputPreferences()}
                onRepairChatData={() => void handleRepairWorkspaceChatData()}
                onClearWorkspaceChatData={() => void handleClearWorkspaceChatData()}
                onSaveTerminalConfiguration={() => void handleSaveTerminalConfiguration()}
                onResetTerminalConfiguration={() => void handleResetTerminalConfiguration()}
              />
            ) : null}

            {activeWorkspace && isRoadmapOpen ? (
              <RoadmapModal
                tasks={roadmapTasks}
                goals={roadmapGoals}
                focusedTaskId={focusedRoadmapTaskId}
                isLoading={roadmapTasksQuery.isLoading || roadmapGoalsQuery.isLoading}
                isCreating={isCreatingRoadmapTask}
                isCreatingGoal={isCreatingRoadmapGoal}
                pendingUpdateId={pendingRoadmapUpdateId}
                pendingDeleteId={pendingRoadmapDeleteId}
                pendingGoalUpdateId={pendingRoadmapGoalUpdateId}
                pendingGoalDeleteId={pendingRoadmapGoalDeleteId}
                onClose={() => setIsRoadmapOpen(false)}
                onCreate={() => void handleCreateRoadmapTask()}
                onUpdate={(taskId, input) => void handleUpdateRoadmapTask(taskId, input)}
                onDelete={(taskId) => void handleDeleteRoadmapTask(taskId)}
                onCreateGoal={() => void handleCreateRoadmapGoal()}
                onUpdateGoal={handleUpdateRoadmapGoal}
                onDeleteGoal={(goalId) => void handleDeleteRoadmapGoal(goalId)}
              />
            ) : null}

            <section
              aria-labelledby="recent-workspaces-title"
              className="mt-6 rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 id="recent-workspaces-title" className="text-sm font-semibold">
                  {text.recentWorkspaces}
                </h2>
                <span className="text-xs text-[#6a786c]">
                  {recentWorkspaces.length || status?.recentWorkspaceCount || 0}{" "}
                  {text.recordsSuffix}
                </span>
              </div>

              {recentWorkspaces.length > 0 ? (
                <div className="mt-5 space-y-3">
                  <label className="flex items-center gap-2 rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] focus-within:border-[#8fad87]">
                    <Search aria-hidden="true" size={16} strokeWidth={2} />
                    <span className="sr-only">{text.searchFolders}</span>
                    <input
                      value={recentSearch}
                      onChange={(event) => setRecentSearch(event.target.value)}
                      placeholder={text.searchFoldersPlaceholder}
                      className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#7b887a]"
                    />
                  </label>

                  {filteredRecentWorkspaces.length > 0 ? (
                    <ul className="space-y-2">
                      {filteredRecentWorkspaces.map((workspace) => (
                        <li
                          key={workspace.projectId}
                          className="flex items-center gap-4 rounded-md border border-[#dbe4d7] bg-white p-3"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eef3eb] text-[#61725f]">
                            <History aria-hidden="true" size={20} strokeWidth={2} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#263229]">
                              {workspace.name}
                            </p>
                            <p className="mt-1 truncate text-xs text-[#6a786c]" title={workspace.path}>
                              {workspace.path}
                            </p>
                            <p className="mt-1 text-xs text-[#879182]">
                              {formatRecentTime(workspace.lastOpenedAtMs)}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={isOpening}
                            aria-label={`${text.openRecentPrefix} ${workspace.name}`}
                            onClick={() => handleOpenRecent(workspace.path)}
                            className="shrink-0 rounded-md border border-[#cfd9cc] bg-[#f8fbf6] px-3 py-1.5 text-sm font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
                          >
                            {text.open}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-4 text-sm text-[#6a786c]">
                      {text.noMatchingWorkspaces}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-5 flex items-center gap-4 rounded-md border border-dashed border-[#cfd9cc] bg-white p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eef3eb] text-[#61725f]">
                    <History aria-hidden="true" size={20} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#263229]">
                      {text.noRecentWorkspaces}
                    </p>
                    <p className="mt-1 text-sm text-[#6a786c]">
                      {text.noRecentWorkspacesHint}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>

      {pendingConflict ? (
        <WorkspaceConflictDialog
          conflict={pendingConflict.conflict}
          primaryButtonRef={conflictPrimaryButtonRef}
          onResolve={handleResolveConflict}
          onCancel={handleCancelConflict}
        />
      ) : null}
      {renderLocalToast && toast ? <Toast toast={toast} onClose={clearToast} /> : null}
    </main>
  );
}

type ParityInviteKind = "admin" | InvitedMemberType;
const PARITY_INVITE_TEXT = {
  "zh-CN": {
    title: "邀请加入服务器",
    subtitle: "生成唯一邀请链接",
    admin: "以管理员身份邀请",
    adminDesc: "完全服务器权限",
    assistant: "以助手身份邀请",
    assistantDesc: "管理权限",
    member: "普通成员",
    memberDesc: "标准访问权限",
  },
  "en-US": {
    title: "Invite to Server",
    subtitle: "Generate a unique invite link",
    admin: "Invite as Admin",
    adminDesc: "Full server access",
    assistant: "Invite as Assistant",
    assistantDesc: "Moderation permissions",
    member: "General Member",
    memberDesc: "Standard access",
  },
} as const satisfies Record<AppLanguage, Record<string, string>>;

const PARITY_INVITE_MODAL_TEXT = {
  "zh-CN": {
    close: "关闭",
    admin: {
      ariaLabel: "邀请管理员",
      title: "以管理员身份邀请",
      subtitle: "配置访问级别与时长",
      uniqueLink: "唯一邀请链接",
      copyInviteLink: "复制邀请链接",
      userIdentifier: "用户标识",
      userPlaceholder: "用户名或邮箱地址",
      permissions: "权限等级",
      send: "发送邀请",
      permissionsList: [
        {
          title: "完全服务器权限",
          description: "可修改设置、频道与角色",
          checked: true,
        },
        {
          title: "账单权限",
          description: "管理订阅与付款",
          checked: false,
        },
        {
          title: "成员管理",
          description: "踢出、封禁并分配低级角色",
          checked: true,
        },
      ],
    },
    assistant: {
      assistantAriaLabel: "邀请助手",
      memberAriaLabel: "邀请成员",
      assistantTitle: "以助手身份邀请",
      memberTitle: "以成员身份邀请",
      subtitle: "选择要加入工作区的 AI 模型",
      shellCommand: "Shell 命令",
      customCliCommand: "自定义 CLI 命令",
      shellPlaceholder: "zsh",
      customCliPlaceholder: "my-agent --stdio",
      instances: "实例数量",
      instanceCount: "实例数量",
      instanceLimit: "最多 {count} 个实例",
      unlimitedAccess: "无限制模式",
      unlimitedAccessDesc: "绕过使用限制",
      sandboxed: "沙盒环境",
      saving: "保存中",
      send: "发送邀请",
    },
    manage: {
      ariaLabel: "管理成员",
      title: "管理成员",
      displayName: "显示名称",
      saving: "保存中",
      save: "保存更改",
    },
  },
  "en-US": {
    close: "Close",
    admin: {
      ariaLabel: "Invite admin",
      title: "Invite as Admin",
      subtitle: "Configure access level and duration",
      uniqueLink: "Unique Invite Link",
      copyInviteLink: "Copy invite link",
      userIdentifier: "User Identifier",
      userPlaceholder: "Username or email address",
      permissions: "Permissions Level",
      send: "Send Invitation",
      permissionsList: [
        {
          title: "Full Server Access",
          description: "Can modify settings, channels & roles",
          checked: true,
        },
        {
          title: "Billing Access",
          description: "Manage subscription and payments",
          checked: false,
        },
        {
          title: "Member Management",
          description: "Kick, ban, and assign lower roles",
          checked: true,
        },
      ],
    },
    assistant: {
      assistantAriaLabel: "Invite assistant",
      memberAriaLabel: "Invite member",
      assistantTitle: "Invite as Assistant",
      memberTitle: "Invite as Member",
      subtitle: "Select an AI model to join the workspace",
      shellCommand: "Shell command",
      customCliCommand: "Custom CLI command",
      shellPlaceholder: "zsh",
      customCliPlaceholder: "my-agent --stdio",
      instances: "Number of Instances",
      instanceCount: "Instance count",
      instanceLimit: "Max {count} instances",
      unlimitedAccess: "Unlimited Mode",
      unlimitedAccessDesc: "Bypass usage limits",
      sandboxed: "Sandboxed environment",
      saving: "Saving",
      send: "Send Invitation",
    },
    manage: {
      ariaLabel: "Manage member",
      title: "Manage Member",
      displayName: "Display Name",
      saving: "Saving",
      save: "Save Changes",
    },
  },
} as const satisfies Record<AppLanguage, {
  close: string;
  admin: {
    ariaLabel: string;
    title: string;
    subtitle: string;
    uniqueLink: string;
    copyInviteLink: string;
    userIdentifier: string;
    userPlaceholder: string;
    permissions: string;
    send: string;
    permissionsList: Array<{ title: string; description: string; checked: boolean }>;
  };
  assistant: {
    assistantAriaLabel: string;
    memberAriaLabel: string;
    assistantTitle: string;
    memberTitle: string;
    subtitle: string;
    shellCommand: string;
    customCliCommand: string;
    shellPlaceholder: string;
    customCliPlaceholder: string;
    instances: string;
    instanceCount: string;
    instanceLimit: string;
    unlimitedAccess: string;
    unlimitedAccessDesc: string;
    sandboxed: string;
    saving: string;
    send: string;
  };
  manage: {
    ariaLabel: string;
    title: string;
    displayName: string;
    saving: string;
    save: string;
  };
}>;

const FRIENDS_PARITY_TEXT = {
  "zh-CN": {
    title: "好友",
    loading: "加载中",
    add: "添加",
    closeInviteMenu: "关闭邀请菜单",
    loadingMembers: "正在加载成员",
    empty: "暂无好友",
    projectFriends: "项目好友",
    globalFriends: "全局好友",
    openTerminal: "打开终端",
    sendMessage: "发送消息",
    moreActions: "更多操作",
    status: "状态",
    remove: "移除",
    adminRole: "管理员",
    memberRole: "成员",
  },
  "en-US": {
    title: "Friends",
    loading: "Loading",
    add: "Add",
    closeInviteMenu: "Close invite menu",
    loadingMembers: "Loading members",
    empty: "No friends yet",
    projectFriends: "PROJECT FRIENDS",
    globalFriends: "GLOBAL FRIENDS",
    openTerminal: "Open terminal",
    sendMessage: "Send message",
    moreActions: "More actions",
    status: "Status",
    remove: "Remove",
    adminRole: "Admin",
    memberRole: "Member",
  },
} as const satisfies Record<AppLanguage, Record<string, string>>;

const CHAT_PARITY_TEXT = {
  "zh-CN": {
    workspaceAria: "聊天工作台",
    workspaceFallback: "工作区",
    channels: "频道",
    directMessages: "私信",
    loading: "加载中",
    empty: "空",
    roadmap: "路线图",
    skills: "技能",
    members: "成员",
    add: "添加",
    closeInviteMenu: "关闭邀请菜单",
    readOnlyTitle: "工作区本地数据只读",
    selectConversation: "选择一个会话",
    directMessage: "私信",
    defaultChannel: "默认频道",
    channel: "频道",
    memberCount: "{count} 位成员",
    defaultWorkspaceChannel: "默认工作区频道",
    workspaceChannel: "工作区频道",
    renameConversation: "修改群聊名称",
    conversationName: "群聊名称",
    saving: "保存中",
    save: "保存",
    cancel: "取消",
    messageHistory: "消息历史",
    loadingMessages: "正在加载消息",
    noMessages: "暂无消息",
    loadEarlierMessages: "加载更早消息",
    loadingHistory: "正在加载历史...",
    quickPromptsAria: "快捷提示",
    quickPrompts: [
      { label: "总结最新讨论", text: "总结最新讨论" },
      { label: "生成礼貌回复", text: "生成礼貌回复" },
      { label: "提取行动项", text: "提取行动项" },
    ],
    compositionState: "消息编辑状态",
    removeAttachment: "移除 {label}",
    unsupportedAllMention: "@all 暂未在 MVP 中启用，请选择具体成员。",
    emojiPanel: "表情面板",
    emojiSearch: "搜索表情...",
    emojiGroups: "表情分组",
    emojiEmpty: "没有匹配的表情",
    selectRoadmapTask: "选择路线图任务",
    noRoadmapTasks: "暂无路线图任务",
    addRoadmapAttachment: "添加路线图引用",
    mentionMember: "提及成员",
    openEmojiPanel: "打开表情面板",
    addImageAttachment: "添加图片附件",
    messagePlaceholder: "消息",
    selectConversationPlaceholder: "选择会话",
    mentionSuggestions: "提及建议",
    sendMessage: "发送消息",
    sendingMessage: "正在发送消息",
    inputHint: "Enter 发送 • Shift+Enter 换行",
    noMembers: "暂无成员",
    actionsFor: "{name} 的操作",
    ownerFallback: "群主",
    conversationActions: {
      pin: "置顶",
      unpin: "取消置顶",
      rename: "修改群聊名称",
      mute: "消息免打扰",
      unmute: "取消免打扰",
      clear: "清空聊天记录",
      deleteDirect: "删除对话",
      deleteGroup: "删除群聊",
    },
    memberActions: {
      sendMessage: "发送消息",
      mention: "提及",
      openTerminal: "打开终端",
      rename: "更改名称",
      remove: "移出群组",
      renamePrompt: "更改成员名称",
    },
    roles: {
      owner: "群主",
      admin: "管理员",
      assistant: "助手",
      member: "成员",
    },
    sections: {
      owner: "群主 — {count}",
      admin: "管理员 — {count}",
      assistant: "助手 — {count}",
      member: "普通成员 — {count}",
    },
    statuses: {
      online: "在线",
      working: "工作中",
      doNotDisturb: "请勿打扰",
      offline: "离线",
    },
    messageStatuses: {
      sent: "已发送",
      sending: "发送中",
      failed: "发送失败",
    },
  },
  "en-US": {
    workspaceAria: "Chat workspace",
    workspaceFallback: "Workspace",
    channels: "CHANNELS",
    directMessages: "DIRECT MESSAGES",
    loading: "Loading",
    empty: "Empty",
    roadmap: "Roadmap",
    skills: "Skills",
    members: "Members",
    add: "Add",
    closeInviteMenu: "Close invite menu",
    readOnlyTitle: "Local workspace data is read-only",
    selectConversation: "Select a conversation",
    directMessage: "Direct message",
    defaultChannel: "Default channel",
    channel: "Channel",
    memberCount: "{count} members",
    defaultWorkspaceChannel: "Default workspace channel",
    workspaceChannel: "Workspace channel",
    renameConversation: "Rename conversation",
    conversationName: "Conversation name",
    saving: "Saving",
    save: "Save",
    cancel: "Cancel",
    messageHistory: "Message history",
    loadingMessages: "Loading messages",
    noMessages: "No messages yet",
    loadEarlierMessages: "Load earlier messages",
    loadingHistory: "Loading history...",
    quickPromptsAria: "Quick prompts",
    quickPrompts: [
      { label: "Summarize the latest discussion", text: "Summarize the latest discussion" },
      { label: "Draft a polite reply", text: "Draft a polite reply" },
      { label: "Extract action items", text: "Extract action items" },
    ],
    compositionState: "Message composition state",
    removeAttachment: "Remove {label}",
    unsupportedAllMention: "@all is not enabled in the MVP yet. Pick specific members instead.",
    emojiPanel: "Emoji panel",
    emojiSearch: "Search emoji...",
    emojiGroups: "Emoji groups",
    emojiEmpty: "No matching emoji",
    selectRoadmapTask: "Select roadmap task",
    noRoadmapTasks: "No roadmap tasks",
    addRoadmapAttachment: "Add roadmap attachment",
    mentionMember: "Mention member",
    openEmojiPanel: "Open emoji panel",
    addImageAttachment: "Add image attachment",
    messagePlaceholder: "Message",
    selectConversationPlaceholder: "Select a conversation",
    mentionSuggestions: "Mention suggestions",
    sendMessage: "Send message",
    sendingMessage: "Sending message",
    inputHint: "Enter to send • Shift+Enter for newline",
    noMembers: "No members",
    actionsFor: "Actions for {name}",
    ownerFallback: "Owner",
    conversationActions: {
      pin: "Pin",
      unpin: "Unpin",
      rename: "Rename Group",
      mute: "Mute Notifications",
      unmute: "Unmute Notifications",
      clear: "Clear Chat History",
      deleteDirect: "Delete Conversation",
      deleteGroup: "Delete Group Chat",
    },
    memberActions: {
      sendMessage: "Send Message",
      mention: "Mention",
      openTerminal: "Open Terminal",
      rename: "Rename",
      remove: "Remove",
      renamePrompt: "Rename member",
    },
    roles: {
      owner: "Owner",
      admin: "Admin",
      assistant: "Assistant",
      member: "Member",
    },
    sections: {
      owner: "GROUP OWNER — {count}",
      admin: "ADMINS — {count}",
      assistant: "ASSISTANTS — {count}",
      member: "MEMBERS — {count}",
    },
    statuses: {
      online: "Online",
      working: "Working",
      doNotDisturb: "Do not disturb",
      offline: "Offline",
    },
    messageStatuses: {
      sent: "sent",
      sending: "sending",
      failed: "failed",
    },
  },
} as const satisfies Record<AppLanguage, {
  workspaceAria: string;
  workspaceFallback: string;
  channels: string;
  directMessages: string;
  loading: string;
  empty: string;
  roadmap: string;
  skills: string;
  members: string;
  add: string;
  closeInviteMenu: string;
  readOnlyTitle: string;
  selectConversation: string;
  directMessage: string;
  defaultChannel: string;
  channel: string;
  memberCount: string;
  defaultWorkspaceChannel: string;
  workspaceChannel: string;
  renameConversation: string;
  conversationName: string;
  saving: string;
  save: string;
  cancel: string;
  messageHistory: string;
  loadingMessages: string;
  noMessages: string;
  loadEarlierMessages: string;
  loadingHistory: string;
  quickPromptsAria: string;
  quickPrompts: Array<{ label: string; text: string }>;
  compositionState: string;
  removeAttachment: string;
  unsupportedAllMention: string;
  emojiPanel: string;
  emojiSearch: string;
  emojiGroups: string;
  emojiEmpty: string;
  selectRoadmapTask: string;
  noRoadmapTasks: string;
  addRoadmapAttachment: string;
  mentionMember: string;
  openEmojiPanel: string;
  addImageAttachment: string;
  messagePlaceholder: string;
  selectConversationPlaceholder: string;
  mentionSuggestions: string;
  sendMessage: string;
  sendingMessage: string;
  inputHint: string;
  noMembers: string;
  actionsFor: string;
  ownerFallback: string;
  conversationActions: Record<string, string>;
  memberActions: Record<string, string>;
  roles: Record<MemberProfile["role"], string>;
  sections: Record<MemberProfile["role"], string>;
  statuses: Record<MemberProfile["status"], string>;
  messageStatuses: Record<ChatMessageProfile["status"], string>;
}>;

type FriendsParityEntry =
  | {
      id: string;
      scope: "project";
      displayName: string;
      roleLabel: string;
      avatar: string;
      status: MemberProfile["status"];
      member: MemberProfile;
      contact: null;
      terminalMeta: TerminalSessionStatus | null;
      canMention: boolean;
      canRemove: boolean;
      canOpenTerminal: boolean;
    }
  | {
      id: string;
      scope: "global";
      displayName: string;
      roleLabel: string;
      avatar: string;
      status: MemberProfile["status"];
      member: null;
      contact: ContactProfile;
      terminalMeta: TerminalSessionStatus | null;
      canMention: boolean;
      canRemove: boolean;
      canOpenTerminal: boolean;
    };

function friendsParityStatusOptions(language: AppLanguage): Array<{
  id: MemberProfile["status"];
  label: string;
}> {
  const statuses = CHAT_PARITY_TEXT[language].statuses;

  return [
    { id: "online", label: statuses.online },
    { id: "working", label: statuses.working },
    { id: "doNotDisturb", label: statuses.doNotDisturb },
    { id: "offline", label: statuses.offline },
  ];
}

type FriendAvatarVars = CSSProperties & {
  [key: `--${string}`]: string;
};

const FRIEND_AVATAR_PREFIX = "css:";
const FRIEND_AVATAR_PRESETS: Record<string, FriendAvatarVars> = {
  orbit: {
    "--avatar-bg": "linear-gradient(135deg, #0b1220 0%, #1f2937 100%)",
    "--avatar-spot":
      "radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.95), rgba(56, 189, 248, 0))",
    "--avatar-spot-2":
      "radial-gradient(circle at 70% 75%, rgba(14, 165, 233, 0.85), rgba(14, 165, 233, 0))",
    "--avatar-ring": "rgba(125, 211, 252, 0.7)",
    "--avatar-glow": "rgba(56, 189, 248, 0.35)",
    "--avatar-spot-size": "78%",
    "--avatar-spot-2-size": "48%",
    "--avatar-spot-x": "-18%",
    "--avatar-spot-y": "-12%",
    "--avatar-spot-2-x": "20%",
    "--avatar-spot-2-y": "18%",
    "--avatar-spot-rotate": "12deg",
    "--avatar-spot-2-rotate": "-6deg",
  },
  ember: {
    "--avatar-bg": "linear-gradient(135deg, #1f1308 0%, #3a2011 100%)",
    "--avatar-spot":
      "radial-gradient(circle at 25% 30%, rgba(251, 146, 60, 0.95), rgba(251, 146, 60, 0))",
    "--avatar-spot-2":
      "radial-gradient(circle at 70% 70%, rgba(244, 63, 94, 0.8), rgba(244, 63, 94, 0))",
    "--avatar-ring": "rgba(253, 186, 116, 0.7)",
    "--avatar-glow": "rgba(251, 146, 60, 0.35)",
    "--avatar-spot-size": "74%",
    "--avatar-spot-2-size": "50%",
    "--avatar-spot-x": "-20%",
    "--avatar-spot-y": "-14%",
    "--avatar-spot-2-x": "18%",
    "--avatar-spot-2-y": "20%",
    "--avatar-spot-rotate": "-8deg",
    "--avatar-spot-2-rotate": "14deg",
  },
  mint: {
    "--avatar-bg": "linear-gradient(135deg, #0c1f1c 0%, #123b32 100%)",
    "--avatar-spot":
      "radial-gradient(circle at 32% 24%, rgba(52, 211, 153, 0.95), rgba(52, 211, 153, 0))",
    "--avatar-spot-2":
      "radial-gradient(circle at 70% 78%, rgba(16, 185, 129, 0.85), rgba(16, 185, 129, 0))",
    "--avatar-ring": "rgba(110, 231, 183, 0.7)",
    "--avatar-glow": "rgba(52, 211, 153, 0.35)",
    "--avatar-spot-size": "76%",
    "--avatar-spot-2-size": "46%",
    "--avatar-spot-x": "-14%",
    "--avatar-spot-y": "-16%",
    "--avatar-spot-2-x": "22%",
    "--avatar-spot-2-y": "18%",
    "--avatar-spot-rotate": "6deg",
    "--avatar-spot-2-rotate": "-12deg",
  },
  canyon: {
    "--avatar-bg": "linear-gradient(135deg, #1f140b 0%, #3b2414 100%)",
    "--avatar-spot":
      "radial-gradient(circle at 24% 28%, rgba(251, 191, 36, 0.9), rgba(251, 191, 36, 0))",
    "--avatar-spot-2":
      "radial-gradient(circle at 68% 72%, rgba(217, 119, 6, 0.85), rgba(217, 119, 6, 0))",
    "--avatar-ring": "rgba(253, 230, 138, 0.6)",
    "--avatar-glow": "rgba(251, 191, 36, 0.3)",
    "--avatar-spot-size": "72%",
    "--avatar-spot-2-size": "44%",
    "--avatar-spot-x": "-18%",
    "--avatar-spot-y": "-12%",
    "--avatar-spot-2-x": "20%",
    "--avatar-spot-2-y": "22%",
    "--avatar-spot-rotate": "18deg",
    "--avatar-spot-2-rotate": "-6deg",
  },
  storm: {
    "--avatar-bg": "linear-gradient(135deg, #10161f 0%, #1f2937 100%)",
    "--avatar-spot":
      "radial-gradient(circle at 28% 35%, rgba(148, 163, 184, 0.9), rgba(148, 163, 184, 0))",
    "--avatar-spot-2":
      "radial-gradient(circle at 72% 68%, rgba(100, 116, 139, 0.85), rgba(100, 116, 139, 0))",
    "--avatar-ring": "rgba(226, 232, 240, 0.5)",
    "--avatar-glow": "rgba(148, 163, 184, 0.3)",
    "--avatar-spot-size": "70%",
    "--avatar-spot-2-size": "46%",
    "--avatar-spot-x": "-16%",
    "--avatar-spot-y": "-10%",
    "--avatar-spot-2-x": "18%",
    "--avatar-spot-2-y": "20%",
    "--avatar-spot-rotate": "-10deg",
    "--avatar-spot-2-rotate": "10deg",
  },
};

function FriendsMembersParity({
  language,
  members,
  contacts,
  terminalActivity,
  isLoading,
  isInviting,
  runtimeKind,
  builtinRuntimeId,
  customRuntimeCliId,
  customRuntimeCommand,
  builtInRuntimeOptions,
  customCliRuntimeOptions,
  instanceCount,
  sandboxed,
  unlimitedAccess,
  onInviteTypeChange,
  onDisplayNameChange,
  onRuntimeKindChange,
  onBuiltinRuntimeChange,
  onCustomRuntimeCliChange,
  onCustomRuntimeCommandChange,
  onInstanceCountChange,
  onSandboxedChange,
  onUnlimitedAccessChange,
  onStartPrivateConversation,
  onStartContactConversation,
  onOpenMemberTerminal,
  onRenameMember,
  onRenameContact,
  onUpdateContactStatus,
  onUpdateMemberStatus,
  onRemoveMember,
  onRemoveContact,
  onInvite,
  onUnavailable,
}: {
  language: AppLanguage;
  members: MemberProfile[];
  contacts: ContactProfile[];
  terminalActivity: Record<string, MemberTerminalActivity>;
  isLoading: boolean;
  isInviting: boolean;
  runtimeKind: MemberRuntimeKind;
  builtinRuntimeId: string;
  customRuntimeCliId: string;
  customRuntimeCommand: string;
  builtInRuntimeOptions: RuntimeOption[];
  customCliRuntimeOptions: RuntimeOption[];
  instanceCount: number;
  sandboxed: boolean;
  unlimitedAccess: boolean;
  onInviteTypeChange: (value: InvitedMemberType) => void;
  onDisplayNameChange: (value: string) => void;
  onRuntimeKindChange: (value: MemberRuntimeKind) => void;
  onBuiltinRuntimeChange: (value: string) => void;
  onCustomRuntimeCliChange: (value: string) => void;
  onCustomRuntimeCommandChange: (value: string) => void;
  onInstanceCountChange: (value: number) => void;
  onSandboxedChange: (value: boolean) => void;
  onUnlimitedAccessChange: (value: boolean) => void;
  onStartPrivateConversation: (member: MemberProfile) => void;
  onStartContactConversation: (contact: ContactProfile) => void;
  onOpenMemberTerminal: (member: MemberProfile) => void;
  onRenameMember: (member: MemberProfile, displayName: string) => Promise<void>;
  onRenameContact: (contact: ContactProfile, displayName: string) => Promise<void>;
  onUpdateContactStatus: (contact: ContactProfile, status: MemberProfile["status"]) => void;
  onUpdateMemberStatus: (member: MemberProfile, status: MemberProfile["status"]) => void;
  onRemoveMember: (member: MemberProfile) => void;
  onRemoveContact: (contact: ContactProfile) => void;
  onInvite: () => void;
  onUnavailable: (capability: string) => void;
}) {
  const text = FRIENDS_PARITY_TEXT[language];
  const [isInviteMenuOpen, setIsInviteMenuOpen] = useState(false);
  const [inviteModal, setInviteModal] = useState<ParityInviteKind | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuPlacement, setActionMenuPlacement] = useState<"top" | "bottom">("bottom");
  const [actionMenuMaxHeight, setActionMenuMaxHeight] = useState("");
  const [managingEntry, setManagingEntry] = useState<FriendsParityEntry | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const projectMemberNames = new Set(
    members.map((member) => (member.instanceLabel || member.displayName).trim().toLowerCase()),
  );
  const projectMemberIds = new Set(members.map((member) => member.memberId));
  const projectFriends: FriendsParityEntry[] = members
    .filter((member) => member.role !== "owner")
    .map((member) => ({
      id: member.memberId,
      scope: "project",
      displayName: member.instanceLabel || member.displayName,
      roleLabel: friendsParityRoleLabel(member.role, language),
      avatar: memberFriendAvatar(member),
      status: member.status,
      member,
      contact: null,
      terminalMeta: terminalActivity[member.memberId]?.status ?? null,
      canMention: member.permissions.canMention,
      canRemove: member.permissions.canRemove,
      canOpenTerminal: isTerminalCapableMember(member),
    }));
  const globalFriends: FriendsParityEntry[] = contacts
    .filter(
      (contact) =>
        !projectMemberIds.has(contact.contactId) &&
        !projectMemberNames.has(contact.displayName.trim().toLowerCase()),
    )
    .map((contact) => ({
      id: contact.contactId,
      scope: "global",
      displayName: contact.displayName,
      roleLabel: friendsParityContactRoleLabel(contact.contactKind, language),
      avatar: contact.avatar || seededFriendAvatar(`contact:${contact.contactId}:${contact.displayName}`),
      status: contact.status,
      member: null,
      contact,
      terminalMeta: null,
      canMention: false,
      canRemove: true,
      canOpenTerminal: false,
    }));
  const totalFriends = projectFriends.length + globalFriends.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!openActionMenuId) {
        return;
      }

      const target = event.target as HTMLElement | null;

      if (target?.closest("[data-friend-menu]") || target?.closest("[data-friend-menu-toggle]")) {
        return;
      }

      closeActionMenu();
    }

    document.addEventListener("click", handleClickOutside, true);

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [openActionMenuId]);

  function closeActionMenu() {
    setOpenActionMenuId(null);
    setActionMenuPlacement("bottom");
    setActionMenuMaxHeight("");
  }

  function updateActionMenuPlacement(anchor: HTMLElement | null) {
    const menu = actionMenuRef.current;

    if (!menu) {
      return;
    }

    const anchorRect = anchor?.getBoundingClientRect() ?? menu.getBoundingClientRect();
    const containerRect =
      scrollContainerRef.current?.getBoundingClientRect() ?? {
        top: 0,
        bottom: window.innerHeight || document.documentElement.clientHeight,
      };
    const spaceBelow = Math.max(0, containerRect.bottom - anchorRect.bottom);
    const spaceAbove = Math.max(0, anchorRect.top - containerRect.top);
    const menuHeight = menu.offsetHeight;
    const preferTop = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const available = preferTop ? spaceAbove : spaceBelow;

    setActionMenuPlacement(preferTop ? "top" : "bottom");
    setActionMenuMaxHeight(available > 0 ? `${Math.max(0, Math.floor(available - 12))}px` : "");
  }

  function toggleActionMenu(entryId: string, anchor: HTMLElement | null) {
    if (openActionMenuId === entryId) {
      closeActionMenu();
      return;
    }

    setOpenActionMenuId(entryId);
    setActionMenuPlacement("bottom");
    setActionMenuMaxHeight("");
    window.setTimeout(() => updateActionMenuPlacement(anchor), 0);
  }

  function openManage(entry: FriendsParityEntry) {
    closeActionMenu();
    setManagingEntry(entry);
  }

  function openInviteModal(kind: ParityInviteKind) {
    setIsInviteMenuOpen(false);
    setInviteModal(kind);

    if (kind === "assistant" || kind === "member") {
      const defaultRuntime =
        builtInRuntimeOptions.find((runtime) => runtime.id === builtinRuntimeId) ??
        builtInRuntimeOptions[0];
      onInviteTypeChange(kind);
      onRuntimeKindChange("builtInAiCli");
      if (defaultRuntime) {
        onBuiltinRuntimeChange(defaultRuntime.id);
      }
      onDisplayNameChange("");
      onSandboxedChange(false);
      onUnlimitedAccessChange(true);
    }
  }

  function submitInvite() {
    if (inviteModal === "admin") {
      onUnavailable("管理员邀请");
      setInviteModal(null);
      return;
    }

    onInvite();
    setInviteModal(null);
  }

  return (
    <section className="friends-parity" aria-label={text.title}>
      <header className="friends-parity__header">
        <div className="friends-parity__title-block">
          <span className="friends-parity__title-icon">
            <WorkspaceMaterialSymbol name="group" />
          </span>
          <span>
            <h1>{text.title}</h1>
            <p>{isLoading ? text.loading : totalFriends}</p>
          </span>
        </div>
        <div className="friends-parity__invite">
          <button
            type="button"
            className={
              isInviteMenuOpen
                ? "friends-parity__invite-button friends-parity__invite-button--active"
                : "friends-parity__invite-button"
            }
            onClick={() => setIsInviteMenuOpen((isOpen) => !isOpen)}
          >
            <WorkspaceMaterialSymbol name="person_add" />
            {text.add}
          </button>
          {isInviteMenuOpen ? (
            <>
              <button
                type="button"
                className="friends-parity__scrim"
                aria-label={text.closeInviteMenu}
                onClick={() => setIsInviteMenuOpen(false)}
              />
              <ParityInviteMenu language={language} onSelect={openInviteModal} />
            </>
          ) : null}
        </div>
      </header>

      <div ref={scrollContainerRef} className="friends-parity__content custom-scrollbar">
        {totalFriends === 0 ? (
          <p className="friends-parity__empty">
            {isLoading ? text.loadingMembers : text.empty}
          </p>
        ) : null}

        <FriendsMemberSection
          language={language}
          title={text.projectFriends}
          entries={projectFriends}
          openActionMenuId={openActionMenuId}
          actionMenuPlacement={actionMenuPlacement}
          actionMenuMaxHeight={actionMenuMaxHeight}
          actionMenuRef={actionMenuRef}
          onToggleActionMenu={toggleActionMenu}
          onCloseActionMenu={closeActionMenu}
          onOpenManage={openManage}
          onStartPrivateConversation={onStartPrivateConversation}
          onStartContactConversation={onStartContactConversation}
          onOpenMemberTerminal={onOpenMemberTerminal}
          onUpdateContactStatus={onUpdateContactStatus}
          onUpdateMemberStatus={onUpdateMemberStatus}
          onUnavailable={onUnavailable}
          onRemoveMember={onRemoveMember}
          onRemoveContact={onRemoveContact}
        />
        <FriendsMemberSection
          language={language}
          title={text.globalFriends}
          entries={globalFriends}
          openActionMenuId={openActionMenuId}
          actionMenuPlacement={actionMenuPlacement}
          actionMenuMaxHeight={actionMenuMaxHeight}
          actionMenuRef={actionMenuRef}
          onToggleActionMenu={toggleActionMenu}
          onCloseActionMenu={closeActionMenu}
          onOpenManage={openManage}
          onStartPrivateConversation={onStartPrivateConversation}
          onStartContactConversation={onStartContactConversation}
          onOpenMemberTerminal={onOpenMemberTerminal}
          onUpdateContactStatus={onUpdateContactStatus}
          onUpdateMemberStatus={onUpdateMemberStatus}
          onUnavailable={onUnavailable}
          onRemoveMember={onRemoveMember}
          onRemoveContact={onRemoveContact}
        />
      </div>

      {inviteModal === "admin" ? (
        <ParityAdminInviteModal
          language={language}
          onClose={() => setInviteModal(null)}
          onSubmit={submitInvite}
        />
      ) : inviteModal === "assistant" || inviteModal === "member" ? (
        <ParityAssistantInviteModal
          language={language}
          kind={inviteModal}
          runtimeKind={runtimeKind}
          builtinRuntimeId={builtinRuntimeId}
          customRuntimeCliId={customRuntimeCliId}
          customRuntimeCommand={customRuntimeCommand}
          builtInRuntimeOptions={builtInRuntimeOptions}
          customCliRuntimeOptions={customCliRuntimeOptions}
          instanceCount={instanceCount}
          sandboxed={sandboxed}
          unlimitedAccess={unlimitedAccess}
          isInviting={isInviting}
          onClose={() => setInviteModal(null)}
          onRuntimeKindChange={onRuntimeKindChange}
          onBuiltinRuntimeChange={onBuiltinRuntimeChange}
          onCustomRuntimeCliChange={onCustomRuntimeCliChange}
          onCustomRuntimeCommandChange={onCustomRuntimeCommandChange}
          onInstanceCountChange={onInstanceCountChange}
          onSandboxedChange={onSandboxedChange}
          onUnlimitedAccessChange={onUnlimitedAccessChange}
          onSubmit={submitInvite}
        />
      ) : null}
      {managingEntry ? (
        <FriendsManageMemberModal
          language={language}
          entry={managingEntry}
          onClose={() => setManagingEntry(null)}
          onSave={async (entry, displayName) => {
            if (entry.member) {
              await onRenameMember(entry.member, displayName);
            } else if (entry.contact) {
              await onRenameContact(entry.contact, displayName);
            }
            setManagingEntry(null);
          }}
        />
      ) : null}
    </section>
  );
}

function ParityInviteMenu({
  language,
  onSelect,
}: {
  language: AppLanguage;
  onSelect: (kind: ParityInviteKind) => void;
}) {
  const text = PARITY_INVITE_TEXT[language];
  const options: Array<{
    kind: ParityInviteKind;
    icon: string;
    title: string;
    subtitle: string;
    tone: "admin" | "assistant" | "member";
  }> = [
    {
      kind: "admin",
      icon: "admin_panel_settings",
      title: text.admin,
      subtitle: text.adminDesc,
      tone: "admin",
    },
    {
      kind: "assistant",
      icon: "manage_accounts",
      title: text.assistant,
      subtitle: text.assistantDesc,
      tone: "assistant",
    },
    {
      kind: "member",
      icon: "person",
      title: text.member,
      subtitle: text.memberDesc,
      tone: "member",
    },
  ];

  return (
    <div className="friends-parity__invite-menu">
      <div className="friends-parity__invite-menu-copy">
        <h2>{text.title}</h2>
        <p>{text.subtitle}</p>
      </div>
      <div className="friends-parity__invite-menu-rule" />
      {options.map((option) => (
        <button
          key={option.kind}
          type="button"
          className="friends-parity__invite-option"
          onClick={() => onSelect(option.kind)}
        >
          <span
            className={`friends-parity__invite-option-icon friends-parity__invite-option-icon--${option.tone}`}
          >
            <WorkspaceMaterialSymbol name={option.icon} />
          </span>
          <span>
            <strong>{option.title}</strong>
            <small>{option.subtitle}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

function memberFriendAvatar(member: MemberProfile) {
  const candidate = member.avatar;

  if (typeof candidate === "string" && candidate.trim()) {
    return candidate.trim();
  }

  return seededFriendAvatar(`${member.memberId}:${member.instanceLabel || member.displayName}`);
}

function ensureFriendAvatar(avatar: string | null | undefined, seed: string) {
  const value = avatar?.trim();

  if (value) {
    return value;
  }

  return seededFriendAvatar(seed);
}

function friendAvatarVars(avatar: string): FriendAvatarVars | undefined {
  if (!avatar.startsWith(FRIEND_AVATAR_PREFIX)) {
    return undefined;
  }

  const presetId = avatar.slice(FRIEND_AVATAR_PREFIX.length) || "orbit";
  return FRIEND_AVATAR_PRESETS[presetId] ?? FRIEND_AVATAR_PRESETS.orbit;
}

function friendAvatarImageSrc(avatar: string) {
  if (!avatar || avatar.startsWith(FRIEND_AVATAR_PREFIX) || avatar.startsWith("local:")) {
    return null;
  }

  return avatar;
}

async function renderNotificationAvatarPng(
  avatar: string | null | undefined,
  size = 64,
): Promise<number[] | null> {
  if (typeof document === "undefined" || !avatar?.trim()) {
    return null;
  }

  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    const imageSrc = friendAvatarImageSrc(avatar);
    if (imageSrc) {
      const image = await loadAvatarImage(imageSrc);
      if (!image) {
        return null;
      }
      const scale = Math.max(size / image.width, size / image.height);
      const sw = size / scale;
      const sh = size / scale;
      const sx = (image.width - sw) / 2;
      const sy = (image.height - sh) / 2;
      context.drawImage(image, sx, sy, sw, sh, 0, 0, size, size);
      return canvasToPngBytes(canvas);
    }

    const vars = friendAvatarVars(avatar);
    if (!vars) {
      return null;
    }
    drawNotificationAvatarSwatch(context, vars, size);
    return canvasToPngBytes(canvas);
  } catch {
    return null;
  }
}

function drawNotificationAvatarSwatch(
  context: CanvasRenderingContext2D,
  vars: FriendAvatarVars,
  size: number,
) {
  const background = createLinearAvatarGradient(
    context,
    size,
    vars["--avatar-bg"] ?? "#1f2937",
  );
  context.fillStyle = background;
  context.fillRect(0, 0, size, size);

  drawNotificationAvatarSpot(
    context,
    size,
    vars["--avatar-spot"] ?? "rgba(255,255,255,0.35)",
    vars["--avatar-spot-size"] ?? "72%",
    vars["--avatar-spot-x"] ?? "0%",
    vars["--avatar-spot-y"] ?? "0%",
  );
  drawNotificationAvatarSpot(
    context,
    size,
    vars["--avatar-spot-2"] ?? "rgba(255,255,255,0.2)",
    vars["--avatar-spot-2-size"] ?? "48%",
    vars["--avatar-spot-2-x"] ?? "16%",
    vars["--avatar-spot-2-y"] ?? "16%",
  );

  context.save();
  context.strokeStyle = vars["--avatar-ring"] ?? "rgba(255,255,255,0.45)";
  context.lineWidth = Math.max(1, size * 0.04);
  context.shadowColor = vars["--avatar-glow"] ?? "rgba(255,255,255,0.25)";
  context.shadowBlur = size * 0.18;
  context.beginPath();
  context.arc(size / 2, size / 2, size * 0.32, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

function createLinearAvatarGradient(
  context: CanvasRenderingContext2D,
  size: number,
  value: string,
) {
  const colors = extractAvatarColors(value);
  if (colors.length < 2) {
    return colors[0] ?? "#1f2937";
  }

  const gradient = context.createLinearGradient(0, 0, size, size);
  const start = colors[0] ?? "#1f2937";
  gradient.addColorStop(0, start);
  gradient.addColorStop(1, colors[1] ?? start);
  return gradient;
}

function drawNotificationAvatarSpot(
  context: CanvasRenderingContext2D,
  size: number,
  value: string,
  spotSize: string,
  offsetX: string,
  offsetY: string,
) {
  const colors = extractAvatarColors(value);
  const radius = (parseAvatarPercent(spotSize, 0.7) * size) / 2;
  const x = size * (0.5 + parseAvatarPercent(offsetX, 0));
  const y = size * (0.5 + parseAvatarPercent(offsetY, 0));
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, colors[0] ?? "rgba(255,255,255,0.35)");
  gradient.addColorStop(1, colors[1] ?? "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function parseAvatarPercent(value: string, fallback: number) {
  const numeric = Number.parseFloat(value.replace("%", ""));
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return numeric / 100;
}

function extractAvatarColors(value: string) {
  const matches = value.match(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)/g);
  return matches ?? [];
}

async function loadAvatarImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function canvasToPngBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (!blob) {
    return null;
  }
  const buffer = await blob.arrayBuffer();
  return Array.from(new Uint8Array(buffer));
}

function seededFriendAvatar(seed: string) {
  const presetIds = Object.keys(FRIEND_AVATAR_PRESETS);
  const index = hashFriendAvatarSeed(seed) % presetIds.length;
  return `${FRIEND_AVATAR_PREFIX}${presetIds[index] ?? "orbit"}`;
}

function hashFriendAvatarSeed(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

function FriendsMemberSection({
  language,
  title,
  entries,
  openActionMenuId,
  actionMenuPlacement,
  actionMenuMaxHeight,
  actionMenuRef,
  onToggleActionMenu,
  onCloseActionMenu,
  onOpenManage,
  onStartPrivateConversation,
  onStartContactConversation,
  onOpenMemberTerminal,
  onUpdateContactStatus,
  onUpdateMemberStatus,
  onUnavailable,
  onRemoveMember,
  onRemoveContact,
}: {
  language: AppLanguage;
  title: string;
  entries: FriendsParityEntry[];
  openActionMenuId: string | null;
  actionMenuPlacement: "top" | "bottom";
  actionMenuMaxHeight: string;
  actionMenuRef: RefObject<HTMLDivElement | null>;
  onToggleActionMenu: (entryId: string, anchor: HTMLElement | null) => void;
  onCloseActionMenu: () => void;
  onOpenManage: (entry: FriendsParityEntry) => void;
  onStartPrivateConversation: (member: MemberProfile) => void;
  onStartContactConversation: (contact: ContactProfile) => void;
  onOpenMemberTerminal: (member: MemberProfile) => void;
  onUpdateContactStatus: (contact: ContactProfile, status: MemberProfile["status"]) => void;
  onUpdateMemberStatus: (member: MemberProfile, status: MemberProfile["status"]) => void;
  onUnavailable: (capability: string) => void;
  onRemoveMember: (member: MemberProfile) => void;
  onRemoveContact: (contact: ContactProfile) => void;
}) {
  const text = FRIENDS_PARITY_TEXT[language];

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="friends-parity__section">
      <div className="friends-parity__section-heading">
        <span>{title}</span>
        <span>{entries.length}</span>
      </div>
      <div className="friends-parity__grid">
        {entries.map((entry) => {
          const isMenuOpen = openActionMenuId === entry.id;
          const canChangeStatus = Boolean(entry.member || entry.contact);
          const canOpenTerminal = Boolean(entry.member && entry.canOpenTerminal);
          const avatar = ensureFriendAvatar(entry.avatar, `${entry.scope}:${entry.id}:${entry.displayName}`);
          const avatarImageSrc = friendAvatarImageSrc(avatar);
          const statusOptions = canOpenTerminal
            ? friendsParityStatusOptions(language).filter((option) => option.id !== "working")
            : friendsParityStatusOptions(language);
          const avatarClassName = [
            "friends-parity__avatar",
            canOpenTerminal ? "friends-parity__avatar--button" : "",
            avatarImageSrc ? "friends-parity__avatar--image" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <article
              key={entry.id}
              className={
                isMenuOpen
                  ? "friends-parity__card friends-parity__card--menu-open"
                  : "friends-parity__card"
              }
            >
              <button
                type="button"
                className={avatarClassName}
                style={friendAvatarVars(avatar)}
                aria-label={`${text.openTerminal}: ${entry.displayName}`}
                aria-disabled={!canOpenTerminal}
                onClick={() => {
                  if (entry.member && canOpenTerminal) {
                    onOpenMemberTerminal(entry.member);
                  }
                }}
              >
                {avatarImageSrc ? (
                  <img src={avatarImageSrc} alt={entry.displayName} className="friends-parity__avatar-image" />
                ) : (
                  <span className="friends-parity__avatar-ring" aria-hidden="true" />
                )}
                <span className="friends-parity__status-group" aria-hidden="true">
                  <span
                    className={`friends-parity__status friends-parity__status--${entry.status}`}
                    title={memberStatusLabel(entry.status, language)}
                  />
                  {entry.terminalMeta ? (
                    <span
                      className={`friends-parity__status friends-parity__terminal-status friends-parity__terminal-status--${entry.terminalMeta}`}
                      title={terminalSessionStatusLabel(entry.terminalMeta)}
                    />
                  ) : null}
                </span>
              </button>
              <span className="friends-parity__member-copy">
                <button
                  type="button"
                  className="friends-parity__name-button"
                  onClick={() => onOpenManage(entry)}
                >
                  <span>{entry.displayName}</span>
                  <WorkspaceMaterialSymbol name="edit" />
                </button>
                <small>{entry.roleLabel}</small>
              </span>
              <span className="friends-parity__card-actions">
                <button
                  type="button"
                  title={text.sendMessage}
                  aria-label={`${text.sendMessage}: ${entry.displayName}`}
                  onClick={() => {
                    if (entry.member) {
                      onStartPrivateConversation(entry.member);
                    } else if (entry.contact) {
                      onStartContactConversation(entry.contact);
                    }
                  }}
                >
                  <WorkspaceMaterialSymbol name="chat_bubble" />
                </button>
                <span className="friends-parity__menu-anchor">
                  <button
                    type="button"
                    title={text.moreActions}
                    aria-label={`${text.moreActions}: ${entry.displayName}`}
                    data-friend-menu-toggle
                    className={isMenuOpen ? "friends-parity__icon-active" : undefined}
                    onClick={(event) => onToggleActionMenu(entry.id, event.currentTarget)}
                  >
                    <WorkspaceMaterialSymbol name="more_vert" />
                  </button>
                  {isMenuOpen ? (
                    <div
                      ref={actionMenuRef}
                      data-friend-menu
                      className={`friends-parity__action-menu friends-parity__action-menu--${actionMenuPlacement}`}
                      style={actionMenuMaxHeight ? { maxHeight: actionMenuMaxHeight } : undefined}
                    >
                      <div className="friends-parity__menu-label">{text.status}</div>
                      {statusOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className="friends-parity__status-option"
                          disabled={!canChangeStatus}
                          onClick={() => {
                            if (entry.member) {
                              onUpdateMemberStatus(entry.member, option.id);
                            } else if (entry.contact) {
                              onUpdateContactStatus(entry.contact, option.id);
                            } else {
                              onUnavailable("好友状态");
                            }
                            onCloseActionMenu();
                          }}
                        >
                          <span
                            className={`friends-parity__status-dot friends-parity__status-dot--${option.id}`}
                          />
                          {option.label}
                          {entry.status === option.id ? (
                            <WorkspaceMaterialSymbol name="check" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </span>
                {entry.canRemove ? (
                  <button
                  type="button"
                  title={text.remove}
                  aria-label={`${text.remove}: ${entry.displayName}`}
                    onClick={() => {
                      if (entry.member) {
                        onRemoveMember(entry.member);
                      } else if (entry.contact) {
                        onRemoveContact(entry.contact);
                      }
                    }}
                  >
                    <WorkspaceMaterialSymbol name="delete" />
                  </button>
                ) : null}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FriendsManageMemberModal({
  language,
  entry,
  onClose,
  onSave,
}: {
  language: AppLanguage;
  entry: FriendsParityEntry;
  onClose: () => void;
  onSave: (entry: FriendsParityEntry, displayName: string) => Promise<void>;
}) {
  const text = PARITY_INVITE_MODAL_TEXT[language].manage;
  const [name, setName] = useState(entry.displayName);
  const [isSaving, setIsSaving] = useState(false);
  const canSave = name.trim().length > 0;
  const avatar = ensureFriendAvatar(entry.avatar, `${entry.scope}:${entry.id}:${entry.displayName}`);
  const avatarImageSrc = friendAvatarImageSrc(avatar);

  useEffect(() => {
    setName(entry.displayName);
  }, [entry]);

  return (
    <div className="friends-parity__modal-backdrop friends-parity__modal-backdrop--strong" role="presentation">
      <form
        className="friends-parity__manage-modal"
        aria-label={text.ariaLabel}
        onSubmit={(event) => {
          event.preventDefault();
          if (!canSave || isSaving) {
            return;
          }
          setIsSaving(true);
          void onSave(entry, name.trim())
            .catch(() => undefined)
            .finally(() => setIsSaving(false));
        }}
      >
        <div className="friends-parity__manage-header">
          <h2>{text.title}</h2>
          <button type="button" onClick={onClose} aria-label={PARITY_INVITE_MODAL_TEXT[language].close}>
            <WorkspaceMaterialSymbol name="close" />
          </button>
        </div>
        <div className="friends-parity__manage-avatar">
          <span
            className={avatarImageSrc ? "friends-parity__manage-avatar-art friends-parity__manage-avatar-art--image" : "friends-parity__manage-avatar-art"}
            style={friendAvatarVars(avatar)}
          >
            {avatarImageSrc ? (
              <img src={avatarImageSrc} alt={entry.displayName} className="friends-parity__avatar-image" />
            ) : (
              <span className="friends-parity__avatar-ring" aria-hidden="true" />
            )}
          </span>
          <p>{entry.roleLabel}</p>
        </div>
        <label className="friends-parity__field">
          <span>{text.displayName}</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </label>
        <button type="submit" className="friends-parity__modal-submit" disabled={!canSave || isSaving}>
          {isSaving ? text.saving : text.save}
        </button>
      </form>
    </div>
  );
}

function ParityAdminInviteModal({
  language,
  onClose,
  onSubmit,
}: {
  language: AppLanguage;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const text = PARITY_INVITE_MODAL_TEXT[language];
  const [identifier, setIdentifier] = useState("");
  const permissions = text.admin.permissionsList;

  return (
    <div className="friends-parity__modal-backdrop" role="presentation">
      <form
        className="friends-parity__admin-modal"
        aria-label={text.admin.ariaLabel}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="friends-parity__admin-header">
          <span>
            <WorkspaceMaterialSymbol name="admin_panel_settings" />
          </span>
          <div>
            <h2>{text.admin.title}</h2>
            <p>{text.admin.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={text.close}>
            <WorkspaceMaterialSymbol name="close" />
          </button>
        </div>
        <div className="friends-parity__modal-body">
          <label className="friends-parity__field">
            <span>{text.admin.uniqueLink}</span>
            <div className="friends-parity__readonly-link">
              <WorkspaceMaterialSymbol name="link" />
              <input readOnly value="https://sky.chat/invite/adm_9x82m..." />
              <button type="button" aria-label={text.admin.copyInviteLink}>
                <WorkspaceMaterialSymbol name="content_copy" />
              </button>
            </div>
          </label>
          <label className="friends-parity__field">
            <span>{text.admin.userIdentifier}</span>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={text.admin.userPlaceholder}
            />
          </label>
          <div className="friends-parity__permissions-field">
            <span>{text.admin.permissions}</span>
            <div className="friends-parity__permissions">
              {permissions.map((permission) => (
                <label key={permission.title}>
                  <span className="friends-parity__permission-check">
                    <input type="checkbox" defaultChecked={permission.checked} />
                    <span>
                      <WorkspaceMaterialSymbol name="check" />
                    </span>
                  </span>
                  <span className="friends-parity__permission-copy">
                    <strong>{permission.title}</strong>
                    <small>{permission.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <button type="submit" className="friends-parity__modal-submit">
          {text.admin.send}
          <WorkspaceMaterialSymbol name="send" />
        </button>
      </form>
    </div>
  );
}

function ParityAssistantInviteModal({
  language,
  kind,
  runtimeKind,
  builtinRuntimeId,
  customRuntimeCliId,
  customRuntimeCommand,
  builtInRuntimeOptions,
  customCliRuntimeOptions,
  instanceCount,
  sandboxed,
  unlimitedAccess,
  isInviting,
  onClose,
  onRuntimeKindChange,
  onBuiltinRuntimeChange,
  onCustomRuntimeCliChange,
  onCustomRuntimeCommandChange,
  onInstanceCountChange,
  onSandboxedChange,
  onUnlimitedAccessChange,
  onSubmit,
}: {
  language: AppLanguage;
  kind: InvitedMemberType;
  runtimeKind: MemberRuntimeKind;
  builtinRuntimeId: string;
  customRuntimeCliId: string;
  customRuntimeCommand: string;
  builtInRuntimeOptions: RuntimeOption[];
  customCliRuntimeOptions: RuntimeOption[];
  instanceCount: number;
  sandboxed: boolean;
  unlimitedAccess: boolean;
  isInviting: boolean;
  onClose: () => void;
  onRuntimeKindChange: (value: MemberRuntimeKind) => void;
  onBuiltinRuntimeChange: (value: string) => void;
  onCustomRuntimeCliChange: (value: string) => void;
  onCustomRuntimeCommandChange: (value: string) => void;
  onInstanceCountChange: (value: number) => void;
  onSandboxedChange: (value: boolean) => void;
  onUnlimitedAccessChange: (value: boolean) => void;
  onSubmit: () => void;
}) {
  const text = PARITY_INVITE_MODAL_TEXT[language].assistant;
  const customRuntime = customCliRuntimeOptions.find((runtime) => runtime.id === customRuntimeCliId);
  const visibleBuiltInRuntimeOptions =
    kind === "assistant"
      ? builtInRuntimeOptions.filter((runtime) => !runtime.id.includes("terminal"))
      : builtInRuntimeOptions;
  const canSubmit =
    (runtimeKind === "builtInAiCli" ||
      (runtimeKind === "customCli" && Boolean(customRuntimeCliId || customRuntimeCommand.trim())) ||
      (runtimeKind === "shell" && customRuntimeCommand.trim().length > 0));

  return (
    <div className="friends-parity__modal-backdrop" role="presentation">
      <form
        className="friends-parity__assistant-modal"
        aria-label={kind === "assistant" ? text.assistantAriaLabel : text.memberAriaLabel}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) {
            onSubmit();
          }
        }}
      >
        <button
          type="button"
          className="friends-parity__modal-close"
          onClick={onClose}
          aria-label={PARITY_INVITE_MODAL_TEXT[language].close}
        >
          <WorkspaceMaterialSymbol name="close" />
        </button>
        <div className="friends-parity__assistant-header">
          <h2>{kind === "assistant" ? text.assistantTitle : text.memberTitle}</h2>
          <p>{text.subtitle}</p>
        </div>
        <div className="friends-parity__assistant-body custom-scrollbar">
          <div className="friends-parity__runtime-grid">
            {visibleBuiltInRuntimeOptions.map((runtime) => (
              <button
                key={runtime.id}
                type="button"
                className={
                  runtimeKind === "builtInAiCli" && builtinRuntimeId === runtime.id
                    ? "friends-parity__runtime friends-parity__runtime--active"
                    : "friends-parity__runtime"
                }
                onClick={() => {
                  onRuntimeKindChange("builtInAiCli");
                  onBuiltinRuntimeChange(runtime.id);
                }}
              >
                <span className={`friends-parity__runtime-icon friends-parity__runtime-icon--${runtimeIconTone(runtime.id)}`}>
                  <ParityRuntimeIcon runtimeId={runtime.id} />
                </span>
                <strong>{runtime.label}</strong>
                {runtimeKind === "builtInAiCli" && builtinRuntimeId === runtime.id ? (
                  <WorkspaceMaterialSymbol name="check_circle" />
                ) : null}
              </button>
            ))}
            {customCliRuntimeOptions.map((runtime) => (
              <button
                key={runtime.id}
                type="button"
                className={
                  runtimeKind === "customCli" && customRuntimeCliId === runtime.id
                    ? "friends-parity__runtime friends-parity__runtime--active"
                    : "friends-parity__runtime"
                }
                onClick={() => {
                  onRuntimeKindChange("customCli");
                  onCustomRuntimeCliChange(runtime.id);
                  onCustomRuntimeCommandChange("");
                }}
              >
                <span className="friends-parity__runtime-icon friends-parity__runtime-icon--custom">
                  <WorkspaceMaterialSymbol name="smart_toy" />
                </span>
                <strong>{runtime.label}</strong>
                {runtimeKind === "customCli" && customRuntimeCliId === runtime.id ? (
                  <WorkspaceMaterialSymbol name="check_circle" />
                ) : null}
              </button>
            ))}
          </div>
          {runtimeKind === "customCli" && customRuntime ? (
            <p className="friends-parity__runtime-command">{customRuntime.command}</p>
          ) : runtimeKind !== "builtInAiCli" ? (
            <label className="friends-parity__field">
              <span>{runtimeKind === "shell" ? text.shellCommand : text.customCliCommand}</span>
              <input
                value={customRuntimeCommand}
                onChange={(event) => onCustomRuntimeCommandChange(event.target.value)}
                placeholder={runtimeKind === "shell" ? text.shellPlaceholder : text.customCliPlaceholder}
              />
            </label>
          ) : null}
          <div className="friends-parity__modal-options">
            <label>
              <span>{text.instances}</span>
              <span className="friends-parity__stepper">
                <button
                  type="button"
                  disabled={instanceCount <= 1}
                  onClick={() => onInstanceCountChange(clampInstanceCount(instanceCount - 1))}
                >
                  <WorkspaceMaterialSymbol name="remove" />
                </button>
                <input
                  value={instanceCount}
                  aria-label={text.instanceCount}
                  inputMode="numeric"
                  onChange={(event) =>
                    onInstanceCountChange(clampInstanceCount(Number(event.target.value)))
                  }
                />
                <button
                  type="button"
                  onClick={() => onInstanceCountChange(clampInstanceCount(instanceCount + 1))}
                >
                  <WorkspaceMaterialSymbol name="add" />
                </button>
              </span>
            </label>
            <ToggleRow
              label={text.unlimitedAccess}
              description={text.unlimitedAccessDesc}
              checked={unlimitedAccess}
              onChange={onUnlimitedAccessChange}
            />
            <ToggleRow
              label={text.sandboxed}
              checked={sandboxed}
              onChange={onSandboxedChange}
            />
          </div>
        </div>
        <button
          type="submit"
          className="friends-parity__modal-submit"
          disabled={isInviting || !canSubmit}
        >
          {isInviting ? text.saving : text.send}
        </button>
      </form>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="friends-parity__toggle">
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden="true" />
    </label>
  );
}

type ParitySelectOption = {
  value: string;
  label: string;
};

function ParitySelect({
  value,
  options,
  ariaLabel,
  invalid = false,
  onChange,
}: {
  value: string;
  options: ParitySelectOption[];
  ariaLabel: string;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Select.Root value={value} onValueChange={onChange}>
      <Select.Trigger className="parity-select__trigger" aria-label={ariaLabel} aria-invalid={invalid}>
        <Select.Value />
        <Select.Icon asChild>
          <WorkspaceMaterialSymbol name="expand_more" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="parity-select__content"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
        >
          <Select.Viewport className="parity-select__viewport">
            {options.map((option) => (
              <Select.Item key={option.value} value={option.value} className="parity-select__item">
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="parity-select__indicator">
                  <WorkspaceMaterialSymbol name="check" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function ParityRuntimeIcon({ runtimeId }: { runtimeId: string }) {
  const imageSrc = runtimeImageUrl(runtimeId);

  if (imageSrc) {
    return (
      <span className="friends-parity__brand-icon friends-parity__brand-icon--image" aria-hidden="true">
        <img src={imageSrc} alt="" draggable={false} />
      </span>
    );
  }

  return <WorkspaceMaterialSymbol name={runtimeIcon(runtimeId)} />;
}

function runtimeImageUrl(runtimeId: string) {
  if (runtimeId.includes("gemini")) {
    return geminiIconUrl;
  }
  if (runtimeId.includes("codex")) {
    return codexIconUrl;
  }
  if (runtimeId.includes("claude")) {
    return claudeCodeIconUrl;
  }
  if (runtimeId === "opencode") {
    return opencodeIconUrl;
  }
  if (runtimeId === "qwen-code") {
    return qwenIconUrl;
  }
  if (runtimeId.includes("custom") || runtimeId.includes("terminal")) {
    return anyCliIconUrl;
  }
  return null;
}

function runtimeIcon(runtimeId: string) {
  if (runtimeId.includes("claude")) {
    return "psychology";
  }
  if (runtimeId.includes("codex")) {
    return "code";
  }
  if (runtimeId.includes("gemini")) {
    return "token";
  }
  if (runtimeId.includes("terminal")) {
    return "terminal";
  }
  return "smart_toy";
}

function runtimeIconTone(runtimeId: string) {
  if (runtimeId.includes("gemini")) {
    return "gemini";
  }
  if (runtimeId.includes("codex")) {
    return "codex";
  }
  if (runtimeId.includes("claude")) {
    return "claude";
  }
  if (runtimeId.includes("opencode")) {
    return "opencode";
  }
  if (runtimeId.includes("qwen")) {
    return "qwen";
  }
  if (runtimeId.includes("terminal")) {
    return "terminal";
  }
  return "custom";
}

type SettingsParitySection =
  | "account"
  | "appearance"
  | "language"
  | "members"
  | "notifications"
  | "keybinds"
  | "data";

type SettingsParityGroup = "userSettings" | "appSettings";

const SETTINGS_PARITY_GROUPS: SettingsParityGroup[] = ["userSettings", "appSettings"];

const SETTINGS_PARITY_TEXT = {
  "zh-CN": {
    settings: "设置",
    preferences: "偏好设置",
    preferencesSubtitle: "自定义账号、通知、终端默认值与本地数据。",
    userSettings: "用户设置",
    appSettings: "应用设置",
    createTeam: "新建团队",
    leaveTeam: "退出团队",
    sections: {
      account: {
        label: "我的账号",
        subtitle: "管理工作区成员可见的资料与状态。",
      },
      appearance: {
        label: "外观",
        subtitle: "切换主题并匹配你的工作环境。",
      },
      language: {
        label: "语言",
        subtitle: "文案和菜单会立即更新。",
      },
      members: {
        label: "默认成员",
        navLabel: "成员",
        subtitle: "邀请成员时使用的 CLI 与终端命令。",
      },
      notifications: {
        label: "通知",
        subtitle: "配置桌面通知、声音、预览、提及提醒和静默时段。",
      },
      keybinds: {
        label: "快捷键",
        subtitle: "配置快捷键方案和每个操作的可用状态。",
      },
      data: {
        label: "数据",
        subtitle: "维护当前工作区聊天数据与终端输出模式。",
      },
    },
    avatar: {
      change: "更换头像",
      title: "头像",
      subtitle: "选择预设或上传的个人头像。",
      presets: "头像预设",
      selectPreset: "选择 {label} 头像预设",
      uploads: "已上传",
      useUploaded: "使用上传头像 {name}",
      deleteUploaded: "删除上传头像",
      uploading: "上传中",
      upload: "上传图片",
      reset: "恢复样式",
    },
    profile: {
      displayName: "显示名称",
      displayNamePlaceholder: "Owner",
      status: "状态",
      statuses: {
        online: "在线",
        working: "工作中",
        doNotDisturb: "请勿打扰",
        offline: "离线",
      },
      timezone: "时区",
      statusMessage: "状态信息",
      statusMessagePlaceholder: "分享你正在做的事情",
      loading: "正在加载已保存资料",
      updated: "更新时间：{time}",
      saving: "正在保存资料",
      save: "保存资料",
    },
    themeOptions: {
      system: {
        label: "系统",
        desc: "跟随操作系统外观设置。",
      },
      dark: {
        label: "深色",
        desc: "默认深色玻璃界面。",
      },
      light: {
        label: "浅色",
        desc: "明亮的系统界面。",
      },
    },
    languageOptions: {
      "en-US": "英文（美国）",
      "zh-CN": "中文（简体）",
    },
    terminal: {
      loading: "正在加载 CLI 配置",
      updated: "更新时间：{time}",
      resetDefaults: "恢复默认",
      selectMember: "选择成员",
      notConfigured: "未配置",
      builtIn: "内置",
      custom: "自定义",
      command: "{label} 命令",
      actionsFor: "{label} 的操作",
      test: "测试",
      edit: "更改",
      remove: "删除",
      customCli: "自定义 CLI",
      memberName: "成员名称",
      memberNamePlaceholder: "本地评审",
      commandInput: "命令",
      commandPlaceholder: "reviewer --stdio",
      cancelMember: "取消自定义成员",
      confirmMember: "确认自定义成员",
      selectTerminal: "选择终端",
      auto: "自动",
      systemShell: "系统 shell",
      customTerminal: "自定义终端",
      noPath: "未配置路径",
      terminalName: "终端名称",
      terminalNamePlaceholder: "工作区 Zsh",
      terminalPath: "终端路径",
      terminalPathPlaceholder: "/bin/zsh",
      cancelTerminal: "取消自定义终端",
      confirmTerminal: "确认自定义终端",
      savedMeta: "已保存的终端配置会用于终端窗口和成员运行时。",
      saving: "正在保存 CLI",
      save: "保存 CLI 和终端",
    },
    notifications: {
      desktop: "桌面通知",
      sound: "声音提醒",
      mentionsOnly: "仅提醒提及",
      previews: "消息预览",
      quietHours: "静默时段",
      from: "开始时间",
      to: "结束时间",
      permission: "权限：{message}",
      loading: "正在加载通知偏好",
      updated: "更新时间：{time}",
      saving: "正在保存通知",
      save: "保存通知",
    },
    keybinds: {
      profile: "键位方案",
      default: "默认",
      shortcutsEnabled: "启用快捷键",
      showHints: "显示快捷键提示",
      unavailable: "不可用",
      enabled: "已启用",
      disabled: "已禁用",
      shortcutLabel: "{label} 快捷键",
      loading: "正在加载快捷键偏好",
      updated: "更新时间：{time}",
      reset: "恢复默认",
      saving: "正在保存快捷键",
      save: "保存快捷键",
    },
    data: {
      streamTitle: "聊天流式输出",
      currentMode: "当前已保存模式：{mode}",
      stream: "流式输出",
      finalOnly: "仅最终输出",
      streamToggle: "将终端输出流式写入聊天",
      loadingOutput: "正在加载聊天输出",
      savingOutput: "正在保存输出",
      saveOutput: "保存聊天输出",
      maintenanceTitle: "聊天数据维护",
      repairing: "修复中",
      repair: "修复消息",
      clearing: "清空中",
      clear: "清空所有消息",
    },
  },
  "en-US": {
    settings: "Settings",
    preferences: "Preferences",
    preferencesSubtitle: "Manage account, app behavior, terminal defaults, and local data.",
    userSettings: "User Settings",
    appSettings: "App Settings",
    createTeam: "Create Team",
    leaveTeam: "Leave Team",
    sections: {
      account: {
        label: "My Account",
        subtitle: "Profile and presence shown to workspace members.",
      },
      appearance: {
        label: "Appearance",
        subtitle: "Theme follows Golutra visual tokens across windows.",
      },
      language: {
        label: "Language",
        subtitle: "Copy and menus update immediately.",
      },
      members: {
        label: "Default Member",
        navLabel: "Members",
        subtitle: "CLI and terminal commands used when members are invited.",
      },
      notifications: {
        label: "Notifications",
        subtitle: "Desktop, sound, preview, mention-only and quiet hours.",
      },
      keybinds: {
        label: "Keybinds",
        subtitle: "Shortcut profile and per-action availability.",
      },
      data: {
        label: "Data",
        subtitle: "Workspace chat maintenance and chat terminal output mode.",
      },
    },
    avatar: {
      change: "Change avatar",
      title: "Avatar",
      subtitle: "Choose a preset or uploaded profile image.",
      presets: "Avatar presets",
      selectPreset: "Select {label} avatar preset",
      uploads: "Uploads",
      useUploaded: "Use uploaded avatar {name}",
      deleteUploaded: "Delete uploaded avatar",
      uploading: "Uploading",
      upload: "Upload",
      reset: "Reset",
    },
    profile: {
      displayName: "Display Name",
      displayNamePlaceholder: "Owner",
      status: "Status",
      statuses: {
        online: "Online",
        working: "Working",
        doNotDisturb: "Do not disturb",
        offline: "Offline",
      },
      timezone: "Time Zone",
      statusMessage: "Status Message",
      statusMessagePlaceholder: "What are you working on?",
      loading: "Loading saved profile",
      updated: "Updated {time}",
      saving: "Saving profile",
      save: "Save profile",
    },
    themeOptions: {
      system: {
        label: "System",
        desc: "Follow OS preference.",
      },
      dark: {
        label: "Dark",
        desc: "Golutra dark glass shell.",
      },
      light: {
        label: "Light",
        desc: "Bright system surfaces.",
      },
    },
    languageOptions: {
      "en-US": "English (United States)",
      "zh-CN": "Chinese (Simplified)",
    },
    terminal: {
      loading: "Loading CLI configuration",
      updated: "Updated {time}",
      resetDefaults: "Reset defaults",
      selectMember: "Select Member",
      notConfigured: "Not configured",
      builtIn: "Built-in",
      custom: "Custom",
      command: "{label} command",
      actionsFor: "Actions for {label}",
      test: "Test",
      edit: "Edit",
      remove: "Remove",
      customCli: "Custom CLI",
      memberName: "Member Name",
      memberNamePlaceholder: "Local Reviewer",
      commandInput: "Command",
      commandPlaceholder: "reviewer --stdio",
      cancelMember: "Cancel custom member",
      confirmMember: "Confirm custom member",
      selectTerminal: "Select Terminal",
      auto: "Auto",
      systemShell: "System shell",
      customTerminal: "Custom Terminal",
      noPath: "No path configured",
      terminalName: "Terminal Name",
      terminalNamePlaceholder: "Workspace Zsh",
      terminalPath: "Terminal Path",
      terminalPathPlaceholder: "/bin/zsh",
      cancelTerminal: "Cancel custom terminal",
      confirmTerminal: "Confirm custom terminal",
      savedMeta: "Saved terminal configuration is used by terminal windows and member runtimes.",
      saving: "Saving CLI",
      save: "Save CLI and terminal",
    },
    notifications: {
      desktop: "Desktop notifications",
      sound: "Sound",
      mentionsOnly: "Mentions only",
      previews: "Message previews",
      quietHours: "Quiet hours",
      from: "From",
      to: "To",
      permission: "Permission: {message}",
      loading: "Loading notification preferences",
      updated: "Updated {time}",
      saving: "Saving notifications",
      save: "Save notifications",
    },
    keybinds: {
      profile: "Profile",
      default: "Default",
      shortcutsEnabled: "Shortcuts enabled",
      showHints: "Show hints",
      unavailable: "Unavailable",
      enabled: "Enabled",
      disabled: "Disabled",
      shortcutLabel: "{label} shortcut",
      loading: "Loading shortcut preferences",
      updated: "Updated {time}",
      reset: "Reset",
      saving: "Saving shortcuts",
      save: "Save shortcuts",
    },
    data: {
      streamTitle: "Chat stream output",
      currentMode: "Current saved mode: {mode}",
      stream: "Stream",
      finalOnly: "Final only",
      streamToggle: "Stream terminal output into chat",
      loadingOutput: "Loading chat output",
      savingOutput: "Saving output",
      saveOutput: "Save chat output",
      maintenanceTitle: "Chat data maintenance",
      repairing: "Repairing",
      repair: "Repair messages",
      clearing: "Clearing",
      clear: "Clear all messages",
    },
  },
} as const;

function SettingsParity({
  profileDraft,
  savedProfile,
  notificationDraft,
  savedNotificationPreferences,
  shortcutDraft,
  savedShortcutPreferences,
  chatTerminalOutputDraft,
  savedChatTerminalOutputPreferences,
  terminalDraft,
  savedTerminalConfiguration,
  activeWorkspaceId,
  activeWorkspaceName,
  chatMaintenanceResult,
  fieldError,
  notificationError,
  shortcutError,
  chatTerminalOutputError,
  terminalError,
  isLoading,
  isSaving,
  isNotificationLoading,
  isNotificationSaving,
  isShortcutLoading,
  isShortcutSaving,
  isChatTerminalOutputLoading,
  isChatTerminalOutputSaving,
  isRepairingChatData,
  isClearingWorkspaceChatData,
  isTerminalLoading,
  isTerminalSaving,
  pendingAvatarAction,
  theme,
  language,
  onDraftChange,
  onNotificationDraftChange,
  onShortcutDraftChange,
  onChatTerminalOutputDraftChange,
  onTerminalDraftChange,
  onUploadAvatar,
  onSelectAvatarPreset,
  onResetAvatar,
  onDeleteUploadedAvatar,
  onSave,
  onSaveNotifications,
  onSaveShortcuts,
  onResetShortcuts,
  onSaveChatTerminalOutput,
  onRepairChatData,
  onClearWorkspaceChatData,
  onSaveTerminalConfiguration,
  onResetTerminalConfiguration,
  onTestTerminal,
  onThemeChange,
  onLanguageChange,
}: {
  profileDraft: ProfileSettingsDraft;
  savedProfile: ProfileSettingsSnapshot;
  notificationDraft: NotificationPreferencesDraft;
  savedNotificationPreferences: NotificationPreferencesSnapshot;
  shortcutDraft: ShortcutPreferencesDraft;
  savedShortcutPreferences: ShortcutPreferencesSnapshot;
  chatTerminalOutputDraft: ChatTerminalOutputPreferencesDraft;
  savedChatTerminalOutputPreferences: ChatTerminalOutputPreferencesSnapshot;
  terminalDraft: TerminalConfigurationDraft;
  savedTerminalConfiguration: TerminalConfigurationSnapshot;
  activeWorkspaceId: string | null;
  activeWorkspaceName: string | null;
  chatMaintenanceResult: ChatMaintenanceResultView | null;
  fieldError: { field: ProfileSettingsField; message: string } | null;
  notificationError: string | null;
  shortcutError: string | null;
  chatTerminalOutputError: string | null;
  terminalError: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isNotificationLoading: boolean;
  isNotificationSaving: boolean;
  isShortcutLoading: boolean;
  isShortcutSaving: boolean;
  isChatTerminalOutputLoading: boolean;
  isChatTerminalOutputSaving: boolean;
  isRepairingChatData: boolean;
  isClearingWorkspaceChatData: boolean;
  isTerminalLoading: boolean;
  isTerminalSaving: boolean;
  pendingAvatarAction: ProfileAvatarAction | null;
  theme: AppTheme;
  language: AppLanguage;
  onDraftChange: (draft: ProfileSettingsDraft) => void;
  onNotificationDraftChange: (draft: NotificationPreferencesDraft) => void;
  onShortcutDraftChange: (draft: ShortcutPreferencesDraft) => void;
  onChatTerminalOutputDraftChange: (draft: ChatTerminalOutputPreferencesDraft) => void;
  onTerminalDraftChange: (draft: TerminalConfigurationDraft) => void;
  onUploadAvatar: () => void;
  onSelectAvatarPreset: (presetId: string) => void;
  onResetAvatar: () => void;
  onDeleteUploadedAvatar: () => void;
  onSave: () => void;
  onSaveNotifications: () => void;
  onSaveShortcuts: () => void;
  onResetShortcuts: () => void;
  onSaveChatTerminalOutput: () => void;
  onRepairChatData: () => void;
  onClearWorkspaceChatData: () => void;
  onSaveTerminalConfiguration: () => void;
  onResetTerminalConfiguration: () => void;
  onTestTerminal: () => void;
  onThemeChange: (theme: AppTheme) => void;
  onLanguageChange: (language: AppLanguage) => void;
}) {
  const [activeSection, setActiveSection] = useState<SettingsParitySection>("account");
  const settingsText = SETTINGS_PARITY_TEXT[language];
  const canSaveProfile =
    profileDraft.displayName.trim().length > 0 && profileDraft.timezone.trim().length > 0;
  const canSaveNotifications =
    !isNotificationSaving &&
    notificationDraft.dndStartTime.length === 5 &&
    notificationDraft.dndEndTime.length === 5;
  const disabledShortcutIds = new Set(shortcutDraft.disabledActionIds);
  const displayedShortcutBindings = shortcutBindingsForDraftProfile(
    shortcutDraft.profile,
    shortcutDraft.disabledActionIds,
  );
  const workspaceScope = activeWorkspaceName
    ? `${activeWorkspaceName} · ${activeWorkspaceId ?? "browser-workspace"}`
    : (activeWorkspaceId ?? "No workspace");
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  const [avatarMenuPosition, setAvatarMenuPosition] = useState({ left: 0, top: 0 });
  const avatarButtonRef = useRef<HTMLButtonElement | null>(null);
  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const selectedPresetId =
    savedProfile.avatar?.kind === "preset" ? savedProfile.avatar.presetId : null;
  const currentUploadedAvatar =
    savedProfile.avatar?.kind === "uploaded" ? savedProfile.avatar : null;
  const avatarMenuStyle: CSSProperties = {
    left: avatarMenuPosition.left,
    top: avatarMenuPosition.top,
  };
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);
  const [customMemberForm, setCustomMemberForm] = useState<{
    mode: "add" | "edit";
    index: number | null;
    label: string;
    command: string;
  } | null>(null);
  const [openTerminalMenuId, setOpenTerminalMenuId] = useState<string | null>(null);
  const [customTerminalForm, setCustomTerminalForm] = useState<{
    mode: "add" | "edit";
    index: number | null;
    label: string;
    command: string;
  } | null>(null);

  const settingSections: Array<{
    id: SettingsParitySection;
    icon: string;
    label: string;
    group: SettingsParityGroup;
  }> = [
    { id: "account", icon: "person", label: settingsText.sections.account.label, group: "userSettings" },
    { id: "appearance", icon: "palette", label: settingsText.sections.appearance.label, group: "appSettings" },
    { id: "language", icon: "translate", label: settingsText.sections.language.label, group: "appSettings" },
    {
      id: "members",
      icon: "groups",
      label: settingsText.sections.members.navLabel,
      group: "appSettings",
    },
    {
      id: "notifications",
      icon: "notifications",
      label: settingsText.sections.notifications.label,
      group: "appSettings",
    },
    {
      id: "keybinds",
      icon: "keyboard_command_key",
      label: settingsText.sections.keybinds.label,
      group: "appSettings",
    },
    { id: "data", icon: "database", label: settingsText.sections.data.label, group: "appSettings" },
  ];

  const updateShortcutActionEnabled = (actionId: string, enabled: boolean) => {
    const disabledActionIds = enabled
      ? shortcutDraft.disabledActionIds.filter((item) => item !== actionId)
      : Array.from(new Set([...shortcutDraft.disabledActionIds, actionId])).sort();

    onShortcutDraftChange({ ...shortcutDraft, disabledActionIds });
  };

  const updateBuiltInCommand = (runtimeId: string, command: string) => {
    onTerminalDraftChange({
      ...terminalDraft,
      builtInCliEntries: terminalDraft.builtInCliEntries.map((entry) =>
        entry.runtimeId === runtimeId ? { ...entry, command } : entry,
      ),
    });
  };

  const clampAvatarMenu = () => {
    const menu = avatarMenuRef.current;

    if (!menu) {
      return;
    }

    const rect = menu.getBoundingClientRect();
    const padding = 12;
    const maxLeft = window.innerWidth - rect.width - padding;
    const maxTop = window.innerHeight - rect.height - padding;

    setAvatarMenuPosition((position) => ({
      left: Math.max(padding, Math.min(position.left, maxLeft)),
      top: Math.max(padding, Math.min(position.top, maxTop)),
    }));
  };

  const toggleAvatarMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (isAvatarMenuOpen) {
      setIsAvatarMenuOpen(false);
      return;
    }

    const buttonRect = avatarButtonRef.current?.getBoundingClientRect();
    setAvatarMenuPosition({
      left: event.clientX || buttonRect?.left || 12,
      top: event.clientY || (buttonRect ? buttonRect.bottom + 8 : 12),
    });
    setIsAvatarMenuOpen(true);
  };

  useEffect(() => {
    if (!isAvatarMenuOpen) {
      return undefined;
    }

    const animationFrame = window.requestAnimationFrame(clampAvatarMenu);
    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;

      if (
        target &&
        (avatarMenuRef.current?.contains(target) || avatarButtonRef.current?.contains(target))
      ) {
        return;
      }

      setIsAvatarMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAvatarMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", clampAvatarMenu);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", clampAvatarMenu);
    };
  }, [isAvatarMenuOpen]);

  const closeActionMenus = () => {
    setOpenMemberMenuId(null);
    setOpenTerminalMenuId(null);
  };

  const openCustomMemberForm = () => {
    closeActionMenus();
    setCustomMemberForm({ mode: "add", index: null, label: "", command: "" });
  };

  const startEditCustomMember = (entry: TerminalCustomCliEntry, index: number) => {
    closeActionMenus();
    setCustomMemberForm({
      mode: "edit",
      index,
      label: entry.label,
      command: entry.command,
    });
  };

  const applyCustomMember = () => {
    if (!customMemberForm) {
      return;
    }

    const label = customMemberForm.label.trim() || settingsText.terminal.customCli;
    const command = customMemberForm.command.trim();

    if (!command) {
      return;
    }

    if (customMemberForm.mode === "edit" && customMemberForm.index !== null) {
      onTerminalDraftChange({
        ...terminalDraft,
        customCliEntries: terminalDraft.customCliEntries.map((entry, index) =>
          index === customMemberForm.index ? { ...entry, label, command } : entry,
        ),
      });
    } else {
      onTerminalDraftChange({
        ...terminalDraft,
        customCliEntries: [
          ...terminalDraft.customCliEntries,
          {
            cliId: nextTerminalConfigId(
              "custom-cli",
              terminalDraft.customCliEntries.map((entry) => entry.cliId),
            ),
            label,
            command,
          },
        ],
      });
    }

    setCustomMemberForm(null);
  };

  const removeCustomMember = (entryIndex: number) => {
    closeActionMenus();
    onTerminalDraftChange({
      ...terminalDraft,
      customCliEntries: terminalDraft.customCliEntries.filter((_, index) => index !== entryIndex),
    });

    if (customMemberForm?.index === entryIndex) {
      setCustomMemberForm(null);
    }
  };

  const openCustomTerminalForm = () => {
    closeActionMenus();
    setCustomTerminalForm({ mode: "add", index: null, label: "", command: "" });
  };

  const startEditCustomTerminal = (entry: TerminalCustomTerminalEntry, index: number) => {
    closeActionMenus();
    setCustomTerminalForm({
      mode: "edit",
      index,
      label: entry.label,
      command: entry.command,
    });
  };

  const applyCustomTerminal = () => {
    if (!customTerminalForm) {
      return;
    }

    const label = customTerminalForm.label.trim() || settingsText.terminal.customTerminal;
    const command = customTerminalForm.command.trim();

    if (!command) {
      return;
    }

    if (customTerminalForm.mode === "edit" && customTerminalForm.index !== null) {
      onTerminalDraftChange({
        ...terminalDraft,
        customTerminalEntries: terminalDraft.customTerminalEntries.map((entry, index) =>
          index === customTerminalForm.index ? { ...entry, label, command } : entry,
        ),
      });
    } else {
      const terminalId = nextTerminalConfigId(
        "terminal",
        terminalDraft.customTerminalEntries.map((entry) => entry.terminalId),
      );
      onTerminalDraftChange({
        ...terminalDraft,
        customTerminalEntries: [
          ...terminalDraft.customTerminalEntries,
          {
            terminalId,
            label,
            command,
          },
        ],
        defaultTerminalId: terminalDraft.defaultTerminalId ?? terminalId,
      });
    }

    setCustomTerminalForm(null);
  };

  const removeCustomTerminal = (entryIndex: number) => {
    closeActionMenus();
    const removedEntry = terminalDraft.customTerminalEntries[entryIndex];

    onTerminalDraftChange({
      ...terminalDraft,
      customTerminalEntries: terminalDraft.customTerminalEntries.filter(
        (_, index) => index !== entryIndex,
      ),
      defaultTerminalId:
        terminalDraft.defaultTerminalId === removedEntry?.terminalId
          ? null
          : terminalDraft.defaultTerminalId,
    });

    if (customTerminalForm?.index === entryIndex) {
      setCustomTerminalForm(null);
    }
  };

  return (
    <section className="settings-parity" aria-label={settingsText.settings}>
      <aside className="settings-parity__rail">
        <div className="settings-parity__rail-title">
          <h1>{settingsText.settings}</h1>
        </div>
        <div className="settings-parity__rail-scroll custom-scrollbar">
          {SETTINGS_PARITY_GROUPS.map((group) => (
            <div key={group} className="settings-parity__rail-group">
              <h2>{settingsText[group]}</h2>
              <div className="settings-parity__rail-items">
                {settingSections
                  .filter((section) => section.group === group)
                  .map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      title={section.label}
                      className={
                        activeSection === section.id
                          ? "settings-parity__rail-button settings-parity__rail-button--active"
                          : "settings-parity__rail-button"
                      }
                      onClick={() => {
                        setActiveSection(section.id);
                        document
                          .getElementById(`settings-${section.id}`)
                          ?.scrollIntoView({ block: "start", behavior: "smooth" });
                      }}
                    >
                      <WorkspaceMaterialSymbol name={section.icon} />
                      <span>{section.label}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
          <div className="settings-parity__rail-actions">
            <button type="button" onClick={() => setActiveSection("members")}>
              <WorkspaceMaterialSymbol name="group_add" />
              <span>{settingsText.createTeam}</span>
            </button>
            <button type="button" className="settings-parity__danger">
              <WorkspaceMaterialSymbol name="logout" />
              <span>{settingsText.leaveTeam}</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="settings-parity__content custom-scrollbar">
        <div className="settings-parity__content-inner">
          <header className="settings-parity__header">
            <h1>{settingsText.preferences}</h1>
            <p>{settingsText.preferencesSubtitle}</p>
          </header>

          <SettingsSection
            id="settings-account"
            icon="person"
            title={settingsText.sections.account.label}
            subtitle={settingsText.sections.account.subtitle}
          >
            <div className="settings-parity__account-card">
              <div className="settings-parity__avatar-stack">
                <button
                  ref={avatarButtonRef}
                  type="button"
                  className="settings-parity__avatar-button"
                  aria-haspopup="menu"
                  aria-expanded={isAvatarMenuOpen}
                  aria-label={settingsText.avatar.change}
                  onClick={toggleAvatarMenu}
                >
                  <AvatarPreview
                    avatar={savedProfile.avatar}
                    displayName={profileDraft.displayName}
                    size="lg"
                  />
                  <i aria-hidden="true">
                    <WorkspaceMaterialSymbol name="edit" />
                  </i>
                </button>
                <span>{profileAvatarLabel(savedProfile.avatar, language)}</span>
                {isAvatarMenuOpen ? (
                  <div
                    ref={avatarMenuRef}
                    className="settings-parity__avatar-menu"
                    role="menu"
                    style={avatarMenuStyle}
                  >
                    <div className="settings-parity__avatar-menu-head">
                      <strong>{settingsText.avatar.title}</strong>
                      <span>{settingsText.avatar.subtitle}</span>
                    </div>
                    <div className="settings-parity__avatar-grid" aria-label={settingsText.avatar.presets}>
                      {PROFILE_AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          role="menuitem"
                          aria-label={settingsText.avatar.selectPreset.replace("{label}", preset.label)}
                          className="settings-parity__avatar-choice"
                          disabled={pendingAvatarAction !== null}
                          onClick={() => {
                            setIsAvatarMenuOpen(false);
                            onSelectAvatarPreset(preset.id);
                          }}
                        >
                          <span
                            className={`settings-parity__avatar-choice-swatch ${preset.className}`}
                          >
                            {preset.label.slice(0, 1)}
                          </span>
                          {selectedPresetId === preset.id ? (
                            <b aria-hidden="true">
                              <WorkspaceMaterialSymbol name="check" />
                            </b>
                          ) : null}
                        </button>
                      ))}
                    </div>
                    {currentUploadedAvatar ? (
                      <div className="settings-parity__avatar-uploads">
                        <strong>{settingsText.avatar.uploads}</strong>
                        <div className="settings-parity__avatar-grid">
                          <div className="settings-parity__avatar-upload-tile">
                            <button
                              type="button"
                              role="menuitem"
                              aria-label={settingsText.avatar.useUploaded.replace(
                                "{name}",
                                currentUploadedAvatar.sourceFileName ?? "upload",
                              )}
                              onClick={() => setIsAvatarMenuOpen(false)}
                            >
                              <AvatarPreview
                                avatar={currentUploadedAvatar}
                                displayName={profileDraft.displayName}
                                size="md"
                              />
                              <b aria-hidden="true">
                                <WorkspaceMaterialSymbol name="check" />
                              </b>
                            </button>
                            <button
                              type="button"
                              aria-label={settingsText.avatar.deleteUploaded}
                              disabled={pendingAvatarAction !== null}
                              onClick={() => {
                                setIsAvatarMenuOpen(false);
                                onDeleteUploadedAvatar();
                              }}
                            >
                              <WorkspaceMaterialSymbol name="close" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="settings-parity__avatar-menu-actions">
                      <button
                        type="button"
                        role="menuitem"
                        disabled={pendingAvatarAction !== null}
                        onClick={() => {
                          setIsAvatarMenuOpen(false);
                          onUploadAvatar();
                        }}
                      >
                        <WorkspaceMaterialSymbol name="upload" />
                        {pendingAvatarAction === "upload"
                          ? settingsText.avatar.uploading
                          : settingsText.avatar.upload}
                      </button>
                      {currentUploadedAvatar ? (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={pendingAvatarAction !== null}
                          onClick={() => {
                            setIsAvatarMenuOpen(false);
                            onResetAvatar();
                          }}
                        >
                          <WorkspaceMaterialSymbol name="restart_alt" />
                          {settingsText.avatar.reset}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="settings-parity__form-grid">
                <label className="settings-parity__field">
                  <span>{settingsText.profile.displayName}</span>
                  <input
                    value={profileDraft.displayName}
                    aria-invalid={fieldError?.field === "displayName"}
                    onChange={(event) =>
                      onDraftChange({ ...profileDraft, displayName: event.target.value })
                    }
                    placeholder={settingsText.profile.displayNamePlaceholder}
                  />
                  {fieldError?.field === "displayName" ? <em>{fieldError.message}</em> : null}
                </label>
                <div className="settings-parity__field">
                  <span>{settingsText.profile.status}</span>
                  <ParitySelect
                    value={profileDraft.status}
                    ariaLabel={settingsText.profile.status}
                    options={[
                      { value: "online", label: settingsText.profile.statuses.online },
                      { value: "working", label: settingsText.profile.statuses.working },
                      { value: "doNotDisturb", label: settingsText.profile.statuses.doNotDisturb },
                      { value: "offline", label: settingsText.profile.statuses.offline },
                    ]}
                    onChange={(value) =>
                      onDraftChange({
                        ...profileDraft,
                        status: value as ProfileStatus,
                      })
                    }
                  />
                </div>
                <div className="settings-parity__field">
                  <span>{settingsText.profile.timezone}</span>
                  <ParitySelect
                    value={profileDraft.timezone}
                    ariaLabel={settingsText.profile.timezone}
                    invalid={fieldError?.field === "timezone"}
                    options={PROFILE_TIMEZONE_OPTIONS.map((timezone) => ({
                      value: timezone,
                      label: timezone,
                    }))}
                    onChange={(value) =>
                      onDraftChange({ ...profileDraft, timezone: value })
                    }
                  />
                  {fieldError?.field === "timezone" ? <em>{fieldError.message}</em> : null}
                </div>
                <label className="settings-parity__field settings-parity__field--wide">
                  <span>{settingsText.profile.statusMessage}</span>
                  <textarea
                    value={profileDraft.statusMessage}
                    maxLength={160}
                    rows={3}
                    onChange={(event) =>
                      onDraftChange({ ...profileDraft, statusMessage: event.target.value })
                    }
                    placeholder={settingsText.profile.statusMessagePlaceholder}
                  />
                </label>
              </div>
            </div>
            <SettingsActions
              meta={
                isLoading
                  ? settingsText.profile.loading
                  : settingsText.profile.updated.replace(
                      "{time}",
                      formatDateTime(savedProfile.updatedAtMs),
                    )
              }
              primaryLabel={isSaving ? settingsText.profile.saving : settingsText.profile.save}
              primaryDisabled={isSaving || !canSaveProfile}
              onPrimary={onSave}
            />
          </SettingsSection>

          <SettingsDivider />

          <SettingsSection
            id="settings-appearance"
            icon="palette"
            title={settingsText.sections.appearance.label}
            subtitle={settingsText.sections.appearance.subtitle}
          >
            <div className="settings-parity__theme-grid">
              {(["system", "dark", "light"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    theme === option
                      ? "settings-parity__theme settings-parity__theme--active"
                      : "settings-parity__theme"
                  }
                  onClick={() => onThemeChange(option)}
                >
                  <span>
                    <strong>{themeOptionLabel(option, language)}</strong>
                    {theme === option ? <WorkspaceMaterialSymbol name="check" /> : null}
                  </span>
                  <i data-theme-preview={option}>
                    <b />
                    <b />
                    <b />
                  </i>
                  <small>{themeOptionDescription(option, language)}</small>
                </button>
              ))}
            </div>
          </SettingsSection>

          <SettingsDivider />

          <SettingsSection
            id="settings-language"
            icon="translate"
            title={settingsText.sections.language.label}
            subtitle={settingsText.sections.language.subtitle}
          >
            <div className="settings-parity__language-card">
              {(["en-US", "zh-CN"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    language === option
                      ? "settings-parity__language-row settings-parity__language-row--active"
                      : "settings-parity__language-row"
                  }
                  onClick={() => onLanguageChange(option)}
                >
                  <span>{option === "en-US" ? "🇺🇸" : "🇨🇳"}</span>
                  <strong>{settingsText.languageOptions[option]}</strong>
                  {language === option ? <WorkspaceMaterialSymbol name="check" /> : null}
                </button>
              ))}
            </div>
          </SettingsSection>

          <SettingsDivider />

          <SettingsSection
            id="settings-members"
            icon="groups"
            title={settingsText.sections.members.label}
            subtitle={settingsText.sections.members.subtitle}
          >
            <div className="settings-parity__terminal-card">
              <div className="settings-parity__card-head">
                <span>
                  {isTerminalLoading
                    ? settingsText.terminal.loading
                    : settingsText.terminal.updated.replace(
                        "{time}",
                        formatDateTime(savedConfigurationDate(savedTerminalConfiguration)),
                      )}
                </span>
                <button type="button" onClick={onResetTerminalConfiguration} disabled={isTerminalSaving}>
                  {settingsText.terminal.resetDefaults}
                </button>
              </div>

              <div className="settings-parity__settings-block">
                <div className="settings-parity__subhead">
                  <span>{settingsText.terminal.selectMember}</span>
                </div>
                <div className="settings-parity__member-grid" onClick={closeActionMenus}>
                  {terminalDraft.builtInCliEntries.map((entry) => (
                    <div
                      key={entry.runtimeId}
                      className="settings-parity__member-card"
                      data-runtime-tone={runtimeIconTone(entry.runtimeId)}
                    >
                      <div className="settings-parity__member-icon">
                        <ParityRuntimeIcon runtimeId={entry.runtimeId} />
                      </div>
                      <div className="settings-parity__member-card-copy">
                        <strong>{entry.label}</strong>
                        <span>{entry.command || settingsText.terminal.notConfigured}</span>
                        <em>{settingsText.terminal.builtIn}</em>
                      </div>
                      <label className="settings-parity__card-command" onClick={(event) => event.stopPropagation()}>
                        <span>{settingsText.terminal.command.replace("{label}", entry.label)}</span>
                        <input
                          aria-label={settingsText.terminal.command.replace("{label}", entry.label)}
                          value={entry.command}
                          onChange={(event) => updateBuiltInCommand(entry.runtimeId, event.target.value)}
                        />
                      </label>
                      <div className="settings-parity__card-menu-anchor">
                        <button
                          type="button"
                          aria-label={settingsText.terminal.actionsFor.replace("{label}", entry.label)}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMemberMenuId(
                              openMemberMenuId === entry.runtimeId ? null : entry.runtimeId,
                            );
                          }}
                        >
                          <WorkspaceMaterialSymbol name="more_vert" />
                        </button>
                        {openMemberMenuId === entry.runtimeId ? (
                          <div className="settings-parity__card-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                            <button type="button" role="menuitem" onClick={onTestTerminal}>
                              {settingsText.terminal.test}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {terminalDraft.customCliEntries.map((entry, index) => (
                    <div
                      key={entry.cliId}
                      className="settings-parity__member-card"
                      data-runtime-tone="custom"
                    >
                      <div className="settings-parity__member-icon">
                        <WorkspaceMaterialSymbol name="smart_toy" />
                      </div>
                      <div className="settings-parity__member-card-copy">
                        <strong>{entry.label || settingsText.terminal.customCli}</strong>
                        <span>{entry.command || settingsText.terminal.notConfigured}</span>
                        <em>{settingsText.terminal.custom}</em>
                      </div>
                      <div className="settings-parity__card-menu-anchor">
                        <button
                          type="button"
                          aria-label={settingsText.terminal.actionsFor.replace(
                            "{label}",
                            entry.label || entry.cliId,
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenMemberMenuId(
                              openMemberMenuId === entry.cliId ? null : entry.cliId,
                            );
                          }}
                        >
                          <WorkspaceMaterialSymbol name="more_vert" />
                        </button>
                        {openMemberMenuId === entry.cliId ? (
                          <div className="settings-parity__card-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                            <button type="button" role="menuitem" onClick={onTestTerminal}>
                              {settingsText.terminal.test}
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => startEditCustomMember(entry, index)}
                            >
                              {settingsText.terminal.edit}
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="settings-parity__menu-danger"
                              onClick={() => removeCustomMember(index)}
                            >
                              {settingsText.terminal.remove}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="settings-parity__add-card"
                    onClick={(event) => {
                      event.stopPropagation();
                      openCustomMemberForm();
                    }}
                  >
                    <span>
                      <WorkspaceMaterialSymbol name="add" />
                    </span>
                    <strong>{settingsText.terminal.customCli}</strong>
                  </button>
                </div>

                {customMemberForm ? (
                  <div className="settings-parity__inline-form">
                    <label className="settings-parity__field">
                      <span>{settingsText.terminal.memberName}</span>
                      <input
                        value={customMemberForm.label}
                        placeholder={settingsText.terminal.memberNamePlaceholder}
                        onChange={(event) =>
                          setCustomMemberForm({ ...customMemberForm, label: event.target.value })
                        }
                      />
                    </label>
                    <label className="settings-parity__field settings-parity__field--wide">
                      <span>{settingsText.terminal.commandInput}</span>
                      <div className="settings-parity__command-input">
                        <b aria-hidden="true">$</b>
                        <input
                          value={customMemberForm.command}
                          placeholder={settingsText.terminal.commandPlaceholder}
                          onChange={(event) =>
                            setCustomMemberForm({
                              ...customMemberForm,
                              command: event.target.value,
                            })
                          }
                        />
                      </div>
                    </label>
                    <div className="settings-parity__form-icon-actions">
                      <button
                        type="button"
                        aria-label={settingsText.terminal.cancelMember}
                        onClick={() => setCustomMemberForm(null)}
                      >
                        <WorkspaceMaterialSymbol name="close" />
                      </button>
                      <button
                        type="button"
                        aria-label={settingsText.terminal.confirmMember}
                        disabled={!customMemberForm.command.trim()}
                        onClick={applyCustomMember}
                      >
                        <WorkspaceMaterialSymbol name="check" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="settings-parity__settings-block">
                <div className="settings-parity__subhead">
                  <span>{settingsText.terminal.selectTerminal}</span>
                </div>
                <div className="settings-parity__member-grid" onClick={closeActionMenus}>
                  <div
                    className={
                      terminalDraft.defaultTerminalId
                        ? "settings-parity__terminal-option"
                        : "settings-parity__terminal-option settings-parity__terminal-option--selected"
                    }
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      closeActionMenus();
                      onTerminalDraftChange({ ...terminalDraft, defaultTerminalId: null });
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        onTerminalDraftChange({ ...terminalDraft, defaultTerminalId: null });
                      }
                    }}
                  >
                    <strong>{settingsText.terminal.auto}</strong>
                    <span>{settingsText.terminal.systemShell}</span>
                    {!terminalDraft.defaultTerminalId ? (
                      <b aria-hidden="true">
                        <WorkspaceMaterialSymbol name="check" />
                      </b>
                    ) : null}
                  </div>

                  {terminalDraft.customTerminalEntries.map((entry, index) => (
                    <div
                      key={entry.terminalId}
                      className={
                        terminalDraft.defaultTerminalId === entry.terminalId
                          ? "settings-parity__terminal-option settings-parity__terminal-option--selected"
                          : "settings-parity__terminal-option"
                      }
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        closeActionMenus();
                        onTerminalDraftChange({
                          ...terminalDraft,
                          defaultTerminalId: entry.terminalId,
                        });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          onTerminalDraftChange({
                            ...terminalDraft,
                            defaultTerminalId: entry.terminalId,
                          });
                        }
                      }}
                    >
                      <strong>{entry.label || settingsText.terminal.customTerminal}</strong>
                      <span>{entry.command || settingsText.terminal.noPath}</span>
                      {terminalDraft.defaultTerminalId === entry.terminalId ? (
                        <b aria-hidden="true">
                          <WorkspaceMaterialSymbol name="check" />
                        </b>
                      ) : null}
                      <div className="settings-parity__card-menu-anchor">
                        <button
                          type="button"
                          aria-label={settingsText.terminal.actionsFor.replace(
                            "{label}",
                            entry.label || entry.terminalId,
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenTerminalMenuId(
                              openTerminalMenuId === entry.terminalId
                                ? null
                                : entry.terminalId,
                            );
                          }}
                        >
                          <WorkspaceMaterialSymbol name="more_vert" />
                        </button>
                        {openTerminalMenuId === entry.terminalId ? (
                          <div className="settings-parity__card-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                            <button type="button" role="menuitem" onClick={onTestTerminal}>
                              {settingsText.terminal.test}
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => startEditCustomTerminal(entry, index)}
                            >
                              {settingsText.terminal.edit}
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              className="settings-parity__menu-danger"
                              onClick={() => removeCustomTerminal(index)}
                            >
                              {settingsText.terminal.remove}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="settings-parity__add-card"
                    onClick={(event) => {
                      event.stopPropagation();
                      openCustomTerminalForm();
                    }}
                  >
                    <span>
                      <WorkspaceMaterialSymbol name="add" />
                    </span>
                    <strong>{settingsText.terminal.customTerminal}</strong>
                  </button>
                </div>

                {customTerminalForm ? (
                  <div className="settings-parity__inline-form">
                    <label className="settings-parity__field">
                      <span>{settingsText.terminal.terminalName}</span>
                      <input
                        value={customTerminalForm.label}
                        placeholder={settingsText.terminal.terminalNamePlaceholder}
                        onChange={(event) =>
                          setCustomTerminalForm({
                            ...customTerminalForm,
                            label: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="settings-parity__field settings-parity__field--wide">
                      <span>{settingsText.terminal.terminalPath}</span>
                      <input
                        value={customTerminalForm.command}
                        placeholder={settingsText.terminal.terminalPathPlaceholder}
                        onChange={(event) =>
                          setCustomTerminalForm({
                            ...customTerminalForm,
                            command: event.target.value,
                          })
                        }
                      />
                    </label>
                    <div className="settings-parity__form-icon-actions">
                      <button
                        type="button"
                        aria-label={settingsText.terminal.cancelTerminal}
                        onClick={() => setCustomTerminalForm(null)}
                      >
                        <WorkspaceMaterialSymbol name="close" />
                      </button>
                      <button
                        type="button"
                        aria-label={settingsText.terminal.confirmTerminal}
                        disabled={!customTerminalForm.command.trim()}
                        onClick={applyCustomTerminal}
                      >
                        <WorkspaceMaterialSymbol name="check" />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              {terminalError ? <p className="settings-parity__error">{terminalError}</p> : null}
              <SettingsActions
                meta={settingsText.terminal.savedMeta}
                primaryLabel={isTerminalSaving ? settingsText.terminal.saving : settingsText.terminal.save}
                primaryDisabled={isTerminalSaving}
                onPrimary={onSaveTerminalConfiguration}
              />
            </div>
          </SettingsSection>

          <SettingsDivider />

          <SettingsSection
            id="settings-notifications"
            icon="notifications"
            title={settingsText.sections.notifications.label}
            subtitle={settingsText.sections.notifications.subtitle}
          >
            <div className="settings-parity__toggle-list">
              <SettingsToggle
                icon="notifications"
                label={settingsText.notifications.desktop}
                checked={notificationDraft.desktopNotificationsEnabled}
                onChange={(checked) =>
                  onNotificationDraftChange({
                    ...notificationDraft,
                    desktopNotificationsEnabled: checked,
                  })
                }
              />
              <SettingsToggle
                icon="volume_up"
                label={settingsText.notifications.sound}
                checked={notificationDraft.soundEnabled}
                onChange={(checked) =>
                  onNotificationDraftChange({ ...notificationDraft, soundEnabled: checked })
                }
              />
              <SettingsToggle
                icon="alternate_email"
                label={settingsText.notifications.mentionsOnly}
                checked={notificationDraft.mentionsOnly}
                onChange={(checked) =>
                  onNotificationDraftChange({ ...notificationDraft, mentionsOnly: checked })
                }
              />
              <SettingsToggle
                icon="visibility"
                label={settingsText.notifications.previews}
                checked={notificationDraft.messagePreviewEnabled}
                onChange={(checked) =>
                  onNotificationDraftChange({
                    ...notificationDraft,
                    messagePreviewEnabled: checked,
                  })
                }
              />
              <SettingsToggle
                icon="bedtime"
                label={settingsText.notifications.quietHours}
                checked={notificationDraft.dndEnabled}
                onChange={(checked) =>
                  onNotificationDraftChange({ ...notificationDraft, dndEnabled: checked })
                }
              />
            </div>
            {notificationDraft.dndEnabled ? (
              <div className="settings-parity__time-row">
                <label className="settings-parity__field">
                  <span>{settingsText.notifications.from}</span>
                  <input
                    type="time"
                    value={notificationDraft.dndStartTime}
                    onChange={(event) =>
                      onNotificationDraftChange({
                        ...notificationDraft,
                        dndStartTime: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="settings-parity__field">
                  <span>{settingsText.notifications.to}</span>
                  <input
                    type="time"
                    value={notificationDraft.dndEndTime}
                    onChange={(event) =>
                      onNotificationDraftChange({
                        ...notificationDraft,
                        dndEndTime: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            ) : null}
            <p className="settings-parity__muted">
              {settingsText.notifications.permission.replace(
                "{message}",
                savedNotificationPreferences.permission.message,
              )}
            </p>
            {notificationError ? <p className="settings-parity__error">{notificationError}</p> : null}
            <SettingsActions
              meta={
                isNotificationLoading
                  ? settingsText.notifications.loading
                  : settingsText.notifications.updated.replace(
                      "{time}",
                      formatDateTime(savedNotificationPreferences.updatedAtMs),
                    )
              }
              primaryLabel={
                isNotificationSaving
                  ? settingsText.notifications.saving
                  : settingsText.notifications.save
              }
              primaryDisabled={!canSaveNotifications}
              onPrimary={onSaveNotifications}
            />
          </SettingsSection>

          <SettingsDivider />

          <SettingsSection
            id="settings-keybinds"
            icon="keyboard_command_key"
            title={settingsText.sections.keybinds.label}
            subtitle={settingsText.sections.keybinds.subtitle}
          >
            <div className="settings-parity__keybind-controls">
              <div className="settings-parity__field">
                <span>{settingsText.keybinds.profile}</span>
                <ParitySelect
                  value={shortcutDraft.profile}
                  ariaLabel={settingsText.keybinds.profile}
                  options={[
                    { value: "default", label: settingsText.keybinds.default },
                    { value: "vscode", label: "VS Code" },
                    { value: "slack", label: "Slack" },
                  ]}
                  onChange={(value) =>
                    onShortcutDraftChange({
                      ...shortcutDraft,
                      profile: value as ShortcutKeymapProfile,
                    })
                  }
                />
              </div>
              <SettingsToggle
                icon="keyboard"
                label={settingsText.keybinds.shortcutsEnabled}
                checked={shortcutDraft.shortcutsEnabled}
                onChange={(checked) =>
                  onShortcutDraftChange({ ...shortcutDraft, shortcutsEnabled: checked })
                }
              />
              <SettingsToggle
                icon="tips_and_updates"
                label={settingsText.keybinds.showHints}
                checked={shortcutDraft.shortcutHintsEnabled}
                onChange={(checked) =>
                  onShortcutDraftChange({ ...shortcutDraft, shortcutHintsEnabled: checked })
                }
              />
            </div>
            <div className="settings-parity__binding-list">
              {displayedShortcutBindings.map((binding) => {
                const actionDisabled = disabledShortcutIds.has(binding.actionId);
                const isEffectivelyEnabled =
                  shortcutDraft.shortcutsEnabled && binding.available && !actionDisabled;
                const canToggle = binding.available;

                return (
                  <div
                    key={binding.actionId}
                    className={
                      canToggle
                        ? "settings-parity__binding-row"
                        : "settings-parity__binding-row settings-parity__binding-row--unavailable"
                    }
                  >
                    <span>
                      <strong>{binding.label}</strong>
                      {binding.unavailableReason ? <em>{binding.unavailableReason}</em> : null}
                    </span>
                    <div className="settings-parity__binding-meta">
                      <small>{binding.keys.join(" / ")}</small>
                      {!canToggle ? (
                        <b>{settingsText.keybinds.unavailable}</b>
                      ) : isEffectivelyEnabled ? (
                        <b data-state="enabled">{settingsText.keybinds.enabled}</b>
                      ) : (
                        <b data-state="disabled">{settingsText.keybinds.disabled}</b>
                      )}
                      <label>
                        <span className="sr-only">
                          {settingsText.keybinds.shortcutLabel.replace("{label}", binding.label)}
                        </span>
                        <input
                          type="checkbox"
                          checked={!actionDisabled}
                          disabled={!canToggle}
                          onChange={(event) =>
                            updateShortcutActionEnabled(binding.actionId, event.target.checked)
                          }
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
            {shortcutError ? <p className="settings-parity__error">{shortcutError}</p> : null}
            <SettingsActions
              meta={
                isShortcutLoading
                  ? settingsText.keybinds.loading
                  : settingsText.keybinds.updated.replace(
                      "{time}",
                      formatDateTime(savedShortcutPreferences.updatedAtMs),
                    )
              }
              secondaryLabel={settingsText.keybinds.reset}
              secondaryDisabled={isShortcutSaving}
              onSecondary={onResetShortcuts}
              primaryLabel={isShortcutSaving ? settingsText.keybinds.saving : settingsText.keybinds.save}
              primaryDisabled={isShortcutSaving}
              onPrimary={onSaveShortcuts}
            />
          </SettingsSection>

          <SettingsDivider />

          <SettingsSection
            id="settings-data"
            icon="database"
            title={settingsText.sections.data.label}
            subtitle={settingsText.sections.data.subtitle}
          >
            <div className="settings-parity__data-card">
              <div>
                <strong>{settingsText.data.streamTitle}</strong>
                <span>
                  {settingsText.data.currentMode.replace(
                    "{mode}",
                    savedChatTerminalOutputPreferences.displayMode === "stream"
                      ? settingsText.data.stream
                      : settingsText.data.finalOnly,
                  )}
                </span>
              </div>
              <SettingsToggle
                icon="terminal"
                label={settingsText.data.streamToggle}
                checked={chatTerminalOutputDraft.displayMode === "stream"}
                onChange={(checked) =>
                  onChatTerminalOutputDraftChange({
                    displayMode: checked ? "stream" : "finalOnly",
                  })
                }
              />
              {chatTerminalOutputError ? (
                <p className="settings-parity__error">{chatTerminalOutputError}</p>
              ) : null}
              <button
                type="button"
                className="settings-parity__subtle-action"
                disabled={isChatTerminalOutputSaving}
                onClick={onSaveChatTerminalOutput}
              >
                {isChatTerminalOutputLoading
                  ? settingsText.data.loadingOutput
                  : isChatTerminalOutputSaving
                    ? settingsText.data.savingOutput
                    : settingsText.data.saveOutput}
              </button>
            </div>

            <div className="settings-parity__data-card">
              <div>
                <strong>{settingsText.data.maintenanceTitle}</strong>
                <span>{workspaceScope}</span>
              </div>
              <div className="settings-parity__button-row">
                <button
                  type="button"
                  disabled={!activeWorkspaceId || isRepairingChatData || isClearingWorkspaceChatData}
                  onClick={onRepairChatData}
                >
                  <WorkspaceMaterialSymbol name="build_circle" />
                  {isRepairingChatData ? settingsText.data.repairing : settingsText.data.repair}
                </button>
                <button
                  type="button"
                  className="settings-parity__danger"
                  disabled={!activeWorkspaceId || isRepairingChatData || isClearingWorkspaceChatData}
                  onClick={onClearWorkspaceChatData}
                >
                  <WorkspaceMaterialSymbol name="delete_sweep" />
                  {isClearingWorkspaceChatData ? settingsText.data.clearing : settingsText.data.clear}
                </button>
              </div>
              {chatMaintenanceResult ? (
                <div className="settings-parity__maintenance" role="status">
                  <strong>{chatMaintenanceResult.title}</strong>
                  <p>{chatMaintenanceResult.summary}</p>
                  {chatMaintenanceResult.action ? <span>{chatMaintenanceResult.action}</span> : null}
                </div>
              ) : null}
            </div>
          </SettingsSection>
        </div>
      </main>
    </section>
  );
}

function SettingsSection({
  id,
  icon,
  title,
  subtitle,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="settings-parity__section" role="region" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>
        <WorkspaceMaterialSymbol name={icon} />
        {title}
      </h2>
      <p>{subtitle}</p>
      {children}
    </section>
  );
}

function SettingsDivider() {
  return <div className="settings-parity__divider" aria-hidden="true" />;
}

function SettingsToggle({
  icon,
  label,
  checked,
  disabled = false,
  onChange,
}: {
  icon: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-parity__toggle">
      <span>
        <WorkspaceMaterialSymbol name={icon} />
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <i aria-hidden="true" />
    </label>
  );
}

function SettingsActions({
  meta,
  primaryLabel,
  primaryDisabled,
  onPrimary,
  secondaryLabel,
  secondaryDisabled = false,
  onSecondary,
}: {
  meta: string;
  primaryLabel: string;
  primaryDisabled: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  secondaryDisabled?: boolean;
  onSecondary?: () => void;
}) {
  return (
    <div className="settings-parity__actions">
      <span>{meta}</span>
      <div>
        {secondaryLabel && onSecondary ? (
          <button type="button" disabled={secondaryDisabled} onClick={onSecondary}>
            {secondaryLabel}
          </button>
        ) : null}
        <button type="button" disabled={primaryDisabled} onClick={onPrimary}>
          {primaryLabel}
        </button>
      </div>
    </div>
  );
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

function savedConfigurationDate(configuration: TerminalConfigurationSnapshot) {
  return configuration.updatedAtMs;
}

function themeOptionLabel(theme: AppTheme, language: AppLanguage) {
  return SETTINGS_PARITY_TEXT[language].themeOptions[theme].label;
}

function themeOptionDescription(theme: AppTheme, language: AppLanguage) {
  return SETTINGS_PARITY_TEXT[language].themeOptions[theme].desc;
}

type MarketplaceTab = "store" | "installed";

type SkillStoreRemoteSkill = {
  id: number;
  title: string;
  description: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  rating: string;
};

type PluginMarketplaceItem = {
  id: number;
  title: string;
  description: string;
  icon: string;
  bgClass: string;
  rating: string;
  installed: boolean;
};

const SKILL_STORE_REMOTE_SKILLS: SkillStoreRemoteSkill[] = [];
const PLUGIN_MARKETPLACE_ITEMS: PluginMarketplaceItem[] = [];

const SKILL_STORE_TEXT = {
  "zh-CN": {
    title: "技能商店",
    searchPlaceholder: "搜索技能文件夹、模板和工具包...",
    tabs: {
      store: "商店",
      installed: "我的技能",
    },
    filters: ["工程", "设计", "管理", "营销", "财务"],
    all: "全部技能",
    syncPlaceholder: "粘贴同步 URL...",
    syncNow: "立即同步",
    installFolder: "安装文件夹",
    installed: "我的技能",
    importTitle: "导入技能",
    importSubtitle: "从 URL 或本地文件",
    localSource: "本地技能",
    loading: "正在加载技能库",
    empty: "我的技能库里暂无可用技能",
    openFolder: "打开文件夹",
    deleteSkill: "删除技能",
    link: "关联",
    unlink: "取消关联",
    linked: "已关联",
    linking: "关联中",
    unlinking: "移除中",
    deleting: "删除中",
    opening: "打开中",
    importing: "导入中",
    manifestLink: "清单链接",
  },
  "en-US": {
    title: "Skill Store",
    searchPlaceholder: "Search skill folders, templates, and toolkits...",
    tabs: {
      store: "Store",
      installed: "My Skills",
    },
    filters: ["Engineering", "Design", "Management", "Marketing", "Finance"],
    all: "All Skills",
    syncPlaceholder: "Paste sync URL...",
    syncNow: "Sync now",
    installFolder: "Install Folder",
    installed: "My Skills",
    importTitle: "Import Skill",
    importSubtitle: "From URL or Local File",
    localSource: "Local skill",
    loading: "Loading skill library",
    empty: "No local skills available",
    openFolder: "Open folder",
    deleteSkill: "Delete skill",
    link: "Link",
    unlink: "Unlink",
    linked: "Linked",
    linking: "Linking",
    unlinking: "Removing",
    deleting: "Deleting",
    opening: "Opening",
    importing: "Importing",
    manifestLink: "Manifest link",
  },
} as const satisfies Record<AppLanguage, {
  title: string;
  searchPlaceholder: string;
  tabs: Record<MarketplaceTab, string>;
  filters: string[];
  all: string;
  syncPlaceholder: string;
  syncNow: string;
  installFolder: string;
  installed: string;
  importTitle: string;
  importSubtitle: string;
  localSource: string;
  loading: string;
  empty: string;
  openFolder: string;
  deleteSkill: string;
  link: string;
  unlink: string;
  linked: string;
  linking: string;
  unlinking: string;
  deleting: string;
  opening: string;
  importing: string;
  manifestLink: string;
}>;

const PLUGIN_MARKETPLACE_TEXT = {
  "zh-CN": {
    title: "插件市场",
    searchPlaceholder: "搜索插件、集成和主题...",
    tabs: {
      store: "浏览商店",
      installed: "我的插件",
    },
    all: "全部插件",
    categories: ["效率", "开发", "设计", "沟通", "音乐"],
    install: "安装",
    installed: "已安装",
    importTitle: "导入插件",
    importSubtitle: "从 URL 或本地文件",
  },
  "en-US": {
    title: "Plugin Marketplace",
    searchPlaceholder: "Search plugins, integrations, and themes...",
    tabs: {
      store: "Browse Store",
      installed: "My Plugins",
    },
    all: "All Plugins",
    categories: ["Productivity", "Development", "Design", "Communication", "Music"],
    install: "Install",
    installed: "Installed",
    importTitle: "Import Plugin",
    importSubtitle: "From URL or Local File",
  },
} as const satisfies Record<AppLanguage, {
  title: string;
  searchPlaceholder: string;
  tabs: Record<MarketplaceTab, string>;
  all: string;
  categories: string[];
  install: string;
  installed: string;
  importTitle: string;
  importSubtitle: string;
}>;

function SkillStoreParity({
  language,
  skills,
  linkedSkillIds,
  isLoading,
  isLoadingLinks,
  isImporting,
  pendingOpenId,
  pendingDeleteId,
  pendingLinkId,
  pendingUnlinkId,
  onImport,
  onOpen,
  onDelete,
  onLink,
  onUnlink,
}: {
  language: AppLanguage;
  skills: SkillLibraryEntry[];
  linkedSkillIds: Set<string>;
  isLoading: boolean;
  isLoadingLinks: boolean;
  isImporting: boolean;
  pendingOpenId: string | null;
  pendingDeleteId: string | null;
  pendingLinkId: string | null;
  pendingUnlinkId: string | null;
  onImport: () => void;
  onOpen: (skillId: string) => void;
  onDelete: (skillId: string) => void;
  onLink: (skillId: string) => void;
  onUnlink: (skillId: string) => void;
}) {
  const text = SKILL_STORE_TEXT[language];
  const [activeTab, setActiveTab] = useState<MarketplaceTab>("store");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const storeSkills = SKILL_STORE_REMOTE_SKILLS.filter((skill) =>
    skillSearchText(skill.title, skill.description).includes(normalizedQuery),
  );
  const localSkills = skills.filter((skill) =>
    skillSearchText(skill.name, skill.description, skill.sourcePath).includes(normalizedQuery),
  );

  return (
    <section className="skill-store-parity" aria-labelledby="skill-store-parity-title">
      <header className="marketplace-parity__header">
        <h1 id="skill-store-parity-title">{text.title}</h1>
        <MarketplaceSearch
          value={query}
          placeholder={text.searchPlaceholder}
          onChange={setQuery}
        />
        <MarketplaceSegment
          activeTab={activeTab}
          storeLabel={text.tabs.store}
          installedLabel={text.tabs.installed}
          onChange={setActiveTab}
        />
        <MarketplaceFilters allLabel={text.all} filters={text.filters} />
      </header>

      <div className="marketplace-parity__content custom-scrollbar">
        {activeTab === "store" ? (
          <div className="marketplace-parity__grid marketplace-parity__grid--store">
            {storeSkills.map((skill) => (
              <article key={skill.id} className="marketplace-parity__card">
                <div className="marketplace-parity__card-head">
                  <span className={`marketplace-parity__icon ${skill.bgClass} ${skill.colorClass}`}>
                    <WorkspaceMaterialSymbol name={skill.icon} />
                  </span>
                  <span className="marketplace-parity__rating">
                    <WorkspaceMaterialSymbol name="star" />
                    {skill.rating}
                  </span>
                </div>
                <h2>{skill.title}</h2>
                <p>{skill.description}</p>
                <div className="skill-store-parity__sync">
                  <WorkspaceMaterialSymbol name="link" />
                  <input type="text" placeholder={text.syncPlaceholder} aria-label={text.syncPlaceholder} />
                  <button type="button" title={text.syncNow} aria-label={text.syncNow}>
                    <WorkspaceMaterialSymbol name="sync" />
                  </button>
                </div>
                <button type="button" className="marketplace-parity__primary">
                  <WorkspaceMaterialSymbol name="add_to_drive" />
                  {text.installFolder}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="marketplace-parity__grid marketplace-parity__grid--installed">
            {!isLoading && localSkills.map((skill, index) => {
              const linked = linkedSkillIds.has(skill.skillId);
              const isOpening = pendingOpenId === skill.skillId;
              const isDeleting = pendingDeleteId === skill.skillId;
              const isLinking = pendingLinkId === skill.skillId;
              const isUnlinking = pendingUnlinkId === skill.skillId;

              return (
                <article key={skill.skillId} className="marketplace-parity__card skill-store-parity__local-card">
                  <span className={`marketplace-parity__corner ${skillCornerClass(index)}`} />
                  <div className="marketplace-parity__card-head">
                    <span className={`marketplace-parity__icon ${skillIconClass(index)}`}>
                      <WorkspaceMaterialSymbol name="folder" />
                    </span>
                    <span className="marketplace-parity__icon-actions">
                      <button
                        type="button"
                        onClick={() => onOpen(skill.skillId)}
                        disabled={isOpening || isDeleting}
                        aria-label={text.openFolder}
                        title={text.openFolder}
                      >
                        <WorkspaceMaterialSymbol name="folder_open" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(skill.skillId)}
                        disabled={isDeleting}
                        aria-label={text.deleteSkill}
                        title={text.deleteSkill}
                        className="marketplace-parity__danger-icon"
                      >
                        <WorkspaceMaterialSymbol name="delete" />
                      </button>
                    </span>
                  </div>
                  <h2>{skill.name}</h2>
                  <p>{skill.description ?? text.localSource}</p>
                  <p className="skill-store-parity__path" title={skill.sourcePath}>
                    {formatWorkspacePath(skill.sourcePath)}
                  </p>
                  <div className="skill-store-parity__footer">
                    <span>
                      <b>{text.localSource}</b>
                    </span>
                    {linked ? (
                      <button
                        type="button"
                        onClick={() => onUnlink(skill.skillId)}
                        disabled={isUnlinking || isLoadingLinks}
                        className="skill-store-parity__link-button skill-store-parity__link-button--linked"
                      >
                        {isUnlinking ? text.unlinking : text.unlink}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onLink(skill.skillId)}
                        disabled={isLinking || isLoadingLinks}
                        className="skill-store-parity__link-button"
                      >
                        {isLinking ? text.linking : text.link}
                      </button>
                    )}
                  </div>
                  {linked ? <span className="skill-store-parity__linked-badge">{text.linked}</span> : null}
                </article>
              );
            })}

            <button
              type="button"
              onClick={onImport}
              disabled={isImporting}
              className="marketplace-parity__import-card"
            >
              <span>
                <WorkspaceMaterialSymbol name="add" />
              </span>
              <strong>{isImporting ? text.importing : text.importTitle}</strong>
              <small>{text.importSubtitle}</small>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function PluginMarketplaceParity({
  language,
  onUnavailableCapability,
}: {
  language: AppLanguage;
  onUnavailableCapability: (title: string, status: CapabilityStatus) => void;
}) {
  const text = PLUGIN_MARKETPLACE_TEXT[language];
  const [activeTab, setActiveTab] = useState<MarketplaceTab>("store");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visiblePlugins = PLUGIN_MARKETPLACE_ITEMS.filter((plugin) => {
    const matchesQuery = skillSearchText(plugin.title, plugin.description).includes(normalizedQuery);
    return activeTab === "installed" ? plugin.installed && matchesQuery : matchesQuery;
  });

  return (
    <section className="plugin-marketplace-parity" aria-labelledby="plugin-marketplace-parity-title">
      <header className="marketplace-parity__header">
        <h1 id="plugin-marketplace-parity-title">{text.title}</h1>
        <MarketplaceSearch
          value={query}
          placeholder={text.searchPlaceholder}
          onChange={setQuery}
        />
        <MarketplaceSegment
          activeTab={activeTab}
          storeLabel={text.tabs.store}
          installedLabel={text.tabs.installed}
          onChange={setActiveTab}
        />
        <MarketplaceFilters allLabel={text.all} filters={text.categories} />
      </header>

      <div className="marketplace-parity__content custom-scrollbar">
        <div className="marketplace-parity__grid marketplace-parity__grid--installed">
          {visiblePlugins.map((plugin) => (
            <article key={plugin.id} className="marketplace-parity__card">
              <button type="button" className="marketplace-parity__more" aria-label="More">
                <WorkspaceMaterialSymbol name="more_horiz" />
              </button>
              <div className="marketplace-parity__card-head">
                <span className={`marketplace-parity__icon marketplace-parity__icon--gradient ${plugin.bgClass}`}>
                  <WorkspaceMaterialSymbol name={plugin.icon} />
                </span>
                <span className="marketplace-parity__rating">
                  <WorkspaceMaterialSymbol name="star" />
                  {plugin.rating}
                </span>
              </div>
              <h2>{plugin.title}</h2>
              <p>{plugin.description}</p>
              {plugin.installed && activeTab === "installed" ? (
                <div className="marketplace-parity__split-actions">
                  <span>{text.installed}</span>
                  <button
                    type="button"
                    onClick={() => onUnavailableCapability(text.title, "placeholder")}
                  >
                    <WorkspaceMaterialSymbol name="delete" />
                    Remove
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={plugin.installed ? "marketplace-parity__secondary" : "marketplace-parity__primary"}
                  onClick={() => onUnavailableCapability(text.title, "placeholder")}
                >
                  {!plugin.installed ? <WorkspaceMaterialSymbol name="download" /> : null}
                  {plugin.installed ? text.installed : text.install}
                </button>
              )}
            </article>
          ))}

          {activeTab === "installed" ? (
            <button
              type="button"
              className="marketplace-parity__import-card marketplace-parity__import-card--tall"
              onClick={() => onUnavailableCapability(text.title, "placeholder")}
            >
              <span>
                <WorkspaceMaterialSymbol name="add" />
              </span>
              <strong>{text.importTitle}</strong>
              <small>{text.importSubtitle}</small>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MarketplaceSearch({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="marketplace-parity__search">
      <span>
        <WorkspaceMaterialSymbol name="search" />
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="button" aria-label="Command K">
        CMD+K
      </button>
    </div>
  );
}

function MarketplaceSegment({
  activeTab,
  storeLabel,
  installedLabel,
  onChange,
}: {
  activeTab: MarketplaceTab;
  storeLabel: string;
  installedLabel: string;
  onChange: (tab: MarketplaceTab) => void;
}) {
  return (
    <div className="marketplace-parity__segment" role="tablist" aria-label="Marketplace tabs">
      <span
        className="marketplace-parity__segment-thumb"
        data-active={activeTab}
        aria-hidden="true"
      />
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "store"}
        onClick={() => onChange("store")}
      >
        {storeLabel}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === "installed"}
        onClick={() => onChange("installed")}
      >
        {installedLabel}
      </button>
    </div>
  );
}

function MarketplaceFilters({ allLabel, filters }: { allLabel: string; filters: string[] }) {
  return (
    <div className="marketplace-parity__filters" aria-label="Marketplace filters">
      <button type="button" className="marketplace-parity__filter marketplace-parity__filter--active">
        {allLabel}
      </button>
      {filters.map((filter) => (
        <button key={filter} type="button" className="marketplace-parity__filter">
          {filter}
        </button>
      ))}
    </div>
  );
}

function skillSearchText(...parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(" ").toLocaleLowerCase();
}

function skillIconClass(index: number) {
  const classes = [
    "marketplace-parity__icon--sky",
    "marketplace-parity__icon--violet",
    "marketplace-parity__icon--emerald",
    "marketplace-parity__icon--amber",
  ];
  return classes[index % classes.length];
}

function skillCornerClass(index: number) {
  const classes = [
    "marketplace-parity__corner--sky",
    "marketplace-parity__corner--violet",
    "marketplace-parity__corner--emerald",
    "marketplace-parity__corner--amber",
  ];
  return classes[index % classes.length];
}

function ParityTabPlaceholder({
  tab,
}: {
  tab: "workspaces" | "store" | "plugins" | "settings";
}) {
  const meta = {
    workspaces: ["folder_open", "Workspaces", "Open or switch workspace from the workspace window."],
    store: ["storefront", "Skill store", "Golutra skill store parity is the next slice."],
    plugins: ["extension", "Plugins", "Plugin marketplace parity is the next slice."],
    settings: ["settings", "Settings", "Settings parity is the next slice."],
  } as const;
  const [icon, title, subtitle] = meta[tab];

  return (
    <section className="parity-placeholder" aria-label={title}>
      <span className="parity-placeholder__icon">
        <WorkspaceMaterialSymbol name={icon} />
      </span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
  );
}

function ChatWorkbenchParity({
  language,
  activeWorkspace,
  conversations,
  selectedConversation,
  messages,
  members,
  messageDraft,
  mentionedMemberIds,
  attachmentEntries,
  roadmapTasks,
  isRoadmapAttachmentPickerOpen,
  isLoadingConversations,
  isLoadingMessages,
  isLoadingOlderMessages,
  hasOlderMessages,
  isSendingMessage,
  isUpdatingSettings,
  renameDraft,
  inviteRuntimeKind,
  inviteBuiltinRuntimeId,
  inviteCustomRuntimeCliId,
  inviteCustomRuntimeCommand,
  builtInRuntimeOptions,
  customCliRuntimeOptions,
  inviteInstanceCount,
  inviteSandboxed,
  inviteUnlimitedAccess,
  isInviting,
  onSelectConversation,
  onMessageDraftChange,
  onAddMention,
  onRemoveMention,
  onAddImageAttachment,
  onOpenRoadmapAttachmentPicker,
  onSelectRoadmapAttachment,
  onOpenRoadmapReference,
  onRemoveAttachmentEntry,
  onSendMessage,
  onLoadOlderMessages,
  onTogglePinned,
  onToggleMuted,
  onRenameDraftChange,
  onRenameConversation,
  onClearConversation,
  onDeleteConversation,
  onOpenRoadmap,
  onOpenSkills,
  onOpenMembers,
  onInviteTypeChange,
  onInviteDisplayNameChange,
  onInviteRuntimeKindChange,
  onInviteBuiltinRuntimeChange,
  onInviteCustomRuntimeCliChange,
  onInviteCustomRuntimeCommandChange,
  onInviteInstanceCountChange,
  onInviteSandboxedChange,
  onInviteUnlimitedAccessChange,
  onInviteMember,
  onStartPrivateConversation,
  onOpenMemberTerminal,
  onMentionMember,
  onRenameMember,
  onUpdateMemberStatus,
  onRemoveMember,
  onUnavailable,
}: {
  language: AppLanguage;
  activeWorkspace: OpenedWorkspace;
  conversations: ConversationProfile[];
  selectedConversation: ConversationProfile | null;
  messages: ChatMessageProfile[];
  members: MemberProfile[];
  messageDraft: string;
  mentionedMemberIds: string[];
  attachmentEntries: AttachmentEntry[];
  roadmapTasks: RoadmapTaskEntry[];
  isRoadmapAttachmentPickerOpen: boolean;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isLoadingOlderMessages: boolean;
  hasOlderMessages: boolean;
  isSendingMessage: boolean;
  isUpdatingSettings: boolean;
  isClearingConversation: boolean;
  isDeletingConversation: boolean;
  renameDraft: string;
  inviteRuntimeKind: MemberRuntimeKind;
  inviteBuiltinRuntimeId: string;
  inviteCustomRuntimeCliId: string;
  inviteCustomRuntimeCommand: string;
  builtInRuntimeOptions: RuntimeOption[];
  customCliRuntimeOptions: RuntimeOption[];
  inviteInstanceCount: number;
  inviteSandboxed: boolean;
  inviteUnlimitedAccess: boolean;
  isInviting: boolean;
  onSelectConversation: (conversationId: string) => void;
  onMessageDraftChange: (value: string) => void;
  onAddMention: (member: MemberProfile) => void;
  onRemoveMention: (memberId: string) => void;
  onAddImageAttachment: () => void;
  onOpenRoadmapAttachmentPicker: () => void;
  onSelectRoadmapAttachment: (task: RoadmapTaskEntry) => void;
  onOpenRoadmapReference: (taskId: string) => void;
  onRemoveAttachmentEntry: (entry: AttachmentEntry) => void;
  onSendMessage: () => void;
  onLoadOlderMessages: () => void;
  onTogglePinned: (conversation: ConversationProfile) => void;
  onToggleMuted: (conversation: ConversationProfile) => void;
  onRenameDraftChange: (value: string) => void;
  onRenameConversation: () => void;
  onClearConversation: (conversation: ConversationProfile) => void;
  onDeleteConversation: (conversation: ConversationProfile) => void;
  onOpenRoadmap: () => void;
  onOpenSkills: () => void;
  onOpenMembers: () => void;
  onInviteTypeChange: (value: InvitedMemberType) => void;
  onInviteDisplayNameChange: (value: string) => void;
  onInviteRuntimeKindChange: (value: MemberRuntimeKind) => void;
  onInviteBuiltinRuntimeChange: (value: string) => void;
  onInviteCustomRuntimeCliChange: (value: string) => void;
  onInviteCustomRuntimeCommandChange: (value: string) => void;
  onInviteInstanceCountChange: (value: number) => void;
  onInviteSandboxedChange: (value: boolean) => void;
  onInviteUnlimitedAccessChange: (value: boolean) => void;
  onInviteMember: () => void;
  onStartPrivateConversation: (member: MemberProfile) => void;
  onOpenMemberTerminal: (member: MemberProfile) => void;
  onMentionMember: (member: MemberProfile) => void;
  onRenameMember: (member: MemberProfile, displayName: string) => Promise<void>;
  onUpdateMemberStatus: (member: MemberProfile, status: MemberProfile["status"]) => void;
  onRemoveMember: (member: MemberProfile) => void;
  onUnavailable: (capability: string) => void;
}) {
  const text = CHAT_PARITY_TEXT[language];
  const messageListRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [openConversationMenuId, setOpenConversationMenuId] = useState<string | null>(null);
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isInviteMenuOpen, setIsInviteMenuOpen] = useState(false);
  const [inviteModal, setInviteModal] = useState<ParityInviteKind | null>(null);
  const [isEmojiPanelOpen, setIsEmojiPanelOpen] = useState(false);
  const [activeEmojiGroupId, setActiveEmojiGroupId] = useState(DEFAULT_EMOJI_GROUP_ID);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => loadRecentEmojis());
  const channelConversations = conversations.filter((conversation) => conversation.kind !== "private");
  const directConversations = conversations.filter((conversation) => conversation.kind === "private");
  const conversationMembers =
    selectedConversation?.members
      .map((summary) => members.find((member) => member.memberId === summary.memberId))
      .filter((member): member is MemberProfile => Boolean(member)) ??
    members.slice(0, 8);
  const mentionQuery = activeMentionQuery(messageDraft);
  const mentionSuggestions =
    mentionQuery === null || mentionQuery.toLocaleLowerCase() === "all"
      ? []
      : conversationMembers
          .filter(
            (member) =>
              member.permissions.canMention &&
              !mentionedMemberIds.includes(member.memberId) &&
              mentionMatches(member, mentionQuery),
          )
          .slice(0, 6);
  const selectedMentionMembers = mentionedMemberIds
    .map((memberId) => members.find((member) => member.memberId === memberId))
    .filter((member): member is MemberProfile => Boolean(member));
  const hasUnsupportedAllMention = hasAllMentionToken(messageDraft);
  const filteredEmojiEntries = golutraEmojiSearchEntries(
    emojiSearch,
    activeEmojiGroupId,
    recentEmojis,
  );

  useEffect(() => {
    const list = messageListRef.current;

    if (!list) {
      return;
    }

    list.scrollTop = list.scrollHeight;
  }, [messages, selectedConversation?.conversationId]);

  function handleSelectEmoji(value: string) {
    const input = messageInputRef.current;
    const start = input?.selectionStart ?? messageDraft.length;
    const end = input?.selectionEnd ?? start;
    const nextDraft = `${messageDraft.slice(0, start)}${value}${messageDraft.slice(end)}`;
    const nextRecentEmojis = [value, ...recentEmojis.filter((emoji) => emoji !== value)].slice(
      0,
      RECENT_EMOJI_MAX_COUNT,
    );

    setRecentEmojis(nextRecentEmojis);
    saveRecentEmojis(nextRecentEmojis);
    onMessageDraftChange(nextDraft);
    setIsEmojiPanelOpen(false);

    window.requestAnimationFrame(() => {
      const nextCursor = start + value.length;

      messageInputRef.current?.focus();
      messageInputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleToggleEmojiPanel() {
    setIsEmojiPanelOpen((isOpen) => {
      const nextOpen = !isOpen;

      if (nextOpen) {
        setEmojiSearch("");
        setActiveEmojiGroupId(
          activeEmojiGroupId === DEFAULT_EMOJI_GROUP_ID && recentEmojis.length > 0
            ? RECENT_EMOJI_GROUP_ID
            : activeEmojiGroupId,
        );
      }

      return nextOpen;
    });
  }

  function openInviteModal(kind: ParityInviteKind) {
    setIsInviteMenuOpen(false);
    setInviteModal(kind);

    if (kind === "assistant" || kind === "member") {
      const defaultRuntime =
        builtInRuntimeOptions.find((runtime) => runtime.id === inviteBuiltinRuntimeId) ??
        builtInRuntimeOptions[0];

      onInviteTypeChange(kind);
      onInviteRuntimeKindChange("builtInAiCli");
      if (defaultRuntime) {
        onInviteBuiltinRuntimeChange(defaultRuntime.id);
      }
      onInviteDisplayNameChange("");
      onInviteSandboxedChange(false);
      onInviteUnlimitedAccessChange(true);
    }
  }

  function submitInvite() {
    if (inviteModal === "admin") {
      onUnavailable("管理员邀请");
      setInviteModal(null);
      return;
    }

    onInviteMember();
    setInviteModal(null);
  }

  function handleConversationRename(conversation: ConversationProfile) {
    onSelectConversation(conversation.conversationId);
    onRenameDraftChange(conversation.title);
    setIsRenameOpen(true);
    setOpenConversationMenuId(null);
  }

  function handleConversationAction(
    conversation: ConversationProfile,
    action: "pin" | "mute" | "rename" | "clear" | "delete",
  ) {
    if (action !== "rename") {
      setOpenConversationMenuId(null);
    }

    if (action === "pin") {
      onTogglePinned(conversation);
      return;
    }

    if (action === "mute") {
      onToggleMuted(conversation);
      return;
    }

    if (action === "rename") {
      handleConversationRename(conversation);
      return;
    }

    if (action === "clear") {
      onClearConversation(conversation);
      return;
    }

    onDeleteConversation(conversation);
  }

  return (
    <section className="chat-workbench-parity" aria-label={text.workspaceAria}>
      <aside className="chat-workbench-parity__sidebar">
        <div className="chat-workbench-parity__workspace-title">
          <WorkspaceMaterialSymbol name="layers" />
          <span>{activeWorkspace.metadata.name || text.workspaceFallback}</span>
        </div>
        <div className="chat-workbench-parity__conversation-list custom-scrollbar">
          <ChatConversationGroup
            language={language}
            title={text.channels}
            workspaceName={activeWorkspace.metadata.name}
            conversations={channelConversations}
            selectedConversationId={selectedConversation?.conversationId ?? null}
            isLoading={isLoadingConversations}
            openMenuId={openConversationMenuId}
            onSelectConversation={onSelectConversation}
            onToggleMenu={setOpenConversationMenuId}
            onConversationAction={handleConversationAction}
          />
          <ChatConversationGroup
            language={language}
            title={text.directMessages}
            workspaceName={activeWorkspace.metadata.name}
            conversations={directConversations}
            selectedConversationId={selectedConversation?.conversationId ?? null}
            isLoading={false}
            openMenuId={openConversationMenuId}
            onSelectConversation={onSelectConversation}
            onToggleMenu={setOpenConversationMenuId}
            onConversationAction={handleConversationAction}
          />
        </div>
      </aside>

      <main className="chat-workbench-parity__main">
        {activeWorkspace.accessMode === "readOnly" && activeWorkspace.fallbackState ? (
          <div className="chat-workbench-parity__read-only">
            <WorkspaceMaterialSymbol name="lock" />
            <span>
              <strong>{text.readOnlyTitle}</strong>
              {activeWorkspace.fallbackState.reason}
            </span>
          </div>
        ) : null}
        <header className="chat-workbench-parity__header">
          <button
            type="button"
            className="chat-workbench-parity__header-action"
            title={text.roadmap}
            onClick={onOpenRoadmap}
          >
            <WorkspaceMaterialSymbol name="checklist" />
          </button>
          <div className="chat-workbench-parity__header-copy">
            <h1>
              {selectedConversation
                ? chatConversationDisplayTitle(selectedConversation, activeWorkspace.metadata.name)
                : activeWorkspace.metadata.name}
            </h1>
            <p>{chatConversationDescription(selectedConversation, conversationMembers.length, language)}</p>
          </div>
          <div className="chat-workbench-parity__header-actions">
            <button
              type="button"
              className="chat-workbench-parity__members-pill"
              onClick={onOpenMembers}
            >
              <WorkspaceMaterialSymbol name="group" />
              <span>{text.members}</span>
              <strong>{conversationMembers.length}</strong>
            </button>
            <button
              type="button"
              className="chat-workbench-parity__header-action"
              title={text.skills}
              onClick={onOpenSkills}
            >
              <WorkspaceMaterialSymbol name="backpack" />
            </button>
          </div>
        </header>
        {isRenameOpen && selectedConversation ? (
          <form
            className="chat-workbench-parity__rename"
            aria-label={text.renameConversation}
            onSubmit={(event) => {
              event.preventDefault();
              onRenameConversation();
              setIsRenameOpen(false);
            }}
          >
            <input
              value={renameDraft}
              onChange={(event) => onRenameDraftChange(event.target.value)}
              aria-label={text.conversationName}
            />
            <button type="submit" disabled={isUpdatingSettings || !renameDraft.trim()}>
              {isUpdatingSettings ? text.saving : text.save}
            </button>
            <button type="button" onClick={() => setIsRenameOpen(false)}>
              {text.cancel}
            </button>
          </form>
        ) : null}

        <div
          ref={messageListRef}
          className="chat-workbench-parity__messages custom-scrollbar"
          role="log"
          aria-label={text.messageHistory}
        >
          {isLoadingMessages ? (
            <div className="chat-workbench-parity__empty-message">{text.loadingMessages}</div>
          ) : messages.length > 0 ? (
            <>
              {hasOlderMessages ? (
                <button
                  type="button"
                  className="chat-workbench-parity__load-more"
                  disabled={isLoadingOlderMessages}
                  onClick={onLoadOlderMessages}
                >
                  {isLoadingOlderMessages ? text.loadingHistory : text.loadEarlierMessages}
                </button>
              ) : null}
              {messages.map((message) => {
              const author = members.find((member) => member.memberId === message.authorMemberId);
              const isOwner = author?.role === "owner";

              return (
                <article
                  key={message.messageId}
                  className={
                    isOwner
                      ? "chat-workbench-parity__message chat-workbench-parity__message--me"
                      : "chat-workbench-parity__message"
                  }
                >
                  <span className="chat-workbench-parity__avatar">
                    {memberInitials(author?.instanceLabel ?? author?.displayName ?? "O")}
                  </span>
                  <div className="chat-workbench-parity__message-body">
                    <div className="chat-workbench-parity__message-meta">
                      <strong>{author?.instanceLabel ?? author?.displayName ?? text.ownerFallback}</strong>
                      <time>{formatRecentTime(message.createdAtMs)}</time>
                    </div>
                    <p>{message.body}</p>
                    {message.status !== "sent" ? (
                      <span className="chat-workbench-parity__message-status">
                        {chatMessageStatusLabel(message.status, language)}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
              })}
            </>
          ) : (
            <div className="chat-workbench-parity__empty-message">{text.noMessages}</div>
          )}
        </div>

        <form
          className="chat-workbench-parity__input"
          aria-label={text.sendMessage}
          onSubmit={(event) => {
            event.preventDefault();
            onSendMessage();
          }}
        >
          <div className="chat-workbench-parity__quick-prompts" aria-label={text.quickPromptsAria}>
            {text.quickPrompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                disabled={!selectedConversation}
                onClick={() => onMessageDraftChange(appendDraftBlock(messageDraft, prompt.text))}
              >
                {prompt.label}
              </button>
            ))}
          </div>
          {selectedMentionMembers.length > 0 || attachmentEntries.length > 0 ? (
            <div className="chat-workbench-parity__chips" aria-label={text.compositionState}>
              {selectedMentionMembers.map((member) => (
                <button
                  key={member.memberId}
                  type="button"
                  onClick={() => onRemoveMention(member.memberId)}
                >
                  @{member.instanceLabel}
                  <WorkspaceMaterialSymbol name="close" />
                </button>
              ))}
              {attachmentEntries.map((entry) =>
                entry.kind === "roadmap" ? (
                  <span key={attachmentEntryKey(entry)}>
                    <button type="button" onClick={() => onOpenRoadmapReference(entry.taskId)}>
                      <WorkspaceMaterialSymbol name="map" />
                      {attachmentEntryLabel(entry)}
                    </button>
                    <button
                      type="button"
                      aria-label={formatChatText(text.removeAttachment, {
                        label: attachmentEntryLabel(entry),
                      })}
                      onClick={() => onRemoveAttachmentEntry(entry)}
                    >
                      <WorkspaceMaterialSymbol name="close" />
                    </button>
                  </span>
                ) : (
                  <button
                    key={attachmentEntryKey(entry)}
                    type="button"
                    onClick={() => onRemoveAttachmentEntry(entry)}
                  >
                    <WorkspaceMaterialSymbol name="image" />
                    {attachmentEntryLabel(entry)}
                    <WorkspaceMaterialSymbol name="close" />
                  </button>
                ),
              )}
            </div>
          ) : null}
          {hasUnsupportedAllMention ? (
            <p className="chat-workbench-parity__input-warning">
              {text.unsupportedAllMention}
            </p>
          ) : null}
          {isEmojiPanelOpen ? (
            <div className="chat-workbench-parity__emoji-panel" role="dialog" aria-label={text.emojiPanel}>
              <div className="chat-workbench-parity__emoji-search">
                <input
                  value={emojiSearch}
                  onChange={(event) => setEmojiSearch(event.target.value)}
                  placeholder={text.emojiSearch}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setIsEmojiPanelOpen(false);
                    }
                  }}
                />
              </div>
              <div className="chat-workbench-parity__emoji-groups" aria-label={text.emojiGroups}>
                {GOLUTRA_EMOJI_GROUP_OPTIONS.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    aria-label={group.label}
                    title={group.label}
                    className={
                      activeEmojiGroupId === group.id
                        ? "chat-workbench-parity__emoji-group--active"
                        : undefined
                    }
                    disabled={
                      group.id === RECENT_EMOJI_GROUP_ID &&
                      golutraRecentEmojiEntries(recentEmojis).length === 0
                    }
                    onClick={() => {
                      setEmojiSearch("");
                      setActiveEmojiGroupId(group.id);
                    }}
                  >
                    {group.icon}
                  </button>
                ))}
              </div>
              <div className="chat-workbench-parity__emoji-grid custom-scrollbar">
                {filteredEmojiEntries.length > 0 ? (
                  filteredEmojiEntries.map((option) => (
                    <button
                      key={`${option.emoji}-${option.order}`}
                      type="button"
                      aria-label={`${option.label} ${option.emoji}`}
                      onClick={() => handleSelectEmoji(option.emoji)}
                    >
                      {option.emoji}
                    </button>
                  ))
                ) : (
                  <p className="chat-workbench-parity__emoji-empty">{text.emojiEmpty}</p>
                )}
              </div>
            </div>
          ) : null}
          {isRoadmapAttachmentPickerOpen ? (
            <div className="chat-workbench-parity__attachment-picker" role="dialog" aria-label={text.selectRoadmapTask}>
              <header>
                <span>{text.roadmap}</span>
                <strong>{roadmapTasks.length}</strong>
              </header>
              {roadmapTasks.length > 0 ? (
                roadmapTasks.map((task) => (
                  <button key={task.taskId} type="button" onClick={() => onSelectRoadmapAttachment(task)}>
                    <span>{task.title}</span>
                    <small>{roadmapTaskStatusLabel(task.status)}</small>
                  </button>
                ))
              ) : (
                <p>{text.noRoadmapTasks}</p>
              )}
            </div>
          ) : null}
          <div className="chat-workbench-parity__input-toolbar">
            <button type="button" aria-label={text.addRoadmapAttachment} onClick={onOpenRoadmapAttachmentPicker}>
              <WorkspaceMaterialSymbol name="add" />
            </button>
            <button
              type="button"
              aria-label={text.mentionMember}
              disabled={!selectedConversation || conversationMembers.length === 0}
              onClick={() => {
                const mentionable = conversationMembers.find((member) => member.permissions.canMention);

                if (mentionable) {
                  onAddMention(mentionable);
                }
              }}
            >
              <WorkspaceMaterialSymbol name="alternate_email" />
            </button>
            <button
              type="button"
              aria-label={text.openEmojiPanel}
              onClick={handleToggleEmojiPanel}
            >
              <WorkspaceMaterialSymbol name="mood" />
            </button>
            <button type="button" aria-label={text.addImageAttachment} onClick={onAddImageAttachment}>
              <WorkspaceMaterialSymbol name="image" />
            </button>
          </div>
          <textarea
            ref={messageInputRef}
            value={messageDraft}
            disabled={!selectedConversation}
            onChange={(event) => onMessageDraftChange(event.target.value)}
            maxLength={1200}
            placeholder={selectedConversation ? text.messagePlaceholder : text.selectConversationPlaceholder}
            rows={1}
            onKeyDown={(event) => {
              if (event.key === "Escape" && isEmojiPanelOpen) {
                event.preventDefault();
                setIsEmojiPanelOpen(false);
                return;
              }

              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                onSendMessage();
              }
            }}
          />
          {mentionSuggestions.length > 0 ? (
            <div className="chat-workbench-parity__mention-menu" role="listbox" aria-label={text.mentionSuggestions}>
              {mentionSuggestions.map((member) => (
                <button
                  key={member.memberId}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => onAddMention(member)}
                >
                  <span className="chat-workbench-parity__avatar">
                    {memberInitials(member.instanceLabel || member.displayName)}
                  </span>
                  <span>
                    <strong>@{member.instanceLabel}</strong>
                    <small>{parityMemberRoleLabel(member.role, language)}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="submit"
            aria-label={isSendingMessage ? text.sendingMessage : text.sendMessage}
            className="chat-workbench-parity__send"
            disabled={!selectedConversation || isSendingMessage || messageDraft.trim().length === 0}
          >
            <WorkspaceMaterialSymbol name={isSendingMessage ? "hourglass_top" : "send"} />
          </button>
          <div className="chat-workbench-parity__input-hint">
            <span>{text.inputHint}</span>
            {messageDraft.length >= 960 ? <span>{messageDraft.length}/1200</span> : null}
          </div>
        </form>
      </main>

      <aside className="chat-workbench-parity__members">
        <div className="chat-workbench-parity__members-header">
          <span>{text.members}</span>
          <div className="chat-workbench-parity__invite">
            <button
              type="button"
              className={isInviteMenuOpen ? "chat-workbench-parity__invite-button--active" : ""}
              onClick={() => setIsInviteMenuOpen((isOpen) => !isOpen)}
            >
              <WorkspaceMaterialSymbol name="person_add" />
              {text.add}
            </button>
            {isInviteMenuOpen ? (
              <>
                <button
                  type="button"
                  className="friends-parity__scrim"
                  aria-label={text.closeInviteMenu}
                  onClick={() => setIsInviteMenuOpen(false)}
                />
                <ParityInviteMenu language={language} onSelect={openInviteModal} />
              </>
            ) : null}
          </div>
        </div>
        <div className="chat-workbench-parity__member-list custom-scrollbar">
          {conversationMembers.length > 0 ? (
            parityMemberSections(conversationMembers, language).map((section) => (
              <section key={section.title} className="chat-workbench-parity__member-section">
                <h3>{section.title}</h3>
                {section.members.map((member) => (
                  <div key={member.memberId} className="chat-workbench-parity__member">
                    <span className="chat-workbench-parity__avatar">
                      {memberInitials(member.instanceLabel || member.displayName)}
                    </span>
                    <span className="chat-workbench-parity__member-copy">
                      <strong>{member.instanceLabel || member.displayName}</strong>
                      <span>{parityMemberRoleLabel(member.role, language)}</span>
                      <small>{parityMemberStatusLabel(member.status, language)}</small>
                    </span>
                    <span
                      className={`chat-workbench-parity__status chat-workbench-parity__status--${member.status}`}
                      title={parityMemberStatusLabel(member.status, language)}
                    />
                    <button
                      type="button"
                      className="chat-workbench-parity__member-menu-button"
                      aria-label={formatChatText(text.actionsFor, {
                        name: member.instanceLabel || member.displayName,
                      })}
                      onClick={() =>
                        setOpenMemberMenuId((current) =>
                          current === member.memberId ? null : member.memberId,
                        )
                      }
                    >
                      <WorkspaceMaterialSymbol name="more_vert" />
                    </button>
                    {openMemberMenuId === member.memberId ? (
                      <ChatMemberActionMenu
                        member={member}
                        language={language}
                        onClose={() => setOpenMemberMenuId(null)}
                        onStartPrivateConversation={onStartPrivateConversation}
                        onOpenMemberTerminal={onOpenMemberTerminal}
                        onMentionMember={onMentionMember}
                        onRenameMember={onRenameMember}
                        onUpdateMemberStatus={onUpdateMemberStatus}
                        onRemoveMember={onRemoveMember}
                        onUnavailable={onUnavailable}
                      />
                    ) : null}
                  </div>
                ))}
              </section>
            ))
          ) : (
            <p className="chat-workbench-parity__members-empty">{text.noMembers}</p>
          )}
        </div>
      </aside>
      {inviteModal === "admin" ? (
        <ParityAdminInviteModal
          language={language}
          onClose={() => setInviteModal(null)}
          onSubmit={submitInvite}
        />
      ) : inviteModal === "assistant" || inviteModal === "member" ? (
        <ParityAssistantInviteModal
          language={language}
          kind={inviteModal}
          runtimeKind={inviteRuntimeKind}
          builtinRuntimeId={inviteBuiltinRuntimeId}
          customRuntimeCliId={inviteCustomRuntimeCliId}
          customRuntimeCommand={inviteCustomRuntimeCommand}
          builtInRuntimeOptions={builtInRuntimeOptions}
          customCliRuntimeOptions={customCliRuntimeOptions}
          instanceCount={inviteInstanceCount}
          sandboxed={inviteSandboxed}
          unlimitedAccess={inviteUnlimitedAccess}
          isInviting={isInviting}
          onClose={() => setInviteModal(null)}
          onRuntimeKindChange={onInviteRuntimeKindChange}
          onBuiltinRuntimeChange={onInviteBuiltinRuntimeChange}
          onCustomRuntimeCliChange={onInviteCustomRuntimeCliChange}
          onCustomRuntimeCommandChange={onInviteCustomRuntimeCommandChange}
          onInstanceCountChange={onInviteInstanceCountChange}
          onSandboxedChange={onInviteSandboxedChange}
          onUnlimitedAccessChange={onInviteUnlimitedAccessChange}
          onSubmit={submitInvite}
        />
      ) : null}
    </section>
  );
}

function ChatConversationGroup({
  language,
  title,
  workspaceName,
  conversations,
  selectedConversationId,
  isLoading,
  openMenuId,
  onSelectConversation,
  onToggleMenu,
  onConversationAction,
}: {
  language: AppLanguage;
  title: string;
  workspaceName: string;
  conversations: ConversationProfile[];
  selectedConversationId: string | null;
  isLoading: boolean;
  openMenuId: string | null;
  onSelectConversation: (conversationId: string) => void;
  onToggleMenu: (conversationId: string | null) => void;
  onConversationAction: (
    conversation: ConversationProfile,
    action: "pin" | "mute" | "rename" | "clear" | "delete",
  ) => void;
}) {
  const text = CHAT_PARITY_TEXT[language];

  return (
    <section className="chat-workbench-parity__conversation-group">
      <div className="chat-workbench-parity__conversation-heading">
        <h2>{title}</h2>
        <button type="button">
          <WorkspaceMaterialSymbol name="add" />
        </button>
      </div>
      <div className="chat-workbench-parity__conversation-stack">
        {conversations.length > 0 ? (
          conversations.map((conversation) => {
            const displayTitle = chatConversationDisplayTitle(conversation, workspaceName);

            return (
              <div
                key={conversation.conversationId}
                className={
                  selectedConversationId === conversation.conversationId
                    ? "chat-workbench-parity__conversation chat-workbench-parity__conversation--active"
                    : "chat-workbench-parity__conversation"
                }
              >
                <button
                  type="button"
                  className="chat-workbench-parity__conversation-select"
                  onClick={() => onSelectConversation(conversation.conversationId)}
                >
                  <span className="chat-workbench-parity__conversation-icon">
                    {conversation.kind === "private" ? (
                      memberInitials(displayTitle)
                    ) : (
                      <WorkspaceMaterialSymbol name={conversation.kind === "group" ? "forum" : "tag"} />
                    )}
                  </span>
                  <span className="chat-workbench-parity__conversation-copy">
                    <span>
                      {displayTitle}
                      {conversation.isPinned ? <WorkspaceMaterialSymbol name="push_pin" /> : null}
                      {conversation.isMuted ? <WorkspaceMaterialSymbol name="notifications_off" /> : null}
                    </span>
                    <small>{conversation.lastMessagePreview || chatConversationKindLabel(conversation, language)}</small>
                  </span>
                  {conversation.unreadCount > 0 ? (
                    <strong>{unreadBadgeLabel(conversation.unreadCount)}</strong>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="chat-workbench-parity__conversation-menu-button"
                  aria-label={formatChatText(text.actionsFor, { name: displayTitle })}
                  onClick={() =>
                    onToggleMenu(openMenuId === conversation.conversationId ? null : conversation.conversationId)
                  }
                >
                  <WorkspaceMaterialSymbol name="more_vert" />
                </button>
                {openMenuId === conversation.conversationId ? (
                  <div className="chat-workbench-parity__menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => onConversationAction(conversation, "pin")}
                    >
                      <WorkspaceMaterialSymbol name="push_pin" />
                      {conversation.isPinned ? text.conversationActions.unpin : text.conversationActions.pin}
                    </button>
                    {conversation.kind !== "private" && !conversation.isDefault ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => onConversationAction(conversation, "rename")}
                      >
                        <WorkspaceMaterialSymbol name="edit" />
                        {text.conversationActions.rename}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => onConversationAction(conversation, "mute")}
                    >
                      <WorkspaceMaterialSymbol name="notifications_off" />
                      {conversation.isMuted ? text.conversationActions.unmute : text.conversationActions.mute}
                    </button>
                    <span className="chat-workbench-parity__menu-separator" />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => onConversationAction(conversation, "clear")}
                    >
                      <WorkspaceMaterialSymbol name="delete_sweep" />
                      {text.conversationActions.clear}
                    </button>
                    {!conversation.isDefault ? (
                      <button
                        type="button"
                        role="menuitem"
                        className="chat-workbench-parity__menu-danger"
                        onClick={() => onConversationAction(conversation, "delete")}
                      >
                        <WorkspaceMaterialSymbol name="delete" />
                        {conversation.kind === "private"
                          ? text.conversationActions.deleteDirect
                          : text.conversationActions.deleteGroup}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <p className="chat-workbench-parity__conversation-empty">
            {isLoading ? text.loading : text.empty}
          </p>
        )}
      </div>
    </section>
  );
}

function ChatMemberActionMenu({
  member,
  language,
  onClose,
  onStartPrivateConversation,
  onOpenMemberTerminal,
  onMentionMember,
  onRenameMember,
  onUpdateMemberStatus,
  onRemoveMember,
  onUnavailable,
}: {
  member: MemberProfile;
  language: AppLanguage;
  onClose: () => void;
  onStartPrivateConversation: (member: MemberProfile) => void;
  onOpenMemberTerminal: (member: MemberProfile) => void;
  onMentionMember: (member: MemberProfile) => void;
  onRenameMember: (member: MemberProfile, displayName: string) => Promise<void>;
  onUpdateMemberStatus: (member: MemberProfile, status: MemberProfile["status"]) => void;
  onRemoveMember: (member: MemberProfile) => void;
  onUnavailable: (capability: string) => void;
}) {
  const text = CHAT_PARITY_TEXT[language];
  const terminalCapable = isTerminalCapableMember(member);

  async function renameMember() {
    const nextName = window.prompt(text.memberActions.renamePrompt, member.instanceLabel || member.displayName);

    if (!nextName?.trim()) {
      return;
    }

    await onRenameMember(member, nextName.trim());
  }

  function run(action: () => void | Promise<void>) {
    void Promise.resolve(action()).finally(onClose);
  }

  return (
    <div className="chat-workbench-parity__menu chat-workbench-parity__member-menu" role="menu">
      <button type="button" role="menuitem" onClick={() => run(() => onStartPrivateConversation(member))}>
        <WorkspaceMaterialSymbol name="chat" />
        {text.memberActions.sendMessage}
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!member.permissions.canMention}
        onClick={() => run(() => onMentionMember(member))}
      >
        <WorkspaceMaterialSymbol name="alternate_email" />
        {text.memberActions.mention}
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => run(() => (terminalCapable ? onOpenMemberTerminal(member) : onUnavailable("成员终端")))}
      >
        <WorkspaceMaterialSymbol name="terminal" />
        {text.memberActions.openTerminal}
      </button>
      <button type="button" role="menuitem" onClick={() => run(renameMember)}>
        <WorkspaceMaterialSymbol name="edit" />
        {text.memberActions.rename}
      </button>
      <span className="chat-workbench-parity__menu-separator" />
      {(["online", "working", "doNotDisturb", "offline"] satisfies MemberProfile["status"][]).map(
        (status) => (
          <button
            key={status}
            type="button"
            role="menuitem"
            onClick={() => run(() => onUpdateMemberStatus(member, status))}
          >
            <WorkspaceMaterialSymbol name="radio_button_checked" />
            {parityMemberStatusLabel(status, language)}
          </button>
        ),
      )}
      {member.role !== "owner" && member.permissions.canRemove ? (
        <>
          <span className="chat-workbench-parity__menu-separator" />
          <button
            type="button"
            role="menuitem"
            className="chat-workbench-parity__menu-danger"
            onClick={() => run(() => onRemoveMember(member))}
          >
            <WorkspaceMaterialSymbol name="person_remove" />
            {text.memberActions.remove}
          </button>
        </>
      ) : null}
    </div>
  );
}

function formatChatText(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template,
  );
}

function chatConversationKindLabel(conversation: ConversationProfile, language: AppLanguage) {
  const text = CHAT_PARITY_TEXT[language];

  if (conversation.kind === "channel") {
    return conversation.isDefault ? text.defaultChannel : text.channel;
  }

  if (conversation.kind === "group") {
    return formatChatText(text.memberCount, { count: conversation.members.length });
  }

  return text.directMessage;
}

function chatConversationDisplayTitle(conversation: ConversationProfile, workspaceName: string) {
  const normalizedWorkspaceName = workspaceName.trim();

  if (conversation.isDefault && normalizedWorkspaceName) {
    return normalizedWorkspaceName;
  }

  return conversation.title;
}

function chatConversationDescription(
  conversation: ConversationProfile | null,
  memberCount: number,
  language: AppLanguage,
) {
  const text = CHAT_PARITY_TEXT[language];

  if (!conversation) {
    return text.selectConversation;
  }

  if (conversation.kind === "private") {
    return text.directMessage;
  }

  if (conversation.kind === "group") {
    return formatChatText(text.memberCount, { count: memberCount });
  }

  return conversation.isDefault ? text.defaultWorkspaceChannel : text.workspaceChannel;
}

function memberInitials(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "O";
  }

  return normalized.slice(0, 2).toLocaleUpperCase();
}

function parityMemberRoleLabel(role: MemberProfile["role"], language: AppLanguage) {
  return CHAT_PARITY_TEXT[language].roles[role];
}

function parityMemberSections(members: MemberProfile[], language: AppLanguage) {
  const text = CHAT_PARITY_TEXT[language];
  const sections = [
    {
      role: "owner" as const,
      members: members.filter((member) => member.role === "owner"),
    },
    {
      role: "admin" as const,
      members: members.filter((member) => member.role === "admin"),
    },
    {
      role: "assistant" as const,
      members: members.filter((member) => member.role === "assistant"),
    },
    {
      role: "member" as const,
      members: members.filter((member) => member.role === "member"),
    },
  ];

  return sections
    .filter((section) => section.members.length > 0)
    .map((section) => ({
      ...section,
      title: formatChatText(text.sections[section.role], { count: section.members.length }),
    }));
}

function parityMemberStatusLabel(status: MemberProfile["status"], language: AppLanguage) {
  return CHAT_PARITY_TEXT[language].statuses[status];
}

function chatMessageStatusLabel(status: ChatMessageProfile["status"], language: AppLanguage) {
  return CHAT_PARITY_TEXT[language].messageStatuses[status];
}

type WorkspaceSelectionLandingWorkspace = {
  projectId: string;
  path: string;
  name: string;
  firstOpenedAtMs: number;
  lastOpenedAtMs: number;
};

type WorkspaceSelectionLandingToast = {
  id: number;
  tone: "info" | "warning" | "error";
  title: string;
  message: string;
  action?: string;
};

function WorkspaceSelectionLanding({
  text,
  language,
  isOpening,
  isLoading,
  recentPrimaryWorkspaces,
  recentMoreWorkspaces,
  filteredMoreWorkspaces,
  recentSearch,
  windowContext,
  integrityReport,
  isValidatingIntegrity,
  isSyncActionPending,
  showCompatibilityControls,
  statusRecentWorkspaceCount,
  pendingConflict,
  conflictPrimaryButtonRef,
  toast,
  onOpenWorkspace,
  onOpenRecent,
  onRecentSearchChange,
  onRefreshRecent,
  onThemeChange,
  onLanguageChange,
  onOpenWindowMode,
  onValidateIntegrity,
  onResolveConflict,
  onCancelConflict,
  onClearToast,
}: {
  text: (typeof WORKSPACE_SELECTION_TEXT)[AppLanguage];
  language: AppLanguage;
  isOpening: boolean;
  isLoading: boolean;
  recentPrimaryWorkspaces: WorkspaceSelectionLandingWorkspace[];
  recentMoreWorkspaces: WorkspaceSelectionLandingWorkspace[];
  filteredMoreWorkspaces: WorkspaceSelectionLandingWorkspace[];
  recentSearch: string;
  windowContext: WindowContextSnapshot | null;
  integrityReport: DataIntegrityReport | null;
  isValidatingIntegrity: boolean;
  isSyncActionPending: boolean;
  showCompatibilityControls: boolean;
  statusRecentWorkspaceCount: number;
  pendingConflict: PendingConflict | null;
  conflictPrimaryButtonRef: RefObject<HTMLButtonElement | null>;
  toast: WorkspaceSelectionLandingToast | null;
  onOpenWorkspace: () => Promise<void>;
  onOpenRecent: (path: string) => Promise<void>;
  onRecentSearchChange: (value: string) => void;
  onRefreshRecent: () => void;
  onThemeChange: (theme: AppTheme) => void;
  onLanguageChange: (language: AppLanguage) => void;
  onOpenWindowMode: (mode: WindowMode) => void;
  onValidateIntegrity: () => void;
  onResolveConflict: (resolution: WorkspaceConflictResolution) => Promise<void>;
  onCancelConflict: () => void;
  onClearToast: () => void;
}) {
  return (
    <main className="workspace-selection-parity">
      <div className="workspace-selection-parity__ambient" aria-hidden="true">
        <div className="workspace-selection-parity__glow workspace-selection-parity__glow--top" />
        <div className="workspace-selection-parity__glow workspace-selection-parity__glow--bottom" />
      </div>

      <div className="workspace-selection-parity__container">
        <section className="workspace-selection-parity__hero" aria-label={text.workspaceSelection}>
          <button
            type="button"
            aria-label={text.openFolder}
            disabled={isOpening}
            onClick={() => void onOpenWorkspace()}
            className="workspace-selection-parity__open-card"
          >
            <span className="workspace-selection-parity__open-sheen" aria-hidden="true" />
            <span className="workspace-selection-parity__open-icon">
              <WorkspaceMaterialSymbol name="folder_open" />
            </span>
            <span className="workspace-selection-parity__open-title">
              {isOpening ? text.openingFolder : text.openFolder}
            </span>
            <span className="workspace-selection-parity__open-subtitle">
              {text.openFolderSubtitle}
            </span>
          </button>
        </section>

        <section className="workspace-selection-parity__recent" aria-labelledby="recent-workspaces-title">
          <div className="workspace-selection-parity__section-header">
            <h2 id="recent-workspaces-title">{text.recentWorkspaces}</h2>
            <div className="workspace-selection-parity__rule" />
            {recentMoreWorkspaces.length > 0 ? (
              <div className="workspace-selection-parity__more">
                <button type="button" className="workspace-selection-parity__more-button">
                  <span>{language === "zh-CN" ? "更多" : "More"}</span>
                  <WorkspaceMaterialSymbol name="expand_more" />
                </button>
                <div className="workspace-selection-parity__more-menu">
                  <label className="workspace-selection-parity__search">
                    <WorkspaceMaterialSymbol name="search" />
                    <span className="sr-only">{text.searchFolders}</span>
                    <input
                      value={recentSearch}
                      onChange={(event) => onRecentSearchChange(event.target.value)}
                      placeholder={text.searchFoldersPlaceholder}
                    />
                  </label>
                  <div className="workspace-selection-parity__more-list custom-scrollbar">
                    {filteredMoreWorkspaces.length > 0 ? (
                      filteredMoreWorkspaces.map((workspace) => (
                        <button
                          key={workspace.projectId}
                          type="button"
                          className="workspace-selection-parity__more-item"
                          aria-label={`${text.openRecentPrefix} ${workspace.name}`}
                          onClick={() => void onOpenRecent(workspace.path)}
                        >
                          <span className="workspace-selection-parity__more-icon">
                            <WorkspaceMaterialSymbol name="folder" />
                          </span>
                          <span className="workspace-selection-parity__more-copy">
                            <span>{workspace.name}</span>
                            <span>{formatWorkspacePath(workspace.path)}</span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="workspace-selection-parity__no-results">
                        {text.noMatchingWorkspaces}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {recentPrimaryWorkspaces.length > 0 ? (
            <div className="workspace-selection-parity__grid">
              {recentPrimaryWorkspaces.map((workspace) => (
                <button
                  key={workspace.projectId}
                  type="button"
                  aria-label={`${text.openRecentPrefix} ${workspace.name}`}
                  className="workspace-selection-parity__workspace-card"
                  onClick={() => void onOpenRecent(workspace.path)}
                >
                  <span className="workspace-selection-parity__workspace-icon">
                    <WorkspaceMaterialSymbol name="folder" />
                  </span>
                  <span className="workspace-selection-parity__workspace-name">
                    {workspace.name}
                  </span>
                  <span className="workspace-selection-parity__workspace-path">
                    {formatWorkspacePath(workspace.path)}
                  </span>
                  <span className="workspace-selection-parity__workspace-footer">
                    <span>{formatRelativeWorkspaceTime(workspace.lastOpenedAtMs, language)}</span>
                    <span>{text.open}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="workspace-selection-parity__empty">
              <span className="workspace-selection-parity__empty-icon">
                <WorkspaceMaterialSymbol name="history" />
              </span>
              <p>{text.noRecentWorkspaces}</p>
              <span>{text.noRecentWorkspacesHint}</span>
            </div>
          )}

          {showCompatibilityControls ? (
            <div className="workspace-selection-parity__compat">
              <button
                type="button"
                aria-label={text.refreshRecentWorkspaces}
                className="workspace-selection-parity__compat-icon"
                onClick={onRefreshRecent}
              >
                <WorkspaceMaterialSymbol name="refresh" />
              </button>
              {windowContext ? (
                <WindowContextControls
                  snapshot={windowContext}
                  language={language}
                  disabled={isSyncActionPending}
                  onThemeChange={onThemeChange}
                  onLanguageChange={onLanguageChange}
                  onOpenWindowMode={onOpenWindowMode}
                />
              ) : null}
              {windowContext ? (
                <DataIntegrityPanel
                  report={integrityReport}
                  disabled={isValidatingIntegrity || isLoading}
                  onValidate={onValidateIntegrity}
                />
              ) : null}
              <span className="workspace-selection-parity__count">
                {statusRecentWorkspaceCount} {text.recordsSuffix}
              </span>
            </div>
          ) : null}
        </section>
      </div>

      {pendingConflict ? (
        <WorkspaceConflictDialog
          conflict={pendingConflict.conflict}
          primaryButtonRef={conflictPrimaryButtonRef}
          onResolve={onResolveConflict}
          onCancel={onCancelConflict}
        />
      ) : null}
      {toast ? <Toast toast={toast} onClose={onClearToast} /> : null}
    </main>
  );
}

function WorkspaceMaterialSymbol({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined" aria-hidden="true">
      {name}
    </span>
  );
}

function SkillLibraryPanel({
  skills,
  linkedSkills,
  linkedSkillIds,
  isLoading,
  isLoadingLinks,
  isImporting,
  pendingOpenId,
  pendingDeleteId,
  pendingLinkId,
  pendingUnlinkId,
  onImport,
  onOpen,
  onDelete,
  onLink,
  onUnlink,
  onUnavailableCapability,
}: {
  skills: SkillLibraryEntry[];
  linkedSkills: WorkspaceSkillLinkEntry[];
  linkedSkillIds: Set<string>;
  isLoading: boolean;
  isLoadingLinks: boolean;
  isImporting: boolean;
  pendingOpenId: string | null;
  pendingDeleteId: string | null;
  pendingLinkId: string | null;
  pendingUnlinkId: string | null;
  onImport: () => void;
  onOpen: (skillId: string) => void;
  onDelete: (skillId: string) => void;
  onLink: (skillId: string) => void;
  onUnlink: (skillId: string) => void;
  onUnavailableCapability: (title: string, status: CapabilityStatus) => void;
}) {
  return (
    <section
      aria-labelledby="skill-library-title"
      className="mt-6 rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#6a786c]">技能</p>
          <h2 id="skill-library-title" className="mt-1 text-sm font-semibold text-[#263229]">
            我的技能库
          </h2>
        </div>
        <button
          type="button"
          onClick={onImport}
          disabled={isImporting || isLoading}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
        >
          <Plus aria-hidden="true" size={14} strokeWidth={2} />
          {isImporting ? "导入中" : "导入技能"}
        </button>
      </div>

      <div className="mt-4">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-[#3f4b41]">当前工作区技能</h3>
            <span className="text-[11px] text-[#7a8678]">{linkedSkills.length} 个关联</span>
          </div>

          {isLoadingLinks ? (
            <p className="mt-2 rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-sm text-[#6a786c]">
              正在加载工作区技能
            </p>
          ) : linkedSkills.length > 0 ? (
            <ul className="mt-2 grid gap-2" aria-label="当前工作区技能列表">
              {linkedSkills.map((skill) => (
                <li
                  key={skill.skillId}
                  className="grid gap-2 rounded-md border border-[#d9e6d4] bg-white p-3"
                >
                  <div className="flex min-w-0 flex-wrap items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eef3eb] text-[#3f6849]">
                      <Link2 aria-hidden="true" size={16} strokeWidth={2} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[#263229]">
                        {skill.name}
                      </span>
                      <span className="mt-1 block truncate font-mono text-[11px] text-[#879182]" title={skill.linkPath}>
                        {skill.linkPath}
                      </span>
                      {skill.linkMode === "manifest" ? (
                        <span className="mt-2 block rounded-md border border-[#ead8a8] bg-[#fff8e4] px-2 py-1 text-xs text-[#6f5b1f]">
                          清单链接：{skill.unavailableReason ?? "symlink 不可用"}
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      disabled={pendingUnlinkId === skill.skillId}
                      onClick={() => onUnlink(skill.skillId)}
                      className="inline-flex min-h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-[#d7c8c5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6d3d38] transition hover:border-[#b9857f] hover:bg-[#fff5f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d5e58] disabled:cursor-wait disabled:opacity-70"
                    >
                      <Unlink aria-hidden="true" size={13} strokeWidth={2} />
                      {pendingUnlinkId === skill.skillId ? "移除中" : "取消关联"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-sm text-[#6a786c]">
              当前工作区还没有关联技能
            </p>
          )}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-semibold text-[#3f4b41]">我的技能</h3>
            <span className="text-[11px] text-[#7a8678]">{skills.length} 个可用</span>
          </div>

        {isLoading ? (
          <p className="mt-2 rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-sm text-[#6a786c]">
            正在加载技能库
          </p>
        ) : skills.length > 0 ? (
          <ul className="mt-2 grid gap-2" aria-label="本地技能列表">
            {skills.map((skill) => (
              <li
                key={skill.skillId}
                className="grid gap-2 rounded-md border border-[#e3eadf] bg-white p-3"
              >
                <div className="flex min-w-0 flex-wrap items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eef3eb] text-[#3f6849]">
                    <FolderOpen aria-hidden="true" size={16} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#263229]">
                      {skill.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[#6a786c]">
                      {skill.description ?? "本地技能文件夹"}
                    </span>
                    <span className="mt-1 block truncate font-mono text-[11px] text-[#879182]" title={skill.sourcePath}>
                      {skill.sourcePath}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={pendingOpenId === skill.skillId || pendingDeleteId === skill.skillId}
                      onClick={() => onOpen(skill.skillId)}
                      className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md border border-[#cfe0c9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#37533e] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
                    >
                      <FolderOpen aria-hidden="true" size={13} strokeWidth={2} />
                      {pendingOpenId === skill.skillId ? "打开中" : "打开文件夹"}
                    </button>
                    <button
                      type="button"
                      disabled={pendingDeleteId === skill.skillId}
                      onClick={() => onDelete(skill.skillId)}
                      className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md border border-[#d7c8c5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6d3d38] transition hover:border-[#b9857f] hover:bg-[#fff5f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d5e58] disabled:cursor-wait disabled:opacity-70"
                    >
                      <Trash2 aria-hidden="true" size={13} strokeWidth={2} />
                      {pendingDeleteId === skill.skillId ? "删除中" : "删除技能"}
                    </button>
                    {linkedSkillIds.has(skill.skillId) ? (
                      <span className="inline-flex min-h-8 items-center rounded-md border border-[#cfe0c9] bg-[#f8fbf6] px-2 py-1 text-[11px] font-semibold text-[#37533e]">
                        已关联
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={pendingLinkId === skill.skillId}
                        onClick={() => onLink(skill.skillId)}
                        className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md border border-[#cfe0c9] bg-[#f8fbf6] px-2.5 py-1.5 text-xs font-semibold text-[#37533e] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
                      >
                        <Link2 aria-hidden="true" size={13} strokeWidth={2} />
                        {pendingLinkId === skill.skillId ? "关联中" : "关联"}
                      </button>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-sm text-[#6a786c]">
            我的技能库里暂无可用技能
          </p>
        )}
        </div>

        <div className="mt-5" aria-label="技能能力分类">
          <h3 className="text-xs font-semibold text-[#3f4b41]">能力来源</h3>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <CapabilityClassItem
              title="本地技能"
              status="implemented"
              description="导入的本地文件夹，可打开、关联和删除库记录。"
            />
            <CapabilityClassItem
              title="技能商店"
              status="placeholder"
              description="远程技能安装尚未启用。"
              actionLabel="打开技能商店"
              onAction={() => onUnavailableCapability("技能商店", "placeholder")}
            />
            <CapabilityClassItem
              title="远程插件"
              status="placeholder"
              description="插件 API 和权限模型将在后续故事中定义。"
              actionLabel="启用远程插件"
              onAction={() => onUnavailableCapability("远程插件", "placeholder")}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileSettingsModal({
  draft,
  savedProfile,
  notificationDraft,
  savedNotificationPreferences,
  shortcutDraft,
  savedShortcutPreferences,
  chatTerminalOutputDraft,
  savedChatTerminalOutputPreferences,
  terminalDraft,
  savedTerminalConfiguration,
  activeWorkspaceId,
  activeWorkspaceName,
  chatMaintenanceResult,
  fieldError,
  notificationError,
  shortcutError,
  chatTerminalOutputError,
  terminalError,
  isLoading,
  isSaving,
  isNotificationLoading,
  isNotificationSaving,
  isShortcutLoading,
  isShortcutSaving,
  isChatTerminalOutputLoading,
  isChatTerminalOutputSaving,
  isRepairingChatData,
  isClearingWorkspaceChatData,
  isTerminalLoading,
  isTerminalSaving,
  pendingAvatarAction,
  onDraftChange,
  onNotificationDraftChange,
  onShortcutDraftChange,
  onChatTerminalOutputDraftChange,
  onTerminalDraftChange,
  onUploadAvatar,
  onSelectAvatarPreset,
  onResetAvatar,
  onDeleteUploadedAvatar,
  onClose,
  onSave,
  onSaveNotifications,
  onSaveShortcuts,
  onResetShortcuts,
  onSaveChatTerminalOutput,
  onRepairChatData,
  onClearWorkspaceChatData,
  onSaveTerminalConfiguration,
  onResetTerminalConfiguration,
}: {
  draft: ProfileSettingsDraft;
  savedProfile: ProfileSettingsSnapshot;
  notificationDraft: NotificationPreferencesDraft;
  savedNotificationPreferences: NotificationPreferencesSnapshot;
  shortcutDraft: ShortcutPreferencesDraft;
  savedShortcutPreferences: ShortcutPreferencesSnapshot;
  chatTerminalOutputDraft: ChatTerminalOutputPreferencesDraft;
  savedChatTerminalOutputPreferences: ChatTerminalOutputPreferencesSnapshot;
  terminalDraft: TerminalConfigurationDraft;
  savedTerminalConfiguration: TerminalConfigurationSnapshot;
  activeWorkspaceId: string | null;
  activeWorkspaceName: string | null;
  chatMaintenanceResult: ChatMaintenanceResultView | null;
  fieldError: { field: ProfileSettingsField; message: string } | null;
  notificationError: string | null;
  shortcutError: string | null;
  chatTerminalOutputError: string | null;
  terminalError: string | null;
  isLoading: boolean;
  isSaving: boolean;
  isNotificationLoading: boolean;
  isNotificationSaving: boolean;
  isShortcutLoading: boolean;
  isShortcutSaving: boolean;
  isChatTerminalOutputLoading: boolean;
  isChatTerminalOutputSaving: boolean;
  isRepairingChatData: boolean;
  isClearingWorkspaceChatData: boolean;
  isTerminalLoading: boolean;
  isTerminalSaving: boolean;
  pendingAvatarAction: ProfileAvatarAction | null;
  onDraftChange: (draft: ProfileSettingsDraft) => void;
  onNotificationDraftChange: (draft: NotificationPreferencesDraft) => void;
  onShortcutDraftChange: (draft: ShortcutPreferencesDraft) => void;
  onChatTerminalOutputDraftChange: (draft: ChatTerminalOutputPreferencesDraft) => void;
  onTerminalDraftChange: (draft: TerminalConfigurationDraft) => void;
  onUploadAvatar: () => void;
  onSelectAvatarPreset: (presetId: string) => void;
  onResetAvatar: () => void;
  onDeleteUploadedAvatar: () => void;
  onClose: () => void;
  onSave: () => void;
  onSaveNotifications: () => void;
  onSaveShortcuts: () => void;
  onResetShortcuts: () => void;
  onSaveChatTerminalOutput: () => void;
  onRepairChatData: () => void;
  onClearWorkspaceChatData: () => void;
  onSaveTerminalConfiguration: () => void;
  onResetTerminalConfiguration: () => void;
}) {
  const canSave = draft.displayName.trim().length > 0 && draft.timezone.trim().length > 0;
  const selectedPresetId = savedProfile.avatar?.kind === "preset" ? savedProfile.avatar.presetId : null;
  const avatarControlsDisabled = pendingAvatarAction !== null;
  const canSaveNotifications =
    !isNotificationSaving &&
    notificationDraft.dndStartTime.length === 5 &&
    notificationDraft.dndEndTime.length === 5;
  const canSaveShortcuts = !isShortcutSaving;
  const canSaveChatTerminalOutput = !isChatTerminalOutputSaving;
  const canSaveTerminalConfiguration = !isTerminalSaving;
  const permissionUnavailable = savedNotificationPreferences.permission.state === "unavailable";
  const placeholderStatusMeta = capabilityStatusMeta("placeholder");
  const disabledShortcutIds = new Set(shortcutDraft.disabledActionIds);
  const updateShortcutActionEnabled = (actionId: string, enabled: boolean) => {
    const nextDisabledActionIds = enabled
      ? shortcutDraft.disabledActionIds.filter((item) => item !== actionId)
      : Array.from(new Set([...shortcutDraft.disabledActionIds, actionId])).sort();

    onShortcutDraftChange({
      ...shortcutDraft,
      disabledActionIds: nextDisabledActionIds,
    });
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#17211b]/35 px-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-settings-title"
        className="max-h-[92vh] w-full max-w-[720px] overflow-y-auto rounded-lg border border-[#dbe4d7] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#6a786c]">Profile</p>
            <h2 id="profile-settings-title" className="mt-1 text-base font-semibold text-[#263229]">
              个人资料设置
            </h2>
            <p className="mt-2 text-sm text-[#526054]">
              当前保存：{savedProfile.displayName} · {memberStatusLabel(savedProfile.status)}
            </p>
          </div>
          <button
            type="button"
            aria-label="关闭个人资料设置"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#d8e2d4] bg-white text-[#526054] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
          >
            <X aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>

        <form
          aria-label="个人资料设置"
          className="mt-5 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}
        >
          <div className="grid gap-3 rounded-md border border-[#e3eadf] bg-[#fbfcfa] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <AvatarPreview avatar={savedProfile.avatar} displayName={draft.displayName} size="lg" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#263229]">
                    {profileAvatarLabel(savedProfile.avatar)}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#6a786c]">
                    {savedProfile.avatar?.kind === "uploaded"
                      ? savedProfile.avatar.sourceFileName ?? "上传头像"
                      : "本地头像，不会上传到远端服务"}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={onUploadAvatar}
                disabled={avatarControlsDisabled}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Upload aria-hidden="true" size={14} strokeWidth={2} />
                {pendingAvatarAction === "upload" ? "上传中" : "上传图片"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PROFILE_AVATAR_PRESETS.map((preset) => {
                const selected = selectedPresetId === preset.id;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={selected}
                    aria-label={`选择 ${preset.label} 头像预设`}
                    onClick={() => onSelectAvatarPreset(preset.id)}
                    disabled={avatarControlsDisabled}
                    className={
                      selected
                        ? "rounded-md border border-[#2f6f55] bg-white p-2 text-xs font-semibold text-[#263229] ring-2 ring-[#b7d3ae] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
                        : "rounded-md border border-[#d8e2d4] bg-white p-2 text-xs font-medium text-[#526054] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
                    }
                  >
                    <span
                      aria-hidden="true"
                      className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-md ring-1 ${preset.className}`}
                    >
                      {preset.label.slice(0, 1)}
                    </span>
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onResetAvatar}
                disabled={avatarControlsDisabled}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-xs font-semibold text-[#425044] transition hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw aria-hidden="true" size={14} strokeWidth={2} />
                {pendingAvatarAction === "reset" ? "恢复中" : "恢复默认"}
              </button>
              <button
                type="button"
                onClick={onDeleteUploadedAvatar}
                disabled={avatarControlsDisabled || savedProfile.avatar?.kind !== "uploaded"}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#e2c7c0] bg-white px-3 py-2 text-xs font-semibold text-[#7a2f2f] transition hover:bg-[#fff5f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a3b2f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
                {pendingAvatarAction === "delete" ? "删除中" : "删除上传头像"}
              </button>
            </div>
          </div>

          <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
            显示名称
            <input
              value={draft.displayName}
              aria-label="显示名称"
              aria-invalid={fieldError?.field === "displayName"}
              onChange={(event) =>
                onDraftChange({ ...draft, displayName: event.target.value })
              }
              className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87]"
            />
            {fieldError?.field === "displayName" ? (
              <span className="text-xs font-medium text-[#8a3b2f]">{fieldError.message}</span>
            ) : null}
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
              时区
              <select
                value={draft.timezone}
                aria-label="时区"
                aria-invalid={fieldError?.field === "timezone"}
                onChange={(event) =>
                  onDraftChange({ ...draft, timezone: event.target.value })
                }
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
              >
                {PROFILE_TIMEZONE_OPTIONS.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
              {fieldError?.field === "timezone" ? (
                <span className="text-xs font-medium text-[#8a3b2f]">{fieldError.message}</span>
              ) : null}
            </label>

            <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
              状态
              <select
                value={draft.status}
                aria-label="状态"
                aria-invalid={fieldError?.field === "status"}
                onChange={(event) =>
                  onDraftChange({ ...draft, status: event.target.value as ProfileStatus })
                }
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
              >
                <option value="online">在线</option>
                <option value="working">工作中</option>
                <option value="doNotDisturb">请勿打扰</option>
                <option value="offline">离线</option>
              </select>
              {fieldError?.field === "status" ? (
                <span className="text-xs font-medium text-[#8a3b2f]">{fieldError.message}</span>
              ) : null}
            </label>
          </div>

          <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
            状态消息
            <textarea
              value={draft.statusMessage}
              aria-label="状态消息"
              maxLength={160}
              rows={3}
              aria-invalid={fieldError?.field === "statusMessage"}
              onChange={(event) =>
                onDraftChange({ ...draft, statusMessage: event.target.value })
              }
              className="resize-none rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87]"
            />
            <span className="text-[11px] text-[#7a8678]">
              {draft.statusMessage.trim().length}/160
            </span>
            {fieldError?.field === "statusMessage" ? (
              <span className="text-xs font-medium text-[#8a3b2f]">{fieldError.message}</span>
            ) : null}
          </label>

          <section
            aria-labelledby="notification-settings-title"
            className="grid gap-4 rounded-md border border-[#e3eadf] bg-[#fbfcfa] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#6a786c]">
                  <Bell aria-hidden="true" size={14} strokeWidth={2} />
                  通知
                </p>
                <h3
                  id="notification-settings-title"
                  className="mt-1 text-sm font-semibold text-[#263229]"
                >
                  通知偏好
                </h3>
              </div>
              <span className="text-[11px] text-[#7a8678]">
                {isNotificationLoading
                  ? "正在读取通知设置"
                  : `更新时间：${new Date(savedNotificationPreferences.updatedAtMs).toLocaleString()}`}
              </span>
            </div>

            {permissionUnavailable ? (
              <div className="flex items-start gap-2 rounded-md border border-[#ead8a8] bg-[#fff8e4] p-3 text-xs text-[#6f5b1f]">
                <BellOff aria-hidden="true" className="mt-0.5 shrink-0" size={15} strokeWidth={2} />
                <p>
                  <span className="flex flex-wrap items-center gap-2 font-semibold">
                    <span>{savedNotificationPreferences.permission.message}</span>
                    <span className={capabilityStatusClassName("placeholder")}>
                      {placeholderStatusMeta.label}
                    </span>
                  </span>
                  <span className="mt-1 block">
                    {savedNotificationPreferences.permission.userAction}
                  </span>
                </p>
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-2">
              <NotificationToggle
                icon={<Bell aria-hidden="true" size={15} strokeWidth={2} />}
                label="桌面通知"
                checked={notificationDraft.desktopNotificationsEnabled}
                onChange={(checked) =>
                  onNotificationDraftChange({
                    ...notificationDraft,
                    desktopNotificationsEnabled: checked,
                  })
                }
              />
              <NotificationToggle
                icon={<Info aria-hidden="true" size={15} strokeWidth={2} />}
                label="声音提醒"
                checked={notificationDraft.soundEnabled}
                onChange={(checked) =>
                  onNotificationDraftChange({ ...notificationDraft, soundEnabled: checked })
                }
              />
              <NotificationToggle
                icon={<AtSign aria-hidden="true" size={15} strokeWidth={2} />}
                label="仅提及我"
                checked={notificationDraft.mentionsOnly}
                onChange={(checked) =>
                  onNotificationDraftChange({ ...notificationDraft, mentionsOnly: checked })
                }
              />
              <NotificationToggle
                icon={<Eye aria-hidden="true" size={15} strokeWidth={2} />}
                label="显示消息预览"
                checked={notificationDraft.messagePreviewEnabled}
                onChange={(checked) =>
                  onNotificationDraftChange({
                    ...notificationDraft,
                    messagePreviewEnabled: checked,
                  })
                }
              />
            </div>

            <div className="grid gap-3 rounded-md border border-[#edf1eb] bg-white p-3">
              <NotificationToggle
                icon={<Moon aria-hidden="true" size={15} strokeWidth={2} />}
                label="免打扰时段"
                checked={notificationDraft.dndEnabled}
                onChange={(checked) =>
                  onNotificationDraftChange({ ...notificationDraft, dndEnabled: checked })
                }
              />
              {notificationDraft.dndEnabled ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
                    开始
                    <input
                      type="time"
                      value={notificationDraft.dndStartTime}
                      aria-label="免打扰开始时间"
                      onChange={(event) =>
                        onNotificationDraftChange({
                          ...notificationDraft,
                          dndStartTime: event.target.value,
                        })
                      }
                      className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
                    结束
                    <input
                      type="time"
                      value={notificationDraft.dndEndTime}
                      aria-label="免打扰结束时间"
                      onChange={(event) =>
                        onNotificationDraftChange({
                          ...notificationDraft,
                          dndEndTime: event.target.value,
                        })
                      }
                      className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
                    />
                  </label>
                </div>
              ) : null}
            </div>

            {notificationError ? (
              <p className="rounded-md border border-[#e2c7c0] bg-[#fff5f2] p-2 text-xs font-medium text-[#7a2f2f]">
                {notificationError}
              </p>
            ) : null}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={!canSaveNotifications}
                onClick={onSaveNotifications}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
              >
                <CheckCircle2 aria-hidden="true" size={14} strokeWidth={2} />
                {isNotificationSaving ? "保存中" : "保存通知"}
              </button>
            </div>
          </section>

          <section
            aria-labelledby="shortcut-settings-title"
            className="grid gap-4 rounded-md border border-[#e3eadf] bg-[#fbfcfa] p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-medium text-[#6a786c]">
                  <Keyboard aria-hidden="true" size={14} strokeWidth={2} />
                  快捷键
                </p>
                <h3
                  id="shortcut-settings-title"
                  className="mt-1 text-sm font-semibold text-[#263229]"
                >
                  快捷键配置
                </h3>
              </div>
              <span className="text-[11px] text-[#7a8678]">
                {isShortcutLoading
                  ? "正在读取快捷键设置"
                  : `更新时间：${new Date(savedShortcutPreferences.updatedAtMs).toLocaleString()}`}
              </span>
            </div>

            <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
              键位方案
              <select
                value={shortcutDraft.profile}
                aria-label="键位方案"
                onChange={(event) =>
                  onShortcutDraftChange({
                    ...shortcutDraft,
                    profile: event.target.value as ShortcutKeymapProfile,
                  })
                }
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
              >
                <option value="default">默认</option>
                <option value="vscode">VS Code</option>
                <option value="slack">Slack</option>
              </select>
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <NotificationToggle
                icon={<Keyboard aria-hidden="true" size={15} strokeWidth={2} />}
                label="启用快捷键"
                checked={shortcutDraft.shortcutsEnabled}
                onChange={(checked) =>
                  onShortcutDraftChange({ ...shortcutDraft, shortcutsEnabled: checked })
                }
              />
              <NotificationToggle
                icon={<Info aria-hidden="true" size={15} strokeWidth={2} />}
                label="显示快捷键提示"
                checked={shortcutDraft.shortcutHintsEnabled}
                onChange={(checked) =>
                  onShortcutDraftChange({ ...shortcutDraft, shortcutHintsEnabled: checked })
                }
              />
            </div>

            <div className="grid gap-2" aria-label="快捷键列表">
              {savedShortcutPreferences.bindings.map((binding) => {
                const actionDisabled = disabledShortcutIds.has(binding.actionId);
                const effectiveEnabled =
                  shortcutDraft.shortcutsEnabled && binding.available && !actionDisabled;
                const stateLabel = !binding.available
                  ? "不可用"
                  : effectiveEnabled
                    ? "已启用"
                    : "已停用";

                return (
                  <div
                    key={binding.actionId}
                    className="grid gap-2 rounded-md border border-[#edf1eb] bg-white p-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#263229]">
                          {binding.label}
                        </span>
                        <span
                          className={
                            !binding.available
                              ? "rounded-full border border-[#e0c37b] bg-[#fff8e6] px-2 py-0.5 text-[11px] font-semibold text-[#765400]"
                              : effectiveEnabled
                                ? "rounded-full border border-[#b9d0b2] bg-[#eef6ea] px-2 py-0.5 text-[11px] font-semibold text-[#2f5038]"
                                : "rounded-full border border-[#d8e2d4] bg-[#f7f9f5] px-2 py-0.5 text-[11px] font-semibold text-[#637064]"
                          }
                        >
                          {stateLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#6a786c]">
                        {binding.keys.join(" / ")}
                      </p>
                      {!binding.available && binding.unavailableReason ? (
                        <p className="mt-1 text-[11px] text-[#765400]">
                          <span className={capabilityStatusClassName("placeholder")}>
                            {placeholderStatusMeta.label}
                          </span>{" "}
                          <span>{binding.unavailableReason}</span>
                        </p>
                      ) : null}
                    </div>
                    <label className="inline-flex items-center justify-end gap-2 text-xs font-semibold text-[#425044]">
                      <span>{actionDisabled ? "停用" : "启用"}</span>
                      <input
                        type="checkbox"
                        checked={!actionDisabled}
                        disabled={!binding.available}
                        aria-label={`${binding.label} 快捷键`}
                        onChange={(event) =>
                          updateShortcutActionEnabled(binding.actionId, event.target.checked)
                        }
                        className="h-4 w-4 accent-[#2f6f55]"
                      />
                    </label>
                  </div>
                );
              })}
            </div>

            {shortcutError ? (
              <p className="rounded-md border border-[#e2c7c0] bg-[#fff5f2] p-2 text-xs font-medium text-[#7a2f2f]">
                {shortcutError}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={isShortcutSaving}
                aria-label="恢复默认快捷键"
                onClick={onResetShortcuts}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-xs font-semibold text-[#425044] transition hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw aria-hidden="true" size={14} strokeWidth={2} />
                恢复默认
              </button>
              <button
                type="button"
                disabled={!canSaveShortcuts}
                onClick={onSaveShortcuts}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
              >
                <CheckCircle2 aria-hidden="true" size={14} strokeWidth={2} />
                {isShortcutSaving ? "保存中" : "保存快捷键"}
              </button>
            </div>
	          </section>

	          <ChatTerminalOutputPreferencesSection
	            draft={chatTerminalOutputDraft}
	            savedPreferences={savedChatTerminalOutputPreferences}
	            error={chatTerminalOutputError}
	            isLoading={isChatTerminalOutputLoading}
	            isSaving={isChatTerminalOutputSaving}
	            canSave={canSaveChatTerminalOutput}
	            onDraftChange={onChatTerminalOutputDraftChange}
	            onSave={onSaveChatTerminalOutput}
	          />

          <ChatDataMaintenanceSection
            activeWorkspaceId={activeWorkspaceId}
            activeWorkspaceName={activeWorkspaceName}
            result={chatMaintenanceResult}
            isRepairing={isRepairingChatData}
            isClearing={isClearingWorkspaceChatData}
            onRepair={onRepairChatData}
            onClear={onClearWorkspaceChatData}
          />

	          <TerminalConfigurationSection
	            draft={terminalDraft}
	            savedConfiguration={savedTerminalConfiguration}
            error={terminalError}
            isLoading={isTerminalLoading}
            isSaving={isTerminalSaving}
            canSave={canSaveTerminalConfiguration}
            onDraftChange={onTerminalDraftChange}
            onSave={onSaveTerminalConfiguration}
            onReset={onResetTerminalConfiguration}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#edf1eb] pt-4">
            <p className="text-xs text-[#6a786c]">
              {isLoading
                ? "正在读取已保存资料"
                : `更新时间：${new Date(savedProfile.updatedAtMs).toLocaleString()}`}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-xs font-semibold text-[#425044] transition hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSaving || !canSave}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
              >
                <CheckCircle2 aria-hidden="true" size={14} strokeWidth={2} />
                {isSaving ? "保存中" : "保存资料"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function NotificationToggle({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-[#edf1eb] bg-white px-3 py-2 text-xs font-semibold text-[#263229]">
      <span className="flex min-w-0 items-center gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eef3eb] text-[#3f6849]">
          {icon}
        </span>
        <span className="truncate">{label}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#2f6f55]"
      />
    </label>
  );
}

function ChatTerminalOutputPreferencesSection({
  draft,
  savedPreferences,
  error,
  isLoading,
  isSaving,
  canSave,
  onDraftChange,
  onSave,
}: {
  draft: ChatTerminalOutputPreferencesDraft;
  savedPreferences: ChatTerminalOutputPreferencesSnapshot;
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  canSave: boolean;
  onDraftChange: (draft: ChatTerminalOutputPreferencesDraft) => void;
  onSave: () => void;
}) {
  const savedModeLabel =
    savedPreferences.displayMode === "stream" ? "流式输出" : "仅显示最终输出";

  return (
    <section
      aria-labelledby="chat-terminal-output-preferences-title"
      className="grid gap-4 rounded-md border border-[#e3eadf] bg-[#fbfcfa] p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#6a786c]">
            <MessageSquare aria-hidden="true" size={14} strokeWidth={2} />
            聊天输出
          </p>
          <h3
            id="chat-terminal-output-preferences-title"
            className="mt-1 text-sm font-semibold text-[#263229]"
          >
            终端输出展示
          </h3>
        </div>
        <span className="text-[11px] text-[#7a8678]">
          {isLoading
            ? "正在读取聊天输出设置"
            : `更新时间：${new Date(savedPreferences.updatedAtMs).toLocaleString()}`}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <NotificationToggle
          icon={<SquareTerminal aria-hidden="true" size={15} strokeWidth={2} />}
          label="聊天流式输出"
          checked={draft.displayMode === "stream"}
          onChange={(checked) =>
            onDraftChange({
              displayMode: checked ? "stream" : "finalOnly",
            })
          }
        />
        <span className="text-xs font-medium text-[#526054]">当前模式：{savedModeLabel}</span>
      </div>

      {error ? (
        <p className="rounded-md border border-[#e2c7c0] bg-[#fff5f2] p-2 text-xs font-medium text-[#7a2f2f]">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
        >
          <CheckCircle2 aria-hidden="true" size={14} strokeWidth={2} />
          {isSaving ? "保存中" : "保存聊天输出"}
        </button>
      </div>
    </section>
  );
}

function ChatDataMaintenanceSection({
  activeWorkspaceId,
  activeWorkspaceName,
  result,
  isRepairing,
  isClearing,
  onRepair,
  onClear,
}: {
  activeWorkspaceId: string | null;
  activeWorkspaceName: string | null;
  result: ChatMaintenanceResultView | null;
  isRepairing: boolean;
  isClearing: boolean;
  onRepair: () => void;
  onClear: () => void;
}) {
  const disabled = !activeWorkspaceId || isRepairing || isClearing;
  const scopeLabel = activeWorkspaceName
    ? `${activeWorkspaceName}（${activeWorkspaceId}）`
    : (activeWorkspaceId ?? "未打开工作区");

  return (
    <section
      aria-labelledby="chat-data-maintenance-title"
      className="grid gap-4 rounded-md border border-[#e3eadf] bg-[#fbfcfa] p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#6a786c]">
            <ShieldCheck aria-hidden="true" size={14} strokeWidth={2} />
            数据
          </p>
          <h3
            id="chat-data-maintenance-title"
            className="mt-1 text-sm font-semibold text-[#263229]"
          >
            聊天数据维护
          </h3>
        </div>
        <span className="max-w-full truncate text-[11px] text-[#7a8678]" title={scopeLabel}>
          范围：{scopeLabel}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={onRepair}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-xs font-semibold text-[#425044] transition hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" size={14} strokeWidth={2} />
          {isRepairing ? "修复中" : "修复消息"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[#d7c8c5] bg-white px-3 py-2 text-xs font-semibold text-[#6d3d38] transition hover:border-[#b9857f] hover:bg-[#fff5f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d5e58] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
          {isClearing ? "清空中" : "清空所有消息"}
        </button>
      </div>

      {!activeWorkspaceId ? (
        <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-xs text-[#6a786c]">
          未打开工作区，聊天数据维护不可用。
        </p>
      ) : null}

      {result ? (
        <div
          role="status"
          aria-label="聊天数据维护结果"
          className={
            result.status === "failed"
              ? "grid gap-2 rounded-md border border-[#e2c7c0] bg-[#fff5f2] p-3 text-xs text-[#7a2f2f]"
              : "grid gap-2 rounded-md border border-[#cfe0c9] bg-white p-3 text-xs text-[#3f4b41]"
          }
        >
          <p className="font-semibold">
            状态：{result.status === "failed" ? "失败" : "完成"} · {result.title}
          </p>
          <p>{result.summary}</p>
          {result.details.length > 0 ? (
            <ul className="grid gap-1">
              {result.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
          {result.action ? <p>后续动作：{result.action}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function chatRepairResultView(result: RepairWorkspaceChatDataResult): ChatMaintenanceResultView {
  const itemDetails = [
    ...result.repairedItems,
    ...result.failedItems,
    ...result.skippedItems,
  ].map(
    (item) =>
      `${chatMaintenanceStatusLabel(item.status)}：${item.label} ${item.count} 项（${item.affectedScope}）${
        item.details ? `，${item.details}` : ""
      }`,
  );

  return {
    status: result.failedCount > 0 ? "failed" : "completed",
    title: result.failedCount > 0 ? "修复有遗留项" : "修复完成",
    summary: `已修复 ${result.repairedCount} 项，失败 ${result.failedCount} 项，跳过 ${result.skippedCount} 项。`,
    details: itemDetails,
    action: result.followUpAction,
  };
}

function chatClearResultView(result: ClearWorkspaceChatDataResult): ChatMaintenanceResultView {
  return {
    status: "completed",
    title: "清空完成",
    summary: `已清除 ${result.clearedMessageCount} 条消息、${result.clearedMentionCount} 条提及、${result.clearedReadPositionCount} 条已读位置和 ${result.clearedDispatchCount} 条派发引用。`,
    details: [`范围：${result.affectedScope}`, `完成时间：${new Date(result.completedAtMs).toLocaleString()}`],
    action: result.followUpAction,
  };
}

function chatMaintenanceStatusLabel(status: "repaired" | "failed" | "skipped") {
  switch (status) {
    case "failed":
      return "失败";
    case "skipped":
      return "跳过";
    case "repaired":
      return "修复";
  }
}

function TerminalConfigurationSection({
  draft,
  savedConfiguration,
  error,
  isLoading,
  isSaving,
  canSave,
  onDraftChange,
  onSave,
  onReset,
}: {
  draft: TerminalConfigurationDraft;
  savedConfiguration: TerminalConfigurationSnapshot;
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  canSave: boolean;
  onDraftChange: (draft: TerminalConfigurationDraft) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const updateBuiltInCommand = (runtimeId: string, command: string) => {
    onDraftChange({
      ...draft,
      builtInCliEntries: draft.builtInCliEntries.map((entry) =>
        entry.runtimeId === runtimeId ? { ...entry, command } : entry,
      ),
    });
  };
  const updateCustomCliEntry = (entryIndex: number, update: Partial<TerminalCustomCliEntry>) => {
    onDraftChange({
      ...draft,
      customCliEntries: draft.customCliEntries.map((entry, index) =>
        index === entryIndex ? { ...entry, ...update } : entry,
      ),
    });
  };
  const updateCustomTerminalEntry = (
    entryIndex: number,
    update: Partial<TerminalCustomTerminalEntry>,
  ) => {
    onDraftChange({
      ...draft,
      customTerminalEntries: draft.customTerminalEntries.map((entry, index) =>
        index === entryIndex ? { ...entry, ...update } : entry,
      ),
    });
  };
  const addCustomCliEntry = () => {
    const cliId = nextTerminalConfigId(
      "custom-cli",
      draft.customCliEntries.map((entry) => entry.cliId),
    );
    onDraftChange({
      ...draft,
      customCliEntries: [
        ...draft.customCliEntries,
        { cliId, label: "Custom CLI", command: "" },
      ],
    });
  };
  const addCustomTerminalEntry = () => {
    const terminalId = nextTerminalConfigId(
      "terminal",
      draft.customTerminalEntries.map((entry) => entry.terminalId),
    );
    onDraftChange({
      ...draft,
      customTerminalEntries: [
        ...draft.customTerminalEntries,
        { terminalId, label: "Custom Terminal", command: "" },
      ],
    });
  };
  const removeCustomCliEntry = (entryIndex: number) => {
    onDraftChange({
      ...draft,
      customCliEntries: draft.customCliEntries.filter((_, index) => index !== entryIndex),
    });
  };
  const removeCustomTerminalEntry = (entryIndex: number) => {
    const removedEntry = draft.customTerminalEntries[entryIndex];

    onDraftChange({
      ...draft,
      customTerminalEntries: draft.customTerminalEntries.filter(
        (_, index) => index !== entryIndex,
      ),
      defaultTerminalId:
        draft.defaultTerminalId === removedEntry?.terminalId ? null : draft.defaultTerminalId,
    });
  };

  return (
    <section
      aria-labelledby="terminal-configuration-title"
      className="grid gap-4 rounded-md border border-[#e3eadf] bg-[#fbfcfa] p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-medium text-[#6a786c]">
            <SquareTerminal aria-hidden="true" size={14} strokeWidth={2} />
            CLI
          </p>
          <h3
            id="terminal-configuration-title"
            className="mt-1 text-sm font-semibold text-[#263229]"
          >
            CLI 与终端配置
          </h3>
        </div>
        <span className="text-[11px] text-[#7a8678]">
          {isLoading
            ? "正在读取 CLI 设置"
            : `更新时间：${new Date(savedConfiguration.updatedAtMs).toLocaleString()}`}
        </span>
      </div>

      <div className="grid gap-2" aria-label="内置 CLI 路径">
        {draft.builtInCliEntries.map((entry) => (
          <label
            key={entry.runtimeId}
            className="grid gap-1.5 rounded-md border border-[#edf1eb] bg-white p-3 text-xs font-medium text-[#526054] sm:grid-cols-[11rem_1fr] sm:items-center"
          >
            <span>
              <span className="block font-semibold text-[#263229]">{entry.label}</span>
              <span className="mt-1 block text-[11px] text-[#7a8678]">
                状态：保存后在终端环境诊断中验证
              </span>
            </span>
            <input
              value={entry.command}
              aria-label={`${entry.label} 命令`}
              onChange={(event) => updateBuiltInCommand(entry.runtimeId, event.target.value)}
              className="min-w-0 rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87]"
            />
          </label>
        ))}
      </div>

      <TerminalConfigurationRows
        title="自定义 CLI"
        emptyText="暂无自定义 CLI"
        idLabel="CLI ID"
        labelLabel="名称"
        commandLabel="命令"
        entries={draft.customCliEntries.map((entry) => ({
          id: entry.cliId,
          label: entry.label,
          command: entry.command,
        }))}
        onAdd={addCustomCliEntry}
        onUpdate={(index, update) =>
          updateCustomCliEntry(index, {
            cliId: update.id,
            label: update.label,
            command: update.command,
          })
        }
        onRemove={removeCustomCliEntry}
      />

      <TerminalConfigurationRows
        title="自定义终端"
        emptyText="暂无自定义终端"
        idLabel="终端 ID"
        labelLabel="名称"
        commandLabel="命令"
        entries={draft.customTerminalEntries.map((entry) => ({
          id: entry.terminalId,
          label: entry.label,
          command: entry.command,
        }))}
        onAdd={addCustomTerminalEntry}
        onUpdate={(index, update) =>
          updateCustomTerminalEntry(index, {
            terminalId: update.id,
            label: update.label,
            command: update.command,
          })
        }
        onRemove={removeCustomTerminalEntry}
      />

      <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
        默认工作区终端
        <select
          value={draft.defaultTerminalId ?? ""}
          aria-label="默认工作区终端"
          onChange={(event) =>
            onDraftChange({
              ...draft,
              defaultTerminalId: event.target.value || null,
            })
          }
          className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
        >
          <option value="">系统默认 shell</option>
          {draft.customTerminalEntries.map((entry) => (
            <option key={entry.terminalId} value={entry.terminalId}>
              {entry.label || entry.terminalId}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p className="rounded-md border border-[#e2c7c0] bg-[#fff5f2] p-2 text-xs font-medium text-[#7a2f2f]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          disabled={isSaving}
          aria-label="恢复默认 CLI 与终端配置"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-xs font-semibold text-[#425044] transition hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" size={14} strokeWidth={2} />
          恢复默认
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
        >
          <CheckCircle2 aria-hidden="true" size={14} strokeWidth={2} />
          {isSaving ? "保存中" : "保存 CLI 与终端"}
        </button>
      </div>
    </section>
  );
}

function TerminalConfigurationRows({
  title,
  emptyText,
  idLabel,
  labelLabel,
  commandLabel,
  entries,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  emptyText: string;
  idLabel: string;
  labelLabel: string;
  commandLabel: string;
  entries: Array<{ id: string; label: string; command: string }>;
  onAdd: () => void;
  onUpdate: (
    entryIndex: number,
    update: { id: string; label: string; command: string },
  ) => void;
  onRemove: (entryIndex: number) => void;
}) {
  return (
    <div className="grid gap-2 rounded-md border border-[#edf1eb] bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#263229]">{title}</p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#425044] transition hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
        >
          <Plus aria-hidden="true" size={13} strokeWidth={2} />
          添加
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-md border border-dashed border-[#d8e2d4] bg-[#fbfcfa] p-3 text-xs text-[#6a786c]">
          {emptyText}
        </p>
      ) : (
        <div className="grid gap-2">
          {entries.map((entry, index) => (
            <div
              key={`${title}-${index}`}
              className="grid gap-2 rounded-md border border-[#edf1eb] bg-[#fbfcfa] p-3"
            >
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <label className="grid gap-1 text-[11px] font-medium text-[#526054]">
                  {idLabel}
                  <input
                    value={entry.id}
                    aria-label={`${title} ${idLabel}`}
                    onChange={(event) =>
                      onUpdate(index, { ...entry, id: event.target.value })
                    }
                    className="rounded-md border border-[#cfd9cc] bg-white px-2.5 py-2 text-xs text-[#263229] outline-none focus:border-[#8fad87]"
                  />
                </label>
                <label className="grid gap-1 text-[11px] font-medium text-[#526054]">
                  {labelLabel}
                  <input
                    value={entry.label}
                    aria-label={`${title} ${labelLabel}`}
                    onChange={(event) =>
                      onUpdate(index, { ...entry, label: event.target.value })
                    }
                    className="rounded-md border border-[#cfd9cc] bg-white px-2.5 py-2 text-xs text-[#263229] outline-none focus:border-[#8fad87]"
                  />
                </label>
                <button
                  type="button"
                  aria-label={`删除 ${entry.label || entry.id}`}
                  onClick={() => onRemove(index)}
                  className="self-end inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#e2c7c0] bg-white text-[#7a2f2f] transition hover:bg-[#fff5f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a3b2f]"
                >
                  <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
                </button>
              </div>
              <label className="grid gap-1 text-[11px] font-medium text-[#526054]">
                {commandLabel}
                <input
                  value={entry.command}
                  aria-label={`${title} ${commandLabel}`}
                  onChange={(event) =>
                    onUpdate(index, { ...entry, command: event.target.value })
                  }
                  className="rounded-md border border-[#cfd9cc] bg-white px-2.5 py-2 text-xs text-[#263229] outline-none focus:border-[#8fad87]"
                />
              </label>
              <span className="text-[11px] text-[#7a8678]">
                状态：保存后在终端环境诊断中验证
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoadmapModal({
  tasks,
  goals,
  focusedTaskId,
  isLoading,
  isCreating,
  isCreatingGoal,
  pendingUpdateId,
  pendingDeleteId,
  pendingGoalUpdateId,
  pendingGoalDeleteId,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
}: {
  tasks: RoadmapTaskEntry[];
  goals: RoadmapGoalEntry[];
  focusedTaskId: string | null;
  isLoading: boolean;
  isCreating: boolean;
  isCreatingGoal: boolean;
  pendingUpdateId: string | null;
  pendingDeleteId: string | null;
  pendingGoalUpdateId: string | null;
  pendingGoalDeleteId: string | null;
  onClose: () => void;
  onCreate: () => void;
  onUpdate: (taskId: string, input: UpdateRoadmapTaskInput) => void;
  onDelete: (taskId: string) => void;
  onCreateGoal: () => void;
  onUpdateGoal: (
    goalId: string,
    input: UpdateRoadmapGoalInput,
  ) => Promise<RoadmapGoalEntry | null>;
  onDeleteGoal: (goalId: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, { title: string; detail: string }>>({});
  const [goalDrafts, setGoalDrafts] = useState<
    Record<string, { title: string; taskIds: string[] }>
  >({});
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.taskId, task])), [tasks]);
  const overallProgress = roadmapProgressForTasks(tasks);

  useEffect(() => {
    setDrafts((current) => {
      const next: Record<string, { title: string; detail: string }> = {};

      for (const task of tasks) {
        next[task.taskId] = current[task.taskId] ?? {
          title: task.title,
          detail: task.detail ?? "",
        };
      }

      return next;
    });
  }, [tasks]);

  useEffect(() => {
    setGoalDrafts((current) => {
      const next: Record<string, { title: string; taskIds: string[] }> = {};

      for (const goal of goals) {
        next[goal.goalId] = current[goal.goalId] ?? {
          title: goal.title,
          taskIds: goal.taskIds,
        };
      }

      return next;
    });
  }, [goals]);

  function setDraft(taskId: string, field: "title" | "detail", value: string) {
    setDrafts((current) => ({
      ...current,
      [taskId]: {
        title: current[taskId]?.title ?? "",
        detail: current[taskId]?.detail ?? "",
        [field]: value,
      },
    }));
  }

  function saveTitle(task: RoadmapTaskEntry) {
    const title = drafts[task.taskId]?.title ?? task.title;

    if (title.trim() !== task.title) {
      onUpdate(task.taskId, { title });
    }
  }

  function saveDetail(task: RoadmapTaskEntry) {
    const detail = drafts[task.taskId]?.detail ?? "";
    const current = task.detail ?? "";

    if (detail.trim() !== current) {
      onUpdate(task.taskId, { detail });
    }
  }

  function setGoalDraft(goalId: string, value: { title?: string; taskIds?: string[] }) {
    setGoalDrafts((current) => ({
      ...current,
      [goalId]: {
        title: value.title ?? current[goalId]?.title ?? "",
        taskIds: value.taskIds ?? current[goalId]?.taskIds ?? [],
      },
    }));
  }

  function syncGoalDraft(goal: RoadmapGoalEntry) {
    setGoalDrafts((current) => ({
      ...current,
      [goal.goalId]: {
        title: goal.title,
        taskIds: goal.taskIds,
      },
    }));
  }

  async function saveGoalTitle(goal: RoadmapGoalEntry) {
    const title = goalDrafts[goal.goalId]?.title ?? goal.title;

    if (title.trim() === goal.title) {
      return;
    }

    const savedGoal = await onUpdateGoal(goal.goalId, { title });

    if (savedGoal) {
      syncGoalDraft(savedGoal);
    }
  }

  async function toggleGoalTask(goal: RoadmapGoalEntry, taskId: string) {
    const currentTaskIds = goalDrafts[goal.goalId]?.taskIds ?? goal.taskIds;
    const taskIds = currentTaskIds.includes(taskId)
      ? currentTaskIds.filter((currentTaskId) => currentTaskId !== taskId)
      : [...currentTaskIds, taskId];

    setGoalDraft(goal.goalId, { taskIds });
    const savedGoal = await onUpdateGoal(goal.goalId, { taskIds });

    if (savedGoal) {
      syncGoalDraft(savedGoal);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[#17211b]/35 px-4 py-8">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="roadmap-modal-title"
        className="w-full max-w-3xl rounded-lg border border-[#cfd9cc] bg-[#fbfcfa] p-5 shadow-xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[#6a786c]">Roadmap</p>
            <h2 id="roadmap-modal-title" className="mt-1 text-base font-semibold text-[#263229]">
              路线图
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-[#d8e4d3] bg-white px-2.5 py-1 text-xs font-medium text-[#526054]">
              {goals.length} 个目标
            </span>
            <span className="rounded-md border border-[#d8e4d3] bg-white px-2.5 py-1 text-xs font-medium text-[#526054]">
              任务完成 {overallProgress.done}/{overallProgress.total}（{overallProgress.percent}%）
            </span>
            <button
              type="button"
              disabled={isCreating}
              onClick={onCreate}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
            >
              <Plus aria-hidden="true" size={14} strokeWidth={2} />
              {isCreating ? "添加中" : "添加任务"}
            </button>
            <button
              type="button"
              aria-label="关闭路线图"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#cfd9cc] bg-white text-[#526054] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
            >
              <X aria-hidden="true" size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4">
          {isLoading ? (
            <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-4 text-sm text-[#6a786c]">
              正在加载路线图
            </p>
          ) : (
            <>
              <section aria-label="路线图目标" className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#263229]">目标</h3>
                    <p className="mt-1 text-xs text-[#6a786c]">
                      {goals.length} 个目标，关联 {tasks.length} 个任务
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isCreatingGoal}
                    onClick={onCreateGoal}
                    className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
                  >
                    <Plus aria-hidden="true" size={13} strokeWidth={2} />
                    {isCreatingGoal ? "添加中" : "添加目标"}
                  </button>
                </div>

                {goals.length > 0 ? (
                  goals.map((goal) => {
                    const draft = goalDrafts[goal.goalId] ?? {
                      title: goal.title,
                      taskIds: goal.taskIds,
                    };
                    const relatedTasks = draft.taskIds
                      .map((taskId) => taskById.get(taskId))
                      .filter((task): task is RoadmapTaskEntry => Boolean(task));
                    const progress = roadmapProgressForTasks(relatedTasks);
                    const isPending = pendingGoalUpdateId === goal.goalId;

                    return (
                      <article
                        key={goal.goalId}
                        role="group"
                        aria-label={`路线图目标 ${goal.title}`}
                        className="grid gap-3 rounded-md border border-[#d7e4d1] bg-white p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#d8e4d3] bg-[#f8fbf6] px-2 py-1 text-[11px] font-semibold text-[#526054]">
                            <CheckCircle2 aria-hidden="true" size={12} strokeWidth={2} />
                            {progress.done}/{progress.total} 完成（{progress.percent}%）
                          </span>
                          <button
                            type="button"
                            disabled={pendingGoalDeleteId === goal.goalId}
                            onClick={() => onDeleteGoal(goal.goalId)}
                            className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md border border-[#d7c8c5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6d3d38] transition hover:border-[#b9857f] hover:bg-[#fff5f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d5e58] disabled:cursor-wait disabled:opacity-70"
                          >
                            <Trash2 aria-hidden="true" size={13} strokeWidth={2} />
                            {pendingGoalDeleteId === goal.goalId ? "删除中" : "删除目标"}
                          </button>
                        </div>

                        <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
                          目标标题
                          <input
                            value={draft.title}
                            disabled={isPending}
                            onChange={(event) =>
                              setGoalDraft(goal.goalId, { title: event.target.value })
                            }
                            onBlur={() => void saveGoalTitle(goal)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void saveGoalTitle(goal);
                              }
                            }}
                            className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87] disabled:cursor-wait disabled:bg-[#f4f7f2]"
                          />
                        </label>

                        <div className="h-2 overflow-hidden rounded-full bg-[#e8eee4]">
                          <div
                            className="h-full bg-[#2f6f55]"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>

                        <div className="grid gap-2">
                          <p className="text-xs font-medium text-[#526054]">关联任务</p>
                          {tasks.length > 0 ? (
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {tasks.map((task) => (
                                <label
                                  key={task.taskId}
                                  className="flex items-center gap-2 rounded-md border border-[#e3eadf] bg-[#fbfcfa] px-2.5 py-2 text-xs text-[#526054]"
                                >
                                  <input
                                    type="checkbox"
                                    checked={draft.taskIds.includes(task.taskId)}
                                    disabled={isPending}
                                    onChange={() => void toggleGoalTask(goal, task.taskId)}
                                    className="h-4 w-4 rounded border-[#aebca8] text-[#2f6f55] focus:ring-[#8fad87]"
                                  />
                                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                                  <span className="shrink-0 text-[11px] text-[#879182]">
                                    {roadmapTaskStatusLabel(task.status)}
                                  </span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <p className="rounded-md border border-dashed border-[#cfd9cc] bg-[#fbfcfa] p-3 text-xs text-[#6a786c]">
                              暂无可关联任务
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-4 text-sm text-[#6a786c]">
                    暂无路线图目标
                  </p>
                )}
              </section>

              <section aria-label="路线图任务" className="grid gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#263229]">任务</h3>
                  <p className="mt-1 text-xs text-[#6a786c]">
                    {overallProgress.done}/{overallProgress.total} 个任务已完成
                  </p>
                </div>
                {tasks.length > 0 ? (
                  tasks.map((task) => {
                    const draft = drafts[task.taskId] ?? {
                      title: task.title,
                      detail: task.detail ?? "",
                    };
                    const isFocused = focusedTaskId === task.taskId;

                    return (
                      <article
                        key={task.taskId}
                        aria-label={`路线图任务 ${task.title}`}
                        className={
                          isFocused
                            ? "grid gap-3 rounded-md border border-[#8fad87] bg-[#eef6ea] p-3"
                            : "grid gap-3 rounded-md border border-[#e3eadf] bg-white p-3"
                        }
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#d8e4d3] bg-[#f8fbf6] px-2 py-1 text-[11px] font-semibold text-[#526054]">
                            <ListTodo aria-hidden="true" size={12} strokeWidth={2} />
                            {isFocused ? "已聚焦" : `顺序 ${task.sortOrder + 1}`}
                          </span>
                          <button
                            type="button"
                            disabled={pendingDeleteId === task.taskId}
                            onClick={() => onDelete(task.taskId)}
                            className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md border border-[#d7c8c5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6d3d38] transition hover:border-[#b9857f] hover:bg-[#fff5f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d5e58] disabled:cursor-wait disabled:opacity-70"
                          >
                            <Trash2 aria-hidden="true" size={13} strokeWidth={2} />
                            {pendingDeleteId === task.taskId ? "删除中" : "删除"}
                          </button>
                        </div>

                        <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
                          任务标题
                          <input
                            value={draft.title}
                            disabled={pendingUpdateId === task.taskId}
                            onChange={(event) => setDraft(task.taskId, "title", event.target.value)}
                            onBlur={() => saveTitle(task)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                saveTitle(task);
                              }
                            }}
                            className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87] disabled:cursor-wait disabled:bg-[#f4f7f2]"
                          />
                        </label>

                        <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
                          任务详情
                          <textarea
                            value={draft.detail}
                            disabled={pendingUpdateId === task.taskId}
                            onChange={(event) => setDraft(task.taskId, "detail", event.target.value)}
                            onBlur={() => saveDetail(task)}
                            rows={3}
                            className="resize-y rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87] disabled:cursor-wait disabled:bg-[#f4f7f2]"
                          />
                        </label>

                        <label className="grid max-w-xs gap-1.5 text-xs font-medium text-[#526054]">
                          任务状态
                          <select
                            value={task.status}
                            disabled={pendingUpdateId === task.taskId}
                            onChange={(event) =>
                              onUpdate(task.taskId, {
                                status: event.target.value as RoadmapTaskStatus,
                              })
                            }
                            className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87] disabled:cursor-wait disabled:bg-[#f4f7f2]"
                          >
                            <option value="pending">待处理</option>
                            <option value="inProgress">进行中</option>
                            <option value="done">已完成</option>
                          </select>
                        </label>
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-4 text-sm text-[#6a786c]">
                    暂无路线图任务
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function CapabilityClassItem({
  title,
  status,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  status: CapabilityStatus;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const meta = capabilityStatusMeta(status);

  return (
    <div className="rounded-md border border-[#e3eadf] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-[#263229]">{title}</span>
        <span className={capabilityStatusClassName(status)}>
          {meta.label}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#6a786c]">{description}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex min-h-8 items-center rounded-md border border-[#e0c37b] bg-[#fff8e6] px-2.5 py-1.5 text-xs font-semibold text-[#765400] transition hover:border-[#c79f45] hover:bg-[#fff3cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9c7422]"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function capabilityStatusClassName(status: CapabilityStatus) {
  switch (status) {
    case "implemented":
      return "rounded-md border border-[#b9d0b2] bg-[#eef6ea] px-2 py-1 text-[11px] font-semibold text-[#2f5038]";
    case "alternative":
      return "rounded-md border border-[#b7d5de] bg-[#eef8fb] px-2 py-1 text-[11px] font-semibold text-[#2f5a66]";
    case "placeholder":
      return "rounded-md border border-[#e0c37b] bg-[#fff8e6] px-2 py-1 text-[11px] font-semibold text-[#765400]";
    case "abandoned":
      return "rounded-md border border-[#d8e2d4] bg-[#f7f9f5] px-2 py-1 text-[11px] font-semibold text-[#637064]";
  }
}

function ConversationPanel({
  conversations,
  selectedConversation,
  messages,
  dispatchStates,
  terminalStreams,
  members,
  conversationFilter,
  unreadConversationCount,
  isLoading,
  isLoadingMessages,
  isLoadingOlderMessages,
  hasOlderMessages,
  isSendingMessage,
  isCreating,
  isUpdating,
  isUpdatingSettings,
  isClearing,
  isDeleting,
  renameDraft,
  messageDraft,
  mentionedMemberIds,
  attachmentEntries,
  shortcutPreferences,
  roadmapTasks,
  isRoadmapAttachmentPickerOpen,
  groupTitle,
  groupMemberIds,
  selectedGroupMemberIds,
  onSelectConversation,
  onConversationFilterChange,
  onRenameDraftChange,
  onRenameConversation,
  onTogglePinned,
  onToggleMuted,
  onClearConversation,
  onDeleteConversation,
  onMessageDraftChange,
  onAddMention,
  onRemoveMention,
  onAddImageAttachment,
  onOpenRoadmapAttachmentPicker,
  onSelectRoadmapAttachment,
  onOpenRoadmapReference,
  onRemoveAttachmentEntry,
  onSendMessage,
  onDispatchMessage,
  onLoadOlderMessages,
  onGroupTitleChange,
  onToggleCreateGroupMember,
  onToggleSelectedGroupMember,
  onCreateGroup,
  onUpdateGroupMembers,
}: {
  conversations: ConversationProfile[];
  selectedConversation: ConversationProfile | null;
  messages: ChatMessageProfile[];
  dispatchStates: Record<string, MessageDispatchState>;
  terminalStreams: TerminalChatStreamEntry[];
  members: MemberProfile[];
  conversationFilter: ConversationFilter;
  unreadConversationCount: number;
  isLoading: boolean;
  isLoadingMessages: boolean;
  isLoadingOlderMessages: boolean;
  hasOlderMessages: boolean;
  isSendingMessage: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isUpdatingSettings: boolean;
  isClearing: boolean;
  isDeleting: boolean;
  renameDraft: string;
  messageDraft: string;
  mentionedMemberIds: string[];
  attachmentEntries: AttachmentEntry[];
  shortcutPreferences: ShortcutPreferencesSnapshot;
  roadmapTasks: RoadmapTaskEntry[];
  isRoadmapAttachmentPickerOpen: boolean;
  groupTitle: string;
  groupMemberIds: string[];
  selectedGroupMemberIds: string[];
  onSelectConversation: (conversationId: string) => void;
  onConversationFilterChange: (filter: ConversationFilter) => void;
  onRenameDraftChange: (value: string) => void;
  onRenameConversation: () => void;
  onTogglePinned: (isPinned: boolean) => void;
  onToggleMuted: (isMuted: boolean) => void;
  onClearConversation: () => void;
  onDeleteConversation: () => void;
  onMessageDraftChange: (value: string) => void;
  onAddMention: (member: MemberProfile) => void;
  onRemoveMention: (memberId: string) => void;
  onAddImageAttachment: () => void;
  onOpenRoadmapAttachmentPicker: () => void;
  onSelectRoadmapAttachment: (task: RoadmapTaskEntry) => void;
  onOpenRoadmapReference: (taskId: string) => void;
  onRemoveAttachmentEntry: (entry: AttachmentEntry) => void;
  onSendMessage: () => void;
  onDispatchMessage: (message: ChatMessageProfile, memberId?: string) => void;
  onLoadOlderMessages: () => void;
  onGroupTitleChange: (value: string) => void;
  onToggleCreateGroupMember: (memberId: string) => void;
  onToggleSelectedGroupMember: (memberId: string) => void;
  onCreateGroup: () => void;
  onUpdateGroupMembers: () => void;
}) {
  const [isEmojiPanelOpen, setIsEmojiPanelOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => loadRecentEmojis());
  const canCreateGroup = groupTitle.trim().length > 0 && groupMemberIds.length > 0;
  const canUpdateGroup =
    selectedConversation?.kind === "group" && selectedGroupMemberIds.length > 0;
  const canRenameConversation =
    Boolean(selectedConversation) &&
    renameDraft.trim().length > 0 &&
    renameDraft.trim() !== selectedConversation?.title;
  const mentionQuery = activeMentionQuery(messageDraft);
  const mentionSuggestions =
    mentionQuery === null || mentionQuery.toLocaleLowerCase() === "all"
      ? []
      : members
          .filter(
            (member) =>
              member.permissions.canMention &&
              !mentionedMemberIds.includes(member.memberId) &&
              mentionMatches(member, mentionQuery),
          )
          .slice(0, 6);
  const selectedMentionMembers = mentionedMemberIds
    .map((memberId) => members.find((member) => member.memberId === memberId))
    .filter((member): member is MemberProfile => Boolean(member));
  const hasUnsupportedAllMention = hasAllMentionToken(messageDraft);
  const hasTimelineEntries = messages.length > 0 || terminalStreams.length > 0;
  const filteredEmojiOptions = emojiOptions.filter((option) => {
    const query = emojiSearch.trim().toLocaleLowerCase();

    if (!query) {
      return true;
    }

    return (
      option.label.toLocaleLowerCase().includes(query) ||
      option.keywords.some((keyword) => keyword.includes(query)) ||
      option.value.includes(query)
    );
  });

  function handleSelectEmoji(value: string) {
    const nextRecentEmojis = [value, ...recentEmojis.filter((emoji) => emoji !== value)].slice(0, 8);

    setRecentEmojis(nextRecentEmojis);
    saveRecentEmojis(nextRecentEmojis);
    onMessageDraftChange(`${messageDraft}${value}`);
    setIsEmojiPanelOpen(false);
  }

  return (
    <section
      aria-labelledby="conversations-title"
      className="mt-6 rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#6a786c]">聊天</p>
          <h2 id="conversations-title" className="mt-1 text-sm font-semibold text-[#263229]">
            会话列表
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0c9] bg-white px-2.5 py-1 text-xs font-medium text-[#37533e]">
            <MessageSquare aria-hidden="true" size={14} strokeWidth={2} />
            {isLoading ? "加载中" : `${conversations.length} 个会话`}
          </span>
          <div
            aria-label="会话筛选"
            className="inline-flex rounded-md border border-[#d6e3d1] bg-white p-0.5 text-xs"
          >
            <button
              type="button"
              aria-pressed={conversationFilter === "all"}
              onClick={() => onConversationFilterChange("all")}
              className={
                conversationFilter === "all"
                  ? "rounded bg-[#eef6ea] px-2 py-1 font-semibold text-[#2f5038]"
                  : "rounded px-2 py-1 font-medium text-[#6a786c] hover:text-[#2f5038]"
              }
            >
              全部
            </button>
            <button
              type="button"
              aria-pressed={conversationFilter === "unread"}
              onClick={() => onConversationFilterChange("unread")}
              disabled={unreadConversationCount === 0}
              className={
                conversationFilter === "unread"
                  ? "rounded bg-[#eef6ea] px-2 py-1 font-semibold text-[#2f5038]"
                  : "rounded px-2 py-1 font-medium text-[#6a786c] hover:text-[#2f5038] disabled:text-[#a4aea1]"
              }
            >
              未读 {unreadBadgeLabel(unreadConversationCount)}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(220px,0.85fr)_minmax(0,1.15fr)]">
        <div className="grid gap-2">
          {conversations.length > 0 ? (
            conversations.map((conversation) => (
              <button
                key={conversation.conversationId}
                type="button"
                onClick={() => onSelectConversation(conversation.conversationId)}
                className={
                  selectedConversation?.conversationId === conversation.conversationId
                    ? "grid min-h-[72px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[#9fbd98] bg-[#eef6ea] p-3 text-left"
                    : "grid min-h-[72px] grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[#e3eadf] bg-white p-3 text-left transition hover:border-[#b7cfb0] hover:bg-[#f8fbf6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
                }
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#eef3eb] text-[#3f6849]">
                  <ConversationKindIcon kind={conversation.kind} />
                </span>
                <span className="min-w-0">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-[#263229]">
                      {conversation.title}
                    </span>
                    {conversation.isDefault ? (
                      <span className="shrink-0 rounded border border-[#cfe0c9] bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#37533e]">
                        默认
                      </span>
                    ) : null}
                    {conversation.isPinned ? (
                      <Pin
                        aria-label="已置顶"
                        className="shrink-0 text-[#6a774d]"
                        size={13}
                        strokeWidth={2}
                      />
                    ) : null}
                    {conversation.isMuted ? (
                      <BellOff
                        aria-label="已静音"
                        className="shrink-0 text-[#7a6d60]"
                        size={13}
                        strokeWidth={2}
                      />
                    ) : null}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#6a786c]">
                    {conversationKindLabel(conversation)}
                    {conversation.lastMessagePreview
                      ? ` · ${conversation.lastMessagePreview}`
                      : ""}
                  </span>
                  <span className="mt-1 block truncate text-[11px] text-[#879182]">
                    {formatRecentTime(conversation.lastActivityAtMs)}
                  </span>
                </span>
                <span className="flex w-10 justify-end">
                  {conversation.unreadCount > 0 ? (
                    <span className="inline-flex min-w-7 justify-center rounded-full bg-[#2f6f55] px-2 py-0.5 text-[11px] font-semibold text-white">
                      {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                    </span>
                  ) : (
                    <span className="h-5 w-7" aria-hidden="true" />
                  )}
                </span>
              </button>
            ))
          ) : (
            <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-sm text-[#6a786c]">
              {isLoading
                ? "正在初始化默认频道"
                : conversationFilter === "unread"
                  ? "暂无未读会话"
                  : "暂无会话"}
            </p>
          )}
        </div>

        <div className="grid content-start gap-3 rounded-md border border-[#e3eadf] bg-white p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#6a786c]">当前会话</p>
            <p className="mt-1 truncate text-sm font-semibold text-[#263229]">
              {selectedConversation?.title ?? "未选择会话"}
            </p>
            {selectedConversation ? (
              <p className="mt-1 text-xs text-[#6a786c]">
                {conversationKindLabel(selectedConversation)}
              </p>
            ) : null}
            {selectedConversation?.kind === "group" ? (
              <p className="mt-2 line-clamp-3 text-xs text-[#526054]">
                {selectedConversation.members.map((member) => member.instanceLabel).join("、") ||
                  "暂无成员"}
              </p>
            ) : null}
          </div>

          {selectedConversation ? (
            <div className="grid gap-2 rounded-md border border-[#edf1ea] bg-[#f8fbf6] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isUpdatingSettings}
                  onClick={() => onTogglePinned(!selectedConversation.isPinned)}
                  className={
                    selectedConversation.isPinned
                      ? "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#93aa70] bg-[#eef6ea] px-2.5 text-xs font-semibold text-[#37533e] transition hover:border-[#7f985e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-60"
                      : "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-60"
                  }
                >
                  <Pin aria-hidden="true" size={13} strokeWidth={2} />
                  {selectedConversation.isPinned ? "取消置顶" : "置顶"}
                </button>
                <button
                  type="button"
                  disabled={isUpdatingSettings}
                  onClick={() => onToggleMuted(!selectedConversation.isMuted)}
                  className={
                    selectedConversation.isMuted
                      ? "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#b79f84] bg-[#fff8f0] px-2.5 text-xs font-semibold text-[#6f4f2c] transition hover:border-[#a48663] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6d4b] disabled:cursor-wait disabled:opacity-60"
                      : "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-60"
                  }
                >
                  <BellOff aria-hidden="true" size={13} strokeWidth={2} />
                  {selectedConversation.isMuted ? "取消静音" : "静音"}
                </button>
                <button
                  type="button"
                  disabled={isClearing}
                  onClick={onClearConversation}
                  className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-60"
                >
                  <Eraser aria-hidden="true" size={13} strokeWidth={2} />
                  {isClearing ? "清空中" : "清空消息"}
                </button>
                <button
                  type="button"
                  disabled={selectedConversation.isDefault || isDeleting}
                  onClick={onDeleteConversation}
                  className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#e0b8aa] bg-white px-2.5 text-xs font-semibold text-[#8b3e25] transition hover:border-[#d6947d] hover:bg-[#fff7f3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b3e25] disabled:cursor-not-allowed disabled:border-[#d8ded5] disabled:text-[#9aa39a] disabled:opacity-70"
                >
                  <Trash2 aria-hidden="true" size={13} strokeWidth={2} />
                  {isDeleting ? "删除中" : "删除会话"}
                </button>
              </div>
              <form
                aria-label="重命名会话"
                className="flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  onRenameConversation();
                }}
              >
                <label className="grid min-w-[180px] flex-1 gap-1.5 text-xs font-medium text-[#526054]">
                  名称
                  <input
                    value={renameDraft}
                    onChange={(event) => onRenameDraftChange(event.target.value)}
                    className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87]"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isUpdatingSettings || !canRenameConversation}
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Edit3 aria-hidden="true" size={13} strokeWidth={2} />
                  {isUpdatingSettings ? "保存中" : "重命名"}
                </button>
              </form>
            </div>
          ) : null}

          <div className="grid gap-2 border-t border-[#e3eadf] pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#263229]">
                <MessageSquare aria-hidden="true" size={14} strokeWidth={2} />
                消息
              </div>
              <button
                type="button"
                disabled={!hasOlderMessages || isLoadingOlderMessages || !selectedConversation}
                onClick={onLoadOlderMessages}
                className="inline-flex min-h-8 items-center justify-center rounded-md border border-[#cfd9cc] bg-[#f8fbf6] px-2.5 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingOlderMessages ? "加载中" : "加载更早"}
              </button>
            </div>

            <div
              role="log"
              aria-label="消息历史"
              className="grid max-h-72 min-h-40 content-start gap-2 overflow-y-auto rounded-md border border-[#edf1ea] bg-[#f8fbf6] p-2"
            >
              {isLoadingMessages ? (
                <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-sm text-[#6a786c]">
                  正在加载消息
                </p>
              ) : hasTimelineEntries ? (
                <>
                  {messages.map((message) => {
                    const dispatchResolution = selectedConversation
                      ? dispatchResolutionForMessage(message, members, selectedConversation)
                      : { target: null, candidates: [] };
                    const dispatchTarget = dispatchResolution.target;
                    const hasAmbiguousTargets = dispatchResolution.candidates.length > 1;
                    const dispatchState = dispatchStates[message.messageId];

                    return (
                      <article
                        key={message.messageId}
                        className={
                          message.status === "failed"
                            ? "rounded-md border border-[#e2b8a7] bg-[#fff7f3] p-3"
                            : "rounded-md border border-[#dfe8db] bg-white p-3"
                        }
                      >
                        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#263229]">
                          {message.body}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6a786c]">
                          <span>{formatRecentTime(message.createdAtMs)}</span>
                          <span className="inline-flex items-center gap-1 rounded border border-[#dfe8db] bg-[#f8fbf6] px-1.5 py-0.5 font-medium">
                            <MessageStatusIcon status={message.status} />
                            {messageStatusLabel(message.status)}
                          </span>
                        </div>
                        {dispatchTarget || hasAmbiguousTargets || dispatchState ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-[#edf1ea] pt-2 text-[11px]">
                            {dispatchTarget || hasAmbiguousTargets ? (
                              <button
                                type="button"
                                disabled={
                                  message.messageId.startsWith("pending-") ||
                                  dispatchState?.status === "dispatching"
                                }
                                onClick={() => onDispatchMessage(message)}
                                className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-[#f8fbf6] px-2 font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-60"
                              >
                                <SquareTerminal aria-hidden="true" size={12} strokeWidth={2} />
                                {dispatchState?.status === "dispatching"
                                  ? "派发中"
                                  : dispatchTarget
                                    ? `派发到 ${dispatchTarget.instanceLabel}`
                                    : "选择派发目标"}
                              </button>
                            ) : null}
                            {dispatchState ? (
                              <DispatchStateBadge
                                state={dispatchState}
                                onSelectTarget={(memberId) => onDispatchMessage(message, memberId)}
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                  {terminalStreams.map((stream) => (
                    <TerminalChatStreamArticle key={stream.terminalSessionId} stream={stream} />
                  ))}
                </>
              ) : (
                <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-sm text-[#6a786c]">
                  暂无消息
                </p>
              )}
            </div>

            <form
              aria-label="发送消息"
              className="grid gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                onSendMessage();
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!selectedConversation}
                  onClick={() => setIsEmojiPanelOpen((current) => !current)}
                  className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Smile aria-hidden="true" size={13} strokeWidth={2} />
                  Emoji
                </button>
                <button
                  type="button"
                  disabled={!selectedConversation}
                  onClick={onAddImageAttachment}
                  className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ImageIcon aria-hidden="true" size={13} strokeWidth={2} />
                  图片入口
                </button>
                <button
                  type="button"
                  disabled={!selectedConversation}
                  onClick={onOpenRoadmapAttachmentPicker}
                  className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ListTodo aria-hidden="true" size={13} strokeWidth={2} />
                  路线图引用
                </button>
              </div>

              {isRoadmapAttachmentPickerOpen ? (
                <div
                  role="dialog"
                  aria-label="选择路线图任务"
                  className="grid gap-2 rounded-md border border-[#dbe4d7] bg-[#fbfcfa] p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#263229]">选择路线图任务</p>
                    <span className="text-[11px] text-[#6a786c]">{roadmapTasks.length} 个任务</span>
                  </div>
                  <div className="grid max-h-36 gap-1.5 overflow-y-auto">
                    {roadmapTasks.map((task) => (
                      <button
                        key={task.taskId}
                        type="button"
                        onClick={() => onSelectRoadmapAttachment(task)}
                        className="grid gap-1 rounded-md border border-[#dfe8db] bg-white px-3 py-2 text-left transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
                      >
                        <span className="truncate text-xs font-semibold text-[#263229]">
                          {task.title}
                        </span>
                        <span className="text-[11px] text-[#6a786c]">
                          {roadmapTaskStatusLabel(task.status)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {isEmojiPanelOpen ? (
                <div
                  role="dialog"
                  aria-label="Emoji 面板"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      setIsEmojiPanelOpen(false);
                    }
                  }}
                  className="grid gap-2 rounded-md border border-[#dbe4d7] bg-[#fbfcfa] p-3"
                >
                  <label className="flex items-center gap-2 rounded-md border border-[#cfd9cc] bg-white px-2.5 py-1.5 text-xs text-[#263229] focus-within:border-[#8fad87]">
                    <Search aria-hidden="true" size={13} strokeWidth={2} />
                    <span className="sr-only">搜索 emoji</span>
                    <input
                      value={emojiSearch}
                      onChange={(event) => setEmojiSearch(event.target.value)}
                      placeholder="搜索 emoji"
                      className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#7b887a]"
                    />
                  </label>
                  {recentEmojis.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5" aria-label="最近 emoji">
                      {recentEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          aria-label={`最近 ${emoji}`}
                          onClick={() => handleSelectEmoji(emoji)}
                          className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-[#dfe8db] bg-white text-base transition hover:border-[#8fad87] hover:bg-[#eef6ea]"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="grid max-h-28 grid-cols-4 gap-1 overflow-y-auto sm:grid-cols-8">
                    {filteredEmojiOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-label={`${option.label} ${option.value}`}
                        onClick={() => handleSelectEmoji(option.value)}
                        className="inline-flex h-8 items-center justify-center rounded-md border border-[#dfe8db] bg-white text-base transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
                      >
                        {option.value}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {shortcutPreferences.shortcutHintsEnabled ? (
                <div className="flex flex-wrap gap-1.5" aria-label="快捷提示">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt.label}
                      type="button"
                      disabled={!selectedConversation}
                      onClick={() => onMessageDraftChange(appendDraftBlock(messageDraft, prompt.text))}
                      className="inline-flex min-h-8 items-center rounded-md border border-[#cfd9cc] bg-[#f8fbf6] px-2.5 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {selectedMentionMembers.length > 0 || attachmentEntries.length > 0 ? (
                <div className="flex flex-wrap gap-1.5" aria-label="组合状态">
                  {selectedMentionMembers.map((member) => (
                    <button
                      key={member.memberId}
                      type="button"
                      onClick={() => onRemoveMention(member.memberId)}
                      className="inline-flex min-h-7 items-center gap-1 rounded-md border border-[#b9d0b2] bg-[#eef6ea] px-2 text-xs font-semibold text-[#2f5038]"
                    >
                      <AtSign aria-hidden="true" size={12} strokeWidth={2} />
                      {member.instanceLabel}
                      <X aria-hidden="true" size={12} strokeWidth={2} />
                    </button>
                  ))}
                  {attachmentEntries.map((entry) =>
                    entry.kind === "roadmap" ? (
                      <span
                        key={attachmentEntryKey(entry)}
                        className="inline-flex min-h-7 items-center overflow-hidden rounded-md border border-[#d7c8a5] bg-[#fff9ed] text-xs font-semibold text-[#604a1f]"
                      >
                        <button
                          type="button"
                          onClick={() => onOpenRoadmapReference(entry.taskId)}
                          className="inline-flex min-h-7 min-w-0 items-center gap-1 px-2 transition hover:bg-[#fff3d9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6d4b]"
                        >
                          <ListTodo aria-hidden="true" size={12} strokeWidth={2} />
                          <span className="truncate">{attachmentEntryLabel(entry)}</span>
                        </button>
                        <button
                          type="button"
                          aria-label={`移除路线图引用 ${entry.title}`}
                          onClick={() => onRemoveAttachmentEntry(entry)}
                          className="inline-flex min-h-7 w-7 items-center justify-center border-l border-[#e6d7b5] transition hover:bg-[#fff3d9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b6d4b]"
                        >
                          <X aria-hidden="true" size={12} strokeWidth={2} />
                        </button>
                      </span>
                    ) : (
                      <button
                        key={attachmentEntryKey(entry)}
                        type="button"
                        onClick={() => onRemoveAttachmentEntry(entry)}
                        className="inline-flex min-h-7 items-center gap-1 rounded-md border border-[#d7c8a5] bg-[#fff9ed] px-2 text-xs font-semibold text-[#604a1f]"
                      >
                        <ImageIcon aria-hidden="true" size={12} strokeWidth={2} />
                        {attachmentEntryLabel(entry)}
                        <X aria-hidden="true" size={12} strokeWidth={2} />
                      </button>
                    ),
                  )}
                </div>
              ) : null}

              {hasUnsupportedAllMention ? (
                <p className="rounded-md border border-[#e0c37b] bg-[#fff8e6] px-3 py-2 text-xs font-medium text-[#765400]">
                  @all 暂未在 MVP 中启用，请选择具体成员。
                </p>
              ) : null}

              <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
                输入消息
                <textarea
                  value={messageDraft}
                  disabled={!selectedConversation}
                  onChange={(event) => onMessageDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      isEmojiPanelOpen &&
                      shortcutEventMatches(
                        shortcutPreferences,
                        SHORTCUT_ACTION.chatEmojiClose,
                        event,
                      )
                    ) {
                      event.preventDefault();
                      setIsEmojiPanelOpen(false);
                      return;
                    }

                    if (
                      shortcutEventMatches(
                        shortcutPreferences,
                        SHORTCUT_ACTION.chatSend,
                        event,
                      )
                    ) {
                      if (event.nativeEvent.isComposing) {
                        return;
                      }

                      event.preventDefault();
                      onSendMessage();
                    }
                  }}
                  rows={3}
                  placeholder={selectedConversation ? "发送到当前会话" : "先选择会话"}
                  className="min-h-20 resize-y rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87] disabled:cursor-not-allowed disabled:bg-[#f1f4ef]"
                />
              </label>
              {mentionSuggestions.length > 0 ? (
                <div
                  role="listbox"
                  aria-label="提及建议"
                  className="grid max-h-36 gap-1 overflow-y-auto rounded-md border border-[#dbe4d7] bg-white p-1"
                >
                  {mentionSuggestions.map((member) => (
                    <button
                      key={member.memberId}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => onAddMention(member)}
                      className="flex min-h-9 items-center gap-2 rounded px-2 text-left text-xs text-[#263229] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2f6f55]"
                    >
                      <AtSign aria-hidden="true" size={13} strokeWidth={2} />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{member.instanceLabel}</span>
                        <span className="block truncate text-[#6a786c]">{member.displayName}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={!selectedConversation || isSendingMessage || messageDraft.trim().length === 0}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
              >
                <Send aria-hidden="true" size={14} strokeWidth={2} />
                {isSendingMessage ? "发送中" : "发送"}
              </button>
            </form>
          </div>

          <form
            aria-label="新建群聊"
            className="grid gap-2 border-t border-[#e3eadf] pt-3"
            onSubmit={(event) => {
              event.preventDefault();
              onCreateGroup();
            }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-[#263229]">
              <Users aria-hidden="true" size={14} strokeWidth={2} />
              新建群聊
            </div>
            <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
              名称
              <input
                value={groupTitle}
                onChange={(event) => onGroupTitleChange(event.target.value)}
                placeholder="Review Room"
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87]"
              />
            </label>
            <MemberCheckboxList
              members={members}
              selectedMemberIds={groupMemberIds}
              emptyText="邀请成员后可创建群聊"
              onToggleMember={onToggleCreateGroupMember}
            />
            <button
              type="submit"
              disabled={isCreating || !canCreateGroup}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
            >
              <Plus aria-hidden="true" size={14} strokeWidth={2} />
              {isCreating ? "创建中" : "创建群聊"}
            </button>
          </form>

          {selectedConversation?.kind === "group" ? (
            <form
              aria-label="群聊成员"
              className="grid gap-2 border-t border-[#e3eadf] pt-3"
              onSubmit={(event) => {
                event.preventDefault();
                onUpdateGroupMembers();
              }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-[#263229]">
                <Users aria-hidden="true" size={14} strokeWidth={2} />
                群聊成员
              </div>
              <MemberCheckboxList
                members={members}
                selectedMemberIds={selectedGroupMemberIds}
                emptyText="暂无可选成员"
                onToggleMember={onToggleSelectedGroupMember}
              />
              <button
                type="submit"
                disabled={isUpdating || !canUpdateGroup}
                className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#cfd9cc] bg-[#f8fbf6] px-3 py-2 text-xs font-semibold text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Users aria-hidden="true" size={14} strokeWidth={2} />
                {isUpdating ? "保存中" : "更新成员"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function MemberCheckboxList({
  members,
  selectedMemberIds,
  emptyText,
  onToggleMember,
}: {
  members: MemberProfile[];
  selectedMemberIds: string[];
  emptyText: string;
  onToggleMember: (memberId: string) => void;
}) {
  if (members.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[#cfd9cc] bg-[#f8fbf6] p-2 text-xs text-[#6a786c]">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="grid max-h-36 gap-1 overflow-y-auto pr-1">
      {members.map((member) => (
        <label
          key={member.memberId}
          className="flex min-h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-[#526054] hover:bg-[#f8fbf6]"
        >
          <input
            type="checkbox"
            checked={selectedMemberIds.includes(member.memberId)}
            onChange={() => onToggleMember(member.memberId)}
            className="h-4 w-4 shrink-0 rounded border-[#cfd9cc] accent-[#2f6f55]"
          />
          <span className="min-w-0 truncate">{member.instanceLabel}</span>
        </label>
      ))}
    </div>
  );
}

const quickPrompts = [
  { label: "请评审", text: "请评审这次变更并指出阻塞风险。" },
  { label: "给方案", text: "请给出可执行方案，并列出取舍。" },
  { label: "查边界", text: "请检查边界条件和失败路径。" },
];

const emojiOptions = [
  { value: "✅", label: "完成", keywords: ["done", "pass", "check"] },
  { value: "🙏", label: "感谢", keywords: ["thanks", "please"] },
  { value: "👀", label: "查看", keywords: ["review", "look"] },
  { value: "💡", label: "想法", keywords: ["idea", "tip"] },
  { value: "⚠️", label: "注意", keywords: ["warning", "risk"] },
  { value: "🚧", label: "进行中", keywords: ["wip", "progress"] },
  { value: "❓", label: "问题", keywords: ["question", "ask"] },
  { value: "📌", label: "固定", keywords: ["pin", "note"] },
  { value: "🧪", label: "测试", keywords: ["test", "qa"] },
  { value: "🔍", label: "搜索", keywords: ["search", "inspect"] },
  { value: "📝", label: "记录", keywords: ["note", "doc"] },
  { value: "⏳", label: "等待", keywords: ["wait", "pending"] },
];

type GolutraEmojiSearchEntry = GolutraEmojiEntry & {
  searchText: string;
};

function buildGolutraEmojiIndex(entries: GolutraEmojiEntry[]) {
  const byGroup: Record<number, GolutraEmojiSearchEntry[]> = {};
  const byEmoji = new Map<string, GolutraEmojiSearchEntry>();
  const flat: GolutraEmojiSearchEntry[] = [];

  for (const entry of entries) {
    const indexed = {
      ...entry,
      searchText: `${entry.emoji} ${entry.label} ${entry.tags.join(" ")}`.toLocaleLowerCase(),
    };
    const groupEntries = byGroup[entry.group] ?? [];

    groupEntries.push(indexed);
    byGroup[entry.group] = groupEntries;
    flat.push(indexed);

    if (!byEmoji.has(entry.emoji)) {
      byEmoji.set(entry.emoji, indexed);
    }
  }

  return { byEmoji, byGroup, flat };
}

const GOLUTRA_EMOJI_INDEX = buildGolutraEmojiIndex(GOLUTRA_EMOJI_DATA);
const GOLUTRA_EMOJI_GROUP_OPTIONS: GolutraEmojiGroup[] = [
  { id: RECENT_EMOJI_GROUP_ID, label: "最近使用", icon: "🕘" },
  ...GOLUTRA_EMOJI_GROUPS,
];

function golutraRecentEmojiEntries(recentEmojis: string[]) {
  return recentEmojis
    .map((emoji) => GOLUTRA_EMOJI_INDEX.byEmoji.get(emoji))
    .filter((entry): entry is GolutraEmojiSearchEntry => Boolean(entry));
}

function golutraEmojiSearchEntries(query: string, activeGroupId: number, recentEmojis: string[]) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (normalizedQuery) {
    return GOLUTRA_EMOJI_INDEX.flat.filter((entry) => entry.searchText.includes(normalizedQuery));
  }

  if (activeGroupId === RECENT_EMOJI_GROUP_ID) {
    return golutraRecentEmojiEntries(recentEmojis);
  }

  return GOLUTRA_EMOJI_INDEX.byGroup[activeGroupId] ?? [];
}

function activeMentionQuery(draft: string) {
  const match = /(?:^|\s)@([^\s@]*)$/.exec(draft);

  return match ? match[1] : null;
}

function mentionMatches(member: MemberProfile, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [member.instanceLabel, member.displayName, member.role]
    .join(" ")
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}

function insertMentionText(draft: string, member: MemberProfile) {
  const mentionText = `@${member.instanceLabel}`;
  const activeQuery = activeMentionQuery(draft);

  if (activeQuery !== null) {
    const atIndex = draft.lastIndexOf("@");
    return `${draft.slice(0, atIndex)}${mentionText} `;
  }

  return `${appendInlineText(draft, mentionText)} `;
}

function appendInlineText(draft: string, text: string) {
  if (draft.length === 0 || /\s$/.test(draft)) {
    return `${draft}${text}`;
  }

  return `${draft} ${text}`;
}

function appendDraftBlock(draft: string, text: string) {
  const normalized = draft.trimEnd();

  return normalized ? `${normalized}\n${text}` : text;
}

function hasAllMentionToken(body: string) {
  return body
    .split(/[\s,.!?;:，。！？；：]+/)
    .some((token) => token === "@all");
}

function attachmentEntryLabel(entry: AttachmentEntry) {
  return entry.kind === "image" ? "图片待附加" : `路线图：${entry.title}`;
}

function attachmentEntryKey(entry: AttachmentEntry) {
  return entry.kind === "image" ? "image" : `roadmap-${entry.taskId}`;
}

function roadmapTaskStatusLabel(status: RoadmapTaskStatus) {
  switch (status) {
    case "pending":
      return "待处理";
    case "inProgress":
      return "进行中";
    case "done":
      return "已完成";
  }
}

function roadmapProgressForTasks(tasks: RoadmapTaskEntry[]) {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return { total, done, percent };
}

function loadRecentEmojis() {
  try {
    const raw = window.localStorage.getItem(RECENT_EMOJI_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string").slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function saveRecentEmojis(emojis: string[]) {
  try {
    window.localStorage.setItem(RECENT_EMOJI_STORAGE_KEY, JSON.stringify(emojis));
  } catch {
    // Recent emoji state is a best-effort UI cache.
  }
}

function ConversationKindIcon({ kind }: { kind: ConversationProfile["kind"] }) {
  if (kind === "channel") {
    return <Hash aria-hidden="true" size={17} strokeWidth={2} />;
  }

  if (kind === "group") {
    return <Users aria-hidden="true" size={17} strokeWidth={2} />;
  }

  return <MessageSquare aria-hidden="true" size={17} strokeWidth={2} />;
}

function TerminalChatStreamArticle({ stream }: { stream: TerminalChatStreamEntry }) {
  return (
    <article
      aria-label="终端输出流"
      className="rounded-md border border-[#b8c8cf] bg-[#f6fbfc] p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#52666f]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#284956]">
          <SquareTerminal aria-hidden="true" size={12} strokeWidth={2} />
          终端输出
        </span>
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span>{stream.memberLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{stream.title}</span>
          <span aria-hidden="true">·</span>
          <span>{terminalSessionStatusLabel(stream.status)}</span>
          <span aria-hidden="true">·</span>
          <span>{shortId(stream.terminalSessionId)}</span>
        </span>
      </div>
      {stream.exitReasonMessage ? (
        <p className="mt-2 rounded border border-[#d7c8a5] bg-[#fff9ed] px-2 py-1 text-[11px] font-medium text-[#604a1f]">
          {stream.exitReasonMessage}
        </p>
      ) : null}
      {stream.text ? (
        <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded border border-[#dce7ea] bg-white p-2 font-mono text-xs leading-5 text-[#1f2f35]">
          {stream.text}
        </pre>
      ) : (
        <p className="mt-2 rounded border border-dashed border-[#cddde1] bg-white p-2 text-xs text-[#61757d]">
          等待终端输出
        </p>
      )}
    </article>
  );
}

function MessageStatusIcon({ status }: { status: ChatMessageProfile["status"] }) {
  if (status === "failed") {
    return <AlertTriangle aria-hidden="true" size={12} strokeWidth={2} />;
  }

  if (status === "sending") {
    return <RefreshCw aria-hidden="true" size={12} strokeWidth={2} />;
  }

  return <CheckCircle2 aria-hidden="true" size={12} strokeWidth={2} />;
}

function messageStatusLabel(status: ChatMessageProfile["status"]) {
  if (status === "failed") {
    return "failed";
  }

  if (status === "sending") {
    return "sending";
  }

  return "sent";
}

function terminalSessionStatusLabel(status: TerminalSessionStatus) {
  switch (status) {
    case "starting":
      return "启动中";
    case "running":
      return "运行中";
    case "exited":
      return "已退出";
  }
}

function terminalMemberLabel(
  memberId: string | null,
  members: MemberProfile[],
  fallbackTitle: string | null,
) {
  if (!memberId) {
    return fallbackTitle || "工作区终端";
  }

  return (
    members.find((member) => member.memberId === memberId)?.instanceLabel ??
    fallbackTitle ??
    shortId(memberId)
  );
}

function stateForDispatchProfile(
  dispatch: DispatchRequestProfile,
  member: MemberProfile,
): MessageDispatchState {
  if (dispatch.status === "failed") {
    return {
      status: "failed",
      dispatchRequestId: dispatch.dispatchRequestId,
      memberId: member.memberId,
      memberLabel: member.instanceLabel,
      message: dispatch.failure?.message ?? "派发未能启动。",
      userAction: dispatch.failure?.userAction ?? "请修复问题后重试派发。",
    };
  }

  if (dispatch.status === "queued") {
    return {
      status: "queued",
      dispatchRequestId: dispatch.dispatchRequestId,
      memberId: member.memberId,
      memberLabel: member.instanceLabel,
      message: `${member.instanceLabel} 正在工作中，任务已加入队列。`,
      userAction: "成员设为在线后会继续下一条队列任务。",
    };
  }

  if (dispatch.status === "skipped") {
    return {
      status: "skipped",
      dispatchRequestId: dispatch.dispatchRequestId,
      memberId: member.memberId,
      memberLabel: member.instanceLabel,
      message: `${member.instanceLabel} 正在请勿打扰，派发已跳过。`,
      userAction: "成员可用后可重新派发。",
    };
  }

  return {
    status: "dispatched",
    dispatchRequestId: dispatch.dispatchRequestId,
    memberId: member.memberId,
    memberLabel: member.instanceLabel,
    terminalSessionId: dispatch.terminalSessionId,
    message: dispatch.targetResolution.reason,
  };
}

function DispatchStateBadge({
  state,
  onSelectTarget,
}: {
  state: MessageDispatchState;
  onSelectTarget: (memberId: string) => void;
}) {
  if (state.status === "selecting") {
    return (
      <span
        aria-label="派发目标选择"
        className="grid gap-1 rounded-md border border-[#d6c48e] bg-[#fffaf0] px-2 py-1 text-[#6f5420]"
      >
        <span className="inline-flex items-center gap-1 font-semibold">
          <Users aria-hidden="true" size={12} strokeWidth={2} />
          {state.message ?? "请选择派发目标"}
        </span>
        <span className="flex flex-wrap gap-1">
          {(state.candidates ?? []).map((candidate) => (
            <button
              key={candidate.memberId}
              type="button"
              onClick={() => onSelectTarget(candidate.memberId)}
              className="inline-flex min-h-6 items-center rounded border border-[#d6c48e] bg-white px-1.5 font-semibold text-[#5d4518] transition hover:border-[#a9852d] hover:bg-[#fff4d8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9852d]"
            >
              {candidate.memberLabel}
            </button>
          ))}
        </span>
        {state.userAction ? <span>{state.userAction}</span> : null}
      </span>
    );
  }

  if (state.status === "queued") {
    return (
      <span
        aria-label="派发状态"
        className="grid gap-1 rounded-md border border-[#d6c48e] bg-[#fffaf0] px-2 py-1 text-[#6f5420]"
      >
        <span className="inline-flex items-center gap-1 font-semibold">
          <History aria-hidden="true" size={12} strokeWidth={2} />
          已排队
          {state.memberLabel ? ` · ${state.memberLabel}` : ""}
        </span>
        {state.message ? <span>{state.message}</span> : null}
        {state.userAction ? <span>{state.userAction}</span> : null}
      </span>
    );
  }

  if (state.status === "skipped") {
    return (
      <span
        aria-label="派发状态"
        className="grid gap-1 rounded-md border border-[#d7b9b9] bg-[#fff5f5] px-2 py-1 text-[#7a2f2f]"
      >
        <span className="inline-flex items-center gap-1 font-semibold">
          <BellOff aria-hidden="true" size={12} strokeWidth={2} />
          已跳过
          {state.memberLabel ? ` · ${state.memberLabel}` : ""}
        </span>
        {state.message ? <span>{state.message}</span> : null}
        {state.userAction ? <span>{state.userAction}</span> : null}
      </span>
    );
  }

  if (state.status === "dispatching") {
    return (
      <span
        aria-label="派发状态"
        className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[#dfe8db] bg-white px-2 font-semibold text-[#526054]"
      >
        <RefreshCw aria-hidden="true" size={12} strokeWidth={2} />
        正在派发到 {state.memberLabel}
      </span>
    );
  }

  if (state.status === "failed") {
    return (
      <span
        aria-label="派发状态"
        className="grid gap-1 rounded-md border border-[#e2b8a7] bg-[#fff7f3] px-2 py-1 text-[#8b3e25]"
      >
        <span className="inline-flex items-center gap-1 font-semibold">
          <AlertTriangle aria-hidden="true" size={12} strokeWidth={2} />
          派发失败
          {state.memberLabel ? ` · ${state.memberLabel}` : ""}
        </span>
        {state.message ? <span>{state.message}</span> : null}
        {state.userAction ? <span>{state.userAction}</span> : null}
      </span>
    );
  }

  return (
    <span
      aria-label="派发状态"
      className="grid gap-1 rounded-md border border-[#b9d0b2] bg-[#eef6ea] px-2 py-1 font-semibold text-[#2f5038]"
    >
      <span className="inline-flex items-center gap-1.5">
        <CheckCircle2 aria-hidden="true" size={12} strokeWidth={2} />
        已派发到 {state.memberLabel}
        {state.terminalSessionId ? ` · ${shortId(state.terminalSessionId)}` : ""}
      </span>
      {state.message ? <span className="font-medium">{state.message}</span> : null}
    </span>
  );
}

function dispatchResolutionForMessage(
  message: ChatMessageProfile,
  members: MemberProfile[],
  conversation: ConversationProfile,
): DispatchResolutionState {
  if (message.messageId.startsWith("pending-")) {
    return { target: null, candidates: [] };
  }

  const memberIds = [...new Set(message.mentionedMemberIds)];

  if (memberIds.length > 0) {
    const candidates = terminalCapableMembersByIds(memberIds, members);
    return {
      target: candidates.length === 1 ? candidates[0] : null,
      candidates,
    };
  }

  if (conversation.kind === "private" && conversation.participantKind === "member") {
    const privateMember = members.find(
      (member) =>
        member.memberId === conversation.participantId && isTerminalCapableMember(member),
    );

    if (privateMember) {
      return { target: privateMember, candidates: [privateMember] };
    }
  }

  const conversationMemberIds = conversation.members.map((member) => member.memberId);
  const conversationCandidates = terminalCapableMembersByIds(conversationMemberIds, members);
  if (conversationCandidates.length > 0) {
    return {
      target: conversationCandidates.length === 1 ? conversationCandidates[0] : null,
      candidates: conversationCandidates,
    };
  }

  const workspaceCandidates = members.filter(isTerminalCapableMember);
  return {
    target: workspaceCandidates.length === 1 ? workspaceCandidates[0] : null,
    candidates: workspaceCandidates,
  };
}

function terminalCapableMembersByIds(memberIds: string[], members: MemberProfile[]) {
  const uniqueIds = [...new Set(memberIds)];
  return uniqueIds
    .map((memberId) => members.find((member) => member.memberId === memberId))
    .filter((member): member is MemberProfile => Boolean(member && isTerminalCapableMember(member)));
}

function shortId(value: string) {
  return value.slice(-6);
}

function unreadBadgeLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}

function notificationNavigationKey(action: NotificationNavigationAction) {
  return [
    action.kind,
    action.workspaceId ?? "",
    action.conversationId ?? "",
    action.memberId ?? "",
    action.updatedAtMs,
  ].join(":");
}

function mergeMessagePages(
  first: ChatMessageProfile[],
  second: ChatMessageProfile[],
): ChatMessageProfile[] {
  const byId = new Map<string, ChatMessageProfile>();

  for (const message of [...first, ...second]) {
    byId.set(message.messageId, message);
  }

  return [...byId.values()].sort((left, right) => {
    if (left.createdAtMs !== right.createdAtMs) {
      return left.createdAtMs - right.createdAtMs;
    }

    return left.messageId.localeCompare(right.messageId);
  });
}

function sortConversationsForDisplay(
  conversations: ConversationProfile[],
): ConversationProfile[] {
  return [...conversations].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    const leftUnread = left.unreadCount > 0;
    const rightUnread = right.unreadCount > 0;
    if (leftUnread !== rightUnread) {
      return leftUnread ? -1 : 1;
    }

    if (left.lastActivityAtMs !== right.lastActivityAtMs) {
      return right.lastActivityAtMs - left.lastActivityAtMs;
    }

    if (left.updatedAtMs !== right.updatedAtMs) {
      return right.updatedAtMs - left.updatedAtMs;
    }

    const titleCompare = left.title.localeCompare(right.title);
    if (titleCompare !== 0) {
      return titleCompare;
    }

    return left.conversationId.localeCompare(right.conversationId);
  });
}

function MembersPanel({
  members,
  ownerAvatar,
  terminalActivity,
  isLoading,
  isInviting,
  inviteType,
  displayName,
  runtimeKind,
  builtinRuntimeId,
  customRuntimeCliId,
  customRuntimeCommand,
  builtInRuntimeOptions,
  customCliRuntimeOptions,
  instanceCount,
  canMention,
  canRemove,
  sandboxed,
  unlimitedAccess,
  openActionMenuId,
  onInviteTypeChange,
  onDisplayNameChange,
  onRuntimeKindChange,
  onBuiltinRuntimeChange,
  onCustomRuntimeCliChange,
  onCustomRuntimeCommandChange,
  onInstanceCountChange,
  onCanMentionChange,
  onCanRemoveChange,
  onSandboxedChange,
  onUnlimitedAccessChange,
  onToggleActionMenu,
  onStartPrivateConversation,
  onOpenMemberTerminal,
  onMentionMember,
  onUpdateMemberStatus,
  onRemoveMember,
  onInvite,
}: {
  members: MemberProfile[];
  ownerAvatar: ProfileAvatarSnapshot | null;
  terminalActivity: Record<string, MemberTerminalActivity>;
  isLoading: boolean;
  isInviting: boolean;
  inviteType: InvitedMemberType;
  displayName: string;
  runtimeKind: MemberRuntimeKind;
  builtinRuntimeId: string;
  customRuntimeCliId: string;
  customRuntimeCommand: string;
  builtInRuntimeOptions: RuntimeOption[];
  customCliRuntimeOptions: RuntimeOption[];
  instanceCount: number;
  canMention: boolean;
  canRemove: boolean;
  sandboxed: boolean;
  unlimitedAccess: boolean;
  openActionMenuId: string | null;
  onInviteTypeChange: (value: InvitedMemberType) => void;
  onDisplayNameChange: (value: string) => void;
  onRuntimeKindChange: (value: MemberRuntimeKind) => void;
  onBuiltinRuntimeChange: (value: string) => void;
  onCustomRuntimeCliChange: (value: string) => void;
  onCustomRuntimeCommandChange: (value: string) => void;
  onInstanceCountChange: (value: number) => void;
  onCanMentionChange: (value: boolean) => void;
  onCanRemoveChange: (value: boolean) => void;
  onSandboxedChange: (value: boolean) => void;
  onUnlimitedAccessChange: (value: boolean) => void;
  onToggleActionMenu: (memberId: string) => void;
  onStartPrivateConversation: (member: MemberProfile) => void;
  onOpenMemberTerminal: (member: MemberProfile) => void;
  onMentionMember: (member: MemberProfile) => void;
  onUpdateMemberStatus: (member: MemberProfile, status: MemberProfile["status"]) => void;
  onRemoveMember: (member: MemberProfile) => void;
  onInvite: () => void;
}) {
  const ownerMembers = members.filter((member) => member.role === "owner");
  const adminMembers = members.filter((member) => member.role === "admin");
  const assistantMembers = members.filter((member) => member.role === "assistant");
  const regularMembers = members.filter((member) => member.role === "member");
  const customCommandLabel = runtimeKind === "shell" ? "Shell 命令" : "自定义 CLI 命令";
  const canInvite =
    displayName.trim().length > 0 &&
    (runtimeKind === "builtInAiCli" ||
      (runtimeKind === "customCli" &&
        (customRuntimeCliId.trim().length > 0 || customRuntimeCommand.trim().length > 0)) ||
      (runtimeKind === "shell" && customRuntimeCommand.trim().length > 0));

  return (
    <section
      aria-labelledby="members-title"
      className="mt-6 rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#6a786c]">成员</p>
          <h2 id="members-title" className="mt-1 text-sm font-semibold text-[#263229]">
            Owner 与邀请成员
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0c9] bg-white px-2.5 py-1 text-xs font-medium text-[#37533e]">
          <Users aria-hidden="true" size={14} strokeWidth={2} />
          {isLoading ? "加载中" : `${members.length} 个成员`}
        </span>
      </div>

      <div className="mt-4 grid gap-3">
        <MemberGroup
          title="群主"
          members={ownerMembers}
          ownerAvatar={ownerAvatar}
          terminalActivity={terminalActivity}
          emptyText="正在初始化 owner"
          openActionMenuId={openActionMenuId}
          onToggleActionMenu={onToggleActionMenu}
          onStartPrivateConversation={onStartPrivateConversation}
          onOpenMemberTerminal={onOpenMemberTerminal}
          onMentionMember={onMentionMember}
          onUpdateMemberStatus={onUpdateMemberStatus}
          onRemoveMember={onRemoveMember}
        />
        <MemberGroup
          title="管理员"
          members={adminMembers}
          ownerAvatar={ownerAvatar}
          terminalActivity={terminalActivity}
          emptyText="暂无管理员"
          openActionMenuId={openActionMenuId}
          onToggleActionMenu={onToggleActionMenu}
          onStartPrivateConversation={onStartPrivateConversation}
          onOpenMemberTerminal={onOpenMemberTerminal}
          onMentionMember={onMentionMember}
          onUpdateMemberStatus={onUpdateMemberStatus}
          onRemoveMember={onRemoveMember}
        />
        <MemberGroup
          title="助手"
          members={assistantMembers}
          ownerAvatar={ownerAvatar}
          terminalActivity={terminalActivity}
          emptyText="暂无助手"
          openActionMenuId={openActionMenuId}
          onToggleActionMenu={onToggleActionMenu}
          onStartPrivateConversation={onStartPrivateConversation}
          onOpenMemberTerminal={onOpenMemberTerminal}
          onMentionMember={onMentionMember}
          onUpdateMemberStatus={onUpdateMemberStatus}
          onRemoveMember={onRemoveMember}
        />
        <MemberGroup
          title="普通成员"
          members={regularMembers}
          ownerAvatar={ownerAvatar}
          terminalActivity={terminalActivity}
          emptyText="暂无普通成员"
          openActionMenuId={openActionMenuId}
          onToggleActionMenu={onToggleActionMenu}
          onStartPrivateConversation={onStartPrivateConversation}
          onOpenMemberTerminal={onOpenMemberTerminal}
          onMentionMember={onMentionMember}
          onUpdateMemberStatus={onUpdateMemberStatus}
          onRemoveMember={onRemoveMember}
        />
      </div>

      <form
        className="mt-5 grid gap-3 rounded-md border border-[#e3eadf] bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          onInvite();
        }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-[#263229]">
          <UserPlus aria-hidden="true" size={16} strokeWidth={2} />
          邀请成员
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
            类型
            <select
              value={inviteType}
              onChange={(event) => onInviteTypeChange(event.target.value as InvitedMemberType)}
              className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
            >
              <option value="assistant">Assistant</option>
              <option value="member">Member</option>
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
            显示名称
            <input
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              placeholder={inviteType === "assistant" ? "Codex Reviewer" : "Local Collaborator"}
              className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87]"
            />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
            Runtime
            <select
              value={runtimeKind}
              onChange={(event) => onRuntimeKindChange(event.target.value as MemberRuntimeKind)}
              className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
            >
              <option value="builtInAiCli">内置 AI CLI</option>
              <option value="customCli">自定义 CLI</option>
              <option value="shell">Shell</option>
            </select>
          </label>

          {runtimeKind === "builtInAiCli" ? (
            <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
              内置运行时
              <select
                value={builtinRuntimeId}
                onChange={(event) => onBuiltinRuntimeChange(event.target.value)}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
              >
                {builtInRuntimeOptions.map((runtime) => (
                  <option key={runtime.id} value={runtime.id}>
                    {runtime.label}
                  </option>
                ))}
              </select>
            </label>
          ) : runtimeKind === "customCli" && customCliRuntimeOptions.length > 0 ? (
            <div className="grid gap-2">
              <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
                自定义 CLI
                <select
                  value={customRuntimeCliId}
                  onChange={(event) => {
                    onCustomRuntimeCliChange(event.target.value);
                    if (event.target.value) {
                      onCustomRuntimeCommandChange("");
                    }
                  }}
                  className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
                >
                  {customCliRuntimeOptions.map((runtime) => (
                    <option key={runtime.id} value={runtime.id}>
                      {runtime.label}
                    </option>
                  ))}
                  <option value="">手动命令</option>
                </select>
              </label>
              {customRuntimeCliId ? (
                <p className="rounded-md border border-[#edf1eb] bg-[#f8fbf6] px-3 py-2 text-xs text-[#526054]">
                  命令：{customCliRuntimeOptions.find((runtime) => runtime.id === customRuntimeCliId)?.command ?? ""}
                </p>
              ) : (
                <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
                  自定义 CLI 命令
                  <input
                    value={customRuntimeCommand}
                    onChange={(event) => onCustomRuntimeCommandChange(event.target.value)}
                    placeholder="my-agent --stdio"
                    className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87]"
                  />
                </label>
              )}
            </div>
          ) : (
            <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
              {customCommandLabel}
              <input
                value={customRuntimeCommand}
                onChange={(event) => onCustomRuntimeCommandChange(event.target.value)}
                placeholder={runtimeKind === "shell" ? "zsh" : "my-agent --stdio"}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87]"
              />
            </label>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
            实例数量
            <input
              type="number"
              min={1}
              max={20}
              value={instanceCount}
              onChange={(event) =>
                onInstanceCountChange(clampInstanceCount(Number(event.target.value)))
              }
              className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
            />
          </label>

          <div className="grid gap-2 rounded-md border border-[#e3eadf] bg-[#f8fbf6] p-3">
            <CheckboxControl
              label="@成员"
              checked={canMention}
              onChange={onCanMentionChange}
            />
            <CheckboxControl
              label="允许移除"
              checked={canRemove}
              onChange={onCanRemoveChange}
            />
          </div>
        </div>

        <div className="grid gap-2 rounded-md border border-[#e3eadf] bg-[#f8fbf6] p-3 sm:grid-cols-2">
          <CheckboxControl
            label="沙盒环境"
            checked={sandboxed}
            onChange={onSandboxedChange}
          />
          <CheckboxControl
            label="无限制模式"
            checked={unlimitedAccess}
            onChange={onUnlimitedAccessChange}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#6a786c]">
            Runtime 只保存到成员资料；终端会在后续显式打开时启动。
          </p>
          <button
            type="submit"
            disabled={isInviting || !canInvite}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
          >
            <UserPlus aria-hidden="true" size={14} strokeWidth={2} />
            {isInviting ? "保存中" : "发送邀请"}
          </button>
        </div>
      </form>
    </section>
  );
}

function MemberGroup({
  title,
  members,
  ownerAvatar,
  terminalActivity,
  emptyText,
  openActionMenuId,
  onToggleActionMenu,
  onStartPrivateConversation,
  onOpenMemberTerminal,
  onMentionMember,
  onUpdateMemberStatus,
  onRemoveMember,
}: {
  title: string;
  members: MemberProfile[];
  ownerAvatar: ProfileAvatarSnapshot | null;
  terminalActivity: Record<string, MemberTerminalActivity>;
  emptyText: string;
  openActionMenuId: string | null;
  onToggleActionMenu: (memberId: string) => void;
  onStartPrivateConversation: (member: MemberProfile) => void;
  onOpenMemberTerminal: (member: MemberProfile) => void;
  onMentionMember: (member: MemberProfile) => void;
  onUpdateMemberStatus: (member: MemberProfile, status: MemberProfile["status"]) => void;
  onRemoveMember: (member: MemberProfile) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#6a786c]">{title}</p>
      {members.length > 0 ? (
        <ul className="mt-2 grid gap-2">
          {members.map((member) => {
            const activity = terminalActivity[member.memberId];

            return (
              <li
                key={member.memberId}
                className="relative flex items-center gap-3 rounded-md border border-[#e3eadf] bg-white p-3"
              >
              <MemberAvatar member={member} ownerAvatar={ownerAvatar} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[#263229]">
                  {member.instanceLabel}
                </span>
                <span className="mt-1 block truncate text-xs text-[#6a786c]">
                  {memberRoleLabel(member.role)} · {memberStatusLabel(member.status)} ·{" "}
                  {runtimeLabel(member.runtime)}
                </span>
                <span className="mt-1 block truncate text-xs text-[#7a8678]">
                  {permissionLabel(member)} · {isolationLabel(member)}
                </span>
                {activity ? (
                  <span className="mt-1 block truncate text-xs font-medium text-[#52666f]">
                    终端：{terminalSessionStatusLabel(activity.status)} ·{" "}
                    {shortId(activity.terminalSessionId)}
                    {activity.exitReasonMessage ? ` · ${activity.exitReasonMessage}` : ""}
                  </span>
                ) : null}
              </span>
              <div className="shrink-0">
                <button
                  type="button"
                  aria-label={`${member.instanceLabel} 操作`}
                  disabled={
                    member.role === "owner" &&
                    !member.permissions.canMention &&
                    !member.permissions.canRemove &&
                    !isTerminalCapableMember(member)
                  }
                  onClick={() => onToggleActionMenu(member.memberId)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d8e2d4] bg-[#fbfcfa] text-[#526054] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <MoreVertical aria-hidden="true" size={16} strokeWidth={2} />
                </button>
                {openActionMenuId === member.memberId ? (
                  <div
                    role="menu"
                    aria-label={`${member.instanceLabel} 成员操作`}
                    className="absolute right-3 top-12 z-10 grid min-w-[148px] gap-1 rounded-md border border-[#d8e2d4] bg-white p-1 text-xs shadow-lg"
                  >
                    {member.role !== "owner" ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => onStartPrivateConversation(member)}
                        className="inline-flex items-center gap-2 rounded px-2 py-2 text-left text-[#263229] hover:bg-[#eef6ea]"
                      >
                        <MessageSquare aria-hidden="true" size={14} strokeWidth={2} />
                        发送消息
                      </button>
                    ) : null}
                    {member.permissions.canMention ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => onMentionMember(member)}
                        className="inline-flex items-center gap-2 rounded px-2 py-2 text-left text-[#263229] hover:bg-[#eef6ea]"
                      >
                        <AtSign aria-hidden="true" size={14} strokeWidth={2} />
                        @成员
                      </button>
                    ) : null}
                    {isTerminalCapableMember(member) ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => onOpenMemberTerminal(member)}
                        className="inline-flex items-center gap-2 rounded px-2 py-2 text-left text-[#263229] hover:bg-[#eef6ea]"
                      >
                        <SquareTerminal aria-hidden="true" size={14} strokeWidth={2} />
                        打开终端
                      </button>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => onUpdateMemberStatus(member, "online")}
                      className="inline-flex items-center gap-2 rounded px-2 py-2 text-left text-[#263229] hover:bg-[#eef6ea]"
                    >
                      <CheckCircle2 aria-hidden="true" size={14} strokeWidth={2} />
                      状态：在线
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => onUpdateMemberStatus(member, "working")}
                      className="inline-flex items-center gap-2 rounded px-2 py-2 text-left text-[#263229] hover:bg-[#eef6ea]"
                    >
                      <RefreshCw aria-hidden="true" size={14} strokeWidth={2} />
                      状态：工作中
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => onUpdateMemberStatus(member, "doNotDisturb")}
                      className="inline-flex items-center gap-2 rounded px-2 py-2 text-left text-[#263229] hover:bg-[#eef6ea]"
                    >
                      <BellOff aria-hidden="true" size={14} strokeWidth={2} />
                      状态：请勿打扰
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => onUpdateMemberStatus(member, "offline")}
                      className="inline-flex items-center gap-2 rounded px-2 py-2 text-left text-[#263229] hover:bg-[#eef6ea]"
                    >
                      <X aria-hidden="true" size={14} strokeWidth={2} />
                      状态：离线
                    </button>
                    {member.permissions.canRemove ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => onRemoveMember(member)}
                        className="inline-flex items-center gap-2 rounded px-2 py-2 text-left text-[#7a2f2f] hover:bg-[#fff1f1]"
                      >
                        <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
                        移除成员
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-sm text-[#6a786c]">
          {emptyText}
        </p>
      )}
    </div>
  );
}

function ContactsPanel({
  contacts,
  isLoading,
  isSaving,
  isStartingConversation,
  displayName,
  contactKind,
  notes,
  editingContactId,
  lastConversation,
  onDisplayNameChange,
  onContactKindChange,
  onNotesChange,
  onEditContact,
  onDeleteContact,
  onStartPrivateConversation,
  onCancelEdit,
  onSaveContact,
}: {
  contacts: ContactProfile[];
  isLoading: boolean;
  isSaving: boolean;
  isStartingConversation: boolean;
  displayName: string;
  contactKind: ContactKind;
  notes: string;
  editingContactId: string | null;
  lastConversation: ConversationProfile | null;
  onDisplayNameChange: (value: string) => void;
  onContactKindChange: (value: ContactKind) => void;
  onNotesChange: (value: string) => void;
  onEditContact: (contact: ContactProfile) => void;
  onDeleteContact: (contact: ContactProfile) => void;
  onStartPrivateConversation: (contact: ContactProfile) => void;
  onCancelEdit: () => void;
  onSaveContact: () => void;
}) {
  const canSave = displayName.trim().length > 0;

  return (
    <section
      aria-labelledby="contacts-title"
      className="mt-6 rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-[#6a786c]">全局联系人</p>
          <h2 id="contacts-title" className="mt-1 text-sm font-semibold text-[#263229]">
            联系人与管理员邀请
          </h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0c9] bg-white px-2.5 py-1 text-xs font-medium text-[#37533e]">
          <Users aria-hidden="true" size={14} strokeWidth={2} />
          {isLoading ? "加载中" : `${contacts.length} 个联系人`}
        </span>
      </div>

      <form
        className="mt-4 grid gap-3 rounded-md border border-[#e3eadf] bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSaveContact();
        }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-[#263229]">
          <Plus aria-hidden="true" size={16} strokeWidth={2} />
          {editingContactId ? "编辑联系人" : "添加联系人"}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
            邀请类型
            <select
              value={contactKind}
              onChange={(event) => onContactKindChange(event.target.value as ContactKind)}
              className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none focus:border-[#8fad87]"
            >
              <option value="contact">联系人</option>
              <option value="administrator">本地管理员</option>
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
            显示名称
            <input
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              placeholder={contactKind === "administrator" ? "Local Admin" : "External Collaborator"}
              className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87]"
            />
          </label>
        </div>

        <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
          备注
          <input
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            placeholder="本地联系人备注"
            className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87]"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#6a786c]">
            管理员/联系人邀请只保存本地记录，不创建远程账号或邀请链接。
          </p>
          <div className="flex flex-wrap gap-2">
            {editingContactId ? (
              <button
                type="button"
                onClick={onCancelEdit}
                className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-xs font-semibold text-[#425044] transition hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
              >
                取消
              </button>
            ) : null}
            <button
              type="submit"
              disabled={isSaving || !canSave}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-not-allowed disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
            >
              <Plus aria-hidden="true" size={14} strokeWidth={2} />
              {isSaving ? "保存中" : editingContactId ? "保存联系人" : "添加联系人"}
            </button>
          </div>
        </div>
      </form>

      {lastConversation ? (
        <div className="mt-4 rounded-md border border-[#cfe0c9] bg-white p-3 text-xs text-[#37533e]">
          <p className="font-medium">最近私聊：{lastConversation.title}</p>
          <p className="mt-1 break-all font-mono text-[11px]">
            {lastConversation.conversationId}
          </p>
        </div>
      ) : null}

      <div className="mt-4">
        {contacts.length > 0 ? (
          <ul className="grid gap-2">
            {contacts.map((contact) => (
              <li
                key={contact.contactId}
                className="flex flex-wrap items-center gap-3 rounded-md border border-[#e3eadf] bg-white p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#eef3eb] text-[#3f6849]">
                  <User aria-hidden="true" size={18} strokeWidth={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-[#263229]">
                    {contact.displayName}
                  </span>
                  <span className="mt-1 block truncate text-xs text-[#6a786c]">
                    {contactKindLabel(contact.contactKind)} · {contact.inviteSource}
                  </span>
                  {contact.notes ? (
                    <span className="mt-1 block truncate text-xs text-[#7a8678]">
                      {contact.notes}
                    </span>
                  ) : null}
                </span>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isStartingConversation}
                    onClick={() => onStartPrivateConversation(contact)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-[#f8fbf6] px-2.5 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
                  >
                    <MessageSquare aria-hidden="true" size={14} strokeWidth={2} />
                    发送消息
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditContact(contact)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-2.5 py-1.5 text-xs font-medium text-[#425044] transition hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
                  >
                    <Edit3 aria-hidden="true" size={14} strokeWidth={2} />
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteContact(contact)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#ead4d4] bg-white px-2.5 py-1.5 text-xs font-medium text-[#7a2f2f] transition hover:bg-[#fff1f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7a2f2f]"
                  >
                    <Trash2 aria-hidden="true" size={14} strokeWidth={2} />
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-sm text-[#6a786c]">
            暂无全局联系人
          </p>
        )}
      </div>
    </section>
  );
}

function CheckboxControl({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-xs font-medium text-[#526054]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-[#cfd9cc] accent-[#2f6f55]"
      />
      {label}
    </label>
  );
}

function selectedRuntimeProfile(
  kind: MemberRuntimeKind,
  builtInRuntimeId: string,
  customRuntimeCliId: string,
  customCommand: string,
  builtInRuntimeOptions: RuntimeOption[],
  customCliRuntimeOptions: RuntimeOption[],
): MemberRuntimeProfile {
  if (kind === "builtInAiCli") {
    const runtime =
      builtInRuntimeOptions.find((option) => option.id === builtInRuntimeId) ??
      DEFAULT_TERMINAL_CONFIGURATION.builtInCliEntries[0];

    return {
      kind,
      runtimeId: "id" in runtime ? runtime.id : runtime.runtimeId,
      label: runtime.label,
      command: runtime.command,
    };
  }

  const command = customCommand.trim();

  if (kind === "shell") {
    return {
      kind,
      runtimeId: command || null,
      label: command || null,
      command: command || null,
    };
  }

  if (kind === "customCli") {
    const configuredRuntime = customCliRuntimeOptions.find(
      (option) => option.id === customRuntimeCliId,
    );

    if (configuredRuntime) {
      return {
        kind,
        runtimeId: configuredRuntime.id,
        label: configuredRuntime.label,
        command: configuredRuntime.command,
      };
    }

    return {
      kind,
      runtimeId: command || null,
      label: command || null,
      command: command || null,
    };
  }

  return {
    kind: "none",
    runtimeId: null,
    label: null,
    command: null,
  };
}

function memberRoleLabel(role: MemberProfile["role"], language: AppLanguage = "en-US") {
  const roles = CHAT_PARITY_TEXT[language].roles;

  switch (role) {
    case "owner":
      return roles.owner;
    case "admin":
      return roles.admin;
    case "assistant":
      return roles.assistant;
    case "member":
      return roles.member;
  }
}

function friendsParityRoleLabel(role: MemberProfile["role"], language: AppLanguage) {
  return role === "assistant" ? FRIENDS_PARITY_TEXT[language].memberRole : memberRoleLabel(role, language);
}

function friendsParityContactRoleLabel(kind: ContactKind, language: AppLanguage) {
  return kind === "administrator"
    ? FRIENDS_PARITY_TEXT[language].adminRole
    : FRIENDS_PARITY_TEXT[language].memberRole;
}

function contactKindLabel(kind: ContactKind) {
  switch (kind) {
    case "administrator":
      return "本地管理员";
    case "contact":
      return "联系人";
  }
}

function MemberAvatar({
  member,
  ownerAvatar,
}: {
  member: MemberProfile;
  ownerAvatar: ProfileAvatarSnapshot | null;
}) {
  if (member.role === "owner") {
    return <AvatarPreview avatar={ownerAvatar} displayName={member.displayName} size="md" />;
  }

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#eef3eb] text-[#3f6849]">
      {member.role === "assistant" ? (
        <Bot aria-hidden="true" size={18} strokeWidth={2} />
      ) : (
        <User aria-hidden="true" size={18} strokeWidth={2} />
      )}
    </span>
  );
}

function AvatarPreview({
  avatar,
  displayName,
  size,
}: {
  avatar: ProfileAvatarSnapshot | null;
  displayName: string;
  size: "md" | "lg";
}) {
  const dimensionClass = size === "lg" ? "h-14 w-14 text-base" : "h-9 w-9 text-sm";
  const normalizedName = displayName.trim() || "Owner";
  const fallbackInitial = normalizedName.slice(0, 1).toUpperCase();

  if (avatar?.kind === "uploaded" && avatar.previewDataUrl) {
    return (
      <img
        src={avatar.previewDataUrl}
        alt={`${normalizedName} 头像`}
        className={`${dimensionClass} shrink-0 rounded-md object-cover ring-1 ring-[#cfd9cc]`}
      />
    );
  }

  const preset =
    avatar?.kind === "preset"
      ? PROFILE_AVATAR_PRESETS.find((item) => item.id === avatar.presetId)
      : null;

  if (preset) {
    return (
      <span
        aria-label={`${preset.label} 头像预设`}
        className={`${dimensionClass} flex shrink-0 items-center justify-center rounded-md font-semibold ring-1 ${preset.className}`}
      >
        {preset.label.slice(0, 1)}
      </span>
    );
  }

  return (
    <span
      aria-label={`${normalizedName} 默认头像`}
      className={`${dimensionClass} flex shrink-0 items-center justify-center rounded-md bg-[#eef3eb] font-semibold text-[#3f6849] ring-1 ring-[#d8e2d4]`}
    >
      {fallbackInitial}
    </span>
  );
}

function profileSnapshotToDraft(profile: ProfileSettingsSnapshot): ProfileSettingsDraft {
  const timezone = PROFILE_TIMEZONE_OPTIONS.includes(
    profile.timezone as (typeof PROFILE_TIMEZONE_OPTIONS)[number],
  )
    ? profile.timezone
    : "UTC";

  return {
    displayName: profile.displayName,
    timezone,
    status: profile.status,
    statusMessage: profile.statusMessage ?? "",
  };
}

function notificationPreferencesToDraft(
  preferences: NotificationPreferencesSnapshot,
): NotificationPreferencesDraft {
  return {
    desktopNotificationsEnabled: preferences.desktopNotificationsEnabled,
    soundEnabled: preferences.soundEnabled,
    mentionsOnly: preferences.mentionsOnly,
    messagePreviewEnabled: preferences.messagePreviewEnabled,
    dndEnabled: preferences.dndEnabled,
    dndStartTime: minutesToTimeInput(preferences.dndStartMinutes),
    dndEndTime: minutesToTimeInput(preferences.dndEndMinutes),
  };
}

function shortcutPreferencesToDraft(
  preferences: ShortcutPreferencesSnapshot,
): ShortcutPreferencesDraft {
  return {
    profile: preferences.profile,
    shortcutsEnabled: preferences.shortcutsEnabled,
    shortcutHintsEnabled: preferences.shortcutHintsEnabled,
    disabledActionIds: [...preferences.disabledActionIds],
  };
}

function shortcutBindingsForDraftProfile(
  profile: ShortcutKeymapProfile,
  disabledActionIds: string[],
): ShortcutPreferencesSnapshot["bindings"] {
  const chatSendKeys = profile === "vscode" ? ["Ctrl+Enter", "Meta+Enter"] : ["Enter"];
  const specs: Array<[string, string, string[], boolean, string | null]> = [
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
  ];

  return specs.map(([actionId, label, keys, available, unavailableReason]) => {
    const disabled = disabledActionIds.includes(actionId);

    return {
      actionId,
      label,
      keys,
      enabled: available && !disabled,
      available,
      unavailableReason,
    };
  });
}

function chatTerminalOutputPreferencesToDraft(
  preferences: ChatTerminalOutputPreferencesSnapshot,
): ChatTerminalOutputPreferencesDraft {
  return {
    displayMode: preferences.displayMode,
  };
}

function terminalConfigurationToDraft(
  configuration: TerminalConfigurationSnapshot,
): TerminalConfigurationDraft {
  return {
    builtInCliEntries: configuration.builtInCliEntries.map((entry) => ({ ...entry })),
    customCliEntries: configuration.customCliEntries.map((entry) => ({ ...entry })),
    customTerminalEntries: configuration.customTerminalEntries.map((entry) => ({ ...entry })),
    defaultTerminalId: configuration.defaultTerminalId,
  };
}

function nextTerminalConfigId(prefix: string, existingIds: string[]) {
  for (let index = existingIds.length + 1; index < existingIds.length + 100; index += 1) {
    const candidate = `${prefix}-${index}`;

    if (!existingIds.includes(candidate)) {
      return candidate;
    }
  }

  return `${prefix}-${Date.now()}`;
}

function shortcutBinding(
  actionId: string,
  label: string,
  keys: string[],
  available: boolean,
  unavailableReason: string | null = null,
) {
  return {
    actionId,
    label,
    keys,
    enabled: available,
    available,
    unavailableReason,
  };
}

function minutesToTimeInput(minutes: number) {
  const normalizedMinutes = Number.isInteger(minutes) && minutes >= 0 && minutes < 1440 ? minutes : 0;
  const hours = Math.floor(normalizedMinutes / 60);
  const minute = normalizedMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeInputToMinutes(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function applyProfileSettingsToOwnerMembers(
  members: MemberProfile[],
  profile: ProfileSettingsSnapshot,
): MemberProfile[] {
  return members.map((member) => {
    if (member.role !== "owner") {
      return member;
    }

    return {
      ...member,
      displayName: profile.displayName,
      instanceLabel: profile.displayName,
      status: profile.status,
      updatedAtMs: Math.max(member.updatedAtMs, profile.updatedAtMs),
    };
  });
}

function profileAvatarLabel(
  avatar: ProfileAvatarSnapshot | null | undefined,
  language: AppLanguage = "zh-CN",
) {
  if (avatar?.kind === "uploaded") {
    return language === "en-US" ? "Uploaded avatar" : "上传头像";
  }

  if (avatar?.kind === "preset") {
    const preset = PROFILE_AVATAR_PRESETS.find((item) => item.id === avatar.presetId);
    if (language === "en-US") {
      return preset ? `${preset.label} preset` : "Avatar preset";
    }

    return preset ? `${preset.label} 预设` : "头像预设";
  }

  return language === "en-US" ? "Default avatar" : "默认头像";
}

function profileSettingsFieldFromError(
  error: ReturnType<typeof normalizeAppError>,
): ProfileSettingsField | null {
  const details = error.details ?? "";

  for (const field of [
    "displayName",
    "timezone",
    "status",
    "statusMessage",
  ] satisfies ProfileSettingsField[]) {
    if (details.includes(`field=${field}`)) {
      return field;
    }
  }

  return null;
}

function conversationKindLabel(conversation: ConversationProfile) {
  switch (conversation.kind) {
    case "channel":
      return conversation.isDefault ? "默认频道" : "频道";
    case "group":
      return `群聊 · ${conversation.members.length} 个成员`;
    case "private":
      return conversation.participantKind === "contact" ? "联系人私聊" : "成员私聊";
  }
}

function memberStatusLabel(status: MemberProfile["status"], language: AppLanguage = "zh-CN") {
  const statuses = CHAT_PARITY_TEXT[language].statuses;

  switch (status) {
    case "online":
      return statuses.online;
    case "offline":
      return statuses.offline;
    case "working":
      return statuses.working;
    case "doNotDisturb":
      return statuses.doNotDisturb;
  }
}

function runtimeLabel(runtime: MemberRuntimeProfile) {
  switch (runtime.kind) {
    case "none":
      return "无运行时";
    case "builtInAiCli":
      return runtime.label ?? "内置 AI CLI";
    case "customCli":
      return runtime.label ?? runtime.command ?? "自定义 CLI";
    case "shell":
      return runtime.label ?? runtime.command ?? "Shell";
  }
}

function isTerminalCapableMember(member: MemberProfile) {
  return (
    member.runtime.kind !== "none" &&
    Boolean(member.runtime.command?.trim())
  );
}

function permissionLabel(member: MemberProfile) {
  const mention = member.permissions.canMention ? "@可用" : "@关闭";
  const remove = member.permissions.canRemove ? "可移除" : "不可移除";

  return `${mention} · ${remove}`;
}

function isolationLabel(member: MemberProfile) {
  const sandbox = member.isolation.sandboxed ? "沙盒" : "非沙盒";
  const access = member.isolation.unlimitedAccess ? "无限制" : "受限";

  return `${sandbox} · ${access}`;
}

function clampInstanceCount(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(20, Math.max(1, Math.trunc(value)));
}

function toggleId(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

function DataIntegrityPanel({
  report,
  disabled,
  onValidate,
}: {
  report: DataIntegrityReport | null;
  disabled: boolean;
  onValidate: () => void;
}) {
  const failedChecks = report?.checks.filter((check) => check.status === "failed") ?? [];

  return (
    <section
      aria-label="数据完整性"
      className="mt-4 rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#6a786c]">数据完整性</p>
          <p className="mt-1 text-sm font-semibold text-[#263229]">
            {report ? reportStatusLabel(report) : "尚未运行验证"}
          </p>
          {report ? (
            <p className="mt-1 text-xs text-[#6a786c]">
              {report.totalChecks} 项检查 · {report.passedChecks} 通过 ·{" "}
              {report.failedChecks} 失败 · {report.skippedChecks} 跳过
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onValidate}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
        >
          <ShieldCheck aria-hidden="true" size={14} strokeWidth={2} />
          {disabled ? "验证中" : "运行数据验证"}
        </button>
      </div>

      {report ? (
        <div className="mt-3 rounded-md border border-[#e3eadf] bg-white p-3 text-xs text-[#526054]">
          <p>
            生成时间：{new Date(report.generatedAtMs).toLocaleString()}；报告{" "}
            {report.batched ? "按独立检查项执行" : "一次性执行"}。
          </p>
          {failedChecks.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {failedChecks.map((check, index) => (
                <li
                  key={`${check.checkId}-${index}`}
                  className="rounded-md border border-[#e0c37b] bg-[#fffaf0] p-2 text-[#614500]"
                >
                  <p className="font-medium">{check.message}</p>
                  {check.affectedPaths.length > 0 ? (
                    <p className="mt-1 break-all font-mono text-[11px]">
                      {check.affectedPaths.join(" · ")}
                    </p>
                  ) : null}
                  {check.userAction ? <p className="mt-1">{check.userAction}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[#37533e]">当前已实现存储项没有发现损坏。</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function DiagnosticsPanel({
  overview,
  exportResult,
  isLoading,
  isExporting,
  onRefresh,
  onExport,
  onExportNext,
  onClearExport,
}: {
  overview: DiagnosticsOverviewResult | null;
  exportResult: DiagnosticsExportResult | null;
  isLoading: boolean;
  isExporting: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onExportNext: (cursor: string) => void;
  onClearExport: () => void;
}) {
  const runs = overview?.runs ?? [];
  const events = overview?.keyEvents ?? [];
  const consistency = overview?.consistencySummary;
  const validation = overview?.validationSummary;
  const warningCount = exportResult?.warnings.length ?? 0;

  return (
    <section
      aria-labelledby="diagnostics-panel-title"
      className="mt-4 rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#6a786c]">诊断</p>
          <h2 id="diagnostics-panel-title" className="mt-1 text-sm font-semibold text-[#263229]">
            诊断信息
          </h2>
          <p className="mt-1 text-xs text-[#6a786c]">
            {overview
              ? `${runs.length} 个 run · ${events.length} 条关键事件 · ${diagnosticsIssueTotal(consistency)} 个一致性问题`
              : "正在等待诊断数据"}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw aria-hidden="true" size={14} strokeWidth={2} />
            {isLoading ? "刷新中" : "刷新诊断"}
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={onExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#2f6f55] bg-[#2f6f55] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#285f49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:border-[#b9c7b5] disabled:bg-[#b9c7b5]"
          >
            <FileDown aria-hidden="true" size={14} strokeWidth={2} />
            {isExporting ? "生成中" : "生成导出"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 text-xs text-[#526054] sm:grid-cols-3">
        <div className="rounded-md border border-[#e3eadf] bg-white p-3">
          <p className="font-semibold text-[#263229]">Runs</p>
          <p className="mt-1">{runs.length} 个</p>
          {runs[0] ? (
            <p className="mt-1 truncate font-mono text-[11px]" title={runs[0].runId}>
              最近：{runs[0].status} · {runs[0].runId}
            </p>
          ) : null}
        </div>
        <div className="rounded-md border border-[#e3eadf] bg-white p-3">
          <p className="font-semibold text-[#263229]">一致性</p>
          <p className="mt-1">
            终端 {consistency?.terminalIssueCount ?? 0} · 聊天 {consistency?.chatIssueCount ?? 0}
          </p>
          <p className="mt-1">
            Error {consistency?.severityCounts.error ?? 0} · Warning{" "}
            {consistency?.severityCounts.warning ?? 0}
          </p>
        </div>
        <div className="rounded-md border border-[#e3eadf] bg-white p-3">
          <p className="font-semibold text-[#263229]">数据验证</p>
          <p className="mt-1">
            {validation?.availability === "available"
              ? `${validation.passedChecks}/${validation.totalChecks} 通过`
              : "未持久化报告"}
          </p>
          <p className="mt-1 truncate" title={validation?.message}>
            {validation?.message ?? "暂无数据验证摘要"}
          </p>
        </div>
      </div>

      {events.length > 0 ? (
        <ul className="mt-3 grid gap-2" aria-label="诊断关键事件">
          {events.slice(0, 5).map((event) => (
            <li
              key={event.eventId}
              className="grid gap-1 rounded-md border border-[#e3eadf] bg-white p-3 text-xs text-[#526054] sm:grid-cols-[auto_1fr_auto] sm:items-center"
            >
              <span className={diagnosticsSeverityClass(event.severity)}>
                {event.severity}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-[#263229]">
                  {event.eventName}
                </span>
                <span className="mt-1 block truncate font-mono text-[11px]" title={event.runId}>
                  {event.scope} · {event.runId}
                </span>
              </span>
              <span>{new Date(event.recordedAtMs).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-md border border-dashed border-[#cfd9cc] bg-white p-3 text-xs text-[#6a786c]">
          暂无诊断事件。
        </p>
      )}

      {exportResult ? (
        <div
          role="status"
          aria-label="诊断导出结果"
          className={
            warningCount > 0
              ? "mt-3 grid gap-2 rounded-md border border-[#e0c37b] bg-[#fffaf0] p-3 text-xs text-[#614500]"
              : "mt-3 grid gap-2 rounded-md border border-[#cfe0c9] bg-white p-3 text-xs text-[#37533e]"
          }
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              导出包 v{exportResult.package.schemaVersion} ·{" "}
              {exportResult.package.keyEvents.length} 条事件
            </p>
            <span>
              脱敏 {exportResult.redactionSummary.redactedFields} · 省略{" "}
              {exportResult.redactionSummary.omittedFields} · 提醒 {warningCount}
            </span>
          </div>
          {warningCount > 0 ? (
            <ul className="grid gap-1">
              {exportResult.warnings.slice(0, 4).map((warning, index) => (
                <li key={`${warning.section}-${warning.field}-${index}`}>
                  {warning.section}.{warning.field}: {warning.message}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {exportResult.hasMore && exportResult.nextCursor ? (
              <button
                type="button"
                disabled={isExporting}
                onClick={() => onExportNext(exportResult.nextCursor!)}
                className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md border border-[#cfd9cc] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#425044] transition hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
              >
                <RefreshCw aria-hidden="true" size={13} strokeWidth={2} />
                下一批
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClearExport}
              className="inline-flex min-h-8 items-center justify-center gap-1 rounded-md border border-[#d7c8c5] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6d3d38] transition hover:border-[#b9857f] hover:bg-[#fff5f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d5e58]"
            >
              <X aria-hidden="true" size={13} strokeWidth={2} />
              停止导出
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function diagnosticsIssueTotal(summary: DiagnosticsOverviewResult["consistencySummary"] | undefined) {
  return (summary?.terminalIssueCount ?? 0) + (summary?.chatIssueCount ?? 0);
}

function diagnosticsSeverityClass(severity: "info" | "warning" | "error") {
  switch (severity) {
    case "error":
      return "rounded-full border border-[#e2c7c0] bg-[#fff5f2] px-2 py-0.5 text-[11px] font-semibold text-[#7a2f2f]";
    case "warning":
      return "rounded-full border border-[#e0c37b] bg-[#fff8e6] px-2 py-0.5 text-[11px] font-semibold text-[#765400]";
    case "info":
      return "rounded-full border border-[#cfe0c9] bg-[#eef6ea] px-2 py-0.5 text-[11px] font-semibold text-[#2f5038]";
  }
}

function WindowContextControls({
  snapshot,
  language,
  disabled,
  onThemeChange,
  onLanguageChange,
  onOpenWindowMode,
}: {
  snapshot: WindowContextSnapshot;
  language: AppLanguage;
  disabled: boolean;
  onThemeChange: (theme: AppTheme) => void;
  onLanguageChange: (language: AppLanguage) => void;
  onOpenWindowMode: (mode: WindowMode) => void;
}) {
  const text = WINDOW_CONTEXT_TEXT[language];

  return (
    <section
      aria-label={text.windowContext}
      className="mt-4 rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#6a786c]">{text.currentWindow}</p>
          <p className="mt-1 text-sm font-semibold text-[#263229]">
            {windowModeLabel(snapshot.currentWindow.mode, language)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["system", "light", "dark"] satisfies AppTheme[]).map((theme) => (
            <button
              key={theme}
              type="button"
              disabled={disabled}
              onClick={() => onThemeChange(theme)}
              className={segmentedButtonClass(snapshot.preferences.theme === theme)}
            >
              {themeLabel(theme, language)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["zh-CN", "en-US"] satisfies AppLanguage[]).map((targetLanguage) => (
            <button
              key={targetLanguage}
              type="button"
              disabled={disabled}
              onClick={() => onLanguageChange(targetLanguage)}
              className={segmentedButtonClass(snapshot.preferences.language === targetLanguage)}
            >
              {languageLabel(targetLanguage, language)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["main", "workspaceSelection", "terminal", "notificationPreview"] satisfies WindowMode[]).map(
          (mode) => (
            <button
              key={mode}
              type="button"
              disabled={disabled}
              onClick={() => onOpenWindowMode(mode)}
              className="rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
            >
              {text.openWindowPrefix}
              {windowModeLabel(mode, language)}
            </button>
          ),
        )}
      </div>
      <p className="mt-3 truncate text-xs text-[#6a786c]" title={activeWorkspaceTitle(snapshot)}>
        {activeWorkspaceTitle(snapshot)}
      </p>
    </section>
  );
}

function WorkspaceConflictDialog({
  conflict,
  primaryButtonRef,
  onResolve,
  onCancel,
}: {
  conflict: WorkspaceRegistryConflict;
  primaryButtonRef: RefObject<HTMLButtonElement | null>;
  onResolve: (resolution: WorkspaceConflictResolution) => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-[#17211b]/35 px-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-conflict-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
        }}
        className="w-full max-w-[520px] rounded-lg border border-[#d7c6a4] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#fff5db] text-[#8a5c00]">
            <AlertTriangle aria-hidden="true" size={22} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 id="workspace-conflict-title" className="text-base font-semibold">
              工作区位置变化
            </h2>
            <p className="mt-2 text-sm text-[#526054]">
              检测到同一个项目标识对应了不同路径。请选择这是项目移动，还是复制出的新副本。
            </p>
          </div>
        </div>

        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-[#6a786c]">旧路径</dt>
            <dd className="mt-1 break-all rounded-md bg-[#f6f8f4] p-2 font-mono text-xs text-[#253129]">
              {conflict.existingPath}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-[#6a786c]">当前路径</dt>
            <dd className="mt-1 break-all rounded-md bg-[#f6f8f4] p-2 font-mono text-xs text-[#253129]">
              {conflict.selectedPath}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm font-medium text-[#425044] transition hover:bg-[#f7f9f5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
          >
            取消
          </button>
          <button
            ref={primaryButtonRef}
            type="button"
            onClick={() => onResolve("move")}
            className="rounded-md border border-[#c4d8bd] bg-[#f0f7ec] px-3 py-2 text-sm font-medium text-[#2f5038] transition hover:bg-[#e6f2df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
          >
            移动了
          </button>
          <button
            type="button"
            onClick={() => onResolve("copy")}
            className="rounded-md border border-[#d7c6a4] bg-[#fff7e6] px-3 py-2 text-sm font-medium text-[#6a4b00] transition hover:bg-[#fff1cf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a5c00]"
          >
            复制副本
          </button>
        </div>
      </section>
    </div>
  );
}

function formatRecentTime(timestamp: number) {
  return new Date(timestamp).toLocaleString();
}

function formatWorkspacePath(path: string) {
  if (!path) {
    return path;
  }

  if (!path.startsWith("\\\\?\\")) {
    return path;
  }

  const trimmed = path.slice(4);
  if (trimmed.toLocaleLowerCase().startsWith("unc\\")) {
    return `\\\\${trimmed.slice(4)}`;
  }

  return trimmed;
}

function formatRelativeWorkspaceTime(timestamp: number, language: AppLanguage) {
  if (!timestamp) {
    return "";
  }

  const diff = Date.now() - timestamp;
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: "auto" });
  const seconds = Math.round(diff / 1000);
  if (Math.abs(seconds) < 60) {
    return formatter.format(-seconds, "second");
  }

  const minutes = Math.round(seconds / 60);
  if (Math.abs(minutes) < 60) {
    return formatter.format(-minutes, "minute");
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(-hours, "hour");
  }

  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) {
    return formatter.format(-days, "day");
  }

  const months = Math.round(days / 30);
  return formatter.format(-months, "month");
}

function segmentedButtonClass(active: boolean) {
  return active
    ? "rounded-md border border-[#a7c79e] bg-[#e8f4e3] px-3 py-1.5 text-xs font-semibold text-[#26442f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
    : "rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#526054] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70";
}

function skillImportStatusAction(status: SkillImportStatus) {
  return status === "updatedExisting" ? "已更新已有技能记录。" : "已保存到本地技能库。";
}

function workspaceSkillLinkModeAction(skill: WorkspaceSkillLinkEntry) {
  return skill.linkMode === "manifest"
    ? "symlink 不可用，已保存为工作区清单链接。"
    : "已创建工作区技能 symlink。";
}

function reportStatusLabel(report: DataIntegrityReport) {
  if (report.hasFailures) {
    return "发现需要处理的数据问题";
  }

  if (report.skippedChecks > 0) {
    return "已完成，可用存储项通过";
  }

  return "所有检查通过";
}

function themeLabel(theme: AppTheme, language: AppLanguage = "zh-CN") {
  if (language === "en-US") {
    switch (theme) {
      case "dark":
        return "Dark";
      case "light":
        return "Light";
      case "system":
      default:
        return "System";
    }
  }

  switch (theme) {
    case "dark":
      return "深色";
    case "light":
      return "浅色";
    case "system":
    default:
      return "跟随系统";
  }
}

function languageLabel(language: AppLanguage, displayLanguage: AppLanguage = "zh-CN") {
  if (displayLanguage === "en-US") {
    return language === "en-US" ? "English (US)" : "Chinese (Simplified)";
  }

  return language === "en-US" ? "English" : "中文";
}

function windowModeLabel(mode: WindowMode, language: AppLanguage = "zh-CN") {
  if (language === "en-US") {
    switch (mode) {
      case "main":
        return "Main window";
      case "terminal":
        return "Terminal window";
      case "notificationPreview":
        return "Notification preview";
      case "workspaceSelection":
      default:
        return "Workspace window";
    }
  }

  switch (mode) {
    case "main":
      return "主窗口";
    case "terminal":
      return "终端窗口";
    case "notificationPreview":
      return "通知预览";
    case "workspaceSelection":
    default:
      return "工作区窗口";
  }
}

function activeWorkspaceTitle(snapshot: WindowContextSnapshot) {
  if (!snapshot.activeWorkspace) {
    return "未选择工作区";
  }

  return `${snapshot.activeWorkspace.metadata.name} · ${snapshot.activeWorkspace.rootPath}`;
}
