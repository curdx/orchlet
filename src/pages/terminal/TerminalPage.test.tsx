import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  TerminalOutputEventPayload,
  TerminalSessionProfile,
  TerminalStatusEventPayload,
} from "../../contracts/generated/terminal";
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

function terminalSession(
  overrides: Partial<TerminalSessionProfile> = {},
): TerminalSessionProfile {
  return {
    schemaVersion: 1,
    terminalSessionId: "01K00000000000000000000090",
    workspaceId: "01K00000000000000000000000",
    memberId: null,
    title: "orchlet-demo",
    status: "running",
    cols: 120,
    rows: 30,
    createdAtMs: 1760000000000,
    updatedAtMs: 1760000000001,
    ...overrides,
  };
}

function terminalPageHarness(session = terminalSession()) {
  const outputHandlers: Array<(event: TerminalOutputEventPayload) => void> = [];
  const statusHandlers: Array<(event: TerminalStatusEventPayload) => void> = [];
  let inputHandler: ((input: string) => void) | null = null;
  const renderer = {
    mount: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const api = {
    attachTerminal: vi.fn(() => Promise.resolve({ session })),
    sendInput: vi.fn((request: { terminalSessionId: string; input: string }) =>
      Promise.resolve({
        session: terminalSession({
          terminalSessionId: request.terminalSessionId,
          updatedAtMs: 1760000000002,
        }),
      }),
    ),
    resizeTerminal: vi.fn((request: { terminalSessionId: string; cols: number; rows: number }) =>
      Promise.resolve({
        session: terminalSession({
          terminalSessionId: request.terminalSessionId,
          cols: request.cols,
          rows: request.rows,
          updatedAtMs: 1760000000003,
        }),
      }),
    ),
    closeTerminal: vi.fn((request: { terminalSessionId: string }) =>
      Promise.resolve({
        session: terminalSession({
          terminalSessionId: request.terminalSessionId,
          status: "exited",
          updatedAtMs: 1760000000004,
        }),
      }),
    ),
    subscribeOutput: vi.fn(async (handler: (event: TerminalOutputEventPayload) => void) => {
      outputHandlers.push(handler);
      return () => undefined;
    }),
    subscribeStatus: vi.fn(async (handler: (event: TerminalStatusEventPayload) => void) => {
      statusHandlers.push(handler);
      return () => undefined;
    }),
  };

  render(
    <TerminalPage
      snapshot={snapshot()}
      api={api}
      createRendererAdapter={(options) => {
        inputHandler = options.onInput;
        return renderer;
      }}
    />,
  );

  return {
    api,
    renderer,
    outputHandlers,
    statusHandlers,
    input: (value: string) => inputHandler?.(value),
  };
}

describe("TerminalPage", () => {
  it("attaches the active terminal session and streams output through the renderer", async () => {
    const { api, renderer, outputHandlers, statusHandlers } = terminalPageHarness();

    expect(await screen.findByText("orchlet-demo")).toBeInTheDocument();
    expect(screen.getByText("运行中")).toBeInTheDocument();
    expect(api.attachTerminal).toHaveBeenCalledWith();
    expect(api.subscribeStatus).toHaveBeenCalledTimes(1);

    const outputHandler = outputHandlers[0];

    if (!outputHandler) {
      throw new Error("terminal output handler was not subscribed");
    }

    outputHandler({
      schemaVersion: 1,
      terminalSessionId: "01K00000000000000000000090",
      workspaceId: "01K00000000000000000000000",
      memberId: null,
      seq: 1,
      chunk: "hello\n",
      kind: "stdout",
      emittedAtMs: 1760000000002,
    });

    expect(renderer.write).toHaveBeenCalledWith("hello\n");

    const statusHandler = statusHandlers[0];

    if (!statusHandler) {
      throw new Error("terminal status handler was not subscribed");
    }

    statusHandler({
      schemaVersion: 1,
      terminalSessionId: "01K00000000000000000000090",
      workspaceId: "01K00000000000000000000000",
      memberId: null,
      title: "orchlet-demo",
      status: "exited",
      cols: 120,
      rows: 30,
      emittedAtMs: 1760000000003,
    });

    expect(await screen.findByText("已退出")).toBeInTheDocument();
    expect(screen.getByText("终端会话已关闭")).toBeInTheDocument();
  });

  it("forwards xterm input and calculated resize requests through the API", async () => {
    const { api, renderer, input } = terminalPageHarness();

    expect(await screen.findByText("orchlet-demo")).toBeInTheDocument();

    input("pwd\n");

    await waitFor(() => {
      expect(api.sendInput).toHaveBeenCalledWith({
        terminalSessionId: "01K00000000000000000000090",
        input: "pwd\n",
      });
    });
    await waitFor(() => {
      expect(api.resizeTerminal).toHaveBeenCalledWith({
        terminalSessionId: "01K00000000000000000000090",
        cols: 20,
        rows: 5,
      });
    });
    expect(renderer.resize).toHaveBeenCalledWith(20, 5);
  });

  it("closes the terminal session through the API and updates visible status", async () => {
    const user = userEvent.setup();
    const { api } = terminalPageHarness();

    await user.click(await screen.findByRole("button", { name: "关闭终端" }));

    await waitFor(() => {
      expect(api.closeTerminal).toHaveBeenCalledWith({
        terminalSessionId: "01K00000000000000000000090",
      });
    });
    expect(await screen.findByText("已退出")).toBeInTheDocument();
  });
});
