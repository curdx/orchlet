import { describe, expect, it, vi } from "vitest";

import { XtermRendererAdapter } from "./terminal-renderer";

describe("XtermRendererAdapter", () => {
  it("batches terminal output outside React state", () => {
    const scheduled: Array<() => void> = [];
    const terminal = {
      open: vi.fn(),
      write: vi.fn(),
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
});
