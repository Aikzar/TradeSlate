import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { Worker } from 'worker_threads';
import { SettingsRepository } from './db/settings';

// Define the path to the worker script
const WORKER_PATH = path.join(__dirname, 'stt-worker.js');

class STTService {
    private worker: Worker | null = null;
    private isModelLoaded = false;
    private lastActivity = Date.now();
    private unloadTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.startUnloadTimer();
    }

    private startUnloadTimer() {
        if (this.unloadTimeout) clearInterval(this.unloadTimeout);
        this.unloadTimeout = setInterval(() => {
            if (this.isModelLoaded && Date.now() - this.lastActivity > 5 * 60 * 1000) {
                console.log('STT: Auto-unloading model due to inactivity.');
                this.unloadModel();
            }
        }, 60 * 1000); // Check every minute
    }

    async init() {
        if (this.worker) return;

        console.log('STT: Initializing Worker at', WORKER_PATH);

        // Ensure worker file exists or handle error (in dev it might not be compiled yet if .ts)
        // We'll assume stt-worker.js is present in the same dir as main.js after compilation
        // Or we use a .js file directly.

        this.worker = new Worker(path.join(__dirname, 'stt-worker.js'), {
            workerData: {
                cacheDir: path.join(app.getPath('userData'), 'models')
            }
        });

        this.worker.on('message', (message) => {
            this.handleWorkerMessage(message);
        });

        this.worker.on('error', (err: Error) => {
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
    }

    private handleWorkerMessage(message: any) {
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

    private sendToRenderer(channel: string, data: any) {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
            win.webContents.send(channel, data);
        }
    }

    async startListening() {
        this.lastActivity = Date.now();
        const providerSetting = SettingsRepository.get('stt_provider');
        const provider = typeof providerSetting === 'string' ? providerSetting : providerSetting?.value || 'local';

        if (provider === 'local') {
            if (!this.worker) {
                await this.init();
            }

            const tierSetting = SettingsRepository.get('stt_model_tier');
            const tier = typeof tierSetting === 'string' ? tierSetting : tierSetting?.value || 'small';

            const modelMap: Record<string, string> = {
                'tiny': 'onnx-community/whisper-tiny.en',
                'small': 'onnx-community/distil-small.en',
                'large': 'onnx-community/distil-large-v3'
            };
            const modelId = modelMap[tier] || modelMap['small'];

            console.log(`STT: Loading local model tier: ${tier} (${modelId})`);
            this.worker?.postMessage({ type: 'load', model: modelId });
        } else {
            const apiKeySetting = SettingsRepository.get('openai_api_key');
            const apiKey = typeof apiKeySetting === 'string' ? apiKeySetting : apiKeySetting?.value;
            if (!apiKey) {
                this.sendToRenderer('stt:error', 'OpenAI API Key is missing. Please add it in Settings.');
                return;
            }
            console.log('STT: Cloud provider selected.');
            this.sendToRenderer('stt:ready', { device: 'cloud' });
        }
    }

    private cloudAudioBuffer: Float32Array[] = [];

    processAudio(audioChunk: Float32Array) {
        this.lastActivity = Date.now();
        const p = SettingsRepository.get('stt_provider');
        const provider = typeof p === 'string' ? p : p?.value || 'local';
        if (provider === 'local') {
            if (this.worker && this.isModelLoaded) {
                this.worker.postMessage({ type: 'audio', data: audioChunk });
            }
        } else {
            this.cloudAudioBuffer.push(new Float32Array(audioChunk));
        }
    }

    async stopListening() {
        this.lastActivity = Date.now();
        const providerSetting = SettingsRepository.get('stt_provider');
        const provider = typeof providerSetting === 'string' ? providerSetting : providerSetting?.value || 'local';

        if (provider === 'local') {
            if (this.worker) {
                this.worker.postMessage({ type: 'stop' });
            }
        } else {
            await this.processCloudTranscription();
        }
    }

    private async processCloudTranscription() {
        if (this.cloudAudioBuffer.length === 0) return;

        try {
            const apiKeySetting = SettingsRepository.get('openai_api_key');
            const apiKey = typeof apiKeySetting === 'string' ? apiKeySetting : apiKeySetting?.value;

            if (!apiKey) throw new Error('API Key missing');

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

            const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (response.data && response.data.text) {
                this.sendToRenderer('stt:result', response.data.text);
            }
        } catch (err: any) {
            console.error('Cloud STT Error:', err.response?.data || err.message);
            this.sendToRenderer('stt:error', 'Cloud transcription failed: ' + (err.response?.data?.error?.message || err.message));
        }
    }

    private encodeWAV(samples: Float32Array, sampleRate: number) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        const writeString = (offset: number, string: string) => {
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

    async unloadModel() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isModelLoaded = false;
            this.sendToRenderer('stt:unloaded', null);
        }
    }

    async checkModelCache(modelId: string): Promise<boolean> {
        const cacheDir = path.join(app.getPath('userData'), 'models');
        // Transformers.js folders are usually named after the repo, e.g. "onnx-community--whisper-tiny.en"
        // But we can check for a simpler pattern or just the repo path converted to folder name
        const folderName = modelId.replace(/\//g, '--');
        const modelPath = path.join(cacheDir, folderName);
        return fs.existsSync(modelPath);
    }
}

export const sttService = new STTService();
