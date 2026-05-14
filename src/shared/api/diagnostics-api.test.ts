import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({
  invokeCommand: vi.fn(),
}));

import { invokeCommand } from "./client";
import { diagnosticsApi } from "./diagnostics-api";

const invokeMock = vi.mocked(invokeCommand);

describe("diagnosticsApi", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    invokeMock.mockResolvedValue({});
  });

  it("uses typed IPC commands for diagnostics run lifecycle and events", async () => {
    await diagnosticsApi.startRun({
      workspaceId: "01K00000000000000000000000",
      reason: "Investigate chat dispatch",
      initiatedBy: "test-harness",
    });
    await diagnosticsApi.completeRun({
      workspaceId: "01K00000000000000000000000",
      runId: "01K00000000000000000000800",
      outcome: "completed",
      summary: "Timeline captured",
    });
    await diagnosticsApi.recordEvent({
      workspaceId: "01K00000000000000000000000",
      runId: null,
      scope: "frontend",
      eventName: "frontend.window.focused",
      severity: "info",
      correlations: {
        workspaceId: "01K00000000000000000000000",
        conversationId: null,
        messageId: null,
        memberId: null,
        terminalSessionId: null,
        terminalTabId: null,
        windowLabel: "main",
        dispatchId: null,
      },
      metadata: [{ key: "surface", value: "main" }],
    });
    await diagnosticsApi.listEvents({
      workspaceId: "01K00000000000000000000000",
      runId: "01K00000000000000000000800",
    });
    await diagnosticsApi.runTerminalConsistency({
      workspaceId: "01K00000000000000000000000",
      runId: null,
      sessions: [
        {
          terminalSessionId: "01K000000000000000000000AA",
          terminalTabId: null,
          status: "running",
          snapshot: {
            lastSeq: 1,
            truncated: false,
            updatedAtMs: 100,
          },
          exitReason: null,
          outputs: [
            {
              seq: 1,
              emittedAtMs: 100,
            },
          ],
        },
      ],
    });
    await diagnosticsApi.runChatConsistency({
      workspaceId: "01K00000000000000000000000",
      runId: null,
    });
    await diagnosticsApi.getOverview({
      workspaceId: "01K00000000000000000000000",
      cursor: null,
      limit: 25,
    });
    await diagnosticsApi.generateExport({
      workspaceId: "01K00000000000000000000000",
      cursor: null,
      maxEvents: 25,
      includeSections: ["runs", "events", "consistencySummaries"],
      additionalContext: [{ key: "note", value: "safe metadata" }],
    });

    expect(invokeMock).toHaveBeenNthCalledWith(1, "diagnostics_run_start", {
      request: {
        workspaceId: "01K00000000000000000000000",
        reason: "Investigate chat dispatch",
        initiatedBy: "test-harness",
      },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(2, "diagnostics_run_complete", {
      request: {
        workspaceId: "01K00000000000000000000000",
        runId: "01K00000000000000000000800",
        outcome: "completed",
        summary: "Timeline captured",
      },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(3, "diagnostics_event_record", {
      request: expect.objectContaining({
        eventName: "frontend.window.focused",
        metadata: [{ key: "surface", value: "main" }],
      }),
    });
    expect(invokeMock).toHaveBeenNthCalledWith(4, "diagnostics_events_list", {
      request: {
        workspaceId: "01K00000000000000000000000",
        runId: "01K00000000000000000000800",
      },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(5, "diagnostics_terminal_consistency_run", {
      request: expect.objectContaining({
        workspaceId: "01K00000000000000000000000",
        sessions: [
          expect.objectContaining({
            terminalSessionId: "01K000000000000000000000AA",
            snapshot: expect.objectContaining({ lastSeq: 1 }),
          }),
        ],
      }),
    });
    expect(invokeMock).toHaveBeenNthCalledWith(6, "diagnostics_chat_consistency_run", {
      request: {
        workspaceId: "01K00000000000000000000000",
        runId: null,
      },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(7, "diagnostics_overview_get", {
      request: {
        workspaceId: "01K00000000000000000000000",
        cursor: null,
        limit: 25,
      },
    });
    expect(invokeMock).toHaveBeenNthCalledWith(8, "diagnostics_export_generate", {
      request: {
        workspaceId: "01K00000000000000000000000",
        cursor: null,
        maxEvents: 25,
        includeSections: ["runs", "events", "consistencySummaries"],
        additionalContext: [{ key: "note", value: "safe metadata" }],
      },
    });
  });
});
