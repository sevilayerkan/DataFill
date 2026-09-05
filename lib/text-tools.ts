import { foldTrLower } from "./tr-fake";

// ---------------------------------------------------------------------------
// Case converters
// ---------------------------------------------------------------------------

export function toUpper(value: string, locale?: string): string {
  return locale ? value.toLocaleUpperCase(locale) : value.toUpperCase();
}

export function toLower(value: string, locale?: string): string {
  return locale ? value.toLocaleLowerCase(locale) : value.toLowerCase();
}

/** Title Case: first letter of each word upper, rest lower (locale-aware). */
export function toTitle(value: string, locale?: string): string {
  return value
    .toLocaleLowerCase(locale)
    .replace(/\p{L}+/gu, (word) => {
      const first = word[0]?.toLocaleUpperCase(locale) ?? "";
      return first + word.slice(1);
    });
}

/** Slugify any free text: ASCII-fold TR, lowercase, non-alphanum -> `-`, trim. */
export function toSlug(value: string): string {
  const folded = foldTrLower(value);
  return folded
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

// ---------------------------------------------------------------------------
// Line helpers
// ---------------------------------------------------------------------------

function splitLines(value: string): string[] {
  if (value === "") return [];
  return value.split(/\r\n|\r|\n/);
}

/** Sort lines lexicographically. `desc` reverses, `caseSensitive` controls localeCompare. */
export function sortLines(
  value: string,
  options: { desc?: boolean; caseSensitive?: boolean } = {},
): string {
  const lines = splitLines(value);
  const sorted = [...lines].sort((a, b) => {
    const cmp = options.caseSensitive
      ? a.localeCompare(b)
      : a.localeCompare(b, undefined, { sensitivity: "base" });
    return options.desc ? -cmp : cmp;
  });
  return sorted.join("\n");
}

/** Remove duplicate lines, preserving first occurrence order. */
export function dedupeLines(value: string, caseSensitive = true): string {
  const lines = splitLines(value);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = caseSensitive ? line : line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out.join("\n");
}

/** Sort then dedupe (canonical "sırala & tekilleştir"). */
export function sortAndDedupeLines(value: string): string {
  return dedupeLines(sortLines(value), true);
}

// ---------------------------------------------------------------------------
// Whitespace
// ---------------------------------------------------------------------------

export interface TrimOptions {
  trimLines?: boolean;
  collapseSpaces?: boolean;
  removeEmptyLines?: boolean;
  trimOverall?: boolean;
}

/**
 * Clean whitespace:
 * - trimOverall: trim the whole string
 * - trimLines: trim each line
 * - collapseSpaces: collapse runs of spaces/tabs inside lines to single space
 * - removeEmptyLines: drop lines that are empty after trimming
 */
export function cleanWhitespace(value: string, options: TrimOptions = {}): string {
  const { trimLines = true, collapseSpaces = true, removeEmptyLines = true, trimOverall = true } = options;
  let lines = splitLines(value);

  if (trimLines) lines = lines.map((l) => l.trim());
  if (collapseSpaces) lines = lines.map((l) => l.replace(/[ \t]{2,}/g, " "));
  if (removeEmptyLines) lines = lines.filter((l) => l.length > 0);

  let out = lines.join("\n");
  if (trimOverall) out = out.trim();
  return out;
}

/** Collapse any whitespace run (including newlines) to single space, then trim. */
export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Base64 (UTF-8 safe)
// ---------------------------------------------------------------------------

function bytesToBinary(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return binary;
}

export function base64Encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return btoa(bytesToBinary(bytes));
}

export function base64Decode(value: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, value: "" };
  // Basic shape check before atob (avoids noisy DOMException for empty/garbage).
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed) || trimmed.length % 4 === 1) {
    return { ok: false, error: "Invalid Base64" };
  }
  try {
    const binary = atob(trimmed);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return { ok: true, value: new TextDecoder().decode(bytes) };
  } catch {
    return { ok: false, error: "Invalid Base64" };
  }
}

// ---------------------------------------------------------------------------
// URL helpers (tools share links)
// ---------------------------------------------------------------------------

export type ToolId = "case" | "lines" | "ws" | "b64" | "diff";
export const TOOL_IDS: readonly ToolId[] = ["case", "lines", "ws", "b64", "diff"] as const;

export function isToolId(value: string): value is ToolId {
  return (TOOL_IDS as readonly string[]).includes(value);
}

export function parseToolsUrlParams(search: string): { tool?: ToolId } {
  const params = new URLSearchParams(search);
  const tool = params.get("tool");
  if (tool && isToolId(tool)) return { tool };
  return {};
}

export function buildToolsUrlParams(tool: ToolId): string {
  const params = new URLSearchParams();
  params.set("tool", tool);
  return `?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Diff (LCS over lines)
// ---------------------------------------------------------------------------

export type DiffLine =
  | { type: "unchanged"; text: string }
  | { type: "added"; text: string }
  | { type: "removed"; text: string };

/**
 * Line diff via LCS (Myers-like via DP). O(n*m) — fast enough for daily
 * "paste two snippets" use (< ~2000 lines). Returns ordered diff rows.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = splitLines(before);
  const b = splitLines(after);
  if (a.length === 0 && b.length === 0) return [];
  if (a.length === 0) return b.map((text) => ({ type: "added" as const, text }));
  if (b.length === 0) return a.map((text) => ({ type: "removed" as const, text }));

  const n = a.length;
  const m = b.length;
  // DP table: (n+1) x (m+1) lengths of LCS suffix? We'll build forward table.
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? 1 + dp[i + 1][j + 1] : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      out.push({ type: "unchanged", text: a[i] });
      i++;
      j++;
    } else if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) {
      out.push({ type: "added", text: b[j] });
      j++;
    } else if (i < n) {
      out.push({ type: "removed", text: a[i] });
      i++;
    }
  }
  return out;
}
