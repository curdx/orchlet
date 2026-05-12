import type { AppError } from "../../src/contracts/generated/common";
import type {
  ChatMessageProfile,
  ChatMessageStatus,
  ClearConversationRequest,
  ClearConversationResult,
  ConversationReadPositionProfile,
  ConversationKind,
  CreateGroupConversationRequest,
  CreateGroupConversationResult,
  DeleteConversationRequest,
  DeleteConversationResult,
  ListConversationsRequest,
  ListConversationsResult,
  ListMessagesRequest,
  ListMessagesResult,
  ConversationParticipantKind,
  ConversationProfile,
  SendMessageRequest,
  SendMessageResult,
  StartPrivateConversationRequest,
  StartPrivateConversationResult,
  UpdateConversationSettingsRequest,
  UpdateConversationSettingsResult,
  UpdateGroupConversationMembersRequest,
  UpdateGroupConversationMembersResult,
  UpdateReadPositionRequest,
  UpdateReadPositionResult,
} from "../../src/contracts/generated/chat";
import type {
  ContactKind,
  ContactProfile,
  CreateContactRequest,
  CreateContactResult,
  DeleteContactRequest,
  DeleteContactResult,
  ListContactsRequest,
  ListContactsResult,
  UpdateContactRequest,
  UpdateContactResult,
} from "../../src/contracts/generated/contact";
import type {
  DataIntegrityCheckResult,
  DataIntegritySeverity,
  DataIntegrityStatus,
  StorageCategory,
  StorageFormat,
  StorageManifestEntry,
  StorageOwner,
  StoragePathPolicy,
  StoragePrivacyClass,
  DataIntegrityValidateRequest,
  DataIntegrityValidateResult,
} from "../../src/contracts/generated/data_integrity";
import type {
  InviteMemberRequest,
  InviteMemberResult,
  InvitedMemberType,
  ListMembersRequest,
  ListMembersResult,
  MemberProfile,
  MemberRole,
  MemberRuntimeKind,
  MemberStatus,
  RemoveMemberRequest,
  RemoveMemberResult,
  UpdateMemberStatusRequest,
  UpdateMemberStatusResult,
} from "../../src/contracts/generated/member";
import type {
  NotificationNavigationAction,
  NotificationNavigationKind,
  NotificationNavigationPendingRequest,
  NotificationNavigationPendingResult,
  NotificationNavigationRequest,
  NotificationNavigationResult,
  NotificationUnreadSummary,
  NotificationUnreadSummaryRequest,
  NotificationUnreadSummaryResult,
  NotificationUnreadUpdateRequest,
  NotificationUnreadUpdateResult,
} from "../../src/contracts/generated/notification";
import type {
  DispatchChatMessageRequest,
  DispatchChatMessageResult,
  DispatchQueueResumeRequest,
  DispatchQueueResumeResult,
  DispatchRequestProfile,
  DispatchRequestStatus,
  DispatchTargetResolutionSource,
} from "../../src/contracts/generated/orchestration";
import type {
  TerminalAttachRequest,
  TerminalAttachResult,
  TerminalCloseRequest,
  TerminalCloseResult,
  TerminalEnvironmentKind,
  TerminalEnvironmentProfile,
  TerminalEnvironmentSource,
  TerminalEnvironmentStatus,
  TerminalEnvironmentsListRequest,
  TerminalEnvironmentsListResult,
  TerminalInputRequest,
  TerminalInputResult,
  TerminalOpenRequest,
  TerminalOpenResult,
  TerminalOutputEventPayload,
  TerminalResizeRequest,
  TerminalResizeResult,
  TerminalSessionProfile,
  TerminalSessionStatus,
  TerminalStatusEventPayload,
  TerminalStreamKind,
  TerminalTabCloseRequest,
  TerminalTabCloseResult,
  TerminalTabCreateRequest,
  TerminalTabCreateResult,
  TerminalTabProfile,
  TerminalTabRestoreRequest,
  TerminalTabRestoreResult,
  TerminalTabStatus,
  TerminalTabUpdateRequest,
  TerminalTabUpdateResult,
  TerminalTabsListRequest,
  TerminalTabsListResult,
} from "../../src/contracts/generated/terminal";
import type {
  WorkspaceAccessMode,
  WorkspaceRegistryAction,
  OpenWorkspaceRequest,
  OpenWorkspaceResult,
  WindowMode,
  WorkspaceOpenStatus,
} from "../../src/contracts/generated/workspace";

