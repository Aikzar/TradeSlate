import * as fs from 'fs';
import * as path from 'path';


export interface COTDataPoint {
    contract: string;
    category: string;
    net_current: number;
    net_pct_current: number;
    delta: number;
    is_flip: boolean;
    raw_longs: number;
    raw_shorts: number;
    oi: number;
    net_value_usd: number;
}

export interface COTReport {
    date: string;
    data: COTDataPoint[];
}

// In-memory cache
let historyCache: Record<string, COTReport> | null = null;
let dbPath = '';

export const COTRepository = {
    init: (userDataPath: string) => {
        dbPath = path.join(userDataPath, 'cot_history.json');
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
        }
    },

    load: () => {
        if (!dbPath) throw new Error('COTRepository not initialized');
        if (!historyCache) {
            try {
                if (fs.existsSync(dbPath)) {
                    const data = fs.readFileSync(dbPath, 'utf-8');
                    historyCache = JSON.parse(data);
                } else {
                    historyCache = {};
                }
            } catch (e) {
                console.error('Failed to load cot_history.json', e);
                historyCache = {};
            }
        }
        return historyCache || {};
    },

    save: (data: Record<string, COTReport>) => {
        if (!dbPath) throw new Error('COTRepository not initialized');
        historyCache = data; // Update cache
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    },

    saveReport: (report: COTReport) => {
        const history = COTRepository.load();
        history[report.date] = report;
        COTRepository.save(history);
    },

    getLatestReport: (): COTReport | null => {
        const history = COTRepository.load();
        const dates = Object.keys(history).sort().reverse();
        if (dates.length === 0) return null;
        return history[dates[0]];
    },

    getHistory: (limit: number = 10): COTReport[] => {
        const history = COTRepository.load();
        const dates = Object.keys(history).sort().reverse().slice(0, limit);
        return dates.map(date => history[date]);
    },

    // Check if we have data for a specific date
    hasDataForDate: (date: string): boolean => {
        const history = COTRepository.load();
        return !!history[date];
    },

    getReportByDate: (date: string): COTReport | null => {
        const history = COTRepository.load();
        return history[date] || null;
    },

    getAvailableDates: (): string[] => {
        const history = COTRepository.load();
        return Object.keys(history).sort().reverse();
    }
};
