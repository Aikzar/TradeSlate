export interface ElectronAPI {
    openExternal: (url: string) => Promise<void>;
    ai: {
        analyzeTrade: (trade: any) => Promise<any>;
        weeklyReview: (trades: any[], weekId?: string) => Promise<any>;
        queryTrades: (query: string, trades: any[]) => Promise<any>;
        rewriteJournal: (text: string, context: { market?: string; direction?: string }) => Promise<string>;
    };
    debug: {
        getRawTrade: (id: string) => Promise<any>;
    };
    cot: {
        getLatest: () => Promise<any>;
        getHistory: () => Promise<any>;
        parseFile: (fileContent: string) => Promise<any>;
        getParserSource: () => Promise<string>;
        debugSearchId: (fileContent: string, targetId: string) => Promise<any>;
        loadFromAssets: () => Promise<{ report: any, log: string[] }>;
        fetchLatest: () => Promise<{ status: string, date: string, log: string[] }>;
        getHistoryDates: () => Promise<string[]>;
        getReportByDate: (date: string) => Promise<any>;
        getReportByDate: (date: string) => Promise<any>;
    };

    stt: {
        start: () => Promise<void>;
        stop: () => Promise<void>;
        sendAudio: (chunk: Float32Array) => void;
        unload: () => Promise<void>;
        checkCache: (modelId: string) => Promise<boolean>;
        onProgress: (callback: (data: any) => void) => () => void;
        onReady: (callback: (data: any) => void) => () => void;
        onResult: (callback: (text: string) => void) => () => void;
        onError: (callback: (error: string) => void) => () => void;
        onUnloaded: (callback: () => void) => () => void;
    };
    [key: string]: any; // Allow other properties for now
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