import dataIntegrityError from "../../fixtures/contracts/data-integrity/data-integrity-validate.error.json";
import dataIntegrityRequest from "../../fixtures/contracts/data-integrity/data-integrity-validate.request.json";
import dataIntegrityResult from "../../fixtures/contracts/data-integrity/data-integrity-validate.result.json";
import listConversationsError from "../../fixtures/contracts/chat/chat-conversations-list.error.json";
import listConversationsRequest from "../../fixtures/contracts/chat/chat-conversations-list.request.json";
import listConversationsResult from "../../fixtures/contracts/chat/chat-conversations-list.result.json";
import createGroupConversationError from "../../fixtures/contracts/chat/chat-group-conversation-create.error.json";
import createGroupConversationRequest from "../../fixtures/contracts/chat/chat-group-conversation-create.request.json";
import createGroupConversationResult from "../../fixtures/contracts/chat/chat-group-conversation-create.result.json";
import updateConversationSettingsError from "../../fixtures/contracts/chat/chat-conversation-settings-update.error.json";
import updateConversationSettingsRequest from "../../fixtures/contracts/chat/chat-conversation-settings-update.request.json";
import updateConversationSettingsResult from "../../fixtures/contracts/chat/chat-conversation-settings-update.result.json";
import clearConversationError from "../../fixtures/contracts/chat/chat-conversation-clear.error.json";
import clearConversationRequest from "../../fixtures/contracts/chat/chat-conversation-clear.request.json";
import clearConversationResult from "../../fixtures/contracts/chat/chat-conversation-clear.result.json";
import deleteConversationError from "../../fixtures/contracts/chat/chat-conversation-delete.error.json";
import deleteConversationRequest from "../../fixtures/contracts/chat/chat-conversation-delete.request.json";
import deleteConversationResult from "../../fixtures/contracts/chat/chat-conversation-delete.result.json";
import sendMessageError from "../../fixtures/contracts/chat/chat-message-send.error.json";
import sendMessageRequest from "../../fixtures/contracts/chat/chat-message-send.request.json";
import sendMessageResult from "../../fixtures/contracts/chat/chat-message-send.result.json";
import listMessagesError from "../../fixtures/contracts/chat/chat-messages-page.error.json";
import listMessagesRequest from "../../fixtures/contracts/chat/chat-messages-page.request.json";
import listMessagesResult from "../../fixtures/contracts/chat/chat-messages-page.result.json";
import updateReadPositionError from "../../fixtures/contracts/chat/chat-read-position-update.error.json";
import updateReadPositionRequest from "../../fixtures/contracts/chat/chat-read-position-update.request.json";
import updateReadPositionResult from "../../fixtures/contracts/chat/chat-read-position-update.result.json";
import updateGroupConversationMembersError from "../../fixtures/contracts/chat/chat-group-conversation-members-update.error.json";
import updateGroupConversationMembersRequest from "../../fixtures/contracts/chat/chat-group-conversation-members-update.request.json";
import updateGroupConversationMembersResult from "../../fixtures/contracts/chat/chat-group-conversation-members-update.result.json";
import privateConversationError from "../../fixtures/contracts/chat/chat-private-conversation-start.error.json";
import privateConversationRequest from "../../fixtures/contracts/chat/chat-private-conversation-start.request.json";
import privateConversationResult from "../../fixtures/contracts/chat/chat-private-conversation-start.result.json";
import createContactError from "../../fixtures/contracts/contact/contact-create.error.json";
import createContactRequest from "../../fixtures/contracts/contact/contact-create.request.json";
import createContactResult from "../../fixtures/contracts/contact/contact-create.result.json";
import deleteContactError from "../../fixtures/contracts/contact/contact-delete.error.json";
import deleteContactRequest from "../../fixtures/contracts/contact/contact-delete.request.json";
import deleteContactResult from "../../fixtures/contracts/contact/contact-delete.result.json";
import listContactsError from "../../fixtures/contracts/contact/contacts-list.error.json";
import listContactsRequest from "../../fixtures/contracts/contact/contacts-list.request.json";
import listContactsResult from "../../fixtures/contracts/contact/contacts-list.result.json";
import updateContactError from "../../fixtures/contracts/contact/contact-update.error.json";
import updateContactRequest from "../../fixtures/contracts/contact/contact-update.request.json";
import updateContactResult from "../../fixtures/contracts/contact/contact-update.result.json";
import inviteMemberError from "../../fixtures/contracts/member/member-invite.error.json";
import inviteMemberRequest from "../../fixtures/contracts/member/member-invite.request.json";
import inviteMemberResult from "../../fixtures/contracts/member/member-invite.result.json";
import listMembersError from "../../fixtures/contracts/member/members-list.error.json";
import listMembersRequest from "../../fixtures/contracts/member/members-list.request.json";
import listMembersResult from "../../fixtures/contracts/member/members-list.result.json";
import removeMemberError from "../../fixtures/contracts/member/member-remove.error.json";
import removeMemberRequest from "../../fixtures/contracts/member/member-remove.request.json";
import removeMemberResult from "../../fixtures/contracts/member/member-remove.result.json";
import updateMemberStatusError from "../../fixtures/contracts/member/member-status-update.error.json";
import updateMemberStatusRequest from "../../fixtures/contracts/member/member-status-update.request.json";
import updateMemberStatusResult from "../../fixtures/contracts/member/member-status-update.result.json";
import dispatchChatMessageError from "../../fixtures/contracts/orchestration/dispatch-chat-message.error.json";
import dispatchChatMessageRequest from "../../fixtures/contracts/orchestration/dispatch-chat-message.request.json";
import dispatchChatMessageResult from "../../fixtures/contracts/orchestration/dispatch-chat-message.result.json";
import dispatchQueueResumeError from "../../fixtures/contracts/orchestration/dispatch-queue-resume.error.json";
import dispatchQueueResumeRequest from "../../fixtures/contracts/orchestration/dispatch-queue-resume.request.json";
import dispatchQueueResumeResult from "../../fixtures/contracts/orchestration/dispatch-queue-resume.result.json";
import notificationNavigationDispatchError from "../../fixtures/contracts/notification/notification-navigation-dispatch.error.json";
import notificationNavigationDispatchRequest from "../../fixtures/contracts/notification/notification-navigation-dispatch.request.json";
import notificationNavigationDispatchResult from "../../fixtures/contracts/notification/notification-navigation-dispatch.result.json";
import notificationNavigationEvent from "../../fixtures/contracts/notification/notification-navigation.event.json";
import notificationNavigationPendingError from "../../fixtures/contracts/notification/notification-navigation-pending-get.error.json";
import notificationNavigationPendingRequest from "../../fixtures/contracts/notification/notification-navigation-pending-get.request.json";
import notificationNavigationPendingResult from "../../fixtures/contracts/notification/notification-navigation-pending-get.result.json";
import notificationUnreadGetError from "../../fixtures/contracts/notification/notification-unread-summary-get.error.json";
import notificationUnreadGetRequest from "../../fixtures/contracts/notification/notification-unread-summary-get.request.json";
import notificationUnreadGetResult from "../../fixtures/contracts/notification/notification-unread-summary-get.result.json";
import notificationUnreadUpdateError from "../../fixtures/contracts/notification/notification-unread-summary-update.error.json";
import notificationUnreadUpdateRequest from "../../fixtures/contracts/notification/notification-unread-summary-update.request.json";
import notificationUnreadUpdateResult from "../../fixtures/contracts/notification/notification-unread-summary-update.result.json";
import notificationUnreadEvent from "../../fixtures/contracts/notification/notification-unread.event.json";
import terminalOpenError from "../../fixtures/contracts/terminal/terminal-open.error.json";
import terminalOpenRequest from "../../fixtures/contracts/terminal/terminal-open.request.json";
import terminalOpenResult from "../../fixtures/contracts/terminal/terminal-open.result.json";
import terminalOutputEvent from "../../fixtures/contracts/terminal/terminal-output.event.json";
import terminalAttachError from "../../fixtures/contracts/terminal/terminal-attach.error.json";
import terminalAttachRequest from "../../fixtures/contracts/terminal/terminal-attach.request.json";
import terminalAttachResult from "../../fixtures/contracts/terminal/terminal-attach.result.json";
import terminalCloseError from "../../fixtures/contracts/terminal/terminal-close.error.json";
import terminalCloseRequest from "../../fixtures/contracts/terminal/terminal-close.request.json";
import terminalCloseResult from "../../fixtures/contracts/terminal/terminal-close.result.json";
import terminalInputError from "../../fixtures/contracts/terminal/terminal-input.error.json";
import terminalInputRequest from "../../fixtures/contracts/terminal/terminal-input.request.json";
import terminalInputResult from "../../fixtures/contracts/terminal/terminal-input.result.json";
import terminalResizeError from "../../fixtures/contracts/terminal/terminal-resize.error.json";
import terminalResizeRequest from "../../fixtures/contracts/terminal/terminal-resize.request.json";
import terminalResizeResult from "../../fixtures/contracts/terminal/terminal-resize.result.json";
import terminalStatusEvent from "../../fixtures/contracts/terminal/terminal-status.event.json";
import terminalTabsListError from "../../fixtures/contracts/terminal/terminal-tabs-list.error.json";
import terminalTabsListRequest from "../../fixtures/contracts/terminal/terminal-tabs-list.request.json";
import terminalTabsListResult from "../../fixtures/contracts/terminal/terminal-tabs-list.result.json";
import terminalEnvironmentsListError from "../../fixtures/contracts/terminal/terminal-environments-list.error.json";
import terminalEnvironmentsListRequest from "../../fixtures/contracts/terminal/terminal-environments-list.request.json";
import terminalEnvironmentsListResult from "../../fixtures/contracts/terminal/terminal-environments-list.result.json";
import terminalTabCreateError from "../../fixtures/contracts/terminal/terminal-tab-create.error.json";
import terminalTabCreateRequest from "../../fixtures/contracts/terminal/terminal-tab-create.request.json";
import terminalTabCreateResult from "../../fixtures/contracts/terminal/terminal-tab-create.result.json";
import terminalTabCloseError from "../../fixtures/contracts/terminal/terminal-tab-close.error.json";
import terminalTabCloseRequest from "../../fixtures/contracts/terminal/terminal-tab-close.request.json";
import terminalTabCloseResult from "../../fixtures/contracts/terminal/terminal-tab-close.result.json";
import terminalTabRestoreError from "../../fixtures/contracts/terminal/terminal-tab-restore.error.json";
import terminalTabRestoreRequest from "../../fixtures/contracts/terminal/terminal-tab-restore.request.json";
import terminalTabRestoreResult from "../../fixtures/contracts/terminal/terminal-tab-restore.result.json";
import terminalTabUpdateError from "../../fixtures/contracts/terminal/terminal-tab-update.error.json";
import terminalTabUpdateRequest from "../../fixtures/contracts/terminal/terminal-tab-update.request.json";
import terminalTabUpdateResult from "../../fixtures/contracts/terminal/terminal-tab-update.result.json";
import workspaceError from "../../fixtures/contracts/workspace/workspace-open.error.json";
import workspaceRequest from "../../fixtures/contracts/workspace/workspace-open.request.json";
import workspaceResult from "../../fixtures/contracts/workspace/workspace-open.result.json";

