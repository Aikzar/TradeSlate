const fs = require('fs');

const content = fs.readFileSync('Assets/FinFutW(2026-02-03)-k.txt', 'utf8');
const lines = content.split('\n');

// CFTC TFF Long Format column mapping analysis
// We need to find exact positions for:
// 1. Open Interest
// 2. Leveraged Funds Long
// 3. Leveraged Funds Short  
// 4. Change in Open Interest
// 5. Change in Leveraged Funds Long
// 6. Change in Leveraged Funds Short

function analyze(line, name) {
    const parts = line.replace(/"/g, '').split(',');
    console.log('\n=== ' + name + ' ===');
    console.log('CFTC ID:', parts[3]);
    console.log('OI [7]:', parts[7]);

    // Show candidate columns for current data
    console.log('\nCurrent Data Analysis:');
    for (let i = 8; i <= 21; i++) {
        console.log('  [' + i + ']:', parts[i]);
    }

    // The values at index 24+ are changes
    console.log('\nChange Data Analysis:');
    for (let i = 24; i <= 40; i++) {
        console.log('  [' + i + ']:', parts[i]);
    }

    // Based on TFF format, the pattern is:
    // Current positions: indices 8-23 (Dealer, Asset Manager, Leveraged, Other, Non-Rep)
    // Changes: indices 24-40

    // From user's Python script: Index 14 = LF Long, Index 15 = LF Short
    // Let's calculate using those values
    const oi = parseFloat(parts[7]);
    const lfLong14 = parseFloat(parts[14]);
    const lfShort15 = parseFloat(parts[15]);
    const net14_15 = lfLong14 - lfShort15;
    const pct14_15 = (net14_15 / oi) * 100;

    console.log('\nUsing indices 14/15 (user script):');
    console.log('  LF Long [14]:', lfLong14);
    console.log('  LF Short [15]:', lfShort15);
    console.log('  Net:', net14_15);
    console.log('  Net %:', pct14_15.toFixed(1) + '%');

    // Alternative using 12/13
    const lfLong12 = parseFloat(parts[12]);
    const lfShort13 = parseFloat(parts[13]);
    const net12_13 = lfLong12 - lfShort13;
    const pct12_13 = (net12_13 / oi) * 100;

    console.log('\nUsing indices 12/13 (alternative):');
    console.log('  LF Long [12]:', lfLong12);
    console.log('  LF Short [13]:', lfShort13);
    console.log('  Net:', net12_13);
    console.log('  Net %:', pct12_13.toFixed(1) + '%');
}

// Analyze key currencies
analyze(lines[0], 'CAD');  // Line 0
analyze(lines[1], 'CHF');  // Line 1
analyze(lines[3], 'JPY');  // Line 3
analyze(lines[4], 'EUR');  // Line 4

// Find change column pattern
console.log('\n\n=== CHANGE COLUMN PATTERN ANALYSIS ===');
console.log('The change values should follow same order as current values');
console.log('If current LF Long = [14], then change LF Long should be [14 + 17] = [31]');
console.log('The offset from current to change appears to be 17 positions');

const parts = lines[0].replace(/"/g, '').split(',');
console.log('\nCAD Change OI [24]:', parts[24]);
console.log('CAD Change values:');
console.log('  [31]:', parts[31], '(Change LF Long if offset=17 from [14])');
console.log('  [32]:', parts[32], '(Change LF Short if offset=17 from [15])');
console.log('  [29]:', parts[29], '(Alternative Change LF Long)');
console.log('  [30]:', parts[30], '(Alternative Change LF Short)');
