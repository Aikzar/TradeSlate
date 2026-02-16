


import { app, BrowserWindow } from 'electron';

import path from 'path';

import { initDB } from './db';
import { setupIPC } from './ipc';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//    app.quit();
// }

function createWindow() {
    const isDev = !app.isPackaged;

    // Create the browser window.
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        // Hide standard menu bar for sleek look (optional, maybe keep for dev)
        autoHideMenuBar: true,
        icon: isDev ? path.join(__dirname, 'icon.png') : path.join(__dirname, '../../electron/icon.png')
    });

    // Open external links in default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            require('electron').shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    const indexUrl = path.join(__dirname, '../../dist/index.html');

    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    } else {
        // In production, load the index.html from dist
        win.loadFile(indexUrl);
    }
}

app.whenReady().then(() => {
    console.log('--- APP READY ---');
    try {
        initDB();



        setupIPC();
        createWindow();
    } catch (err: any) {
        require('electron').dialog.showErrorBox('Startup Error', err.message);
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

(process as any).on('uncaughtException', (error: any) => {
    require('electron').dialog.showErrorBox('Uncaught Exception', error.message + '\n' + error.stack);
});

(process as any).on('unhandledRejection', (error: any) => {
    require('electron').dialog.showErrorBox('Unhandled Rejection', error.message || String(error));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
