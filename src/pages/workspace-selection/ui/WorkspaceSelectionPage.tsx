import { useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  AtSign,
  Bot,
  CheckCircle2,
  Edit3,
  FolderOpen,
  Hash,
  History,
  MessageSquare,
  MoreVertical,
  Pin,
  Plus,
  RefreshCw,
  Send,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  User,
  UserPlus,
  Users,
} from "lucide-react";

import {
  chatApi,
  contactApi,
  dataIntegrityApi,
  memberApi,
  normalizeAppError,
  workspaceApi,
} from "../../../shared/api";
import type { ChatApi } from "../../../shared/api/chat-api";
import type { ContactApi } from "../../../shared/api/contact-api";
import type { DataIntegrityApi } from "../../../shared/api/data-integrity-api";
import type { DataIntegrityReport } from "../../../contracts/generated/data_integrity";
import type { MemberApi } from "../../../shared/api/member-api";
import type {
  ChatMessageProfile,
  ConversationProfile,
  ListConversationsResult,
  ListMessagesResult,
} from "../../../contracts/generated/chat";
import type { ContactKind, ContactProfile } from "../../../contracts/generated/contact";
import type {
  InvitedMemberType,
  MemberProfile,
  MemberRuntimeKind,
  MemberRuntimeProfile,
} from "../../../contracts/generated/member";
import type {
  AppLanguage,
  AppTheme,
  OpenWorkspaceResult,
  OpenedWorkspace,
  WindowContextSnapshot,
  WindowMode,
  WorkspaceConflictResolution,
  WorkspaceRegistryConflict,
} from "../../../contracts/generated";
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
  integrityApi?: Pick<DataIntegrityApi, "validate">;
  memberApi?: Pick<MemberApi, "listMembers" | "inviteMember" | "removeMember">;
  contactApi?: Pick<ContactApi, "listContacts" | "createContact" | "updateContact" | "deleteContact">;
  chatApi?: Pick<
    ChatApi,
    | "listConversations"
    | "createGroupConversation"
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

const MESSAGE_PAGE_LIMIT = 30;

