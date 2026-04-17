import { createGenesisBlock, createLog, verifyChain } from '@securelog/core';
import { generateSigningKeyPair } from '@securelog/crypto';
import { LogEntry } from '@securelog/types';

async function evaluate() {
    console.log("Initializing Test Environment...");
    const keys = await generateSigningKeyPair();
    let logs: LogEntry[] = [];
    
    // 1. Genesis Block
    const genesis = await createGenesisBlock(keys);
    logs.push(genesis);
    
    // 2. Generate 198 additional logs to make 199 total
    console.log("Generating 199 log entries for the dataset...");
    for (let i = 1; i < 199; i++) {
        const prev = logs[i - 1];
        const log = await createLog('System Event', `Automated test log entry #${i}`, prev, keys);
        logs.push(log);
    }
    
    // 3. Establish Ground Truth
    const tamperedGroundTruth = new Set<number>();
    
    // 4. Inject Anomalies (Tampers)
    // We will tamper exactly 30 random logs to evaluate detection accuracy
    const numTampers = 30;
    let attempts = 0;
    while (tamperedGroundTruth.size < numTampers && attempts < 1000) {
        attempts++;
        const idx = Math.floor(Math.random() * 198) + 1; // skip genesis (index 0)
        if (tamperedGroundTruth.has(idx)) continue;
        
        tamperedGroundTruth.add(idx);
        const tamperType = Math.random();
        
        if (tamperType < 0.33) {
            // Tamper Type 1: Modify Payload (Data Alteration)
            logs[idx].description = logs[idx].description + ' [MALICIOUS_MODIFICATION]';
        } else if (tamperType < 0.66) {
            // Tamper Type 2: Break Linkage (Orphaned Block)
            logs[idx].prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
        } else {
            // Tamper Type 3: Invalid Signature (Spoofing)
            logs[idx].signature = logs[idx].signature ? logs[idx].signature.substring(0, logs[idx].signature.length - 5) + 'XXXXX' : logs[idx].signature;
        }
    }
    
    console.log(`Successfully injected ${tamperedGroundTruth.size} anomalies. Running Cryptographic Verification Engine...`);
    
    // 5. Run Verification
    const startTime = performance.now();
    const result = await verifyChain(logs);
    const endTime = performance.now();
    
    // 6. Calculate Metrics
    const detected = new Set(result.tamperedIndices);
    
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let trueNegatives = 0;
    
    for (let i = 0; i < 199; i++) {
        const isTampered = tamperedGroundTruth.has(i);
        const isDetected = detected.has(i);
        
        if (isTampered && isDetected) truePositives++;
        else if (!isTampered && isDetected) falsePositives++;
        else if (isTampered && !isDetected) falseNegatives++;
        else trueNegatives++;
    }
    
    const accuracy = ((truePositives + trueNegatives) / 199) * 100;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * ((precision * recall) / (precision + recall)) || 0;
    
    console.log(`\nVerification completed in ${(endTime - startTime).toFixed(2)}ms`);
    console.log("\n--- SECURELOG EVALUATION RESULTS ---");
    
    console.table({
        "Total Logs Analyzed": 199,
        "Anomalies Injected": tamperedGroundTruth.size,
        "Anomalies Detected": detected.size,
        "True Positives (Correctly Flagged)": truePositives,
        "True Negatives (Correctly Ignored)": trueNegatives,
        "False Positives (False Alarms)": falsePositives,
        "False Negatives (Missed Tampers)": falseNegatives,
    });
    
    console.log("\n--- PERFORMANCE METRICS ---");
    console.table({
        "Accuracy": `${accuracy.toFixed(2)}%`,
        "Precision": precision.toFixed(4),
        "Recall": recall.toFixed(4),
        "F1 Score": f1Score.toFixed(4),
        "Verification Speed": `${(endTime - startTime).toFixed(2)} ms`
    });
}

evaluate().catch(console.error);