/**
 * Custom CSV Parser
 * Uses ImportProfile column mappings to parse arbitrary CSV files
 */



export interface ParsedTrade {
    market: string;
    direction: 'Long' | 'Short';
    contracts: number;
    entryPrice: number;
    exitPrice?: number;
    pnl?: number;
    entryDateTime: string;
    exitTime?: string;
    durationSeconds?: number;
    status: 'CLOSED';
    setup?: string;
    notesRaw?: string;
    plannedSL?: number;
    plannedTP?: number;
    maePrice?: number;
    mfePrice?: number;
    // Calculated fields
    plannedRR?: number;
    achievedR?: number;
    risk?: number;
    win?: boolean;
    maeR?: number | null;
    mfeR?: number | null;
    heatPercent?: number | null;
    profitCapturePercent?: number | null;
}

/**
 * Parses a CSV line respecting quoted fields
 */
function parseCSVLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

/**
 * Detects CSV headers from content
 */
export function detectCSVHeaders(csvContent: string, delimiter: string = ','): string[] {
    const lines = csvContent.trim().split(/\r?\n/);
    if (lines.length === 0) return [];
    return parseCSVLine(lines[0], delimiter);
}

/**
 * Parses direction from various formats
 */
function parseDirection(value: string): 'Long' | 'Short' {
    const v = value.toLowerCase().trim();
    if (['long', 'buy', 'b', '1'].includes(v)) return 'Long';
    if (['short', 'sell', 's', '-1', '0'].includes(v)) return 'Short';
    return 'Long'; // default
}

/**
 * Parses a date string using common formats
 */
/**
 * Parses a date string using the provided format structure
 * format can be "MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD" etc.
 * The logic is flexible with separators, only the order of Y, M, D matters.
 */
function parseDateString(value: string, format?: string): string {
    if (!value) return new Date().toISOString();

    // 1. Try strict ISO first (e.g. from JSON or standard APIs)
    const isoDate = new Date(value);
    if (!isNaN(isoDate.getTime()) && value.includes('T')) return isoDate.toISOString();

    // 2. Flexible Parsing based on format structure
    // Normalize value by replacing common separators with spaces to split easily
    const parts = value.split(/[\/\-\.\sT,:]+/).filter(p => p.length > 0);

    // We expect at least year, month, day (3 parts) to do a structured parse
    if (parts.length < 3) {
        // Fallback to simple Date parse if we can't extract 3 parts
        return !isNaN(isoDate.getTime()) ? isoDate.toISOString() : new Date().toISOString();
    }

    let year = 0, month = 0, day = 0;
    let hour = 0, minute = 0, second = 0;

    // Extract date based on format preference
    const dateNumbers = parts.slice(0, 3).map(p => parseInt(p));
    // Time parts are usually after the first 3 (Date) parts
    const timeNumbers = parts.slice(3).map(p => parseInt(p));

    const lowerFormat = (format || '').toLowerCase();

    if (lowerFormat.includes('d') && lowerFormat.includes('m') && lowerFormat.includes('y')) {
        // Determine order based on indices of d, m, y in the format string
        const dIndex = lowerFormat.indexOf('d');
        const mIndex = lowerFormat.indexOf('m');
        const yIndex = lowerFormat.indexOf('y');

        const sorted = [
            { type: 'd', index: dIndex, val: 0 },
            { type: 'm', index: mIndex, val: 0 },
            { type: 'y', index: yIndex, val: 0 }
        ].sort((a, b) => a.index - b.index);

        // Map the first 3 collected numbers to the sorted structure
        // e.g. if format is DD/MM/YYYY, sorted order is d, m, y. 
        // dateNumbers[0] -> day, dateNumbers[1] -> month...
        if (dateNumbers.length >= 3) {
            sorted[0].val = dateNumbers[0];
            sorted[1].val = dateNumbers[1];
            sorted[2].val = dateNumbers[2];

            day = sorted.find(x => x.type === 'd')?.val || 1;
            month = sorted.find(x => x.type === 'm')?.val || 1;
            year = sorted.find(x => x.type === 'y')?.val || 2026;
        }
    } else {
        // Fallback guessing if no valid format provided
        // Assume ISO (YYYY first) if first part is 4 digits
        if (parts[0].length === 4) {
            [year, month, day] = dateNumbers;
        } else {
            // Default to US (Month-Day-Year) as it's most common in many systems
            [month, day, year] = dateNumbers;
        }
    }

    // Handle Time
    if (timeNumbers.length > 0) hour = timeNumbers[0];
    if (timeNumbers.length > 1) minute = timeNumbers[1];
    if (timeNumbers.length > 2) second = timeNumbers[2];

    // Adjust 2-digit years (pivot 2000)
    if (year < 100) year += 2000;

    // Construct Date (Month is 0-indexed in JS)
    const result = new Date(year, month - 1, day, hour, minute, second);

    // Validate
    if (isNaN(result.getTime())) {
        return new Date().toISOString();
    }

    return result.toISOString();
}

