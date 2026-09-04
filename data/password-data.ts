const LETTER = /\p{L}/u
const DIGIT = /\d/

/** Harf + rakam karışık mı? Tek kelimelik ("admin", "welcome") ve sadece-rakam ("123456") şifreleri eler. */
export function isMixedPassword(value: string): boolean {
  return LETTER.test(value) && DIGIT.test(value)
}
