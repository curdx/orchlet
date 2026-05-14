import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type {
  ShortcutKeymapProfile,
  ShortcutPreferencesSnapshot,
} from "../../contracts/generated/settings";
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
    snapshot: {
      lastSeq: 0,
      text: "",
      truncated: false,
      updatedAtMs: null,
    },
    exitReason: null,
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

function shortcutPreferencesSnapshot(
  overrides: Partial<ShortcutPreferencesSnapshot> = {},
): ShortcutPreferencesSnapshot {
  const profile = overrides.profile ?? "default";
  const disabledActionIds = overrides.disabledActionIds ?? [];

  return {
    schemaVersion: 1,
    profile,
    shortcutsEnabled: true,
    shortcutHintsEnabled: true,
    disabledActionIds,
    bindings: shortcutBindingsForProfile(profile, disabledActionIds),
    createdAtMs: 1760000070000,
    updatedAtMs: 1760000070000,
    ...overrides,
  };
}

function shortcutBindingsForProfile(
  profile: ShortcutKeymapProfile,
  disabledActionIds: string[] = [],
): ShortcutPreferencesSnapshot["bindings"] {
  const chatSendKeys = profile === "vscode" ? ["Ctrl+Enter", "Meta+Enter"] : ["Enter"];
  const specs = [
    ["chat.send", "发送聊天消息", chatSendKeys, true, null],
    ["chat.newline", "聊天输入换行", ["Shift+Enter"], true, null],
    ["chat.emoji.close", "关闭 Emoji 面板", ["Esc"], true, null],
    ["mention.insert", "插入提及建议", ["Enter", "Tab"], true, null],
    ["conversation.focus", "聚焦会话列表", ["Tab"], true, null],
    ["terminal.find.next", "终端查找下一个", ["Enter"], true, null],
    ["terminal.find.previous", "终端查找上一个", ["Shift+Enter"], true, null],
    ["terminal.find.close", "关闭终端查找", ["Esc"], true, null],
    ["settings.save", "保存设置", ["Enter"], true, null],
    ["notification.viewAll", "通知查看全部", ["Tab", "Enter"], true, null],
    ["notification.ignoreAll", "通知忽略全部", ["Tab", "Enter"], true, null],
    ["notification.openTerminal", "通知打开终端", ["Tab", "Enter"], true, null],
    [
      "app.globalOpenSettings",
      "全局打开设置",
      ["Ctrl+,"],
      false,
      "当前版本尚未注册 OS 全局快捷键。",
    ],
  ] as const;

  return specs.map(([actionId, label, keys, available, unavailableReason]) => ({
    actionId,
    label,
    keys: [...keys],
    enabled: available && !disabledActionIds.includes(actionId),
    available,
    unavailableReason,
  }));
}

