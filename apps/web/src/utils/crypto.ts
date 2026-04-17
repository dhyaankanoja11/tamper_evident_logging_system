/**
 * Calculates the SHA-256 hash of a given string.
 * Uses the Web Crypto API for cryptographic operations.
 */
export async function calculateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Truncates a hash for display purposes.
 */
export function truncateHash(hash: string, length: number = 12): string {
  if (hash.length <= length) return hash;
  return `${hash.substring(0, length)}...`;
}
