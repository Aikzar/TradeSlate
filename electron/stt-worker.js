const { parentPort, workerData } = require('worker_threads');
const path = require('path');

// Dynamic import for transformers (ESM)
let pipeline;
let env;

async function init() {
    try {
        const transformers = await import('@huggingface/transformers');
        pipeline = transformers.pipeline;
        env = transformers.env;

        // Configure persistent cache
        env.allowLocalModels = false; // Force download from hub if not cached, but we want it sticky
        env.cacheDir = workerData.cacheDir;

        console.log('STT Worker: Initialized. Cache Dir:', env.cacheDir);
    } catch (err) {
        if (parentPort) parentPort.postMessage({ type: 'error', data: 'Failed to import transformers: ' + err.message });
    }
}

let transcriber = null;
let modelLoading = false;

async function loadModel() {
    if (transcriber) {
        if (parentPort) parentPort.postMessage({ type: 'ready', data: { device: 'cached' } });
        return;
    }
    if (modelLoading) return; // Debounce

    modelLoading = true;
    try {
        console.log('STT Worker: Loading model...');

        // Progress callback
        const progressCallback = (progress) => {
            if (parentPort) parentPort.postMessage({ type: 'progress', data: progress });
        };

        // Attempt WebGPU first
        try {
            console.log('STT Worker: Attempting WebGPU...');
            transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/distil-small.en', {
                device: 'webgpu',
                dtype: 'fp32', // fp32 is safer for now, fp16 often requires specific flags
                progress_callback: progressCallback,
            });
            if (parentPort) parentPort.postMessage({ type: 'ready', data: { device: 'webgpu' } });
        } catch (webGpuError) {
            console.warn('STT Worker: WebGPU failed, falling back to WASM/CPU...', webGpuError);
            // Fallback to CPU (wasm)
            transcriber = await pipeline('automatic-speech-recognition', 'onnx-community/distil-small.en', {
                device: 'wasm',
                dtype: 'q8', // Quantized for CPU
                progress_callback: progressCallback,
            });
            if (parentPort) parentPort.postMessage({ type: 'ready', data: { device: 'wasm' } });
        }
    } catch (err) {
        console.error('STT Worker: Model Load Error', err);
        if (parentPort) parentPort.postMessage({ type: 'error', data: err.message });
    } finally {
        modelLoading = false;
    }
}

async function runTranscription(audioData) {
    if (!transcriber) {
        if (parentPort) parentPort.postMessage({ type: 'error', data: 'Model not loaded' });
        return;
    }

    try {
        // Run inference
        // Note: pipeline accepts Float32Array directly
        // We configure it to be streaming if possible, but for 'distil-small.en' specific logic might be needed for true streaming
        // For now, let's assume valid chunks or accumulating buffer. 
        // Real-time "streaming" with transformers.js requires specific chunk processing or a Streamer.
        // For simplicity in this first pass, we might just transcribe chunks, but that lacks context.
        // Better approach: User speaks -> Audio accumulates -> Silence/Interval -> Transcribe full context or new chunk.

        // However, the request is for "Streaming Text".
        // The `TextStreamer` is for generation. ASR is different.
        // We will stick to a simpler "transcribe this chunk" for now, or just send the result.

        const output = await transcriber(audioData, {
            chunk_length_s: 30,
            stride_length_s: 5,
        });

        if (parentPort) parentPort.postMessage({ type: 'result', data: output.text });

    } catch (err) {
        if (parentPort) parentPort.postMessage({ type: 'error', data: err.message });
    }
}

// Initialize on start
init();

if (parentPort) {
    parentPort.on('message', async (msg) => {
        if (!pipeline) await init();

        switch (msg.type) {
            case 'load':
                await loadModel();
                break;
            case 'audio':
                // msg.data should be Float32Array
                await runTranscription(msg.data);
                break;
            case 'stop':
                // Reset or final processing
                break;
        }
    });
}