export const workspaceOpenRequestFixture: OpenWorkspaceRequest = workspaceRequest;
export const workspaceOpenResultFixture: OpenWorkspaceResult = {
  ...workspaceResult,
  status: workspaceOpenStatus(workspaceResult.status),
  workspace: workspaceResult.workspace
    ? {
        ...workspaceResult.workspace,
        accessMode: workspaceAccessMode(workspaceResult.workspace.accessMode),
        registryAction: workspaceRegistryAction(workspaceResult.workspace.registryAction),
      }
    : null,
};
export const workspaceOpenErrorFixture: AppError = appError(workspaceError);

export const dataIntegrityValidateRequestFixture: DataIntegrityValidateRequest =
  dataIntegrityRequest;
export const dataIntegrityValidateResultFixture: DataIntegrityValidateResult = {
  report: {
    ...dataIntegrityResult.report,
    manifest: dataIntegrityResult.report.manifest.map(storageManifestEntry),
    checks: dataIntegrityResult.report.checks.map(dataIntegrityCheckResult),
  },
};
export const dataIntegrityValidateErrorFixture: AppError = appError(dataIntegrityError);

export const listMembersRequestFixture: ListMembersRequest = listMembersRequest;
export const listMembersResultFixture: ListMembersResult = {
  members: listMembersResult.members.map(memberProfile),
};
export const listMembersErrorFixture: AppError = appError(listMembersError);

export const inviteMemberRequestFixture: InviteMemberRequest = {
  ...inviteMemberRequest,
  memberType: invitedMemberType(inviteMemberRequest.memberType),
  runtime: {
    ...inviteMemberRequest.runtime,
    kind: memberRuntimeKind(inviteMemberRequest.runtime.kind),
  },
};
export const inviteMemberResultFixture: InviteMemberResult = {
  member: memberProfile(inviteMemberResult.member),
  invitedMembers: inviteMemberResult.invitedMembers.map(memberProfile),
  members: inviteMemberResult.members.map(memberProfile),
};
export const inviteMemberErrorFixture: AppError = appError(inviteMemberError);

