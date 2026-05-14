import type {
  ClearConversationRequest,
  ClearConversationResult,
  ClearWorkspaceChatDataRequest,
  ClearWorkspaceChatDataResult,
  CreateGroupConversationRequest,
  CreateGroupConversationResult,
  DeleteConversationRequest,
  DeleteConversationResult,
  ListConversationsRequest,
  ListConversationsResult,
  ListMessagesRequest,
  ListMessagesResult,
  RepairWorkspaceChatDataRequest,
  RepairWorkspaceChatDataResult,
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
} from "../../contracts/generated/chat";
import { invokeCommand } from "./client";

export type ChatApi = {
  listConversations: (
    request: ListConversationsRequest,
  ) => Promise<ListConversationsResult>;
  createGroupConversation: (
    request: CreateGroupConversationRequest,
  ) => Promise<CreateGroupConversationResult>;
  updateConversationSettings: (
    request: UpdateConversationSettingsRequest,
  ) => Promise<UpdateConversationSettingsResult>;
  clearConversation: (
    request: ClearConversationRequest,
  ) => Promise<ClearConversationResult>;
  repairWorkspaceData: (
    request: RepairWorkspaceChatDataRequest,
  ) => Promise<RepairWorkspaceChatDataResult>;
  clearWorkspaceData: (
    request: ClearWorkspaceChatDataRequest,
  ) => Promise<ClearWorkspaceChatDataResult>;
  deleteConversation: (
    request: DeleteConversationRequest,
  ) => Promise<DeleteConversationResult>;
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
};

export const chatApi: ChatApi = {
  listConversations(request) {
    return invokeCommand<ListConversationsResult>("chat_conversations_list", {
      request,
    });
  },
  createGroupConversation(request) {
    return invokeCommand<CreateGroupConversationResult>("chat_group_conversation_create", {
      request,
    });
  },
  updateConversationSettings(request) {
    return invokeCommand<UpdateConversationSettingsResult>(
      "chat_conversation_settings_update",
      { request },
    );
  },
  clearConversation(request) {
    return invokeCommand<ClearConversationResult>("chat_conversation_clear", {
      request,
    });
  },
  repairWorkspaceData(request) {
    return invokeCommand<RepairWorkspaceChatDataResult>("chat_data_repair", {
      request,
    });
  },
  clearWorkspaceData(request) {
    return invokeCommand<ClearWorkspaceChatDataResult>("chat_data_clear", {
      request,
    });
  },
  deleteConversation(request) {
    return invokeCommand<DeleteConversationResult>("chat_conversation_delete", {
      request,
    });
  },
  sendMessage(request) {
    return invokeCommand<SendMessageResult>("chat_message_send", {
      request,
    });
  },
  listMessages(request) {
    return invokeCommand<ListMessagesResult>("chat_messages_page", {
      request,
    });
  },
  updateReadPosition(request) {
    return invokeCommand<UpdateReadPositionResult>("chat_read_position_update", {
      request,
    });
  },
  updateGroupConversationMembers(request) {
    return invokeCommand<UpdateGroupConversationMembersResult>(
      "chat_group_conversation_members_update",
      {
        request,
      },
    );
  },
  startPrivateConversation(request) {
    return invokeCommand<StartPrivateConversationResult>("chat_private_conversation_start", {
      request,
    });
  },
};
