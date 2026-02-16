"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
exports.getDB = getDB;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const schema_1 = require("./schema");
let db = null;
function initDB() {
    if (db)
        return db;
    // Ensure userData path is available (this runs in main process)
    const userDataPath = electron_1.app.getPath('userData');
    const dbPath = path_1.default.join(userDataPath, 'tradeslate.db');
    console.log('Database path:', dbPath);
    db = new better_sqlite3_1.default(dbPath);
    db.pragma('journal_mode = WAL');
    // Run schema migration (creates tables if missing)
    db.exec(schema_1.schema);
    // MIGRATION: Add account_id to trades if missing
    try {
        const tableInfo = db.pragma('table_info(trades)');
        const hasAccountId = tableInfo.some(col => col.name === 'account_id');
        if (!hasAccountId) {
            console.log('Migrating: Adding account_id to trades table...');
            db.exec('ALTER TABLE trades ADD COLUMN account_id TEXT REFERENCES accounts(id)');
        }
    }
    catch (err) {
        console.error('Migration Error (account_id):', err);
    }
    // MIGRATION: Ensure at least one account exists and assign orphan trades
    try {
        const accountCount = db.prepare('SELECT COUNT(*) as count FROM accounts').get();
        if (accountCount.count === 0) {
            console.log('Migrating: Creating default "Main Account"');
            const defaultId = 'main-account'; // Fixed ID for simplicity, or UUID
            db.prepare('INSERT INTO accounts (id, name, is_aggregated) VALUES (?, ?, ?)').run(defaultId, 'Main Account', 1);
            // Assign all existing trades to this account
            const result = db.prepare('UPDATE trades SET account_id = ? WHERE account_id IS NULL').run(defaultId);
            console.log(`Migrated ${result.changes} trades to Main Account.`);
        }
    }
    catch (err) {
        console.error('Migration Error (default account):', err);
    }
    return db;
}
function getDB() {
    if (!db) {
        throw new Error('Database not initialized. Call initDB() first.');
    }
    return db;
}
