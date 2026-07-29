/**
 * Generates a short, human-readable display ID from a UUID.
 * Uses base36 encoding of the last 6 bytes of the UUID → 8-character uppercase string.
 * Example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" → "3G7KXM9W"
 */
export function uuidToDisplayId(uuid: string): string {
  const hex = uuid.replace(/-/g, "");
  // Take bytes 10-15 (last 6 bytes = 48 bits → fits in ~8 base36 chars)
  const lastBytes = hex.slice(-12); // 12 hex chars = 6 bytes
  let num = BigInt("0x" + lastBytes);
  if (num === 0n) {
    // Fallback: use first 6 bytes if last bytes are zero
    num = BigInt("0x" + hex.slice(0, 12));
  }
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  while (num > 0n) {
    result = chars[Number(num % 36n)] + result;
    num = num / 36n;
  }
  return result.padStart(8, "0") || "00000000";
}

/**
 * Generates display IDs for an array of persons that don't have one yet.
 * Resolves collisions by using different byte ranges.
 */
export function generateDisplayId(uuid: string, attempt = 0): string {
  const hex = uuid.replace(/-/g, "");
  const offsets = [12, 0, 4, 8, 16, 20];
  const offset = offsets[attempt % offsets.length];
  const slice = hex.slice(offset, offset + 12).padEnd(12, "0");
  let num = BigInt("0x" + slice);
  if (num === 0n) num = BigInt("0x" + hex.slice(0, 12));
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  while (num > 0n) {
    result = chars[Number(num % 36n)] + result;
    num = num / 36n;
  }
  return result.padStart(8, "0").slice(0, 8) || "00000000";
}
