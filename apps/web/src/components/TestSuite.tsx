import React, { useState } from 'react';
import { CheckCircle, XCircle, PlayCircle, Loader2 } from 'lucide-react';
import { calculateHash } from '@securelog/crypto';
import { LogEntry } from '@securelog/types';

interface TestResult {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
}

interface TestSuiteProps {
  logs: LogEntry[];
}

export const TestSuite: React.FC<TestSuiteProps> = ({ logs }) => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    
    const tests = [
      { id: 1, name: "Genesis Block Verification" },
      { id: 2, name: "Cryptographic Chain Continuity" },
      { id: 3, name: "Payload Integrity Recalculation" },
      { id: 4, name: "Regulatory Metadata Consistency" },
      { id: 5, name: "IST Timestamp Format Compliance" }
    ];

    setResults(tests.map(t => ({ ...t, status: 'pending' })));

    // Test 1: Genesis Block Verification
    setResults(prev => prev.map(t => t.id === 1 ? { ...t, status: 'running' } : t));
    await new Promise(r => setTimeout(r, 400));
    const genesis = logs[0];
    let t1Passed = false;
    if (genesis) {
      const { hash: _hash, ...entryWithoutHash } = genesis;
      const calcHash = await calculateHash(JSON.stringify(entryWithoutHash));
      t1Passed = calcHash === genesis.hash && genesis.prevHash === '0'.repeat(64);
    }
    setResults(prev => prev.map(t => t.id === 1 ? { 
      ...t, 
      status: t1Passed ? 'passed' : 'failed', 
      message: t1Passed ? 'Genesis hash and null-link verified.' : 'Genesis block corrupted.' 
    } : t));

    // Test 2: Cryptographic Chain Continuity
    setResults(prev => prev.map(t => t.id === 2 ? { ...t, status: 'running' } : t));
    await new Promise(r => setTimeout(r, 400));
    let t2Passed = true;
    for (let i = 1; i < logs.length; i++) {
      if (logs[i].prevHash !== logs[i-1].hash) {
        t2Passed = false;
        break;
      }
    }
    setResults(prev => prev.map(t => t.id === 2 ? { 
      ...t, 
      status: t2Passed ? 'passed' : 'failed', 
      message: t2Passed ? 'All links in the chain are sequentially valid.' : 'Chain breakage detected.' 
    } : t));

    // Test 3: Payload Integrity Recalculation
    setResults(prev => prev.map(t => t.id === 3 ? { ...t, status: 'running' } : t));
    await new Promise(r => setTimeout(r, 400));
    let t3Passed = true;
    const randomIndex = Math.floor(Math.random() * logs.length);
    const target = logs[randomIndex];
    if (target) {
      const { hash: _hash, ...entryWithoutHash } = target;
      const calcHash = await calculateHash(JSON.stringify(entryWithoutHash));
      t3Passed = calcHash === target.hash;
    }
    setResults(prev => prev.map(t => t.id === 3 ? { 
      ...t, 
      status: t3Passed ? 'passed' : 'failed', 
      message: t3Passed ? `Block #${randomIndex + 1} payload integrity verified.` : 'Hash mismatch in payload.' 
    } : t));

    // Test 4: Regulatory Metadata Consistency
    setResults(prev => prev.map(t => t.id === 4 ? { ...t, status: 'running' } : t));
    await new Promise(r => setTimeout(r, 400));
    const t4Passed = logs.every(l => 
      l.metadata.systemId === 'SECURELOG-01' && 
      l.metadata.compliance === 'IT Act 2000 Section 65B'
    );
    setResults(prev => prev.map(t => t.id === 4 ? { 
      ...t, 
      status: t4Passed ? 'passed' : 'failed', 
      message: t4Passed ? 'All entries meet IT Act 2000 metadata standards.' : 'Metadata non-compliance found.' 
    } : t));

    // Test 5: IST Timestamp Format Compliance
    setResults(prev => prev.map(t => t.id === 5 ? { ...t, status: 'running' } : t));
    await new Promise(r => setTimeout(r, 400));
    const istRegex = /^[A-Z][a-z]{2} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2}/;
    const t5Passed = logs.every(l => istRegex.test(l.istTimestamp));
    setResults(prev => prev.map(t => t.id === 5 ? { 
      ...t, 
      status: t5Passed ? 'passed' : 'failed', 
      message: t5Passed ? 'Time stamps follow ISO/IST regulatory formats.' : 'Invalid timestamp format.' 
    } : t));

    setIsRunning(false);
  };

  return (
    <div className="card test-suite">
      <div className="test-header">
        <h3><PlayCircle size={20} /> Integrity Verification Suite</h3>
        <button onClick={runTests} disabled={isRunning || logs.length === 0} className="run-btn">
          {isRunning ? <Loader2 className="spin" size={16} /> : 'Execute Formal Tests'}
        </button>
      </div>
      <div className="test-list">
        {results.map(res => (
          <div key={res.id} className={`test-item ${res.status}`}>
            <div className="test-item-main">
              {res.status === 'passed' && <CheckCircle size={14} className="passed-icon" />}
              {res.status === 'failed' && <XCircle size={14} className="failed-icon" />}
              {res.status === 'running' && <Loader2 size={14} className="spin" />}
              {res.status === 'pending' && <div className="pending-dot" />}
              <span className="test-name">{res.name}</span>
            </div>
            {res.message && <div className="test-message">{res.message}</div>}
          </div>
        ))}
        {results.length === 0 && <p className="hint">Click to run automated integrity checks.</p>}
      </div>
    </div>
  );
};