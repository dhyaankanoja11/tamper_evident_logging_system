import { useState, useEffect, useCallback, useMemo } from 'react';
import { LogEntry, EventType, VerificationResult } from '@securelog/types';
import { createGenesisBlock, createLog, verifyChain as coreVerifyChain } from '@securelog/core';
import { LocalStorageAdapter, RemoteShippingAdapter, exportLogs, importLogsSafe } from '@securelog/storage';
import { generateSigningKeyPair } from '@securelog/crypto';

export function useLogChain() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [signingKey, setSigningKey] = useState<CryptoKeyPair | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const storage = useMemo(() => {
    const local = new LocalStorageAdapter('tamper_evident_logs');
    // Port 3001 is where our API server runs
    return new RemoteShippingAdapter('http://localhost:3001/logs', local);
  }, []);

  useEffect(() => {
    const init = async () => {
      // Initialize Signing Key for Non-Repudiation (v3.0)
      const keys = await generateSigningKeyPair();
      setSigningKey(keys);

      const savedLogs = await storage.getLogs();
      if (savedLogs.length > 0) {
        setLogs(savedLogs);
      } else {
        const genesis = await createGenesisBlock(keys.privateKey);
        setLogs([genesis]);
      }
    };
    init();
  }, [storage]);

  useEffect(() => {
    if (logs.length > 0) {
      storage.saveLogs(logs);
    }
  }, [logs, storage]);

  const addLog = async (eventType: EventType, description: string) => {
    const prevEntry = logs[logs.length - 1];
    const newEntry = await createLog(
        eventType, 
        description, 
        prevEntry, 
        signingKey?.privateKey
    );
    setLogs(prev => [...prev, newEntry]);
    setVerification(null);
  };

  const generateDataset = async (count: number = 50) => {
    if (!signingKey) return;
    setIsGenerating(true);
    let currentLogs = [...logs];
    const eventTypes: EventType[] = ["Login Attempt", "File Access", "Transaction", "System Event", "Aadhaar Auth", "e-KYC Update", "Tax Filing", "CERT-In Report"];
    
    // Create logs sequentially to maintain the chain
    for (let i = 0; i < count; i++) {
      const prevEntry = currentLogs[currentLogs.length - 1];
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const newEntry = await createLog(
          eventType, 
          `Auto-generated dataset entry: simulate system activity ${Math.random().toString(36).substring(7)}`, 
          prevEntry, 
          signingKey.privateKey
      );
      currentLogs.push(newEntry);
    }
    
    setLogs(currentLogs);
    setVerification(null);
    setIsGenerating(false);
  };

  const verifyChain = useCallback(async () => {
    const result = await coreVerifyChain(logs);
    setVerification(result);
    return result;
  }, [logs]);

  const simulateModification = (index: number) => {
    if (index < 0 || index >= logs.length) return;
    const newLogs = [...logs];
    newLogs[index] = {
      ...newLogs[index],
      description: newLogs[index].description + ' [TAMPERED]'
    };
    setLogs(newLogs);
    setVerification(null);
  };

  const simulateDeletion = (index: number) => {
    if (index < 0 || index >= logs.length) return;
    const newLogs = logs.filter((_, i) => i !== index);
    setLogs(newLogs);
    setVerification(null);
  };

  const resetLogs = async () => {
    await storage.clearLogs();
    if (signingKey) {
        const genesis = await createGenesisBlock(signingKey.privateKey);
        setLogs([genesis]);
    }
    setVerification(null);
  };

  const exportData = async () => {
    const data = await exportLogs(storage);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `securelog_export_${Date.now()}.json`;
    a.click();
  };

  const importData = async (file: File) => {
    try {
      const text = await file.text();
      const success = await importLogsSafe(text, storage, coreVerifyChain);
      if (success) {
        const imported = await storage.getLogs();
        setLogs(imported);
        setVerification(null);
        alert('Logs imported and verified successfully.');
      } else {
        alert('Import failed: Log chain integrity is compromised.');
      }
    } catch (e) {
      alert('Failed to parse file.');
    }
  };

  return {
    logs,
    addLog,
    verifyChain,
    verification,
    simulateModification,
    simulateDeletion,
    resetLogs,
    exportData,
    importData,
    generateDataset,
    isGenerating
  };
}