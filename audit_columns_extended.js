const fs = require('fs');
const path = require('path');

const commPath = path.join('Assets', 'f_disagg(2026-02-03).txt');

function analyzeFile(filePath, targetId, name) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        const line = lines.find(l => l.includes(targetId));

        if (!line) return;

        const parts = line.replace(/"/g, '').split(',');

        console.log(`\n=== AUDIT TARGET: ${name} (${targetId}) ===`);
        console.log('\n--- COLUMN VALUES (20-50) ---');
        parts.forEach((p, i) => {
            if (i >= 20 && i <= 50) {
                console.log(`Index [${i}]: ${p.trim()}`);
            }
        });
    } catch (e) {
        console.error('Error:', e.message);
    }
}

analyzeFile(commPath, '001602', 'WHEAT');
