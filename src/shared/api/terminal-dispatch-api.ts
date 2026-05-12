import type {
  DispatchChatMessageRequest,
  DispatchChatMessageResult,
  DispatchQueueResumeRequest,
  DispatchQueueResumeResult,
} from "../../contracts/generated/orchestration";
import { invokeCommand } from "./client";

export type TerminalDispatchApi = {
  dispatchChatMessage: (
    request: DispatchChatMessageRequest,
  ) => Promise<DispatchChatMessageResult>;
  resumeMemberDispatchQueue: (
    request: DispatchQueueResumeRequest,
  ) => Promise<DispatchQueueResumeResult>;
};

export const terminalDispatchApi: TerminalDispatchApi = {
  dispatchChatMessage(request) {
    return invokeCommand<DispatchChatMessageResult>(
      "orchestration_dispatch_chat_message",
      { request },
    );
  },

  resumeMemberDispatchQueue(request) {
    return invokeCommand<DispatchQueueResumeResult>(
      "orchestration_resume_member_dispatch_queue",
      { request },
    );
  },
};
