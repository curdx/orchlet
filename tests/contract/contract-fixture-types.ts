import type { AppError } from "../../src/contracts/generated/common";
import type {
  ConversationKind,
  ConversationParticipantKind,
  ConversationProfile,
  StartPrivateConversationRequest,
  StartPrivateConversationResult,
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
} from "../../src/contracts/generated/member";
import type {
  WorkspaceAccessMode,
  WorkspaceRegistryAction,
  OpenWorkspaceRequest,
  OpenWorkspaceResult,
  WorkspaceOpenStatus,
} from "../../src/contracts/generated/workspace";

import dataIntegrityError from "../../fixtures/contracts/data-integrity/data-integrity-validate.error.json";
import dataIntegrityRequest from "../../fixtures/contracts/data-integrity/data-integrity-validate.request.json";
import dataIntegrityResult from "../../fixtures/contracts/data-integrity/data-integrity-validate.result.json";
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
  | typeof listContactsError
  | typeof createContactError
  | typeof updateContactError
  | typeof deleteContactError
  | typeof privateConversationError;

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

function storageOwner(value: string): StorageOwner {
  switch (value) {
    case "workspace":
    case "member":
    case "contact":
    case "chat":
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
    case "privateConversations":
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

function memberProfile(member: (typeof inviteMemberResult.members)[number]): MemberProfile {
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

function conversationProfile(
  conversation: typeof privateConversationResult.conversation,
): ConversationProfile {
  return {
    ...conversation,
    kind: conversationKind(conversation.kind),
    participantKind: conversationParticipantKind(conversation.participantKind),
  };
}

function conversationKind(value: string): ConversationKind {
  switch (value) {
    case "private":
      return value;
    default:
      throw new Error(`Unknown conversation kind: ${value}`);
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
