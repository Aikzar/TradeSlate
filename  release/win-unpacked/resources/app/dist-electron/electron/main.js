"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
const ipc_1 = require("./ipc");
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//    app.quit();
// }
function createWindow() {
    const isDev = !electron_1.app.isPackaged;
    // Create the browser window.
    const win = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.js'),
        },
        // Hide standard menu bar for sleek look (optional, maybe keep for dev)
        autoHideMenuBar: true,
        icon: isDev ? path_1.default.join(__dirname, 'icon.png') : path_1.default.join(__dirname, '../../electron/icon.png')
    });
    // Open external links in default browser
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            require('electron').shell.openExternal(url);
        }
        return { action: 'deny' };
    });
    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    }
    else {
        // In production, load the index.html from dist
        win.loadFile(path_1.default.join(__dirname, '../../dist/index.html'));
        // TEMPORARY: Open DevTools in production to debug white screen
        win.webContents.openDevTools();
    }
}
electron_1.app.whenReady().then(() => {
    console.log('--- APP READY ---');
    try {
        (0, db_1.initDB)();
        (0, ipc_1.setupIPC)();
        createWindow();
    }
    catch (err) {
        require('electron').dialog.showErrorBox('Startup Error', err.message);
    }
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
process.on('uncaughtException', (error) => {
    require('electron').dialog.showErrorBox('Uncaught Exception', error.message + '\n' + error.stack);
});
process.on('unhandledRejection', (error) => {
    require('electron').dialog.showErrorBox('Unhandled Rejection', error.message || String(error));
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
