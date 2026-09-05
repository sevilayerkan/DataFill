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

/** Classic Latin word pool (EN lorem sentences/paragraphs). */
export const LOREM_WORDS_EN = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et",
  "dolore", "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis",
  "nostrud", "exercitation", "ullamco", "laboris", "nisi", "aliquip",
  "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "in",
  "reprehenderit", "voluptate", "velit", "esse", "cillum", "fugiat",
  "nulla", "pariatur", "excepteur", "sint", "occaecat", "cupidatat",
]

/**
 * Turkish placeholder word pool (Türkçe lorem).
 * Everyday Turkish words so TR sentences/paragraphs read like real
 * placeholder copy instead of Latin filler.
 */
export const LOREM_WORDS_TR = [
  "ve", "bir", "bu", "için", "olan", "olarak", "ile", "daha", "çok", "gibi",
  "yapı", "zaman", "insan", "gün", "yeni", "önemli", "güzel", "büyük",
  "küçük", "hızlı", "yavaş", "kolay", "zor", "birlikte", "sonra", "önce",
  "arasında", "üzerinde", "içinde", "dışında", "her", "bazı", "tüm",
  "şey", "kişi", "yer", "durum", "örnek", "sonuç", "çözüm", "proje",
  "ekip", "çalışma", "tasarım", "yazılım", "veri", "test", "kullanıcı",
  "sistem", "sayfa", "metin", "başlık", "içerik",
]

export type LoremLanguage = "en" | "tr"

function capitalize(word: string): string {
  if (word.length === 0) return word
  return word[0].toUpperCase() + word.slice(1)
}

type RandomSource = () => number

function pickWord(pool: readonly string[], rand?: RandomSource): string {
  if (rand) return pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))]
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * One placeholder sentence: 6–14 words, capitalized, ends with `.`.
 * Language-aware: `tr` uses the Turkish word pool.
 */
export function generateLoremSentence(language: LoremLanguage = "en", rand?: RandomSource): string {
  const pool = language === "tr" ? LOREM_WORDS_TR : LOREM_WORDS_EN
  const span = rand ? Math.floor(rand() * 9) : Math.floor(Math.random() * 9)
  const count = 6 + Math.min(8, Math.max(0, span)) // 6–14 words
  const words = Array.from({ length: count }, () => pickWord(pool, rand))
  words[0] = capitalize(words[0])
  return `${words.join(" ")}.`
}

/**
 * One placeholder paragraph: 3–6 sentences joined with spaces.
 * Language-aware (`tr` = Türkçe lorem).
 */
export function generateLoremParagraph(language: LoremLanguage = "en", rand?: RandomSource): string {
  const span = rand ? Math.floor(rand() * 4) : Math.floor(Math.random() * 4)
  const count = 3 + Math.min(3, Math.max(0, span)) // 3–6 sentences
  return Array.from({ length: count }, () => generateLoremSentence(language, rand)).join(" ")
}
