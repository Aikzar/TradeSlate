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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuotesService = void 0;
const db_1 = require("./db");
const fs_1 = __importDefault(require("fs"));
const settings_1 = require("./db/settings");
class QuotesService {
    static init() {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if quotes exist
            const db = (0, db_1.getDB)();
            const count = db.prepare('SELECT COUNT(*) as c FROM quotes').get();
            if (count.c === 0) {
                console.log("Seeding quotes from CSV...");
                yield this.seedFromcsv();
            }
        });
    }
    static getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            return (0, db_1.getDB)().prepare('SELECT * FROM quotes ORDER BY id DESC').all();
        });
    }
    static add(text, author) {
        return __awaiter(this, void 0, void 0, function* () {
            const stmt = (0, db_1.getDB)().prepare('INSERT INTO quotes (text, author, is_custom) VALUES (?, ?, 1)');
            const info = stmt.run(text, author || null);
            return info.lastInsertRowid;
        });
    }
    static delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, db_1.getDB)().prepare('DELETE FROM quotes WHERE id = ?').run(id);
        });
    }
    static clearAll() {
        return __awaiter(this, void 0, void 0, function* () {
            (0, db_1.getDB)().prepare('DELETE FROM quotes').run();
        });
    }
    static update(id, text) {
        return __awaiter(this, void 0, void 0, function* () {
            (0, db_1.getDB)().prepare('UPDATE quotes SET text = ? WHERE id = ?').run(text, id);
        });
    }
    static importCustomCSV(content) {
        return __awaiter(this, void 0, void 0, function* () {
            const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
            let count = 0;
            const db = (0, db_1.getDB)();
            const insert = db.prepare('INSERT INTO quotes (text, author, is_custom) VALUES (?, ?, 1)');
            const transaction = db.transaction((lines) => {
                var _a, _b;
                for (const line of lines) {
                    // assume format "Quote","Author" or just "Quote"
                    const clean = line.replace(/^"|"$/g, '').replace(/""/g, '"');
                    const parts = clean.split(',');
                    const text = (_a = parts[0]) === null || _a === void 0 ? void 0 : _a.trim();
                    const author = parts.length > 1 ? (_b = parts[1]) === null || _b === void 0 ? void 0 : _b.trim() : null;
                    if (text) {
                        insert.run(text, author);
                        count++;
                    }
                }
            });
            transaction(lines);
            return count;
        });
    }
    static getQuoteOfTheDay() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            // Get Settings
            const frequency = (yield settings_1.SettingsRepository.get('quote_frequency')) || 'daily'; // daily, always, hourly
            const lastId = parseInt(((_a = (yield settings_1.SettingsRepository.get('last_quote_id'))) === null || _a === void 0 ? void 0 : _a.value) || '0');
            const lastTimeStr = (_b = (yield settings_1.SettingsRepository.get('last_quote_time'))) === null || _b === void 0 ? void 0 : _b.value;
            const lastTime = lastTimeStr ? new Date(lastTimeStr) : new Date(0);
            const now = new Date();
            let shouldFetchNew = false;
            // Handle value object from repository wrapping
            const freqVal = typeof frequency === 'object' ? frequency.value : frequency;
            if (freqVal === 'daily') {
                if (lastTime.getDate() !== now.getDate() || lastTime.getMonth() !== now.getMonth() || lastTime.getFullYear() !== now.getFullYear()) {
                    shouldFetchNew = true;
                }
            }
            else if (freqVal === 'hourly') {
                if (now.getTime() - lastTime.getTime() > 1000 * 60 * 60) {
                    shouldFetchNew = true;
                }
            }
            else if (freqVal === 'always') {
                shouldFetchNew = true;
            }
            // If 'daily' and we have a valid lastId and it's same day, return that quote from DB
            if (!shouldFetchNew && lastId > 0) {
                const cached = (0, db_1.getDB)().prepare('SELECT text FROM quotes WHERE id = ?').get(lastId);
                if (cached)
                    return cached.text;
            }
            // Fetch new random quote
            const allQuotes = yield this.getAll();
            if (allQuotes.length === 0)
                return "Trade the plan, not your emotions.";
            const random = allQuotes[Math.floor(Math.random() * allQuotes.length)];
            settings_1.SettingsRepository.set('last_quote_id', random.id.toString());
            settings_1.SettingsRepository.set('last_quote_time', now.toISOString());
            return random.text;
        });
    }
    // Seed helper
    static seedFromcsv() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fs_1.default.existsSync(this.csvPath)) {
                // Fallback seeds
                const defaults = [
                    "Trade the plan, not your emotions.",
                    "Consistency is key.",
                    "Protect your capital at all costs."
                ];
                const insert = (0, db_1.getDB)().prepare('INSERT INTO quotes (text, is_custom) VALUES (?, 0)');
                defaults.forEach(t => insert.run(t));
                return;
            }
            const content = fs_1.default.readFileSync(this.csvPath, 'utf-8');
            const lines = content.split(/\r?\n/).slice(1); // skip header
            const db = (0, db_1.getDB)();
            const insert = db.prepare('INSERT INTO quotes (text, is_custom) VALUES (?, 0)');
            const transaction = db.transaction(() => {
                lines.forEach(line => {
                    let q = line.trim();
                    if (q.length === 0)
                        return;
                    if (q.startsWith('"') && q.endsWith('"'))
                        q = q.substring(1, q.length - 1);
                    q = q.replace(/\?/g, '—');
                    insert.run(q);
                });
            });
            transaction();
        });
    }
}
exports.QuotesService = QuotesService;
// Default CSV path for initial seed
Object.defineProperty(QuotesService, "csvPath", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: "C:\\Users\\Jens\\Antigravity Projects\\TradeSlate\\Quote-Affirmations\\365_trading_quotes_affirmations.csv"
});
