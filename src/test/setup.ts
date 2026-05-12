import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: () => ({
    clearRect: () => undefined,
    fillRect: () => undefined,
    measureText: (text: string) => ({ width: text.length * 8 }),
  }),
});

afterEach(() => {
  cleanup();
});
