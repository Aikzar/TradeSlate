
import { ipcMain, dialog, BrowserWindow, app } from 'electron';
import { TradeRepository } from './db/trades';
import { SettingsRepository } from './db/settings';
import { JournalRepository } from './db/journal';
import { AIService } from './ai';
import { QuotesService } from './quotes';
import { ImageService } from './imageService';
import fs from 'fs';

export function setupIPC() {
    // Helper function to restore focus
    const restoreFocus = (win: BrowserWindow) => {
        if (!win) return;
        // Simple focus restoration is enough for native dialogs
        if (win.isMinimized()) win.restore();
        win.focus();
    };

    // Window Focus Handler
    ipcMain.handle('window:focus', () => {
        const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        restoreFocus(win!);
    });

    // Dialog Handlers - Use Electron's native dialog instead of browser dialogs
    // After dialog closes, explicitly focus webContents to ensure inputs are clickable
    ipcMain.handle('dialog:confirm', async (_, message: string, title?: string) => {
        const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        const result = await dialog.showMessageBox(win!, {
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
    });

    ipcMain.handle('dialog:alert', async (_, message: string, title?: string) => {
        const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        await dialog.showMessageBox(win!, {
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
    });
    // Trade Handlers
    ipcMain.handle('trades:getAll', (_, accountId) => TradeRepository.getAll(accountId));
    ipcMain.handle('trades:create', (_, trade) => TradeRepository.create(trade));
    ipcMain.handle('trades:update', (_, id, trade) => TradeRepository.update(id, trade));
    ipcMain.handle('trades:delete', (_, id) => TradeRepository.delete(id));
    ipcMain.handle('trades:deleteMany', (_, ids) => TradeRepository.deleteMany(ids));

    // Debug
    ipcMain.handle('debug:getRawTrade', (_, id) => TradeRepository.getRaw(id));

    // Image Handlers
    ipcMain.handle('images:openPicker', () => ImageService.openFilePicker());
    ipcMain.handle('images:saveLocal', (_, sourcePath) => ImageService.saveLocalImage(sourcePath));
    ipcMain.handle('images:resolvePath', (_, localPath) => ImageService.resolveLocalPath(localPath));
    ipcMain.handle('images:deleteLocal', (_, localPath) => ImageService.deleteLocalImage(localPath));
    ipcMain.handle('images:saveAnnotated', (_, dataUrl) => ImageService.saveAnnotatedImage(dataUrl));
    ipcMain.handle('images:downloadExternal', (_, url) => ImageService.downloadExternalImage(url));

    // Accounts Handlers
    ipcMain.handle('accounts:getAll', () => import('./accounts').then(m => m.AccountsService.getAll()));
    ipcMain.handle('accounts:create', (_, name, color) => import('./accounts').then(m => m.AccountsService.create(name, color)));
    ipcMain.handle('accounts:update', (_, id, data) => import('./accounts').then(m => m.AccountsService.update(id, data)));
    ipcMain.handle('accounts:delete', (_, id) => import('./accounts').then(m => m.AccountsService.delete(id)));

    // Settings Handlers
    ipcMain.handle('settings:get', (_, key) => SettingsRepository.get(key));
    ipcMain.handle('settings:set', (_, key, value) => SettingsRepository.set(key, value));
    ipcMain.handle('settings:getAll', () => SettingsRepository.getAll());

    ipcMain.handle('settings:exportData', async () => {
        const { canceled, filePath } = await dialog.showSaveDialog({
            filters: [{ name: 'JSON', extensions: ['json'] }],
            defaultPath: `tradeslate_backup_${new Date().toISOString().split('T')[0]}.json`
        });

        if (canceled || !filePath) return false;

        const data = await SettingsRepository.exportData();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    });

    ipcMain.handle('settings:importData', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            filters: [{ name: 'JSON', extensions: ['json'] }],
            properties: ['openFile']
        });

        if (canceled || filePaths.length === 0) return false;

        const content = fs.readFileSync(filePaths[0], 'utf-8');
        const data = JSON.parse(content);

        await SettingsRepository.importData(data);
        return true;
    });

    // Journal Handlers
    ipcMain.handle('journal:getAll', () => JournalRepository.getAll());
    ipcMain.handle('journal:getByDate', (_, date) => JournalRepository.getByDate(date));
    ipcMain.handle('journal:save', (_, entry) => JournalRepository.save(entry));

    // AI Handlers
    ipcMain.handle('ai:analyzeTrade', (_, trade) => AIService.analyzeTrade(trade));
    ipcMain.handle('ai:coachJournal', (_, content, mood) => AIService.coachJournal(content, mood));
    ipcMain.handle('ai:queryTrades', (_, query, trades) => AIService.queryTrades(query, trades));
    ipcMain.handle('ai:weeklyReview', (_, trades) => AIService.weeklyReview(trades));
    ipcMain.handle('ai:rewriteJournal', (_, text, context) => AIService.rewriteJournal(text, context));

    // Quotes Handlers
    ipcMain.handle('quotes:getDaily', () => QuotesService.getQuoteOfTheDay());
    ipcMain.handle('quotes:getAll', () => QuotesService.getAll());
    ipcMain.handle('quotes:add', (_, text, author) => QuotesService.add(text, author));
    ipcMain.handle('quotes:update', (_, id, text) => QuotesService.update(id, text));
    ipcMain.handle('quotes:delete', (_, id) => QuotesService.delete(id));
    ipcMain.handle('quotes:clearAll', () => QuotesService.clearAll());
    ipcMain.handle('quotes:import', (_, content) => QuotesService.importCustomCSV(content));
    ipcMain.handle('quotes:init', () => QuotesService.init());
    ipcMain.handle('quotes:seedDefaults', (_, force) => QuotesService.seedDefaults(force));

    // Import Profile Handlers
    ipcMain.handle('importProfiles:getAll', () => import('./db/importProfiles').then(m => m.ImportProfileRepository.getAll()));
    ipcMain.handle('importProfiles:getById', (_, id) => import('./db/importProfiles').then(m => m.ImportProfileRepository.getById(id)));
    ipcMain.handle('importProfiles:create', (_, name, mappings, dateFormat, delimiter) =>
        import('./db/importProfiles').then(m => m.ImportProfileRepository.create(name, mappings, dateFormat, delimiter)));
    ipcMain.handle('importProfiles:update', (_, id, data) => import('./db/importProfiles').then(m => m.ImportProfileRepository.update(id, data)));
    ipcMain.handle('importProfiles:delete', (_, id) => import('./db/importProfiles').then(m => m.ImportProfileRepository.delete(id)));

    // COT Handlers
    ipcMain.handle('cot:getLatest', async () => {
        const { COTRepository } = await import('./db/cot');
        return COTRepository.getLatestReport();
    });

    ipcMain.handle('cot:getHistory', async () => {
        const { COTRepository } = await import('./db/cot');
        return COTRepository.getHistory(); // Default limit 10
    });

    // Parse uploaded COT file content
    ipcMain.handle('cot:parseFile', async (_, fileContent: string) => {
        const { COTService } = await import('./cot');
        return COTService.parseFileContent(fileContent);
    });

    // DEBUG: Get parser source code for debug panel
    ipcMain.handle('cot:getParserSource', async () => {
        const { COTService } = await import('./cot');
        return COTService.getParserSourceCode();
    });

    // NEW: Load files from Assets folder and parse
    ipcMain.handle('cot:loadFromAssets', async () => {
        const { COTService } = await import('./cot');
        return COTService.loadAndParseFiles(app.getAppPath());
    });

    // NEW: Automated Fetch from CFTC
    ipcMain.handle('cot:fetchLatest', async () => {
        const { COTService } = await import('./cot');
        return COTService.fetchLatestData(app.getAppPath());
    });

    // NEW: History Management
    ipcMain.handle('cot:getHistoryDates', async () => {
        const { COTRepository } = await import('./db/cot');
        return COTRepository.getAvailableDates();
    });

    ipcMain.handle('cot:getReportByDate', async (_, date: string) => {
        const { COTRepository } = await import('./db/cot');
        return COTRepository.getReportByDate(date);
    });

    // DEBUG: Search for a specific ID in file content
    ipcMain.handle('cot:debugSearchId', async (_, fileContent: string, targetId: string) => {
        const { COTService } = await import('./cot');
        return COTService.debugSearchId(fileContent, targetId);
    });


    // STT Handlers
    ipcMain.handle('stt:start', () => import('./stt').then(m => m.sttService.startListening()));
    ipcMain.handle('stt:stop', () => import('./stt').then(m => m.sttService.stopListening()));
    ipcMain.on('stt:audio', (_, chunk: Float32Array) => import('./stt').then(m => m.sttService.processAudio(chunk)));
    ipcMain.handle('stt:checkCache', (_, modelId: string) => import('./stt').then(m => m.sttService.checkModelCache(modelId)));

    // Weekly Reviews Handlers
    ipcMain.handle('weeklyReviews:getAll', () => import('./db/weeklyReviews').then(m => m.WeeklyReviewRepository.getAll()));
    ipcMain.handle('weeklyReviews:get', (_, id) => import('./db/weeklyReviews').then(m => m.WeeklyReviewRepository.getById(id)));
    ipcMain.handle('weeklyReviews:save', (_, review) => import('./db/weeklyReviews').then(m => m.WeeklyReviewRepository.save(review)));

    // Seeding Handler
    ipcMain.handle('seed:run', () => import('./SeedService').then(m => m.SeedService.seed()));
}
