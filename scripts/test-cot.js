// Test script to verify COT parsing logic
const fs = require('fs');

// TARGETS configuration from cot.ts
const TARGETS = {
    '098662': { name: 'USD', size: 1000 },
    '099741': { name: 'EUR', size: 125000 },
    '096742': { name: 'GBP', size: 62500 },
    '097741': { name: 'JPY', size: 12500000 },
    '090741': { name: 'CAD', size: 100000 },
    '092741': { name: 'CHF', size: 125000 },
    '232741': { name: 'AUD', size: 100000 },
    '112741': { name: 'NZD', size: 100000 },
    '095741': { name: 'MXN', size: 500000 },
    '133741': { name: 'BTC', size: 5 }
};

const COLUMNS = {
    OI: 7,
    LF_LONG: 14,
    LF_SHORT: 15,
    CHG_OI: 24,
    CHG_LF_LONG: 31,
    CHG_LF_SHORT: 32
};

function parseNum(val) {
    if (!val) return 0;
    const cleaned = val.replace(/\s/g, '').replace(/,/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

function parseFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const dataList = [];
    let reportDate = '';

    console.log('Processing', lines.length, 'lines...\n');

    for (let i = 0; i < lines.length; i++) {
        const cleanLine = lines[i].replace(/"/g, '').trim();
        const parts = cleanLine.split(',');

        let foundId = null;
        for (const p of parts) {
            const pClean = p.trim();
            if (TARGETS[pClean]) {
                foundId = pClean;
                break;
            }
        }

        if (!foundId) continue;

        const meta = TARGETS[foundId];

        const oi = parseNum(parts[COLUMNS.OI]);
        const longs = parseNum(parts[COLUMNS.LF_LONG]);
        const shorts = parseNum(parts[COLUMNS.LF_SHORT]);

        if (oi === 0) continue;

        if (!reportDate && parts[2]) {
            reportDate = parts[2].trim();
        }

        const chgOi = parseNum(parts[COLUMNS.CHG_OI]);
        const chgLong = parseNum(parts[COLUMNS.CHG_LF_LONG]);
        const chgShort = parseNum(parts[COLUMNS.CHG_LF_SHORT]);

        const netPos = longs - shorts;
        const netValUsd = netPos * meta.size;
        const netPct = oi !== 0 ? (netPos / oi) * 100 : 0;

        const prevOi = oi - chgOi;
        const prevLong = longs - chgLong;
        const prevShort = shorts - chgShort;
        const prevNet = prevLong - prevShort;
        const prevPct = prevOi !== 0 ? (prevNet / prevOi) * 100 : 0;
        const delta = netPct - prevPct;
        const isFlip = (netPos > 0 && prevNet < 0) || (netPos < 0 && prevNet > 0);

        let signal = 'NEUTRAL';
        if (netPos > 0 && delta > 0) signal = 'STRONG LONG';
        else if (netPos < 0 && delta < 0) signal = 'STRONG SHORT';
        else if ((netPos > 0 && delta < 0) || (netPos < 0 && delta > 0)) signal = 'DIVERGENCE';
        if (isFlip) signal = 'COT FLIP';

        dataList.push({
            currency: meta.name,
            net_pos: Math.round(netPos),
            net_val: netValUsd,
            net_pct: Math.round(netPct * 10) / 10,
            delta: Math.round(delta * 10) / 10,
            signal: signal,
            is_flip: isFlip
        });
    }

    dataList.sort((a, b) => b.net_pct - a.net_pct);
    return { date: reportDate, data: dataList };
}

// Run the parser
const result = parseFile('Assets/FinFutW(2026-02-03)-k.txt');

console.log('=== COT PARSING RESULTS ===');
console.log('Report Date:', result.date);
console.log('Currencies Found:', result.data.length);
console.log('\n');

console.log('| Currency | Net Position | Net Value ($) | Net % (LF) | 1-Wk Delta | Signal |');
console.log('|----------|-------------|---------------|------------|------------|--------|');

result.data.forEach(d => {
    const netValStr = d.net_val >= 1e9 ? (d.net_val / 1e9).toFixed(1) + 'B' :
        d.net_val >= 1e6 ? (d.net_val / 1e6).toFixed(0) + 'M' :
            d.net_val >= 1e3 ? (d.net_val / 1e3).toFixed(0) + 'K' : d.net_val.toFixed(0);
    const sign = d.net_val >= 0 ? '$' : '-$';
    const netValDisplay = d.net_val >= 0 ? '$' + netValStr : '-$' + netValStr.replace('-', '');

    console.log(`| ${d.currency.padEnd(8)} | ${d.net_pos.toLocaleString().padStart(11)} | ${netValDisplay.padStart(13)} | ${(d.net_pct > 0 ? '+' : '') + d.net_pct.toFixed(1).padStart(9)}% | ${(d.delta > 0 ? '+' : '') + d.delta.toFixed(1).padStart(9)}% | ${d.signal.padEnd(6)} |`);
});

console.log('\n=== TRADE RECOMMENDATIONS ===');
const majors = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD'];
const majorsData = result.data.filter(d => majors.includes(d.currency));
const bestLong = majorsData.find(d => d.net_pct > 0 && d.delta > 0);
const bestShort = [...majorsData].reverse().find(d => d.net_pct < 0 && d.delta < 0);

console.log('Best Long:', bestLong ? bestLong.currency + ' (' + bestLong.net_pct + '%, Delta ' + bestLong.delta + '%)' : 'None');
console.log('Best Short:', bestShort ? bestShort.currency + ' (' + bestShort.net_pct + '%, Delta ' + bestShort.delta + '%)' : 'None');
if (bestLong && bestShort) {
    console.log('Recommended Pair:', 'Long ' + bestLong.currency + bestShort.currency);
}
