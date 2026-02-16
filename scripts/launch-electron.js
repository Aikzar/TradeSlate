const { spawn } = require('child_process');
const path = require('path');

// Explicitly delete the problematic env var
delete process.env.ELECTRON_RUN_AS_NODE;

// Path to electron binary
const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
const appPath = path.join(__dirname, '..');

console.log('--- LAUNCHER STARTING ---');
console.log('Unsetting ELECTRON_RUN_AS_NODE...');

const child = spawn(electronPath, [appPath], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }
});

child.on('error', (err) => {
    console.error('Failed to start Electron:', err);
});

child.on('exit', (code) => {
    console.log(`Electron exited with code ${code}`);
    process.exit(code);
});
