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
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
// Dynamic import for transformers (ESM)
let pipeline;
let env;
function init() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const transformers = yield Promise.resolve().then(() => __importStar(require('@huggingface/transformers')));
            pipeline = transformers.pipeline;
            env = transformers.env;
            // Configure persistent cache
            env.allowLocalModels = false;
            env.cacheDir = worker_threads_1.workerData.cacheDir;
            console.log('STT Worker: Initialized. Cache Dir:', env.cacheDir);
        }
        catch (err) {
            if (worker_threads_1.parentPort)
                worker_threads_1.parentPort.postMessage({ type: 'error', data: 'Failed to import transformers: ' + err.message });
        }
    });
}
let currentModelId = null;
let transcriber = null;
let modelLoading = false;
const SAMPLE_RATE = 16000;
const MIN_SAMPLES_TO_PROCESS = SAMPLE_RATE * 3; // 3 seconds
function loadModel() {
    return __awaiter(this, arguments, void 0, function* (modelId = 'onnx-community/distil-small.en') {
        // If we already have a transcriber and it's for the SAME model, skip loading
        if (transcriber && currentModelId === modelId) {
            if (worker_threads_1.parentPort)
                worker_threads_1.parentPort.postMessage({ type: 'ready', data: { device: 'cached' } });
            return;
        }
        // If the model changed, we need to unload the previous one (managed by GC usually, but we clear it)
        if (currentModelId !== modelId) {
            console.log(`STT Worker: Model changed from ${currentModelId} to ${modelId}. Reloading...`);
            transcriber = null;
        }
        if (modelLoading)
            return; // Debounce
        modelLoading = true;
        currentModelId = modelId;
        try {
            console.log(`STT Worker: Loading model ${modelId}...`);
            // Progress callback
            const progressCallback = (progress) => {
                if (worker_threads_1.parentPort)
                    worker_threads_1.parentPort.postMessage({ type: 'progress', data: progress });
            };
            // Attempt WebGPU first
            try {
                console.log('STT Worker: Attempting WebGPU...');
                transcriber = yield pipeline('automatic-speech-recognition', modelId, {
                    device: 'webgpu',
                    dtype: 'fp32',
                    progress_callback: progressCallback,
                });
                if (worker_threads_1.parentPort)
                    worker_threads_1.parentPort.postMessage({ type: 'ready', data: { device: 'webgpu' } });
            }
            catch (webGpuError) {
                console.warn('STT Worker: WebGPU failed, falling back to CPU...', webGpuError);
                // Fallback to CPU
                transcriber = yield pipeline('automatic-speech-recognition', modelId, {
                    device: 'cpu',
                    dtype: 'fp32', // Distil models often work best with fp32 on CPU if small enough, or q8
                    progress_callback: progressCallback,
                });
                if (worker_threads_1.parentPort)
                    worker_threads_1.parentPort.postMessage({ type: 'ready', data: { device: 'cpu' } });
            }
        }
        catch (err) {
            console.error('STT Worker: Model Load Error', err);
            if (worker_threads_1.parentPort)
                worker_threads_1.parentPort.postMessage({ type: 'error', data: err.message });
            currentModelId = null; // Reset so next attempt tries again
        }
        finally {
            modelLoading = false;
        }
    });
}
let isProcessing = false;
let pendingAudioBuffer = new Float32Array(0);
function processQueue() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isProcessing || !transcriber || pendingAudioBuffer.length < MIN_SAMPLES_TO_PROCESS) {
            return;
        }
        isProcessing = true;
        try {
            while (pendingAudioBuffer.length >= MIN_SAMPLES_TO_PROCESS) {
                const bufferToProcess = pendingAudioBuffer;
                pendingAudioBuffer = new Float32Array(0);
                console.log(`STT Worker: Processing buffer (${bufferToProcess.length} samples)`);
                const output = yield transcriber(bufferToProcess, {
                    chunk_length_s: 30,
                    stride_length_s: 5,
                });
                if (output.text && output.text.trim().length > 0) {
                    if (worker_threads_1.parentPort)
                        worker_threads_1.parentPort.postMessage({ type: 'result', data: output.text });
                }
            }
        }
        catch (err) {
            console.error('STT Worker: Transcription Error', err);
            if (worker_threads_1.parentPort)
                worker_threads_1.parentPort.postMessage({ type: 'error', data: err.message });
        }
        finally {
            isProcessing = false;
        }
    });
}
function finalizeTranscription() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!transcriber)
            return;
        // Wait for ongoing processing to finish if any
        while (isProcessing) {
            console.log('STT Worker: Waiting for process loop to finish before finalization...');
            yield new Promise(r => setTimeout(r, 100));
        }
        isProcessing = true;
        try {
            if (pendingAudioBuffer.length > 0) {
                const bufferToProcess = pendingAudioBuffer;
                pendingAudioBuffer = new Float32Array(0);
                console.log(`STT Worker: Finalizing transcription (${bufferToProcess.length} samples)`);
                const output = yield transcriber(bufferToProcess, {
                    chunk_length_s: 30,
                    stride_length_s: 5,
                });
                if (output.text && output.text.trim().length > 0) {
                    if (worker_threads_1.parentPort)
                        worker_threads_1.parentPort.postMessage({ type: 'result', data: output.text });
                }
            }
        }
        catch (err) {
            console.error('STT Worker: Finalize Error', err);
            if (worker_threads_1.parentPort)
                worker_threads_1.parentPort.postMessage({ type: 'error', data: err.message });
        }
        finally {
            isProcessing = false;
        }
    });
}
// Initialize on start
init();
if (worker_threads_1.parentPort) {
    worker_threads_1.parentPort.on('message', (msg) => __awaiter(void 0, void 0, void 0, function* () {
        if (!pipeline)
            yield init();
        switch (msg.type) {
            case 'load':
                yield loadModel(msg.model);
                break;
            case 'audio':
                // Append and process
                const newBuffer = new Float32Array(pendingAudioBuffer.length + msg.data.length);
                newBuffer.set(pendingAudioBuffer);
                newBuffer.set(msg.data, pendingAudioBuffer.length);
                pendingAudioBuffer = newBuffer;
                processQueue();
                break;
            case 'stop':
                yield finalizeTranscription();
                break;
        }
    }));
}
