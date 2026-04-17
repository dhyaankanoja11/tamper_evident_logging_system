import express from 'express';
import cors from 'cors';
import { createLog, createGenesisBlock } from '@securelog/core';
import { LogEntry } from '@securelog/types';

const app = express();
app.use(cors());
app.use(express.json());

/**
 * DECEPTION-BASED SECURITY MECHANISM (Task 3)
 * This API acts as a "Honey-Pot" to trap and observe malicious actors.
 * It provides dummy sensitive data and logs all unauthorized interactions.
 */

// Secure Log Chain for Honey-Pot Events
let honeyLogs: LogEntry[] = [];

async function recordHoneyEvent(description: string, metadata: any = {}) {
    if (honeyLogs.length === 0) {
        const genesis = await createGenesisBlock();
        honeyLogs.push(genesis);
    }
    const prev = honeyLogs[honeyLogs.length - 1];
    const entry = await createLog('CERT-In Report', `${description} | Meta: ${JSON.stringify(metadata)}`, prev);
    honeyLogs.push(entry);
    console.log(`[HONEY-POT ALERT]: ${description}`);
}

// 1. Spoofed Sensitive Endpoint (The "Lure")
app.get('/api/v1/admin/config/credentials', async (req, res) => {
    const intruderInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        headers: req.headers
    };
    
    await recordHoneyEvent('Unauthorized access attempt to decoy credentials endpoint', intruderInfo);
    
    // Return fake but realistic looking credentials
    res.status(200).json({
        database: {
            host: 'prod-db-internal.securelog.net',
            user: 'admin_root',
            pass: 'P@ssw0rd123_Legacy', // Weak password to entice further attack
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
    
    // Simulate a slow response to tie up attacker resources (Tarpit)
    setTimeout(() => {
        res.status(401).json({ error: "Invalid multi-factor authentication token." });
    }, 2000);
});

// Utility: View the Honey-Pot Audit Trail (Tamper-Evident)
app.get('/api/monitor/audit-trail', (req, res) => {
    res.json(honeyLogs);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[DECEPTION-CORE] Honey-Pot API active on port ${PORT}`);
    console.log(`[DECEPTION-CORE] Lure active at: /api/v1/admin/config/credentials`);
});
