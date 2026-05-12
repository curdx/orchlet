import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { TerminalOutputEventPayload } from "../../contracts/generated/terminal";
import type { WindowContextSnapshot } from "../../contracts/generated";
import { TerminalPage } from "./TerminalPage";

function snapshot(): WindowContextSnapshot {
  return {
    schemaVersion: 1,
    currentWindow: {
      label: "terminal",
      mode: "terminal",
    },
    activeWorkspace: {
      rootPath: "/tmp/orchlet-demo",
      created: true,
      accessMode: "readWrite",
      fallbackState: null,
      registryAction: "created",
      registryEntry: {
        projectId: "01K00000000000000000000000",
        path: "/tmp/orchlet-demo",
        name: "orchlet-demo",
        firstOpenedAtMs: 1760000000000,
        lastOpenedAtMs: 1760000000000,
      },
      metadata: {
        schemaVersion: 1,
        projectId: "01K00000000000000000000000",
        name: "orchlet-demo",
        createdAtMs: 1760000000000,
        updatedAtMs: 1760000000000,
      },
    },
    preferences: {
      theme: "dark",
      language: "zh-CN",
    },
    updatedAtMs: 1760000000000,
    sourceWindowLabel: null,
  };
}

describe("TerminalPage", () => {
  it("opens the active terminal session and streams output through the renderer", async () => {
    const outputHandlers: Array<(event: TerminalOutputEventPayload) => void> = [];
    const renderer = {
      mount: vi.fn(),
      write: vi.fn(),
      dispose: vi.fn(),
    };
    const api = {
      openTerminal: vi.fn(() =>
        Promise.resolve({
          window: {
            label: "terminal",
            mode: "terminal" as const,
          },
          windowOpened: false,
          sessionCreated: false,
          session: {
            schemaVersion: 1,
            terminalSessionId: "01KTERMINAL00000000000001",
            workspaceId: "01K00000000000000000000000",
            memberId: null,
            title: "orchlet-demo",
            status: "running" as const,
            createdAtMs: 1760000000000,
            updatedAtMs: 1760000000001,
          },
        }),
      ),
      subscribeOutput: vi.fn(async (handler: (event: TerminalOutputEventPayload) => void) => {
        outputHandlers.push(handler);
        return () => undefined;
      }),
    };

    render(
      <TerminalPage
        snapshot={snapshot()}
        api={api}
        createRendererAdapter={() => renderer}
      />,
    );

    expect(await screen.findByText("orchlet-demo")).toBeInTheDocument();
    expect(screen.getByText("运行中")).toBeInTheDocument();
    expect(api.openTerminal).toHaveBeenCalledWith({ attachCurrent: true });

    const outputHandler = outputHandlers[0];

    if (!outputHandler) {
      throw new Error("terminal output handler was not subscribed");
    }

    outputHandler({
      schemaVersion: 1,
      terminalSessionId: "01KTERMINAL00000000000001",
      workspaceId: "01K00000000000000000000000",
      memberId: null,
      seq: 1,
      chunk: "hello\n",
      kind: "stdout",
      emittedAtMs: 1760000000002,
    });

    expect(renderer.write).toHaveBeenCalledWith("hello\n");
  });
});