function terminalPageHarness(
  initialTabs = [terminalTab()],
  shortcutPreferences = shortcutPreferencesSnapshot(),
) {
  const outputHandlers: Array<(event: TerminalOutputEventPayload) => void> = [];
  const statusHandlers: Array<(event: TerminalStatusEventPayload) => void> = [];
  let currentTabs = initialTabs;
  const inputHandlers: Array<(input: string) => void> = [];
  const createRenderer = () => ({
    mount: vi.fn(),
    write: vi.fn(),
    resize: vi.fn(),
    focus: vi.fn(),
    selectAll: vi.fn(),
    copySelection: vi.fn(() => "selected text"),
    clear: vi.fn(),
    clearSelection: vi.fn(),
    find: vi.fn((query: string) => ({
      query,
      index: query.trim() ? 1 : 0,
      total: query.trim() ? 2 : 0,
      errorMessage: null,
    })),
    dispose: vi.fn(),
  });
  const renderer = createRenderer();
  const renderers = [renderer];
  const sessionForTab = (
    tab: TerminalTabProfile,
    status: TerminalSessionProfile["status"] = "running",
  ) =>
    terminalSession({
      terminalSessionId: tab.terminalSessionId,
      memberId: tab.memberId,
      title: tab.label,
      status,
      snapshot:
        status === "exited"
          ? {
              lastSeq: 3,
              text: "last visible output\n",
              truncated: false,
              updatedAtMs: 1760000000200,
            }
          : {
              lastSeq: 0,
              text: "",
              truncated: false,
              updatedAtMs: null,
            },
      exitReason:
        status === "exited"
          ? {
              code: "closedByUser",
              message: "用户关闭了终端会话。",
              occurredAtMs: 1760000000300,
            }
          : null,
      updatedAtMs: 1760000000100,
    });
  const api = {
    listTabs: vi.fn(() =>
      Promise.resolve({
        tabs: currentTabs,
        activeTabId: currentTabs.find((tab) => tab.status === "open")?.tabId ?? null,
      }),
    ),
    listEnvironments: vi.fn(() =>
      Promise.resolve({
        environments: [
          {
            schemaVersion: 1,
            environmentId: "shell:/bin/zsh",
            label: "zsh",
            kind: "shell" as const,
            source: "system" as const,
            command: "/bin/zsh",
            resolvedPath: "/bin/zsh",
            memberId: null,
            status: "available" as const,
            message: "终端环境可用。",
            userAction: "可以直接启动该终端环境。",
            details: null,
          },
          {
            schemaVersion: 1,
            environmentId: "settings:built-in:codex",
            label: "Codex CLI",
            kind: "builtInAiCli" as const,
            source: "settings" as const,
            command: "/opt/homebrew/bin/codex",
            resolvedPath: "/opt/homebrew/bin/codex",
            memberId: null,
            status: "available" as const,
            message: "配置的终端环境可用。",
            userAction: "可以直接启动该终端环境。",
            details: null,
          },
          {
            schemaVersion: 1,
            environmentId: "settings:custom-cli:local-reviewer",
            label: "Local Reviewer",
            kind: "customCli" as const,
            source: "settings" as const,
            command: "missing-reviewer",
            resolvedPath: null,
            memberId: null,
            status: "missing" as const,
            message: "未在 PATH 中找到配置的终端命令。",
            userAction: "请在设置中更新该 CLI 命令，或安装缺失的可执行文件后重试。",
            details: "executable=missing-reviewer",
          },
          {
            schemaVersion: 1,
            environmentId: "member:01K00000000000000000000031",
            label: "Missing CLI",
            kind: "customCli" as const,
            source: "memberRuntime" as const,
            command: "missing-cli",
            resolvedPath: null,
            memberId: "01K00000000000000000000031",
            status: "missing" as const,
            message: "未在 PATH 中找到配置的终端命令。",
            userAction: "请安装该 CLI，或把成员运行时命令更新为有效命令后重试。",
            details: "executable=missing-cli",
          },
        ],
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
      settingsApi={{
        getShortcutPreferences: () => Promise.resolve({ preferences: shortcutPreferences }),
      }}
      createRendererAdapter={(options) => {
        const rendererIndex = inputHandlers.length;
        inputHandlers.push(options.onInput);
        const paneRenderer = renderers[rendererIndex] ?? createRenderer();
        renderers[rendererIndex] = paneRenderer;
        return paneRenderer;
      }}
    />,
  );

  return {
    api,
    renderer,
    renderers,
    outputHandlers,
    statusHandlers,
    input: (value: string, rendererIndex = 0) => inputHandlers[rendererIndex]?.(value),
  };
}

type HarnessRenderer = ReturnType<typeof terminalPageHarness>["renderer"];

function rendererForPane(renderers: HarnessRenderer[], paneLabel: string) {
  const renderer = renderers.find((candidate) =>
    candidate.mount.mock.calls.some(([element]) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }

      return element.getAttribute("aria-label") === `${paneLabel} 终端输出`;
    }),
  );

  if (!renderer) {
    throw new Error(`renderer for ${paneLabel} was not mounted`);
  }

  return renderer;
}

function mockElementRect(
  element: Element,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
) {
  const domRect = {
    ...rect,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({}),
  } as DOMRect;

  vi.spyOn(element, "getBoundingClientRect").mockReturnValue(domRect);
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

describe("TerminalPage", () => {
  it("shows terminal environment diagnostics with actionable statuses", async () => {
    terminalPageHarness();

    expect(await screen.findByLabelText("终端环境诊断")).toBeInTheDocument();
    expect(screen.getByText("终端环境")).toBeInTheDocument();
    expect(screen.getByText("zsh")).toBeInTheDocument();
    expect(screen.getByText("Codex CLI")).toBeInTheDocument();
    expect(screen.getByText("Local Reviewer")).toBeInTheDocument();
    expect(screen.getByText("Missing CLI")).toBeInTheDocument();
    expect(screen.getAllByText("可用").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("缺失").length).toBeGreaterThanOrEqual(2);
  });

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

    expect((await screen.findAllByText("orchlet-demo")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("运行中").length).toBeGreaterThan(0);
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
      snapshot: {
        lastSeq: 4,
        text: "panic trace\n",
        truncated: false,
        updatedAtMs: 1760000000004,
      },
      exitReason: {
        code: "processExited",
        message: "进程退出。",
        occurredAtMs: 1760000000004,
      },
      emittedAtMs: 1760000000004,
    });

    expect((await screen.findAllByText("已退出")).length).toBeGreaterThan(0);
    expect(screen.getByText("当前状态：已退出")).toBeInTheDocument();
    expect(screen.getByText("退出原因：进程退出。")).toBeInTheDocument();
    expect(screen.getByText("panic trace")).toBeInTheDocument();
  });

  it("forwards xterm input and calculated resize requests through the active tab session", async () => {
    const { api, renderer, input } = terminalPageHarness();

    expect((await screen.findAllByText("orchlet-demo")).length).toBeGreaterThan(0);

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

  it("shows structured launch failure impact and next action", async () => {
    const user = userEvent.setup();
    const { api } = terminalPageHarness();

    await screen.findAllByText("orchlet-demo");
    api.createTab.mockRejectedValueOnce({
      code: "terminal.command.missing",
      message: "终端启动失败：未在 PATH 中找到配置的终端命令。",
      severity: "error",
      recoverable: true,
      userAction: "请安装该 CLI，或把成员运行时命令更新为有效命令后重试。",
      details: "impactScope=current terminal session was not created",
      correlationId: null,
    });

    await user.click(screen.getByRole("button", { name: "新标签" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "终端启动失败：未在 PATH 中找到配置的终端命令。",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "影响范围：当前终端操作未完成，其他终端会话不受影响。",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "下一步：请安装该 CLI，或把成员运行时命令更新为有效命令后重试。",
    );
  });

  it("shows Golutra-style attach, reconnect and fatal overlays inside the pane", async () => {
    const user = userEvent.setup();
    const { api } = terminalPageHarness();

    await screen.findAllByText("orchlet-demo");

    const createDeferredResult = createDeferred<Awaited<ReturnType<typeof api.createTab>>>();
    api.createTab.mockReturnValueOnce(createDeferredResult.promise);
    await user.click(screen.getByRole("button", { name: "新标签" }));
    expect(await screen.findByText("Connecting...")).toBeInTheDocument();
    const createdTab = terminalTab({
      tabId: "01K00000000000000000000082",
      terminalSessionId: "01K00000000000000000000092",
      label: "Build",
      shell: "bash",
      sortIndex: 1,
    });
    createDeferredResult.resolve({
      tab: createdTab,
      session: terminalSession({
        terminalSessionId: createdTab.terminalSessionId,
        title: createdTab.label,
      }),
      tabs: [terminalTab(), createdTab],
    });
    await waitFor(() => {
      expect(screen.queryByText("Connecting...")).not.toBeInTheDocument();
    });

    const reconnectDeferredResult =
      createDeferred<Awaited<ReturnType<typeof api.attachTerminal>>>();
    api.attachTerminal.mockReturnValueOnce(reconnectDeferredResult.promise);
    await user.click(screen.getByRole("button", { name: "Build" }));
    expect(await screen.findByText("Reconnecting...")).toBeInTheDocument();
    reconnectDeferredResult.reject({
      code: "terminal.renderer.crashed",
      message: "终端渲染器崩溃。",
      severity: "error",
      recoverable: true,
      userAction: "请重新打开终端。",
      details: null,
      correlationId: null,
    });

    expect(await screen.findByText("Terminal crashed. Please reopen.")).toBeInTheDocument();
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
    expect((await screen.findAllByText("已退出")).length).toBeGreaterThan(0);
    expect(screen.getByText("退出原因：用户关闭了终端会话。")).toBeInTheDocument();
    expect(screen.getByText("last visible output")).toBeInTheDocument();

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

  it("rehydrates the focused renderer from the attached session snapshot", async () => {
    const user = userEvent.setup();
    const secondTab = terminalTab({
      tabId: "01K00000000000000000000081",
      terminalSessionId: "01K00000000000000000000091",
      label: "Logs",
      shell: "fish",
      sortIndex: 1,
    });
    const { api, renderer } = terminalPageHarness([terminalTab(), secondTab]);

    await screen.findAllByText("orchlet-demo");
    renderer.clear.mockClear();
    renderer.write.mockClear();
    api.attachTerminal.mockResolvedValueOnce({
      session: terminalSession({
        terminalSessionId: "01K00000000000000000000091",
        title: "Logs",
        snapshot: {
          lastSeq: 12,
          text: "restored output\n",
          truncated: false,
          updatedAtMs: 1760000000900,
        },
      }),
    });

    await user.click(screen.getByRole("button", { name: "Logs" }));

    await waitFor(() => {
      expect(renderer.clear).toHaveBeenCalledTimes(1);
    });
    expect(renderer.write).toHaveBeenCalledWith("restored output\n");
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

    await screen.findAllByText("orchlet-demo");
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

  it("shows the Golutra-style terminal tab context menu and routes menu actions", async () => {
    const user = userEvent.setup();
    const secondTab = terminalTab({
      tabId: "01K00000000000000000000081",
      terminalSessionId: "01K00000000000000000000091",
      label: "Logs",
      shell: "fish",
      sortIndex: 1,
    });
    const { api } = terminalPageHarness([terminalTab(), secondTab]);

    await screen.findAllByText("orchlet-demo");
    fireEvent.contextMenu(screen.getByRole("button", { name: "Logs" }), {
      clientX: 140,
      clientY: 48,
    });

    const menu = await screen.findByRole("menu", { name: "终端标签菜单" });
    expect(menu).toHaveTextContent("关闭标签");
    expect(menu).toHaveTextContent("关闭其他标签");
    expect(menu).toHaveTextContent("关闭右侧标签");
    expect(menu).toHaveTextContent("置顶标签");
    expect(menu).toHaveTextContent("左右分屏");

    await user.click(screen.getByRole("menuitem", { name: "置顶标签" }));
    await waitFor(() => {
      expect(api.updateTab).toHaveBeenCalledWith({
        tabId: "01K00000000000000000000081",
        label: null,
        isPinned: true,
        sortIndex: null,
      });
    });

    fireEvent.contextMenu(screen.getByRole("button", { name: "Logs" }), {
      clientX: 140,
      clientY: 48,
    });
    await user.click(await screen.findByRole("menuitem", { name: "左右分屏" }));

    await waitFor(() => {
      expect(screen.getAllByLabelText(/窗格 \d 终端窗格/)).toHaveLength(2);
    });
    await waitFor(() => {
      expect(api.attachTerminal).toHaveBeenLastCalledWith({
        terminalSessionId: "01K00000000000000000000091",
      });
    });
  });

  it("reorders terminal tabs by pointer drag and drops tabs onto panes", async () => {
    const user = userEvent.setup();
    const secondTab = terminalTab({
      tabId: "01K00000000000000000000081",
      terminalSessionId: "01K00000000000000000000091",
      label: "Logs",
      shell: "fish",
      sortIndex: 1,
    });
    const { api } = terminalPageHarness([terminalTab(), secondTab]);

    await screen.findAllByText("orchlet-demo");

    const tabList = screen.getByLabelText("终端标签");
    const tabBar = tabList.parentElement;
    const firstTabButton = tabList.querySelector<HTMLElement>(
      '[data-terminal-tab-id="01K00000000000000000000080"]',
    );
    const logsTabButton = tabList.querySelector<HTMLElement>(
      '[data-terminal-tab-id="01K00000000000000000000081"]',
    );

    if (!tabBar || !firstTabButton || !logsTabButton) {
      throw new Error("terminal tab buttons were not rendered");
    }

    mockElementRect(tabBar, { left: 0, top: 0, width: 640, height: 38 });
    mockElementRect(firstTabButton, { left: 0, top: 0, width: 96, height: 28 });
    mockElementRect(logsTabButton, { left: 104, top: 0, width: 96, height: 28 });

    fireEvent.pointerDown(logsTabButton, {
      button: 0,
      pointerId: 1,
      clientX: 128,
      clientY: 14,
    });
    fireEvent.pointerMove(window, {
      pointerId: 1,
      clientX: 12,
      clientY: 14,
    });
    fireEvent.pointerUp(window, {
      pointerId: 1,
      clientX: 12,
      clientY: 14,
    });

    await waitFor(() => {
      expect(api.updateTab).toHaveBeenCalledWith({
        tabId: "01K00000000000000000000081",
        label: null,
        isPinned: null,
        sortIndex: 0,
      });
    });
    expect(api.updateTab).toHaveBeenCalledWith({
      tabId: "01K00000000000000000000080",
      label: null,
      isPinned: null,
      sortIndex: 1,
    });

    await user.click(screen.getByRole("button", { name: "左右分屏布局" }));
    const paneTwo = await screen.findByLabelText("窗格 2 终端窗格");
    const elementFromPoint = vi.fn(() => paneTwo);
    const originalElementFromPoint = document.elementFromPoint;
    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: elementFromPoint,
    });

    const latestLogsTabButton = screen
      .getByLabelText("终端标签")
      .querySelector<HTMLElement>('[data-terminal-tab-id="01K00000000000000000000081"]');

    if (!latestLogsTabButton) {
      throw new Error("logs tab button was not rendered after reorder");
    }

    mockElementRect(latestLogsTabButton, { left: 0, top: 0, width: 96, height: 28 });
    fireEvent.pointerDown(latestLogsTabButton, {
      button: 0,
      pointerId: 2,
      clientX: 16,
      clientY: 14,
    });
    fireEvent.pointerMove(window, {
      pointerId: 2,
      clientX: 420,
      clientY: 240,
    });
    fireEvent.pointerUp(window, {
      pointerId: 2,
      clientX: 420,
      clientY: 240,
    });

    await waitFor(() => {
      expect(api.attachTerminal).toHaveBeenLastCalledWith({
        terminalSessionId: "01K00000000000000000000091",
      });
    });

    Object.defineProperty(document, "elementFromPoint", {
      configurable: true,
      value: originalElementFromPoint,
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

  it("switches terminal pane layouts while keeping stable pane containers", async () => {
    const user = userEvent.setup();
    terminalPageHarness();

    await screen.findAllByText("orchlet-demo");
    expect(screen.getAllByLabelText(/窗格 \d 终端窗格/)).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "左右分屏布局" }));
    expect(screen.getAllByLabelText(/窗格 \d 终端窗格/)).toHaveLength(2);
    expect(screen.getByText("拖动标签到这里，或新建一个终端。")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "四宫格布局" }));
    expect(screen.getAllByLabelText(/窗格 \d 终端窗格/)).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: "上下分屏布局" }));
    expect(screen.getAllByLabelText(/窗格 \d 终端窗格/)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "单窗格布局" }));
    expect(screen.getAllByLabelText(/窗格 \d 终端窗格/)).toHaveLength(1);
  });

  it("assigns a tab to the focused pane while keeping its backend session for output, input and resize", async () => {
    const user = userEvent.setup();
    const secondTab = terminalTab({
      tabId: "01K00000000000000000000081",
      terminalSessionId: "01K00000000000000000000091",
      label: "Logs",
      shell: "fish",
      sortIndex: 1,
    });
    const { api, renderers, outputHandlers, input } = terminalPageHarness([
      terminalTab(),
      secondTab,
    ]);

    await screen.findAllByText("orchlet-demo");
    await user.click(screen.getByRole("button", { name: "左右分屏布局" }));
    await waitFor(() => {
      expect(renderers.length).toBeGreaterThanOrEqual(2);
    });

    await user.click(screen.getByLabelText("窗格 2 终端窗格"));
    await user.click(screen.getByRole("button", { name: "Logs" }));

    await waitFor(() => {
      expect(api.attachTerminal).toHaveBeenLastCalledWith({
        terminalSessionId: "01K00000000000000000000091",
      });
    });

    const outputHandler = outputHandlers[0];

    if (!outputHandler) {
      throw new Error("terminal output handler was not subscribed");
    }

    const paneOneRenderer = rendererForPane(renderers, "窗格 1");
    const paneTwoRenderer = rendererForPane(renderers, "窗格 2");

    paneOneRenderer.write.mockClear();
    paneTwoRenderer.write.mockClear();
    outputHandler({
      schemaVersion: 1,
      terminalSessionId: "01K00000000000000000000090",
      workspaceId: "01K00000000000000000000000",
      memberId: null,
      seq: 1,
      chunk: "workspace\n",
      kind: "stdout",
      emittedAtMs: 1760000000002,
    });
    outputHandler({
      schemaVersion: 1,
      terminalSessionId: "01K00000000000000000000091",
      workspaceId: "01K00000000000000000000000",
      memberId: null,
      seq: 2,
      chunk: "logs\n",
      kind: "stdout",
      emittedAtMs: 1760000000003,
    });

    expect(paneOneRenderer.write).toHaveBeenCalledWith("workspace\n");
    expect(paneTwoRenderer.write).toHaveBeenCalledWith("logs\n");

    const paneTwoInputIndex = renderers.indexOf(paneTwoRenderer);
    input("tail -f app.log\n", paneTwoInputIndex);

    await waitFor(() => {
      expect(api.sendInput).toHaveBeenCalledWith({
        terminalSessionId: "01K00000000000000000000091",
        input: "tail -f app.log\n",
      });
    });
    await waitFor(() => {
      expect(api.resizeTerminal).toHaveBeenCalledWith({
        terminalSessionId: "01K00000000000000000000091",
        cols: 20,
        rows: 5,
      });
    });
    expect(paneTwoRenderer.resize).toHaveBeenCalledWith(20, 5);
  });

  it("does not route unassigned pane output to the wrong renderer", async () => {
    const user = userEvent.setup();
    const secondTab = terminalTab({
      tabId: "01K00000000000000000000081",
      terminalSessionId: "01K00000000000000000000091",
      label: "Logs",
      shell: "fish",
      sortIndex: 1,
    });
    const { renderers, outputHandlers } = terminalPageHarness([terminalTab(), secondTab]);

    await screen.findAllByText("orchlet-demo");
    await user.click(screen.getByRole("button", { name: "左右分屏布局" }));
    await waitFor(() => {
      expect(renderers.length).toBeGreaterThanOrEqual(2);
    });

    const outputHandler = outputHandlers[0];

    if (!outputHandler) {
      throw new Error("terminal output handler was not subscribed");
    }

    const paneOneRenderer = rendererForPane(renderers, "窗格 1");
    const paneTwoRenderer = rendererForPane(renderers, "窗格 2");

    paneOneRenderer.write.mockClear();
    paneTwoRenderer.write.mockClear();
    outputHandler({
      schemaVersion: 1,
      terminalSessionId: "01K00000000000000000000091",
      workspaceId: "01K00000000000000000000000",
      memberId: null,
      seq: 1,
      chunk: "unassigned\n",
      kind: "stdout",
      emittedAtMs: 1760000000002,
    });

    expect(paneOneRenderer.write).not.toHaveBeenCalled();
    expect(paneTwoRenderer.write).not.toHaveBeenCalled();
  });

  it("creates a terminal tab from an empty pane action", async () => {
    const user = userEvent.setup();
    const { api } = terminalPageHarness();

    await screen.findAllByText("orchlet-demo");
    await user.click(screen.getByRole("button", { name: "左右分屏布局" }));
    await user.click(screen.getByRole("button", { name: "新建终端" }));

    await waitFor(() => {
      expect(api.createTab).toHaveBeenCalledTimes(1);
    });
    expect(screen.getAllByText("Build").length).toBeGreaterThan(0);
  });

  it("runs text operations against the focused pane renderer only", async () => {
    const user = userEvent.setup();
    const secondTab = terminalTab({
      tabId: "01K00000000000000000000081",
      terminalSessionId: "01K00000000000000000000091",
      label: "Logs",
      shell: "fish",
      sortIndex: 1,
    });
    const { renderers } = terminalPageHarness([terminalTab(), secondTab]);

    await screen.findAllByText("orchlet-demo");
    await user.click(screen.getByRole("button", { name: "左右分屏布局" }));
    await waitFor(() => {
      expect(renderers.length).toBeGreaterThanOrEqual(2);
    });
    await user.click(screen.getByLabelText("窗格 2 终端窗格"));
    await user.click(screen.getByRole("button", { name: "Logs" }));

    const paneOneRenderer = rendererForPane(renderers, "窗格 1");
    const paneTwoRenderer = rendererForPane(renderers, "窗格 2");

    await user.click(screen.getByRole("button", { name: "聚焦终端" }));
    await user.click(screen.getByRole("button", { name: "全选终端文本" }));
    await user.click(screen.getByRole("button", { name: "复制选中文本" }));
    await user.click(screen.getByRole("button", { name: "清空终端显示" }));

    expect(paneTwoRenderer.focus).toHaveBeenCalledTimes(1);
    expect(paneTwoRenderer.selectAll).toHaveBeenCalledTimes(1);
    expect(paneTwoRenderer.copySelection).toHaveBeenCalledTimes(1);
    expect(paneTwoRenderer.clear).toHaveBeenCalledTimes(1);
    expect(paneOneRenderer.focus).not.toHaveBeenCalled();
    expect(paneOneRenderer.selectAll).not.toHaveBeenCalled();
    expect(paneOneRenderer.copySelection).not.toHaveBeenCalled();
    expect(paneOneRenderer.clear).not.toHaveBeenCalled();
  });

  it("opens terminal find, navigates with keyboard and updates find options", async () => {
    const user = userEvent.setup();
    const { renderer } = terminalPageHarness();

    await screen.findAllByText("orchlet-demo");
    await user.click(screen.getByRole("button", { name: "打开终端查找" }));

    const findInput = await screen.findByRole("textbox", { name: "查找终端文本" });
    await user.type(findInput, "error");

    await waitFor(() => {
      expect(renderer.find).toHaveBeenLastCalledWith(
        "error",
        {
          caseSensitive: false,
          wholeWord: false,
          regex: false,
        },
        "current",
      );
    });
    expect(screen.getByLabelText("查找结果")).toHaveTextContent("1/2");

    await user.keyboard("{Enter}");
    expect(renderer.find).toHaveBeenLastCalledWith(
      "error",
      {
        caseSensitive: false,
        wholeWord: false,
        regex: false,
      },
      "next",
    );

    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(renderer.find).toHaveBeenLastCalledWith(
      "error",
      {
        caseSensitive: false,
        wholeWord: false,
        regex: false,
      },
      "previous",
    );

    await user.click(screen.getByRole("button", { name: "区分大小写" }));
    await waitFor(() => {
      expect(renderer.find).toHaveBeenLastCalledWith(
        "error",
        {
          caseSensitive: true,
          wholeWord: false,
          regex: false,
        },
        "current",
      );
    });

    await user.click(screen.getByRole("button", { name: "全字匹配" }));
    await waitFor(() => {
      expect(renderer.find).toHaveBeenLastCalledWith(
        "error",
        {
          caseSensitive: true,
          wholeWord: true,
          regex: false,
        },
        "current",
      );
    });

    await user.click(screen.getByRole("button", { name: "正则查找" }));
    await waitFor(() => {
      expect(renderer.find).toHaveBeenLastCalledWith(
        "error",
        {
          caseSensitive: true,
          wholeWord: true,
          regex: true,
        },
        "current",
      );
    });

    await user.keyboard("{Escape}");
    expect(renderer.clearSelection).toHaveBeenCalled();
    expect(screen.queryByRole("textbox", { name: "查找终端文本" })).not.toBeInTheDocument();
  });

  it("respects disabled terminal find shortcut preferences", async () => {
    const user = userEvent.setup();
    const { renderer } = terminalPageHarness(
      [terminalTab()],
      shortcutPreferencesSnapshot({ disabledActionIds: ["terminal.find.next"] }),
    );

    await screen.findAllByText("orchlet-demo");
    await user.click(screen.getByRole("button", { name: "打开终端查找" }));

    const findInput = await screen.findByRole("textbox", { name: "查找终端文本" });
    await user.type(findInput, "error");
    await waitFor(() => {
      expect(renderer.find).toHaveBeenLastCalledWith(
        "error",
        {
          caseSensitive: false,
          wholeWord: false,
          regex: false,
        },
        "current",
      );
    });

    renderer.find.mockClear();
    await user.keyboard("{Enter}");
    expect(renderer.find).not.toHaveBeenCalled();

    await user.keyboard("{Shift>}{Enter}{/Shift}");
    expect(renderer.find).toHaveBeenLastCalledWith(
      "error",
      {
        caseSensitive: false,
        wholeWord: false,
        regex: false,
      },
      "previous",
    );

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox", { name: "查找终端文本" })).not.toBeInTheDocument();
  });
});
