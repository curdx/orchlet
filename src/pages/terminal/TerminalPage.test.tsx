import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  TerminalOutputEventPayload,
  TerminalSessionProfile,
  TerminalStatusEventPayload,
  TerminalTabProfile,
  TerminalTabUpdateRequest,
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

function terminalTab(overrides: Partial<TerminalTabProfile> = {}): TerminalTabProfile {
  return {
    schemaVersion: 1,
    tabId: "01K00000000000000000000080",
    workspaceId: "01K00000000000000000000000",
    terminalSessionId: "01K00000000000000000000090",
    memberId: null,
    label: "orchlet-demo",
    shell: "zsh",
    status: "open",
    isPinned: false,
    sortIndex: 0,
    createdAtMs: 1760000000000,
    updatedAtMs: 1760000000001,
    closedAtMs: null,
    ...overrides,
  };
}

function terminalPageHarness(initialTabs = [terminalTab()]) {
  const outputHandlers: Array<(event: TerminalOutputEventPayload) => void> = [];
  const statusHandlers: Array<(event: TerminalStatusEventPayload) => void> = [];
  let currentTabs = initialTabs;
  let inputHandler: ((input: string) => void) | null = null;
  const renderer = {
    mount: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const sessionForTab = (tab: TerminalTabProfile, status: TerminalSessionProfile["status"] = "running") =>
    terminalSession({
      terminalSessionId: tab.terminalSessionId,
      memberId: tab.memberId,
      title: tab.label,
      status,
      updatedAtMs: 1760000000100,
    });
  const api = {
    listTabs: vi.fn(() =>
      Promise.resolve({
        tabs: currentTabs,
        activeTabId: currentTabs.find((tab) => tab.status === "open")?.tabId ?? null,
      }),
    ),
    createTab: vi.fn(() => {
      const tab = terminalTab({
        tabId: "01K00000000000000000000082",
        terminalSessionId: "01K00000000000000000000092",
        label: "Build",
        shell: "bash",
        sortIndex: currentTabs.length,
        createdAtMs: 1760000000200,
        updatedAtMs: 1760000000200,
      });
      currentTabs = [...currentTabs, tab];

      return Promise.resolve({
        tab,
        session: sessionForTab(tab),
        tabs: currentTabs,
      });
    }),
    closeTab: vi.fn((request: { tabId: string }) => {
      const tab = currentTabs.find((item) => item.tabId === request.tabId) ?? currentTabs[0];
      const closedAtMs = 1760000000300;
      currentTabs = currentTabs.map((item) =>
        item.tabId === request.tabId
          ? {
              ...item,
              status: "closed" as const,
              updatedAtMs: closedAtMs,
              closedAtMs,
            }
          : item,
      );
      const closedTab = currentTabs.find((item) => item.tabId === request.tabId) ?? tab;

      return Promise.resolve({
        tab: closedTab,
        session: sessionForTab(closedTab, "exited"),
        tabs: currentTabs,
      });
    }),
    restoreTab: vi.fn((request: { tabId: string }) => {
      const restoredSessionId = "01K00000000000000000000093";
      currentTabs = currentTabs.map((item) =>
        item.tabId === request.tabId
          ? {
              ...item,
              terminalSessionId: restoredSessionId,
              status: "open" as const,
              updatedAtMs: 1760000000400,
              closedAtMs: null,
            }
          : item,
      );
      const tab = currentTabs.find((item) => item.tabId === request.tabId) ?? currentTabs[0];

      return Promise.resolve({
        tab,
        session: sessionForTab(tab),
        tabs: currentTabs,
      });
    }),
    updateTab: vi.fn((request: TerminalTabUpdateRequest) => {
      currentTabs = currentTabs.map((tab) =>
        tab.tabId === request.tabId
          ? {
              ...tab,
              label: request.label ?? tab.label,
              isPinned: request.isPinned ?? tab.isPinned,
              sortIndex: request.sortIndex ?? tab.sortIndex,
              updatedAtMs: 1760000000500,
            }
          : tab,
      );
      const tab = currentTabs.find((item) => item.tabId === request.tabId) ?? currentTabs[0];

      return Promise.resolve({ tab, tabs: currentTabs });
    }),
    attachTerminal: vi.fn((request: { terminalSessionId?: string | null } = {}) => {
      const tab =
        currentTabs.find((item) => item.terminalSessionId === request.terminalSessionId) ??
        currentTabs.find((item) => item.status === "open") ??
        currentTabs[0];

      return Promise.resolve({ session: sessionForTab(tab) });
    }),
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
  it("lists tabs, attaches the active session and streams only active output", async () => {
    const secondTab = terminalTab({
      tabId: "01K00000000000000000000081",
      terminalSessionId: "01K00000000000000000000091",
      label: "Logs",
      shell: "fish",
      sortIndex: 1,
    });
    const { api, renderer, outputHandlers, statusHandlers } = terminalPageHarness([
      terminalTab(),
      secondTab,
    ]);

    expect(await screen.findByText("orchlet-demo")).toBeInTheDocument();
    expect(screen.getByText("运行中")).toBeInTheDocument();
    expect(api.listTabs).toHaveBeenCalledTimes(1);
    expect(api.attachTerminal).toHaveBeenCalledWith({
      terminalSessionId: "01K00000000000000000000090",
    });
    expect(api.subscribeStatus).toHaveBeenCalledTimes(1);

    const outputHandler = outputHandlers[0];

    if (!outputHandler) {
      throw new Error("terminal output handler was not subscribed");
    }

    outputHandler({
      schemaVersion: 1,
      terminalSessionId: "01K00000000000000000000091",
      workspaceId: "01K00000000000000000000000",
      memberId: null,
      seq: 1,
      chunk: "inactive\n",
      kind: "stdout",
      emittedAtMs: 1760000000002,
    });
    expect(renderer.write).not.toHaveBeenCalled();

    outputHandler({
      schemaVersion: 1,
      terminalSessionId: "01K00000000000000000000090",
      workspaceId: "01K00000000000000000000000",
      memberId: null,
      seq: 2,
      chunk: "hello\n",
      kind: "stdout",
      emittedAtMs: 1760000000003,
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
      emittedAtMs: 1760000000004,
    });

    expect(await screen.findByText("已退出")).toBeInTheDocument();
    expect(screen.getByText("终端会话已关闭")).toBeInTheDocument();
  });

  it("forwards xterm input and calculated resize requests through the active tab session", async () => {
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

  it("creates a new tab and focuses the returned session", async () => {
    const user = userEvent.setup();
    const { api } = terminalPageHarness();

    await user.click(await screen.findByRole("button", { name: "新标签" }));

    await waitFor(() => {
      expect(api.createTab).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.getAllByText("Build").length).toBeGreaterThan(0);
    });
  });

  it("closes and restores the active terminal tab through tab APIs", async () => {
    const user = userEvent.setup();
    const { api } = terminalPageHarness();

    await user.click(await screen.findByRole("button", { name: "关闭当前终端标签" }));

    await waitFor(() => {
      expect(api.closeTab).toHaveBeenCalledWith({
        tabId: "01K00000000000000000000080",
      });
    });
    expect(await screen.findByText("已退出")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /恢复 orchlet-demo/ }));

    await waitFor(() => {
      expect(api.restoreTab).toHaveBeenCalledWith({
        tabId: "01K00000000000000000000080",
      });
    });
  });

  it("switches active tabs without storing inactive output in React state", async () => {
    const user = userEvent.setup();
    const secondTab = terminalTab({
      tabId: "01K00000000000000000000081",
      terminalSessionId: "01K00000000000000000000091",
      label: "Logs",
      shell: "fish",
      sortIndex: 1,
    });
    const { api, renderer, outputHandlers } = terminalPageHarness([
      terminalTab(),
      secondTab,
    ]);

    await user.click(await screen.findByRole("button", { name: "Logs" }));

    await waitFor(() => {
      expect(api.attachTerminal).toHaveBeenLastCalledWith({
        terminalSessionId: "01K00000000000000000000091",
      });
    });

    const outputHandler = outputHandlers[0];

    if (!outputHandler) {
      throw new Error("terminal output handler was not subscribed");
    }

    renderer.write.mockClear();
    outputHandler({
      schemaVersion: 1,
      terminalSessionId: "01K00000000000000000000090",
      workspaceId: "01K00000000000000000000000",
      memberId: null,
      seq: 1,
      chunk: "old\n",
      kind: "stdout",
      emittedAtMs: 1760000000002,
    });
    outputHandler({
      schemaVersion: 1,
      terminalSessionId: "01K00000000000000000000091",
      workspaceId: "01K00000000000000000000000",
      memberId: null,
      seq: 2,
      chunk: "new\n",
      kind: "stdout",
      emittedAtMs: 1760000000003,
    });

    expect(renderer.write).toHaveBeenCalledTimes(1);
    expect(renderer.write).toHaveBeenCalledWith("new\n");
  });

  it("persists pin and move requests through the terminal tab update API", async () => {
    const user = userEvent.setup();
    const secondTab = terminalTab({
      tabId: "01K00000000000000000000081",
      terminalSessionId: "01K00000000000000000000091",
      label: "Logs",
      shell: "fish",
      sortIndex: 1,
    });
    const { api } = terminalPageHarness([terminalTab(), secondTab]);

    await screen.findByText("orchlet-demo");
    await user.click(screen.getByRole("button", { name: "向右移动当前终端标签" }));

    await waitFor(() => {
      expect(api.updateTab).toHaveBeenCalledWith({
        tabId: "01K00000000000000000000080",
        label: null,
        isPinned: null,
        sortIndex: 1,
      });
    });
    expect(api.updateTab).toHaveBeenCalledWith({
      tabId: "01K00000000000000000000081",
      label: null,
      isPinned: null,
      sortIndex: 0,
    });

    await user.click(screen.getByRole("button", { name: "置顶当前终端标签" }));

    await waitFor(() => {
      expect(api.updateTab).toHaveBeenCalledWith({
        tabId: "01K00000000000000000000080",
        label: null,
        isPinned: true,
        sortIndex: null,
      });
    });
  });

  it("filters tab search by shell metadata and focuses the selected result", async () => {
    const user = userEvent.setup();
    const secondTab = terminalTab({
      tabId: "01K00000000000000000000081",
      terminalSessionId: "01K00000000000000000000091",
      label: "Codex reviewer",
      shell: "codex",
      sortIndex: 1,
    });
    const { api } = terminalPageHarness([terminalTab(), secondTab]);

    await user.type(await screen.findByRole("textbox", { name: "搜索终端标签" }), "codex");
    await user.click(screen.getByRole("button", { name: /Codex reviewer.*codex/ }));

    await waitFor(() => {
      expect(api.attachTerminal).toHaveBeenLastCalledWith({
        terminalSessionId: "01K00000000000000000000091",
      });
    });
  });
});
