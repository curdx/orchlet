import type { ShortcutPreferencesSnapshot } from "../contracts/generated/settings";

export const SHORTCUT_ACTION = {
  chatSend: "chat.send",
  chatEmojiClose: "chat.emoji.close",
  terminalFindNext: "terminal.find.next",
  terminalFindPrevious: "terminal.find.previous",
  terminalFindClose: "terminal.find.close",
} as const;

type KeyboardLike = {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
};

export function shortcutActionEnabled(
  preferences: ShortcutPreferencesSnapshot,
  actionId: string,
) {
  if (!preferences.shortcutsEnabled) {
    return false;
  }

  const binding = preferences.bindings.find((item) => item.actionId === actionId);

  return Boolean(binding?.available && binding.enabled);
}

export function shortcutEventMatches(
  preferences: ShortcutPreferencesSnapshot,
  actionId: string,
  event: KeyboardLike,
) {
  if (!shortcutActionEnabled(preferences, actionId)) {
    return false;
  }

  const binding = preferences.bindings.find((item) => item.actionId === actionId);

  return Boolean(binding?.keys.some((key) => shortcutKeyMatches(key, event)));
}

function shortcutKeyMatches(shortcut: string, event: KeyboardLike) {
  const parts = shortcut.split("+").map((part) => part.trim().toLowerCase());
  const key = parts[parts.length - 1];
  const requiresShift = parts.includes("shift");
  const requiresCtrl = parts.includes("ctrl");
  const requiresMeta = parts.includes("meta");
  const requiresAlt = parts.includes("alt");

  return (
    normalizedKey(event.key) === normalizedKey(key) &&
    event.shiftKey === requiresShift &&
    event.ctrlKey === requiresCtrl &&
    event.metaKey === requiresMeta &&
    event.altKey === requiresAlt
  );
}

function normalizedKey(key: string) {
  const normalized = key.toLowerCase();

  if (normalized === "escape") {
    return "esc";
  }

  return normalized;
}