/**
 * Parse number from various formats
 */
function parseNumber(value: string): number {
    if (!value) return 0;
    // Remove currency symbols, commas, spaces
    const cleaned = value.replace(/[$€£,\s]/g, '').trim();
    return parseFloat(cleaned) || 0;
}

/**
 * Parse CSV content using an ImportProfile
 */
export function parseWithProfile(csvContent: string, profile: { columnMappings: { [key: string]: string | null }, delimiter?: string, dateFormat?: string }): ParsedTrade[] {
    const delimiter = profile.delimiter || ',';
    const lines = csvContent.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0], delimiter);
    const dataLines = lines.slice(1);
    const trades: ParsedTrade[] = [];

    // Create reverse mapping: columnIndex -> tradeField
    const columnToField: { [index: number]: string } = {};
    Object.entries(profile.columnMappings).forEach(([csvCol, tradeField]) => {
        if (tradeField) {
            const idx = headers.indexOf(csvCol);
            if (idx >= 0) columnToField[idx] = tradeField;
        }
    });

    for (const line of dataLines) {
        if (!line.trim()) continue;

        const columns = parseCSVLine(line, delimiter);
        const trade: Partial<ParsedTrade> = { status: 'CLOSED' };

        // Map each column to its trade field
        Object.entries(columnToField).forEach(([idxStr, field]) => {
            const idx = parseInt(idxStr);
            const value = columns[idx] || '';

            switch (field) {
                case 'market':
                    trade.market = value;
                    break;
                case 'direction':
                    trade.direction = parseDirection(value);
                    break;
                case 'entryDateTime':
                    trade.entryDateTime = parseDateString(value, profile.dateFormat);
                    break;
                case 'exitTime':
                    trade.exitTime = parseDateString(value, profile.dateFormat);
                    break;
                case 'entryPrice':
                    trade.entryPrice = parseNumber(value);
                    break;
                case 'exitPrice':
                    trade.exitPrice = parseNumber(value);
                    break;
                case 'contracts':
                    trade.contracts = Math.abs(parseInt(value) || 1);
                    break;
                case 'pnl':
                    trade.pnl = parseNumber(value);
                    break;
                case 'durationSeconds':
                    trade.durationSeconds = parseInt(value) || 0;
                    break;
                case 'setup':
                    trade.setup = value;
                    break;
                case 'notesRaw':
                    trade.notesRaw = value;
                    break;
                case 'plannedSL':
                    trade.plannedSL = parseNumber(value);
                    break;
                case 'plannedTP':
                    trade.plannedTP = parseNumber(value);
                    break;
                case 'maePrice':
                    trade.maePrice = parseNumber(value);
                    break;
                case 'mfePrice':
                    trade.mfePrice = parseNumber(value);
                    break;
            }
        });

        // Calculate ALL derived metrics
        if (trade.entryPrice && trade.contracts && trade.market) {
            const direction = trade.direction === 'Long' ? 1 : -1;
            const isLong = trade.direction === 'Long';

            // Contract values per market ($ per point)
            const contractValues: Record<string, number> = {
                NQ: 20, ES: 50, MNQ: 2, MES: 5, CL: 10, GC: 10
            };
            const contractValue = contractValues[trade.market] || 20;

            // 1. Win/Loss determination
            if (trade.pnl !== undefined) {
                trade.win = trade.pnl > 0;
            }

            // 2. Risk, RR, and R calculations (require SL)
            if (trade.plannedSL) {
                const riskPoints = Math.abs(trade.entryPrice - trade.plannedSL);
                trade.risk = riskPoints * trade.contracts * contractValue;

                // Planned RR (requires TP)
                if (trade.plannedTP) {
                    const rewardPoints = Math.abs(trade.plannedTP - trade.entryPrice);
                    trade.plannedRR = riskPoints > 0 ? rewardPoints / riskPoints : 0;
                }

                // Achieved R (requires exit price)
                if (trade.exitPrice && riskPoints > 0) {
                    const pnlPoints = (trade.exitPrice - trade.entryPrice) * direction;
                    trade.achievedR = pnlPoints / riskPoints;
                }

                // MAE R (requires MAE price)
                if (trade.maePrice && riskPoints > 0) {
                    const advExcursion = isLong
                        ? (trade.entryPrice - trade.maePrice)
                        : (trade.maePrice - trade.entryPrice);
                    trade.maeR = Math.max(0, advExcursion / riskPoints);
                }

                // MFE R (requires MFE price)
                if (trade.mfePrice && riskPoints > 0) {
                    const favExcursion = isLong
                        ? (trade.mfePrice - trade.entryPrice)
                        : (trade.entryPrice - trade.mfePrice);
                    trade.mfeR = favExcursion / riskPoints;
                }

                // Heat Percent (requires MAE)
                if (trade.maePrice && riskPoints > 0) {
                    const actualDrawdown = isLong
                        ? (trade.entryPrice - trade.maePrice)
                        : (trade.maePrice - trade.entryPrice);
                    trade.heatPercent = Math.max(0, (actualDrawdown / riskPoints) * 100);
                }

                // Profit Capture Percent (requires MFE and exit)
                if (trade.mfePrice && trade.exitPrice && riskPoints > 0) {
                    const mfePoints = isLong
                        ? (trade.mfePrice - trade.entryPrice)
                        : (trade.entryPrice - trade.mfePrice);
                    const realizedPoints = isLong
                        ? (trade.exitPrice - trade.entryPrice)
                        : (trade.entryPrice - trade.exitPrice);

                    if (mfePoints > 0) {
                        trade.profitCapturePercent = (realizedPoints / mfePoints) * 100;
                    }
                }
            }
        }

        // Validate required fields
        if (trade.market && trade.direction && trade.entryDateTime && trade.entryPrice != null && trade.contracts) {
            trades.push(trade as ParsedTrade);
        }
    }

    return trades;
}

