
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = 'C:\\Users\\Jens\\AppData\\Roaming\\TradeSlate\\tradeslate.db';
const db = new Database(dbPath);

const tradeIds = [
    '9d2c54d6-25d5-4c9f-8ad1-0e4346f5257c',
    'ef38c352-1502-4da8-876c-7126d8a7fb7f'
];

console.log('--- Database Trace ---');

tradeIds.forEach(id => {
    const trade = db.prepare('SELECT id, direction, entry_price, planned_sl, mfe_price, mae_price FROM trades WHERE id = ?').get(id);
    if (!trade) {
        console.log(`Trade ${id} not found.`);
        return;
    }
    console.log(`\nTrade ID: ${trade.id}`);
    console.log(`Direction: ${trade.direction}`);
    console.log(`Entry Price: ${trade.entry_price}`);
    console.log(`Planned SL: ${trade.planned_sl}`);
    console.log(`MFE Price: ${trade.mfe_price}`);
    console.log(`MAE Price: ${trade.mae_price}`);

    const riskPoints = Math.abs(trade.entry_price - trade.planned_sl);
    console.log(`Risk Points (abs(Entry - SL)): ${riskPoints}`);

    if (riskPoints === 0) {
        console.log('Division by zero! Risk Points is 0.');
    } else {
        let mfeR, maeR, mfeNum, maeNum;
        if (trade.direction === 'Long') {
            mfeNum = trade.mfe_price - trade.entry_price;
            maeNum = trade.entry_price - trade.mae_price;
        } else {
            mfeNum = trade.entry_price - trade.mfe_price;
            maeNum = trade.mae_price - trade.entry_price;
        }
        mfeR = mfeNum / riskPoints;
        maeR = maeNum / riskPoints;

        console.log(`MFE Numerator: ${mfeNum}`);
        console.log(`MAE Numerator: ${maeNum}`);
        console.log(`MFE R: ${mfeR.toFixed(2)}`);
        console.log(`MAE R: ${maeR.toFixed(2)}`);
    }
});
