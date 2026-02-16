import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounts } from '../context/AccountContext';
import { Info, ChevronDown, ChevronRight } from 'lucide-react';
import { useTrades } from '../hooks/useTrades';
import { ImportManager } from '../components/ImportManager';
import { focusedAlert, focusedConfirm } from '../utils/dialogUtils';

export function Settings() {
    const { } = useTrades();
    const [exporting, setExporting] = useState(false);
    const [importing, setImporting] = useState(false);

    // API Keys State
    const [geminiKey, setGeminiKey] = useState('');
    const [openAIKey, setOpenAIKey] = useState('');
    const [sttProvider, setSttProvider] = useState<'local' | 'cloud'>('local');
    const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
    const [selectedMic, setSelectedMic] = useState<string>('default');
    const [sttModelTier, setSttModelTier] = useState<'tiny' | 'small' | 'large'>('small');
    const [cachedModels, setCachedModels] = useState<Record<string, boolean>>({});
    const [showSttTooltip, setShowSttTooltip] = useState(false);
    const [diagStatus, setDiagStatus] = useState<string | null>(null);
    const diagCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const diagRafRef = useRef<number | null>(null);
    const diagAnalyzerRef = useRef<AnalyserNode | null>(null);
    const diagContextRef = useRef<AudioContext | null>(null);
    const diagProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const loadKeys = async () => {
            try {
                const g = await window.electronAPI.settings.get('gemini_api_key');
                if (g && typeof g === 'string') setGeminiKey(g);
                else if (g?.value) setGeminiKey(g.value);

                const o = await window.electronAPI.settings.get('openai_api_key');
                if (o && typeof o === 'string') setOpenAIKey(o);
                else if (o?.value) setOpenAIKey(o.value);

                const p = await window.electronAPI.settings.get('stt_provider');
                if (p && typeof p === 'string') setSttProvider(p as any);
                else if (p?.value) setSttProvider(p.value as any);

                const micId = await window.electronAPI.settings.get('stt_mic_id');
                if (micId && typeof micId === 'string') setSelectedMic(micId);
                else if (micId?.value) setSelectedMic(micId.value);

                const tier = await window.electronAPI.settings.get('stt_model_tier');
                if (tier && typeof tier === 'string') setSttModelTier(tier as any);
                else if (tier?.value) setSttModelTier(tier.value as any);

                // Enumerate mics
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    setMics(devices.filter(d => d.kind === 'audioinput'));
                } catch (err) {
                    console.error('Failed to enum mics:', err);
                }

                checkAllCaches();
            } catch (e) {
                console.error("Failed to load settings keys", e);
            }
        };
        loadKeys();
    }, []);

    const checkAllCaches = async () => {
        const models = {
            'tiny': 'onnx-community/whisper-tiny.en',
            'small': 'onnx-community/distil-small.en',
            'large': 'onnx-community/distil-large-v3'
        };
        const results: Record<string, boolean> = {};
        for (const [key, id] of Object.entries(models)) {
            try {
                results[key] = await window.electronAPI.stt.checkCache(id);
            } catch (e) {
                console.warn(`Failed to check cache for ${key}:`, e);
                results[key] = false;
            }
        }
        setCachedModels(results);
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            await window.electronAPI.settings.exportData();
            await focusedAlert('Export Complete');
        } catch (err: any) {
            await focusedAlert('Export Failed: ' + err.message);
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async () => {
        if (!await focusedConfirm('This will Overwrite current data. Are you sure?')) return;
        setImporting(true);
        try {
            await window.electronAPI.settings.importData();
            await focusedAlert('Import Complete. Please restart app.');
        } catch (err: any) {
            await focusedAlert('Import Failed: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleSeedData = async () => {
        if (!await focusedConfirm('This will ADD the demo data to your existing data (skipping duplicates).\n\nAre you sure you want to proceed?')) return;
        try {
            await window.electronAPI.seed.run();
            await focusedAlert('Seed data imported successfully! The app will now reload.');
            window.location.reload();
        } catch (err: any) {
            await focusedAlert('Seeding failed: ' + err.message);
        }
    };

    const toggleSection = (id: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const SettingsSection = ({ id, title, children }: { id: string; title: string; children: React.ReactNode }) => {
        const isOpen = expandedSections[id];
        return (
            <div className="card flex-col gap-0 p-0 overflow-hidden" style={{ transition: 'all 0.3s ease' }}>
                <div
                    onClick={() => toggleSection(id)}
                    style={{
                        padding: '16px 20px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        backgroundColor: isOpen ? 'rgba(255,255,255,0.03)' : 'transparent',
                        transition: 'background-color 0.2s',
                        userSelect: 'none'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isOpen ? 'rgba(255,255,255,0.03)' : 'transparent')}
                >
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {title}
                    </h3>
                    {isOpen ? <ChevronDown size={18} opacity={0.5} /> : <ChevronRight size={18} opacity={0.5} />}
                </div>
                {isOpen && (
                    <div style={{ padding: '20px', borderTop: '1px solid var(--border)', animation: 'slide-down 0.2s ease-out' }}>
                        {children}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', boxSizing: 'border-box', maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ margin: 0, marginBottom: '12px' }}>Settings</h2>

            <SettingsSection id="account" title="👤 Account Management">
                <AccountManager />
            </SettingsSection>

            <SettingsSection id="trading" title="⚙️ Trading Preferences">
                <TradingPreferences />
            </SettingsSection>

            <div style={{ position: 'relative', zIndex: 50 }}>
                <SettingsSection id="behavioral" title="🧠 Behavioral & Risk">
                    <BehavioralSettings />
                </SettingsSection>
            </div>

            <div style={{ position: 'relative', zIndex: 40 }}>
                <SettingsSection id="import" title="📥 Import Trades">
                    <ImportManager hideFileInput />
                </SettingsSection>
            </div>

            <SettingsSection id="ai" title="🤖 AI Assistant">
                <div className="flex flex-col gap-4">
                    <div className="input-group">
                        <label className="input-label">Gemini API Key</label>
                        <div className="flex gap-2">
                            <input
                                type="password"
                                className="w-full"
                                placeholder="AIza..."
                                value={geminiKey}
                                onChange={(e) => setGeminiKey(e.target.value)}
                            />
                            <button className="btn btn-primary" onClick={async () => {
                                if (geminiKey) {
                                    await window.electronAPI.settings.set('gemini_api_key', geminiKey);
                                    await focusedAlert('Key Saved!');
                                }
                            }}>Save</button>
                        </div>
                    </div>
                    <AIPromptSettings />
                </div>
            </SettingsSection>

            <SettingsSection id="stt" title="🎙️ Voice Dictation (STT)">
                <div className="flex flex-col gap-4">
                    <div className="input-group">
                        <label className="input-label">Provider</label>
                        <select
                            value={sttProvider}
                            onChange={async (e) => {
                                const val = e.target.value as 'local' | 'cloud';
                                setSttProvider(val);
                                await window.electronAPI.settings.set('stt_provider', val);
                            }}
                            className="w-full bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none"
                        >
                            <option value="local">Local (WebGPU / WASM)</option>
                            <option value="cloud">Cloud (OpenAI Whisper)</option>
                        </select>
                    </div>

                    {sttProvider === 'local' && (
                        <div className="input-group relative">
                            <div className="flex items-center gap-2 mb-1">
                                <label className="input-label mb-0">Local Engine Quality</label>
                                <div
                                    style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'help' }}
                                    onMouseEnter={() => setShowSttTooltip(true)}
                                    onMouseLeave={() => setShowSttTooltip(false)}
                                >
                                    <Info size={14} style={{ color: '#71717a', transition: 'color 0.2s' }} />

                                    {showSttTooltip && (
                                        <div
                                            className="animate-fade-in"
                                            style={{
                                                position: 'absolute',
                                                bottom: 'calc(100% + 8px)',
                                                left: '0',
                                                width: '280px',
                                                backgroundColor: '#18181b', // Zinc 900
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                                                zIndex: 100,
                                                padding: '0',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            <div style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#d4d4d8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model Comparison</span>
                                            </div>
                                            <table style={{ width: '100%', fontSize: '10px', textAlign: 'left', borderCollapse: 'collapse' }}>
                                                <thead>
                                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                                        <th style={{ padding: '8px', color: '#71717a', fontWeight: 'normal' }}>Tier</th>
                                                        <th style={{ padding: '8px', color: '#71717a', fontWeight: 'normal' }}>Size</th>
                                                        <th style={{ padding: '8px', color: '#71717a', fontWeight: 'normal' }}>RAM</th>
                                                        <th style={{ padding: '8px', color: '#71717a', fontWeight: 'normal' }}>Acc</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#d4d4d8' }}>Performance</td>
                                                        <td style={{ padding: '8px' }}>~75MB</td>
                                                        <td style={{ padding: '8px' }}>Low</td>
                                                        <td style={{ padding: '8px', color: '#22c55e' }}>85%</td>
                                                    </tr>
                                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#d4d4d8' }}>Balanced</td>
                                                        <td style={{ padding: '8px' }}>~150MB</td>
                                                        <td style={{ padding: '8px' }}>Mod</td>
                                                        <td style={{ padding: '8px', color: '#22c55e' }}>95%</td>
                                                    </tr>
                                                    <tr>
                                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#d4d4d8' }}>Accuracy</td>
                                                        <td style={{ padding: '8px' }}>~750MB</td>
                                                        <td style={{ padding: '8px' }}>High</td>
                                                        <td style={{ padding: '8px', color: '#22c55e' }}>99%</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <div style={{ padding: '8px', backgroundColor: 'rgba(39, 39, 42, 0.5)', fontSize: '9px', color: '#a1a1aa', fontStyle: 'italic' }}>
                                                Tip: "Accuracy" tier is best for tickers (EURUSD, BTC) and specific numbers.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <select
                                value={sttModelTier}
                                onMouseEnter={checkAllCaches}
                                onChange={async (e) => {
                                    const val = e.target.value as 'tiny' | 'small' | 'large';
                                    setSttModelTier(val);
                                    await window.electronAPI.settings.set('stt_model_tier', val);
                                    await window.electronAPI.stt.unload();
                                    checkAllCaches(); // Refresh cache status
                                }}
                                className="w-full bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none"
                            >
                                <option value="tiny">Performance (Tiny) {cachedModels.tiny ? ' ✓' : ''}</option>
                                <option value="small">Balanced (Small) {cachedModels.small ? ' ✓' : ''}</option>
                                <option value="large">Accuracy (Large) {cachedModels.large ? ' ✓' : ''}</option>
                            </select>
                            <p className="mt-1.5 text-[10px] text-zinc-500 leading-relaxed italic">
                                Local transcription uses your PC's GPU (via WebGPU) for privacy and speed. Models are downloaded once and cached. Higher quality models require more RAM and a stronger graphics card.
                            </p>
                        </div>
                    )}

                    {sttProvider === 'cloud' && (
                        <div className="input-group">
                            <label className="input-label">OpenAI API Key (Whisper)</label>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    className="w-full"
                                    placeholder="sk-..."
                                    value={openAIKey}
                                    onChange={(e) => setOpenAIKey(e.target.value)}
                                />
                                <button className="btn btn-primary" onClick={async () => {
                                    if (openAIKey) {
                                        await window.electronAPI.settings.set('openai_api_key', openAIKey);
                                        await focusedAlert('Key Saved!');
                                    }
                                }}>Save</button>
                            </div>
                        </div>
                    )}

                    <div className="input-group">
                        <label className="input-label">Microphone</label>
                        <select
                            value={selectedMic}
                            onChange={async (e) => {
                                setSelectedMic(e.target.value);
                                await window.electronAPI.settings.set('stt_mic_id', e.target.value);
                            }}
                            className="w-full bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none"
                        >
                            <option value="default">System Default</option>
                            {mics.map(m => (
                                <option key={m.deviceId} value={m.deviceId}>{m.label || `Mic ${m.deviceId.slice(0, 5)}...`}</option>
                            ))}
                        </select>
                    </div>

                    <div className="pt-2 border-t border-white/10 mt-2 flex items-center justify-between">
                        <button
                            onClick={async () => {
                                if (diagRafRef.current) {
                                    cancelAnimationFrame(diagRafRef.current);
                                    diagRafRef.current = null;
                                }
                                setDiagStatus('Starting diagnosis...');
                                try {
                                    const stream = await navigator.mediaDevices.getUserMedia({
                                        audio: selectedMic !== 'default' ? { deviceId: { exact: selectedMic } } : true
                                    });
                                    const audioContext = new AudioContext({ sampleRate: 16000 });
                                    diagContextRef.current = audioContext;

                                    const source = audioContext.createMediaStreamSource(stream);
                                    const analyzer = audioContext.createAnalyser();
                                    analyzer.fftSize = 256;
                                    diagAnalyzerRef.current = analyzer;
                                    source.connect(analyzer);

                                    const processor = audioContext.createScriptProcessor(4096, 1, 1);
                                    diagProcessorRef.current = processor;
                                    source.connect(processor);
                                    processor.connect(audioContext.destination);

                                    processor.onaudioprocess = (e) => {
                                        const input = e.inputBuffer.getChannelData(0);
                                        window.electronAPI.stt.sendAudio(new Float32Array(input));
                                    };

                                    setDiagStatus('Mic Check: Recording... Please speak.');

                                    const draw = () => {
                                        if (!diagCanvasRef.current || !diagAnalyzerRef.current) return;
                                        const canvas = diagCanvasRef.current;
                                        const ctx2d = canvas.getContext('2d');
                                        if (!ctx2d) return;
                                        const data = new Uint8Array(diagAnalyzerRef.current.frequencyBinCount);
                                        diagAnalyzerRef.current.getByteFrequencyData(data);
                                        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
                                        const barWidth = (canvas.width / data.length) * 2.5;
                                        let x = 0;
                                        for (let i = 0; i < data.length; i++) {
                                            const barHeight = (data[i] / 255) * canvas.height;
                                            ctx2d.fillStyle = `rgb(34, 197, 94)`;
                                            ctx2d.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                                            x += barWidth + 1;
                                        }
                                        diagRafRef.current = requestAnimationFrame(draw);
                                    };
                                    draw();

                                    await new Promise(r => setTimeout(r, 3000));
                                    const data = new Uint8Array(analyzer.frequencyBinCount);
                                    analyzer.getByteFrequencyData(data);
                                    const level = data.reduce((a, b) => a + b, 0);
                                    setDiagStatus(`Mic Check: ${level > 500 ? 'OK (Signal detected)' : 'NO SIGNAL (Is it muted?)'}`);

                                    setDiagStatus(prev => prev + '\nInitializing AI Engine (this may take a moment)...');

                                    const unsubResult = window.electronAPI.stt.onResult((text: string) => {
                                        setDiagStatus(prev => prev + `\n[TRANSCRIPTION]: ${text}`);
                                    });

                                    await new Promise<void>((resolve) => {
                                        const unsubReady = window.electronAPI.stt.onReady((info: any) => {
                                            setDiagStatus(prev => prev + `\nAI Engine Ready (${info.device}). Please speak now!`);
                                            setTimeout(resolve, 500);
                                            unsubReady();
                                        });
                                        window.electronAPI.stt.start();
                                    });

                                    await new Promise(r => setTimeout(r, 10000));
                                    await window.electronAPI.stt.stop();
                                    unsubResult();
                                    setDiagStatus(prev => prev + '\nEngine: Finished test.');

                                    if (diagRafRef.current) cancelAnimationFrame(diagRafRef.current);
                                    stream.getTracks().forEach(t => t.stop());
                                    processor.disconnect();
                                    await audioContext.close();
                                    diagContextRef.current = null;
                                    diagProcessorRef.current = null;
                                    diagAnalyzerRef.current = null;

                                } catch (err: any) {
                                    setDiagStatus(`Diagnosis failed: ${err.message}`);
                                }
                            }}
                            className="text-xs text-zinc-400 hover:text-zinc-200 underline transition-colors"
                        >
                            Diagnose Voice Engine
                        </button>
                        <canvas
                            ref={diagCanvasRef}
                            width={100}
                            height={20}
                            className="bg-black/20 rounded border border-white/5"
                        />
                    </div>
                    {diagStatus && (
                        <pre className="mt-2 p-2 bg-black/40 rounded text-[10px] text-zinc-300 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                            {diagStatus}
                        </pre>
                    )}
                    <div className="text-xs text-zinc-400 opacity-70 mt-4">
                        <p>Model: <b>{sttModelTier === 'tiny' ? 'whisper-tiny.en' : sttModelTier === 'large' ? 'distil-large-v3' : 'distil-small.en'}</b></p>
                        <p>Hardware acceleration (WebGPU) will be used if available, otherwise falls back to CPU.</p>
                    </div>
                </div>
            </SettingsSection>

            <SettingsSection id="affirmations" title="✨ Affirmations Manager">
                <AffirmationsManager />
            </SettingsSection>

            <SettingsSection id="data" title="💾 Data Management">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4 w-full items-center">
                        <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
                            {exporting ? 'Exporting...' : 'Export Data (Backup)'}
                        </button>
                        <button className="btn" onClick={handleImport} disabled={importing} style={{ borderColor: '#f85149', color: '#f85149' }}>
                            {importing ? 'Importing...' : 'Import Data (Restore)'}
                        </button>
                        <button className="btn ml-auto" onClick={handleSeedData} style={{ borderColor: 'var(--accent)', color: 'var(--accent)', width: 'fit-content' }}>
                            🌱 Seed Demo Data
                        </button>
                    </div>
                </div>
            </SettingsSection>




            <div className="card flex-col gap-2 p-5">
                <div style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>TradeSlate v1.0.0 (Beta)</div>
                    <div><strong>Local Storage</strong>: Your journal data is stored 100% on this device.</div>
                    <div><strong>AI Privacy</strong>: AI analysis uses the Gemini API. While your core database is local, specific trade data sent for "Ask AI" is processed by Google Cloud.</div>
                    <div><strong>Systemic Core</strong>: Built for rules-based execution.</div>
                    <div><strong>Technical</strong>: WebGPU/WASM Enabled.</div>
                    <div style={{ marginTop: '8px' }}><strong>Support</strong>: <a href="https://github.com/Aikzar/TradeSlate" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Github</a></div>
                </div>
            </div>
        </div>
    );
}

function AccountManager() {
    const { accounts, createAccount, updateAccount, deleteAccount } = useAccounts();
    const [newName, setNewName] = useState('');
    const [newColor, setNewColor] = useState('#3b82f6');

    // Inline editing state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editColor, setEditColor] = useState('#3b82f6');

    const handleCreate = async () => {
        if (!newName.trim()) return;
        await createAccount(newName, newColor);
        setNewName('');
    };

    const handleStartEdit = (acc: { id: string; name: string; color?: string }) => {
        setEditingId(acc.id);
        setEditName(acc.name);
        setEditColor(acc.color || '#3b82f6');
    };

    const handleSaveEdit = async () => {
        if (!editingId || !editName.trim()) return;
        await updateAccount(editingId, { name: editName.trim(), color: editColor });
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
    };

    const handleDelete = async (id: string) => {
        if (!await focusedConfirm('Are you sure you want to delete this account?')) return;
        try {
            await deleteAccount(id);
        } catch (err: any) {
            await focusedAlert(err.message);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <label className="input-label">New Account Name</label>
                    <input
                        className="w-full"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g. Funded Acc 1"
                    />
                </div>
                <div>
                    <label className="input-label">Color</label>
                    <div className="h-[38px] flex items-center">
                        <input
                            type="color"
                            value={newColor}
                            onChange={e => setNewColor(e.target.value)}
                            style={{ height: '34px', width: '60px', padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                        />
                    </div>
                </div>
                <button className="btn btn-primary h-[38px]" onClick={handleCreate}>Create</button>
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ background: 'var(--bg-tertiary)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                        <tr>
                            <th style={{ padding: '8px' }}>Name</th>
                            <th style={{ padding: '8px' }}>Include in 'All Accounts'</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.map(acc => (
                            <tr key={acc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '8px' }}>
                                    {editingId === acc.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={editColor}
                                                onChange={e => setEditColor(e.target.value)}
                                                style={{ height: '24px', width: '32px', padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                                            />
                                            <input
                                                className="flex-1"
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveEdit();
                                                    if (e.key === 'Escape') handleCancelEdit();
                                                }}
                                                style={{ padding: '4px 8px', fontSize: '13px' }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: acc.color || '#3b82f6' }} />
                                            {acc.name}
                                            {acc.id === 'main-account' && <span className="text-xs opacity-50 ml-2">(Default)</span>}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '8px' }}>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={acc.isAggregated}
                                            onChange={e => updateAccount(acc.id, { isAggregated: e.target.checked })}
                                        />
                                        <span className="text-xs text-zinc-400">Aggregated</span>
                                    </label>
                                </td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>
                                    {editingId === acc.id ? (
                                        <>
                                            <button onClick={handleSaveEdit} className="btn-icon text-green-500" style={{ marginRight: '8px' }}>✓</button>
                                            <button onClick={handleCancelEdit} className="btn-icon text-zinc-400">✕</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => handleStartEdit(acc)} className="btn-icon" style={{ marginRight: '8px' }}>✎</button>
                                            {accounts.length > 1 && (
                                                <button onClick={() => handleDelete(acc.id)} className="btn-icon text-red-500">×</button>
                                            )}
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function AffirmationsManager() {
    const [quotes, setQuotes] = useState<{ id: number; text: string; author?: string; is_custom: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [newQuote, setNewQuote] = useState('');
    const [frequency, setFrequency] = useState('daily');
    const [showImport, setShowImport] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    // Initial Load
    useState(() => {
        loadQuotes();
        loadSettings();
    });

    async function loadQuotes() {
        setLoading(true);
        try {
            const q = await window.electronAPI.quotes.getAll();
            setQuotes(q);
        } catch (e) { console.error(e); }
        setLoading(false);
    }

    async function loadSettings() {
        const s = await window.electronAPI.settings.get('quote_frequency');
        if (s) {
            // Handle both object wrapper and direct string
            const val = typeof s === 'string' ? s : (s.value || 'daily');
            setFrequency(val);
        }
    }

    async function handleAdd() {
        if (!newQuote) return;
        await window.electronAPI.quotes.add(newQuote);
        setNewQuote('');
        loadQuotes();
    }

    async function handleClearAll() {
        if (!await focusedConfirm('Are you sure you want to DELETE ALL affirmations? This cannot be undone.')) return;
        await window.electronAPI.quotes.clearAll();
        loadQuotes();
    }

    function handleEdit(q: { id: number, text: string }) {
        setEditingId(q.id);
        setEditContent(q.text);
    }

    async function handleSaveEdit() {
        if (editingId !== null && editContent.trim()) {
            await window.electronAPI.quotes.update(editingId, editContent.trim());
            setEditingId(null);
            loadQuotes();
        }
    }

    function handleCancelEdit() {
        setEditingId(null);
    }

    async function handleDelete(id: number) {
        if (!await focusedConfirm('Delete this affirmation?')) return;
        await window.electronAPI.quotes.delete(id);
        loadQuotes();
    }

    async function handleFrequencyChange(val: string) {
        setFrequency(val);
        await window.electronAPI.settings.set('quote_frequency', val);
    }

    async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const content = ev.target?.result as string;
            const count = await window.electronAPI.quotes.import(content);
            await focusedAlert(`Imported ${count} affirmations!`);
            setShowImport(false);
            loadQuotes();
        };
        reader.readAsText(file);
    }

    // Sample CSV download
    const handleDownloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Quote,Author\n\"I trade my plan not my PnL\",Unknown\n\"Discipline is freedom\",Jocko";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "affirmations_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-4 items-center">
                <label className="input-label" style={{ minWidth: '80px' }}>Frequency:</label>
                <select
                    value={frequency}
                    onChange={e => handleFrequencyChange(e.target.value)}
                    style={{ padding: '8px', borderRadius: '6px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                >
                    <option value="daily">Once a Day</option>
                    <option value="hourly">Every Hour</option>
                    <option value="always">Every Reopen</option>
                </select>
                <div style={{ flex: 1 }} />
                <button
                    className="btn"
                    onClick={async () => {
                        const count = await window.electronAPI.quotes.seedDefaults(true);
                        await focusedAlert(`Loaded ${count} default affirmations!`);
                        loadQuotes();
                    }}
                    style={{ fontSize: '12px', marginRight: '8px', borderColor: 'var(--accent)', color: 'var(--accent)' }}
                >
                    Load Default Affirmations
                </button>
                <button className="btn" onClick={handleClearAll} style={{ fontSize: '12px', color: 'var(--danger)', borderColor: 'var(--danger)', marginRight: '8px' }}>Clear All</button>
                <button className="btn" onClick={() => setShowImport(!showImport)} style={{ fontSize: '12px' }}>Bulk Import CSV</button>
            </div>

            {showImport && (
                <div className="card" style={{ background: 'var(--bg-tertiary)', padding: '12px' }}>
                    <div className="flex justify-between items-center mb-2">
                        <span className="input-label">Select CSV File</span>
                        <button style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={handleDownloadTemplate}>Download Template</button>
                    </div>
                    <input type="file" accept=".csv" onChange={handleImport} ref={fileRef} />
                </div>
            )}

            <div className="flex gap-2">
                <input
                    className="w-full"
                    placeholder="Type a new affirmation..."
                    value={newQuote}
                    onChange={e => setNewQuote(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                />
                <button className="btn btn-primary" onClick={handleAdd}>Add</button>
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                {loading ? <div className="p-4 text-center">Loading...</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <tbody>
                            {quotes.map(q => (
                                <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '6px 8px' }}>
                                        {editingId === q.id ? (
                                            <input
                                                className="w-full"
                                                value={editContent}
                                                onChange={e => setEditContent(e.target.value)}
                                                autoFocus
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleSaveEdit();
                                                    if (e.key === 'Escape') handleCancelEdit();
                                                }}
                                                style={{ padding: '4px 8px', fontSize: '13px' }}
                                            />
                                        ) : (
                                            <>
                                                {q.text} {q.author && <span style={{ opacity: 0.6 }}>— {q.author}</span>}
                                                {q.is_custom === 1 && <span style={{ marginLeft: '8px', fontSize: '10px', background: 'var(--accent)', color: 'black', padding: '1px 3px', borderRadius: '3px' }}>CUSTOM</span>}
                                            </>
                                        )}
                                    </td>
                                    <td style={{ padding: '6px 8px', width: '60px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        {editingId === q.id ? (
                                            <>
                                                <button onClick={handleSaveEdit} className="btn-icon text-green-500" style={{ marginRight: '8px', background: 'none', border: 'none', cursor: 'pointer' }}>✓</button>
                                                <button onClick={handleCancelEdit} className="btn-icon text-zinc-400" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(q)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '14px', marginRight: '8px' }}
                                                    title="Edit"
                                                >
                                                    ✎
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(q.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, fontSize: '16px', color: 'var(--danger)' }}
                                                    title="Delete"
                                                >
                                                    ×
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'right' }}>
                {quotes.length} Affirmations available
            </div>
        </div>
    );
}

function TradingPreferences() {
    const [minR, setMinR] = useState('-0.1');
    const [maxR, setMaxR] = useState('0.1');
    const [timezoneOffset, setTimezoneOffset] = useState('0');
    const [loading, setLoading] = useState(true);

    // Load initial settings
    useState(() => {
        (async () => {
            try {
                const setting = await window.electronAPI.settings.get('break_even_range');
                if (setting) {
                    setMinR(setting.min.toString());
                    setMaxR(setting.max.toString());
                }
                const tzSetting = await window.electronAPI.settings.get('timezone_offset');
                if (tzSetting) {
                    setTimezoneOffset(tzSetting.value?.toString() || tzSetting.toString());
                }
            } catch (e) {
                console.error("Failed to load settings", e);
            } finally {
                setLoading(false);
            }
        })();
    });

    const handleSave = async () => {
        const min = parseFloat(minR);
        const max = parseFloat(maxR);
        const tz = parseInt(timezoneOffset);

        if (isNaN(min) || isNaN(max)) {
            await focusedAlert("Please enter valid numbers for Min and Max R");
            return;
        }

        if (min >= max) {
            await focusedAlert("Min R must be less than Max R");
            return;
        }

        if (isNaN(tz) || tz < -12 || tz > 12) {
            await focusedAlert("Timezone offset must be between -12 and +12");
            return;
        }

        try {
            await window.electronAPI.settings.set('break_even_range', JSON.stringify({ min, max }));
            await window.electronAPI.settings.set('timezone_offset', tz);
            await focusedAlert("Preferences Saved!");
        } catch (e: any) {
            await focusedAlert("Failed to save: " + e.message);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <label className="input-label" style={{ fontSize: '13px', fontWeight: 600 }}>Break-Even Range (R-Multiple)</label>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '-4px 0 8px 0' }}>
                    Trades with an achieved R-Multiple within this range will be counted as "Break-Even".
                </p>
                <div className="flex gap-4 items-center">
                    <div className="flex flex-col gap-1 flex-1">
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Min R (e.g. -0.1)</span>
                        <input
                            type="number"
                            step="0.1"
                            className="w-full"
                            value={minR}
                            onChange={e => setMinR(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Max R (e.g. 0.1)</span>
                        <input
                            type="number"
                            step="0.1"
                            className="w-full"
                            value={maxR}
                            onChange={e => setMaxR(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="input-label" style={{ fontSize: '13px', fontWeight: 600 }}>Timezone Settings</label>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '-4px 0 8px 0' }}>
                    Adjust the time display in analytics (e.g. +1 for CET, -5 for EST).
                </p>
                <div className="flex gap-4 items-center">
                    <div className="flex flex-col gap-1 flex-1">
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Offset (Hours)</span>
                        <input
                            type="number"
                            step="1"
                            min="-12"
                            max="12"
                            className="w-full"
                            value={timezoneOffset}
                            onChange={e => setTimezoneOffset(e.target.value)}
                        />
                    </div>
                    <div className="flex-1"></div> {/* Spacer */}
                </div>
            </div>

            <div className="border-t border-white/5 pt-4 flex justify-end">
                <button className="btn btn-primary" style={{ height: '38px' }} onClick={handleSave}>
                    Save Preferences
                </button>
            </div>
        </div>
    );
}

const DEFAULT_REWRITE_PROMPT = `Act as a technical S2T cleanup tool for traders. 
Task: Convert the messy voice transcription below into a clear, legible record.

Constraints:
1. Fix grammar, remove filler words (um, ah, like), and correct phonetic S2T errors.
2. Contextualize using {{market}} and {{direction}}. 
3. Recognize and format trading terms: CVD, Absorption, LIQ, VWAP, etc.
4. STRICT: No flowery "AI-speak" or professional transitions. 
5. Preserve original emotional tone and raw logic—do not sanitize the trader's intent.

Transcription:
{{notes_raw}}`;
const DEFAULT_TRADE_PROMPT = `You are a professional trading coach. Analyze this trade execution and provide constructive feedback.

Trade Data:
- Market: {{market}} {{direction}}
- Entry: {{entryDateTime}} @ {{entryPrice}}
- Exit: {{exitTime}} @ {{exitPrice}}
- PnL: {{pnl}}
- Setup: {{setup}}
- Mistakes: {{mistakes}}
- Trader Notes: {{notesRaw}}

Metrics (Ground Truth):
- Heat %: {{heatPercent}}
- MFE R: {{mfeR}}
- Profit Capture: {{profitCapturePercent}}

Instructions for Metrics:
1. These metrics are the 'Ground Truth' for this trade. 
2. If heat_percent is > 1.0 (100%), immediately flag this as a critical risk failure (Moving Stops).
3. If profit_capture_percent is < 0.1 (10%) on a winner, flag it as an early exit issue.
4. If these metrics are null, NaN, or 0 when prices are missing, ignore them and rely on the trader notes and price data instead.

Provide a JSON response with the following structure:
{
    "verdict": "A short 2-3 word label for this trade (e.g. 'Disciplined Loss', 'Lucky Win', 'Impulsive Entry')",
    "score": 1-10 rating of execution quality,
    "feedback": "Concise feedback paragraph (max 2 sentences)",
    "psychology_check": "Observation on emotional state based on notes/results",
    "improvement_tip": "One actionable tip for next time"
}
Return ONLY valid JSON.`;

const DEFAULT_WEEKLY_REVIEW_PROMPT = `You are a lead trading performance coach. Review this minified data for the past week:

Weekly Trade Data:
{{minifiedWeeklyTradeData}}

Your Mission:

Identify Themes: Look at the mistakes and setup fields. Identify 2 recurring technical or psychological patterns.

Process Wins: Select Top 3 trades with the best discipline (high achieved_r or positive status with no mistakes).

Critical Reviews: Select Top 3 trades needing review. Mandatory: Include any trade where achieved_r <= -1.0.

Return ONLY a JSON response:
{
    "week_summary": "2-sentence technical/psychological overview.",
    "top_process_wins": [{ "title": "Title", "reason": "Why", "tradeId": "original_id" }],
    "critical_review_needed": [{"title": "Title", "reason": "Rule broken", "tradeId": "original_id" }],
    "next_week_focus": "One specific drill.",
    "replay_recommendation": "1 specific trade (asset/time) for simulator replay."
}
Return ONLY valid JSON.`;

const MODEL_PRICING: Record<string, { input: number; output: number, label: string }> = {
    'gemini-3.0-pro': { input: 2.00, output: 12.00, label: 'Gemini 3.0 Pro (Most Intelligent)' },
    'gemini-3.0-flash': { input: 0.50, output: 3.00, label: 'Gemini 3.0 Flash (Balanced/Speed)' },
    'gemini-2.5-pro': { input: 1.25, output: 10.00, label: 'Gemini 2.5 Pro (Advanced Thinking)' },
    'gemini-2.5-flash': { input: 0.15, output: 0.60, label: 'Gemini 2.5 Flash (Best Price/Perf)' },
    'gemini-2.5-flash-lite': { input: 0.075, output: 0.30, label: 'Gemini 2.5 Flash-Lite (Ultra Fast)' },
};

const TASK_ESTIMATES: Record<string, { input: number; output: number }> = {
    rewrite: { input: 600, output: 500 },
    review: { input: 1500, output: 500 },
    weekly: { input: 5000, output: 1000 },
};

function AIPromptSettings() {
    const [activeTab, setActiveTab] = useState<'review' | 'rewrite' | 'weekly' | 'models'>('review');
    const [reviewPrompt, setReviewPrompt] = useState(DEFAULT_TRADE_PROMPT);
    const [rewritePrompt, setRewritePrompt] = useState(DEFAULT_REWRITE_PROMPT);
    const [weeklyPrompt, setWeeklyPrompt] = useState(DEFAULT_WEEKLY_REVIEW_PROMPT);

    // Model Selection State
    const [modelRewrite, setModelRewrite] = useState('gemini-2.5-flash');
    const [modelReview, setModelReview] = useState('gemini-2.5-flash');
    const [modelWeekly, setModelWeekly] = useState('gemini-2.5-flash');

    const [loading, setLoading] = useState(true);

    // Load saved settings
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const savedReview = await window.electronAPI.settings.get('ai_prompt_trade_review');
                if (mounted && savedReview && savedReview.value) setReviewPrompt(savedReview.value);

                const savedRewrite = await window.electronAPI.settings.get('ai_prompt_rewrite');
                if (mounted && savedRewrite && savedRewrite.value) setRewritePrompt(savedRewrite.value);

                const savedWeekly = await window.electronAPI.settings.get('ai_prompt_weekly_review');
                if (mounted && savedWeekly && savedWeekly.value) setWeeklyPrompt(savedWeekly.value);

                const mRew = await window.electronAPI.settings.get('ai_model_rewrite');
                if (mounted && mRew && mRew.value) setModelRewrite(mRew.value);

                const mRev = await window.electronAPI.settings.get('ai_model_review');
                if (mounted && mRev && mRev.value) setModelReview(mRev.value);

                const mWk = await window.electronAPI.settings.get('ai_model_weekly');
                if (mounted && mWk && mWk.value) setModelWeekly(mWk.value);

            } catch (e) { console.error(e); }
            if (mounted) setLoading(false);
        })();
        return () => { mounted = false; };
    }, []);

    const handleSave = async () => {
        try {
            if (activeTab === 'review') {
                if (!reviewPrompt.includes('{{market}}') || (!reviewPrompt.includes('json') && !reviewPrompt.includes('JSON'))) {
                    if (!await focusedConfirm('Warning: Your prompt seems to be missing important placeholders or JSON instructions. Data may break. Continue?')) return;
                }
                await window.electronAPI.settings.set('ai_prompt_trade_review', reviewPrompt);
                await focusedAlert('Trade Review Prompt Saved!');
            } else if (activeTab === 'rewrite') {
                await window.electronAPI.settings.set('ai_prompt_rewrite', rewritePrompt);
                await focusedAlert('Rewrite Prompt Saved!');
            } else if (activeTab === 'weekly') {
                if (!weeklyPrompt.includes('{{minifiedWeeklyTradeData}}')) {
                    if (!await focusedConfirm('Warning: Your prompt is missing {{minifiedWeeklyTradeData}}. Data will not be injected. Continue?')) return;
                }
                await window.electronAPI.settings.set('ai_prompt_weekly_review', weeklyPrompt);
                await focusedAlert('Weekly Review Prompt Saved!');
            } else {
                // Save models
                await window.electronAPI.settings.set('ai_model_rewrite', modelRewrite);
                await window.electronAPI.settings.set('ai_model_review', modelReview);
                await window.electronAPI.settings.set('ai_model_weekly', modelWeekly);
                await focusedAlert('Model Preferences Saved!');
            }
        } catch (e: any) {
            await focusedAlert('Error: ' + e.message);
        }
    };

    const handleReset = async () => {
        if (!await focusedConfirm(`Reset ${activeTab === 'review' ? 'Trade Review' : activeTab === 'rewrite' ? 'Rewrite' : activeTab === 'weekly' ? 'Weekly Review' : 'Model'} settings to default?`)) return;

        if (activeTab === 'review') {
            setReviewPrompt(DEFAULT_TRADE_PROMPT);
            await window.electronAPI.settings.set('ai_prompt_trade_review', '');
        } else if (activeTab === 'rewrite') {
            setRewritePrompt(DEFAULT_REWRITE_PROMPT);
            await window.electronAPI.settings.set('ai_prompt_rewrite', '');
        } else if (activeTab === 'weekly') {
            setWeeklyPrompt(DEFAULT_WEEKLY_REVIEW_PROMPT);
            await window.electronAPI.settings.set('ai_prompt_weekly_review', '');
        } else {
            setModelRewrite('gemini-1.5-flash');
            setModelReview('gemini-1.5-flash');
            setModelWeekly('gemini-1.5-flash');
            await window.electronAPI.settings.set('ai_model_rewrite', 'gemini-1.5-flash');
            await window.electronAPI.settings.set('ai_model_review', 'gemini-1.5-flash');
            await window.electronAPI.settings.set('ai_model_weekly', 'gemini-1.5-flash');
        }
    };

    if (loading) return null;

    const ModelSelect = ({ label, value, onChange, taskType }: { label: string, value: string, onChange: (v: string) => void, taskType: 'rewrite' | 'review' | 'weekly' }) => {
        // Calculate Cost
        // Price per 1M tokens
        const pricing = MODEL_PRICING[value] || MODEL_PRICING['gemini-1.5-flash'];
        const estimates = TASK_ESTIMATES[taskType];

        const costInput = (estimates.input / 1_000_000) * pricing.input;
        const costOutput = (estimates.output / 1_000_000) * pricing.output;
        const totalCost = costInput + costOutput;

        return (
            <div className="flex flex-col gap-1 mb-4">
                <label className="text-xs text-zinc-400">{label}</label>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-accent"
                >
                    {Object.entries(MODEL_PRICING).map(([id, info]) => (
                        <option key={id} value={id}>{info.label}</option>
                    ))}
                </select>
                <div className="flex justify-between items-center text-[10px] text-zinc-500 px-1">
                    <span>
                        Est. Tokens: {estimates.input} in / {estimates.output} out
                    </span>
                    <span className={totalCost < 0.001 ? "text-green-500" : "text-zinc-400"}>
                        Est. Cost: ${totalCost.toFixed(5)}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <div className="flex gap-4 mb-4 border-b border-white/10 overflow-x-auto pb-1">
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'review' ? 'border-accent text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    onClick={() => setActiveTab('review')}
                >
                    Trade Review Prompt
                </button>
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'rewrite' ? 'border-accent text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    onClick={() => setActiveTab('rewrite')}
                >
                    Rewrite Prompt
                </button>
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'weekly' ? 'border-accent text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    onClick={() => setActiveTab('weekly')}
                >
                    Weekly Review Prompt
                </button>
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'models' ? 'border-accent text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                    onClick={() => setActiveTab('models')}
                >
                    Model Selection
                </button>
            </div>

            {activeTab === 'models' ? (
                <div className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]">
                    <h4 className="text-sm font-bold text-white mb-4">AI Model Configuration</h4>
                    <p className="text-xs text-zinc-500 mb-4">
                        Select the specific Gemini model to use for each task. Costs are estimated based on typical token usage.
                    </p>

                    <ModelSelect
                        label="Dictation Rewrite Model"
                        value={modelRewrite}
                        onChange={setModelRewrite}
                        taskType="rewrite"
                    />
                    <ModelSelect
                        label="Individual Trade Review Model"
                        value={modelReview}
                        onChange={setModelReview}
                        taskType="review"
                    />
                    <ModelSelect
                        label="Weekly Review Model"
                        value={modelWeekly}
                        onChange={setModelWeekly}
                        taskType="weekly"
                    />

                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-200">
                        <strong>Strategy Tip:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-1 opacity-80">
                            <li>Use <b>Flash (2.5/3.0)</b> for instant Rewrites and simple Trade Reviews.</li>
                            <li>Use <b>Pro (2.5/3.0)</b> for Weekly Reviews where reasoning depth matters more than speed.</li>
                        </ul>
                    </div>
                </div>
            ) : (
                <>
                    <label className="input-label" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', marginBottom: '10px' }}>
                        <span>
                            {activeTab === 'review' ? 'Custom Trade Review Prompt'
                                : activeTab === 'weekly' ? 'Custom Weekly Review Prompt'
                                    : 'Custom Rewrite Prompt'}
                        </span>
                        <span className="text-xs opacity-50 font-normal">
                            {activeTab === 'weekly' ? 'Use {{minifiedWeeklyTradeData}}' : 'Use {{placeholders}} for data'}
                        </span>
                    </label>
                    <textarea
                        value={
                            activeTab === 'review' ? reviewPrompt
                                : activeTab === 'weekly' ? weeklyPrompt
                                    : rewritePrompt
                        }
                        onChange={e => {
                            if (activeTab === 'review') setReviewPrompt(e.target.value);
                            else if (activeTab === 'weekly') setWeeklyPrompt(e.target.value);
                            else setRewritePrompt(e.target.value);
                        }}
                        style={{
                            width: '100%',
                            height: '200px',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '12px',
                            color: 'var(--text-primary)',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            lineHeight: '1.4',
                            resize: 'vertical'
                        }}
                    />
                </>
            )}

            <div className="flex gap-2 mt-4 justify-end">
                <button className="btn" onClick={handleReset} style={{ fontSize: '12px', opacity: 0.7 }}>
                    Reset {activeTab === 'models' ? 'All Models' : 'Default'}
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                    Save {activeTab === 'models' ? 'Preferences' : 'Prompt'}
                </button>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 text-[10px] text-zinc-600 flex justify-between">
                <span>TradeSlate v1.1.0</span>
                <span>Build: 2026-02-09 18:35:00</span>
            </div>
        </div>
    );
}


function BehavioralSettings() {
    const { accounts } = useAccounts();
    const [thresholds, setThresholds] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [justSaved, setJustSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<string>('default');

    const DEFAULT_THRESHOLDS = {
        fomoVelocityTrades: 3,
        fomoVelocityWindow: 2,
        revengeWindow: 5,
        timingMode: 'intra-day',
        maxIntervalMinutes: 120,

        fumbleThreshold: 1.0 // Default 1.0R
    };

    useEffect(() => {
        loadSettings();
    }, []);

    useEffect(() => {
        if (activeTab === 'default' && accounts.length > 0) {
            setActiveTab(accounts.find(a => a.id === 'main-account')?.id || accounts[0].id);
        }
    }, [accounts]);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.settings.get('behavioral_thresholds');
            setThresholds(data || {});
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (accountId: string, newValues: any) => {
        setSaving(true);
        try {
            const updated = { ...thresholds, [accountId]: newValues };
            setThresholds(updated);
            await window.electronAPI.settings.set('behavioral_thresholds', JSON.stringify(updated));
            setJustSaved(true);
            setTimeout(() => setJustSaved(false), 3000);
            await focusedAlert('Thresholds saved successfully!');
        } catch (err: any) {
            console.error('Save failed:', err);
            await focusedAlert('Save Failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const renderInputs = (accountId: string) => {
        const current = { ...DEFAULT_THRESHOLDS, ...thresholds[accountId] };

        const updateField = (field: string, value: any) => {
            const updatedAccountSettings = { ...current, [field]: value };
            setThresholds(prev => ({ ...prev, [accountId]: updatedAccountSettings }));
        };

        const TooltipIcon = ({ text }: { text: string }) => {
            const [show, setShow] = useState(false);
            const [pos, setPos] = useState({ top: 0, left: 0 });
            const iconRef = useRef<HTMLDivElement>(null);

            const handleEnter = () => {
                if (iconRef.current) {
                    const rect = iconRef.current.getBoundingClientRect();
                    setPos({
                        top: rect.bottom + 16,
                        left: rect.left + rect.width / 2
                    });
                    setShow(true);
                }
            };

            return (
                <div
                    ref={iconRef}
                    style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}
                    onMouseEnter={handleEnter}
                    onMouseLeave={() => setShow(false)}
                >
                    <div
                        style={{
                            padding: '2px',
                            borderRadius: '50%',
                            cursor: 'help',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s',
                            backgroundColor: show ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'
                        }}
                    >
                        <Info size={14} style={{ color: show ? '#ffffff' : '#a1a1aa', transition: 'color 0.2s' }} />
                    </div>
                    {show && <Tooltip content={text} position={pos} />}
                </div>
            );
        };

        return (
            <div className="flex flex-col gap-4 animate-fade-in">
                <div className="p-3 rounded bg-white/5 border border-white/5">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Risk & Behavioral Flags
                    </h4>
                    <div className="grid grid-cols-2 gap-4">

                        <div className="input-group">
                            <label className="input-label flex items-center">
                                Revenge Window (minutes)
                                <TooltipIcon text='A cooldown timer triggered after a loss. Re-entering the same market within this window is flagged as emotional "get-back" trading rather than a disciplined new entry.' />
                            </label>
                            <input
                                type="number"
                                className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-sm text-zinc-300"
                                value={current.revengeWindow}
                                onChange={e => updateField('revengeWindow', parseInt(e.target.value) || 0)}
                            />
                        </div>
                        <div className="input-group col-span-2">
                            <label className="input-label flex items-center">
                                FOMO Velocity
                                <TooltipIcon text='Measures "Trade Velocity." Taking more than X trades in Y minutes indicates panic or chasing. High velocity often correlates with poor entry quality and emotional urgency.' />
                            </label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="number"
                                    className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-sm text-zinc-300"
                                    value={current.fomoVelocityTrades}
                                    onChange={e => updateField('fomoVelocityTrades', parseInt(e.target.value) || 0)}
                                />
                                <span className="text-zinc-500 text-xs text-nowrap">trades in</span>
                                <input
                                    type="number"
                                    className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-sm text-zinc-300"
                                    value={current.fomoVelocityWindow}
                                    onChange={e => updateField('fomoVelocityWindow', parseInt(e.target.value) || 0)}
                                />
                                <span className="text-zinc-500 text-xs text-nowrap">min</span>
                            </div>
                        </div>
                        <div className="input-group">
                            <label className="input-label flex items-center">
                                Fumble Threshold (R)
                                <TooltipIcon text='The minimum favorable excursion (in R) a trade must reach to be considered a "Missed Opportunity" if it ends up as a Loss or Break-Even.' />
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.1"
                                    className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-sm text-zinc-300"
                                    value={current.fumbleThreshold || 1.0}
                                    onChange={e => updateField('fumbleThreshold', parseFloat(e.target.value) || 0)}
                                />
                                <span className="text-zinc-500 text-xs">R</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-3 rounded bg-white/5 border border-white/5">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                        Patience & Session Tracking
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="input-group">
                            <label className="input-label flex items-center">
                                Trading Style
                                <TooltipIcon text="Intra-day: Tracks time between trades on the *same day*. Continuous: Tracks time across all trades including ovemight/weekends." />
                            </label>
                            <select
                                className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-sm text-zinc-300"
                                value={current.timingMode}
                                onChange={e => updateField('timingMode', e.target.value)}
                            >
                                <option value="intra-day">Intra-day (Skips Overnights)</option>
                                <option value="continuous">Continuous (Swing/Weekend)</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="input-label flex items-center">
                                Break Threshold (min)
                                <TooltipIcon text="Smart Filter: Any gap between trades longer than this (e.g. lunch, gym) is excluded from your 'avg patience' calculation." />
                            </label>
                            <input
                                type="number"
                                className="w-full bg-zinc-900 border border-white/10 rounded px-2 py-1 text-sm text-zinc-300"
                                value={current.maxIntervalMinutes}
                                onChange={e => updateField('maxIntervalMinutes', parseInt(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        className={`btn btn-primary transition-all min-w-[160px] ${justSaved ? 'bg-green-600' : ''}`}
                        onClick={() => handleSave(accountId, current)}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : justSaved ? '✓ Settings Saved' : `Save ${accounts.find(a => a.id === accountId)?.name} Defaults`}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex gap-2 border-b border-white/10 overflow-x-auto pb-1">
                {accounts.map(acc => (
                    <button
                        key={acc.id}
                        onClick={() => setActiveTab(acc.id)}
                        className={`px-3 py-2 text-xs font-medium rounded-t transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === acc.id
                            ? 'bg-white/10 text-white border-b-2 border-accent'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: acc.color }} />
                        {acc.name}
                    </button>
                ))}
            </div>

            <div className="min-h-[250px]">
                {loading ? (
                    <div className="p-8 text-center text-zinc-500">Loading...</div>
                ) : (
                    activeTab !== 'default' && renderInputs(activeTab)
                )}
            </div>
        </div>
    );
}



function Tooltip({ content, position }: { content: string, position: { top: number, left: number } }) {
    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                transform: 'translateX(-50%)',
                zIndex: 100000,
                pointerEvents: 'none'
            }}
        >
            <div
                className="animate-fade-in"
                style={{
                    width: '260px',
                    backgroundColor: '#18181b', // Zinc 900
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                }}
            >
                <div style={{ fontSize: '12px', lineHeight: '1.4', color: '#d4d4d8' }}>
                    {content}
                </div>
                {/* Arrow */}
                <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#18181b',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                }} />
            </div>
        </div>,
        document.body
    );
}
