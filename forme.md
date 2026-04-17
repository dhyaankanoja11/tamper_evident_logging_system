# Project Study Guide: SecureLog v3.0

This document is your personal cheat sheet for understanding the codebase, explaining the architecture, and nailing technical interviews regarding your internship project's core feature: the Tamper-Evident Logging System.

---

## 1. Project Overview & Tech Stack

**What is this project?**
It is a highly secure, **Tamper-Evident Logging System**. It creates an immutable audit trail where every log is mathematically linked to the previous one and digitally signed. If an attacker breaches the system and alters or deletes a past log, the cryptographic chain breaks, instantly alerting administrators to the exact location of the tampering.

**The Tech Stack:**
*   **Architecture:** Monorepo (using Workspaces/Turborepo) - Allows sharing types and logic cleanly across the project.
*   **Frontend (`apps/web`):** React (TypeScript), Vite, Lucide React (Icons).
*   **Cryptography (`@securelog/crypto` & `@securelog/core`):** Web Crypto API (`window.crypto.subtle`) for native, high-performance SHA-256 hashing and ECDSA P-256 digital signatures.
*   **Storage (`@securelog/storage`):** Pluggable adapters. Uses LocalStorage for browser persistence, designed to easily swap to remote databases or WORM (Write-Once-Read-Many) storage.

---

## 2. Codebase Deep Dive: How It Works

The codebase is split into modular packages so logic isn't tightly coupled to the UI.

### A. The Core Engine (`packages/core`)
This is where the mathematical magic happens.
*   **`createLog()`**: When a new event occurs, this function takes the event data, grabs the **hash of the previous log**, concatenates them, and calculates a new **SHA-256 hash**. It then uses the system's private key to generate an **ECDSA signature** over that hash.
*   **`verifyChain()`**: This function loops through the entire array of logs `O(n)`. For every log, it recalculates the expected hash based on its content and the previous log's hash. If `calculatedHash !== storedHash`, it flags a **Modification Attack**. If `currentLog.prevHash !== actualPreviousLog.hash`, it flags a **Deletion/Re-ordering Attack**.

### B. Storage Adapters (`packages/storage`)
We use an adapter pattern so we can switch databases without rewriting the app.
*   **`LocalStorageAdapter`**: Saves the chain in the browser for demonstration.
*   **`RemoteShippingAdapter`**: A wrapper that intercepts logs saved locally and simultaneously ships them to a remote server. This simulates WORM (Write-Once-Read-Many) storage. If an attacker deletes the local database, the remote forensic copy still exists.

### C. The Frontend (`apps/web`)
*   **`useLogChain.ts`**: The brain of the React app. It initializes the crypto keys, loads logs from storage, and exposes functions like `addLog`, `verifyChain`, and `generateDataset`.
*   **`App.tsx`**: The main dashboard. It renders the visual chain, the "Tamper Simulation" buttons (which intentionally break the chain to prove the system works), and handles Section 65B Certificate generation.

---

## 3. Core Security Concepts to Know

*   **Immutability:** Data cannot be changed after it is created. We achieve this not through database locks, but through **Cryptographic Hashing**.
*   **Hash Chaining:** The concept that block $N$ contains the hash of block $N-1$. Used in blockchains (like Bitcoin) and Git.
*   **Non-Repudiation:** Proving that data came from a specific source and cannot be denied. We achieve this using **ECDSA Signatures**. Anyone can verify the log using the public key, but only the system (holding the private key) could have created it.
*   **WORM (Write-Once-Read-Many):** A data storage standard, crucial for legal compliance, where data can be written once but never erased or modified.
*   **Section 65B (Indian Evidence Act):** The legal requirement in India for admitting electronic records as evidence in court. The system generates a certificate proving the system was operating securely.

---

## 4. Interview Questions & How to Answer Them

### Q1: How does your tamper-evident system actually detect tampering?
**A:** "It uses a Linked Hash Chain. Every log entry contains a SHA-256 hash of its own contents *plus* the hash of the preceding log entry. When I run the verification engine, it recalculates the hashes sequentially. If an attacker modifies a log, its hash changes. Because the next log relies on that hash, the entire subsequent chain breaks. The system pinpoint exactly which index caused the mismatch."

### Q2: What prevents an attacker from just recalculating the whole chain after modifying a log?
**A:** "That's where Non-Repudiation comes in. I implemented ECDSA signatures on the P-256 curve. Every log's hash is digitally signed using the system's private key. If an attacker recalculates the hashes, they would also need to forge the digital signatures. Since they don't have the private key, the signature verification will fail, exposing the fake chain."

### Q3: Why did you choose a Monorepo architecture?
**A:** "A monorepo allowed me to separate concerns cleanly. I could isolate the cryptographic engine (`@securelog/core`) and the storage adapters (`@securelog/storage`) from the React frontend. This makes the core logic highly testable, framework-agnostic, and allows me to share TypeScript interfaces seamlessly across different parts of the project without duplicating code."

### Q4: If the server is compromised, how do you trust the logs?
**A:** "I designed the system around a Pluggable Storage Architecture. By using a `RemoteShippingAdapter`, as soon as a log is generated and signed, it can be instantly shipped to a remote, segregated server, mimicking WORM (Write-Once-Read-Many) storage. Even if the attacker gets root access and deletes the local database, the cryptographic chain is already safely mirrored off-site."

### Q5: What is the time complexity of your verification process? Can it scale?
**A:** "The current verification process is `O(n)`, running sequentially from the genesis block to the latest block. In my load testing, verifying thousands of logs takes only a fraction of a second, which is highly performant for a dashboard. However, for massive enterprise scale, I would propose upgrading the architecture to use a Merkle Tree, which would allow for `O(log n)` verification of individual entries without parsing the entire history."