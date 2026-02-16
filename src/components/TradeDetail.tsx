import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Trade } from '../types';
import { Trash2, Plus, ExternalLink, Image as ImageIcon, Pencil, Mic, Loader2, Wand2 } from 'lucide-react';
import { TagAutocomplete } from './TagAutocomplete';
import { useAccounts } from '../context/AccountContext';
import { AccountSelector } from './AccountSelector';
import { ImageEditor, DrawAction } from './ImageEditor';
import { AnnotatedImage } from './AnnotatedImage';
import { focusedConfirm, focusedAlert } from '../utils/dialogUtils';
import { toLocalStorageString, parseLocalToUTC } from '../utils/dateUtils';
import { getDisplayImageUrl } from '../utils/imageUtils';
import { RewriteModal } from './RewriteModal';

interface TradeDetailProps {
    trade: Trade;
    onClose: () => void;
    onUpdate: (id: string, data: Partial<Trade>) => Promise<void>;
    onDelete?: (id: string) => Promise<void>;
    existingTags?: string[];
    existingMistakes?: string[];
    existingSetups?: string[];
    existingTriggers?: string[];
    onDirtyChange?: (isDirty: boolean) => void;
}

export function TradeDetail({
    trade,
    onClose,
    onUpdate,
    onDelete,
    existingTags = [],
    existingMistakes = [],
    existingSetups = [],
    existingTriggers = [],
    onDirtyChange
}: TradeDetailProps) {
    const { accounts } = useAccounts();
    // Use 'any' to allow string intermediate states for numbers during editing
    const [formData, setFormData] = useState<any>(trade);
    const [isDirtyInternal, setIsDirtyInternal] = useState(false);

    // Track previous trade ID to only reset form on actual trade change
    const prevTradeIdRef = useRef<string | null>(null);

    // Wrapper to notify parent
    const setIsDirty = (val: boolean) => {
        setIsDirtyInternal(val);
        if (onDirtyChange) onDirtyChange(val);
    };

    const isDirty = isDirtyInternal;

    // AI State
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);

    const [newImageUrl, setNewImageUrl] = useState('');
    const [videoInput, setVideoInput] = useState('');
    const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewIdx, setPreviewIdx] = useState<number | null>(null);

    const [editingImageIdx, setEditingImageIdx] = useState<number | null>(null);
    const [editingImageSrc, setEditingImageSrc] = useState<string | null>(null);
    const [resolvedImages, setResolvedImages] = useState<Record<number, string>>({});

    const [isRewriting, setIsRewriting] = useState(false);
    const [showRewriteModal, setShowRewriteModal] = useState(false);
    const [rewrittenText, setRewrittenText] = useState('');
    const [activeNoteTab, setActiveNoteTab] = useState<'raw' | 'clean'>('raw');

    const handleRewrite = async (e?: React.MouseEvent) => {
        if (!formData.notesRaw) return;

        // MOCK MODE: Shift+Click to test UI without API credits
        if (e && e.shiftKey) {
            setRewrittenText("MOCK REWRITE MODE (No Credits Used)\n\nThis is a simulated rewrite to test the UI layout. The text is intentionally long to verify readability and scrolling behavior.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.\n\nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.\n\n(End of mock text)");
            setShowRewriteModal(true);
            return;
        }

        setIsRewriting(true);
        try {
            const result = await window.electronAPI.ai.rewriteJournal(formData.notesRaw, {
                market: formData.market,
                direction: formData.direction
            });
            setRewrittenText(result);
            setShowRewriteModal(true);
        } catch (err: any) {
            console.error(err);
            await focusedAlert('Rewrite Failed: ' + err.message);
        } finally {
            setIsRewriting(false);
        }
    };

    // STT State
    const [sttStatus, setSttStatus] = useState<'idle' | 'loading' | 'recording'>('idle');
    const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const notesRef = useRef<HTMLTextAreaElement | null>(null);

    // Track latest formData for async operations/callbacks to avoid stale closures
    const formDataRef = useRef(formData);
    useEffect(() => { formDataRef.current = formData; }, [formData]);

    // Initial state setup - ONLY reset formData when trade ID changes, not on every prop update
    // This prevents focus loss when trades are refreshed after import
    useEffect(() => {
        const isNewTrade = prevTradeIdRef.current !== trade.id;
        prevTradeIdRef.current = trade.id;

        if (isNewTrade) {
            // Completely different trade - reset everything
            setFormData(trade);
            setIsDirty(false);
            setFailedImages(new Set());
            if (trade && trade.meta && trade.meta.ai_analysis) {
                setAnalysis(trade.meta.ai_analysis);
            } else {
                setAnalysis(null);
            }
        }
        // If same trade ID, don't reset formData - preserve user's edits
    }, [trade]);

    const handleImageError = useCallback((index: number) => {
        setFailedImages(prev => {
            const next = new Set(prev);
            next.add(index);
            return next;
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        // Store as string/raw value during edit to support typing decimals properly
        // We will parse numbers on save/blur if needed, but for now allow string.
        setFormData((prev: any) => ({ ...prev, [name]: value }));
        setIsDirty(true);
    };

    // handleAccountChange removed - used by AccountSelector now directly

    const handleTagsChange = (tags: string[]) => {
        setFormData((prev: any) => ({ ...prev, tags }));
        setIsDirty(true);
    };

    const handleMistakesChange = (mistakes: string[]) => {
        setFormData((prev: any) => ({ ...prev, mistakes }));
        setIsDirty(true);
    };

    const handleAddImage = async () => {
        // If input is empty, open file picker
        if (!newImageUrl.trim()) {
            try {
                const filePaths = await window.electronAPI.images.openPicker();
                if (filePaths && filePaths.length > 0) {
                    const newImages: string[] = [];
                    for (const filePath of filePaths) {
                        const localPath = await window.electronAPI.images.saveLocal(filePath);
                        newImages.push(localPath);
                    }
                    setFormData((prev: any) => ({
                        ...prev,
                        images: [...(prev.images || []), ...newImages]
                    }));
                    setIsDirty(true);
                }
            } catch (err) {
                console.error('Failed to open file picker:', err);
            }
            return;
        }

        // Otherwise, add URL as before
        let url = newImageUrl.trim();

        if (url.includes('bookmap.com/s/') && !url.includes('image.php')) {
            const parts = url.split('/');
            const id = parts[parts.length - 1]?.split('?')[0];
            if (id && id.length > 5) {
                url = `https://bookmap.com/s/image.php?id=${id}`;
            }
        }

        setFormData((prev: any) => ({
            ...prev,
            images: [...(prev.images || []), url]
        }));
        setNewImageUrl('');
        setIsDirty(true);
    };

    const handleRemoveImage = (index: number) => {
        const imageUrl = (formData.images || [])[index];
        // Clean up local file if it's a local path
        if (imageUrl && imageUrl.startsWith('local://')) {
            window.electronAPI.images.deleteLocal(imageUrl).catch(console.error);
        }
        setFormData((prev: any) => ({
            ...prev,
            images: (prev.images || []).filter((_: any, i: number) => i !== index)
        }));
        setIsDirty(true);
    };

    // Resolve local:// paths to file:// URLs for display
    const resolveImageSrc = useCallback(async (url: string, idx: number) => {
        if (url.startsWith('local://')) {
            try {
                const resolved = await window.electronAPI.images.resolvePath(url);
                setResolvedImages(prev => ({ ...prev, [idx]: resolved }));
            } catch (err) {
                console.error('Failed to resolve image path:', err);
            }
        }
    }, []);

    // Resolve local images when images array changes
    useEffect(() => {
        const safeImages = Array.isArray(formData.images) ? formData.images : [];
        safeImages.forEach((url: string, idx: number) => {
            if (url.startsWith('local://') && !resolvedImages[idx]) {
                resolveImageSrc(url, idx);
            }
        });
    }, [formData.images, resolveImageSrc, resolvedImages]);

    // Auto-grow textarea
    useEffect(() => {
        if (notesRef.current) {
            notesRef.current.style.height = 'auto';
            notesRef.current.style.height = notesRef.current.scrollHeight + 'px';
        }
    }, [formData.notesRaw]);

    // Handle opening the image editor
    const handleEditImage = async (idx: number, url: string) => {
        try {
            let src = url;

            if (url.startsWith('local://')) {
                // Local file - just resolve the path
                src = resolvedImages[idx] || await window.electronAPI.images.resolvePath(url);
            } else {
                // External URL - download through main process to bypass CORS
                // Transform bookmap URLs if needed
                if (url.includes('bookmap.com/s/') && !url.includes('image.php')) {
                    const parts = url.split('/');
                    const id = parts[parts.length - 1]?.split('?')[0];
                    if (id && id.length > 5) {
                        url = `https://bookmap.com/s/image.php?id=${id}`;
                    }
                }
                // Transform TradingView share URLs to direct image URLs
                // https://www.tradingview.com/x/gzTwSchK/ -> https://s3.tradingview.com/snapshots/g/gzTwSchK.png
                if (url.includes('tradingview.com/x/')) {
                    const match = url.match(/tradingview\.com\/x\/([a-zA-Z0-9]+)/);
                    if (match && match[1]) {
                        const id = match[1];
                        const firstLetter = id.charAt(0).toLowerCase();
                        url = `https://s3.tradingview.com/snapshots/${firstLetter}/${id}.png`;
                        console.log('Transformed TradingView URL:', url);
                    }
                }
                // Download the external image - returns data URL
                src = await window.electronAPI.images.downloadExternal(url);
            }

            setEditingImageIdx(idx);
            setEditingImageSrc(src);
        } catch (err) {
            console.error('Failed to open image editor:', err);
            await focusedAlert('Failed to load image for editing: ' + (err as Error).message);
        }
    };

    // Handle saving annotated image - save annotations and auto-persist
    const handleSaveAnnotatedImage = async (_dataUrl: string, annotations: DrawAction[]) => {
        if (editingImageIdx === null) return;

        try {
            // 1. Calculate the new state using LATEST formData from Ref
            // This avoids closure staleness issues
            const currentData = formDataRef.current;
            const currentAnnotations = { ...(currentData.imageAnnotations || {}) };

            if (annotations.length > 0) {
                currentAnnotations[editingImageIdx] = annotations;
            } else {
                delete currentAnnotations[editingImageIdx];
            }

            const updatedFormData = {
                ...currentData,
                imageAnnotations: currentAnnotations
            };

            // 2. Update local state immediately so UI reflects changes
            setFormData(updatedFormData);

            // 3. Prepare clean data for DB update
            const cleanData = { ...updatedFormData };
            const numberFields = ['entryPrice', 'exitPrice', 'plannedSL', 'plannedTP', 'contracts', 'pnl', 'maePrice', 'mfePrice', 'risk', 'plannedRR', 'achievedR'];

            numberFields.forEach(field => {
                if (cleanData[field] !== undefined && cleanData[field] !== '') {
                    const num = parseFloat(cleanData[field]);
                    if (!isNaN(num)) {
                        cleanData[field] = num;
                    }
                }
            });

            // 4. Save to DB
            await onUpdate(trade.id, cleanData);
        } catch (err) {
            console.error('Failed to save annotations:', err);
            await focusedAlert('Failed to save annotations: ' + (err as Error).message);
        }

        setEditingImageIdx(null);
        setEditingImageSrc(null);
    };

    const handleSave = async () => {
        try {
            // Clean up and parse numbers before saving
            const cleanData = { ...formData };
            const numberFields = ['entryPrice', 'exitPrice', 'plannedSL', 'plannedTP', 'contracts', 'pnl', 'maePrice', 'mfePrice', 'risk', 'plannedRR', 'achievedR'];

            numberFields.forEach(field => {
                if (cleanData[field] !== undefined && cleanData[field] !== '') {
                    const num = parseFloat(cleanData[field]);
                    if (!isNaN(num)) {
                        cleanData[field] = num;
                    }
                }
            });

            // DEBUG: Check if videoUrl is present
            // DEBUG: Check if videoUrl is present
            // alert(`Debug: Saving videoUrl = ${cleanData.videoUrl}`);

            await onUpdate(trade.id, cleanData);
            setIsDirty(false);
        } catch (err) {
            console.error(err);
            await focusedAlert('Failed to save');
        }
    };

    // handleDiagnose removed

    const handleDelete = async () => {
        if (!onDelete) return;
        if (!await focusedConfirm('Are you sure you want to delete this trade?')) return;
        try {
            await onDelete(trade.id);
        } catch (err) {
            console.error(err);
            await focusedAlert('Failed to delete');
        }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const result = await window.electronAPI.ai.analyzeTrade(formData);
            setAnalysis(result);
            const newData = {
                ...formData,
                meta: { ...(formData.meta || {}), ai_analysis: result },
                aiVerdict: result.verdict // Save the verdict to the top-level field
            };
            setFormData(newData);
            await onUpdate(trade.id, newData);
        } catch (err: any) {
            await focusedAlert(err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    // STT Logic
    useEffect(() => {
        const unsubs = [
            window.electronAPI.stt.onProgress((data: any) => {
                if (data.status === 'progress') {
                    setDownloadProgress(data.progress);
                }
            }),
            window.electronAPI.stt.onReady(() => {
                setSttStatus('recording');
                setDownloadProgress(null);
            }),
            window.electronAPI.stt.onResult((text: string) => {
                setFormData((prev: any) => ({
                    ...prev,
                    notesRaw: (prev.notesRaw || '').trim() + ' ' + text.trim()
                }));
                setIsDirty(true);
            }),
            window.electronAPI.stt.onError((err: string) => {
                console.error('STT Error:', err);
                setSttStatus('idle');
                setDownloadProgress(null);
                focusedAlert('Voice Dictation Error: ' + err);
            })
        ];

        return () => {
            unsubs.forEach(unsub => unsub());
        };
    }, []);

    const startRecording = async () => {
        try {
            setSttStatus('loading');
            const micId = await window.electronAPI.settings.get('stt_mic_id');
            const constraints = {
                audio: micId && micId !== 'default' ? { deviceId: { exact: micId } } : true
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStreamRef.current = stream;

            const ctx = new AudioContext({ sampleRate: 16000 });
            audioCtxRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);

            const analyzer = ctx.createAnalyser();
            analyzer.fftSize = 256;
            analyzerRef.current = analyzer;
            source.connect(analyzer);

            const proc = ctx.createScriptProcessor(4096, 1, 1);
            processorRef.current = proc;

            proc.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                window.electronAPI.stt.sendAudio(new Float32Array(inputData));
            };

            source.connect(proc);
            proc.connect(ctx.destination);

            // Start visualizer
            const draw = () => {
                if (!canvasRef.current || !analyzerRef.current) return;
                const canvas = canvasRef.current;
                const ctx2d = canvas.getContext('2d');
                if (!ctx2d) return;

                const data = new Uint8Array(analyzerRef.current.frequencyBinCount);
                analyzerRef.current.getByteFrequencyData(data);

                ctx2d.clearRect(0, 0, canvas.width, canvas.height);
                const barWidth = (canvas.width / data.length) * 2.5;
                let x = 0;
                for (let i = 0; i < data.length; i++) {
                    const barHeight = (data[i] / 255) * canvas.height;
                    ctx2d.fillStyle = `rgb(239, 68, 68)`; // red-500
                    ctx2d.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                    x += barWidth + 1;
                }
                rafRef.current = requestAnimationFrame(draw);
            };
            draw();

            await window.electronAPI.stt.start();
        } catch (err: any) {
            console.error('Failed to start recording:', err);
            focusedAlert('Microphone access denied or error: ' + err.message);
            setSttStatus('idle');
        }
    };

    const stopRecording = async () => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioCtxRef.current) {
            await audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
        }
        analyzerRef.current = null;
        await window.electronAPI.stt.stop();
        setSttStatus('idle');
    };

    const toggleSTT = () => {
        if (sttStatus === 'recording') {
            stopRecording();
        } else {
            startRecording();
        }
    };





    // Calculate array safe values
    const safeTags = Array.isArray(formData.tags) ? formData.tags : [];
    const safeMistakes = Array.isArray(formData.mistakes) ? formData.mistakes : [];
    const safeImages = Array.isArray(formData.images) ? formData.images : [];

    // Account logic handled by AccountSelector now
    // const safeAccounts = Array.isArray(accounts) ? accounts : [];
    // const accountValue = formData.accountId || (safeAccounts.length > 0 ? safeAccounts[0].id : '');

    return (
        <div
            className="card h-full flex flex-col gap-6"
            style={{
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '24px',
                paddingBottom: '120px',
                position: 'relative'
            }}
        >
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <div>
                    <h2 className="text-xl font-bold">Trade Details</h2>
                    <div className="text-sm text-zinc-400">
                        {new Date(formData.entryDateTime).toLocaleString()}
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    {/* Account Selector - Reusing the styled component */}
                    <div className="mr-4">
                        <AccountSelector
                            variant="full"
                            showAllOption={false}
                            value={formData.accountId}
                            onChange={(id) => {
                                setFormData((prev: any) => ({ ...prev, accountId: id }));
                                setIsDirty(true);
                            }}
                        />
                    </div>

                    <button
                        className="btn flex items-center justify-center gap-2"
                        onClick={handleAnalyze}
                        disabled={analyzing}
                        style={{
                            borderColor: 'var(--accent)',
                            color: 'var(--accent)',
                            background: analyzing ? 'rgba(35, 134, 54, 0.1)' : 'transparent'
                        }}
                    >
                        {analyzing ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                Analyzing...
                            </>
                        ) : '✨ Analyze Trade'}
                    </button>
                    {/* Diagnose button removed */}
                    {isDirty && <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>}
                    {onDelete && (
                        <button className="btn border-red-500/50 text-red-500 hover:bg-red-500/10 flex items-center justify-center gap-2" onClick={handleDelete}>
                            <Trash2 size={16} /> Delete
                        </button>
                    )}
                    <button className="btn" onClick={onClose}>Close</button>
                </div>
            </div>

            {/* AI Feedback Banner */}
            {analysis && (
                <div className="card" style={{
                    border: '1px solid var(--accent)',
                    background: 'rgba(35, 134, 54, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}>
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                            <span style={{ fontWeight: 'bold', color: 'var(--accent)' }}>AI Coach Feedback</span>
                            {(analysis.verdict || formData.aiVerdict) && (
                                <span className="text-xl font-black text-white uppercase tracking-wide mt-1">
                                    {analysis.verdict || formData.aiVerdict}
                                </span>
                            )}
                        </div>
                        <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{analysis.score}/10</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '14px' }}>{analysis.feedback}</p>
                    {analysis.improvement_tip && (
                        <div style={{ fontSize: '12px', marginTop: '4px', fontStyle: 'italic', opacity: 0.9 }}>
                            💡 Tip: {analysis.improvement_tip}
                        </div>
                    )}
                </div>
            )}

            <div className="flex-1 flex flex-col gap-6 w-full max-w-full min-w-0" style={{ minWidth: 0 }}>

                {/* 3x4 Grid Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', width: '100%' }}>
                    {/* Row 1 */}
                    <div className="input-group">
                        <label className="input-label">Market</label>
                        <input name="market" value={formData.market} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Direction</label>
                        <select
                            name="direction"
                            value={formData.direction}
                            onChange={handleChange}
                            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="Long">Long</option>
                            <option value="Short">Short</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label className="input-label">Contracts</label>
                        <input name="contracts" type="number" value={formData.contracts} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Setup</label>
                        <input
                            name="setup"
                            placeholder="e.g. Pullback"
                            value={formData.setup || ''}
                            onChange={handleChange}
                            list="setup-list"
                        />
                        <datalist id="setup-list">
                            {existingSetups.map(s => <option key={s} value={s} />)}
                        </datalist>
                    </div>

                    {/* Row 2 */}
                    <div className="input-group">
                        <label className="input-label">Entry Price</label>
                        <input name="entryPrice" type="number" step="0.25" value={formData.entryPrice} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Exit Price</label>
                        <input name="exitPrice" type="number" step="0.25" value={formData.exitPrice || ''} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">PnL ($)</label>
                        <input name="pnl" type="number" step="0.01" value={formData.pnl || ''} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Trigger</label>
                        <input
                            name="entryTrigger"
                            placeholder="e.g. Candle Close"
                            value={formData.entryTrigger || ''}
                            onChange={handleChange}
                            list="trigger-list"
                        />
                        <datalist id="trigger-list">
                            {existingTriggers.map(s => <option key={s} value={s} />)}
                        </datalist>
                    </div>

                    {/* Row 3 */}
                    <div className="input-group">
                        <label className="input-label">Planned SL</label>
                        <input name="plannedSL" type="number" step="0.25" value={formData.plannedSL || ''} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Planned TP</label>
                        <input name="plannedTP" type="number" step="0.25" value={formData.plannedTP || ''} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">MAE Price</label>
                        <input name="maePrice" type="number" step="0.25" value={formData.maePrice || ''} onChange={handleChange} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">MFE Price</label>
                        <input name="mfePrice" type="number" step="0.25" value={formData.mfePrice || ''} onChange={handleChange} />
                    </div>

                    {/* Row 4 - Entry/Exit Date Times */}
                    <div className="input-group col-span-2">
                        <label className="input-label">Entry Date/Time</label>
                        <input
                            name="entryDateTime"
                            type="datetime-local"
                            step="1"
                            value={toLocalStorageString(formData.entryDateTime)}
                            onChange={(e) => {
                                const newDate = e.target.value ? parseLocalToUTC(e.target.value) : null;
                                setFormData((prev: any) => ({ ...prev, entryDateTime: newDate }));
                                setIsDirty(true);
                            }}
                        />
                    </div>
                    <div className="input-group col-span-2">
                        <label className="input-label">Exit Date/Time</label>
                        <input
                            name="exitTime"
                            type="datetime-local"
                            step="1"
                            value={toLocalStorageString(formData.exitTime)}
                            onChange={(e) => {
                                const newDate = e.target.value ? parseLocalToUTC(e.target.value) : null;
                                setFormData((prev: any) => ({ ...prev, exitTime: newDate }));
                                setIsDirty(true);
                            }}
                        />
                    </div>
                </div>

                <div className="flex flex-col">
                    <div className="flex justify-between items-center bg-black/40 border border-white/10 border-b-0 rounded-t-lg px-3 py-1">
                        <div className="flex gap-4">
                            <button
                                onClick={() => setActiveNoteTab('raw')}
                                className={`text-xs font-bold uppercase transition-colors pb-0.5 border-b-2 ${activeNoteTab === 'raw' ? 'text-white border-accent' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                            >
                                Raw Notes
                            </button>
                            <button
                                onClick={() => setActiveNoteTab('clean')}
                                className={`text-xs font-bold uppercase transition-colors pb-0.5 border-b-2 ${activeNoteTab === 'clean' ? 'text-purple-400 border-purple-500' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                            >
                                Clean (AI)
                            </button>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleRewrite}
                                disabled={isRewriting || !formData.notesRaw}
                                className={`flex items-center gap-2 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${isRewriting
                                    ? 'bg-purple-500/20 text-purple-400 animate-pulse border border-purple-500/50'
                                    : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                                    }`}
                            >
                                {isRewriting ? (
                                    <>
                                        <Loader2 size={10} className="animate-spin" />
                                        Rewriting...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={10} />
                                        Rewrite
                                    </>
                                )}
                            </button>

                            <button
                                onClick={toggleSTT}
                                className={`flex items-center gap-2 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all ${sttStatus === 'recording'
                                    ? 'bg-red-500/20 text-red-500 animate-pulse border border-red-500/50'
                                    : 'bg-white/5 text-zinc-400 hover:text-white border border-white/10'
                                    }`}
                            >
                                {sttStatus === 'loading' ? (
                                    <>
                                        <Loader2 size={10} className="animate-spin" />
                                        {downloadProgress !== null ? `${Math.round(downloadProgress)}%` : '...'}
                                    </>
                                ) : sttStatus === 'recording' ? (
                                    <>
                                        <Mic size={10} />
                                        Rec
                                    </>
                                ) : (
                                    <>
                                        <Mic size={10} />
                                        Dictate
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <textarea
                        ref={notesRef}
                        name={activeNoteTab === 'raw' ? 'notesRaw' : 'notesClean'}
                        value={activeNoteTab === 'raw' ? (formData.notesRaw || '') : (formData.notesClean || '')}
                        onChange={handleChange}
                        className={`bg-black/20 border border-white/10 rounded-b-lg p-3 text-sm text-white focus:outline-none w-full font-mono overflow-hidden ${activeNoteTab === 'clean' ? 'focus:border-purple-500' : 'focus:border-blue-500'}`}
                        style={{ minHeight: '180px', resize: 'none', lineHeight: '1.5' }}
                        placeholder={activeNoteTab === 'raw' ? "What happened? How did you feel?" : "AI rewritten notes will appear here..."}
                    />
                </div>
            </div>

            {/* Rewrite Modal */}
            {showRewriteModal && (
                <RewriteModal
                    originalText={formData.notesRaw || ''}
                    rewrittenText={rewrittenText}
                    onClose={() => setShowRewriteModal(false)}
                    onApply={(text) => {
                        setFormData((prev: any) => ({ ...prev, notesClean: text }));
                        setIsDirty(true);
                        setActiveNoteTab('clean');
                        setShowRewriteModal(false);
                    }}
                />
            )}

            {/* Tags */}
            <div className="flex flex-col gap-2">
                <div className="input-group">
                    <label className="input-label">Tags (comma separated)</label>
                    <TagAutocomplete
                        placeholder="Scalp, A+, Choppy"
                        value={safeTags}
                        onChange={handleTagsChange}
                        suggestions={existingTags}
                    />
                </div>
            </div>

            {/* Mistakes */}
            <div className="flex flex-col gap-2">
                <div className="input-group">
                    <label className="input-label">Mistakes (comma separated)</label>
                    <TagAutocomplete
                        placeholder="FOMO, Late Entry"
                        value={safeMistakes}
                        onChange={handleMistakesChange}
                        suggestions={existingMistakes}
                    />
                </div>
            </div>

            {/* Images Section */}
            <div className="flex flex-col gap-2 w-full max-w-full">
                <label className="input-label">Images / Charts</label>

                {/* Image Grid */}
                {safeImages.length > 0 && (
                    <div className="grid gap-4 mb-4 w-full max-w-full" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        {safeImages.map((url: string, idx: number) => {
                            const imgSrc = url.startsWith('local://')
                                ? resolvedImages[idx] || ''
                                : getDisplayImageUrl(url);
                            const isFailed = failedImages.has(idx) || (url.startsWith('local://') && !resolvedImages[idx]);
                            const imageAnnotations = (formData.imageAnnotations || {})[idx] as DrawAction[] | undefined;
                            const total = safeImages.length;
                            const isLast = idx === total - 1;
                            const spansFull = total === 1 || (total % 2 !== 0 && isLast);

                            return (
                                <div
                                    key={idx}
                                    className={`relative group rounded-xl overflow-hidden border border-white/10 bg-zinc-900 transition-all hover:border-white/20 shadow-lg ${spansFull ? 'col-span-4' : 'col-span-2'}`}
                                    style={{ aspectRatio: '16/9' }}
                                    onClick={() => { setPreviewUrl(imgSrc); setPreviewIdx(idx); }}
                                >
                                    {!isFailed ? (
                                        <>
                                            <div className="w-full h-full flex items-center justify-center bg-black/50">
                                                <AnnotatedImage
                                                    src={imgSrc}
                                                    annotations={imageAnnotations}
                                                    alt={`Trade Attachment ${idx + 1}`}
                                                    className="w-full h-full"
                                                    style={{ objectFit: 'contain', cursor: 'pointer' }}
                                                    onError={() => handleImageError(idx)}
                                                />
                                            </div>
                                            {/* Hover overlay with "Click to enlarge" - centered on entire tile */}
                                            <div
                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none"
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backdropFilter: 'blur(3px)'
                                                }}
                                            />
                                            <div className="absolute inset-x-0 bottom-0 p-4 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 flex justify-between items-center pointer-events-none">
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-2.5 py-1.5 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-[10px] transition-all flex items-center gap-1.5 border border-white/5 shadow-xl pointer-events-auto cursor-pointer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="Open in Browser"
                                                >
                                                    <ExternalLink size={12} /> View Source
                                                </a>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditImage(idx, url); }}
                                                    className="p-2 bg-zinc-900/90 hover:bg-blue-500/20 text-zinc-400 hover:text-blue-400 rounded-lg transition-all border border-white/5 shadow-xl pointer-events-auto cursor-pointer"
                                                    title="Edit Image"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                                    className="p-2 bg-zinc-900/90 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg transition-all border border-white/5 shadow-xl pointer-events-auto cursor-pointer"
                                                    title="Remove Image"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-900/80 gap-2">
                                            <div className="text-zinc-500">
                                                <ImageIcon size={32} />
                                            </div>
                                            <div className="text-xs text-zinc-400 max-w-full px-2 w-full">
                                                <span className="block truncate font-medium text-zinc-300">
                                                    {(() => {
                                                        try { return new URL(url).hostname.replace('www.', ''); }
                                                        catch { return 'Invalid Link'; }
                                                    })()}
                                                </span>
                                                <span className="block truncate opacity-50 text-[10px] mt-1" title={url}>{url}</span>
                                            </div>
                                            <div className="flex gap-3 mt-1 items-center justify-center">
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 rounded text-xs transition-colors font-medium flex items-center gap-1"
                                                >
                                                    <ExternalLink size={12} /> Open
                                                </a>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(idx); }}
                                                    className="px-3 py-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded text-xs transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add Image Input */}
                <div className="flex gap-2">
                    <input
                        className="bg-black-20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 flex-1"
                        placeholder="Paste image URL (Bookmap, TradingView, etc.)"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddImage(); }}
                    />
                    <button
                        onClick={handleAddImage}
                        className="btn bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center gap-2"
                    >
                        <Plus size={16} />
                        {newImageUrl.trim() ? 'Add Image' : 'Browse Files'}
                    </button>
                </div>
            </div>

            {/* Video Support with Add/Remove */}
            <div className="flex flex-col gap-2 w-full max-w-full">
                <label className="input-label">Video Recording (YouTube)</label>

                {!formData.videoUrl ? (
                    <div className="flex gap-2">
                        <input
                            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 flex-1"
                            placeholder="Paste YouTube Link (e.g. youtu.be/xyz?t=1m30s)"
                            value={videoInput}
                            onChange={(e) => setVideoInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && videoInput.trim()) {
                                    setFormData((prev: any) => ({ ...prev, videoUrl: videoInput.trim() }));
                                    setVideoInput('');
                                    setIsDirty(true);
                                }
                            }}
                        />
                        <button
                            onClick={() => {
                                if (videoInput.trim()) {
                                    setFormData((prev: any) => ({ ...prev, videoUrl: videoInput.trim() }));
                                    setVideoInput(''); // Clear input after adding
                                    setIsDirty(true);
                                }
                            }}
                            className="btn bg-white/5 hover:bg-white/10 text-white border border-white/10 flex items-center justify-center gap-2"
                            disabled={!videoInput.trim()}
                        >
                            <Plus size={16} />
                            Add Video
                        </button>
                    </div>
                ) : (
                    /* Video Thumbnail Card */
                    (() => {
                        const url = formData.videoUrl;
                        try {
                            const u = new URL(url);
                            let videoId = '';
                            let start = 0;

                            if (u.hostname.includes('youtube.com')) {
                                videoId = u.searchParams.get('v') || '';
                            } else if (u.hostname.includes('youtu.be')) {
                                videoId = u.pathname.slice(1);
                            }

                            if (videoId) videoId = videoId.replace(/\/$/, '');

                            const t = u.searchParams.get('t');
                            if (t) {
                                const m = t.match(/(\d+)m/);
                                const s = t.match(/(\d+)s/);
                                if (m) start += parseInt(m[1]) * 60;
                                if (s) start += parseInt(s[1]);
                                if (!m && !s && !isNaN(parseInt(t))) start = parseInt(t);
                            }

                            if (!videoId) return <div className="text-red-500 text-xs">Invalid Video URL</div>;

                            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                            const watchUrl = `https://www.youtube.com/watch?v=${videoId}${start > 0 ? `&t=${start}` : ''}`;
                            const timeLabel = start > 0 ? `${Math.floor(start / 60)}:${String(start % 60).padStart(2, '0')}` : null;

                            return (
                                <div className="relative group">
                                    <a
                                        href={watchUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black relative cursor-pointer"
                                        style={{ aspectRatio: '16/9' }}
                                    >
                                        <img
                                            src={thumbnailUrl}
                                            alt="Video Thumbnail"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                            }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </div>
                                        </div>
                                        {timeLabel && (
                                            <div className="absolute bottom-3 right-3 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
                                                ▶ {timeLabel}
                                            </div>
                                        )}
                                    </a>

                                    {/* Remove Button for Video */}
                                    <button
                                        onClick={async () => {
                                            if (await focusedConfirm('Remove video?')) {
                                                setFormData((prev: any) => ({ ...prev, videoUrl: null }));
                                                setIsDirty(true);
                                            }
                                        }}
                                        className="absolute top-2 right-2 p-2 bg-black/80 hover:bg-red-500/80 text-white rounded-lg transition-colors border border-white/20 shadow-xl z-10"
                                        title="Remove Video"
                                    >
                                        <Trash2 size={16} />
                                    </button>


                                </div>
                            );
                        } catch (e) {
                            return null;
                        }
                    })()
                )}
            </div>


            {/* Lightbox Preview */}
            {previewUrl && createPortal(
                <div
                    className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-8 xs:p-12 animate-fade-in cursor-zoom-out"
                    style={{ position: 'fixed', inset: 0, zIndex: 100, backdropFilter: 'blur(24px)' }}
                    onClick={() => setPreviewUrl(null)}
                >
                    <div
                        className="absolute inset-0 opacity-40 scale-110 pointer-events-none"
                        style={{ backgroundImage: `url(${previewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(120px)' }}
                    />
                    <button
                        className="absolute p-3 text-white/80 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 rounded-full transition-all border border-white/20 z-50 shadow-xl"
                        style={{ position: 'absolute', top: '1rem', right: '1rem', left: 'auto' }}
                        onClick={() => setPreviewUrl(null)}
                        title="Close Preview"
                    >
                        <Plus size={22} style={{ transform: 'rotate(45deg)' }} />
                    </button>
                    <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <AnnotatedImage
                            src={previewUrl}
                            annotations={previewIdx !== null ? (formData.imageAnnotations || {})[previewIdx] as DrawAction[] | undefined : undefined}
                            className="w-auto h-auto object-contain rounded-lg shadow-2xl"
                            alt="Preview"
                            style={{ display: 'block', objectFit: 'contain', maxHeight: '85vh', maxWidth: '90vw', boxShadow: '0 0 60px rgba(0,0,0,0.6)' }}
                        />
                    </div>
                </div>,
                document.body
            )}

            {
                editingImageSrc && editingImageIdx !== null && (
                    <ImageEditor
                        imageSrc={editingImageSrc}
                        initialAnnotations={(formData.imageAnnotations || {})[editingImageIdx] || []}
                        onSave={handleSaveAnnotatedImage}
                        onCancel={() => {
                            setEditingImageIdx(null);
                            setEditingImageSrc(null);
                        }}
                    />
                )
            }
        </div >
    );
}
