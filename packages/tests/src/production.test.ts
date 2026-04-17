import { describe, it, expect, beforeEach } from 'vitest';
import { createGenesisBlock, createLog, verifyChain, verifyLatestN } from '@securelog/core';
import { LogEntry, EventType } from '@securelog/types';
import { MockWORMAdapter, exportLogs, importLogsSafe } from '@securelog/storage';
import { calculateHash, truncateHash } from '@securelog/crypto';

describe('SecureLog Comprehensive Production Suite (20+ Tests)', () => {
  let logs: LogEntry[] = [];

  beforeEach(async () => {
    if (!globalThis.crypto || !globalThis.crypto.subtle) {
      const crypto = require('crypto');
      globalThis.crypto = crypto.webcrypto;
    }
    const genesis = await createGenesisBlock();
    logs = [genesis];
  });

  // --- Core Cryptography Tests ---
  it('1. should generate deterministic SHA-256 hashes', async () => {
    const data = "test-data";
    const hash1 = await calculateHash(data);
    const hash2 = await calculateHash(data);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('2. should correctly truncate hashes for UI display', () => {
    const hash = "1234567890abcdef1234567890abcdef";
    expect(truncateHash(hash, 8)).toBe("12345678...");
    expect(truncateHash("abc", 8)).toBe("abc");
  });

  // --- Basic Chain Tests ---
  it('3. should verify a single-node genesis chain', async () => {
    const result = await verifyChain(logs);
    expect(result.isValid).toBe(true);
  });

  it('4. should verify a valid multi-node chain', async () => {
    for (let i = 0; i < 5; i++) {
      logs.push(await createLog('System Event', `Log ${i}`, logs[logs.length - 1]));
    }
    const result = await verifyChain(logs);
    expect(result.isValid).toBe(true);
  });

  // --- Tampering Detection Tests ---
  it('5. should detect tampering at the genesis block', async () => {
    logs.push(await createLog('System Event', 'Log 1', logs[0]));
    logs[0].description = 'Tampered Genesis';
    const result = await verifyChain(logs);
    expect(result.isValid).toBe(false);
    expect(result.tamperedIndices).toContain(0);
  });

  it('6. should detect tampering at the latest log', async () => {
    logs.push(await createLog('System Event', 'Log 1', logs[0]));
    logs[1].description = 'Tampered Latest';
    const result = await verifyChain(logs);
    expect(result.isValid).toBe(false);
    expect(result.tamperedIndices).toContain(1);
  });

  it('7. should detect a broken link (deletion) in the middle', async () => {
    logs.push(await createLog('System Event', 'Log 1', logs[0]));
    logs.push(await createLog('System Event', 'Log 2', logs[1]));
    logs.push(await createLog('System Event', 'Log 3', logs[2]));
    // Delete Log 1
    const tampered = [logs[0], logs[2], logs[3]];
    const result = await verifyChain(tampered);
    expect(result.isValid).toBe(false);
    expect(result.errors[0].reason).toBe('chain_broken');
    expect(result.errors[0].index).toBe(1);
  });

  it('8. should detect reordering (swap) of distant logs', async () => {
    for (let i = 0; i < 5; i++) {
        logs.push(await createLog('System Event', `Log ${i}`, logs[logs.length-1]));
    }
    // Swap index 1 and 4
    const temp = logs[1];
    logs[1] = logs[4];
    logs[4] = temp;
    const result = await verifyChain(logs);
    expect(result.isValid).toBe(false);
    expect(result.tamperedIndices.length).toBeGreaterThan(0);
  });

  it('9. should identify multiple tampering points simultaneously', async () => {
    logs.push(await createLog('System Event', 'Log 1', logs[0]));
    logs.push(await createLog('System Event', 'Log 2', logs[1]));
    logs[1].description = 'Tamper 1';
    logs[2].description = 'Tamper 2';
    const result = await verifyChain(logs);
    expect(result.tamperedIndices).toContain(1);
    expect(result.tamperedIndices).toContain(2);
  });

  // --- Latest-N Verification Tests ---
  it('10. should verify only the latest N logs (N=3)', async () => {
    for (let i = 0; i < 10; i++) {
        logs.push(await createLog('System Event', `Log ${i}`, logs[logs.length-1]));
    }
    const result = await verifyLatestN(logs, 3);
    expect(result.isValid).toBe(true);
  });

  it('11. should detect tampering within the Latest-N window', async () => {
    for (let i = 0; i < 5; i++) {
        logs.push(await createLog('System Event', `Log ${i}`, logs[logs.length-1]));
    }
    logs[4].description = 'Tampered';
    const result = await verifyLatestN(logs, 2);
    expect(result.isValid).toBe(false);
    expect(result.tamperedIndices).toContain(4);
  });

  it('12. should handle N > chain length gracefully in Latest-N', async () => {
    const result = await verifyLatestN(logs, 50);
    expect(result.isValid).toBe(true);
  });

  it('13. should handle N = 0 in Latest-N', async () => {
    const result = await verifyLatestN(logs, 0);
    expect(result.isValid).toBe(true);
  });

  // --- Storage & Adapter Tests ---
  it('14. WORM Storage should reject any log deletion', async () => {
    const worm = new MockWORMAdapter();
    await worm.saveLogs(logs);
    const smallerLogs = logs.slice(0, 0);
    await expect(worm.saveLogs(smallerLogs)).rejects.toThrow('WORM Violation');
  });

  it('15. WORM Storage should reject clear operation', async () => {
    const worm = new MockWORMAdapter();
    await expect(worm.clearLogs()).rejects.toThrow('WORM Violation');
  });

  it('16. WORM Storage should allow valid appends', async () => {
    const worm = new MockWORMAdapter();
    await worm.saveLogs(logs);
    logs.push(await createLog('System Event', 'New Log', logs[0]));
    await expect(worm.saveLogs(logs)).resolves.not.toThrow();
  });

  // --- Import / Export Tests ---
  it('17. should correctly export and re-import a valid chain', async () => {
    const worm = new MockWORMAdapter();
    logs.push(await createLog('System Event', 'Export Test', logs[0]));
    await worm.saveLogs(logs);
    
    const exportedJson = await exportLogs(worm);
    const mockDestStorage = new MockWORMAdapter();
    
    const success = await importLogsSafe(exportedJson, mockDestStorage, verifyChain);
    expect(success).toBe(true);
    const importedLogs = await mockDestStorage.getLogs();
    expect(importedLogs.length).toBe(2);
  });

  it('18. should reject import of a tampered JSON file', async () => {
    const worm = new MockWORMAdapter();
    await worm.saveLogs(logs);
    const exportedJson = await exportLogs(worm);
    
    // Manually tamper the JSON string
    const tamperedJson = exportedJson.replace('Genesis Block', 'Tampered Content');
    
    const mockDestStorage = new MockWORMAdapter();
    const success = await importLogsSafe(tamperedJson, mockDestStorage, verifyChain);
    expect(success).toBe(false);
  });

  // --- Edge Case & Payload Tests ---
  it('19. should detect tampering in metadata fields', async () => {
    logs.push(await createLog('System Event', 'Meta Test', logs[0]));
    logs[1].metadata.systemId = 'COMPROMISED-ID';
    const result = await verifyChain(logs);
    expect(result.isValid).toBe(false);
  });

  it('20. should handle large chains (50+ logs) efficiently', async () => {
    for (let i = 0; i < 50; i++) {
        logs.push(await createLog('System Event', `Bulk Log ${i}`, logs[logs.length-1]));
    }
    const result = await verifyChain(logs);
    expect(result.isValid).toBe(true);
    expect(logs.length).toBe(51); // genesis + 50
  });

});
