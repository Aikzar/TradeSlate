const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'tradeslate.db');
const db = new Database(dbPath, { verbose: null });

const stmt = db.prepare('SELECT * FROM trades');
const trades = stmt.all();

let wins = [];
let losses = [];
let mfeRs = [];
let maeRs = [];

trades.forEach(t => {
    // Correct pnl check (handle nulls as 0)
    const pnl = t.pnl || 0;

    // Simulate initial_sl = planned_sl (since migration hasn't run yet)
    let sl = t.initial_sl || t.planned_sl;

    // Logic: calculateMFER
    let mfeR = 0;
    if (sl && t.entry_price !== sl && t.mfe_price !== undefined && t.mfe_price !== null) {
        const riskPoints = Math.abs(t.entry_price - sl);
        if (t.direction === 'Long') mfeR = (t.mfe_price - t.entry_price) / riskPoints;
        else mfeR = (t.entry_price - t.mfe_price) / riskPoints;
    }

    // Logic: calculateMAER
    let maeR = 0;
    if (sl && t.entry_price !== sl && t.mae_price !== undefined && t.mae_price !== null) {
        const riskPoints = Math.abs(t.entry_price - sl);
        if (t.direction === 'Long') maeR = (t.entry_price - t.mae_price) / riskPoints;
        else maeR = (t.mae_price - t.entry_price) / riskPoints;
    }

    if (pnl > 0) {
        wins.push(t);
        // Include 0s if price data exists, exclude only if sl/price missing
        if (t.mfe_price !== null && sl) {
            mfeRs.push(mfeR);
        }
    } else if (pnl < 0) {
        losses.push(t);
        // Include 0s if price data exists
        if (t.mae_price !== null && sl) {
            maeRs.push(maeR);
        }
    }
});

const calculateMedian = (arr) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const avgMFE = mfeRs.length ? mfeRs.reduce((a, b) => a + b, 0) / mfeRs.length : 0;
const medianMFE = calculateMedian(mfeRs);

const avgMAE = maeRs.length ? maeRs.reduce((a, b) => a + b, 0) / maeRs.length : 0;
const medianMAE = calculateMedian(maeRs);

console.log('Processed Trades:', trades.length);
console.log('Wins:', wins.length, 'Losses:', losses.length);
console.log('MFE Samples:', mfeRs.length);
console.log('MAE Samples:', maeRs.length);
console.log('--------------------------------------------------');
console.log('PREDICTED NEW METRICS (including 0R excursions):');
console.log('Avg MFE:', avgMFE.toFixed(2) + 'R');
console.log('Median MFE:', medianMFE.toFixed(2) + 'R');
console.log('Avg MAE:', avgMAE.toFixed(2) + 'R');
console.log('Median MAE:', medianMAE.toFixed(2) + 'R');
console.log('--------------------------------------------------');
