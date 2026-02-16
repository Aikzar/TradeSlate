"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountsService = void 0;
const index_1 = require("./db/index");
const crypto_1 = require("crypto");
exports.AccountsService = {
    getAll: () => {
        const db = (0, index_1.getDB)();
        const rows = db.prepare('SELECT * FROM accounts ORDER BY created_at ASC').all();
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            isAggregated: Boolean(row.is_aggregated),
            color: row.color,
            createdAt: row.created_at
        }));
    },
    create: (name, color) => {
        const db = (0, index_1.getDB)();
        const id = (0, crypto_1.randomUUID)();
        const now = new Date().toISOString();
        db.prepare('INSERT INTO accounts (id, name, is_aggregated, color, created_at) VALUES (?, ?, ?, ?, ?)')
            .run(id, name, 1, color || null, now); // Default is_aggregated to true
        return { id, name, isAggregated: true, color, createdAt: now };
    },
    update: (id, updates) => {
        const db = (0, index_1.getDB)();
        const current = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id);
        if (!current)
            throw new Error('Account not found');
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
    delete: (id) => {
        const db = (0, index_1.getDB)();
        // Check for trades first? For now, we'll allow it but maybe warn user in frontend.
        // Ideally we should CASCADE or block. Let's block if trades exist.
        const tradeCount = db.prepare('SELECT COUNT(*) as count FROM trades WHERE account_id = ?').get(id);
        if (tradeCount.count > 0) {
            throw new Error(`Cannot delete account with ${tradeCount.count} trades. Please delete trades first.`);
        }
        db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
    }
};
