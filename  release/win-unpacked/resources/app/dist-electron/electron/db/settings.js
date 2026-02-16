"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsRepository = void 0;
const index_1 = require("./index");
exports.SettingsRepository = {
    get: (key) => {
        const db = (0, index_1.getDB)();
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        if (!row)
            return null;
        try {
            return JSON.parse(row.value);
        }
        catch (_a) {
            return row.value; // Fallback if string
        }
    },
    set: (key, value) => {
        const db = (0, index_1.getDB)();
        // Upsert
        const stmt = db.prepare(`
            INSERT INTO settings (key, value) VALUES (@key, @value)
            ON CONFLICT(key) DO UPDATE SET value = @value
        `);
        stmt.run({ key, value });
    },
    exportData: () => __awaiter(void 0, void 0, void 0, function* () {
        const db = (0, index_1.getDB)();
        const trades = db.prepare('SELECT * FROM trades').all();
        const journal = db.prepare('SELECT * FROM journal_entries').all();
        const settings = db.prepare('SELECT * FROM settings').all();
        return {
            version: 1,
            timestamp: new Date().toISOString(),
            trades,
            journal,
            settings
        };
    }),
    importData: (data) => __awaiter(void 0, void 0, void 0, function* () {
        const db = (0, index_1.getDB)();
        // Transaction to ensure atomicity
        const importTransaction = db.transaction((backup) => {
            // clear existing (Optional: for MVP overwrite is standard)
            // db.prepare('DELETE FROM trades').run();
            // db.prepare('DELETE FROM journal_entries').run();
            // db.prepare('DELETE FROM settings').run();
            // Actually, for safety, let's use UPSERT or just INSERT OR REPLACE
            // Trades
            if (backup.trades && Array.isArray(backup.trades)) {
                const insertTrade = db.prepare(`
                    INSERT OR REPLACE INTO trades (id, market, direction, entry_date_time, exit_time, entry_price, exit_price, contracts, pnl, status, notes_raw, setup, tags, mistakes, images, created_at, updated_at)
                    VALUES (@id, @market, @direction, @entry_date_time, @exit_time, @entry_price, @exit_price, @contracts, @pnl, @status, @notes_raw, @setup, @tags, @mistakes, @images, @created_at, @updated_at)
                 `);
                for (const t of backup.trades)
                    insertTrade.run(t);
            }
            // Journal
            if (backup.journal && Array.isArray(backup.journal)) {
                const insertJournal = db.prepare(`
                    INSERT OR REPLACE INTO journal_entries (id, date, content, mood, tags, created_at, updated_at)
                    VALUES (@id, @date, @content, @mood, @tags, @created_at, @updated_at)
                `);
                for (const j of backup.journal)
                    insertJournal.run(j);
            }
            // Settings
            if (backup.settings && Array.isArray(backup.settings)) {
                const insertSetting = db.prepare(`
                    INSERT OR REPLACE INTO settings (key, value) VALUES (@key, @value)
                `);
                for (const s of backup.settings)
                    insertSetting.run(s);
            }
        });
        importTransaction(data);
    }),
    getAll: () => {
        const db = (0, index_1.getDB)();
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        rows.forEach((row) => {
            try {
                settings[row.key] = JSON.parse(row.value);
            }
            catch (_a) {
                settings[row.key] = row.value;
            }
        });
        return settings;
    }
};
