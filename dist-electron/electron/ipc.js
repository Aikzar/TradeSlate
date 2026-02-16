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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIPC = setupIPC;
const electron_1 = require("electron");
const trades_1 = require("./db/trades");
const settings_1 = require("./db/settings");
const journal_1 = require("./db/journal");
const ai_1 = require("./ai");
const quotes_1 = require("./quotes");
const imageService_1 = require("./imageService");
const fs_1 = __importDefault(require("fs"));
function setupIPC() {
    // Helper function to restore focus
    const restoreFocus = (win) => {
        if (!win)
            return;
        // Simple focus restoration is enough for native dialogs
        if (win.isMinimized())
            win.restore();
        win.focus();
    };
    // Window Focus Handler
    electron_1.ipcMain.handle('window:focus', () => {
        const win = electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0];
        restoreFocus(win);
    });
    // Dialog Handlers - Use Electron's native dialog instead of browser dialogs
    // After dialog closes, explicitly focus webContents to ensure inputs are clickable
    electron_1.ipcMain.handle('dialog:confirm', (_, message, title) => __awaiter(this, void 0, void 0, function* () {
        const win = electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0];
        const result = yield electron_1.dialog.showMessageBox(win, {
            type: 'question',
            buttons: ['Cancel', 'OK'],
            defaultId: 1,
            cancelId: 0,
            title: title || 'Confirm',
            message: message,
            noLink: true
        });
        // Explicitly focus the window and webContents to ensure inputs are clickable
        // This fixes the "ghost backdrop" issue on Windows where inputs wouldn't receive focus
        if (win) {
            win.focus();
            win.webContents.focus();
        }
        return result.response === 1; // Returns true if OK was clicked
    }));
    electron_1.ipcMain.handle('dialog:alert', (_, message, title) => __awaiter(this, void 0, void 0, function* () {
        const win = electron_1.BrowserWindow.getFocusedWindow() || electron_1.BrowserWindow.getAllWindows()[0];
        yield electron_1.dialog.showMessageBox(win, {
            type: 'info',
            buttons: ['OK'],
            title: title || 'Information',
            message: message,
            noLink: true
        });
        // Explicitly focus the window and webContents to ensure inputs are clickable
        if (win) {
            win.focus();
            win.webContents.focus();
        }
    }));
    // Trade Handlers
    electron_1.ipcMain.handle('trades:getAll', (_, accountId) => trades_1.TradeRepository.getAll(accountId));
    electron_1.ipcMain.handle('trades:create', (_, trade) => trades_1.TradeRepository.create(trade));
    electron_1.ipcMain.handle('trades:update', (_, id, trade) => trades_1.TradeRepository.update(id, trade));
    electron_1.ipcMain.handle('trades:delete', (_, id) => trades_1.TradeRepository.delete(id));
    electron_1.ipcMain.handle('trades:deleteMany', (_, ids) => trades_1.TradeRepository.deleteMany(ids));
    // Debug
    electron_1.ipcMain.handle('debug:getRawTrade', (_, id) => trades_1.TradeRepository.getRaw(id));
    // Image Handlers
    electron_1.ipcMain.handle('images:openPicker', () => imageService_1.ImageService.openFilePicker());
    electron_1.ipcMain.handle('images:saveLocal', (_, sourcePath) => imageService_1.ImageService.saveLocalImage(sourcePath));
    electron_1.ipcMain.handle('images:resolvePath', (_, localPath) => imageService_1.ImageService.resolveLocalPath(localPath));
    electron_1.ipcMain.handle('images:deleteLocal', (_, localPath) => imageService_1.ImageService.deleteLocalImage(localPath));
    electron_1.ipcMain.handle('images:saveAnnotated', (_, dataUrl) => imageService_1.ImageService.saveAnnotatedImage(dataUrl));
    electron_1.ipcMain.handle('images:downloadExternal', (_, url) => imageService_1.ImageService.downloadExternalImage(url));
    // Accounts Handlers
    electron_1.ipcMain.handle('accounts:getAll', () => Promise.resolve().then(() => __importStar(require('./accounts'))).then(m => m.AccountsService.getAll()));
    electron_1.ipcMain.handle('accounts:create', (_, name, color) => Promise.resolve().then(() => __importStar(require('./accounts'))).then(m => m.AccountsService.create(name, color)));
    electron_1.ipcMain.handle('accounts:update', (_, id, data) => Promise.resolve().then(() => __importStar(require('./accounts'))).then(m => m.AccountsService.update(id, data)));
    electron_1.ipcMain.handle('accounts:delete', (_, id) => Promise.resolve().then(() => __importStar(require('./accounts'))).then(m => m.AccountsService.delete(id)));
    // Settings Handlers
    electron_1.ipcMain.handle('settings:get', (_, key) => settings_1.SettingsRepository.get(key));
    electron_1.ipcMain.handle('settings:set', (_, key, value) => settings_1.SettingsRepository.set(key, value));
    electron_1.ipcMain.handle('settings:getAll', () => settings_1.SettingsRepository.getAll());
    electron_1.ipcMain.handle('settings:exportData', () => __awaiter(this, void 0, void 0, function* () {
        const { canceled, filePath } = yield electron_1.dialog.showSaveDialog({
            filters: [{ name: 'JSON', extensions: ['json'] }],
            defaultPath: `tradeslate_backup_${new Date().toISOString().split('T')[0]}.json`
        });
        if (canceled || !filePath)
            return false;
        const data = yield settings_1.SettingsRepository.exportData();
        fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    }));
    electron_1.ipcMain.handle('settings:importData', () => __awaiter(this, void 0, void 0, function* () {
        const { canceled, filePaths } = yield electron_1.dialog.showOpenDialog({
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        });
        if (canceled || filePaths.length === 0)
            return false;
        const content = fs_1.default.readFileSync(filePaths[0], 'utf-8');
        const data = JSON.parse(content);
        yield settings_1.SettingsRepository.importData(data);
        return true;
    }));
    // Journal Handlers
    electron_1.ipcMain.handle('journal:getAll', () => journal_1.JournalRepository.getAll());
    electron_1.ipcMain.handle('journal:getByDate', (_, date) => journal_1.JournalRepository.getByDate(date));
    electron_1.ipcMain.handle('journal:save', (_, entry) => journal_1.JournalRepository.save(entry));
    // AI Handlers
    electron_1.ipcMain.handle('ai:analyzeTrade', (_, trade) => ai_1.AIService.analyzeTrade(trade));
    electron_1.ipcMain.handle('ai:coachJournal', (_, content, mood) => ai_1.AIService.coachJournal(content, mood));
    electron_1.ipcMain.handle('ai:queryTrades', (_, query, trades) => ai_1.AIService.queryTrades(query, trades));
    electron_1.ipcMain.handle('ai:weeklyReview', (_, trades) => ai_1.AIService.weeklyReview(trades));
    electron_1.ipcMain.handle('ai:rewriteJournal', (_, text, context) => ai_1.AIService.rewriteJournal(text, context));
    // Quotes Handlers
    electron_1.ipcMain.handle('quotes:getDaily', () => quotes_1.QuotesService.getQuoteOfTheDay());
    electron_1.ipcMain.handle('quotes:getAll', () => quotes_1.QuotesService.getAll());
    electron_1.ipcMain.handle('quotes:add', (_, text, author) => quotes_1.QuotesService.add(text, author));
    electron_1.ipcMain.handle('quotes:update', (_, id, text) => quotes_1.QuotesService.update(id, text));
    electron_1.ipcMain.handle('quotes:delete', (_, id) => quotes_1.QuotesService.delete(id));
    electron_1.ipcMain.handle('quotes:clearAll', () => quotes_1.QuotesService.clearAll());
    electron_1.ipcMain.handle('quotes:import', (_, content) => quotes_1.QuotesService.importCustomCSV(content));
    electron_1.ipcMain.handle('quotes:init', () => quotes_1.QuotesService.init());
    electron_1.ipcMain.handle('quotes:seedDefaults', (_, force) => quotes_1.QuotesService.seedDefaults(force));
    // Import Profile Handlers
    electron_1.ipcMain.handle('importProfiles:getAll', () => Promise.resolve().then(() => __importStar(require('./db/importProfiles'))).then(m => m.ImportProfileRepository.getAll()));
    electron_1.ipcMain.handle('importProfiles:getById', (_, id) => Promise.resolve().then(() => __importStar(require('./db/importProfiles'))).then(m => m.ImportProfileRepository.getById(id)));
    electron_1.ipcMain.handle('importProfiles:create', (_, name, mappings, dateFormat, delimiter) => Promise.resolve().then(() => __importStar(require('./db/importProfiles'))).then(m => m.ImportProfileRepository.create(name, mappings, dateFormat, delimiter)));
    electron_1.ipcMain.handle('importProfiles:update', (_, id, data) => Promise.resolve().then(() => __importStar(require('./db/importProfiles'))).then(m => m.ImportProfileRepository.update(id, data)));
    electron_1.ipcMain.handle('importProfiles:delete', (_, id) => Promise.resolve().then(() => __importStar(require('./db/importProfiles'))).then(m => m.ImportProfileRepository.delete(id)));
    // COT Handlers
    electron_1.ipcMain.handle('cot:getLatest', () => __awaiter(this, void 0, void 0, function* () {
        const { COTRepository } = yield Promise.resolve().then(() => __importStar(require('./db/cot')));
        return COTRepository.getLatestReport();
    }));
    electron_1.ipcMain.handle('cot:getHistory', () => __awaiter(this, void 0, void 0, function* () {
        const { COTRepository } = yield Promise.resolve().then(() => __importStar(require('./db/cot')));
        return COTRepository.getHistory(); // Default limit 10
    }));
    // Parse uploaded COT file content
    electron_1.ipcMain.handle('cot:parseFile', (_, fileContent) => __awaiter(this, void 0, void 0, function* () {
        const { COTService } = yield Promise.resolve().then(() => __importStar(require('./cot')));
        return COTService.parseFileContent(fileContent);
    }));
    // DEBUG: Get parser source code for debug panel
    electron_1.ipcMain.handle('cot:getParserSource', () => __awaiter(this, void 0, void 0, function* () {
        const { COTService } = yield Promise.resolve().then(() => __importStar(require('./cot')));
        return COTService.getParserSourceCode();
    }));
    // NEW: Load files from Assets folder and parse
    electron_1.ipcMain.handle('cot:loadFromAssets', () => __awaiter(this, void 0, void 0, function* () {
        const { COTService } = yield Promise.resolve().then(() => __importStar(require('./cot')));
        return COTService.loadAndParseFiles(electron_1.app.getAppPath());
    }));
    // NEW: Automated Fetch from CFTC
    electron_1.ipcMain.handle('cot:fetchLatest', () => __awaiter(this, void 0, void 0, function* () {
        const { COTService } = yield Promise.resolve().then(() => __importStar(require('./cot')));
        return COTService.fetchLatestData(electron_1.app.getAppPath());
    }));
    // NEW: History Management
    electron_1.ipcMain.handle('cot:getHistoryDates', () => __awaiter(this, void 0, void 0, function* () {
        const { COTRepository } = yield Promise.resolve().then(() => __importStar(require('./db/cot')));
        return COTRepository.getAvailableDates();
    }));
    electron_1.ipcMain.handle('cot:getReportByDate', (_, date) => __awaiter(this, void 0, void 0, function* () {
        const { COTRepository } = yield Promise.resolve().then(() => __importStar(require('./db/cot')));
        return COTRepository.getReportByDate(date);
    }));
    // DEBUG: Search for a specific ID in file content
    electron_1.ipcMain.handle('cot:debugSearchId', (_, fileContent, targetId) => __awaiter(this, void 0, void 0, function* () {
        const { COTService } = yield Promise.resolve().then(() => __importStar(require('./cot')));
        return COTService.debugSearchId(fileContent, targetId);
    }));
    // STT Handlers
    electron_1.ipcMain.handle('stt:start', () => Promise.resolve().then(() => __importStar(require('./stt'))).then(m => m.sttService.startListening()));
    electron_1.ipcMain.handle('stt:stop', () => Promise.resolve().then(() => __importStar(require('./stt'))).then(m => m.sttService.stopListening()));
    electron_1.ipcMain.on('stt:audio', (_, chunk) => Promise.resolve().then(() => __importStar(require('./stt'))).then(m => m.sttService.processAudio(chunk)));
    electron_1.ipcMain.handle('stt:checkCache', (_, modelId) => Promise.resolve().then(() => __importStar(require('./stt'))).then(m => m.sttService.checkModelCache(modelId)));
    // Weekly Reviews Handlers
    electron_1.ipcMain.handle('weeklyReviews:getAll', () => Promise.resolve().then(() => __importStar(require('./db/weeklyReviews'))).then(m => m.WeeklyReviewRepository.getAll()));
    electron_1.ipcMain.handle('weeklyReviews:get', (_, id) => Promise.resolve().then(() => __importStar(require('./db/weeklyReviews'))).then(m => m.WeeklyReviewRepository.getById(id)));
    electron_1.ipcMain.handle('weeklyReviews:save', (_, review) => Promise.resolve().then(() => __importStar(require('./db/weeklyReviews'))).then(m => m.WeeklyReviewRepository.save(review)));
    // Seeding Handler
    electron_1.ipcMain.handle('seed:run', () => Promise.resolve().then(() => __importStar(require('./SeedService'))).then(m => m.SeedService.seed()));
}
