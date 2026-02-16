"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COTService = void 0;
const cot_1 = require("./db/cot");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
// EXPANDED TARGETS WITH CATEGORIES (Financials + Commodities)
const TARGETS = {
    // --- FOREX ---
    '098662': { name: 'USD Index', size: 1000, cat: 'Forex' },
    '099741': { name: 'EUR', size: 125000, cat: 'Forex' },
    '096742': { name: 'GBP', size: 62500, cat: 'Forex' },
    '097741': { name: 'JPY', size: 12500000, cat: 'Forex' },
    '090741': { name: 'CAD', size: 100000, cat: 'Forex' },
    '092741': { name: 'CHF', size: 125000, cat: 'Forex' },
    '232741': { name: 'AUD', size: 100000, cat: 'Forex' },
    '112741': { name: 'NZD', size: 100000, cat: 'Forex' },
    '095741': { name: 'MXN', size: 500000, cat: 'Forex' },
    '102741': { name: 'BRL', size: 100000, cat: 'Forex' },
    // --- INDICES ---
    '13874A': { name: 'S&P 500', size: 50, cat: 'Indices' },
    '209742': { name: 'NASDAQ 100', size: 20, cat: 'Indices' },
    '124603': { name: 'DJIA', size: 5, cat: 'Indices' },
    '1170E1': { name: 'VIX', size: 1000, cat: 'Indices' },
    // --- CRYPTO ---
    '133741': { name: 'Bitcoin', size: 5, cat: 'Crypto' },
    '146021': { name: 'Ether', size: 50, cat: 'Crypto' },
    // --- BONDS ---
    '043602': { name: '10Y Treasury', size: 100000, cat: 'Bonds' },
    '020601': { name: '30Y Treasury', size: 100000, cat: 'Bonds' },
    // --- COMMODITIES (From f_disagg) ---
    '088691': { name: 'Gold', size: 100, cat: 'Commodities' },
    '084691': { name: 'Silver', size: 5000, cat: 'Commodities' },
    '067651': { name: 'Crude Oil', size: 1000, cat: 'Commodities' },
    '002602': { name: 'Corn', size: 5000, cat: 'Commodities' },
    '005602': { name: 'Soybeans', size: 5000, cat: 'Commodities' },
    '001602': { name: 'Wheat', size: 5000, cat: 'Commodities' }
};
// COLUMN STRATEGIES
const COLUMNS_FIN = {
    OI: 7, LONG: 14, SHORT: 15,
    CHG_OI: 24, CHG_LONG: 31, CHG_SHORT: 32
};
const COLUMNS_COMM = {
    OI: 7, LONG: 12, SHORT: 13,
    CHG_OI: 24, CHG_LONG: 29, CHG_SHORT: 30
};
class COTService {
    static getParserSourceCode() {
        return `
// === UNIFIED COT PARSER WITH AUDIT LOG ===
// Updated: 2026-02-08

const TARGETS = { ...Financials, ...Commodities };

// COLUMN MAPPING STRATEGY:
// 1. FINANCIALS (Forex, Indices, Bonds, Crypto) -> Leveraged Funds [14, 15]
// 2. COMMODITIES (Gold, Oil, Wheat) -> Managed Money [12, 13]
`;
    }
    // DEBUG: Legacy search logic
    static debugSearchId(fileContent, targetId) {
        const lines = fileContent.split('\n');
        for (const line of lines) {
            if (line.includes(targetId)) {
                return {
                    found: true,
                    rawLine: line.substring(0, 200) + '...',
                    parsed: { id: targetId, note: 'See full audit log in Load Files' }
                };
            }
        }
        return { found: false, rawLine: 'NOT FOUND', parsed: null };
    }
    /**
     * Fetch latest COT files from CFTC, parse, and save history.
     * Prevents duplicates.
     */
    static fetchLatestData(rootPath) {
        return __awaiter(this, void 0, void 0, function* () {
            const log = [];
            log.push('=== AUTOMATED FETCH LOG ===');
            const urls = {
                fin: 'https://www.cftc.gov/dea/newcot/FinFutWk.txt',
                comm: 'https://www.cftc.gov/dea/newcot/f_disagg.txt'
            };
            try {
                // 1. FETCH
                log.push(`Fetching Financials from ${urls.fin}...`);
                const finRes = yield fetch(urls.fin);
                if (!finRes.ok)
                    throw new Error(`Fin fetch failed: ${finRes.statusText}`);
                const finContent = yield finRes.text();
                log.push(`Fetching Commodities from ${urls.comm}...`);
                const commRes = yield fetch(urls.comm);
                if (!commRes.ok)
                    throw new Error(`Comm fetch failed: ${commRes.statusText}`);
                const commContent = yield commRes.text();
                // 2. EXTRACT DATE
                const extractDate = (content) => {
                    const line = content.split('\n')[0];
                    if (!line)
                        return null;
                    const parts = line.split(',');
                    // CSV date usually at index 2: "USD INDEX...",260203,2026-02-03,...
                    // Or try index 1 if raw YYMMDD
                    if (parts[2] && parts[2].includes('20'))
                        return parts[2].replace(/"/g, '').trim();
                    return null;
                };
                const date = extractDate(finContent) || new Date().toISOString().split('T')[0];
                log.push(`Detected Report Date: ${date}`);
                // 3. PARSE
                const finLines = finContent.split('\n').map(l => ({ line: l, source: 'Downloaded Financials' }));
                const commLines = commContent.split('\n').map(l => ({ line: l, source: 'Downloaded Commodities' }));
                const dataList = this.parseLines([...finLines, ...commLines], log);
                // Sort by Net %
                dataList.sort((a, b) => b.net_pct_current - a.net_pct_current);
                const report = { date, data: dataList };
                // 4. DUPLICATE CHECK & SAVE
                let status = 'SAVED';
                if (cot_1.COTRepository.hasDataForDate(date)) {
                    const existing = cot_1.COTRepository.getReportByDate(date);
                    if (existing && JSON.stringify(existing.data) === JSON.stringify(report.data)) {
                        status = 'UP_TO_DATE';
                        log.push('Data already exists and matches. Initialized as Up To Date.');
                    }
                    else {
                        cot_1.COTRepository.saveReport(report);
                        status = 'UPDATED';
                        log.push('Data for date exists but differs. Overwritten.');
                    }
                }
                else {
                    cot_1.COTRepository.saveReport(report);
                    log.push('New data saved to history.');
                }
                // 5. SAVE FILES (ARCHIVE)
                const assetsDir = path.join(rootPath, 'Assets');
                try {
                    yield fs.writeFile(path.join(assetsDir, `FinFutWk_${date}.txt`), finContent);
                    yield fs.writeFile(path.join(assetsDir, `f_disagg_${date}.txt`), commContent);
                    log.push(`Archived raw files to Assets/ with date ${date}`);
                }
                catch (e) {
                    log.push(`Warning: Failed to archive files: ${e.message}`);
                }
                return { status, date, log };
            }
            catch (err) {
                log.push(`CRITICAL ERROR: ${err.message}`);
                return { status: 'ERROR', date: '', log };
            }
        });
    }
    /**
     * Load specific files from disk and parse (Legacy / Manual Fix)
     */
    static loadAndParseFiles(rootPath) {
        return __awaiter(this, void 0, void 0, function* () {
            // Files to look for (Standard names for manual placement)
            const files = [
                { name: 'FinFutW(2026-02-03)-k.txt', type: 'Financials' },
                { name: 'f_disagg(2026-02-03).txt', type: 'Commodities' }
            ];
            let combinedLines = [];
            const debugLog = [];
            let reportDate = '';
            debugLog.push('=== MANUAL FILE LOAD LOG ===');
            for (const file of files) {
                try {
                    const possiblePaths = [
                        path.join(rootPath, 'Assets', file.name),
                        path.join(process.cwd(), 'Assets', file.name),
                        path.join(require('electron').app.getAppPath(), 'Assets', file.name)
                    ];
                    let foundPath = '';
                    let content = '';
                    for (const p of possiblePaths) {
                        try {
                            content = yield fs.readFile(p, 'utf-8');
                            foundPath = p;
                            break;
                        }
                        catch (e) { /* continue */ }
                    }
                    if (foundPath) {
                        debugLog.push(`SUCCESS: Loaded ${file.name} (${content.length} bytes)`);
                        const lines = content.split('\n');
                        combinedLines = combinedLines.concat(lines.map(l => ({ line: l, source: file.name })));
                        if (!reportDate) {
                            for (const line of lines) {
                                const parts = line.split(',');
                                if (parts.length > 3 && parts[2].includes('20')) {
                                    reportDate = parts[2].replace(/"/g, '').trim();
                                    break;
                                }
                            }
                        }
                    }
                    else {
                        debugLog.push(`ERROR: Could not find ${file.name}`);
                    }
                }
                catch (err) {
                    debugLog.push(`ERROR: Failed to load ${file.name}: ${err.message}`);
                }
            }
            const dataList = this.parseLines(combinedLines, debugLog);
            if (!reportDate) {
                reportDate = new Date().toISOString().split('T')[0];
            }
            dataList.sort((a, b) => b.net_pct_current - a.net_pct_current);
            const report = { date: reportDate, data: dataList };
            // Also verify manually loaded data against DB history for duplicate check logic
            cot_1.COTRepository.saveReport(report); // Always overwrite on manual load for now as user intent is explicit
            debugLog.push('Manual data saved/overwritten to history db.');
            return { report, log: debugLog };
        });
    }
    // Main parsing logic extracted (supports audit log)
    static parseLines(lines, debugLog) {
        const dataList = [];
        const auditTargets = ['098662', '001602']; // USD, Wheat
        for (const item of lines) {
            const line = item.line;
            const cleanLine = line.replace(/"/g, '').trim();
            const parts = cleanLine.split(',');
            let foundId = null;
            for (const p of parts) {
                const pClean = p.trim();
                // Check if pClean is a key in TARGETS
                if (TARGETS[pClean]) {
                    foundId = pClean;
                    break;
                }
            }
            if (!foundId)
                continue;
            const meta = TARGETS[foundId];
            const cols = meta.cat === 'Commodities' ? COLUMNS_COMM : COLUMNS_FIN;
            // Audit Logging
            if (debugLog && auditTargets.includes(foundId)) {
                debugLog.push(`\nAUDIT TARGET: ${meta.name} (${foundId})`);
                debugLog.push(`Source File: ${item.source}`);
                debugLog.push(`Column Strategy: ${meta.cat === 'Commodities' ? 'Managed Money [12,13]' : 'Leveraged Funds [14,15]'}`);
                if (parts[cols.LONG])
                    debugLog.push(`Raw Value Long (Idx ${cols.LONG}): ${parts[cols.LONG]}`);
                if (parts[cols.SHORT])
                    debugLog.push(`Raw Value Short (Idx ${cols.SHORT}): ${parts[cols.SHORT]}`);
            }
            const oi = this.parseNum(parts[cols.OI]);
            const longs = this.parseNum(parts[cols.LONG]);
            const shorts = this.parseNum(parts[cols.SHORT]);
            if (oi === 0)
                continue;
            const chgOi = this.parseNum(parts[cols.CHG_OI]);
            const chgLong = this.parseNum(parts[cols.CHG_LONG]);
            const chgShort = this.parseNum(parts[cols.CHG_SHORT]);
            const netPos = longs - shorts;
            const netValUsd = netPos * meta.size;
            const netPct = (netPos / oi) * 100;
            const prevOi = oi - chgOi;
            const prevLong = longs - chgLong;
            const prevShort = shorts - chgShort;
            const prevNet = prevLong - prevShort;
            const prevPct = prevOi !== 0 ? (prevNet / prevOi) * 100 : 0;
            const delta = netPct - prevPct;
            const isFlip = (netPos > 0 && prevNet < 0) || (netPos < 0 && prevNet > 0);
            dataList.push({
                contract: meta.name,
                category: meta.cat,
                net_current: Math.round(netPos),
                net_pct_current: Math.round(netPct * 10) / 10,
                delta: Math.round(delta * 10) / 10,
                is_flip: isFlip,
                raw_longs: longs,
                raw_shorts: shorts,
                oi: oi,
                net_value_usd: netValUsd
            });
        }
        return dataList;
    }
    // Legacy parser for single file string (upload)
    static parseFileContent(fileContent) {
        var _a;
        const lines = fileContent.split('\n').map(l => ({ line: l, source: 'Uploaded File' }));
        const data = this.parseLines(lines);
        // Try to find date
        let reportDate = new Date().toISOString().split('T')[0];
        for (const l of fileContent.split('\n')) {
            if (l.includes(',') && ((_a = l.split(',')[2]) === null || _a === void 0 ? void 0 : _a.includes('20'))) {
                reportDate = l.split(',')[2].replace(/"/g, '').trim();
                break;
            }
        }
        return { date: reportDate, data };
    }
    static parseNum(val) {
        if (!val)
            return 0;
        const cleaned = val.replace(/\s/g, '').replace(/,/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }
}
exports.COTService = COTService;
