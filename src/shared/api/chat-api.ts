import type {
  StartPrivateConversationRequest,
  StartPrivateConversationResult,
} from "../../contracts/generated/chat";
import { invokeCommand } from "./client";

export type ChatApi = {
  startPrivateConversation: (
    request: StartPrivateConversationRequest,
  ) => Promise<StartPrivateConversationResult>;
};

export const chatApi: ChatApi = {
  startPrivateConversation(request) {
    return invokeCommand<StartPrivateConversationResult>("chat_private_conversation_start", {
      request,
    });
  },
};
