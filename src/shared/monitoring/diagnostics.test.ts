import { describe, expect, it, vi } from "vitest";

import type { RecordDiagnosticsEventResult } from "../../contracts/generated/diagnostics";
import type { DiagnosticsApi } from "../api/diagnostics-api";
import { createDiagnosticsRecorder, diagnosticsRecordRequest } from "./diagnostics";

function skippedResult(reason: string): RecordDiagnosticsEventResult {
  return {
    recorded: false,
    skippedReason: reason,
    event: null,
  };
}

describe("diagnostics recorder", () => {
  it("skips without calling the API when no workspace is available", async () => {
    const api: Pick<DiagnosticsApi, "recordEvent"> = {
      recordEvent: vi.fn(),
    };
    const recorder = createDiagnosticsRecorder(api);

    await expect(
      recorder.record({
        workspaceId: null,
        scope: "frontend",
        eventName: "frontend.window.focused",
      }),
    ).resolves.toEqual(skippedResult("diagnostics disabled"));
    expect(api.recordEvent).not.toHaveBeenCalled();
  });

  it("swallows API failures and reports diagnostics as unavailable", async () => {
    const api: Pick<DiagnosticsApi, "recordEvent"> = {
      recordEvent: vi.fn(async () => {
        throw new Error("ipc unavailable");
      }),
    };
    const recorder = createDiagnosticsRecorder(api);

    await expect(
      recorder.record({
        workspaceId: "01K00000000000000000000000",
        scope: "window",
        eventName: "window.focused",
      }),
    ).resolves.toEqual(skippedResult("diagnostics unavailable"));
  });

  it("builds a structured request with safe correlation defaults", async () => {
    const result: RecordDiagnosticsEventResult = {
      recorded: true,
      skippedReason: null,
      event: null,
    };
    const api: Pick<DiagnosticsApi, "recordEvent"> = {
      recordEvent: vi.fn(async () => result),
    };
    const recorder = createDiagnosticsRecorder(api);

    await expect(
      recorder.record({
        workspaceId: "01K00000000000000000000000",
        runId: "01K00000000000000000000800",
        scope: "frontend",
        eventName: "frontend.window.focused",
        correlations: {
          workspaceId: null,
          conversationId: null,
          messageId: null,
          memberId: null,
          terminalSessionId: null,
          terminalTabId: null,
          windowLabel: "main",
          dispatchId: null,
        },
        metadata: [{ key: "surface", value: "main" }],
      }),
    ).resolves.toEqual(result);

    expect(api.recordEvent).toHaveBeenCalledWith({
      workspaceId: "01K00000000000000000000000",
      runId: "01K00000000000000000000800",
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
  });

  it("returns null request when diagnostics are disabled by workspace context", () => {
    expect(
      diagnosticsRecordRequest({
        workspaceId: "",
        scope: "frontend",
        eventName: "frontend.window.focused",
      }),
    ).toBeNull();
  });
});
