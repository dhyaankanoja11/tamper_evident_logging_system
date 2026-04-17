# SecureLog v3.0: Enterprise Tamper-Evident Logging

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Security](https://img.shields.io/badge/Security-SHA--256%20%7C%20ECDSA-green?style=for-the-badge)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)

## Overview
SecureLog is a high-integrity cryptographic audit trail system. Version 3.0 introduces advanced non-repudiation and resilience features, making it suitable for production-grade cybersecurity environments and legal compliance (IT Act 2000 Section 65B).

## New in v3.0 (Advanced Security)
- **Digital Signatures (Non-Repudiation):** Every log entry is now signed using **ECDSA (Elliptic Curve Digital Signature Algorithm)** with a P-256 curve. This ensures that logs are not only unchanged but also proven to originate from the authorized system.
- **Remote Log Mirroring (Resilience):** Implemented a **Remote Shipping Adapter** that simultaneously "shadows" every local log to a secure remote backend (Port 3001), protecting against total local data wipes.
- **Encrypted Payload Logic:** Core library support for AES-GCM 256-bit encryption for sensitive log descriptions.

## Core Features
- **SHA-256 Cryptographic Chaining:** Linked Hash Chain (LHC) architecture.
- **Forensic Pinpointing:** Real-time detection of modification, deletion, and reordering.
- **IT Act 2000 Compliance:** Built-in generation of Section 65B certificates for legal admissibility.
- **Pluggable Storage:** Flexible adapters for LocalStorage, WORM, and Remote APIs.

## How It Works

### 1. Cryptographic Chaining
`Hash(L_n) = SHA-256( Payload(L_n) + L_{n-1}.hash )`
Each block is cryptographically "sealed" to the previous one.

### 2. Digital Signatures (Non-Repudiation)
When a log is committed, the system:
1. Generates/Uses a unique ECDSA private key.
2. Signs the block's SHA-256 hash.
3. Attaches the `signature` and `publicKey` to the entry.
4. During verification, the system re-validates the signature against the public key to ensure authenticity.

### 3. Remote Mirroring
The `RemoteShippingAdapter` acts as a proxy. Every `saveLogs` call locally also triggers an asynchronous POST to the configured remote endpoint, ensuring a redundant, off-site audit trail.

## Tech Stack
- **Frontend:** React 18, TypeScript, Vite.
- **Cryptography:** Web Crypto API (SubtleCrypto).
- **Backend (Mirror):** Express.js (Node.js).
- **Styling:** Brutalist Vanilla CSS.

## Usage
1. **Add Log:** Commit logs via the Dashboard. Look for the green **"Signed (ECDSA-P256)"** badge.
2. **Verify:** Use "Verify Chain" to run a full integrity and signature check.
3. **Simulate:** Modify or Delete entries to see the system pinpoint the breach.
4. **Export:** Download the entire chain as a JSON file for external auditing.

## Deployment
This system is configured for seamless deployment:
- **Web App:** Can be deployed to Vercel, Netlify, or GitHub Pages.
- **API Server:** Can be deployed to any Node.js environment (Railway, Render, etc.).
- **Local Dev:** `npm install` and `npm run dev`.

---
*Internship Assessment Project - Cybersecurity Focus - April 2026*
