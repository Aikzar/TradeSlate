import { getDB } from './db/index';
import { randomUUID } from 'crypto';

export interface Account {
    id: string;
    name: string;
    isAggregated: boolean;
    color?: string;
    createdAt: string;
}

export const AccountsService = {
    getAll: (): Account[] => {
        const db = getDB();
        const rows = db.prepare('SELECT * FROM accounts ORDER BY created_at ASC').all();
        return rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            isAggregated: Boolean(row.is_aggregated),
            color: row.color,
            createdAt: row.created_at
        }));
    },

    create: (name: string, color?: string): Account => {
        const db = getDB();
        const id = randomUUID();
        const now = new Date().toISOString();

        db.prepare('INSERT INTO accounts (id, name, is_aggregated, color, created_at) VALUES (?, ?, ?, ?, ?)')
            .run(id, name, 1, color || null, now); // Default is_aggregated to true

        return { id, name, isAggregated: true, color, createdAt: now };
    },

    update: (id: string, updates: Partial<Account>) => {
        const db = getDB();
        const current = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
        if (!current) throw new Error('Account not found');

        if (updates.name !== undefined) {
            db.prepare('UPDATE accounts SET name = ? WHERE id = ?').run(updates.name, id);
        }
        if (updates.isAggregated !== undefined) {
            db.prepare('UPDATE accounts SET is_aggregated = ? WHERE id = ?').run(updates.isAggregated ? 1 : 0, id);
        }
        if (updates.color !== undefined) {
            db.prepare('UPDATE accounts SET color = ? WHERE id = ?').run(updates.color, id);
        }
    },

    delete: (id: string) => {
        const db = getDB();
        // Check for trades first? For now, we'll allow it but maybe warn user in frontend.
        // Ideally we should CASCADE or block. Let's block if trades exist.
        const tradeCount = db.prepare('SELECT COUNT(*) as count FROM trades WHERE account_id = ?').get(id) as { count: number };
        if (tradeCount.count > 0) {
            throw new Error(`Cannot delete account with ${tradeCount.count} trades. Please delete trades first.`);
        }

        db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    }
};
