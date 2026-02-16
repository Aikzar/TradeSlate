"use strict";
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
exports.sttService = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const worker_threads_1 = require("worker_threads");
const settings_1 = require("./db/settings");
// Define the path to the worker script
const WORKER_PATH = path_1.default.join(__dirname, 'stt-worker.js');
class STTService {
    constructor() {
        Object.defineProperty(this, "worker", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "isModelLoaded", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        Object.defineProperty(this, "lastActivity", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Date.now()
        });
        Object.defineProperty(this, "unloadTimeout", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "cloudAudioBuffer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.startUnloadTimer();
    }
    startUnloadTimer() {
        if (this.unloadTimeout)
            clearInterval(this.unloadTimeout);
        this.unloadTimeout = setInterval(() => {
            if (this.isModelLoaded && Date.now() - this.lastActivity > 5 * 60 * 1000) {
                console.log('STT: Auto-unloading model due to inactivity.');
                this.unloadModel();
            }
        }, 60 * 1000); // Check every minute
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.worker)
                return;
            console.log('STT: Initializing Worker at', WORKER_PATH);
            // Ensure worker file exists or handle error (in dev it might not be compiled yet if .ts)
            // We'll assume stt-worker.js is present in the same dir as main.js after compilation
            // Or we use a .js file directly.
            this.worker = new worker_threads_1.Worker(path_1.default.join(__dirname, 'stt-worker.js'), {
                workerData: {
                    cacheDir: path_1.default.join(electron_1.app.getPath('userData'), 'models')
                }
            });
            this.worker.on('message', (message) => {
                this.handleWorkerMessage(message);
            });
            this.worker.on('error', (err) => {
                console.error('STT Worker Error:', err);
                this.sendToRenderer('stt:error', err.message);
            });
            this.worker.on('exit', (code) => {
                if (code !== 0) {
                    console.error(`STT Worker stopped with exit code ${code}`);
                    this.worker = null;
                    this.isModelLoaded = false;
                }
            });
        });
    }
    handleWorkerMessage(message) {
        const { type, data } = message;
        this.lastActivity = Date.now();
        switch (type) {
            case 'ready':
                console.log(`STT: Model ready on device: ${data.device}`);
                this.isModelLoaded = true;
                this.sendToRenderer('stt:ready', data);
                break;
            case 'progress':
                this.sendToRenderer('stt:progress', data);
                break;
            case 'result':
                console.log('STT: Result received from worker:', data);
                this.sendToRenderer('stt:result', data);
                break;
            case 'error':
                console.error('STT Worker Error Message:', data);
                this.sendToRenderer('stt:error', data);
                break;
        }
    }
    sendToRenderer(channel, data) {
        const win = electron_1.BrowserWindow.getFocusedWindow();
        if (win) {
            win.webContents.send(channel, data);
        }
    }
    startListening() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            this.lastActivity = Date.now();
            const providerSetting = settings_1.SettingsRepository.get('stt_provider');
            const provider = typeof providerSetting === 'string' ? providerSetting : (providerSetting === null || providerSetting === void 0 ? void 0 : providerSetting.value) || 'local';
            if (provider === 'local') {
                if (!this.worker) {
                    yield this.init();
                }
                const tierSetting = settings_1.SettingsRepository.get('stt_model_tier');
                const tier = typeof tierSetting === 'string' ? tierSetting : (tierSetting === null || tierSetting === void 0 ? void 0 : tierSetting.value) || 'small';
                const modelMap = {
                    'tiny': 'onnx-community/whisper-tiny.en',
                    'small': 'onnx-community/distil-small.en',
                    'large': 'onnx-community/distil-large-v3'
                };
                const modelId = modelMap[tier] || modelMap['small'];
                console.log(`STT: Loading local model tier: ${tier} (${modelId})`);
                (_a = this.worker) === null || _a === void 0 ? void 0 : _a.postMessage({ type: 'load', model: modelId });
            }
            else {
                const apiKeySetting = settings_1.SettingsRepository.get('openai_api_key');
                const apiKey = typeof apiKeySetting === 'string' ? apiKeySetting : apiKeySetting === null || apiKeySetting === void 0 ? void 0 : apiKeySetting.value;
                if (!apiKey) {
                    this.sendToRenderer('stt:error', 'OpenAI API Key is missing. Please add it in Settings.');
                    return;
                }
                console.log('STT: Cloud provider selected.');
                this.sendToRenderer('stt:ready', { device: 'cloud' });
            }
        });
    }
    processAudio(audioChunk) {
        this.lastActivity = Date.now();
        const p = settings_1.SettingsRepository.get('stt_provider');
        const provider = typeof p === 'string' ? p : (p === null || p === void 0 ? void 0 : p.value) || 'local';
        if (provider === 'local') {
            if (this.worker && this.isModelLoaded) {
                this.worker.postMessage({ type: 'audio', data: audioChunk });
            }
        }
        else {
            this.cloudAudioBuffer.push(new Float32Array(audioChunk));
        }
    }
    stopListening() {
        return __awaiter(this, void 0, void 0, function* () {
            this.lastActivity = Date.now();
            const providerSetting = settings_1.SettingsRepository.get('stt_provider');
            const provider = typeof providerSetting === 'string' ? providerSetting : (providerSetting === null || providerSetting === void 0 ? void 0 : providerSetting.value) || 'local';
            if (provider === 'local') {
                if (this.worker) {
                    this.worker.postMessage({ type: 'stop' });
                }
            }
            else {
                yield this.processCloudTranscription();
            }
        });
    }
    processCloudTranscription() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            if (this.cloudAudioBuffer.length === 0)
                return;
            try {
                const apiKeySetting = settings_1.SettingsRepository.get('openai_api_key');
                const apiKey = typeof apiKeySetting === 'string' ? apiKeySetting : apiKeySetting === null || apiKeySetting === void 0 ? void 0 : apiKeySetting.value;
                if (!apiKey)
                    throw new Error('API Key missing');
                // Flatten buffer
                const totalLength = this.cloudAudioBuffer.reduce((acc, curr) => acc + curr.length, 0);
                const result = new Float32Array(totalLength);
                let offset = 0;
                for (const chunk of this.cloudAudioBuffer) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }
                this.cloudAudioBuffer = [];
                // Convert Float32Array (16kHz) to WAV
                const wavBuffer = this.encodeWAV(result, 16000);
                // Send to OpenAI
                const axios = require('axios');
                const FormData = require('form-data');
                // const { Readable } = require('stream'); // Unused
                const form = new FormData();
                form.append('file', wavBuffer, { filename: 'audio.wav', contentType: 'audio/wav' });
                form.append('model', 'whisper-1');
                const response = yield axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
                    headers: Object.assign(Object.assign({}, form.getHeaders()), { 'Authorization': `Bearer ${apiKey}` })
                });
                if (response.data && response.data.text) {
                    this.sendToRenderer('stt:result', response.data.text);
                }
            }
            catch (err) {
                console.error('Cloud STT Error:', ((_a = err.response) === null || _a === void 0 ? void 0 : _a.data) || err.message);
                this.sendToRenderer('stt:error', 'Cloud transcription failed: ' + (((_d = (_c = (_b = err.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.error) === null || _d === void 0 ? void 0 : _d.message) || err.message));
            }
        });
    }
    encodeWAV(samples, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);
        const writeString = (offset, string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };
        writeString(0, 'RIFF');
        view.setUint32(4, 32 + samples.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, samples.length * 2, true);
        let offset = 44;
        for (let i = 0; i < samples.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, samples[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return Buffer.from(buffer);
    }
    unloadModel() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.worker) {
                this.worker.terminate();
                this.worker = null;
                this.isModelLoaded = false;
                this.sendToRenderer('stt:unloaded', null);
            }
        });
    }
    checkModelCache(modelId) {
        return __awaiter(this, void 0, void 0, function* () {
            const cacheDir = path_1.default.join(electron_1.app.getPath('userData'), 'models');
            // Transformers.js folders are usually named after the repo, e.g. "onnx-community--whisper-tiny.en"
            // But we can check for a simpler pattern or just the repo path converted to folder name
            const folderName = modelId.replace(/\//g, '--');
            const modelPath = path_1.default.join(cacheDir, folderName);
            return fs_1.default.existsSync(modelPath);
        });
    }
}
exports.sttService = new STTService();
