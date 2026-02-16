
import { getDB } from './index';

export interface WeeklyReview {
    id: string; // "YYYY-MM-DD" (Monday)
    week_label: string;
    start_date: string;
    end_date: string;
    json_data: string;
    created_at?: string;
    updated_at?: string;
}

export const WeeklyReviewRepository = {
    getAll: () => {
        try {
            const db = getDB();
            const stmt = db.prepare('SELECT * FROM weekly_reviews ORDER BY start_date DESC');
            const rows = stmt.all();
            return rows.map((row: any) => ({
                ...row,
                jsonData: JSON.parse(row.json_data)
            }));
        } catch (error) {
            console.error('Failed to get all weekly reviews:', error);
            return [];
        }
    },

    getById: (id: string) => {
        try {
            const db = getDB();
            const stmt = db.prepare('SELECT * FROM weekly_reviews WHERE id = ?');
            const row = stmt.get(id) as any;
            if (!row) return null;
            return {
                ...row,
                jsonData: JSON.parse(row.json_data)
            };
        } catch (error) {
            console.error('Failed to get weekly review by id:', error);
            throw error;
        }
    },

    save: (review: any) => {
        try {
            const db = getDB();
            const stmt = db.prepare(`
                INSERT INTO weekly_reviews (id, week_label, start_date, end_date, json_data, updated_at)
                VALUES (@id, @week_label, @start_date, @end_date, @json_data, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    json_data = excluded.json_data,
                    updated_at = CURRENT_TIMESTAMP
            `);

            // Ensure json_data is a string
            const dataToSave = {
                ...review,
                json_data: typeof review.json_data === 'object' ? JSON.stringify(review.json_data) : review.json_data
            };

            stmt.run(dataToSave);
            return true;
        } catch (error) {
            console.error('Failed to save weekly review:', error);
            throw error;
        }
    },

    delete: (id: string) => {
        try {
            const db = getDB();
            const stmt = db.prepare('DELETE FROM weekly_reviews WHERE id = ?');
            stmt.run(id);
            return true;
        } catch (error) {
            console.error('Failed to delete weekly review:', error);
            throw error;
        }
    }
};
