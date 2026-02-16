"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    ping: () => console.log('pong'),
    trades: {
        getAll: (accountId) => electron_1.ipcRenderer.invoke('trades:getAll', accountId),
        create: (trade) => electron_1.ipcRenderer.invoke('trades:create', trade),
        update: (id, trade) => electron_1.ipcRenderer.invoke('trades:update', id, trade),
        delete: (id) => electron_1.ipcRenderer.invoke('trades:delete', id),
        deleteMany: (ids) => electron_1.ipcRenderer.invoke('trades:deleteMany', ids),
    },
    // Settings API
    settings: {
        get: (key) => electron_1.ipcRenderer.invoke('settings:get', key),
        set: (key, value) => electron_1.ipcRenderer.invoke('settings:set', key, value),
        getAll: () => electron_1.ipcRenderer.invoke('settings:getAll'),
        exportData: () => electron_1.ipcRenderer.invoke('settings:exportData'),
        importData: () => electron_1.ipcRenderer.invoke('settings:importData'),
    },
    // Journal API
    journal: {
        getAll: () => electron_1.ipcRenderer.invoke('journal:getAll'),
        getByDate: (date) => electron_1.ipcRenderer.invoke('journal:getByDate', date),
        save: (entry) => electron_1.ipcRenderer.invoke('journal:save', entry)
    },
    // AI API
    ai: {
        analyzeTrade: (trade) => electron_1.ipcRenderer.invoke('ai:analyzeTrade', trade),
        coachJournal: (content, mood) => electron_1.ipcRenderer.invoke('ai:coachJournal', content, mood),
        queryTrades: (query, trades) => electron_1.ipcRenderer.invoke('ai:queryTrades', query, trades),
        weeklyReview: (trades) => electron_1.ipcRenderer.invoke('ai:weeklyReview', trades),
        rewriteJournal: (text, context) => electron_1.ipcRenderer.invoke('ai:rewriteJournal', text, context)
    },
    debug: {
        getRawTrade: (id) => electron_1.ipcRenderer.invoke('debug:getRawTrade', id)
    },
    // Images API
    images: {
        openPicker: () => electron_1.ipcRenderer.invoke('images:openPicker'),
        saveLocal: (sourcePath) => electron_1.ipcRenderer.invoke('images:saveLocal', sourcePath),
        resolvePath: (localPath) => electron_1.ipcRenderer.invoke('images:resolvePath', localPath),
        deleteLocal: (localPath) => electron_1.ipcRenderer.invoke('images:deleteLocal', localPath),
        saveAnnotated: (dataUrl) => electron_1.ipcRenderer.invoke('images:saveAnnotated', dataUrl),
        downloadExternal: (url) => electron_1.ipcRenderer.invoke('images:downloadExternal', url)
    },
    quotes: {
        getDaily: () => electron_1.ipcRenderer.invoke('quotes:getDaily'),
        getAll: () => electron_1.ipcRenderer.invoke('quotes:getAll'),
        add: (text, author) => electron_1.ipcRenderer.invoke('quotes:add', text, author),
        update: (id, text) => electron_1.ipcRenderer.invoke('quotes:update', id, text),
        delete: (id) => electron_1.ipcRenderer.invoke('quotes:delete', id),
        clearAll: () => electron_1.ipcRenderer.invoke('quotes:clearAll'),
        import: (content) => electron_1.ipcRenderer.invoke('quotes:import', content),
        init: () => electron_1.ipcRenderer.invoke('quotes:init'),
        seedDefaults: (force) => electron_1.ipcRenderer.invoke('quotes:seedDefaults', force)
    },
    // Accounts API
    accounts: {
        getAll: () => electron_1.ipcRenderer.invoke('accounts:getAll'),
        create: (name, color) => electron_1.ipcRenderer.invoke('accounts:create', name, color),
        update: (id, data) => electron_1.ipcRenderer.invoke('accounts:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('accounts:delete', id)
    },
    // COT API
    cot: {
        getLatest: () => electron_1.ipcRenderer.invoke('cot:getLatest'),
        getHistory: () => electron_1.ipcRenderer.invoke('cot:getHistory'),
        parseFile: (fileContent) => electron_1.ipcRenderer.invoke('cot:parseFile', fileContent),
        getParserSource: () => electron_1.ipcRenderer.invoke('cot:getParserSource'),
        debugSearchId: (fileContent, targetId) => electron_1.ipcRenderer.invoke('cot:debugSearchId', fileContent, targetId),
        loadFromAssets: () => electron_1.ipcRenderer.invoke('cot:loadFromAssets'),
        fetchLatest: () => electron_1.ipcRenderer.invoke('cot:fetchLatest'),
        getHistoryDates: () => electron_1.ipcRenderer.invoke('cot:getHistoryDates'),
        getReportByDate: (date) => electron_1.ipcRenderer.invoke('cot:getReportByDate', date)
    },
    // Import Profiles API
    importProfiles: {
        getAll: () => electron_1.ipcRenderer.invoke('importProfiles:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('importProfiles:getById', id),
        create: (name, mappings, dateFormat, delimiter) => electron_1.ipcRenderer.invoke('importProfiles:create', name, mappings, dateFormat, delimiter),
        update: (id, data) => electron_1.ipcRenderer.invoke('importProfiles:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('importProfiles:delete', id)
    },
    // Window API - for focus management
    window: {
        focus: () => electron_1.ipcRenderer.invoke('window:focus')
    },
    // Dialog API - Use Electron's native dialogs (better focus handling)
    dialog: {
        confirm: (message, title) => electron_1.ipcRenderer.invoke('dialog:confirm', message, title),
        alert: (message, title) => electron_1.ipcRenderer.invoke('dialog:alert', message, title)
    },
    // Weekly Reviews API
    weeklyReviews: {
        getAll: () => electron_1.ipcRenderer.invoke('weeklyReviews:getAll'),
        get: (id) => electron_1.ipcRenderer.invoke('weeklyReviews:get', id),
        save: (review) => electron_1.ipcRenderer.invoke('weeklyReviews:save', review)
    },
    // Seed API
    seed: {
        run: () => electron_1.ipcRenderer.invoke('seed:run')
    },
    stt: {
        start: () => electron_1.ipcRenderer.invoke('stt:start'),
        stop: () => electron_1.ipcRenderer.invoke('stt:stop'),
        sendAudio: (chunk) => electron_1.ipcRenderer.send('stt:audio', chunk),
        unload: () => electron_1.ipcRenderer.invoke('stt:unload'),
        checkCache: (modelId) => electron_1.ipcRenderer.invoke('stt:checkCache', modelId),
        onProgress: (callback) => {
            const sub = (_, data) => callback(data);
            electron_1.ipcRenderer.on('stt:progress', sub);
            return () => electron_1.ipcRenderer.removeListener('stt:progress', sub);
        },
        onReady: (callback) => {
            const sub = (_, data) => callback(data);
            electron_1.ipcRenderer.on('stt:ready', sub);
            return () => electron_1.ipcRenderer.removeListener('stt:ready', sub);
        },
        onResult: (callback) => {
            const sub = (_, text) => callback(text);
            electron_1.ipcRenderer.on('stt:result', sub);
            return () => electron_1.ipcRenderer.removeListener('stt:result', sub);
        },
        onError: (callback) => {
            const sub = (_, error) => callback(error);
            electron_1.ipcRenderer.on('stt:error', sub);
            return () => electron_1.ipcRenderer.removeListener('stt:error', sub);
        },
        onUnloaded: (callback) => {
            const sub = () => callback();
            electron_1.ipcRenderer.on('stt:unloaded', sub);
            return () => electron_1.ipcRenderer.removeListener('stt:unloaded', sub);
        }
    }
});
