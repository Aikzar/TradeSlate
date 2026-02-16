import { Trade } from '../types';

export interface WeeklyHighlights {
    best: Trade[];
    worst: Trade[];
}

export const getAlgorithmicWeeklyHighlights = (trades: Trade[]): WeeklyHighlights => {
    // Best: Top 3 by achieved_r
    // If achieved_r is missing, fallback to PnL
    // Filter for trades in the last 7 days
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentTrades = trades.filter(t => new Date(t.entryDateTime) >= oneWeekAgo);

    const best = [...recentTrades]
        .filter(t => (t.pnl ?? 0) > 0) // Strict: Wins only
        .sort((a, b) => {
            const rA = a.achievedR ?? 0;
            const rB = b.achievedR ?? 0;
            return rB - rA; // Descending
        })
        .slice(0, 3);

    // Worst: Primary sort by Biggest Dollar Loss (PnL ascending since losses are negative)
    const worst = [...recentTrades]
        .filter(t => (t.pnl ?? 0) < 0) // Strict: Losses only
        .sort((a, b) => {
            const pnlA = a.pnl ?? 0;
            const pnlB = b.pnl ?? 0;

            // Simple Weighting: 
            // If violation (R < -1.0), give it a "boost" effectively making it "lower" (more negative)
            // Let's maximize the "badness" score.
            // Badness = Abs(PnL) * (IsViolation ? 2 : 1)
            // We want the "Worst" trades.

            // Let's just standard sort by PnL for now as requested "Primary sort".
            // The "Secondary priority" might mean: If PnL is similar, pick the one with < -1R.
            // Or it means: Group 1: Loss < -1R, Group 2: Others. Sort both by PnL.

            // Let's do: Sort by PnL.
            return pnlA - pnlB; // Ascending (most negative first)
        })
        .slice(0, 3);

    return { best, worst };
};

/**
 * Get the week ID (Monday's date) for a given date in format "YYYY-MM-DD"
 */
export const getWeekId = (date: Date): string => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
};

/**
 * Get the date range for the previous week (Monday-Sunday)
 */
export const getPreviousWeekRange = () => {
    const now = new Date();
    // Get current week's Monday
    const currentDay = now.getDay();
    const currentMonday = new Date(now);
    const diffToCurrent = currentMonday.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    currentMonday.setDate(diffToCurrent);
    currentMonday.setHours(0, 0, 0, 0);

    // Go back 7 days to get previous week's Monday
    const previousMonday = new Date(currentMonday);
    previousMonday.setDate(currentMonday.getDate() - 7);

    // Get previous week's Sunday
    const previousSunday = new Date(previousMonday);
    previousSunday.setDate(previousMonday.getDate() + 6);
    previousSunday.setHours(23, 59, 59, 999);

    const weekId = previousMonday.toISOString().split('T')[0];

    return { monday: previousMonday, sunday: previousSunday, weekId };
};
