import React, { useState, useEffect } from 'react';
import { useTrades } from '../hooks/useTrades';
import { Trade } from '../types';
import { TradeDetail } from '../components/TradeDetail';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { createPortal } from 'react-dom';
import { ImportManager } from '../components/ImportManager';
import { Plus, Upload, Calendar as CalendarIcon, CheckSquare, Square, Trash2, List, X } from 'lucide-react';
import { focusedConfirm, focusedAlert } from '../utils/dialogUtils';

interface JournalProps {
    initialTradeId?: string | null;
    onClearSelection?: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
}

export function Journal({ initialTradeId, onClearSelection, onDirtyChange }: JournalProps) {
    const { trades, loading, refresh, updateTrade, deleteTrade, deleteManyTrades, createTrade } = useTrades();
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
    const [isDetailDirty, setIsDetailDirty] = useState(false);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDateFilter, setShowDateFilter] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    // Filter trades
    const filteredTrades = trades.filter(t => {
        let matches = true;

        if (dateRange.start) {

            // Simple timestamp comparison
            const tradeDate = new Date(t.entryDateTime);
            const startDate = new Date(dateRange.start);
            // Reset time to 00:00:00 for accurate day comparison
            tradeDate.setHours(0, 0, 0, 0);
            startDate.setHours(0, 0, 0, 0);
            if (tradeDate.getTime() < startDate.getTime()) matches = false;
        }

        if (matches && dateRange.end) {
            const tradeDate = new Date(t.entryDateTime);
            const endDate = new Date(dateRange.end);
            // Set end date to end of day? Or just compare dates.
            // If user selects "2023-01-01", they expect trades on that day.
            // So tradeDate <= endDate where endDate is at 00:00:00 means strictly before or on that day?
            // Usually filters are inclusive.
            // Let's normalize tradeDate to midnight
            tradeDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);
            if (tradeDate.getTime() > endDate.getTime()) matches = false;
        }

        if (!matches) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return t.market.toLowerCase().includes(q) ||
            t.setup?.toLowerCase().includes(q) ||
            t.notesRaw?.toLowerCase().includes(q);
    });

    // Compute all unique tags and mistakes for autocomplete
    const allTags = React.useMemo(() => {
        const set = new Set<string>();
        trades.forEach(t => t.tags?.forEach(tag => set.add(tag)));
        return Array.from(set).sort();
    }, [trades]);

    const allMistakes = React.useMemo(() => {
        const set = new Set<string>();
        trades.forEach(t => t.mistakes?.forEach(m => set.add(m)));
        return Array.from(set).sort();
    }, [trades]);

    const allSetups = React.useMemo(() => {
        const set = new Set<string>();
        trades.forEach(t => { if (t.setup) set.add(t.setup); });
        return Array.from(set).sort();
    }, [trades]);

    const allTriggers = React.useMemo(() => {
        const set = new Set<string>();
        trades.forEach(t => { if (t.entryTrigger) set.add(t.entryTrigger); });
        return Array.from(set).sort();
    }, [trades]);

    // Handle initial selection from navigation (e.g. from Dashboard or Calendar)
    useEffect(() => {
        if (initialTradeId && trades.length > 0) {
            const trade = trades.find(t => t.id === initialTradeId);
            if (trade) {
                setSelectedTrade(trade);
                // Clear the selection in parent so we don't re-select if we navigate away and back
                if (onClearSelection) onClearSelection();
            }
        }
    }, [initialTradeId, trades, onClearSelection]);

    // Keep selectedTrade in sync with fresh data - ONLY if data actually changed
    useEffect(() => {
        if (selectedTrade) {
            const fresh = trades.find(t => t.id === selectedTrade.id);
            if (fresh) {
                // Deep compare to avoid unnecessary updates that reset TradeDetail form
                const freshJSON = JSON.stringify(fresh);
                const currentJSON = JSON.stringify(selectedTrade);
                if (freshJSON !== currentJSON) {
                    setSelectedTrade(fresh);
                }
            }
        }
    }, [trades]);

    const handleUpdate = async (id: string, data: Partial<Trade>) => {
        await updateTrade(id, data);
        refresh();
    };

    const handleDelete = async (id: string) => {
        if (!await focusedConfirm('Are you sure you want to delete this trade?')) return;
        await deleteTrade(id);
        setSelectedTrade(null);
        refresh();
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!await focusedConfirm(`Are you sure you want to delete ${selectedIds.size} selected trades?`)) return;

        try {
            await deleteManyTrades(Array.from(selectedIds));
            setSelectedIds(new Set());
            setIsSelectionMode(false);
            setSelectedTrade(null);
            await refresh();
            await focusedAlert('Trades deleted successfully.');
        } catch (err: any) {
            await focusedAlert(`Failed to delete trades: ${err.message}`);
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredTrades.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredTrades.map(t => t.id)));
        }
    };

    const handleAddManual = async () => {
        try {
            const newTrade = await createTrade({
                market: 'ES',
                direction: 'Long',
                entryDateTime: new Date().toISOString(),
                status: 'CLOSED', // Default to Closed so PnL logic applies easily? Or OPEN is fine.
                contracts: 1,
                entryPrice: 0,
                tags: [], // Empty tags by default
                confluences: [],
                mistakes: [],
                images: [],
                notesRaw: ''
            });

            // Force selection update
            setSelectedTrade(newTrade);

            // Optional: scroll top
            const listContainer = document.querySelector('.trade-list-container');
            if (listContainer) listContainer.scrollTop = 0;

        } catch (err: any) {
            console.error('Failed to create manual trade', err);
            await focusedAlert(`Failed to create trade: ${err.message}`);
        }
    };



    return (
        <div style={{
            display: 'flex',
            minHeight: '100%',
            width: '100%',
            background: 'radial-gradient(circle at top right, #1a1e23 0%, var(--bg-primary) 40%)',
            flexDirection: 'row',
            alignItems: 'stretch'
        }}>
            {/* Left: Trade List - Sticky */}
            <div style={{
                width: '400px',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 20px)',
                position: 'sticky',
                top: 0
            }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h2 style={{ margin: 0 }}>Trade Journal</h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {!isSelectionMode ? (
                                <>
                                    <button
                                        className="btn"
                                        style={{ padding: '6px' }}
                                        title="Bulk Select"
                                        onClick={() => setIsSelectionMode(true)}
                                    >
                                        <List size={18} />
                                    </button>
                                    <button
                                        className="btn"
                                        style={{ padding: '6px' }}
                                        title="Import Trades"
                                        onClick={() => setShowImportModal(true)}
                                    >
                                        <Upload size={18} />
                                    </button>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '6px' }}
                                        title="Add Manual Trade"
                                        onClick={handleAddManual}
                                    >
                                        <Plus size={18} />
                                    </button>
                                </>
                            ) : (
                                <button
                                    className="btn"
                                    onClick={() => {
                                        setIsSelectionMode(false);
                                        setSelectedIds(new Set());
                                    }}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </div>

                    {isSelectionMode && (
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                            <button className="btn w-full" onClick={handleSelectAll}>
                                {selectedIds.size === filteredTrades.length ? 'Deselect All' : 'Select All'}
                            </button>
                            <button
                                className="btn btn-danger w-full"
                                disabled={selectedIds.size === 0}
                                onClick={handleBulkDelete}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                            >
                                <Trash2 size={14} /> Delete ({selectedIds.size})
                            </button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="Search trades..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ flex: 1, boxSizing: 'border-box' }}
                        />
                        <div style={{ position: 'relative' }}>
                            <button
                                className={`btn ${showDateFilter || (dateRange.start || dateRange.end) ? 'btn-primary' : ''}`}
                                style={{
                                    padding: '8px',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: (dateRange.start || dateRange.end) ? 'var(--accent)' : undefined,
                                    color: (dateRange.start || dateRange.end) ? '#fff' : undefined
                                }}
                                title="Filter by date"
                                onClick={() => setShowDateFilter(!showDateFilter)}
                            >
                                <CalendarIcon size={18} />
                            </button>

                            {showDateFilter && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '8px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    zIndex: 100,
                                    width: '240px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>From</label>
                                            <input
                                                type="date"
                                                value={dateRange.start}
                                                onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    border: '1px solid var(--border)',
                                                    color: 'var(--text-primary)',
                                                    padding: '6px',
                                                    borderRadius: '4px',
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    colorScheme: 'dark'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>To</label>
                                            <input
                                                type="date"
                                                value={dateRange.end}
                                                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    border: '1px solid var(--border)',
                                                    color: 'var(--text-primary)',
                                                    padding: '6px',
                                                    borderRadius: '4px',
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    colorScheme: 'dark'
                                                }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                                            <button
                                                className="btn"
                                                style={{ fontSize: '12px', padding: '4px 8px' }}
                                                onClick={() => {
                                                    setDateRange({ start: '', end: '' });
                                                    // Optional: close on clear?
                                                    // setShowDateFilter(false); 
                                                }}
                                            >
                                                Clear
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                style={{ fontSize: '12px', padding: '4px 8px' }}
                                                onClick={() => setShowDateFilter(false)}
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="trade-list-container" style={{ flex: 1, overflowY: 'auto' }}>
                    {loading && <div style={{ padding: '16px', color: 'var(--text-secondary)' }}>Loading...</div>}
                    {!loading && filteredTrades.length === 0 && (
                        <div style={{ padding: '16px', color: 'var(--text-secondary)' }}>No trades found</div>
                    )}
                    {filteredTrades.map(trade => (
                        <div
                            key={trade.id}
                            onClick={async () => {
                                if (isSelectionMode) {
                                    toggleSelection(trade.id);
                                    return;
                                }
                                if (isDetailDirty && !await focusedConfirm('You have unsaved changes. Are you sure you want to switch trades?')) {
                                    return;
                                }
                                setSelectedTrade(trade);
                            }}
                            style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid var(--border)',
                                cursor: 'pointer',
                                backgroundColor: selectedTrade?.id === trade.id ? 'var(--bg-tertiary)' : 'transparent',
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'center'
                            }}
                        >
                            {isSelectionMode && (
                                <div style={{ color: selectedIds.has(trade.id) ? 'var(--accent)' : 'var(--text-secondary)' }}>
                                    {selectedIds.has(trade.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                </div>
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontWeight: 'bold' }}>{trade.market}</span>
                                    <span style={{
                                        color: trade.direction === 'Long' ? 'var(--accent)' : 'var(--danger)',
                                        fontSize: '12px'
                                    }}>
                                        {trade.direction}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <span>{new Date(trade.entryDateTime).toLocaleString()}</span>
                                    <span style={{ color: (trade.pnl || 0) >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 'bold' }}>
                                        {trade.pnl != null ? `$${trade.pnl.toFixed(2)}` : '-'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Trade Detail */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
                {!selectedTrade ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
                        Select a trade to view details
                    </div>
                ) : (
                    <ErrorBoundary>
                        <TradeDetail
                            key={selectedTrade.id} // Re-mount on change to reset state
                            trade={selectedTrade}
                            onClose={async () => {
                                if (isDetailDirty && !await focusedConfirm('You have unsaved changes. Are you sure you want to close?')) {
                                    return;
                                }
                                setSelectedTrade(null);
                            }}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            existingTags={allTags}
                            existingMistakes={allMistakes}
                            existingSetups={allSetups}
                            existingTriggers={allTriggers}
                            onDirtyChange={(dirty) => {
                                setIsDetailDirty(dirty);
                                if (onDirtyChange) onDirtyChange(dirty);
                            }}
                        />
                    </ErrorBoundary>
                )}
                {/* Import Modal */}
                {showImportModal && createPortal(
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}>
                        <div className="card" style={{ width: '800px', maxHeight: '85vh', overflow: 'auto', padding: '24px', position: 'relative' }}>
                            <button
                                onClick={() => setShowImportModal(false)}
                                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>
                            <h2 style={{ marginTop: 0, marginBottom: '24px' }}>Import Trades</h2>
                            <ImportManager
                                hideFileInput={false}
                                simpleMode={true}
                                onImportComplete={() => {
                                    setShowImportModal(false);
                                    refresh();
                                }}
                            />
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
}

