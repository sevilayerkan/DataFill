/**
 * Shared numeric-input sanitizing.
 *
 * Number inputs report their value as a string. Parsing eagerly with
 * `Number(...)` poisons state: `Number("") === 0`, and partial entries like
 * `"-"` become `NaN`. Callers keep the raw draft string in state and commit
 * (clamp + normalize) on blur/submit instead; this parser distinguishes
 * "still editing" (`null`) from a usable number.
 */

/** Usable finite number, or `null` when the field is empty/invalid (keep editing). */
export function parseNumericDraft(raw: string): number | null {
  if (raw.trim() === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}