export const removeMemberRequestFixture: RemoveMemberRequest = removeMemberRequest;
export const removeMemberResultFixture: RemoveMemberResult = {
  removedMemberId: removeMemberResult.removedMemberId,
  members: removeMemberResult.members.map(memberProfile),
};
export const removeMemberErrorFixture: AppError = appError(removeMemberError);

export const updateMemberStatusRequestFixture: UpdateMemberStatusRequest = {
  ...updateMemberStatusRequest,
  status: memberStatus(updateMemberStatusRequest.status),
};
export const updateMemberStatusResultFixture: UpdateMemberStatusResult = {
  member: memberProfile(updateMemberStatusResult.member),
  members: updateMemberStatusResult.members.map(memberProfile),
};
export const updateMemberStatusErrorFixture: AppError = appError(updateMemberStatusError);

export const terminalOpenRequestFixture: TerminalOpenRequest = terminalOpenRequest;
export const terminalOpenResultFixture: TerminalOpenResult = {
  ...terminalOpenResult,
  window: {
    ...terminalOpenResult.window,
    mode: windowMode(terminalOpenResult.window.mode),
  },
  session: terminalSessionProfile(terminalOpenResult.session),
};
export const terminalOpenErrorFixture: AppError = appError(terminalOpenError);
export const terminalOutputEventFixture: TerminalOutputEventPayload = {
  ...terminalOutputEvent,
  kind: terminalStreamKind(terminalOutputEvent.kind),
};
export const terminalAttachRequestFixture: TerminalAttachRequest = terminalAttachRequest;
export const terminalAttachResultFixture: TerminalAttachResult = {
  session: terminalSessionProfile(terminalAttachResult.session),
};
export const terminalAttachErrorFixture: AppError = appError(terminalAttachError);
export const terminalInputRequestFixture: TerminalInputRequest = terminalInputRequest;
export const terminalInputResultFixture: TerminalInputResult = {
  session: terminalSessionProfile(terminalInputResult.session),
};
export const terminalInputErrorFixture: AppError = appError(terminalInputError);
export const terminalResizeRequestFixture: TerminalResizeRequest = terminalResizeRequest;
export const terminalResizeResultFixture: TerminalResizeResult = {
  session: terminalSessionProfile(terminalResizeResult.session),
};
export const terminalResizeErrorFixture: AppError = appError(terminalResizeError);
export const terminalCloseRequestFixture: TerminalCloseRequest = terminalCloseRequest;
export const terminalCloseResultFixture: TerminalCloseResult = {
  session: terminalSessionProfile(terminalCloseResult.session),
};
export const terminalCloseErrorFixture: AppError = appError(terminalCloseError);
export const terminalStatusEventFixture: TerminalStatusEventPayload = {
  ...terminalStatusEvent,
  status: terminalSessionStatus(terminalStatusEvent.status),
};
export const terminalTabsListRequestFixture: TerminalTabsListRequest =
  terminalTabsListRequest;
export const terminalTabsListResultFixture: TerminalTabsListResult = {
  ...terminalTabsListResult,
  tabs: terminalTabsListResult.tabs.map(terminalTabProfile),
};
export const terminalTabsListErrorFixture: AppError = appError(terminalTabsListError);
export const terminalEnvironmentsListRequestFixture: TerminalEnvironmentsListRequest =
  terminalEnvironmentsListRequest;
export const terminalEnvironmentsListResultFixture: TerminalEnvironmentsListResult = {
  environments: terminalEnvironmentsListResult.environments.map(terminalEnvironmentProfile),
};
export const terminalEnvironmentsListErrorFixture: AppError = appError(
  terminalEnvironmentsListError,
);
export const terminalTabCreateRequestFixture: TerminalTabCreateRequest =
  terminalTabCreateRequest;
export const terminalTabCreateResultFixture: TerminalTabCreateResult = {
  tab: terminalTabProfile(terminalTabCreateResult.tab),
  session: terminalSessionProfile(terminalTabCreateResult.session),
  tabs: terminalTabCreateResult.tabs.map(terminalTabProfile),
};
export const terminalTabCreateErrorFixture: AppError = appError(terminalTabCreateError);
export const terminalTabCloseRequestFixture: TerminalTabCloseRequest =
  terminalTabCloseRequest;
export const terminalTabCloseResultFixture: TerminalTabCloseResult = {
  tab: terminalTabProfile(terminalTabCloseResult.tab),
  session: terminalSessionProfile(terminalTabCloseResult.session),
  tabs: terminalTabCloseResult.tabs.map(terminalTabProfile),
};
export const terminalTabCloseErrorFixture: AppError = appError(terminalTabCloseError);
export const terminalTabRestoreRequestFixture: TerminalTabRestoreRequest =
  terminalTabRestoreRequest;
export const terminalTabRestoreResultFixture: TerminalTabRestoreResult = {
  tab: terminalTabProfile(terminalTabRestoreResult.tab),
  session: terminalSessionProfile(terminalTabRestoreResult.session),
  tabs: terminalTabRestoreResult.tabs.map(terminalTabProfile),
};
export const terminalTabRestoreErrorFixture: AppError = appError(terminalTabRestoreError);
export const terminalTabUpdateRequestFixture: TerminalTabUpdateRequest =
  terminalTabUpdateRequest;
export const terminalTabUpdateResultFixture: TerminalTabUpdateResult = {
  tab: terminalTabProfile(terminalTabUpdateResult.tab),
  tabs: terminalTabUpdateResult.tabs.map(terminalTabProfile),
};
export const terminalTabUpdateErrorFixture: AppError = appError(terminalTabUpdateError);

export const dispatchChatMessageRequestFixture: DispatchChatMessageRequest =
  dispatchChatMessageRequest;
