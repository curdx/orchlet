import type {
  CompleteDiagnosticsRunRequest,
  CompleteDiagnosticsRunResult,
  DiagnosticsExportRequest,
  DiagnosticsExportResult,
  DiagnosticsOverviewRequest,
  DiagnosticsOverviewResult,
  ListDiagnosticsEventsRequest,
  ListDiagnosticsEventsResult,
  RecordDiagnosticsEventRequest,
  RecordDiagnosticsEventResult,
  RunChatConsistencyDiagnosticsRequest,
  RunChatConsistencyDiagnosticsResult,
  RunTerminalConsistencyDiagnosticsRequest,
  RunTerminalConsistencyDiagnosticsResult,
  StartDiagnosticsRunRequest,
  StartDiagnosticsRunResult,
} from "../../contracts/generated/diagnostics";
import { invokeCommand } from "./client";

export type DiagnosticsApi = {
  startRun: (request: StartDiagnosticsRunRequest) => Promise<StartDiagnosticsRunResult>;
  completeRun: (
    request: CompleteDiagnosticsRunRequest,
  ) => Promise<CompleteDiagnosticsRunResult>;
  recordEvent: (
    request: RecordDiagnosticsEventRequest,
  ) => Promise<RecordDiagnosticsEventResult>;
  listEvents: (
    request: ListDiagnosticsEventsRequest,
  ) => Promise<ListDiagnosticsEventsResult>;
  runTerminalConsistency: (
    request: RunTerminalConsistencyDiagnosticsRequest,
  ) => Promise<RunTerminalConsistencyDiagnosticsResult>;
  runChatConsistency: (
    request: RunChatConsistencyDiagnosticsRequest,
  ) => Promise<RunChatConsistencyDiagnosticsResult>;
  getOverview: (request: DiagnosticsOverviewRequest) => Promise<DiagnosticsOverviewResult>;
  generateExport: (request: DiagnosticsExportRequest) => Promise<DiagnosticsExportResult>;
};

export const diagnosticsApi: DiagnosticsApi = {
  startRun(request) {
    return invokeCommand<StartDiagnosticsRunResult>("diagnostics_run_start", {
      request,
    });
  },
  completeRun(request) {
    return invokeCommand<CompleteDiagnosticsRunResult>("diagnostics_run_complete", {
      request,
    });
  },
  recordEvent(request) {
    return invokeCommand<RecordDiagnosticsEventResult>("diagnostics_event_record", {
      request,
    });
  },
  listEvents(request) {
    return invokeCommand<ListDiagnosticsEventsResult>("diagnostics_events_list", {
      request,
    });
  },
  runTerminalConsistency(request) {
    return invokeCommand<RunTerminalConsistencyDiagnosticsResult>(
      "diagnostics_terminal_consistency_run",
      {
        request,
      },
    );
  },
  runChatConsistency(request) {
    return invokeCommand<RunChatConsistencyDiagnosticsResult>(
      "diagnostics_chat_consistency_run",
      {
        request,
      },
    );
  },
  getOverview(request) {
    return invokeCommand<DiagnosticsOverviewResult>("diagnostics_overview_get", {
      request,
    });
  },
  generateExport(request) {
    return invokeCommand<DiagnosticsExportResult>("diagnostics_export_generate", {
      request,
    });
  },
};
