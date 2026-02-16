import { getDB } from './db';
import seedData from './seed_data.json';

export class SeedService {
    static async seed() {
        console.log('--- STARTING SEED RESTORE ---');
        const db = getDB();
        const { trades, weekly_reviews, quotes } = seedData;

        // Use a transaction for safety
        const restore = db.transaction(() => {
            // 2. Restore Trades
            if (trades && trades.length > 0) {
                // Ensure the account exists for the seed trades
                // Get unique account IDs from seed data
                const accountIds = [...new Set(trades.map(t => t.account_id).filter(Boolean))];

                const insertAccount = db.prepare(`INSERT OR IGNORE INTO accounts (id, name, is_aggregated) VALUES (?, ?, ?)`);

                for (const accId of accountIds) {
                    // Create a default account for the seed data if it doesn't exist
                    // We use INSERT OR IGNORE so it won't fail if it already exists
                    insertAccount.run(accId, 'Demo Account ' + accId, 1);
                }

                console.log(`Restoring ${trades.length} trades...`);
                // Dynamically build insert statement based on keys of first trade
                const tradeKeys = Object.keys(trades[0]);
                const tradeCols = tradeKeys.join(', ');
                const tradePlaceholders = tradeKeys.map(k => '@' + k).join(', ');
                const insertTrade = db.prepare(`INSERT OR IGNORE INTO trades (${tradeCols}) VALUES (${tradePlaceholders})`);

                for (const trade of trades) {
                    insertTrade.run(trade);
                }
            }

            // 3. Restore Weekly Reviews
            if (weekly_reviews && weekly_reviews.length > 0) {
                console.log(`Restoring ${weekly_reviews.length} weekly reviews...`);
                const wrKeys = Object.keys(weekly_reviews[0]);
                const wrCols = wrKeys.join(', ');
                const wrPlaceholders = wrKeys.map(k => '@' + k).join(', ');
                const insertWR = db.prepare(`INSERT OR IGNORE INTO weekly_reviews (${wrCols}) VALUES (${wrPlaceholders})`);

                for (const wr of weekly_reviews) {
                    insertWR.run(wr);
                }
            }

            // 4. Restore Quotes
            if (quotes && quotes.length > 0) {
                console.log(`Restoring ${quotes.length} quotes...`);
                const qKeys = Object.keys(quotes[0]);
                const qCols = qKeys.join(', ');
                const qPlaceholders = qKeys.map(k => '@' + k).join(', ');
                const insertQuote = db.prepare(`INSERT OR IGNORE INTO quotes (${qCols}) VALUES (${qPlaceholders})`);

                for (const q of quotes) {
                    insertQuote.run(q);
                }
            }
        });

        try {
            restore();
            console.log('--- SEED RESTORE COMPLETE ---');
            return true;
        } catch (error) {
            console.error('Seed restore failed:', error);
            throw error;
        }
    }
}
