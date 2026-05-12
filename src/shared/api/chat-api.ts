import type {
  CreateGroupConversationRequest,
  CreateGroupConversationResult,
  ListConversationsRequest,
  ListConversationsResult,
  ListMessagesRequest,
  ListMessagesResult,
  SendMessageRequest,
  SendMessageResult,
  StartPrivateConversationRequest,
  StartPrivateConversationResult,
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
