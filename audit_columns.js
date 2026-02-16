const fs = require('fs');
const path = require('path');

const finPath = path.join('Assets', 'FinFutW(2026-02-03)-k.txt');
const commPath = path.join('Assets', 'f_disagg(2026-02-03).txt');

function analyzeFile(filePath, targetId, name) {
    console.log(`\n=== AUDIT TARGET: ${name} (${targetId}) ===`);
    try {
        if (!fs.existsSync(filePath)) {
            console.log(`ERROR: File not found: ${filePath}`);
            return;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const line = lines.find(l => l.includes(targetId));

        if (!line) {
            console.log(`ERROR: ID ${targetId} NOT FOUND in ${filePath}`);
            return;
        }

        console.log(`Source File: ${filePath}`);
        console.log(`Raw Line: ${line.substring(0, 150)}...`);

        const parts = line.replace(/"/g, '').split(',');

        console.log('\n--- COLUMN VALUES ---');
        parts.forEach((p, i) => {
            if (i <= 20) {
                console.log(`Index [${i}]: ${p.trim()}`);
            }
        });

        // Print specific indices we are interested in
        console.log('\n--- KEY INDICES CHECK ---');
        console.log(`Index [7] (OI?): ${parts[7]?.trim()}`);
        console.log(`Index [14] (Lev Funds Long?): ${parts[14]?.trim()}`);
        console.log(`Index [15] (Lev Funds Short?): ${parts[15]?.trim()}`);

    } catch (e) {
        console.error('Error:', e.message);
    }
}

analyzeFile(finPath, '098662', 'USD INDEX');
analyzeFile(commPath, '001602', 'WHEAT');
