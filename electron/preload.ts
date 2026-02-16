import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    ping: () => console.log('pong'),
    trades: {
        getAll: (accountId?: string) => ipcRenderer.invoke('trades:getAll', accountId),
        create: (trade: any) => ipcRenderer.invoke('trades:create', trade),
        update: (id: string, trade: any) => ipcRenderer.invoke('trades:update', id, trade),
        delete: (id: string) => ipcRenderer.invoke('trades:delete', id),
        deleteMany: (ids: string[]) => ipcRenderer.invoke('trades:deleteMany', ids),
    },
    // Settings API
    settings: {
        get: (key: string) => ipcRenderer.invoke('settings:get', key),
        set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
        getAll: () => ipcRenderer.invoke('settings:getAll'),
        exportData: () => ipcRenderer.invoke('settings:exportData'),
        importData: () => ipcRenderer.invoke('settings:importData'),
    },
    // Journal API
    journal: {
        getAll: () => ipcRenderer.invoke('journal:getAll'),
        getByDate: (date: string) => ipcRenderer.invoke('journal:getByDate', date),
        save: (entry: any) => ipcRenderer.invoke('journal:save', entry)
    },
    // AI API
    ai: {
        analyzeTrade: (trade: any) => ipcRenderer.invoke('ai:analyzeTrade', trade),
        coachJournal: (content: string, mood: string) => ipcRenderer.invoke('ai:coachJournal', content, mood),
        queryTrades: (query: string, trades: any[]) => ipcRenderer.invoke('ai:queryTrades', query, trades),
        weeklyReview: (trades: any[]) => ipcRenderer.invoke('ai:weeklyReview', trades),
        rewriteJournal: (text: string, context: { market?: string; direction?: string }) => ipcRenderer.invoke('ai:rewriteJournal', text, context)
    },
    debug: {
        getRawTrade: (id: string) => ipcRenderer.invoke('debug:getRawTrade', id)
    },
    // Images API
    images: {
        openPicker: () => ipcRenderer.invoke('images:openPicker'),
        saveLocal: (sourcePath: string) => ipcRenderer.invoke('images:saveLocal', sourcePath),
        resolvePath: (localPath: string) => ipcRenderer.invoke('images:resolvePath', localPath),
        deleteLocal: (localPath: string) => ipcRenderer.invoke('images:deleteLocal', localPath),
        saveAnnotated: (dataUrl: string) => ipcRenderer.invoke('images:saveAnnotated', dataUrl),
        downloadExternal: (url: string) => ipcRenderer.invoke('images:downloadExternal', url)
    },
    quotes: {
        getDaily: () => ipcRenderer.invoke('quotes:getDaily'),
        getAll: () => ipcRenderer.invoke('quotes:getAll'),
        add: (text: string, author?: string) => ipcRenderer.invoke('quotes:add', text, author),
        update: (id: number, text: string) => ipcRenderer.invoke('quotes:update', id, text),
        delete: (id: number) => ipcRenderer.invoke('quotes:delete', id),
        clearAll: () => ipcRenderer.invoke('quotes:clearAll'),
        import: (content: string) => ipcRenderer.invoke('quotes:import', content),
        init: () => ipcRenderer.invoke('quotes:init'),
        seedDefaults: (force?: boolean) => ipcRenderer.invoke('quotes:seedDefaults', force)
    },
    // Accounts API
    accounts: {
        getAll: () => ipcRenderer.invoke('accounts:getAll'),
        create: (name: string, color?: string) => ipcRenderer.invoke('accounts:create', name, color),
        update: (id: string, data: any) => ipcRenderer.invoke('accounts:update', id, data),
        delete: (id: string) => ipcRenderer.invoke('accounts:delete', id)
    },
    // COT API
    cot: {
        getLatest: () => ipcRenderer.invoke('cot:getLatest'),
        getHistory: () => ipcRenderer.invoke('cot:getHistory'),
        parseFile: (fileContent: string) => ipcRenderer.invoke('cot:parseFile', fileContent),
        getParserSource: () => ipcRenderer.invoke('cot:getParserSource'),
        debugSearchId: (fileContent: string, targetId: string) => ipcRenderer.invoke('cot:debugSearchId', fileContent, targetId),
        loadFromAssets: () => ipcRenderer.invoke('cot:loadFromAssets'),
        fetchLatest: () => ipcRenderer.invoke('cot:fetchLatest'),
        getHistoryDates: () => ipcRenderer.invoke('cot:getHistoryDates'),
        getReportByDate: (date: string) => ipcRenderer.invoke('cot:getReportByDate', date)
    },

    // Import Profiles API
    importProfiles: {
        getAll: () => ipcRenderer.invoke('importProfiles:getAll'),
        getById: (id: string) => ipcRenderer.invoke('importProfiles:getById', id),
        create: (name: string, mappings: object, dateFormat?: string, delimiter?: string) =>
            ipcRenderer.invoke('importProfiles:create', name, mappings, dateFormat, delimiter),
        update: (id: string, data: any) => ipcRenderer.invoke('importProfiles:update', id, data),
        delete: (id: string) => ipcRenderer.invoke('importProfiles:delete', id)
    },
    // Window API - for focus management
    window: {
        focus: () => ipcRenderer.invoke('window:focus')
    },
    // Dialog API - Use Electron's native dialogs (better focus handling)
    dialog: {
        confirm: (message: string, title?: string) => ipcRenderer.invoke('dialog:confirm', message, title),
        alert: (message: string, title?: string) => ipcRenderer.invoke('dialog:alert', message, title)
    },
    // Weekly Reviews API
    weeklyReviews: {
        getAll: () => ipcRenderer.invoke('weeklyReviews:getAll'),
        get: (id: string) => ipcRenderer.invoke('weeklyReviews:get', id),
        save: (review: any) => ipcRenderer.invoke('weeklyReviews:save', review)
    },
    // Seed API
    seed: {
        run: () => ipcRenderer.invoke('seed:run')
    },
    stt: {
        start: () => ipcRenderer.invoke('stt:start'),
        stop: () => ipcRenderer.invoke('stt:stop'),
        sendAudio: (chunk: Float32Array) => ipcRenderer.send('stt:audio', chunk),
        unload: () => ipcRenderer.invoke('stt:unload'),
        checkCache: (modelId: string) => ipcRenderer.invoke('stt:checkCache', modelId),
        onProgress: (callback: any) => {
            const sub = (_: any, data: any) => callback(data);
            ipcRenderer.on('stt:progress', sub);
            return () => ipcRenderer.removeListener('stt:progress', sub);
        },
        onReady: (callback: any) => {
            const sub = (_: any, data: any) => callback(data);
            ipcRenderer.on('stt:ready', sub);
            return () => ipcRenderer.removeListener('stt:ready', sub);
        },
        onResult: (callback: any) => {
            const sub = (_: any, text: string) => callback(text);
            ipcRenderer.on('stt:result', sub);
            return () => ipcRenderer.removeListener('stt:result', sub);
        },
        onError: (callback: any) => {
            const sub = (_: any, error: string) => callback(error);
            ipcRenderer.on('stt:error', sub);
            return () => ipcRenderer.removeListener('stt:error', sub);
        },
        onUnloaded: (callback: any) => {
            const sub = () => callback();
            ipcRenderer.on('stt:unloaded', sub);
            return () => ipcRenderer.removeListener('stt:unloaded', sub);
        }
    }
});
