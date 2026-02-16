"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JournalRepository = void 0;
const index_1 = require("./index");
const crypto_1 = require("crypto");
function fromRow(row) {
    return {
        id: row.id,
        date: row.date,
        content: row.content,
        mood: row.mood,
        tags: JSON.parse(row.tags || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
exports.JournalRepository = {
    getAll: () => {
        const db = (0, index_1.getDB)();
        const rows = db.prepare('SELECT * FROM journal_entries ORDER BY date DESC').all();
        return rows.map(fromRow);
    },
    getByDate: (date) => {
        const db = (0, index_1.getDB)();
        const row = db.prepare('SELECT * FROM journal_entries WHERE date = ?').get(date);
        return row ? fromRow(row) : undefined;
    },
    save: (entry) => {
        const db = (0, index_1.getDB)();
        // Check if exists for date
        const existing = db.prepare('SELECT * FROM journal_entries WHERE date = ?').get(entry.date);
        const now = new Date().toISOString();
        if (existing) {
            // Update
            const row = existing;
            const stmt = db.prepare(`
                UPDATE journal_entries SET
                    content = @content,
                    mood = @mood,
                    tags = @tags,
                    updated_at = @updatedAt
                WHERE id = @id
            `);
            stmt.run({
                id: row.id,
                content: entry.content,
                mood: entry.mood,
                tags: JSON.stringify(entry.tags),
                updatedAt: now
            });
            return Object.assign(Object.assign(Object.assign({}, fromRow(row)), entry), { updatedAt: now });
        }
        else {
            // Insert
            const id = (0, crypto_1.randomUUID)();
            const stmt = db.prepare(`
                INSERT INTO journal_entries (id, date, content, mood, tags, created_at, updated_at)
                VALUES (@id, @date, @content, @mood, @tags, @createdAt, @updatedAt)
            `);
            stmt.run({
                id,
                date: entry.date,
                content: entry.content,
                mood: entry.mood,
                tags: JSON.stringify(entry.tags),
                createdAt: now,
                updatedAt: now
            });
            return {
                id,
                date: entry.date,
                content: entry.content,
                mood: entry.mood,
                tags: entry.tags,
                createdAt: now,
                updatedAt: now
            };
        }
    }
};
