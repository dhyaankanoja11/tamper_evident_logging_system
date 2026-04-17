import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldCheck, 
  PlusCircle, 
  RefreshCcw, 
  Trash2, 
  Edit3, 
  Activity,
  AlertTriangle,
  FileText,
  Download,
  Upload,
  Info,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Database,
  Search,
  Moon,
  Sun,
  X
} from 'lucide-react';
import { useLogChain } from './hooks/useLogChain';
import { EventType, LogEntry } from '@securelog/types';
import { truncateHash } from '@securelog/crypto';
import { TestSuite } from './components/TestSuite';
import './App.css';

const App: React.FC = () => {
  const { 
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
    isGenerating,
    isLoading
  } = useLogChain();

  const [view, setView] = useState<'dashboard' | 'analysis'>('dashboard');
  const [eventType, setEventType] = useState<EventType>('System Event');
  const [description, setDescription] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  // Basic routing for 404
  const path = window.location.pathname;
  if (path !== '/' && path !== '/index.html') {
    return (
      <div className="not-found">
        <h1>404</h1>
        <p>The page you are looking for does not exist or has been moved to secure cold storage.</p>
        <button onClick={() => window.location.href = '/'} className="secondary-btn" style={{marginTop: '2rem'}}>Return to Dashboard</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container">
         <aside className="sidebar skeletal box" style={{width: 250, border: 'none'}}></aside>
         <main className="main-content">
            <div className="skeletal box" style={{height: 100, marginBottom: '2rem'}}></div>
            <div className="content-grid">
               <div className="input-column skeletal box" style={{height: 400}}></div>
               <div className="chain-column skeletal box" style={{height: 600}}></div>
            </div>
         </main>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(searchQuery.toLowerCase()) || log.hash.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || log.eventType === filterType;
    return matchesSearch && matchesType;
  });

  const pageSize = 10;
  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    addLog(eventType, description);
    setDescription('');
    setSearchQuery('');
    setFilterType('All');
    setCurrentPage(Math.ceil((logs.length + 1) / pageSize));
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    await verifyChain();
    setIsVerifying(false);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await importData(e.target.files[0]);
      e.target.value = '';
    }
  };

  const generateCertificate = () => {
    const content = `
      CERTIFICATE UNDER SECTION 65B OF THE INDIAN EVIDENCE ACT
      ---------------------------------------------------------
      System Name: SECURELOG (v3.0-Production-Ready)
      System ID: SECURELOG-01
      Status: ${verification?.isValid ? 'INTEGRITY VERIFIED' : 'PENDING VERIFICATION'}
      Total Chain Length: ${logs.length} entries
      Generated At: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
      
      I hereby certify that the electronic records contained in this 
      log chain were produced by a computer system which was operating 
      properly during the period of data entry. The cryptographic 
      SHA-256 hashes verify that no unauthorized alterations, 
      deletions, or re-ordering have occurred.

      Final State Hash: ${logs[logs.length-1]?.hash}
    `;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SecureLog_Section65B_${Date.now()}.txt`;
    a.click();
  };

  return (
    <div className="container">
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
           <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                 <h3><FileText size={20} style={{display: 'inline', marginRight: 8}}/> Log Entry Detail</h3>
                 <button className="modal-close" onClick={() => setSelectedLog(null)}><X size={24} /></button>
              </div>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 <p><strong>ID:</strong> {selectedLog.id}</p>
                 <p><strong>Type:</strong> {selectedLog.eventType}</p>
                 <p><strong>Timestamp:</strong> {selectedLog.istTimestamp}</p>
                 <p><strong>Description:</strong> {selectedLog.description}</p>
                 <p><strong>Hash:</strong> <br/><code style={{wordBreak: 'break-all'}}>{selectedLog.hash}</code></p>
                 <p><strong>Prev Hash:</strong> <br/><code style={{wordBreak: 'break-all'}}>{selectedLog.prevHash}</code></p>
                 {selectedLog.signature && (
                   <p><strong>Signature (ECDSA-P256):</strong> <br/><code style={{wordBreak: 'break-all', color: 'var(--valid-color)'}}>{selectedLog.signature}</code></p>
                 )}
                 {selectedLog.publicKey && (
                   <p><strong>Public Key:</strong> <br/><code style={{wordBreak: 'break-all'}}>{selectedLog.publicKey}</code></p>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <ShieldCheck size={32} />
          <h1>SECURELOG</h1>
        </div>
        <nav>
          <button 
            className={view === 'dashboard' ? 'active' : ''} 
            onClick={() => setView('dashboard')}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>
          <button 
            className={view === 'analysis' ? 'active' : ''} 
            onClick={() => setView('analysis')}
          >
            <Info size={20} /> System Analysis
          </button>
          <button onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />} 
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </nav>
        <div className="sidebar-footer">
          <p>Production Ready v3.0</p>
          <p>Cybersecurity Assessment</p>
        </div>
      </aside>

      <main className="main-content">
        {view === 'dashboard' ? (
          <div className="dashboard-layout">
            <header className="page-header">
              <h2>System Dashboard</h2>
              <div className="header-actions">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  accept=".json"
                  onChange={handleFileChange}
                />
                <button className="secondary-btn" onClick={handleImportClick} title="Import Logs from JSON">
                  <Upload size={18} /> Import
                </button>
                <button 
                  className="secondary-btn" 
                  onClick={() => generateDataset(50)} 
                  disabled={isGenerating}
                  title="Generate a dataset of 50 random logs"
                >
                  {isGenerating ? <RefreshCcw className="spin" size={18} /> : <Database size={18} />}
                  Generate Dataset
                </button>
                <button className="secondary-btn" onClick={exportData} title="Export Logs to JSON">
                  <Download size={18} /> Export
                </button>
                <button 
                  className={`verify-btn ${verification?.isValid === false ? 'invalid' : verification?.isValid === true ? 'valid' : ''}`}
                  onClick={handleVerify}
                  disabled={isVerifying}
                >
                  {isVerifying ? <RefreshCcw className="spin" size={18} /> : <ShieldCheck size={18} />}
                  {verification?.isValid === true ? 'CHAIN VERIFIED' : verification?.isValid === false ? 'INTEGRITY BREAK' : 'VERIFY CHAIN'}
                </button>
                <button className="reset-btn" onClick={resetLogs} title="Factory Reset Logs">
                  <Trash2 size={18} />
                </button>
              </div>
            </header>
            
            {verification?.isValid === false && (
              <div className="verification-summary-card error-card">
                <AlertTriangle size={24} />
                <div className="summary-details">
                  <h3>Tamper Detected!</h3>
                  <p>Chain integrity broken at indices: {verification.tamperedIndices.join(', ')}.</p>
                  <ul>
                    {verification.errors.map((err, i) => (
                      <li key={i}>
                        Index {err.index}: {err.reason === 'chain_broken' ? 'Broken Linkage (Deleted/Reordered)' : 'Content Hash Mismatch (Modified)'}
                        <br/>
                        <small>Expected: {truncateHash(err.expected || '', 12)} | Actual: {truncateHash(err.actual || '', 12)}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {verification?.isValid === true && (
              <div className="verification-summary-card success-card">
                <ShieldCheck size={24} />
                <div className="summary-details">
                  <h3>Integrity Verified</h3>
                  <p>All cryptographic linkages are intact. Zero modifications detected. ECDSA Signatures Valid.</p>
                </div>
              </div>
            )}

            <div className="content-grid">
              {/* Left Column: Input & Simulation */}
              <div className="input-column">
                <section className="card">
                  <h3><PlusCircle size={20} /> NEW LOG ENTRY</h3>
                  <form onSubmit={handleAddLog}>
                    <div className="form-group">
                      <label>EVENT CATEGORY</label>
                      <select 
                        value={eventType} 
                        onChange={(e) => setEventType(e.target.value as EventType)}
                      >
                        <option value="Login Attempt">Login Attempt</option>
                        <option value="File Access">File Access</option>
                        <option value="Transaction">Transaction</option>
                        <option value="System Event">System Event</option>
                        <option value="Aadhaar Auth">Aadhaar Auth</option>
                        <option value="e-KYC Update">e-KYC Update</option>
                        <option value="Tax Filing">Tax Filing</option>
                        <option value="CERT-In Report">CERT-In Report</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>DESCRIPTION</label>
                      <textarea 
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Detailed event description..."
                        rows={3}
                      />
                    </div>
                    <button type="submit" className="add-btn">COMMIT TO CHAIN</button>
                  </form>
                </section>

                <section className="card">
                  <h3><AlertTriangle size={20} /> TAMPER SIMULATION</h3>
                  <div className="tamper-actions">
                    <button 
                      onClick={() => simulateModification(Math.floor(Math.random() * logs.length))}
                      className="btn-warning"
                      disabled={logs.length === 0}
                    >
                      <Edit3 size={16} /> MODIFY ENTRY
                    </button>
                    <button 
                      onClick={() => simulateDeletion(Math.floor(Math.random() * (logs.length - 1)) + 1)}
                      className="btn-danger"
                      disabled={logs.length <= 1}
                    >
                      <Trash2 size={16} /> DELETE ENTRY
                    </button>
                  </div>
                </section>

                <TestSuite logs={logs} />

                <section className="card compliance-card">
                  <h3><FileText size={20} /> REGULATORY EVIDENCE</h3>
                  <p>Admissible evidence under IT Act 2000 Section 65B / BSA.</p>
                  <button 
                    className="cert-btn" 
                    onClick={generateCertificate}
                    disabled={!verification?.isValid}
                  >
                    <Download size={16} /> DOWNLOAD 65B CERTIFICATE
                  </button>
                </section>
              </div>

              {/* Right Column: Visualization */}
              <div className="chain-column">
                <section className="chain-visualizer">
                  <div className="chain-header">
                    <h3><Activity size={20} /> IMMUTABLE AUDIT TRAIL</h3>
                    <div className="chain-stats">
                      <span>TOTAL: {logs.length}</span>
                    </div>
                  </div>
                  
                  <div className="filters-bar" style={{padding: '0 1rem', marginTop: '1rem'}}>
                    <div className="form-group search-input" style={{marginBottom: 0}}>
                      <div style={{display: 'flex', alignItems: 'center', border: 'var(--border-width) solid var(--border-color)', background: 'var(--input-bg)'}}>
                        <Search size={18} style={{marginLeft: '8px', color: 'var(--text-muted)'}}/>
                        <input 
                          type="text" 
                          placeholder="Search logs or hashes..." 
                          value={searchQuery}
                          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                          style={{border: 'none', flexGrow: 1}}
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{marginBottom: 0, width: '200px'}}>
                      <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}>
                        <option value="All">All Events</option>
                        <option value="Login Attempt">Login Attempt</option>
                        <option value="File Access">File Access</option>
                        <option value="Transaction">Transaction</option>
                        <option value="System Event">System Event</option>
                        <option value="CERT-In Report">CERT-In Report</option>
                      </select>
                    </div>
                  </div>

                  <div className="chain-list">
                    {paginatedLogs.map((log) => {
                      const absoluteIndex = logs.findIndex(l => l.id === log.id);
                      const isTampered = verification?.tamperedIndices.includes(absoluteIndex);
                      const showStatus = verification !== null;
                      
                      return (
                        <div key={log.id} onClick={() => setSelectedLog(log)} className={`log-entry ${showStatus ? (isTampered ? 'tampered' : 'valid') : ''}`}>
                          <div className="log-meta">
                            <span className="index">#{absoluteIndex}</span>
                            <span className="timestamp">{log.istTimestamp}</span>
                            <span className="type">{log.eventType}</span>
                            {showStatus && isTampered && <span className="badge-error">Tampered</span>}
                            {showStatus && !isTampered && <span className="badge-success">Valid</span>}
                          </div>
                          <div className="log-content">
                            <p>{log.description}</p>
                          </div>
                          <div className="log-hashes">
                            <code>PREV: {truncateHash(log.prevHash, 16)}</code>
                            <code>CURR: {truncateHash(log.hash, 16)}</code>
                          </div>
                          {log.signature && (
                            <div className="log-signature">
                              <ShieldCheck size={12} /> Signed (ECDSA-P256)
                            </div>
                          )}
                          {isTampered && (
                            <div className="breach-alert">! INTEGRITY BREACH DETECTED AT INDEX {absoluteIndex} !</div>
                          )}
                        </div>
                      );
                    })}
                    {paginatedLogs.length === 0 && (
                      <div style={{textAlign: 'center', color: 'var(--text-muted)', padding: '2rem'}}>
                        No logs match your search filters.
                      </div>
                    )}
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="pagination-controls">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft size={16} /> Prev
                      </button>
                      <span>Page {currentPage} of {totalPages}</span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        ) : (
          <div className="analysis-page">
            <header className="page-header">
              <h2>System Security Analysis (v3.0)</h2>
            </header>
            <div className="analysis-grid">
              <section className="analysis-card">
                <h3>Pluggable Storage Architecture</h3>
                <p>The system supports Pluggable Storage Adapters (LocalStorage, RemoteShippingAdapter). The adapter architecture allows direct drop-in replacements for remote secure storage while enforcing strict Write-Once-Read-Many constraints.</p>
              </section>
              <section className="analysis-card">
                <h3>O(n) Verification & Pinpointing</h3>
                <p>The cryptographic chaining enables not just breach detection, but exact localization. The upgraded verification engine pinpoints the specific index and cause (Hash Mismatch vs Broken Linkage), greatly improving incident response.</p>
              </section>
              <section className="analysis-card full-width">
                <h3>Technical Specification</h3>
                <div className="spec-table">
                  <div className="spec-row"><span>Algorithm</span><span>SHA-256 (NIST FIPS 180-4)</span></div>
                  <div className="spec-row"><span>Signatures</span><span>ECDSA (P-256 Curve)</span></div>
                  <div className="spec-row"><span>Architecture</span><span>Linked Cryptographic Hash Chain</span></div>
                  <div className="spec-row"><span>Storage</span><span>Adapter Interface (Ready for Blockchain/WORM)</span></div>
                  <div className="spec-row"><span>Compliance</span><span>Ready for IT Act 2000 Section 65B</span></div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;