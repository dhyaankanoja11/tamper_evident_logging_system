import { StorageAdapter, LogEntry } from '@securelog/types';

export class LocalStorageAdapter implements StorageAdapter {
  private key: string;

  constructor(key: string = 'tamper_evident_logs') {
    this.key = key;
  }

  async getLogs(): Promise<LogEntry[]> {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }
    const saved = localStorage.getItem(this.key);
    return saved ? JSON.parse(saved) : [];
  }

  async saveLogs(logs: LogEntry[]): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.key, JSON.stringify(logs));
    }
  }

  async clearLogs(): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.key);
    }
  }
}

export class MockWORMAdapter implements StorageAdapter {
  private memoryStore: LogEntry[] = [];
  
  async getLogs(): Promise<LogEntry[]> {
    return [...this.memoryStore];
  }

  async saveLogs(logs: LogEntry[]): Promise<void> {
    if (logs.length < this.memoryStore.length) {
      throw new Error("WORM Violation: Cannot delete logs from WORM storage.");
    }
    this.memoryStore = [...logs];
  }

  async clearLogs(): Promise<void> {
    throw new Error("WORM Violation: Cannot clear WORM storage.");
  }
}

/**
 * Remote Shipping Adapter (v3.0)
 * Mirrors logs to a remote API for resilience against local data wipes.
 */
export class RemoteShippingAdapter implements StorageAdapter {
    private endpoint: string;
    private fallback: StorageAdapter;

    constructor(endpoint: string, fallback: StorageAdapter) {
        this.endpoint = endpoint;
        this.fallback = fallback;
    }

    async getLogs(): Promise<LogEntry[]> {
        return this.fallback.getLogs();
    }

    async saveLogs(logs: LogEntry[]): Promise<void> {
        // Always save to local fallback first
        await this.fallback.saveLogs(logs);

        // Attempt to ship the latest log to the remote endpoint
        if (logs.length > 0) {
            const latest = logs[logs.length - 1];
            try {
                // Fire and forget (non-blocking) or handle as needed
                fetch(this.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(latest)
                }).catch(err => console.warn("Remote shipping failed", err));
            } catch (e) {
                console.warn("Remote shipping failed", e);
            }
        }
    }

    async clearLogs(): Promise<void> {
        await this.fallback.clearLogs();
    }
}

export async function exportLogs(adapter: StorageAdapter): Promise<string> {
  const logs = await adapter.getLogs();
  return JSON.stringify(logs, null, 2);
}

export async function importLogsSafe(json: string, adapter: StorageAdapter, verifyFn: (logs: LogEntry[]) => Promise<any>): Promise<boolean> {
  try {
    const logs = JSON.parse(json) as LogEntry[];
    const verification = await verifyFn(logs);
    if (!verification.isValid) {
      throw new Error("Import failed: Log chain integrity is compromised.");
    }
    await adapter.saveLogs(logs);
    return true;
  } catch (error) {
    console.error("Failed to import logs safely", error);
    return false;
  }
}
