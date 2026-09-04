/**
 * Best-effort text copy.
 *
 * Tries the async Clipboard API first (needs a secure context + permission),
 * then falls back to a hidden textarea + `document.execCommand("copy")` for
 * HTTP origins or denied permissions. Never throws: resolves `true` on
 * success, `false` when copying is unavailable so callers can notify.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    const clipboard = (globalThis as unknown as { navigator?: Navigator }).navigator?.clipboard;
    if (clipboard && typeof clipboard.writeText === "function") {
      await clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path.
  }
  return legacyCopy(text);
}

function legacyCopy(text: string): boolean {
  try {
    if (typeof document === "undefined") return false;
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      // Needed for iOS Safari.
      textarea.setSelectionRange(0, textarea.value.length);
    } catch {
      // Selection already covers the value; ignore.
    }
    const succeeded = document.execCommand("copy");
    textarea.remove();
    return succeeded;
  } catch {
    return false;
  }
}
