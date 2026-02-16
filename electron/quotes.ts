import { getDB } from './db';
import fs from 'fs';
import { SettingsRepository } from './db/settings';
import { DEFAULT_QUOTES } from './defaultQuotes';

export interface Quote {
    id: number;
    text: string;
    author?: string;
    is_custom: number;
}

export class QuotesService {
    // Default CSV path for initial seed
    // Dynamic CSV path resolution
    private static getCsvPath(): string {
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
        } else {
            const path = require('path');
            // In dev, app.getAppPath() is the project root
            return path.join(app.getAppPath(), 'Assets', '365_trading_quotes_affirmations.csv');
        }
    }



    private static sessionQuoteFetched = false;
    private static lastSessionFrequency: string | null = null;

    static async init() {
        // Check if quotes exist and seed if necessary using the robust logic
        await this.seedDefaults(false);
    }

    static async getAll(): Promise<Quote[]> {
        return getDB().prepare('SELECT * FROM quotes ORDER BY id DESC').all() as Quote[];
    }

    static async add(text: string, author?: string): Promise<number> {
        const stmt = getDB().prepare('INSERT INTO quotes (text, author, is_custom) VALUES (?, ?, 1)');
        const info = stmt.run(text, author || null);
        return info.lastInsertRowid as number;
    }

    static async delete(id: number): Promise<void> {
        getDB().prepare('DELETE FROM quotes WHERE id = ?').run(id);
    }

    static async clearAll(): Promise<void> {
        getDB().prepare('DELETE FROM quotes').run();
    }

    static async update(id: number, text: string): Promise<void> {
        getDB().prepare('UPDATE quotes SET text = ? WHERE id = ?').run(text, id);
    }

    static async importCustomCSV(content: string): Promise<number> {
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
        let count = 0;
        const db = getDB();
        const insert = db.prepare('INSERT INTO quotes (text, author, is_custom) VALUES (?, ?, 1)');

        const transaction = db.transaction((lines: string[]) => {
            for (const line of lines) {
                // assume format "Quote","Author" or just "Quote"
                const clean = line.replace(/^"|"$/g, '').replace(/""/g, '"');
                const parts = clean.split(',');
                const text = parts[0]?.trim();
                const author = parts.length > 1 ? parts[1]?.trim() : null;

                if (text) {
                    insert.run(text, author);
                    count++;
                }
            }
        });

        transaction(lines);
        return count;
    }

    static async getQuoteOfTheDay(): Promise<string | null> {
        // Get Settings
        const frequency = await SettingsRepository.get('quote_frequency') || 'daily'; // daily, always, hourly
        const lastId = parseInt(await SettingsRepository.get('last_quote_id') || '0');
        const lastTimeStr = await SettingsRepository.get('last_quote_time');
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
        } else if (freqVal === 'hourly') {
            if (now.getTime() - lastTime.getTime() > 1000 * 60 * 60) {
                shouldFetchNew = true;
            }
        } else if (freqVal === 'always') {
            // "Always" (Every Reopen) should only fetch ONCE per app session
            // plus if the user just switched TO "always" from something else
            if (!this.sessionQuoteFetched || frequencyChanged) {
                shouldFetchNew = true;
            }
        }

        // If 'daily' and we have a valid lastId and it's same day, return that quote from DB
        if (!shouldFetchNew && lastId > 0) {
            const cached = getDB().prepare('SELECT text FROM quotes WHERE id = ?').get(lastId) as { text: string };
            if (cached) return cached.text;
        }

        // Fetch new random quote
        const allQuotes = await this.getAll();
        if (allQuotes.length === 0) return null;

        const random = allQuotes[Math.floor(Math.random() * allQuotes.length)];

        this.sessionQuoteFetched = true;
        SettingsRepository.set('last_quote_id', random.id.toString());
        SettingsRepository.set('last_quote_time', now.toISOString());

        return random.text;
    }

    static async seedDefaults(force: boolean = false) {
        if (!force) {
            const db = getDB();
            const count = db.prepare('SELECT COUNT(*) as c FROM quotes').get() as { c: number };
            if (count.c > 0) return 0;
        }

        console.log("Seeding default quotes...");
        let count = 0;

        // Try CSV first
        try {
            const csvPath = this.getCsvPath();
            if (fs.existsSync(csvPath)) {
                console.log(`Found CSV at ${csvPath}, seeding...`);
                count = await this.seedFromcsv(csvPath);
            }
        } catch (e) {
            console.error("Failed to seed from CSV:", e);
        }

        // If CSV failed or was empty, fall back to defaults
        if (count === 0) {
            console.log("No CSV quotes loaded. Seeding hardcoded defaults.");
            const db = getDB();
            const insert = db.prepare('INSERT INTO quotes (text, is_custom, author) VALUES (?, 0, ?)');

            const transaction = db.transaction(() => {
                DEFAULT_QUOTES.forEach((q: string) => insert.run(q, null));
            });

            try {
                transaction();
                return DEFAULT_QUOTES.length;
            } catch (err) {
                console.error("Failed to seed defaults:", err);
                throw err;
            }
        }

        return count;
    }

    // Seed helper
    private static async seedFromcsv(csvPath: string): Promise<number> {
        if (!fs.existsSync(csvPath)) return 0;

        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split(/\r?\n/).slice(1); // skip header
        const db = getDB();
        const insert = db.prepare('INSERT INTO quotes (text, is_custom) VALUES (?, 0)');

        let count = 0;
        const transaction = db.transaction(() => {
            lines.forEach(line => {
                let q = line.trim();
                if (q.length === 0) return;
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
    }
}