export const dispatchChatMessageResultFixture: DispatchChatMessageResult = {
  dispatch: dispatchRequestProfile(dispatchChatMessageResult.dispatch),
  terminalSession: dispatchChatMessageResult.terminalSession
    ? terminalSessionProfile(dispatchChatMessageResult.terminalSession)
    : null,
  sessionCreated: dispatchChatMessageResult.sessionCreated,
};
export const dispatchChatMessageErrorFixture: AppError = appError(dispatchChatMessageError);

export const dispatchQueueResumeRequestFixture: DispatchQueueResumeRequest =
  dispatchQueueResumeRequest;
export const dispatchQueueResumeResultFixture: DispatchQueueResumeResult = {
  dispatch: dispatchQueueResumeResult.dispatch
    ? dispatchRequestProfile(dispatchQueueResumeResult.dispatch)
    : null,
  terminalSession: dispatchQueueResumeResult.terminalSession
    ? terminalSessionProfile(dispatchQueueResumeResult.terminalSession)
    : null,
  sessionCreated: dispatchQueueResumeResult.sessionCreated,
  queueRemaining: dispatchQueueResumeResult.queueRemaining,
};
export const dispatchQueueResumeErrorFixture: AppError = appError(dispatchQueueResumeError);

export const notificationUnreadGetRequestFixture: NotificationUnreadSummaryRequest =
  notificationUnreadGetRequest;
export const notificationUnreadGetResultFixture: NotificationUnreadSummaryResult = {
  summary: notificationUnreadSummary(notificationUnreadGetResult.summary),
};
export const notificationUnreadGetErrorFixture: AppError = appError(notificationUnreadGetError);
export const notificationUnreadUpdateRequestFixture: NotificationUnreadUpdateRequest =
  notificationUnreadUpdateRequest;
export const notificationUnreadUpdateResultFixture: NotificationUnreadUpdateResult = {
  summary: notificationUnreadSummary(notificationUnreadUpdateResult.summary),
};
export const notificationUnreadUpdateErrorFixture: AppError = appError(
  notificationUnreadUpdateError,
);
export const notificationUnreadEventFixture: NotificationUnreadSummary =
  notificationUnreadSummary(notificationUnreadEvent);
export const notificationNavigationPendingRequestFixture: NotificationNavigationPendingRequest =
  notificationNavigationPendingRequest;
export const notificationNavigationPendingResultFixture: NotificationNavigationPendingResult = {
  action: notificationNavigationPendingResult.action
    ? notificationNavigationAction(notificationNavigationPendingResult.action)
    : null,
};
export const notificationNavigationPendingErrorFixture: AppError = appError(
  notificationNavigationPendingError,
);
export const notificationNavigationDispatchRequestFixture: NotificationNavigationRequest = {
  ...notificationNavigationDispatchRequest,
  kind: notificationNavigationKind(notificationNavigationDispatchRequest.kind),
};
export const notificationNavigationDispatchResultFixture: NotificationNavigationResult = {
  action: notificationNavigationAction(notificationNavigationDispatchResult.action),
};
export const notificationNavigationDispatchErrorFixture: AppError = appError(
  notificationNavigationDispatchError,
);
export const notificationNavigationEventFixture: NotificationNavigationAction =
  notificationNavigationAction(notificationNavigationEvent);

export const listContactsRequestFixture: ListContactsRequest = listContactsRequest;
export const listContactsResultFixture: ListContactsResult = {
  contacts: listContactsResult.contacts.map(contactProfile),
};
export const listContactsErrorFixture: AppError = appError(listContactsError);

export const createContactRequestFixture: CreateContactRequest = {
  ...createContactRequest,
  contactKind: contactKind(createContactRequest.contactKind),
};
export const createContactResultFixture: CreateContactResult = {
  contact: contactProfile(createContactResult.contact),
  contacts: createContactResult.contacts.map(contactProfile),
  adminMember: createContactResult.adminMember
    ? memberProfile(createContactResult.adminMember)
    : null,
};
export const createContactErrorFixture: AppError = appError(createContactError);

export const updateContactRequestFixture: UpdateContactRequest = {
  ...updateContactRequest,
  contactKind: contactKind(updateContactRequest.contactKind),
};
export const updateContactResultFixture: UpdateContactResult = {
  contact: contactProfile(updateContactResult.contact),
  contacts: updateContactResult.contacts.map(contactProfile),
};
export const updateContactErrorFixture: AppError = appError(updateContactError);

export const deleteContactRequestFixture: DeleteContactRequest = deleteContactRequest;
export const deleteContactResultFixture: DeleteContactResult = {
  deletedContactId: deleteContactResult.deletedContactId,
  contacts: deleteContactResult.contacts.map(contactProfile),
};
export const deleteContactErrorFixture: AppError = appError(deleteContactError);

export const listConversationsRequestFixture: ListConversationsRequest =
  listConversationsRequest;
export const listConversationsResultFixture: ListConversationsResult = {
  conversations: listConversationsResult.conversations.map(conversationProfile),
};
export const listConversationsErrorFixture: AppError = appError(listConversationsError);

export const createGroupConversationRequestFixture: CreateGroupConversationRequest =
  createGroupConversationRequest;
export const createGroupConversationResultFixture: CreateGroupConversationResult = {
  conversation: conversationProfile(createGroupConversationResult.conversation),
  conversations: createGroupConversationResult.conversations.map(conversationProfile),
};
export const createGroupConversationErrorFixture: AppError =
  appError(createGroupConversationError);

export const updateConversationSettingsRequestFixture: UpdateConversationSettingsRequest =
  updateConversationSettingsRequest;
export const updateConversationSettingsResultFixture: UpdateConversationSettingsResult = {
  conversation: conversationProfile(updateConversationSettingsResult.conversation),
  conversations: updateConversationSettingsResult.conversations.map(conversationProfile),
};
export const updateConversationSettingsErrorFixture: AppError = appError(
  updateConversationSettingsError,
);

export const clearConversationRequestFixture: ClearConversationRequest =
  clearConversationRequest;
