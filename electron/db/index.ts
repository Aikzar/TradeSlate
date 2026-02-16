
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { schema } from './schema';
import { COTRepository } from './cot';

let db: Database.Database | null = null;

export function initDB() {
    if (db) return db;

    // Ensure userData path is available (this runs in main process)
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'tradeslate.db');
    console.log('Database path:', dbPath);

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    // Run schema migration (creates tables if missing)
    db.exec(schema);

    // Initialize COT Repository (JSON)
    COTRepository.init(userDataPath);

    // MIGRATION: Add account_id to trades if missing
    try {
        const tableInfo = db.pragma('table_info(trades)') as any[];
        const hasAccountId = tableInfo.some(col => col.name === 'account_id');

        if (!hasAccountId) {
            console.log('Migrating: Adding account_id to trades table...');
            db.exec('ALTER TABLE trades ADD COLUMN account_id TEXT REFERENCES accounts(id)');
        }
    } catch (err) {
        console.error('Migration Error (account_id):', err);
    }

    // MIGRATION: Ensure at least one account exists and assign orphan trades
    try {
        const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get() as { count: number };

        if (accountCount.count === 0) {
            console.log('Migrating: Creating default "Main Account"');
            const defaultId = 'main-account'; // Fixed ID for simplicity, or UUID
            db.prepare('INSERT INTO accounts (id, name, is_aggregated) VALUES (?, ?, ?)').run(defaultId, 'Main Account', 1);

            // Assign all existing trades to this account
            const result = db.prepare('UPDATE trades SET account_id = ? WHERE account_id IS NULL').run(defaultId);
            console.log(`Migrated ${result.changes} trades to Main Account.`);
        }
    } catch (err) {
        console.error('Migration Error (default account):', err);
    }

    // MIGRATION: 2026-01-15 Add video_url
    try {
        const tableInfo = db.pragma('table_info(trades)') as any[];
        const hasVideoUrl = tableInfo.some(col => col.name === 'video_url');

        if (!hasVideoUrl) {
            console.log('Migrating: Adding video_url to trades table...');
            db.exec('ALTER TABLE trades ADD COLUMN video_url TEXT');
        }
    } catch (err) {
        console.error('Migration Error (video_url):', err);
    }

    // MIGRATION: 2026-01-16 Add image_annotations
    try {
        const tableInfo = db.pragma('table_info(trades)') as any[];
        const hasImageAnnotations = tableInfo.some(col => col.name === 'image_annotations');

        if (!hasImageAnnotations) {
            console.log('Migrating: Adding image_annotations to trades table...');
            db.exec('ALTER TABLE trades ADD COLUMN image_annotations TEXT');
        }
    } catch (err) {
        console.error('Migration Error (image_annotations):', err);
    }

    // MIGRATION: Add initial_sl (Static Risk Anchor)
    try {
        const tableInfo = db.pragma('table_info(trades)') as any[];
        const hasInitialSL = tableInfo.some(col => col.name === 'initial_sl');

        if (!hasInitialSL) {
            console.log('Migrating: Adding initial_sl (Static Anchor) to trades table...');
            db.exec('ALTER TABLE trades ADD COLUMN initial_sl REAL');

            // Backfill: Set initial_sl = planned_sl for existing trades
            db.exec('UPDATE trades SET initial_sl = planned_sl WHERE initial_sl IS NULL');
            console.log('Migrating: Backfilled initial_sl for existing trades.');
        }
    } catch (err) {
        console.error('Migration Error (initial_sl):', err);
    }

    // MIGRATION: Fix Initial Risk Anchor (Floating Denominator Fix)
    // Re-calculate initial_sl from RISK ($) if available, to recover from moved stops (BE)
    try {
        const testTrade = db.prepare("SELECT * FROM trades WHERE risk > 0 LIMIT 1").get();
        if (testTrade) {
            console.log('Migrating: Attempting to recover Initial Risk from Dollar Risk...');
            const trades = db.prepare("SELECT * FROM trades WHERE risk > 0 AND contracts > 0").all();
            const updateStmt = db.prepare("UPDATE trades SET initial_sl = ? WHERE id = ?");

            // Contract Values Map (Points to $)
            const POINT_VALUES: { [key: string]: number } = {
                'NQ': 20, 'MNQ': 2,
                'ES': 50, 'MES': 5,
                'CL': 1000, 'MCL': 100, // CL is $1000 per point ($10/tick)
                'GC': 100, 'MGC': 10,   // GC is $100 per point ($10/tick)
                '6E': 125000, // FX futures are weird, might skip
                'RTY': 50, 'M2K': 5
            };

            let fixedCount = 0;
            db.transaction(() => {
                for (const t of trades as any[]) {
                    // 1. Identify Point Value
                    let pv = 0;
                    const mkt = (t.market || '').toUpperCase();
                    if (POINT_VALUES[mkt]) pv = POINT_VALUES[mkt];
                    // Heuristic for NQ/ES if simple match fails? No, stick to strict.

                    if (pv > 0) {
                        // 2. Calculate Distance = Risk($) / (Contracts * PointValue)
                        const distance = t.risk / (t.contracts * pv);

                        // 3. Derive Initial SL
                        let derivedSL = 0;
                        if (t.direction === 'Long') derivedSL = t.entry_price - distance;
                        else derivedSL = t.entry_price + distance; // Short

                        // 4. Update if significantly different from current initial_sl (or if initial_sl matches planned_sl which might be BE)
                        // Actually, just overwrite to be safe, as Risk($) is the Source of Truth for "Initial Risk"
                        if (derivedSL > 0) {
                            updateStmt.run(derivedSL, t.id);
                            fixedCount++;
                        }
                    }
                }
            })();
            console.log(`Migrating: Recovered Initial Risk for ${fixedCount} trades.`);
        }
    } catch (err) {
        console.error('Migration Error (Fix Initial Risk):', err);
    }

    // CLEANUP: Remove old API keys to prevent leaks
    try {
        db.prepare("DELETE FROM settings WHERE key IN ('fmp_api_key', 'finnhub_api_key')").run();
    } catch (err) {
        console.error('Cleanup Error (api keys):', err);
    }

    // MIGRATION: Add pre-calculated trade metrics (heat_percent, mfe_r, mae_r, profit_capture_percent)
    try {
        const tableInfo = db.pragma('table_info(trades)') as any[];
        const hasHeatPercent = tableInfo.some(col => col.name === 'heat_percent');

        if (!hasHeatPercent) {
            console.log('Migrating: Adding pre-calculated metric columns to trades table...');
            db.exec('ALTER TABLE trades ADD COLUMN heat_percent REAL');
            db.exec('ALTER TABLE trades ADD COLUMN mfe_r REAL');
            db.exec('ALTER TABLE trades ADD COLUMN mae_r REAL');
            db.exec('ALTER TABLE trades ADD COLUMN profit_capture_percent REAL');

            // Backfill existing trades
            const { computeTradeMetrics } = require('./trades');
            const allTrades = db.prepare('SELECT * FROM trades').all() as any[];
            const updateStmt = db.prepare(
                'UPDATE trades SET heat_percent = ?, mfe_r = ?, mae_r = ?, profit_capture_percent = ? WHERE id = ?'
            );

            let backfilled = 0;
            db.transaction(() => {
                for (const t of allTrades) {
                    const metrics = computeTradeMetrics({
                        direction: t.direction,
                        entryPrice: t.entry_price,
                        exitPrice: t.exit_price,
                        initialSL: t.initial_sl,
                        maePrice: t.mae_price,
                        mfePrice: t.mfe_price,
                    });
                    updateStmt.run(
                        metrics.heatPercent ?? null,
                        metrics.mfeR ?? null,
                        metrics.maeR ?? null,
                        metrics.profitCapturePercent ?? null,
                        t.id
                    );
                    backfilled++;
                }
            })();
            console.log(`Migrating: Backfilled metrics for ${backfilled} trades.`);
        }
    } catch (err) {
        console.error('Migration Error (trade metrics):', err);
    }

    // MIGRATION: Add ai_verdict column
    try {
        const tableInfo = db.pragma('table_info(trades)') as any[];
        const hasVerdict = tableInfo.some(col => col.name === 'ai_verdict');

        if (!hasVerdict) {
            console.log('Migrating: Adding ai_verdict column to trades table...');
            db.exec('ALTER TABLE trades ADD COLUMN ai_verdict TEXT');
        }
    } catch (err) {
        console.error('Migration Failed (ai_verdict):', err);
    }

    // MIGRATION: Add meta column (JSON)
    try {
        const tableInfo = db.pragma('table_info(trades)') as any[];
        const hasMeta = tableInfo.some(col => col.name === 'meta');

        if (!hasMeta) {
            console.log('Migrating: Adding meta column to trades table...');
            db.exec('ALTER TABLE trades ADD COLUMN meta TEXT');
        }
    } catch (err) {
        console.error('Migration Failed (meta):', err);
    }

    return db;
}

export function getDB() {
    if (!db) {
        throw new Error('Database not initialized. Call initDB() first.');
    }
    return db;
}
