/**
 * Text statistics for the counter tab. Pure functions so the UI derives
 * counts with `useMemo` instead of storing write-only derived state.
 */

export interface TextStats {
  characters: number;
  words: number;
  lines: number;
}

type WordSegmenter = {
  segment(text: string): Iterable<{ segment: string; isWordLike: boolean }>;
};

function getWordSegmenter(): WordSegmenter | undefined {
  try {
    const Segmenter = (Intl as unknown as {
      Segmenter?: new (locale: string, options: { granularity: string }) => WordSegmenter;
    }).Segmenter;
    if (typeof Segmenter === "function") return new Segmenter("en", { granularity: "word" });
  } catch {
    // Environments without Intl.Segmenter fall through to the regex path.
  }
  return undefined;
}

const CJK_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

/** Fallback when `Intl.Segmenter` is unavailable: whitespace split + one word per CJK char. */
function countWordsFallback(text: string): number {
  const cjkCount = text.match(CJK_PATTERN)?.length ?? 0;
  const rest = text.replace(CJK_PATTERN, " ");
  return rest.split(/\s+/u).filter(Boolean).length + cjkCount;
}

/**
 * Word count that handles CJK (no spaces between words) and all Unicode
 * whitespace (including no-break spaces). Prefers `Intl.Segmenter`.
 */
export function countWords(text: string): number {
  const segmenter = getWordSegmenter();
  if (segmenter) {
    let count = 0;
    for (const { isWordLike } of segmenter.segment(text)) {
      if (isWordLike) count += 1;
    }
    return count;
  }
  return countWordsFallback(text);
}

/** Line count recognizing CRLF, CR, LF and Unicode line/paragraph separators. */
export function countLines(text: string): number {
  if (text.length === 0) return 0;
  return text.split(/\r\n|[\r\n\u2028\u2029]/).length;
}

export function getTextStats(text: string): TextStats {
  return {
    // Code points, not UTF-16 units, so astral chars (emoji) count once.
    characters: Array.from(text).length,
    words: countWords(text),
    lines: countLines(text),
  };
}
