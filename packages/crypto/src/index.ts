/**
 * Calculates the SHA-256 hash of a given string.
 * Uses the Web Crypto API for cryptographic operations.
 */
export async function calculateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', dataBuffer);
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

// --- Digital Signatures (ECDSA) ---

export async function generateSigningKeyPair(): Promise<CryptoKeyPair> {
  return await globalThis.crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await globalThis.crypto.subtle.exportKey("spki", key);
  return btoa(String.fromCharCode(...new Uint8Array(exported)));
}

export async function importPublicKey(pem: string): Promise<CryptoKey> {
  const binaryDerString = atob(pem);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }
  return await globalThis.crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["verify"]
  );
}

export async function signData(data: string, privateKey: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const signature = await globalThis.crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    privateKey,
    encodedData
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifySignature(data: string, signature: string, publicKey: CryptoKey): Promise<boolean> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  const signatureBinary = new Uint8Array(atob(signature).split('').map(c => c.charCodeAt(0)));
  return await globalThis.crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" },
    },
    publicKey,
    signatureBinary,
    encodedData
  );
}

// --- Encryption (AES-GCM) ---

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return await globalThis.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(data: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const encodedData = encoder.encode(data);
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    encodedData
  );
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

export async function decryptData(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const ciphertextBinary = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
  const ivBinary = new Uint8Array(atob(iv).split('').map(c => c.charCodeAt(0)));
  const decrypted = await globalThis.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBinary,
    },
    key,
    ciphertextBinary
  );
  return new TextDecoder().decode(decrypted);
}
