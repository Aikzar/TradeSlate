"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    ping: () => console.log('pong'),
    trades: {
        getAll: () => electron_1.ipcRenderer.invoke('trades:getAll'),
        create: (trade) => electron_1.ipcRenderer.invoke('trades:create', trade),
        update: (id, trade) => electron_1.ipcRenderer.invoke('trades:update', id, trade),
        delete: (id) => electron_1.ipcRenderer.invoke('trades:delete', id),
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
        coachJournal: (content, mood) => electron_1.ipcRenderer.invoke('ai:coachJournal', content, mood)
    },
    quotes: {
        getDaily: () => electron_1.ipcRenderer.invoke('quotes:getDaily'),
        getAll: () => electron_1.ipcRenderer.invoke('quotes:getAll'),
        add: (text, author) => electron_1.ipcRenderer.invoke('quotes:add', text, author),
        update: (id, text) => electron_1.ipcRenderer.invoke('quotes:update', id, text),
        delete: (id) => electron_1.ipcRenderer.invoke('quotes:delete', id),
        clearAll: () => electron_1.ipcRenderer.invoke('quotes:clearAll'),
        import: (content) => electron_1.ipcRenderer.invoke('quotes:import', content),
        init: () => electron_1.ipcRenderer.invoke('quotes:init')
    },
    // Accounts API
    accounts: {
        getAll: () => electron_1.ipcRenderer.invoke('accounts:getAll'),
        create: (name, color) => electron_1.ipcRenderer.invoke('accounts:create', name, color),
        update: (id, data) => electron_1.ipcRenderer.invoke('accounts:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('accounts:delete', id)
    }
});
