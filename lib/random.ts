/**
 * Shared randomness primitives.
 *
 * Default path is WebCrypto (`getRandomValues` with rejection sampling, so no
 * modulo bias). Every consumer accepts an optional injectable {@link RandomSource}
 * so tests can run deterministically; the injected source uses simple scaling.
 */

/** Injectable randomness: returns a float in [0, 1), like `Math.random`. */
export type RandomSource = () => number;

function globalCrypto(): Crypto | undefined {
  try {
    return (globalThis as unknown as { crypto?: Crypto }).crypto;
  } catch {
    return undefined;
  }
}

/**
 * Uniform integer in [0, bound). Non-positive or non-finite bounds yield 0.
 */
export function randomInt(bound: number, rand?: RandomSource): number {
  const safeBound = Math.floor(bound);
  if (!Number.isFinite(safeBound) || safeBound <= 0) return 0;
  if (rand) return Math.min(safeBound - 1, Math.floor(rand() * safeBound));
  const cryptoObj = globalCrypto();
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const array = new Uint32Array(1);
    // Rejection sampling to avoid modulo bias.
    const limit = Math.floor(0x1_0000_0000 / safeBound) * safeBound;
    let value = 0;
    do {
      cryptoObj.getRandomValues(array);
      value = array[0];
    } while (value >= limit);
    return value % safeBound;
  }
  return Math.floor(Math.random() * safeBound);
}

/**
 * UUID v4. Uses `crypto.randomUUID()` when available (SSR-safe: falls back to
 * crypto-random bytes, then to a timestamp-seeded value when WebCrypto is
 * missing entirely). The last-resort path is not for security use.
 */
export function randomUUID(): string {
  const cryptoObj = globalCrypto();
  if (cryptoObj) {
    try {
      if (typeof cryptoObj.randomUUID === "function") return cryptoObj.randomUUID();
    } catch {
      // Fall through to the manual v4 encoding below.
    }
    if (typeof cryptoObj.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      cryptoObj.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
