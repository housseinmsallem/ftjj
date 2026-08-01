const BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Encode a BigInt as an uppercase base-36 string padded to exactly `len` chars. */
function bigIntToBase36(num: bigint, len: number): string {
  let result = "";
  while (num > 0n) {
    result = BASE36[Number(num % 36n)] + result;
    num = num / 36n;
  }
  return result.padStart(len, "0").slice(0, len);
}

/**
 * Deterministic FNV-1a hash of a string → 4-byte integer.
 */
function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0; // unsigned 32-bit
}

/**
 * Generate a human-readable display ID from a UUID.
 * Format: "FTJJ-XXXX-XXXX" where X is an uppercase alphanumeric character.
 *
 * We hash the full UUID with FNV-1a, convert to base-36, and format with dashes.
 * Collisions are resolved by trying different hash offsets (attempt 0 → full UUID,
 * attempt 1 → first half, etc.).
 */
export function generateDisplayId(uuid: string, attempt = 0): string {
  const input = attempt === 0 ? uuid : uuid.slice(0, Math.max(16, uuid.length - attempt * 4));
  const hash = fnv1aHash(input);
  // 32-bit hash → up to 7 base-36 chars; pad to 8
  const base36 = hash.toString(36).toUpperCase().padStart(8, "0").slice(0, 8);
  return `FTJJ-${base36.slice(0, 4)}-${base36.slice(4, 8)}`;
}

/**
 * Legacy helper — kept for backward compatibility.
 * @deprecated Use generateDisplayId instead.
 */
export function uuidToDisplayId(uuid: string): string {
  return generateDisplayId(uuid);
}