export const clearConversationResultFixture: ClearConversationResult = {
  conversation: conversationProfile(clearConversationResult.conversation),
  clearedMessageCount: clearConversationResult.clearedMessageCount,
  conversations: clearConversationResult.conversations.map(conversationProfile),
};
export const clearConversationErrorFixture: AppError = appError(clearConversationError);

export const deleteConversationRequestFixture: DeleteConversationRequest =
  deleteConversationRequest;
export const deleteConversationResultFixture: DeleteConversationResult = {
  deletedConversationId: deleteConversationResult.deletedConversationId,
  conversations: deleteConversationResult.conversations.map(conversationProfile),
};
export const deleteConversationErrorFixture: AppError = appError(deleteConversationError);

export const sendMessageRequestFixture: SendMessageRequest = sendMessageRequest;
export const sendMessageResultFixture: SendMessageResult = {
  message: chatMessageProfile(sendMessageResult.message),
  conversation: conversationProfile(sendMessageResult.conversation),
  readPosition: readPositionProfile(sendMessageResult.readPosition),
};
export const sendMessageErrorFixture: AppError = appError(sendMessageError);

export const listMessagesRequestFixture: ListMessagesRequest = listMessagesRequest;
export const listMessagesResultFixture: ListMessagesResult = {
  messages: listMessagesResult.messages.map(chatMessageProfile),
  hasMore: listMessagesResult.hasMore,
  nextBeforeMessageId: listMessagesResult.nextBeforeMessageId,
  readPosition: listMessagesResult.readPosition
    ? readPositionProfile(listMessagesResult.readPosition)
    : null,
  conversation: conversationProfile(listMessagesResult.conversation),
};
export const listMessagesErrorFixture: AppError = appError(listMessagesError);

export const updateReadPositionRequestFixture: UpdateReadPositionRequest =
  updateReadPositionRequest;
export const updateReadPositionResultFixture: UpdateReadPositionResult = {
  readPosition: readPositionProfile(updateReadPositionResult.readPosition),
  conversation: conversationProfile(updateReadPositionResult.conversation),
};
export const updateReadPositionErrorFixture: AppError = appError(updateReadPositionError);

export const updateGroupConversationMembersRequestFixture: UpdateGroupConversationMembersRequest =
  updateGroupConversationMembersRequest;
export const updateGroupConversationMembersResultFixture: UpdateGroupConversationMembersResult = {
  conversation: conversationProfile(updateGroupConversationMembersResult.conversation),
  conversations: updateGroupConversationMembersResult.conversations.map(conversationProfile),
};
export const updateGroupConversationMembersErrorFixture: AppError = appError(
  updateGroupConversationMembersError,
);

export const privateConversationRequestFixture: StartPrivateConversationRequest = {
  ...privateConversationRequest,
  participantKind: conversationParticipantKind(privateConversationRequest.participantKind),
};
export const privateConversationResultFixture: StartPrivateConversationResult = {
  conversation: conversationProfile(privateConversationResult.conversation),
  created: privateConversationResult.created,
};
export const privateConversationErrorFixture: AppError = appError(privateConversationError);

type ErrorJson =
  | typeof workspaceError
  | typeof dataIntegrityError
  | typeof listMembersError
  | typeof inviteMemberError
  | typeof removeMemberError
  | typeof updateMemberStatusError
  | typeof terminalOpenError
  | typeof terminalAttachError
  | typeof terminalInputError
  | typeof terminalResizeError
  | typeof terminalCloseError
  | typeof terminalTabsListError
  | typeof terminalEnvironmentsListError
  | typeof terminalTabCreateError
  | typeof terminalTabCloseError
  | typeof terminalTabRestoreError
  | typeof terminalTabUpdateError
  | typeof dispatchChatMessageError
  | typeof dispatchQueueResumeError
  | typeof notificationUnreadGetError
  | typeof notificationUnreadUpdateError
  | typeof notificationNavigationPendingError
  | typeof notificationNavigationDispatchError
  | typeof listContactsError
  | typeof createContactError
  | typeof updateContactError
  | typeof deleteContactError
  | typeof listConversationsError
  | typeof createGroupConversationError
  | typeof updateConversationSettingsError
  | typeof clearConversationError
  | typeof deleteConversationError
  | typeof sendMessageError
  | typeof listMessagesError
  | typeof updateReadPositionError
  | typeof updateGroupConversationMembersError
  | typeof privateConversationError;

function notificationUnreadSummary(
  summary:
    | typeof notificationUnreadGetResult.summary
    | typeof notificationUnreadUpdateResult.summary
    | typeof notificationUnreadEvent,
): NotificationUnreadSummary {
  return {
    ...summary,
    conversations: summary.conversations.map((conversation) => ({ ...conversation })),
    tray: { ...summary.tray },
  };
}

function notificationNavigationAction(
  action:
    | typeof notificationNavigationPendingResult.action
    | typeof notificationNavigationDispatchResult.action
    | typeof notificationNavigationEvent,
): NotificationNavigationAction {
  if (!action) {
    throw new Error("Missing notification navigation action");
  }

  return {
    ...action,
    kind: notificationNavigationKind(action.kind),
  };
}

function notificationNavigationKind(value: string): NotificationNavigationKind {
  switch (value) {
    case "allUnread":
    case "conversation":
    case "memberTerminal":
      return value;
    default:
      throw new Error(`Unknown notification navigation kind: ${value}`);
  }
}

function appError(error: ErrorJson): AppError {
  return {
    ...error,
    severity: appErrorSeverity(error.severity),
  };
}

function storageManifestEntry(entry: (typeof dataIntegrityResult.report.manifest)[number]): StorageManifestEntry {
  return {
    ...entry,
    owner: storageOwner(entry.owner),
    category: storageCategory(entry.category),
    pathPolicy: storagePathPolicy(entry.pathPolicy),
    format: storageFormat(entry.format),
    privacyClass: storagePrivacyClass(entry.privacyClass),
  };
}

