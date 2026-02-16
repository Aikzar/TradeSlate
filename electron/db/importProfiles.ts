import { getDB } from './index';
import crypto from 'crypto';

export interface ImportProfileRow {
    id: string;
    name: string;
    type: string;
    column_mappings: string; // JSON
    date_format: string | null;
    delimiter: string;
    created_at: string;
    updated_at: string;
}

export const ImportProfileRepository = {
    getAll: (): ImportProfileRow[] => {
        const db = getDB();
        return db.prepare('SELECT * FROM import_profiles ORDER BY name').all() as ImportProfileRow[];
    },

    getById: (id: string): ImportProfileRow | null => {
        const db = getDB();
        return db.prepare('SELECT * FROM import_profiles WHERE id = ?').get(id) as ImportProfileRow | null;
    },

    create: (name: string, columnMappings: object, dateFormat?: string, delimiter: string = ','): string => {
        const db = getDB();
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        db.prepare(`
            INSERT INTO import_profiles (id, name, type, column_mappings, date_format, delimiter, created_at, updated_at)
            VALUES (?, ?, 'custom', ?, ?, ?, ?, ?)
        `).run(id, name, JSON.stringify(columnMappings), dateFormat || null, delimiter, now, now);

        return id;
    },

    update: (id: string, data: { name?: string; columnMappings?: object; dateFormat?: string; delimiter?: string }): void => {
        const db = getDB();
        const now = new Date().toISOString();
        const existing = ImportProfileRepository.getById(id);
        if (!existing) throw new Error('Profile not found');

        const updates: string[] = ['updated_at = ?'];
        const values: any[] = [now];

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.columnMappings !== undefined) {
            updates.push('column_mappings = ?');
            values.push(JSON.stringify(data.columnMappings));
        }
        if (data.dateFormat !== undefined) {
            updates.push('date_format = ?');
            values.push(data.dateFormat);
        }
        if (data.delimiter !== undefined) {
            updates.push('delimiter = ?');
            values.push(data.delimiter);
        }

        values.push(id);
        db.prepare(`UPDATE import_profiles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    },

    delete: (id: string): void => {
        const db = getDB();
        db.prepare('DELETE FROM import_profiles WHERE id = ?').run(id);
    }
};
