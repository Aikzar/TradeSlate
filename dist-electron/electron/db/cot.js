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
Object.defineProperty(exports, "__esModule", { value: true });
exports.COTRepository = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// In-memory cache
let historyCache = null;
let dbPath = '';
exports.COTRepository = {
    init: (userDataPath) => {
        dbPath = path.join(userDataPath, 'cot_history.json');
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
        }
    },
    load: () => {
        if (!dbPath)
            throw new Error('COTRepository not initialized');
        if (!historyCache) {
            try {
                if (fs.existsSync(dbPath)) {
                    const data = fs.readFileSync(dbPath, 'utf-8');
                    historyCache = JSON.parse(data);
                }
                else {
                    historyCache = {};
                }
            }
            catch (e) {
                console.error('Failed to load cot_history.json', e);
                historyCache = {};
            }
        }
        return historyCache || {};
    },
    save: (data) => {
        if (!dbPath)
            throw new Error('COTRepository not initialized');
        historyCache = data; // Update cache
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    },
    saveReport: (report) => {
        const history = exports.COTRepository.load();
        history[report.date] = report;
        exports.COTRepository.save(history);
    },
    getLatestReport: () => {
        const history = exports.COTRepository.load();
        const dates = Object.keys(history).sort().reverse();
        if (dates.length === 0)
            return null;
        return history[dates[0]];
    },
    getHistory: (limit = 10) => {
        const history = exports.COTRepository.load();
        const dates = Object.keys(history).sort().reverse().slice(0, limit);
        return dates.map(date => history[date]);
    },
    // Check if we have data for a specific date
    hasDataForDate: (date) => {
        const history = exports.COTRepository.load();
        return !!history[date];
    },
    getReportByDate: (date) => {
        const history = exports.COTRepository.load();
        return history[date] || null;
    },
    getAvailableDates: () => {
        const history = exports.COTRepository.load();
        return Object.keys(history).sort().reverse();
    }
};
