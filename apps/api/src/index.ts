import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { createLog, createGenesisBlock } from '@securelog/core';
import { LogEntry } from '@securelog/types';

const app = express();
app.use(cors());
app.use(express.json());

let db: Database;

async function initDB() {
    db = await open({
        filename: './securelog.db',
        driver: sqlite3.Database
    });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS honey_logs (
            id TEXT PRIMARY KEY,
            eventType TEXT,
            description TEXT,
            hash TEXT,
            prevHash TEXT,
            timestamp INTEGER,
            istTimestamp TEXT,
            signature TEXT,
            publicKey TEXT
        )
    `);
    console.log('[DATABASE] SQLite connected and ready.');
}

async function getHoneyLogs(): Promise<LogEntry[]> {
    if (!db) return [];
    const rows = await db.all('SELECT * FROM honey_logs ORDER BY timestamp ASC');
    return rows.map((r: any) => ({
        id: r.id,
        eventType: r.eventType,
        description: r.description,
        hash: r.hash,
        prevHash: r.prevHash,
        timestamp: String(r.timestamp),
        istTimestamp: r.istTimestamp,
        signature: r.signature,
        publicKey: r.publicKey,
        metadata: {
            systemId: 'SECURELOG-HONEY',
            compliance: 'IT-ACT-65B'
        }
    }));
}

async function recordHoneyEvent(description: string, metadata: any = {}) {
    let logs = await getHoneyLogs();
    if (logs.length === 0) {
        const genesis = await createGenesisBlock();
        await db.run('INSERT INTO honey_logs (id, eventType, description, hash, prevHash, timestamp, istTimestamp, signature, publicKey) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [genesis.id, genesis.eventType, genesis.description, genesis.hash, genesis.prevHash, genesis.timestamp, genesis.istTimestamp, genesis.signature, genesis.publicKey]);
        logs = [genesis];
    }
    const prev = logs[logs.length - 1];
    const entry = await createLog('CERT-In Report', `${description} | Meta: ${JSON.stringify(metadata)}`, prev);
    await db.run('INSERT INTO honey_logs (id, eventType, description, hash, prevHash, timestamp, istTimestamp, signature, publicKey) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [entry.id, entry.eventType, entry.description, entry.hash, entry.prevHash, entry.timestamp, entry.istTimestamp, entry.signature, entry.publicKey]);
    console.log(`[HONEY-POT ALERT]: ${description}`);
}

// 0. Root Status Route (v3.0)
app.get('/', (req, res) => {
    res.status(200).json({
        status: "SECURELOG-CORE-ACTIVE",
        version: "3.0",
        message: "Honey-Pot Deception API is live.",
        endpoints: {
            lure: "/api/v1/admin/config/credentials",
            audit: "/api/monitor/audit-trail"
        }
    });
});

// 1. Spoofed Sensitive Endpoint (The "Lure")
app.get('/api/v1/admin/config/credentials', async (req, res) => {
    const intruderInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        headers: req.headers
    };
    
    await recordHoneyEvent('Unauthorized access attempt to decoy credentials endpoint', intruderInfo);
    
    res.status(200).json({
        database: {
            host: 'prod-db-internal.securelog.net',
            user: 'admin_root',
            pass: 'P@ssw0rd123_Legacy', 
            port: 5432
        },
        cloud_provider: {
            aws_access_key: 'AKIAJW3M7SRFAKEKEYS',
            aws_secret_key: 'vN9H+S+P/DummySecretKeyDoNotUse'
        }
    });
});

// 2. Hidden Dummy File Endpoint
app.get('/api/backup/download/:filename', async (req, res) => {
    const { filename } = req.params;
    await recordHoneyEvent(`Intruder attempted to download decoy backup file: ${filename}`, { ip: req.ip });
    
    res.status(404).json({
        error: "File encrypted and moved to secure cold storage.",
        reference_id: `SEC-ERR-${Math.random().toString(36).substring(7).toUpperCase()}`
    });
});

// 3. Fake Login Portal (API version)
app.post('/api/auth/login-v2', async (req, res) => {
    const { username, password } = req.body;
    await recordHoneyEvent(`Brute-force attempt on spoofed login portal`, { username, password_length: password?.length, ip: req.ip });
    
    setTimeout(() => {
        res.status(401).json({ error: "Invalid multi-factor authentication token." });
    }, 2000);
});

// Utility: View the Honey-Pot Audit Trail (Tamper-Evident)
app.get('/api/monitor/audit-trail', async (req, res) => {
    const logs = await getHoneyLogs();
    res.json(logs);
});

// Simple endpoint to catch frontend logs shipping
app.post('/logs', async (req, res) => {
    // In a real scenario we'd write frontend logs to DB too,
    // but the system is already functional for the honey logs.
    // Assuming frontend pushes array of logs
    res.status(200).json({ success: true });
});

const PORT = process.env.PORT || 3001;

initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`[DECEPTION-CORE] Honey-Pot API active on port ${PORT}`);
        console.log(`[DECEPTION-CORE] Lure active at: /api/v1/admin/config/credentials`);
    });
}).catch(err => {
    console.error('[DATABASE] Failed to initialize SQLite:', err);
});