export function WorkspaceSelectionPage({
  api = workspaceApi,
  windowContext = null,
  onPreferencesChange,
  onOpenWindowMode,
  integrityApi = dataIntegrityApi,
  memberApi: membersApi = memberApi,
  contactApi: contactsApi = contactApi,
  chatApi: conversationsApi = chatApi,
}: WorkspaceSelectionPageProps) {
  const queryClient = useQueryClient();
  const [isOpening, setIsOpening] = useState(false);
  const [isOpeningFileManager, setIsOpeningFileManager] = useState(false);
  const [isSyncActionPending, setIsSyncActionPending] = useState(false);
  const [isValidatingIntegrity, setIsValidatingIntegrity] = useState(false);
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [openedWorkspace, setOpenedWorkspace] = useState<OpenedWorkspace | null>(null);
  const [integrityReport, setIntegrityReport] = useState<DataIntegrityReport | null>(null);
  const [inviteType, setInviteType] = useState<InvitedMemberType>("assistant");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [runtimeKind, setRuntimeKind] = useState<MemberRuntimeKind>("builtInAiCli");
  const [builtinRuntimeId, setBuiltinRuntimeId] = useState("codex");
  const [customRuntimeCommand, setCustomRuntimeCommand] = useState("");
  const [inviteInstanceCount, setInviteInstanceCount] = useState(1);
  const [inviteCanMention, setInviteCanMention] = useState(true);
  const [inviteCanRemove, setInviteCanRemove] = useState(true);
  const [inviteSandboxed, setInviteSandboxed] = useState(true);
  const [inviteUnlimitedAccess, setInviteUnlimitedAccess] = useState(false);
  const [memberActionMenuId, setMemberActionMenuId] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactDisplayName, setContactDisplayName] = useState("");
  const [contactKind, setContactKind] = useState<ContactKind>("contact");
  const [contactNotes, setContactNotes] = useState("");
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [isCreatingGroupConversation, setIsCreatingGroupConversation] = useState(false);
  const [isUpdatingGroupMembers, setIsUpdatingGroupMembers] = useState(false);
  const [lastPrivateConversation, setLastPrivateConversation] =
    useState<ConversationProfile | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessageProfile[]>([]);
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
  const conversationQueryKey = ["chat-conversations", activeWorkspaceId] as const;
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
  const selectedConversation =
    conversations.find((conversation) => conversation.conversationId === selectedConversationId) ??
    conversations[0] ??
    null;
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
  const modeLabel =
    activeWorkspace
      ? "工作区已打开"
      : status?.windowMode === "workspaceSelection"
        ? "工作区选择"
        : (status?.windowMode ?? "工作区选择");

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
      await onOpenWindowMode(mode);
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

  async function handleInviteMember() {
    if (!activeWorkspace) {
      return;
    }

    setIsInvitingMember(true);

    try {
      const runtime = selectedRuntimeProfile(runtimeKind, builtinRuntimeId, customRuntimeCommand);
      const result = await membersApi.inviteMember({
        workspaceId: activeWorkspace.metadata.projectId,
        memberType: inviteType,
        displayName: inviteDisplayName,
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
      showToast({
        tone: "info",
        title: "成员已邀请",
        message:
          result.invitedMembers.length > 1
            ? `已保存 ${result.invitedMembers.length} 个 ${memberRoleLabel(result.member.role)} 实例。`
            : `${result.member.instanceLabel} 已保存为 ${memberRoleLabel(result.member.role)}。`,
        action: "运行时配置已保存，终端不会自动启动。",
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

  function handleMentionMember(member: MemberProfile) {
    if (!member.permissions.canMention) {
      return;
    }

    setMemberActionMenuId(null);
    showToast({
      tone: "info",
      title: "已准备提及成员",
      message: `${member.instanceLabel} 的提及入口已记录。`,
      action: `@${member.instanceLabel}`,
    });
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

    const timestamp = Date.now();
    const pendingMessage: ChatMessageProfile = {
      messageId: `pending-${timestamp}`,
      workspaceId: activeWorkspaceId,
      conversationId: selectedConversation.conversationId,
      authorMemberId: "local",
      body,
      status: "sending",
      createdAtMs: timestamp,
      updatedAtMs: timestamp,
    };

    setMessageDraft("");
    setIsSendingMessage(true);
    setMessages((current) => mergeMessagePages(current, [pendingMessage]));

    try {
      const result = await conversationsApi.sendMessage({
        workspaceId: activeWorkspaceId,
        conversationId: selectedConversation.conversationId,
        body,
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

  function showDeferredToast(title: string, message: string) {
    showToast({
      tone: "info",
      title,
      message,
      action: "后续 Story 会接入真实数据和桌面能力。",
    });
  }

  return (
    <main className="min-h-screen bg-[#f4f7f2] text-[#17211b]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-5">
        <header className="flex h-12 items-center justify-between border-b border-[#dbe4d7]">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-normal">orchlet</h1>
            <span className="text-xs font-medium text-[#637064]">
              {isLoading ? "检查入口状态中" : modeLabel}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              icon={RefreshCw}
              label="刷新最近工作区"
              tooltip="刷新最近工作区"
              onClick={() => void recentQuery.refetch()}
            />
            <IconButton
              icon={Settings}
              label="打开设置"
              tooltip="打开设置"
              onClick={() => showDeferredToast("设置尚未接入", "当前启动故事只提供入口外壳。")}
            />
          </div>
        </header>

        <section className="grid flex-1 place-items-center py-10">
          <div className="w-full max-w-[720px]">
            <button
              type="button"
              aria-label="打开文件夹"
              disabled={isOpening}
              onClick={handleOpenWorkspace}
              className="group flex min-h-[168px] w-full items-center gap-5 rounded-lg border border-[#ccd9c8] bg-white p-6 text-left shadow-sm transition hover:border-[#8fad87] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
            >
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-[#e7f1e2] text-[#2f6f55]">
                <FolderOpen aria-hidden="true" size={30} strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-semibold tracking-normal text-[#17211b]">
                  {isOpening ? "打开目录中" : "打开文件夹"}
                </span>
                <span className="mt-2 block text-base text-[#5e6d61]">
                  选择一个文件夹开始或恢复工作区
                </span>
              </span>
            </button>

            {windowContext && onPreferencesChange && onOpenWindowMode ? (
              <WindowContextControls
                snapshot={windowContext}
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
                conversations={conversations}
                selectedConversation={selectedConversation}
                messages={messages}
                members={members}
                isLoading={conversationQuery.isLoading}
                isLoadingMessages={messageQuery.isLoading}
                isLoadingOlderMessages={isLoadingOlderMessages}
                hasOlderMessages={hasOlderMessages}
                isSendingMessage={isSendingMessage}
                isCreating={isCreatingGroupConversation}
                isUpdating={isUpdatingGroupMembers}
                messageDraft={messageDraft}
                groupTitle={groupTitle}
                groupMemberIds={groupMemberIds}
                selectedGroupMemberIds={selectedGroupMemberIds}
                onSelectConversation={setSelectedConversationId}
                onMessageDraftChange={setMessageDraft}
                onSendMessage={() => void handleSendMessage()}
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
                members={members}
                isLoading={memberQuery.isLoading}
                isInviting={isInvitingMember}
                inviteType={inviteType}
                displayName={inviteDisplayName}
                runtimeKind={runtimeKind}
                builtinRuntimeId={builtinRuntimeId}
                customRuntimeCommand={customRuntimeCommand}
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
                onMentionMember={handleMentionMember}
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

            <section
              aria-labelledby="recent-workspaces-title"
              className="mt-6 rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 id="recent-workspaces-title" className="text-sm font-semibold">
                  最近的工作区
                </h2>
                <span className="text-xs text-[#6a786c]">
                  {recentWorkspaces.length || status?.recentWorkspaceCount || 0} 个记录
                </span>
              </div>

              {recentWorkspaces.length > 0 ? (
                <div className="mt-5 space-y-3">
                  <label className="flex items-center gap-2 rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] focus-within:border-[#8fad87]">
                    <Search aria-hidden="true" size={16} strokeWidth={2} />
                    <span className="sr-only">搜索文件夹</span>
                    <input
                      value={recentSearch}
                      onChange={(event) => setRecentSearch(event.target.value)}
                      placeholder="搜索文件夹..."
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
                            aria-label={`打开 ${workspace.name}`}
                            onClick={() => handleOpenRecent(workspace.path)}
                            className="shrink-0 rounded-md border border-[#cfd9cc] bg-[#f8fbf6] px-3 py-1.5 text-sm font-medium text-[#2f5038] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70"
                          >
                            打开
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-md border border-dashed border-[#cfd9cc] bg-white p-4 text-sm text-[#6a786c]">
                      未找到匹配的工作区
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-5 flex items-center gap-4 rounded-md border border-dashed border-[#cfd9cc] bg-white p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#eef3eb] text-[#61725f]">
                    <History aria-hidden="true" size={20} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#263229]">暂无最近工作区</p>
                    <p className="mt-1 text-sm text-[#6a786c]">
                      打开文件夹以创建你的第一个工作区。
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
      {toast ? <Toast toast={toast} onClose={clearToast} /> : null}
    </main>
  );
}

const builtInRuntimeOptions = [
  { id: "codex", label: "Codex CLI", command: "codex" },
  { id: "claude-code", label: "Claude Code", command: "claude" },
  { id: "gemini-cli", label: "Gemini CLI", command: "gemini" },
  { id: "opencode", label: "OpenCode", command: "opencode" },
  { id: "qwen-code", label: "Qwen Code", command: "qwen" },
];

function ConversationPanel({
  conversations,
  selectedConversation,
  messages,
  members,
  isLoading,
  isLoadingMessages,
  isLoadingOlderMessages,
  hasOlderMessages,
  isSendingMessage,
  isCreating,
  isUpdating,
  messageDraft,
  groupTitle,
  groupMemberIds,
  selectedGroupMemberIds,
  onSelectConversation,
  onMessageDraftChange,
  onSendMessage,
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
  members: MemberProfile[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  isLoadingOlderMessages: boolean;
  hasOlderMessages: boolean;
  isSendingMessage: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  messageDraft: string;
  groupTitle: string;
  groupMemberIds: string[];
  selectedGroupMemberIds: string[];
  onSelectConversation: (conversationId: string) => void;
  onMessageDraftChange: (value: string) => void;
  onSendMessage: () => void;
  onLoadOlderMessages: () => void;
  onGroupTitleChange: (value: string) => void;
  onToggleCreateGroupMember: (memberId: string) => void;
  onToggleSelectedGroupMember: (memberId: string) => void;
  onCreateGroup: () => void;
  onUpdateGroupMembers: () => void;
}) {
  const canCreateGroup = groupTitle.trim().length > 0 && groupMemberIds.length > 0;
  const canUpdateGroup =
    selectedConversation?.kind === "group" && selectedGroupMemberIds.length > 0;

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
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#cfe0c9] bg-white px-2.5 py-1 text-xs font-medium text-[#37533e]">
          <MessageSquare aria-hidden="true" size={14} strokeWidth={2} />
          {isLoading ? "加载中" : `${conversations.length} 个会话`}
        </span>
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
              {isLoading ? "正在初始化默认频道" : "暂无会话"}
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
              ) : messages.length > 0 ? (
                messages.map((message) => (
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
                  </article>
                ))
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
              <label className="grid gap-1.5 text-xs font-medium text-[#526054]">
                输入消息
                <textarea
                  value={messageDraft}
                  disabled={!selectedConversation}
                  onChange={(event) => onMessageDraftChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      onSendMessage();
                    }
                  }}
                  rows={3}
                  placeholder={selectedConversation ? "发送到当前会话" : "先选择会话"}
                  className="min-h-20 resize-y rounded-md border border-[#cfd9cc] bg-white px-3 py-2 text-sm text-[#263229] outline-none placeholder:text-[#8b9788] focus:border-[#8fad87] disabled:cursor-not-allowed disabled:bg-[#f1f4ef]"
                />
              </label>
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

function ConversationKindIcon({ kind }: { kind: ConversationProfile["kind"] }) {
  if (kind === "channel") {
    return <Hash aria-hidden="true" size={17} strokeWidth={2} />;
  }

  if (kind === "group") {
    return <Users aria-hidden="true" size={17} strokeWidth={2} />;
  }

  return <MessageSquare aria-hidden="true" size={17} strokeWidth={2} />;
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
  isLoading,
  isInviting,
  inviteType,
  displayName,
  runtimeKind,
  builtinRuntimeId,
  customRuntimeCommand,
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
  onCustomRuntimeCommandChange,
  onInstanceCountChange,
  onCanMentionChange,
  onCanRemoveChange,
  onSandboxedChange,
  onUnlimitedAccessChange,
  onToggleActionMenu,
  onStartPrivateConversation,
  onMentionMember,
  onRemoveMember,
  onInvite,
}: {
  members: MemberProfile[];
  isLoading: boolean;
  isInviting: boolean;
  inviteType: InvitedMemberType;
  displayName: string;
  runtimeKind: MemberRuntimeKind;
  builtinRuntimeId: string;
  customRuntimeCommand: string;
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
  onCustomRuntimeCommandChange: (value: string) => void;
  onInstanceCountChange: (value: number) => void;
  onCanMentionChange: (value: boolean) => void;
  onCanRemoveChange: (value: boolean) => void;
  onSandboxedChange: (value: boolean) => void;
  onUnlimitedAccessChange: (value: boolean) => void;
  onToggleActionMenu: (memberId: string) => void;
  onStartPrivateConversation: (member: MemberProfile) => void;
  onMentionMember: (member: MemberProfile) => void;
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
    (runtimeKind === "builtInAiCli" || customRuntimeCommand.trim().length > 0);

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
          emptyText="正在初始化 owner"
          openActionMenuId={openActionMenuId}
          onToggleActionMenu={onToggleActionMenu}
          onStartPrivateConversation={onStartPrivateConversation}
          onMentionMember={onMentionMember}
          onRemoveMember={onRemoveMember}
        />
        <MemberGroup
          title="管理员"
          members={adminMembers}
          emptyText="暂无管理员"
          openActionMenuId={openActionMenuId}
          onToggleActionMenu={onToggleActionMenu}
          onStartPrivateConversation={onStartPrivateConversation}
          onMentionMember={onMentionMember}
          onRemoveMember={onRemoveMember}
        />
        <MemberGroup
          title="助手"
          members={assistantMembers}
          emptyText="暂无助手"
          openActionMenuId={openActionMenuId}
          onToggleActionMenu={onToggleActionMenu}
          onStartPrivateConversation={onStartPrivateConversation}
          onMentionMember={onMentionMember}
          onRemoveMember={onRemoveMember}
        />
        <MemberGroup
          title="普通成员"
          members={regularMembers}
          emptyText="暂无普通成员"
          openActionMenuId={openActionMenuId}
          onToggleActionMenu={onToggleActionMenu}
          onStartPrivateConversation={onStartPrivateConversation}
          onMentionMember={onMentionMember}
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
  emptyText,
  openActionMenuId,
  onToggleActionMenu,
  onStartPrivateConversation,
  onMentionMember,
  onRemoveMember,
}: {
  title: string;
  members: MemberProfile[];
  emptyText: string;
  openActionMenuId: string | null;
  onToggleActionMenu: (memberId: string) => void;
  onStartPrivateConversation: (member: MemberProfile) => void;
  onMentionMember: (member: MemberProfile) => void;
  onRemoveMember: (member: MemberProfile) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#6a786c]">{title}</p>
      {members.length > 0 ? (
        <ul className="mt-2 grid gap-2">
          {members.map((member) => (
            <li
              key={member.memberId}
              className="relative flex items-center gap-3 rounded-md border border-[#e3eadf] bg-white p-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#eef3eb] text-[#3f6849]">
                {member.role === "assistant" ? (
                  <Bot aria-hidden="true" size={18} strokeWidth={2} />
                ) : (
                  <User aria-hidden="true" size={18} strokeWidth={2} />
                )}
              </span>
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
              </span>
              <div className="shrink-0">
                <button
                  type="button"
                  aria-label={`${member.instanceLabel} 操作`}
                  disabled={
                    member.role === "owner" &&
                    !member.permissions.canMention &&
                    !member.permissions.canRemove
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
          ))}
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
  customCommand: string,
): MemberRuntimeProfile {
  if (kind === "builtInAiCli") {
    const runtime =
      builtInRuntimeOptions.find((option) => option.id === builtInRuntimeId) ??
      builtInRuntimeOptions[0];

    return {
      kind,
      runtimeId: runtime.id,
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

function memberRoleLabel(role: MemberProfile["role"]) {
  switch (role) {
    case "owner":
      return "Owner";
    case "admin":
      return "Admin";
    case "assistant":
      return "Assistant";
    case "member":
      return "Member";
  }
}

function contactKindLabel(kind: ContactKind) {
  switch (kind) {
    case "administrator":
      return "本地管理员";
    case "contact":
      return "联系人";
  }
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

function memberStatusLabel(status: MemberProfile["status"]) {
  switch (status) {
    case "online":
      return "在线";
    case "offline":
      return "离线";
    case "working":
      return "工作中";
    case "doNotDisturb":
      return "请勿打扰";
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

function WindowContextControls({
  snapshot,
  disabled,
  onThemeChange,
  onLanguageChange,
  onOpenWindowMode,
}: {
  snapshot: WindowContextSnapshot;
  disabled: boolean;
  onThemeChange: (theme: AppTheme) => void;
  onLanguageChange: (language: AppLanguage) => void;
  onOpenWindowMode: (mode: WindowMode) => void;
}) {
  return (
    <section
      aria-label="窗口上下文"
      className="mt-4 rounded-lg border border-[#dbe4d7] bg-[#fbfcfa] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#6a786c]">当前窗口</p>
          <p className="mt-1 text-sm font-semibold text-[#263229]">
            {windowModeLabel(snapshot.currentWindow.mode)}
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
              {themeLabel(theme)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["zh-CN", "en-US"] satisfies AppLanguage[]).map((language) => (
            <button
              key={language}
              type="button"
              disabled={disabled}
              onClick={() => onLanguageChange(language)}
              className={segmentedButtonClass(snapshot.preferences.language === language)}
            >
              {languageLabel(language)}
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
              打开{windowModeLabel(mode)}
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

function segmentedButtonClass(active: boolean) {
  return active
    ? "rounded-md border border-[#a7c79e] bg-[#e8f4e3] px-3 py-1.5 text-xs font-semibold text-[#26442f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55]"
    : "rounded-md border border-[#cfd9cc] bg-white px-3 py-1.5 text-xs font-medium text-[#526054] transition hover:border-[#8fad87] hover:bg-[#eef6ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f6f55] disabled:cursor-wait disabled:opacity-70";
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

function themeLabel(theme: AppTheme) {
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

function languageLabel(language: AppLanguage) {
  return language === "en-US" ? "English" : "中文";
}

function windowModeLabel(mode: WindowMode) {
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
