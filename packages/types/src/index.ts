export type EventType = 
  | 'Login Attempt' 
  | 'File Access' 
  | 'Transaction' 
  | 'System Event'
  | 'Aadhaar Auth'
  | 'e-KYC Update'
  | 'Tax Filing'
  | 'CERT-In Report';

export interface LogMetadata {
  systemId: string;
  compliance: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  istTimestamp: string;
  eventType: EventType;
  description: string;
  prevHash: string;
  hash: string;
  metadata: LogMetadata;
  // Enhancement Fields
  signature?: string;
  publicKey?: string;
  isEncrypted?: boolean;
}

export type AttackType = 'modify' | 'delete' | 'reorder' | 'none';

export interface VerificationError {
  index: number;
  reason: 'hash_mismatch' | 'chain_broken' | 'signature_invalid' | 'decryption_failed';
  expected?: string;
  actual?: string;
}

export interface VerificationResult {
  isValid: boolean;
  tamperedIndices: number[];
  errors: VerificationError[];
  attackType?: AttackType;
}

export interface StorageAdapter {
  getLogs(): Promise<LogEntry[]>;
  saveLogs(logs: LogEntry[]): Promise<void>;
  clearLogs(): Promise<void>;
}
