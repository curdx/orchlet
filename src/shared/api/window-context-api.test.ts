import { beforeEach, describe, expect, it, vi } from "vitest";

const tauriMocks = vi.hoisted(() => ({
  currentLabel: "main",
  listeners: new Map<string, (event: { payload: unknown }) => void>(),
  unlisten: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(async (event: string, handler: (event: { payload: unknown }) => void) => {
    tauriMocks.listeners.set(event, handler);
    return tauriMocks.unlisten;
  }),
}));

vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({
    label: tauriMocks.currentLabel,
  }),
}));

import type { WindowContextSnapshot } from "../../contracts/generated/workspace";
import { WINDOW_CONTEXT_CHANGED_EVENT, windowContextApi } from "./window-context-api";

function snapshot(overrides: Partial<WindowContextSnapshot> = {}): WindowContextSnapshot {
  return {
    schemaVersion: 1,
    currentWindow: {
      label: "main",
      mode: "main",
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
      theme: "system",
      language: "zh-CN",
    },
    updatedAtMs: 1760000000000,
    sourceWindowLabel: null,
    ...overrides,
  };
}

describe("windowContextApi", () => {
  beforeEach(() => {
    window.__TAURI_INTERNALS__ = {};
    tauriMocks.currentLabel = "main";
    tauriMocks.listeners.clear();
    tauriMocks.unlisten.mockClear();
  });

  it("preserves local window identity when another window broadcasts context", async () => {
    tauriMocks.currentLabel = "terminal";
    const received: WindowContextSnapshot[] = [];

    await windowContextApi.subscribe((nextSnapshot) => {
      received.push(nextSnapshot);
    });

    tauriMocks.listeners.get(WINDOW_CONTEXT_CHANGED_EVENT)?.({
      payload: snapshot({
        currentWindow: {
          label: "main",
          mode: "main",
        },
        sourceWindowLabel: "main",
      }),
    });

    expect(received).toHaveLength(1);
    expect(received[0].currentWindow).toEqual({
      label: "terminal",
      mode: "terminal",
    });
    expect(received[0].sourceWindowLabel).toBe("main");
    expect(received[0].activeWorkspace?.metadata.name).toBe("orchlet-demo");
  });
});
