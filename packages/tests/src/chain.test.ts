import { describe, it, expect, beforeEach } from 'vitest';
import { createGenesisBlock, createLog, verifyChain } from '@securelog/core';
import { LogEntry } from '@securelog/types';

describe('SecureLog Chain Verification', () => {
  let logs: LogEntry[] = [];

  beforeEach(async () => {
    // Setup webcrypto polyfill for vitest in Node environment
    if (!globalThis.crypto || !globalThis.crypto.subtle) {
      const crypto = require('crypto');
      globalThis.crypto = crypto.webcrypto;
    }
    
    logs = [];
    const genesis = await createGenesisBlock();
    logs.push(genesis);
  });

  it('should verify a valid chain', async () => {
    const log1 = await createLog('System Event', 'Test 1', logs[0]);
    logs.push(log1);
    const log2 = await createLog('Transaction', 'Test 2', logs[1]);
    logs.push(log2);

    const result = await verifyChain(logs);
    expect(result.isValid).toBe(true);
    expect(result.tamperedIndices.length).toBe(0);
  });

  it('should detect a modified payload', async () => {
    const log1 = await createLog('System Event', 'Test 1', logs[0]);
    logs.push(log1);
    
    // Attack: Modify payload
    logs[1] = { ...logs[1], description: 'Tampered' };

    const result = await verifyChain(logs);
    expect(result.isValid).toBe(false);
    expect(result.tamperedIndices).toContain(1);
  });

  it('should detect a deleted node', async () => {
    const log1 = await createLog('System Event', 'Test 1', logs[0]);
    logs.push(log1);
    const log2 = await createLog('Transaction', 'Test 2', logs[1]);
    logs.push(log2);

    // Attack: Delete log 1
    logs.splice(1, 1);

    const result = await verifyChain(logs);
    expect(result.isValid).toBe(false);
    expect(result.tamperedIndices).toContain(1); // The new index 1 (originally 2) has invalid prevHash
  });

  it('should detect a reordered node', async () => {
    const log1 = await createLog('System Event', 'Test 1', logs[0]);
    logs.push(log1);
    const log2 = await createLog('Transaction', 'Test 2', logs[1]);
    logs.push(log2);

    // Attack: Swap 1 and 2
    const temp = logs[1];
    logs[1] = logs[2];
    logs[2] = temp;

    const result = await verifyChain(logs);
    expect(result.isValid).toBe(false);
    expect(result.tamperedIndices).toContain(1);
    expect(result.tamperedIndices).toContain(2);
  });
});