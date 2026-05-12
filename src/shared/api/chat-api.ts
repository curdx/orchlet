import type {
  CreateGroupConversationRequest,
  CreateGroupConversationResult,
  ListConversationsRequest,
  ListConversationsResult,
  StartPrivateConversationRequest,
  StartPrivateConversationResult,
  UpdateGroupConversationMembersRequest,
  UpdateGroupConversationMembersResult,
} from "../../contracts/generated/chat";
import { invokeCommand } from "./client";

export type ChatApi = {
  listConversations: (
    request: ListConversationsRequest,
  ) => Promise<ListConversationsResult>;
  createGroupConversation: (
    request: CreateGroupConversationRequest,
  ) => Promise<CreateGroupConversationResult>;
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
