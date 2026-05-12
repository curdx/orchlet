import type {
  DispatchChatMessageRequest,
  DispatchChatMessageResult,
} from "../../contracts/generated/orchestration";
import { invokeCommand } from "./client";

export type TerminalDispatchApi = {
  dispatchChatMessage: (
    request: DispatchChatMessageRequest,
  ) => Promise<DispatchChatMessageResult>;
};

export const terminalDispatchApi: TerminalDispatchApi = {
  dispatchChatMessage(request) {
    return invokeCommand<DispatchChatMessageResult>(
      "orchestration_dispatch_chat_message",
      { request },
    );
  },
};
