import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTrades } from '../hooks/useTrades';
import { IMPORTABLE_TRADE_FIELDS } from '../types';
import { detectCSVHeaders, parseWithProfile, BUILTIN_PROFILES, ParsedTrade } from '../utils/importParsers/customParser';
import { deduplicateAndImport } from '../utils/tradeImporter';
import { FileSpreadsheet, Plus, Trash2, Check, X, Pencil } from 'lucide-react';
import { focusedAlert, focusedConfirm } from '../utils/dialogUtils';



interface ProfileFormData {
    id?: string;
    name: string;
    columnMappings: { [csvColumn: string]: string | null };
    delimiter: ',' | ';' | '\t';
    dateFormat: string;
}

interface ImportManagerProps {
    hideFileInput?: boolean;
    onImportComplete?: () => void;
    simpleMode?: boolean;
}

export function ImportManager({ hideFileInput = false, onImportComplete, simpleMode = false }: ImportManagerProps) {
    const { createTrade, updateTrade, trades } = useTrades();
    const fileInputRef = useRef<HTMLInputElement>(null);


    const [selectedProfile, setSelectedProfile] = useState<string>('tradovate');
    const [customProfiles, setCustomProfiles] = useState<any[]>([]);
    const [csvContent, setCsvContent] = useState<string | null>(null);
    const [parsedTrades, setParsedTrades] = useState<ParsedTrade[]>([]);
    const [importing, setImporting] = useState(false);

    // Profile editor state
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [editingProfile, setEditingProfile] = useState<ProfileFormData | null>(null);
    const [sampleHeaders, setSampleHeaders] = useState<string[]>([]);

    // Load custom profiles on mount
    useEffect(() => {
        loadCustomProfiles();
    }, []);

    const loadCustomProfiles = async () => {
        try {
            const profiles = await window.electronAPI.importProfiles.getAll();
            setCustomProfiles(profiles.map((p: any) => ({
                ...p,
                columnMappings: JSON.parse(p.column_mappings || '{}'),
                dateFormat: p.date_format || 'MM/DD/YYYY HH:mm:ss',
                delimiter: p.delimiter || ','
            })));
        } catch (err) {
            console.error('Failed to load profiles:', err);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setCsvContent(content);

            // Detect headers
            const delimiter = getActiveProfile()?.delimiter || ',';
            detectCSVHeaders(content, delimiter);

            // Parse with selected profile
            parseWithActiveProfile(content);
        };
        reader.readAsText(file);
    };

    const getActiveProfile = () => {
        if (selectedProfile.startsWith('custom:')) {
            const id = selectedProfile.replace('custom:', '');
            return customProfiles.find(p => p.id === id);
        }
        return (BUILTIN_PROFILES as any)[selectedProfile];
    };

    const parseWithActiveProfile = (content: string) => {
        const profile = getActiveProfile();
        if (!profile) return;

        try {
            const trades = parseWithProfile(content, profile);
            setParsedTrades(trades);
        } catch (err) {
            console.error('Parse error:', err);
            setParsedTrades([]);
        }
    };

    const handleProfileChange = (profileKey: string) => {
        setSelectedProfile(profileKey);
        if (csvContent) {
            // Re-parse with new profile
            setTimeout(() => {
                const profile = profileKey.startsWith('custom:')
                    ? customProfiles.find(p => p.id === profileKey.replace('custom:', ''))
                    : (BUILTIN_PROFILES as any)[profileKey];
                if (profile && csvContent) {
                    const trades = parseWithProfile(csvContent, profile);
                    setParsedTrades(trades);
                }
            }, 0);
        }
    };

    const handleImport = async () => {
        if (parsedTrades.length === 0) return;
        setImporting(true);

        try {
            const result = await deduplicateAndImport(
                parsedTrades,
                trades,
                updateTrade,
                createTrade
            );

            await focusedAlert(`Successfully imported trades!\nCreated: ${result.created}\nUpdated/Merged: ${result.updated}`);
            setCsvContent(null);
            // setCsvHeaders([]);
            setParsedTrades([]);
            if (fileInputRef.current) fileInputRef.current.value = '';

            if (onImportComplete) {
                onImportComplete();
            }
        } catch (err: any) {
            await focusedAlert('Import failed: ' + err.message);
        } finally {
            setImporting(false);
        }
    };

    // Profile Editor Methods
    const startNewProfile = () => {
        setEditingProfile({
            id: undefined,
            name: '',
            columnMappings: {},
            delimiter: ',',
            dateFormat: 'MM/DD/YYYY HH:mm:ss'
        });

        setSampleHeaders([]);
        setShowProfileEditor(true);
    };

    const handleEditProfile = (profile: any) => {
        setEditingProfile({
            id: profile.id,
            name: profile.name,
            columnMappings: profile.columnMappings || {},
            delimiter: profile.delimiter || ',',
            dateFormat: profile.date_format || 'MM/DD/YYYY HH:mm:ss'
        });

        setSampleHeaders([]);
        setShowProfileEditor(true);
    };

    const handleSampleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            // setSampleCsv(content);
            const headers = detectCSVHeaders(content, editingProfile?.delimiter || ',');
            setSampleHeaders(headers);
        };
        reader.readAsText(file);
    };

    const handleMappingChange = (csvColumn: string, tradeField: string | null) => {
        if (!editingProfile) return;
        setEditingProfile({
            ...editingProfile,
            columnMappings: {
                ...editingProfile.columnMappings,
                [csvColumn]: tradeField
            }
        });
    };

    const handleSaveProfile = async () => {
        if (!editingProfile || !editingProfile.name.trim()) {
            await focusedAlert('Please enter a profile name');
            return;
        }

        try {
            if (editingProfile.id) {
                // Update existing
                await window.electronAPI.importProfiles.update(editingProfile.id, {
                    name: editingProfile.name,
                    columnMappings: editingProfile.columnMappings,
                    dateFormat: editingProfile.dateFormat,
                    delimiter: editingProfile.delimiter
                });
            } else {
                // Create new
                await window.electronAPI.importProfiles.create(
                    editingProfile.name,
                    editingProfile.columnMappings,
                    editingProfile.dateFormat,
                    editingProfile.delimiter
                );
            }
            await loadCustomProfiles();
            setShowProfileEditor(false);
            setEditingProfile(null);
            await focusedAlert('Profile saved!');
        } catch (err: any) {
            await focusedAlert('Failed to save profile: ' + err.message);
        }
    };

    const handleDeleteProfile = async (id: string) => {
        if (!await focusedConfirm('Delete this import profile?')) return;
        try {
            await window.electronAPI.importProfiles.delete(id);
            await loadCustomProfiles();
            if (selectedProfile === `custom:${id}`) {
                setSelectedProfile('tradovate');
            }
        } catch (err: any) {
            await focusedAlert('Failed to delete: ' + err.message);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Mode Tabs */}
            {/* Mode Tabs Removed as per user request */}

            {/* Main Import View (Always visible now) */}
            {true && (
                <>
                    {/* Profile Selector */}
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="input-label">Import Profile</label>
                            <select
                                value={selectedProfile}
                                onChange={e => handleProfileChange(e.target.value)}
                                className="w-full"
                                style={{ padding: '10px', fontSize: '14px' }}
                            >
                                <optgroup label="Built-in">
                                    <option value="tradovate">Tradovate</option>
                                    {/* Removed NinjaTrader/TradingView as per user request */}
                                </optgroup>
                                {customProfiles.length > 0 && (
                                    <optgroup label="Custom Profiles">
                                        {customProfiles.map(p => (
                                            <option key={p.id} value={`custom:${p.id}`}>{p.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>
                        </div>
                        {!simpleMode && (
                            <div className="flex-none">
                                <label className="input-label" style={{ visibility: 'hidden' }}>Placeholder</label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {selectedProfile.startsWith('custom:') && (
                                        <>
                                            <button
                                                className="btn"
                                                onClick={() => {
                                                    const id = selectedProfile.replace('custom:', '');
                                                    const profile = customProfiles.find(p => p.id === id);
                                                    if (profile) handleEditProfile(profile);
                                                }}
                                                title="Edit Selected Profile"
                                                style={{ height: '42px', width: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                className="btn"
                                                onClick={() => {
                                                    const id = selectedProfile.replace('custom:', '');
                                                    handleDeleteProfile(id);
                                                }}
                                                title="Delete Selected Profile"
                                                style={{ height: '42px', width: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, color: 'var(--danger)' }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                    <button className="btn btn-primary" onClick={startNewProfile} style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Plus size={16} /> New Profile
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* File Input - Only show if not hidden */}
                    {!hideFileInput && (
                        <div>
                            <label className="input-label">Select CSV File</label>
                            <input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                style={{ padding: '8px' }}
                            />
                        </div>
                    )}

                    {/* Custom Profiles List */}
                    {!simpleMode && customProfiles.length > 0 && (
                        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Manage Custom Profiles
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {customProfiles.map(p => (
                                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                                        <span style={{ fontSize: '13px' }}>{p.name}</span>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleEditProfile(p)}
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleDeleteProfile(p.id)}
                                                title="Delete"
                                                style={{ color: 'var(--danger)' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    {parsedTrades.length > 0 && (
                        <div>
                            <div className="mb-2" style={{ color: 'var(--accent)' }}>
                                <FileSpreadsheet size={16} className="inline mr-2" />
                                Found {parsedTrades.length} trades to import:
                            </div>
                            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-tertiary)' }}>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>Market</th>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>Dir</th>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>Qty</th>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>Entry</th>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>Exit</th>
                                            <th style={{ padding: '8px', textAlign: 'left' }}>PnL</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedTrades.slice(0, 10).map((t, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{new Date(t.entryDateTime).toLocaleString()}</td>
                                                <td style={{ padding: '8px' }}>{t.market}</td>
                                                <td style={{ padding: '8px', color: t.direction === 'Long' ? 'var(--accent)' : 'var(--danger)' }}>{t.direction}</td>
                                                <td style={{ padding: '8px' }}>{t.contracts}</td>
                                                <td style={{ padding: '8px' }}>{t.entryPrice?.toFixed(2)}</td>
                                                <td style={{ padding: '8px' }}>{t.exitPrice?.toFixed(2) || '-'}</td>
                                                <td style={{ padding: '8px', color: (t.pnl || 0) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                                                    ${(t.pnl || 0).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                        {parsedTrades.length > 10 && (
                                            <tr><td colSpan={7} style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>...and {parsedTrades.length - 10} more</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <button
                                className="btn btn-primary mt-3"
                                onClick={handleImport}
                                disabled={importing}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {importing ? 'Importing...' : `Import ${parsedTrades.length} Trades`}
                            </button>
                        </div>
                    )}
                </>
            )}



            {/* Profile Editor Modal - Using Portal to escape parent stacking context */}
            {showProfileEditor && editingProfile && createPortal(
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 99999
                }}>
                    <div className="card" style={{ width: '600px', maxHeight: '80vh', overflow: 'auto', padding: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0' }}>{editingProfile.id ? 'Edit Import Profile' : 'Create Import Profile'}</h3>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="input-label">Profile Name</label>
                                <input
                                    className="w-full"
                                    placeholder="My Broker Import"
                                    value={editingProfile.name}
                                    onChange={e => setEditingProfile({ ...editingProfile, name: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="input-label">Delimiter</label>
                                    <select
                                        className="w-full"
                                        value={editingProfile.delimiter}
                                        onChange={e => setEditingProfile({ ...editingProfile, delimiter: e.target.value as any })}
                                    >
                                        <option value=",">Comma (,)</option>
                                        <option value=";">Semicolon (;)</option>
                                        <option value="\t">Tab</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="input-label">Date Format</label>
                                    <select
                                        className="w-full"
                                        value={editingProfile.dateFormat}
                                        onChange={e => setEditingProfile({ ...editingProfile, dateFormat: e.target.value })}
                                    >
                                        <option value="MM/DD/YYYY HH:mm:ss">Month-Day-Year (e.g. 12/31/2024)</option>
                                        <option value="DD/MM/YYYY HH:mm:ss">Day-Month-Year (e.g. 31/12/2024)</option>
                                        <option value="YYYY-MM-DD HH:mm:ss">Year-Month-Day (e.g. 2024-12-31)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="input-label">Upload Sample CSV (to detect columns)</label>
                                <input type="file" accept=".csv" onChange={handleSampleFileSelect} />
                            </div>

                            {sampleHeaders.length > 0 && (
                                <div>
                                    <label className="input-label">Map Columns</label>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px' }}>
                                        <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-tertiary)' }}>
                                                    <th style={{ padding: '8px', textAlign: 'left' }}>CSV Column</th>
                                                    <th style={{ padding: '8px', textAlign: 'left' }}>Maps To</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sampleHeaders.map(header => (
                                                    <tr key={header} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '8px', fontFamily: 'monospace' }}>{header}</td>
                                                        <td style={{ padding: '8px' }}>
                                                            <select
                                                                className="w-full"
                                                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                                                value={editingProfile.columnMappings[header] || ''}
                                                                onChange={e => handleMappingChange(header, e.target.value || null)}
                                                            >
                                                                <option value="">-- Skip --</option>
                                                                {IMPORTABLE_TRADE_FIELDS.map(field => (
                                                                    <option key={field.key} value={field.key}>
                                                                        {field.label} {field.required ? '*' : ''}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 justify-end mt-4">
                                <button className="btn" onClick={() => setShowProfileEditor(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <X size={16} /> Cancel
                                </button>
                                <button className="btn btn-primary" onClick={handleSaveProfile} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Check size={16} /> Save Profile
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
