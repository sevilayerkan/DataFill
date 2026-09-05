export const LOREM_BASE =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "

/** Minimum lorem output length (chars). */
export const LOREM_MIN_LENGTH = 1

/**
 * Maximum lorem output length (chars).
 * Bounds the input control and the generator so a huge/accidental value
 * can't freeze the UI by building a gigantic string.
 */
export const LOREM_MAX_LENGTH = 10000

export type LoremOptions = {
  removeSpaces?: boolean
  removeSpecialChars?: boolean
}

/** Floor + clamp any input to [LOREM_MIN_LENGTH, LOREM_MAX_LENGTH]. NaN -> min. */
export function clampLoremLength(value: number): number {
  if (!Number.isFinite(value)) return LOREM_MIN_LENGTH
  return Math.min(LOREM_MAX_LENGTH, Math.max(LOREM_MIN_LENGTH, Math.floor(value)))
}

function applyOptions(text: string, options: LoremOptions): string {
  let result = text
  if (options.removeSpaces) {
    result = result.replace(/\s/g, "")
  }
  if (options.removeSpecialChars) {
    result = result.replace(/[^a-zA-Z0-9]/g, "")
  }
  return result
}

/**
 * Pure lorem ipsum generator. Always returns exactly `clampLoremLength(length)`
 * chars so both the UI and unit tests share the same max-len behavior.
 */
export function generateLoremText(length: number, options: LoremOptions = {}): string {
  const size = clampLoremLength(length)
  const chunk = applyOptions(LOREM_BASE, options) || LOREM_BASE.replace(/\s/g, "")
  // Single repeat + slice instead of repeated `+=` concat (quadratic copying).
  return chunk.repeat(Math.ceil(size / chunk.length)).slice(0, size)
}
