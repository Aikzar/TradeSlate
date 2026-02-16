"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WeeklyReviewRepository = void 0;
const index_1 = require("./index");
exports.WeeklyReviewRepository = {
    getAll: () => {
        try {
            const db = (0, index_1.getDB)();
            const stmt = db.prepare('SELECT * FROM weekly_reviews ORDER BY start_date DESC');
            const rows = stmt.all();
            return rows.map((row) => (Object.assign(Object.assign({}, row), { jsonData: JSON.parse(row.json_data) })));
        }
        catch (error) {
            console.error('Failed to get all weekly reviews:', error);
            return [];
        }
    },
    getById: (id) => {
        try {
            const db = (0, index_1.getDB)();
            const stmt = db.prepare('SELECT * FROM weekly_reviews WHERE id = ?');
            const row = stmt.get(id);
            if (!row)
                return null;
            return Object.assign(Object.assign({}, row), { jsonData: JSON.parse(row.json_data) });
        }
        catch (error) {
            console.error('Failed to get weekly review by id:', error);
            throw error;
        }
    },
    save: (review) => {
        try {
            const db = (0, index_1.getDB)();
            const stmt = db.prepare(`
                INSERT INTO weekly_reviews (id, week_label, start_date, end_date, json_data, updated_at)
                VALUES (@id, @week_label, @start_date, @end_date, @json_data, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    json_data = excluded.json_data,
                    updated_at = CURRENT_TIMESTAMP
            `);
            // Ensure json_data is a string
            const dataToSave = Object.assign(Object.assign({}, review), { json_data: typeof review.json_data === 'object' ? JSON.stringify(review.json_data) : review.json_data });
            stmt.run(dataToSave);
            return true;
        }
        catch (error) {
            console.error('Failed to save weekly review:', error);
            throw error;
        }
    },
    delete: (id) => {
        try {
            const db = (0, index_1.getDB)();
            const stmt = db.prepare('DELETE FROM weekly_reviews WHERE id = ?');
            stmt.run(id);
            return true;
        }
        catch (error) {
            console.error('Failed to delete weekly review:', error);
            throw error;
        }
    }
};
