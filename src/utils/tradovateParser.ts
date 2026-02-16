
/**
 * Tradovate CSV Parser
 * Parses exported trade data from Tradovate platform
 * 
 * Expected format:
 * symbol,_priceFormat,_priceFormatType,_tickSize,buyFillId,sellFillId,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp,duration
 */

export interface TradovateTrade {
    symbol: string;
    qty: number;
    buyPrice: number;
    sellPrice: number;
    pnl: number;
    boughtTimestamp: string;
    soldTimestamp: string;
    duration: string;
}

export interface ParsedTrade {
    market: string;
    direction: 'Long' | 'Short';
    contracts: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    entryDateTime: string;
    exitTime: string;
    durationSeconds?: number;
    status: 'CLOSED';
}

/**
 * Parse Tradovate CSV content into trade objects
 */
export function parseTradovateCSV(csvContent: string): ParsedTrade[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];

    // Skip header
    const dataLines = lines.slice(1);
    const trades: ParsedTrade[] = [];

    for (const line of dataLines) {
        if (!line.trim()) continue;

        const columns = parseCSVLine(line);
        if (columns.length < 12) continue;

        try {
            // Map columns based on Tradovate format
            // symbol,_priceFormat,_priceFormatType,_tickSize,buyFillId,sellFillId,qty,buyPrice,sellPrice,pnl,boughtTimestamp,soldTimestamp,duration
            const symbol = columns[0];
            const qty = parseInt(columns[6]) || 1;
            const buyPrice = parseFloat(columns[7]) || 0;
            const sellPrice = parseFloat(columns[8]) || 0;
            const pnlRaw = columns[9].replace('$', '').replace(',', '');
            const pnl = parseFloat(pnlRaw) || 0;
            const boughtTimestamp = columns[10];
            const soldTimestamp = columns[11];
            const duration = columns[12] || '';

            // Determine market from symbol (e.g., MNQZ5 -> MNQ)
            const market = extractMarket(symbol);

            // Determine direction based on buy/sell relationship
            // If buyPrice < sellPrice, it was a Long trade
            const direction: 'Long' | 'Short' = buyPrice < sellPrice ? 'Long' : 'Short';

            // Parse timestamps (MM/DD/YYYY HH:MM:SS)
            const entryDateTime = parseTimestamp(boughtTimestamp);
            const exitTime = parseTimestamp(soldTimestamp);

            // Parse duration to seconds
            const durationSeconds = parseDuration(duration);

            trades.push({
                market,
                direction,
                contracts: qty,
                entryPrice: buyPrice,
                exitPrice: sellPrice,
                pnl,
                entryDateTime,
                exitTime,
                durationSeconds,
                status: 'CLOSED'
            });
        } catch (err) {
            console.error('Error parsing line:', line, err);
        }
    }

    return trades;
}

function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function extractMarket(symbol: string): string {
    // Remove contract month/year suffix (e.g., MNQZ5 -> MNQ, ESH6 -> ES)
    const match = symbol.match(/^([A-Z]+)/);
    return match ? match[1] : symbol;
}

function parseTimestamp(ts: string): string {
    // Format: MM/DD/YYYY HH:MM:SS
    const [datePart, timePart] = ts.split(' ');
    if (!datePart || !timePart) return new Date().toISOString();

    const [month, day, year] = datePart.split('/').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);

    const date = new Date(year, month - 1, day, hours, minutes, seconds);
    return date.toISOString();
}

function parseDuration(duration: string): number {
    // Format: "18sec", "2min 51sec", "5min 16sec"
    let totalSeconds = 0;

    const minMatch = duration.match(/(\d+)\s*min/);
    const secMatch = duration.match(/(\d+)\s*sec/);

    if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
    if (secMatch) totalSeconds += parseInt(secMatch[1]);

    return totalSeconds;
}
