
export type TradeStatus = 'OPEN' | 'CLOSED' | 'SKIPPED';
export type Direction = 'Long' | 'Short';

export interface Trade {
    id: string;
    accountId?: string;
    market: string;
    direction: Direction;
    entryDateTime: string; // ISO
    exitTime?: string; // ISO

    entryPrice: number;
    exitPrice?: number;
    contracts: number;

    // Risk Management
    plannedSL?: number;
    initialSL?: number; // Static Risk Anchor
    plannedTP?: number;
    risk?: number;
    pnl?: number;
    plannedRR?: number;
    achievedR?: number;

    // Setup & Context
    setup?: string;
    entryTrigger?: string;
    confluences: string[];

    // Psychology & Notes
    notesRaw?: string;
    notesClean?: string;
    aiVerdict?: string;
    emotionPre?: string;
    emotionPost?: string;
    tiltScore?: number;

    // Metrics
    maePrice?: number;
    mfePrice?: number;
    heatPercent?: number | null;
    mfeR?: number | null;
    maeR?: number | null;
    profitCapturePercent?: number | null;
    durationSeconds?: number;
    win?: boolean;

    // Tags
    tags: string[];
    mistakes: string[];
    session?: string;

    status: TradeStatus;

    images: string[];
    imageAnnotations?: { [imageIndex: number]: any[] }; // DrawAction[] per image
    videoUrl?: string;
    meta?: any;

    createdAt: string;
    updatedAt: string;
}

export interface JournalEntry {
    id: string;
    date: string; // YYYY-MM-DD
    content: string;
    mood?: 'Neutral' | 'Happy' | 'Frustrated' | 'Tilt' | 'Focused';
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

// Import profile for custom CSV imports
export interface ImportProfile {
    id: string;
    name: string;
    type: 'builtin' | 'custom';
    columnMappings: { [csvColumn: string]: string | null }; // Maps CSV column to Trade field
    dateFormat?: string; // e.g., "MM/DD/YYYY HH:mm:ss"
    delimiter?: ',' | ';' | '\t';
    createdAt?: string;
    updatedAt?: string;
}

// Fields available for import mapping
export const IMPORTABLE_TRADE_FIELDS = [
    { key: 'market', label: 'Market/Symbol', required: true },
    { key: 'direction', label: 'Direction (Long/Short)', required: true },
    { key: 'entryDateTime', label: 'Entry Date/Time', required: true },
    { key: 'exitTime', label: 'Exit Date/Time', required: false },
    { key: 'entryPrice', label: 'Entry Price', required: true },
    { key: 'exitPrice', label: 'Exit Price', required: false },
    { key: 'contracts', label: 'Contracts/Size', required: true },
    { key: 'pnl', label: 'Profit/Loss', required: false },
    { key: 'durationSeconds', label: 'Duration', required: false },
    { key: 'setup', label: 'Setup Type', required: false },
    { key: 'notesRaw', label: 'Notes', required: false },
    { key: 'plannedSL', label: 'Stop Loss', required: false },
    { key: 'plannedTP', label: 'Take Profit', required: false },
] as const;


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

export interface EconomicEvent {
    time: string; // Formatting: "HH:mm"
    date?: string; // Full date string for sorting/filtering
    currency: string;
    event: string;
    impact: 'High' | 'Medium' | 'Low' | 'None';
    actual?: number | null;
    estimate?: number | null;
    previous?: number | null;
    unit?: string; // e.g., "%", "K"
}

export interface NewsItem {
    id: number;
    headline: string;
    summary: string;
    url: string;
    image: string;
    source: string;
    datetime: number;
}

export interface BehavioralThresholds {
    fomoVelocityTrades: number;  // default 3 (trades)
    fomoVelocityWindow: number;  // default 2 (minutes)
    revengeWindow: number;       // default 5 (minutes)
    timingMode: 'intra-day' | 'continuous'; // skip inter-day vs all hours
    maxIntervalMinutes: number;             // threshold for break detection (e.g. 120m)
}
