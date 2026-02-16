
import { Trade } from '../types';

export interface ImportedTrade {
    market: string;
    direction: 'Long' | 'Short';
    entryDateTime: string;
    exitTime?: string;
    entryPrice: number;
    exitPrice?: number;
    contracts: number;
    pnl?: number;
    fees?: number;
    sourceRaw?: any;
    [key: string]: any; // Allow other fields like setup, notes, etc.
}

export const parseTradovateCSV = (csvContent: string): ImportedTrade[] => {
    const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
        // Handle quotes in CSV if simple split is insufficient, but simple split for now
        return line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    });

    // Helper to find col index
    const idx = (patterns: string[]) => header.findIndex(h => patterns.some(p => h.includes(p)));

    const colMap = {
        symbol: idx(['symbol', 'instrument', 'contract']),
        side: idx(['side', 'direction', 'buy/sell']),
        qty: idx(['qty', 'quantity', 'amount', 'size']),
        openPrice: idx(['open price', 'avg open', 'entry price']),
        closePrice: idx(['close price', 'avg close', 'exit price']),
        openTime: idx(['open time', 'entry time', 'timestamp']),
        closeTime: idx(['close time', 'exit time']),
        pnl: idx(['p/l', 'pnl', 'profit/loss', 'realized']),
        comm: idx(['comm', 'commission', 'fee'])
    };

    // If critical columns missing, return empty or try another format logic
    if (colMap.symbol === -1 || colMap.pnl === -1) return [];

    return rows.map(row => {
        if (row.length < header.length) return null;

        const symbol = row[colMap.symbol];
        const sideRaw = colMap.side > -1 ? row[colMap.side] : 'Long'; // Default or logic needed
        const direction = sideRaw.toLowerCase().includes('short') || sideRaw.toLowerCase().includes('sell') ? 'Short' : 'Long';

        // PnL & Qty
        const pnlStr = row[colMap.pnl].replace('$', '').replace(',', '');
        const pnl = parseFloat(pnlStr);

        const qtyStr = colMap.qty > -1 ? row[colMap.qty] : '1';
        const contracts = Math.abs(parseInt(qtyStr) || 1);

        // Dates
        // Tradovate dates can be ISO or formatted. Try standard Date parse
        let entryTime = new Date().toISOString();
        if (colMap.openTime > -1 && row[colMap.openTime]) {
            const d = new Date(row[colMap.openTime]);
            if (!isNaN(d.getTime())) entryTime = d.toISOString();
        }

        let exitTime = undefined;
        if (colMap.closeTime > -1 && row[colMap.closeTime]) {
            const d = new Date(row[colMap.closeTime]);
            if (!isNaN(d.getTime())) exitTime = d.toISOString();
        }

        const entryPrice = colMap.openPrice > -1 ? parseFloat(row[colMap.openPrice]) : 0;
        const exitPrice = colMap.closePrice > -1 ? parseFloat(row[colMap.closePrice]) : 0;
        const fees = colMap.comm > -1 ? parseFloat(row[colMap.comm]) : 0;

        // Skip invalid rows
        if (!symbol || isNaN(pnl)) return null;

        return {
            market: symbol,
            direction,
            entryDateTime: entryTime, // This is ISO
            exitTime,
            entryPrice,
            exitPrice,
            contracts,
            pnl,
            fees,
            sourceRaw: row
        };
    }).filter(t => t !== null) as ImportedTrade[];
};

export const deduplicateAndImport = async (
    imported: ImportedTrade[],
    existing: Trade[],
    onUpdate: (id: string, data: Partial<Trade>) => Promise<void>,
    onCreate: (data: any) => Promise<void>
) => {
    let created = 0;
    let updated = 0;

    // Track which existing trades have already been matched to avoid counting same match twice
    const matchedIds = new Set<string>();

    for (const imp of imported) {
        // Find match
        // Match logic: Same Symbol, Same Direction, Entry Time within +/- 60 minutes
        // Skip trades that have already been matched to avoid double-counting

        const match = existing.find(ex => {
            // Skip if already matched in this import session
            if (matchedIds.has(ex.id)) return false;

            if (ex.market !== imp.market) return false;
            if (ex.direction !== imp.direction) return false;

            const t1 = new Date(ex.entryDateTime).getTime();
            const t2 = new Date(imp.entryDateTime).getTime();
            const diffMins = Math.abs(t1 - t2) / 60000;

            // 60 mins tolerance for manual entry imprecision
            return diffMins < 60;
        });

        if (match) {
            // Mark as matched so it won't be matched again
            matchedIds.add(match.id);

            // Update existing
            // Only overwrite metrics, keep notes/tags unless empty
            await onUpdate(match.id, {
                entryPrice: imp.entryPrice || match.entryPrice,
                exitPrice: imp.exitPrice || match.exitPrice,
                entryDateTime: imp.entryDateTime, // authoritative time
                exitTime: imp.exitTime,
                pnl: imp.pnl, // Authoritative PnL
                contracts: imp.contracts,
            });
            updated++;
        } else {
            // Create New
            // Create New
            await onCreate({
                ...imp,
                tags: imp.tags ? [...(imp.tags || []), 'Imported'] : ['Imported'],
                status: 'CLOSED'
            });
            created++;
        }
    }
    return { created, updated };
};
