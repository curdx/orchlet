import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";

export type TerminalRenderer = {
  buffer?: {
    active: {
      length: number;
      getLine: (
        index: number,
      ) =>
        | {
            translateToString: (
              trimRight?: boolean,
              startColumn?: number,
              endColumn?: number,
            ) => string;
          }
        | undefined;
    };
  };
  clear?: () => void;
  clearSelection?: () => void;
  focus?: () => void;
  getSelection?: () => string;
  hasSelection?: () => boolean;
  open: (element: HTMLElement) => void;
  scrollToLine?: (line: number) => void;
  select?: (column: number, row: number, length: number) => void;
  selectAll?: () => void;
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

export type TerminalFindOptions = {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
};

export type TerminalFindDirection = "current" | "next" | "previous";

export type TerminalFindResult = {
  query: string;
  index: number;
  total: number;
  errorMessage: string | null;
};

type TerminalFindMatch = {
  row: number;
  column: number;
  length: number;
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
  private findState: {
    key: string;
    matches: TerminalFindMatch[];
    index: number;
  } = {
    key: "",
    matches: [],
    index: -1,
  };

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

  focus() {
    this.terminal.focus?.();
  }

  selectAll() {
    this.terminal.selectAll?.();
  }

  copySelection() {
    return this.terminal.getSelection?.() ?? "";
  }

  clearSelection() {
    this.terminal.clearSelection?.();
  }

  clear() {
    this.findState = {
      key: "",
      matches: [],
      index: -1,
    };
    this.terminal.clearSelection?.();
    this.terminal.clear?.();
  }

  find(
    query: string,
    options: TerminalFindOptions,
    direction: TerminalFindDirection = "current",
  ): TerminalFindResult {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      this.findState = {
        key: "",
        matches: [],
        index: -1,
      };
      this.terminal.clearSelection?.();

      return emptyFindResult(query, null);
    }

    let matcher: RegExp;

    try {
      matcher = createFindMatcher(normalizedQuery, options);
    } catch {
      this.findState = {
        key: "",
        matches: [],
        index: -1,
      };
      this.terminal.clearSelection?.();

      return emptyFindResult(query, "正则无效");
    }

    const matches = collectFindMatches(this.terminal, matcher);

    if (matches.length === 0) {
      this.findState = {
        key: findStateKey(normalizedQuery, options),
        matches: [],
        index: -1,
      };
      this.terminal.clearSelection?.();

      return emptyFindResult(query, null);
    }

    const key = findStateKey(normalizedQuery, options);
    const nextIndex =
      this.findState.key === key && this.findState.index >= 0
        ? nextFindIndex(
            Math.min(this.findState.index, matches.length - 1),
            matches.length,
            direction,
          )
        : direction === "previous"
          ? matches.length - 1
          : 0;
    const match = matches[nextIndex];

    this.findState = {
      key,
      matches,
      index: nextIndex,
    };

    if (match) {
      this.terminal.select?.(match.column, match.row, match.length);
      this.terminal.scrollToLine?.(match.row);
    }

    return {
      query,
      index: nextIndex + 1,
      total: matches.length,
      errorMessage: null,
    };
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

function emptyFindResult(query: string, errorMessage: string | null): TerminalFindResult {
  return {
    query,
    index: 0,
    total: 0,
    errorMessage,
  };
}

function findStateKey(query: string, options: TerminalFindOptions) {
  return [
    query,
    options.caseSensitive ? "case" : "nocase",
    options.wholeWord ? "whole" : "partial",
    options.regex ? "regex" : "plain",
  ].join("\u0000");
}

function createFindMatcher(query: string, options: TerminalFindOptions) {
  const source = options.regex ? query : escapeRegExp(query);
  const boundedSource = options.wholeWord ? `\\b(?:${source})\\b` : source;
  const flags = options.caseSensitive ? "g" : "gi";

  return new RegExp(boundedSource, flags);
}

function collectFindMatches(
  terminal: TerminalRenderer,
  matcher: RegExp,
): TerminalFindMatch[] {
  const buffer = terminal.buffer?.active;

  if (!buffer) {
    return [];
  }

  const matches: TerminalFindMatch[] = [];

  for (let row = 0; row < buffer.length; row += 1) {
    const line = buffer.getLine(row);
    const text = line?.translateToString(true) ?? "";

    if (!text) {
      continue;
    }

    matcher.lastIndex = 0;

    let match = matcher.exec(text);

    while (match) {
      if (match[0].length > 0) {
        matches.push({
          row,
          column: match.index,
          length: match[0].length,
        });
      }

      if (match[0].length === 0) {
        matcher.lastIndex += 1;
      }

      match = matcher.exec(text);
    }
  }

  return matches;
}

function nextFindIndex(
  currentIndex: number,
  total: number,
  direction: TerminalFindDirection,
) {
  if (direction === "next") {
    return (currentIndex + 1) % total;
  }

  if (direction === "previous") {
    return (currentIndex - 1 + total) % total;
  }

  return currentIndex;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
