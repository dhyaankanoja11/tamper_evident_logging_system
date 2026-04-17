import { LogEntry, EventType, VerificationResult, VerificationError } from '@securelog/types';
import { 
    calculateHash, 
    signData, 
    verifySignature, 
    importPublicKey, 
    exportPublicKey 
} from '@securelog/crypto';

export const SYSTEM_ID = 'SECURELOG-01';
export const COMPLIANCE = 'IT Act 2000 Section 65B';

export function getISTString(): string {
  return new Date().toLocaleString('en-IN', { 
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium'
  });
}

/**
 * Enhanced Genesis Block with Digital Signature support
 */
export async function createGenesisBlock(signingKey?: CryptoKey): Promise<LogEntry> {
  const genesisEntry: Omit<LogEntry, 'hash' | 'signature' | 'publicKey'> = {
    id: globalThis.crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    istTimestamp: getISTString(),
    eventType: 'System Event',
    description: 'System Initialization - Genesis Block (Compliant with IT Act 2000, Section 65B)',
    prevHash: '0'.repeat(64),
    metadata: {
      systemId: SYSTEM_ID,
      compliance: COMPLIANCE
    }
  };
  
  const hash = await calculateHash(JSON.stringify(genesisEntry));
  const entry: LogEntry = { ...genesisEntry, hash };

  if (signingKey) {
      entry.signature = await signData(hash, signingKey);
      entry.publicKey = await exportPublicKey(signingKey);
  }

  return entry;
}

/**
 * Enhanced Log Creation with Digital Signature support
 */
export async function createLog(
    eventType: EventType, 
    description: string, 
    previousLog?: LogEntry,
    signingKey?: CryptoKey
): Promise<LogEntry> {
  const prevHash = previousLog ? previousLog.hash : '0'.repeat(64);
  
  const newEntryBase: Omit<LogEntry, 'hash' | 'signature' | 'publicKey'> = {
    id: globalThis.crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    istTimestamp: getISTString(),
    eventType,
    description,
    metadata: {
      systemId: SYSTEM_ID,
      compliance: COMPLIANCE
    },
    prevHash
  };
  
  const hash = await calculateHash(JSON.stringify(newEntryBase));
  const entry: LogEntry = { ...newEntryBase, hash };

  if (signingKey) {
      entry.signature = await signData(hash, signingKey);
      entry.publicKey = await exportPublicKey(signingKey);
  }

  return entry;
}

/**
 * Enhanced Chain Verification including Digital Signatures
 */
export async function verifyChain(logs: LogEntry[], isPartial: boolean = false): Promise<VerificationResult> {
  const tamperedIndices: number[] = [];
  const errors: VerificationError[] = [];
  let isValid = true;

  if (logs.length === 0) {
    return { isValid: true, tamperedIndices: [], errors: [] };
  }

  for (let i = 0; i < logs.length; i++) {
    const current = logs[i];
    const prev = logs[i - 1];
    
    // 1. Linkage Check
    if (i > 0 || (i === 0 && !isPartial)) {
        const expectedPrevHash = i === 0 ? '0'.repeat(64) : prev.hash;
        if (current.prevHash !== expectedPrevHash) {
            isValid = false;
            tamperedIndices.push(i);
            errors.push({
                index: i,
                reason: 'chain_broken',
                expected: expectedPrevHash,
                actual: current.prevHash
            });
            continue;
        }
    }

    // 2. Hash Integrity Check
    const { hash: _hash, signature: _sig, publicKey: _pk, isEncrypted: _enc, ...entryWithoutHash } = current;
    const recalculatedHash = await calculateHash(JSON.stringify(entryWithoutHash));
    
    if (current.hash !== recalculatedHash) {
      isValid = false;
      tamperedIndices.push(i);
      errors.push({
        index: i,
        reason: 'hash_mismatch',
        expected: recalculatedHash,
        actual: current.hash
      });
      continue;
    }

    // 3. Digital Signature Check (New in v3.0)
    if (current.signature && current.publicKey) {
        try {
            const pubKey = await importPublicKey(current.publicKey);
            const isSignatureValid = await verifySignature(current.hash, current.signature, pubKey);
            if (!isSignatureValid) {
                isValid = false;
                tamperedIndices.push(i);
                errors.push({
                    index: i,
                    reason: 'signature_invalid',
                    actual: 'ECDSA Verification Failed'
                });
            }
        } catch (e) {
            isValid = false;
            tamperedIndices.push(i);
            errors.push({
                index: i,
                reason: 'signature_invalid',
                actual: 'Public Key Import Failed'
            });
        }
    }
  }

  return { isValid, tamperedIndices, errors };
}

export async function verifyLatestN(logs: LogEntry[], n: number): Promise<VerificationResult> {
    if (logs.length === 0 || n <= 0) return { isValid: true, tamperedIndices: [], errors: [] };
    
    const windowSize = Math.min(n, logs.length);
    const startIndex = logs.length - windowSize;
    
    const sliceStartIndex = startIndex > 0 ? startIndex - 1 : 0;
    const sliceToVerify = logs.slice(sliceStartIndex);
    
    const result = await verifyChain(sliceToVerify, sliceStartIndex > 0);
    
    return {
        ...result,
        tamperedIndices: result.tamperedIndices.map(i => i + sliceStartIndex),
        errors: result.errors.map(e => ({ ...e, index: e.index + sliceStartIndex }))
    };
}
