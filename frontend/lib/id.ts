/**
 * ID generation helpers.
 *
 * Some mobile browsers (older iOS Safari) don't support `crypto.randomUUID()`.
 * This helper prefers `crypto.randomUUID()` when available and otherwise falls
 * back to a RFC4122-ish UUID v4 implementation using `crypto.getRandomValues`.
 */

function getCrypto(): Crypto | undefined {
  return typeof globalThis !== "undefined" ? (globalThis.crypto as Crypto | undefined) : undefined
}

function toHex(byte: number): string {
  return byte.toString(16).padStart(2, "0")
}

function uuidV4FromRandomValues(bytes: Uint8Array): string {
  // Per RFC 4122 section 4.4
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  return (
    toHex(bytes[0]) +
    toHex(bytes[1]) +
    toHex(bytes[2]) +
    toHex(bytes[3]) +
    "-" +
    toHex(bytes[4]) +
    toHex(bytes[5]) +
    "-" +
    toHex(bytes[6]) +
    toHex(bytes[7]) +
    "-" +
    toHex(bytes[8]) +
    toHex(bytes[9]) +
    "-" +
    toHex(bytes[10]) +
    toHex(bytes[11]) +
    toHex(bytes[12]) +
    toHex(bytes[13]) +
    toHex(bytes[14]) +
    toHex(bytes[15])
  )
}

export function createId(prefix?: string): string {
  const c = getCrypto()

  try {
    if (c?.randomUUID) {
      const id = c.randomUUID()
      return prefix ? `${prefix}-${id}` : id
    }

    if (c?.getRandomValues) {
      const bytes = new Uint8Array(16)
      c.getRandomValues(bytes)
      const id = uuidV4FromRandomValues(bytes)
      return prefix ? `${prefix}-${id}` : id
    }
  } catch {
    // Fall through to the very last-resort fallback.
  }

  const fallback = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return prefix ? `${prefix}-${fallback}` : fallback
}
