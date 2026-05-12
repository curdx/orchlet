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

  it("forwards terminal text operations to xterm", () => {
    const terminal = {
      open: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      focus: vi.fn(),
      selectAll: vi.fn(),
      getSelection: vi.fn(() => "selected text"),
      clearSelection: vi.fn(),
      clear: vi.fn(),
      dispose: vi.fn(),
    };
    const adapter = new XtermRendererAdapter({
      terminal,
      scheduleFrame: vi.fn(),
      cancelFrame: vi.fn(),
    });

    adapter.focus();
    adapter.selectAll();
    const selection = adapter.copySelection();
    adapter.clearSelection();
    adapter.clear();

    expect(terminal.focus).toHaveBeenCalledTimes(1);
    expect(terminal.selectAll).toHaveBeenCalledTimes(1);
    expect(selection).toBe("selected text");
    expect(terminal.clearSelection).toHaveBeenCalledTimes(2);
    expect(terminal.clear).toHaveBeenCalledTimes(1);
  });

  it("finds, selects and navigates terminal buffer matches with options", () => {
    const lines = [
      "Error: failed to build",
      "warning: terror should not match whole word",
      "error: failed again",
    ];
    const terminal = {
      open: vi.fn(),
      write: vi.fn(),
      resize: vi.fn(),
      clearSelection: vi.fn(),
      select: vi.fn(),
      scrollToLine: vi.fn(),
      buffer: {
        active: {
          length: lines.length,
          getLine: (index: number) => ({
            translateToString: () => lines[index] ?? "",
          }),
        },
      },
      dispose: vi.fn(),
    };
    const adapter = new XtermRendererAdapter({
      terminal,
      scheduleFrame: vi.fn(),
      cancelFrame: vi.fn(),
    });

    expect(
      adapter.find("error", {
        caseSensitive: false,
        wholeWord: false,
        regex: false,
      }),
    ).toEqual({
      query: "error",
      index: 1,
      total: 3,
      errorMessage: null,
    });
    expect(terminal.select).toHaveBeenLastCalledWith(0, 0, 5);
    expect(terminal.scrollToLine).toHaveBeenLastCalledWith(0);

    expect(
      adapter.find(
        "error",
        {
          caseSensitive: false,
          wholeWord: false,
          regex: false,
        },
        "next",
      ),
    ).toMatchObject({ index: 2, total: 3 });
    expect(terminal.select).toHaveBeenLastCalledWith(10, 1, 5);

    expect(
      adapter.find("Error", {
        caseSensitive: true,
        wholeWord: false,
        regex: false,
      }),
    ).toMatchObject({ index: 1, total: 1 });

    expect(
      adapter.find("terror", {
        caseSensitive: false,
        wholeWord: true,
        regex: false,
      }),
    ).toMatchObject({ index: 1, total: 1 });

    expect(
      adapter.find("err", {
        caseSensitive: false,
        wholeWord: true,
        regex: false,
      }),
    ).toMatchObject({ index: 0, total: 0, errorMessage: null });

    expect(
      adapter.find("err(or)?", {
        caseSensitive: false,
        wholeWord: true,
        regex: true,
      }),
    ).toMatchObject({ index: 1, total: 2 });

    expect(
      adapter.find(
        "failed",
        {
          caseSensitive: false,
          wholeWord: false,
          regex: false,
        },
        "previous",
      ),
    ).toMatchObject({ index: 2, total: 2 });
    expect(terminal.select).toHaveBeenLastCalledWith(7, 2, 6);

    expect(
      adapter.find("[", {
        caseSensitive: false,
        wholeWord: false,
        regex: true,
      }),
    ).toMatchObject({ index: 0, total: 0, errorMessage: "正则无效" });
    expect(terminal.clearSelection).toHaveBeenCalled();
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