function dataIntegrityCheckResult(
  check: (typeof dataIntegrityResult.report.checks)[number],
): DataIntegrityCheckResult {
  return {
    ...check,
    category: storageCategory(check.category),
    status: dataIntegrityStatus(check.status),
    severity: dataIntegritySeverity(check.severity),
  };
}

function appErrorSeverity(value: string): AppError["severity"] {
  switch (value) {
    case "info":
    case "warning":
    case "error":
      return value;
    default:
      throw new Error(`Unknown AppError severity: ${value}`);
  }
}

function workspaceOpenStatus(value: string): WorkspaceOpenStatus {
  switch (value) {
    case "opened":
    case "conflict":
    case "focusedExisting":
      return value;
    default:
      throw new Error(`Unknown workspace open status: ${value}`);
  }
}

function workspaceAccessMode(value: string): WorkspaceAccessMode {
  switch (value) {
    case "readWrite":
    case "readOnly":
      return value;
    default:
      throw new Error(`Unknown workspace access mode: ${value}`);
  }
}

function workspaceRegistryAction(value: string): WorkspaceRegistryAction {
  switch (value) {
    case "created":
    case "registered":
    case "reopened":
    case "moved":
    case "copied":
      return value;
    default:
      throw new Error(`Unknown workspace registry action: ${value}`);
  }
}

function windowMode(value: string): WindowMode {
  switch (value) {
    case "main":
    case "workspaceSelection":
    case "terminal":
    case "notificationPreview":
      return value;
    default:
      throw new Error(`Unknown window mode: ${value}`);
  }
}

function storageOwner(value: string): StorageOwner {
  switch (value) {
    case "workspace":
    case "member":
    case "contact":
    case "chat":
    case "terminal":
      return value;
    default:
      throw new Error(`Unknown storage owner: ${value}`);
  }
}

function storageCategory(value: string): StorageCategory {
  switch (value) {
    case "storageManifest":
    case "workspaceMetadata":
    case "workspaceRegistry":
    case "workspaceFallbacks":
    case "memberProfiles":
    case "contactProfiles":
    case "conversationRecords":
    case "conversationMembers":
    case "messageRecords":
    case "messageMentions":
    case "conversationReadPositions":
    case "privateConversations":
    case "terminalTabs":
      return value;
    default:
      throw new Error(`Unknown storage category: ${value}`);
  }
}

function storageFormat(value: string): StorageFormat {
  switch (value) {
    case "json":
    case "sqlite":
      return value;
    default:
      throw new Error(`Unknown storage format: ${value}`);
  }
}

function storagePathPolicy(value: string): StoragePathPolicy {
  switch (value) {
    case "workspaceLocalRelative":
    case "appDataFile":
    case "appDataWorkspaceFile":
      return value;
    default:
      throw new Error(`Unknown storage path policy: ${value}`);
  }
}

function storagePrivacyClass(value: string): StoragePrivacyClass {
  switch (value) {
    case "localPath":
    case "appState":
    case "workspaceData":
      return value;
    default:
      throw new Error(`Unknown storage privacy class: ${value}`);
  }
}

type MemberJson =
  | (typeof inviteMemberResult.members)[number]
  | typeof inviteMemberResult.member
  | typeof updateMemberStatusResult.member
  | (typeof updateMemberStatusResult.members)[number];

function memberProfile(member: MemberJson): MemberProfile {
  return {
    ...member,
    role: memberRole(member.role),
    status: memberStatus(member.status),
    runtime: {
      ...member.runtime,
      kind: memberRuntimeKind(member.runtime.kind),
    },
  };
}

function invitedMemberType(value: string): InvitedMemberType {
  switch (value) {
    case "assistant":
    case "member":
      return value;
    default:
      throw new Error(`Unknown invited member type: ${value}`);
  }
}

function memberRole(value: string): MemberRole {
  switch (value) {
    case "owner":
    case "admin":
    case "assistant":
    case "member":
      return value;
    default:
      throw new Error(`Unknown member role: ${value}`);
  }
}

type ContactJson =
  | (typeof listContactsResult.contacts)[number]
  | typeof createContactResult.contact
  | typeof updateContactResult.contact
  | (typeof updateContactResult.contacts)[number];

function contactProfile(contact: ContactJson): ContactProfile {
  return {
    ...contact,
    contactKind: contactKind(contact.contactKind),
    inviteSource: "adminContactInvite",
  };
}

function contactKind(value: string): ContactKind {
  switch (value) {
    case "contact":
    case "administrator":
      return value;
    default:
      throw new Error(`Unknown contact kind: ${value}`);
  }
}

type ConversationJson =
  | (typeof listConversationsResult.conversations)[number]
  | typeof createGroupConversationResult.conversation
  | (typeof createGroupConversationResult.conversations)[number]
  | typeof updateConversationSettingsResult.conversation
  | (typeof updateConversationSettingsResult.conversations)[number]
  | typeof clearConversationResult.conversation
  | (typeof clearConversationResult.conversations)[number]
  | (typeof deleteConversationResult.conversations)[number]
  | typeof sendMessageResult.conversation
  | typeof listMessagesResult.conversation
  | typeof updateReadPositionResult.conversation
  | typeof updateGroupConversationMembersResult.conversation
  | (typeof updateGroupConversationMembersResult.conversations)[number]
  | typeof privateConversationResult.conversation;

type ChatMessageJson =
  | typeof sendMessageResult.message
  | (typeof listMessagesResult.messages)[number];

type ReadPositionJson =
  | typeof sendMessageResult.readPosition
  | NonNullable<typeof listMessagesResult.readPosition>
  | typeof updateReadPositionResult.readPosition;

function conversationProfile(conversation: ConversationJson): ConversationProfile {
  return {
    ...conversation,
    kind: conversationKind(conversation.kind),
    participantKind: conversation.participantKind
      ? conversationParticipantKind(conversation.participantKind)
      : null,
  };
}

function chatMessageProfile(message: ChatMessageJson): ChatMessageProfile {
  return {
    ...message,
    status: messageStatus(message.status),
  };
}

