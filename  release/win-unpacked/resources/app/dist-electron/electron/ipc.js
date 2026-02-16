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
const fs_1 = __importDefault(require("fs"));
function setupIPC() {
    // Trade Handlers
    electron_1.ipcMain.handle('trades:getAll', (_, accountId) => trades_1.TradeRepository.getAll(accountId));
    electron_1.ipcMain.handle('trades:create', (_, trade) => trades_1.TradeRepository.create(trade));
    electron_1.ipcMain.handle('trades:update', (_, id, trade) => trades_1.TradeRepository.update(id, trade));
    electron_1.ipcMain.handle('trades:delete', (_, id) => trades_1.TradeRepository.delete(id));
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
    // Quotes Handlers
    electron_1.ipcMain.handle('quotes:getDaily', () => quotes_1.QuotesService.getQuoteOfTheDay());
    electron_1.ipcMain.handle('quotes:getAll', () => quotes_1.QuotesService.getAll());
    electron_1.ipcMain.handle('quotes:add', (_, text, author) => quotes_1.QuotesService.add(text, author));
    electron_1.ipcMain.handle('quotes:update', (_, id, text) => quotes_1.QuotesService.update(id, text));
    electron_1.ipcMain.handle('quotes:delete', (_, id) => quotes_1.QuotesService.delete(id));
    electron_1.ipcMain.handle('quotes:clearAll', () => quotes_1.QuotesService.clearAll());
    electron_1.ipcMain.handle('quotes:import', (_, content) => quotes_1.QuotesService.importCustomCSV(content));
    electron_1.ipcMain.handle('quotes:init', () => quotes_1.QuotesService.init());
}
