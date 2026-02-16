
import { getDB } from './index';
import { JournalEntry } from '../../src/types';
import { randomUUID } from 'crypto';

function fromRow(row: any): JournalEntry {
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

export const JournalRepository = {
    getAll: (): JournalEntry[] => {
        const db = getDB();
        const rows = db.prepare('SELECT * FROM journal_entries ORDER BY date DESC').all();
        return rows.map(fromRow);
    },

    getByDate: (date: string): JournalEntry | undefined => {
        const db = getDB();
        const row = db.prepare('SELECT * FROM journal_entries WHERE date = ?').get(date);
        return row ? fromRow(row) : undefined;
    },

    save: (entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): JournalEntry => {
        const db = getDB();

        // Check if exists for date
        const existing = db.prepare('SELECT * FROM journal_entries WHERE date = ?').get(entry.date);

        const now = new Date().toISOString();

        if (existing) {
            // Update
            const row = existing as any;
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

            return { ...fromRow(row), ...entry, updatedAt: now };
        } else {
            // Insert
            const id = randomUUID();
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