function readPositionProfile(readPosition: ReadPositionJson): ConversationReadPositionProfile {
  return readPosition;
}

function conversationKind(value: string): ConversationKind {
  switch (value) {
    case "channel":
    case "group":
    case "private":
      return value;
    default:
      throw new Error(`Unknown conversation kind: ${value}`);
  }
}

function messageStatus(value: string): ChatMessageStatus {
  switch (value) {
    case "sending":
    case "sent":
    case "failed":
      return value;
    default:
      throw new Error(`Unknown message status: ${value}`);
  }
}

function conversationParticipantKind(value: string): ConversationParticipantKind {
  switch (value) {
    case "member":
    case "contact":
      return value;
    default:
      throw new Error(`Unknown conversation participant kind: ${value}`);
  }
}

function memberStatus(value: string): MemberStatus {
  switch (value) {
    case "online":
    case "offline":
    case "working":
    case "doNotDisturb":
      return value;
    default:
      throw new Error(`Unknown member status: ${value}`);
  }
}

function memberRuntimeKind(value: string): MemberRuntimeKind {
  switch (value) {
    case "none":
    case "builtInAiCli":
    case "customCli":
    case "shell":
      return value;
    default:
      throw new Error(`Unknown member runtime kind: ${value}`);
  }
}

function terminalSessionStatus(value: string): TerminalSessionStatus {
  switch (value) {
    case "starting":
    case "running":
    case "exited":
      return value;
    default:
      throw new Error(`Unknown terminal session status: ${value}`);
  }
}

function terminalEnvironmentKind(value: string): TerminalEnvironmentKind {
  switch (value) {
    case "shell":
    case "builtInAiCli":
    case "customCli":
      return value;
    default:
      throw new Error(`Unknown terminal environment kind: ${value}`);
  }
}

function terminalEnvironmentSource(value: string): TerminalEnvironmentSource {
  switch (value) {
    case "system":
    case "memberRuntime":
      return value;
    default:
      throw new Error(`Unknown terminal environment source: ${value}`);
  }
}

function terminalEnvironmentStatus(value: string): TerminalEnvironmentStatus {
  switch (value) {
    case "available":
    case "missing":
    case "invalid":
      return value;
    default:
      throw new Error(`Unknown terminal environment status: ${value}`);
  }
}

type DispatchRequestJson =
  | typeof dispatchChatMessageResult.dispatch
  | NonNullable<typeof dispatchQueueResumeResult.dispatch>;

function dispatchRequestProfile(dispatch: DispatchRequestJson): DispatchRequestProfile {
  return {
    ...dispatch,
    targetResolution: {
      ...dispatch.targetResolution,
      source: dispatchTargetResolutionSource(dispatch.targetResolution.source),
    },
    status: dispatchRequestStatus(dispatch.status),
    terminalSessionId: dispatch.terminalSessionId,
    failure: dispatch.failure,
  };
}

function dispatchRequestStatus(value: string): DispatchRequestStatus {
  switch (value) {
    case "pending":
    case "queued":
    case "skipped":
    case "dispatched":
    case "failed":
      return value;
    default:
      throw new Error(`Unknown dispatch request status: ${value}`);
  }
}

function dispatchTargetResolutionSource(value: string): DispatchTargetResolutionSource {
  switch (value) {
    case "userSelected":
    case "explicitMention":
    case "privateConversation":
    case "conversationDefault":
    case "workspaceDefault":
      return value;
    default:
      throw new Error(`Unknown dispatch target resolution source: ${value}`);
  }
}

function terminalEnvironmentProfile(environment: {
  schemaVersion: number;
  environmentId: string;
  label: string;
  kind: string;
  source: string;
  command: string;
  resolvedPath: string | null;
  memberId: string | null;
  status: string;
  message: string;
  userAction: string;
  details: string | null;
}): TerminalEnvironmentProfile {
  return {
    ...environment,
    kind: terminalEnvironmentKind(environment.kind),
    source: terminalEnvironmentSource(environment.source),
    status: terminalEnvironmentStatus(environment.status),
  };
}

function terminalSessionProfile(session: {
  schemaVersion: number;
  terminalSessionId: string;
  workspaceId: string;
  memberId: string | null;
  title: string;
  status: string;
  cols: number;
  rows: number;
  snapshot: TerminalSessionProfile["snapshot"];
  exitReason: TerminalSessionProfile["exitReason"];
  createdAtMs: number;
  updatedAtMs: number;
}): TerminalSessionProfile {
  return {
    ...session,
    status: terminalSessionStatus(session.status),
  };
}

function terminalStreamKind(value: string): TerminalStreamKind {
  switch (value) {
    case "stdout":
    case "stderr":
    case "system":
      return value;
    default:
      throw new Error(`Unknown terminal stream kind: ${value}`);
  }
}

function terminalTabStatus(value: string): TerminalTabStatus {
  switch (value) {
    case "open":
    case "closed":
      return value;
    default:
      throw new Error(`Unknown terminal tab status: ${value}`);
  }
}

function terminalTabProfile(tab: {
  schemaVersion: number;
  tabId: string;
  workspaceId: string;
  terminalSessionId: string;
  memberId: string | null;
  label: string;
  shell: string;
  status: string;
  isPinned: boolean;
  sortIndex: number;
  createdAtMs: number;
  updatedAtMs: number;
  closedAtMs: number | null;
}): TerminalTabProfile {
  return {
    ...tab,
    status: terminalTabStatus(tab.status),
  };
}

function dataIntegrityStatus(value: string): DataIntegrityStatus {
  switch (value) {
    case "passed":
    case "failed":
    case "skipped":
      return value;
    default:
      throw new Error(`Unknown data integrity status: ${value}`);
  }
}

function dataIntegritySeverity(value: string): DataIntegritySeverity {
  switch (value) {
    case "info":
    case "warning":
    case "error":
      return value;
    default:
      throw new Error(`Unknown data integrity severity: ${value}`);
  }
}