/**
 * Built-in profiles for common platforms
 */
export const BUILTIN_PROFILES = {
    tradovate: {
        name: 'Tradovate',
        columnMappings: {
            'symbol': 'market',
            'qty': 'contracts',
            'buyPrice': 'entryPrice',
            'sellPrice': 'exitPrice',
            'pnl': 'pnl',
            'boughtTimestamp': 'entryDateTime',
            'soldTimestamp': 'exitTime'
        },
        delimiter: ',' as const,
        dateFormat: 'MM/DD/YYYY HH:mm:ss'
    },
    ninjatrader: {
        name: 'NinjaTrader',
        columnMappings: {
            'Instrument': 'market',
            'Market pos.': 'direction',
            'Qty': 'contracts',
            'Entry price': 'entryPrice',
            'Exit price': 'exitPrice',
            'Profit': 'pnl',
            'Entry time': 'entryDateTime',
            'Exit time': 'exitTime'
        },
        delimiter: ',' as const,
        dateFormat: 'MM/DD/YYYY HH:mm:ss'
    },
    tradingview: {
        name: 'TradingView',
        columnMappings: {
            'Symbol': 'market',
            'Side': 'direction',
            'Qty': 'contracts',
            'Price': 'entryPrice',
            'Close Price': 'exitPrice',
            'Profit': 'pnl',
            'Date': 'entryDateTime'
        },
        delimiter: ',' as const,
        dateFormat: 'YYYY-MM-DD HH:mm:ss'
    }
};
