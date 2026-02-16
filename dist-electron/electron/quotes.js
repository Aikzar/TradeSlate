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
const defaultQuotes_1 = require("./defaultQuotes");
class QuotesService {
    // Default CSV path for initial seed
    // Dynamic CSV path resolution
    static getCsvPath() {
        const { app } = require('electron');
        // If packaged, resources are in resources/Assets
        // If dev, they are in project root/Assets
        // Note: process.resourcesPath in dev usually points to node_modules/electron/dist/resources, which is NOT what we want.
        // So we check isPackaged.
        if (app.isPackaged) {
            const path = require('path');
            return path.join(process.resourcesPath, 'app', 'Assets', '365_trading_quotes_affirmations.csv');
            // In asar=false (nsis default for some), it might be inside resources/app/Assets
            // Let's rely on standard path.join(process.resourcesPath, 'Assets'...) if we used extraResources
            // But we used "files": ["Assets/**/*"], so it's likely in resources/app/Assets if asar=false.
            // If asar=true, it would be packed.
            // Let's assume standard unpacking for now, but safest is relative to app path.
            return path.join(app.getAppPath(), 'Assets', '365_trading_quotes_affirmations.csv');
        }
        else {
            const path = require('path');
            // In dev, app.getAppPath() is the project root
            return path.join(app.getAppPath(), 'Assets', '365_trading_quotes_affirmations.csv');
        }
    }
    static init() {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if quotes exist and seed if necessary using the robust logic
            yield this.seedDefaults(false);
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
            // Get Settings
            const frequency = (yield settings_1.SettingsRepository.get('quote_frequency')) || 'daily'; // daily, always, hourly
            const lastId = parseInt((yield settings_1.SettingsRepository.get('last_quote_id')) || '0');
            const lastTimeStr = yield settings_1.SettingsRepository.get('last_quote_time');
            const lastTime = lastTimeStr ? new Date(lastTimeStr) : new Date(0);
            const now = new Date();
            let shouldFetchNew = false;
            const freqVal = frequency;
            // Detect frequency change during session
            const frequencyChanged = this.lastSessionFrequency !== null && this.lastSessionFrequency !== freqVal;
            this.lastSessionFrequency = freqVal;
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
                // "Always" (Every Reopen) should only fetch ONCE per app session
                // plus if the user just switched TO "always" from something else
                if (!this.sessionQuoteFetched || frequencyChanged) {
                    shouldFetchNew = true;
                }
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
                return null;
            const random = allQuotes[Math.floor(Math.random() * allQuotes.length)];
            this.sessionQuoteFetched = true;
            settings_1.SettingsRepository.set('last_quote_id', random.id.toString());
            settings_1.SettingsRepository.set('last_quote_time', now.toISOString());
            return random.text;
        });
    }
    static seedDefaults() {
        return __awaiter(this, arguments, void 0, function* (force = false) {
            if (!force) {
                const db = (0, db_1.getDB)();
                const count = db.prepare('SELECT COUNT(*) as c FROM quotes').get();
                if (count.c > 0)
                    return 0;
            }
            console.log("Seeding default quotes...");
            let count = 0;
            // Try CSV first
            try {
                const csvPath = this.getCsvPath();
                if (fs_1.default.existsSync(csvPath)) {
                    console.log(`Found CSV at ${csvPath}, seeding...`);
                    count = yield this.seedFromcsv(csvPath);
                }
            }
            catch (e) {
                console.error("Failed to seed from CSV:", e);
            }
            // If CSV failed or was empty, fall back to defaults
            if (count === 0) {
                console.log("No CSV quotes loaded. Seeding hardcoded defaults.");
                const db = (0, db_1.getDB)();
                const insert = db.prepare('INSERT INTO quotes (text, is_custom, author) VALUES (?, 0, ?)');
                const transaction = db.transaction(() => {
                    defaultQuotes_1.DEFAULT_QUOTES.forEach((q) => insert.run(q, null));
                });
                try {
                    transaction();
                    return defaultQuotes_1.DEFAULT_QUOTES.length;
                }
                catch (err) {
                    console.error("Failed to seed defaults:", err);
                    throw err;
                }
            }
            return count;
        });
    }
    // Seed helper
    static seedFromcsv(csvPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!fs_1.default.existsSync(csvPath))
                return 0;
            const content = fs_1.default.readFileSync(csvPath, 'utf-8');
            const lines = content.split(/\r?\n/).slice(1); // skip header
            const db = (0, db_1.getDB)();
            const insert = db.prepare('INSERT INTO quotes (text, is_custom) VALUES (?, 0)');
            let count = 0;
            const transaction = db.transaction(() => {
                lines.forEach(line => {
                    let q = line.trim();
                    if (q.length === 0)
                        return;
                    // Basic CSV clean - remove surrounding quotes if both exist
                    if (q.startsWith('"') && q.endsWith('"')) {
                        q = q.slice(1, -1);
                    }
                    // Handle double quotes escaped as ""
                    q = q.replace(/""/g, '"');
                    insert.run(q);
                    count++;
                });
            });
            transaction();
            return count;
        });
    }
}
exports.QuotesService = QuotesService;
Object.defineProperty(QuotesService, "sessionQuoteFetched", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: false
});
Object.defineProperty(QuotesService, "lastSessionFrequency", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: null
});
