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
        const accounts = db.prepare('SELECT * FROM accounts').all();
        const importProfiles = db.prepare('SELECT * FROM import_profiles').all();
        const weeklyReviews = db.prepare('SELECT * FROM weekly_reviews').all();
        // 1. Backfill duration and win status for export
        const enrichedTrades = trades.map((t) => {
            // Calculate duration if missing or 0
            if ((!t.duration_seconds || t.duration_seconds === 0) && t.entry_date_time && t.exit_time) {
                const start = new Date(t.entry_date_time).getTime();
                const end = new Date(t.exit_time).getTime();
                const duration = Math.max(0, (end - start) / 1000);
                t.duration_seconds = duration;
            }
            // Calculate win status if missing (simple check based on PnL)
            // Note: DB stores win as 1 or 0 (or null). Check consistency with PnL.
            // If PnL > 0, win should be 1.
            const pnl = t.pnl || 0;
            if (pnl > 0)
                t.win = 1;
            else if (pnl < 0)
                t.win = 0;
            // Remove unused fields
            delete t.emotion_pre;
            delete t.emotion_post;
            delete t.tilt_score;
            delete t.session;
            return t;
        });
        return {
            version: 1,
            timestamp: new Date().toISOString(),
            trades: enrichedTrades,
            journal,
            settings,
            accounts,
            importProfiles,
            weeklyReviews
        };
    }),
    importData: (data) => __awaiter(void 0, void 0, void 0, function* () {
        const db = (0, index_1.getDB)();
        // Transaction to ensure atomicity
        const importTransaction = db.transaction((backup) => {
            // 1. Accounts (Import explicitly provided accounts first)
            const existingAccountIds = new Set();
            if (backup.accounts && Array.isArray(backup.accounts)) {
                const insertAccount = db.prepare(`
                    INSERT OR REPLACE INTO accounts (id, name, is_aggregated, color, created_at)
                    VALUES (@id, @name, @is_aggregated, @color, @created_at)
                `);
                for (const a of backup.accounts) {
                    insertAccount.run(a);
                    existingAccountIds.add(a.id);
                }
            }
            // 2. Discover missing accounts from trades and auto-generate them
            if (backup.trades && Array.isArray(backup.trades)) {
                const insertAccount = db.prepare(`
                    INSERT OR IGNORE INTO accounts (id, name, is_aggregated, color, created_at)
                    VALUES (?, ?, 1, '#3b82f6', datetime('now'))
                `);
                for (const t of backup.trades) {
                    if (t.account_id && !existingAccountIds.has(t.account_id)) {
                        insertAccount.run(t.account_id, t.account_id); // Use ID as name for auto-generated
                        existingAccountIds.add(t.account_id);
                    }
                }
            }
            // 3. Trades
            if (backup.trades && Array.isArray(backup.trades)) {
                const insertTrade = db.prepare(`
                    INSERT OR REPLACE INTO trades (
                        id, account_id, market, direction, entry_date_time, exit_time, 
                        setup, entry_trigger, confluences, entry_price, exit_price, 
                        planned_sl, planned_tp, contracts, risk, pnl, planned_rr, 
                        achieved_r, win, duration_seconds, mae_price, mfe_price, 
                        heat_percent, mfe_r, mae_r, profit_capture_percent,
                        notes_raw, notes_clean, ai_verdict, emotion_pre, emotion_post, tilt_score, 
                        session, tags, mistakes, images, image_annotations, video_url, 
                        status, created_at, updated_at
                    ) VALUES (
                        @id, @account_id, @market, @direction, @entry_date_time, @exit_time, 
                        @setup, @entry_trigger, @confluences, @entry_price, @exit_price, 
                        @planned_sl, @planned_tp, @contracts, @risk, @pnl, @planned_rr, 
                        @achieved_r, @win, @duration_seconds, @mae_price, @mfe_price, 
                        @heat_percent, @mfe_r, @mae_r, @profit_capture_percent,
                        @notes_raw, @notes_clean, @ai_verdict, @emotion_pre, @emotion_post, @tilt_score, 
                        @session, @tags, @mistakes, @images, @image_annotations, @video_url, 
                        @status, @created_at, @updated_at
                    )
                 `);
                for (const t of backup.trades) {
                    insertTrade.run(t);
                }
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
            // Import Profiles
            if (backup.importProfiles && Array.isArray(backup.importProfiles)) {
                const insertProfile = db.prepare(`
                    INSERT OR REPLACE INTO import_profiles (id, name, type, column_mappings, date_format, delimiter, created_at, updated_at)
                    VALUES (@id, @name, @type, @column_mappings, @date_format, @delimiter, @created_at, @updated_at)
                `);
                for (const p of backup.importProfiles)
                    insertProfile.run(p);
            }
            // Weekly Reviews
            if (backup.weeklyReviews && Array.isArray(backup.weeklyReviews)) {
                const insertReview = db.prepare(`
                    INSERT OR REPLACE INTO weekly_reviews (id, week_label, start_date, end_date, json_data, created_at, updated_at)
                    VALUES (@id, @week_label, @start_date, @end_date, @json_data, @created_at, @updated_at)
                `);
                for (const r of backup.weeklyReviews)
                    insertReview.run(r);
            }
        });
        // Disable FK checks during import to handle legacy backups or circular refs
        db.pragma('foreign_keys = OFF');
        try {
            importTransaction(data);
        }
        finally {
            db.pragma('foreign_keys = ON');
        }
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
