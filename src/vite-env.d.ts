/// <reference types="vite/client" />
import type { Trade } from './types';

interface Window {
    electronAPI: {
        ping: () => void;
        trades: {
            getAll: () => Promise<Trade[]>;
            create: (trade: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Trade>;
            update: (id: string, trade: Partial<Trade>) => Promise<Trade>;
            delete: (id: string) => Promise<void>;
        };
        settings: {
            get: (key: string) => Promise<{ value: string } | undefined>;
            set: (key: string, value: string) => Promise<void>;
            getAll: () => Promise<any[]>;
            exportData: () => Promise<boolean>;
            importData: () => Promise<boolean>;
        };
        journal: {
            getAll: () => Promise<import('./types').JournalEntry[]>;
            getByDate: (date: string) => Promise<import('./types').JournalEntry | undefined>;
            save: (entry: Partial<import('./types').JournalEntry>) => Promise<import('./types').JournalEntry>;
        };
        ai: {
            analyzeTrade: (trade: import('./types').Trade) => Promise<any>;
            coachJournal: (content: string, mood: string) => Promise<any>;
            queryTrades: (query: string, trades: import('./types').Trade[]) => Promise<any>;
            weeklyReview: (trades: import('./types').Trade[]) => Promise<any>;
        };
        quotes: {
            getDaily: () => Promise<string>;
            getAll: () => Promise<{ id: number; text: string; author?: string; is_custom: number }[]>;
            add: (text: string, author?: string) => Promise<number>;
            update: (id: number, text: string) => Promise<void>;
            delete: (id: number) => Promise<void>;
            clearAll: () => Promise<void>;
            import: (content: string) => Promise<number>;
            init: () => Promise<void>;
        };
        accounts: {
            getAll: () => Promise<{ id: string; name: string; isAggregated: boolean; color?: string; createdAt: string }[]>;
            create: (name: string, color?: string) => Promise<{ id: string; name: string; isAggregated: boolean; color?: string; createdAt: string }>;
            update: (id: string, data: Partial<{ name: string; isAggregated: boolean; color: string }>) => Promise<void>;
            delete: (id: string) => Promise<void>;
        };
        seed: {
            run: () => Promise<boolean>;
        };
    }
}
