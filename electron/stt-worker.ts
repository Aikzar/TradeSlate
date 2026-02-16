import { parentPort, workerData } from 'worker_threads';

// Dynamic import for transformers (ESM)
let pipeline: any;
let env: any;

async function init() {
    try {
        const transformers = await import('@huggingface/transformers');
        pipeline = transformers.pipeline;
        env = transformers.env;

        // Configure persistent cache
        env.allowLocalModels = false;
        env.cacheDir = workerData.cacheDir;

        console.log('STT Worker: Initialized. Cache Dir:', env.cacheDir);
    } catch (err: any) {
        if (parentPort) parentPort.postMessage({ type: 'error', data: 'Failed to import transformers: ' + err.message });
    }
}

let currentModelId: string | null = null;
let transcriber: any = null;
let modelLoading = false;
const SAMPLE_RATE = 16000;
const MIN_SAMPLES_TO_PROCESS = SAMPLE_RATE * 3; // 3 seconds

async function loadModel(modelId: string = 'onnx-community/distil-small.en') {
    // If we already have a transcriber and it's for the SAME model, skip loading
    if (transcriber && currentModelId === modelId) {
        if (parentPort) parentPort.postMessage({ type: 'ready', data: { device: 'cached' } });
        return;
    }

    // If the model changed, we need to unload the previous one (managed by GC usually, but we clear it)
    if (currentModelId !== modelId) {
        console.log(`STT Worker: Model changed from ${currentModelId} to ${modelId}. Reloading...`);
        transcriber = null;
    }

    if (modelLoading) return; // Debounce

    modelLoading = true;
    currentModelId = modelId;
    try {
        console.log(`STT Worker: Loading model ${modelId}...`);

        // Progress callback
        const progressCallback = (progress: any) => {
            if (parentPort) parentPort.postMessage({ type: 'progress', data: progress });
        };

        // Attempt WebGPU first
        try {
            console.log('STT Worker: Attempting WebGPU...');
            transcriber = await pipeline('automatic-speech-recognition', modelId, {
                device: 'webgpu',
                dtype: 'fp32',
                progress_callback: progressCallback,
            });
            if (parentPort) parentPort.postMessage({ type: 'ready', data: { device: 'webgpu' } });
        } catch (webGpuError) {
            console.warn('STT Worker: WebGPU failed, falling back to CPU...', webGpuError);
            // Fallback to CPU
            transcriber = await pipeline('automatic-speech-recognition', modelId, {
                device: 'cpu',
                dtype: 'fp32', // Distil models often work best with fp32 on CPU if small enough, or q8
                progress_callback: progressCallback,
            });
            if (parentPort) parentPort.postMessage({ type: 'ready', data: { device: 'cpu' } });
        }
    } catch (err: any) {
        console.error('STT Worker: Model Load Error', err);
        if (parentPort) parentPort.postMessage({ type: 'error', data: err.message });
        currentModelId = null; // Reset so next attempt tries again
    } finally {
        modelLoading = false;
    }
}

let isProcessing = false;
let pendingAudioBuffer: Float32Array = new Float32Array(0);

async function processQueue() {
    if (isProcessing || !transcriber || pendingAudioBuffer.length < MIN_SAMPLES_TO_PROCESS) {
        return;
    }

    isProcessing = true;
    try {
        while (pendingAudioBuffer.length >= MIN_SAMPLES_TO_PROCESS) {
            const bufferToProcess = pendingAudioBuffer;
            pendingAudioBuffer = new Float32Array(0);

            console.log(`STT Worker: Processing buffer (${bufferToProcess.length} samples)`);
            const output = await transcriber(bufferToProcess, {
                chunk_length_s: 30,
                stride_length_s: 5,
            });

            if (output.text && output.text.trim().length > 0) {
                if (parentPort) parentPort.postMessage({ type: 'result', data: output.text });
            }
        }
    } catch (err: any) {
        console.error('STT Worker: Transcription Error', err);
        if (parentPort) parentPort.postMessage({ type: 'error', data: err.message });
    } finally {
        isProcessing = false;
    }
}

async function finalizeTranscription() {
    if (!transcriber) return;

    // Wait for ongoing processing to finish if any
    while (isProcessing) {
        console.log('STT Worker: Waiting for process loop to finish before finalization...');
        await new Promise(r => setTimeout(r, 100));
    }

    isProcessing = true;
    try {
        if (pendingAudioBuffer.length > 0) {
            const bufferToProcess = pendingAudioBuffer;
            pendingAudioBuffer = new Float32Array(0);

            console.log(`STT Worker: Finalizing transcription (${bufferToProcess.length} samples)`);
            const output = await transcriber(bufferToProcess, {
                chunk_length_s: 30,
                stride_length_s: 5,
            });
            if (output.text && output.text.trim().length > 0) {
                if (parentPort) parentPort.postMessage({ type: 'result', data: output.text });
            }
        }
    } catch (err: any) {
        console.error('STT Worker: Finalize Error', err);
        if (parentPort) parentPort.postMessage({ type: 'error', data: err.message });
    } finally {
        isProcessing = false;
    }
}

// Initialize on start
init();

if (parentPort) {
    parentPort.on('message', async (msg) => {
        if (!pipeline) await init();

        switch (msg.type) {
            case 'load':
                await loadModel(msg.model);
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
                await finalizeTranscription();
                break;
        }
    });
}
