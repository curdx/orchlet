import type {
  DiagnosticsCorrelationIds,
  DiagnosticsEventScope,
  DiagnosticsEventSeverity,
  DiagnosticsMetadataEntry,
  RecordDiagnosticsEventRequest,
  RecordDiagnosticsEventResult,
} from "../../contracts/generated/diagnostics";
import { diagnosticsApi, type DiagnosticsApi } from "../api/diagnostics-api";

export type DiagnosticsRecorder = {
  record: (event: DiagnosticsFrontendEvent) => Promise<RecordDiagnosticsEventResult>;
};

export type DiagnosticsFrontendEvent = {
  workspaceId: string | null;
  runId?: string | null;
  scope: DiagnosticsEventScope;
  eventName: string;
  severity?: DiagnosticsEventSeverity;
  correlations?: DiagnosticsCorrelationIds;
  metadata?: DiagnosticsMetadataEntry[];
};

export function createDiagnosticsRecorder(
  api: Pick<DiagnosticsApi, "recordEvent"> = diagnosticsApi,
): DiagnosticsRecorder {
  return {
    async record(event) {
      const request = diagnosticsRecordRequest(event);

      if (!request) {
        return {
          recorded: false,
          skippedReason: "diagnostics disabled",
          event: null,
        };
      }

      try {
        return await api.recordEvent(request);
      } catch {
        return {
          recorded: false,
          skippedReason: "diagnostics unavailable",
          event: null,
        };
      }
    },
  };
}

export function diagnosticsRecordRequest(
  event: DiagnosticsFrontendEvent,
): RecordDiagnosticsEventRequest | null {
  if (!event.workspaceId) {
    return null;
  }

  return {
    workspaceId: event.workspaceId,
    runId: event.runId ?? null,
    scope: event.scope,
    eventName: event.eventName,
    severity: event.severity ?? "info",
    correlations: {
      conversationId: null,
      messageId: null,
      memberId: null,
      terminalSessionId: null,
      terminalTabId: null,
      windowLabel: null,
      dispatchId: null,
      ...event.correlations,
      workspaceId: event.workspaceId,
    },
    metadata: event.metadata ?? [],
  };
}
