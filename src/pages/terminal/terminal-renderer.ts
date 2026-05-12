import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

export type TerminalRenderer = {
  open: (element: HTMLElement) => void;
  write: (chunk: string) => void;
  onData?: (handler: (data: string) => void) => TerminalDisposable;
  resize?: (cols: number, rows: number) => void;
  dispose: () => void;
};

export type TerminalDisposable = {
  dispose: () => void;
};

export type TerminalRendererSize = {
  cols: number;
  rows: number;
};

type FrameScheduler = (callback: () => void) => number;
type FrameCanceler = (handle: number) => void;

export class XtermRendererAdapter {
  private readonly terminal: TerminalRenderer;
  private readonly scheduleFrame: FrameScheduler;
  private readonly cancelFrame: FrameCanceler;
  private readonly inputDisposable: TerminalDisposable | null;
  private pendingChunks: string[] = [];
  private frameHandle: number | null = null;

  constructor(options: {
    terminal?: TerminalRenderer;
    onInput?: (input: string) => void;
    scheduleFrame?: FrameScheduler;
    cancelFrame?: FrameCanceler;
  } = {}) {
    this.terminal = options.terminal ?? createXterm();
    this.scheduleFrame = options.scheduleFrame ?? scheduleAnimationFrame;
    this.cancelFrame = options.cancelFrame ?? cancelAnimationFrameSafe;
    this.inputDisposable =
      options.onInput && this.terminal.onData
        ? this.terminal.onData(options.onInput)
        : null;
  }

  mount(element: HTMLElement) {
    this.terminal.open(element);
  }

  write(chunk: string) {
    if (!chunk) {
      return;
    }

    this.pendingChunks.push(chunk);

    if (this.frameHandle !== null) {
      return;
    }

    this.frameHandle = this.scheduleFrame(() => {
      this.frameHandle = null;
      this.flush();
    });
  }

  resize(cols: number, rows: number) {
    this.terminal.resize?.(cols, rows);
  }

  dispose() {
    if (this.frameHandle !== null) {
      this.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }

    this.pendingChunks = [];
    this.inputDisposable?.dispose();
    this.terminal.dispose();
  }

  flush() {
    if (this.pendingChunks.length === 0) {
      return;
    }

    const nextChunk = this.pendingChunks.join("");
    this.pendingChunks = [];
    this.terminal.write(nextChunk);
  }
}

export function measureTerminalSize(element: HTMLElement): TerminalRendererSize {
  return {
    cols: clamp(Math.floor(element.clientWidth / 8), 20, 500),
    rows: clamp(Math.floor(element.clientHeight / 18), 5, 200),
  };
}

function createXterm(): TerminalRenderer {
  return new Terminal({
    convertEol: true,
    cursorBlink: true,
    fontFamily: "SFMono-Regular, Consolas, 'Liberation Mono', monospace",
    fontSize: 13,
    theme: {
      background: "#111712",
      foreground: "#dbe8d8",
      cursor: "#9fd08e",
      selectionBackground: "#2f5038",
    },
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function scheduleAnimationFrame(callback: () => void) {
  if (typeof window === "undefined" || !window.requestAnimationFrame) {
    return setTimeout(callback, 16) as unknown as number;
  }

  return window.requestAnimationFrame(callback);
}

function cancelAnimationFrameSafe(handle: number) {
  if (typeof window === "undefined" || !window.cancelAnimationFrame) {
    clearTimeout(handle);
    return;
  }

  window.cancelAnimationFrame(handle);
}
