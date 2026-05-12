import { describe, expect, it, vi } from "vitest";

import { measureTerminalSize, XtermRendererAdapter } from "./terminal-renderer";

describe("XtermRendererAdapter", () => {
  it("batches terminal output outside React state", () => {
    const scheduled: Array<() => void> = [];
    const terminal = {
      open: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    };
    const adapter = new XtermRendererAdapter({
      terminal,
      scheduleFrame: (callback) => {
        scheduled.push(callback);
        return 1;
      },
      cancelFrame: vi.fn(),
    });

    adapter.mount(document.createElement("div"));
    adapter.write("hello ");
    adapter.write("terminal");

    expect(terminal.write).not.toHaveBeenCalled();

    const flush = scheduled[0];

    if (!flush) {
      throw new Error("frame was not scheduled");
    }
    flush();

    expect(terminal.write).toHaveBeenCalledTimes(1);
    expect(terminal.write).toHaveBeenCalledWith("hello terminal");
  });

  it("forwards terminal input through xterm onData", () => {
    const dataHandlers: Array<(data: string) => void> = [];
    const dataDisposable = { dispose: vi.fn() };
    const onInput = vi.fn();
    const terminal = {
      open: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      onData: vi.fn((handler: (data: string) => void) => {
        dataHandlers.push(handler);
        return dataDisposable;
      }),
      dispose: vi.fn(),
    };
    const adapter = new XtermRendererAdapter({
      terminal,
      onInput,
      scheduleFrame: vi.fn(),
      cancelFrame: vi.fn(),
    });
    const dataHandler = dataHandlers[0];

    if (!dataHandler) {
      throw new Error("xterm onData handler was not registered");
    }
    dataHandler("pwd\n");
    adapter.dispose();

    expect(onInput).toHaveBeenCalledWith("pwd\n");
    expect(dataDisposable.dispose).toHaveBeenCalledTimes(1);
    expect(terminal.dispose).toHaveBeenCalledTimes(1);
  });

  it("calculates bounded terminal dimensions from the mounted surface", () => {
    const element = document.createElement("div");
    Object.defineProperty(element, "clientWidth", {
      configurable: true,
      value: 960,
    });
    Object.defineProperty(element, "clientHeight", {
      configurable: true,
      value: 540,
    });

    expect(measureTerminalSize(element)).toEqual({
      cols: 120,
      rows: 30,
    });
  });
});
