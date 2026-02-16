import React, { useState, useEffect, useMemo } from 'react';
import { useTrades } from '../hooks/useTrades';
import { EquityCurve } from '../components/EquityCurve';
import { ProKPICard } from '../components/ProKPICard';
import { WeeklySummaryWidget } from '../components/WeeklySummaryWidget';
import { focusedAlert } from '../utils/dialogUtils';
import { toLocalStorageString, parseLocalToUTC } from '../utils/dateUtils';
import { COTQuickSignals } from '../components/COTQuickSignals';
import { COTReport } from '../types';
import { Pencil, Plus, Trash2, Check } from 'lucide-react';

export function Dashboard() {
    const { trades, refresh, createTrade } = useTrades();

    // Quick Trade Form State
    const [market, setMarket] = useState('MNQ');
    const [direction, setDirection] = useState<'Long' | 'Short'>('Long');
    const [contracts, setContracts] = useState(1);
    const [entryTime, setEntryTime] = useState(toLocalStorageString(new Date()));
    const [entryPrice, setEntryPrice] = useState('');
    const [quote, setQuote] = useState<string | null>(null);
    const [cotReport, setCotReport] = useState<COTReport | null>(null);

    const [beRange, setBeRange] = React.useState({ min: -0.1, max: 0.1 });
    const [isEditingChecklist, setIsEditingChecklist] = useState(false);
    const [_isSavingChecklist, setIsSavingChecklist] = useState(false);

    // Checklist State
    const [checklist, setChecklist] = useState([
        { id: 1, text: 'HTF Bias Check', checked: false },
        { id: 2, text: 'High-Impact News Check', checked: false },
        { id: 3, text: 'Setup Confirmation', checked: false },
        { id: 4, text: 'Risk Defined (<1%)', checked: false },
        { id: 5, text: 'Minimum 2R Potential', checked: false },
        { id: 6, text: 'Clear Trigger?', checked: false },
        { id: 7, text: 'Mental Stable?', checked: false }
    ]);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const q = await window.electronAPI.quotes.getDaily();
                setQuote(q);

                const s = await window.electronAPI.settings.get('break_even_range');
                if (s) setBeRange(s);

                const cot = await window.electronAPI.cot.getLatest();
                if (cot) setCotReport(cot);

                const savedChecklist = await window.electronAPI.settings.get('strategy_checklist');
                if (savedChecklist && Array.isArray(savedChecklist)) {
                    setChecklist(savedChecklist.map((item: any) => ({ ...item, checked: false })));
                } else {
                    const initial = [
                        { id: 1, text: 'HTF Bias Check', checked: false },
                        { id: 2, text: 'High-Impact News Check', checked: false },
                        { id: 3, text: 'Setup Confirmation', checked: false },
                        { id: 4, text: 'Risk Defined (<1%)', checked: false },
                        { id: 5, text: 'Minimum 2R Potential', checked: false },
                        { id: 6, text: 'Clear Trigger?', checked: false },
                        { id: 7, text: 'Mental Stable?', checked: false }
                    ];
                    setChecklist(initial);
                    await window.electronAPI.settings.set('strategy_checklist', JSON.stringify(initial.map(i => ({ id: i.id, text: i.text }))));
                }
            } catch (err) {
                console.error("Failed to fetch settings", err);
            }
        };
        fetchSettings();
    }, []);

    const toggleCheck = (id: number) => {
        setChecklist(prev => prev.map(item =>
            item.id === id ? { ...item, checked: !item.checked } : item
        ));
    };

    const addChecklistItem = () => {
        const newItem = { id: Date.now(), text: '', checked: false };
        setChecklist(prev => [...prev, newItem]);
    };

    const deleteChecklistItem = (id: number) => {
        setChecklist(prev => prev.filter(item => item.id !== id));
    };

    const editChecklistItem = (id: number, text: string) => {
        setChecklist(prev => prev.map(item =>
            item.id === id ? { ...item, text } : item
        ));
    };

    const saveChecklist = async () => {
        setIsSavingChecklist(true);
        try {
            const toSave = checklist.map(item => ({ id: item.id, text: item.text }));
            await window.electronAPI.settings.set('strategy_checklist', JSON.stringify(toSave));
            setIsEditingChecklist(false);
        } catch (err: any) {
            await focusedAlert('Failed to save: ' + err.message);
        } finally {
            setIsSavingChecklist(false);
        }
    };

    // Stats calculations
    const stats = useMemo(() => {
        if (trades.length === 0) return null;

        const wins = trades.filter(t => (t.pnl || 0) > 0);
        const losses = trades.filter(t => (t.pnl || 0) < 0);
        const totalPnL = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const winRate = (wins.length / trades.length) * 100;
        const avgWin = wins.length > 0 ? wins.reduce((acc, t) => acc + (t.pnl || 0), 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((acc, t) => acc + (t.pnl || 0), 0) / losses.length) : 0;
        const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;

        let maxWinStreak = 0, maxLossStreak = 0, currentWinStreak = 0, currentLossStreak = 0;
        trades.forEach(t => {
            if ((t.pnl || 0) > 0) { currentWinStreak++; currentLossStreak = 0; maxWinStreak = Math.max(maxWinStreak, currentWinStreak); }
            else if ((t.pnl || 0) < 0) { currentLossStreak++; currentWinStreak = 0; maxLossStreak = Math.max(maxLossStreak, currentLossStreak); }
        });

        const winnersWithR = trades.filter(t => (t.pnl || 0) > 0 && t.achievedR);
        const avgWinRR = winnersWithR.length > 0
            ? winnersWithR.reduce((acc, t) => acc + (t.achievedR || 0), 0) / winnersWithR.length
            : (avgWin / (avgLoss || 1));

        const beCount = trades.filter(t => {
            const r = t.achievedR ?? 0;
            return r > beRange.min && r < beRange.max;
        }).length;

        const totalContracts = trades.reduce((acc, t) => acc + (t.contracts || 1), 0);
        const durations = trades.filter(t => t.durationSeconds).map(t => t.durationSeconds || 0);
        const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
        const longestDuration = Math.max(...durations, 0);
        const expectancy = trades.length > 0 ? totalPnL / trades.length : 0;

        const dayPnL: Record<string, number> = {};
        const dayCount: Record<string, number> = {};
        trades.forEach(t => {
            const day = new Date(t.entryDateTime).toLocaleDateString('en-US', { weekday: 'long' });
            dayPnL[day] = (dayPnL[day] || 0) + (t.pnl || 0);
            dayCount[day] = (dayCount[day] || 0) + 1;
        });
        const sortedDaysByPnL = Object.entries(dayPnL).sort((a, b) => b[1] - a[1]);
        const sortedDaysByCount = Object.entries(dayCount).sort((a, b) => b[1] - a[1]);
        const mostProfitableDay = sortedDaysByPnL[0]?.[0] || 'N/A';
        const leastProfitableDay = sortedDaysByPnL[sortedDaysByPnL.length - 1]?.[0] || 'N/A';
        const mostActiveDay = sortedDaysByCount[0]?.[0] || 'N/A';
        const leastActiveDay = sortedDaysByCount[sortedDaysByCount.length - 1]?.[0] || 'N/A';

        const totalProfit = wins.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const winningContracts = wins.reduce((acc, t) => acc + (t.contracts || 1), 0);
        const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl || 0)) : 0;
        const winDurations = wins.filter(t => t.durationSeconds).map(t => t.durationSeconds || 0);
        const avgWinDuration = winDurations.length > 0 ? winDurations.reduce((a, b) => a + b, 0) / winDurations.length : 0;
        const longestWinDuration = Math.max(...winDurations, 0);

        const totalLoss = losses.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const losingContracts = losses.reduce((acc, t) => acc + (t.contracts || 1), 0);
        const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl || 0)) : 0;
        const lossDurations = losses.filter(t => t.durationSeconds).map(t => t.durationSeconds || 0);
        const avgLossDuration = lossDurations.length > 0 ? lossDurations.reduce((a, b) => a + b, 0) / lossDurations.length : 0;
        const longestLossDuration = Math.max(...lossDurations, 0);

        const formatDuration = (seconds: number) => {
            if (seconds < 60) return `${Math.round(seconds)}s`;
            if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
            return `${(seconds / 3600).toFixed(1)}h`;
        };

        return {
            totalPnL, winRate, profitFactor, maxWinStreak, maxLossStreak, avgWinRR, totalTrades: trades.length,
            totalContracts, avgDuration, longestDuration, expectancy, beCount,
            mostProfitableDay, leastProfitableDay, mostActiveDay, leastActiveDay,
            totalProfit, wins: wins.length, winningContracts, largestWin, avgWin, avgWinDuration, longestWinDuration,
            totalLoss, losses: losses.length, losingContracts, largestLoss, avgLoss, avgLossDuration, longestLossDuration,
            formatDuration
        };
    }, [trades, beRange]);

    const handleQuickLog = async () => {
        if (!entryPrice) { await focusedAlert('Entry price required'); return; }
        try {
            await createTrade({
                market,
                direction,
                contracts,
                entryDateTime: parseLocalToUTC(entryTime),
                entryPrice: parseFloat(entryPrice),
                status: 'OPEN',
                confluences: [],
                tags: [],
                mistakes: [],
                images: []
            } as any);
            refresh();
            setEntryPrice('');
            await focusedAlert('Trade logged!');
        } catch (err: any) {
            await focusedAlert('Error: ' + err.message);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            padding: '24px',
            boxSizing: 'border-box',
            overflowY: 'auto',
            gap: '24px'
        }}>
            {/* Stats Bar */}
            {stats && (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <ProKPICard
                        label="Total Trades"
                        value={stats.totalTrades}
                        secondaryLabel={`Break-Even: ${stats.beCount}`}
                        detailData={[
                            { label: 'Total Contracts', value: stats.totalContracts },
                            { label: 'Avg Trade Time', value: stats.formatDuration(stats.avgDuration) },
                            { label: 'Longest Trade', value: stats.formatDuration(stats.longestDuration) },
                            { label: 'Expectancy', value: `$${stats.expectancy.toFixed(2)}`, color: stats.expectancy >= 0 ? 'var(--accent)' : 'var(--danger)' },
                            { label: 'Best Day', value: stats.mostProfitableDay, color: 'var(--accent)' },
                            { label: 'Worst Day', value: stats.leastProfitableDay, color: 'var(--danger)' },
                            { label: 'Most Active', value: stats.mostActiveDay },
                        ]}
                    />
                    <ProKPICard
                        label="Avg Win"
                        value={`$${stats.avgWin.toFixed(2)}`}
                        color="var(--accent)"
                        secondaryLabel={`${stats.wins} Wins`}
                        detailData={[
                            { label: 'Total Profit', value: `$${stats.totalProfit.toFixed(2)}`, color: 'var(--accent)' },
                            { label: 'Win Contracts', value: stats.winningContracts },
                            { label: 'Largest Win', value: `$${stats.largestWin.toFixed(2)}`, color: 'var(--accent)' },
                            { label: 'Avg Duration', value: stats.formatDuration(stats.avgWinDuration) },
                            { label: 'Longest Win', value: stats.formatDuration(stats.longestWinDuration) },
                        ]}
                    />
                    <ProKPICard
                        label="Avg Loss"
                        value={`$${stats.avgLoss.toFixed(2)}`}
                        color="var(--danger)"
                        secondaryLabel={`${stats.losses} Losses`}
                        detailData={[
                            { label: 'Total Loss', value: `$${Math.abs(stats.totalLoss).toFixed(2)}`, color: 'var(--danger)' },
                            { label: 'Loss Contracts', value: stats.losingContracts },
                            { label: 'Largest Loss', value: `$${Math.abs(stats.largestLoss).toFixed(2)}`, color: 'var(--danger)' },
                            { label: 'Avg Duration', value: stats.formatDuration(stats.avgLossDuration) },
                            { label: 'Longest Loss', value: stats.formatDuration(stats.longestLossDuration) },
                        ]}
                    />
                    <ProKPICard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
                    <ProKPICard label="Profit Factor" value={stats.profitFactor.toFixed(2)} />
                    <ProKPICard label="Win Streak" value={stats.maxWinStreak} color="var(--accent)" />
                    <ProKPICard label="Loss Streak" value={stats.maxLossStreak} color="var(--danger)" />
                    <ProKPICard label="Avg Win RR" value={`${stats.avgWinRR.toFixed(2)}RR`} />
                </div>
            )}

            {/* Main Content: Sidebar + Right Content */}
            <div style={{
                display: 'flex',
                gap: '24px',
                alignItems: 'flex-start'
            }}>
                {/* Left Sidebar: Checklist & Bias (Starts from top) */}
                <div style={{ width: '340px', display: 'flex', flexDirection: 'column', gap: '24px', flexShrink: 0 }}>
                    {/* Checklist */}
                    <div className="card" style={{ padding: '24px', minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0 }}>Trading Plan Checklist</h3>
                            <button
                                onClick={() => isEditingChecklist ? saveChecklist() : setIsEditingChecklist(true)}
                                style={{
                                    padding: '4px',
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {isEditingChecklist ? <Check size={18} color="var(--accent)" /> : <Pencil size={16} />}
                            </button>
                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            paddingRight: '8px'
                        }}>
                            {checklist.map(item => (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {isEditingChecklist ? (
                                        <>
                                            <input
                                                style={{
                                                    flex: 1,
                                                    padding: '8px 12px',
                                                    fontSize: '14px',
                                                    background: 'rgba(0,0,0,0.2)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '6px',
                                                    color: 'white'
                                                }}
                                                value={item.text}
                                                onChange={(e) => editChecklistItem(item.id, e.target.value)}
                                                placeholder="New strategy item..."
                                            />
                                            <button
                                                onClick={() => deleteChecklistItem(item.id)}
                                                style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    ) : (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', width: '100%' }}>
                                            <input
                                                type="checkbox"
                                                checked={item.checked}
                                                onChange={() => toggleCheck(item.id)}
                                                style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--accent)', borderRadius: '4px' }}
                                            />
                                            <span style={{
                                                fontSize: '15px',
                                                color: item.checked ? 'var(--text-secondary)' : 'var(--text-primary)',
                                                textDecoration: item.checked ? 'line-through' : 'none',
                                                transition: 'all 0.2s ease'
                                            }}>
                                                {item.text}
                                            </span>
                                        </label>
                                    )}
                                </div>
                            ))}

                            {isEditingChecklist && (
                                <button
                                    onClick={addChecklistItem}
                                    className="btn"
                                    style={{
                                        marginTop: '8px',
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        fontSize: '14px',
                                        borderStyle: 'dashed'
                                    }}
                                >
                                    <Plus size={16} /> Add Item
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Institutional Bias */}
                    {cotReport && (
                        <div style={{ overflow: 'hidden' }}>
                            <COTQuickSignals data={cotReport.data} />
                        </div>
                    )}
                </div>

                {/* Right Content Area: Quote + (Form | Graph) */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>
                    {/* Centered Affirmation Banner (Right Only) */}
                    {quote && (
                        <div className="card" style={{
                            padding: '24px 32px',
                            background: 'rgba(24, 24, 27, 0.4)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                            borderLeft: '4px solid var(--accent)',
                            borderRight: 'none',
                            borderTop: 'none',
                            borderBottom: 'none',
                            borderRadius: '8px'
                        }}>
                            <span style={{ color: 'var(--accent)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '10px', fontWeight: 'bold', opacity: 0.9 }}>Daily Affirmation</span>
                            <h2 style={{
                                margin: 0,
                                fontWeight: '400',
                                fontStyle: 'italic',
                                color: '#f8fafc',
                                maxWidth: '900px',
                                lineHeight: '1.6',
                                fontSize: '1.2rem'
                            }}>
                                {quote.startsWith('"') ? quote : `"${quote}"`}
                            </h2>
                        </div>
                    )}

                    {/* Sub-grid for Quick Trade and Graph */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(340px, 340px) 1fr',
                        gap: '24px',
                        flex: 1
                    }}>
                        {/* Quick Trade */}
                        <div className="card" style={{ padding: '24px', minWidth: 0 }}>
                            <h3 style={{ marginTop: 0, marginBottom: '28px' }}>Quick Trade</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div className="input-group">
                                    <label className="input-label">Market</label>
                                    <select value={market} onChange={e => setMarket(e.target.value)} style={{ width: '100%', padding: '12px' }}>
                                        <option>MNQ</option>
                                        <option>NQ</option>
                                        <option>MES</option>
                                        <option>ES</option>
                                        <option>CL</option>
                                        <option>GC</option>
                                    </select>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Direction</label>
                                    <select value={direction} onChange={e => setDirection(e.target.value as any)} style={{ width: '100%', padding: '12px' }}>
                                        <option>Long</option>
                                        <option>Short</option>
                                    </select>
                                </div>

                                <div style={{ display: 'flex', gap: '16px', minWidth: 0 }}>
                                    <div className="input-group" style={{ flex: 1, minWidth: 0 }}>
                                        <label className="input-label">Contracts</label>
                                        <input
                                            type="number"
                                            value={contracts}
                                            onChange={e => setContracts(parseInt(e.target.value) || 1)}
                                            min={1}
                                            style={{ width: '100%', padding: '12px' }}
                                        />
                                    </div>
                                    <div className="input-group" style={{ flex: 1.5, minWidth: 0 }}>
                                        <label className="input-label">Entry Price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={entryPrice}
                                            onChange={e => setEntryPrice(e.target.value)}
                                            placeholder="0.00"
                                            style={{ width: '100%', padding: '12px' }}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Entry Time</label>
                                    <input
                                        type="datetime-local"
                                        step="1"
                                        value={entryTime}
                                        onChange={e => setEntryTime(e.target.value)}
                                        style={{ width: '100%', padding: '12px' }}
                                    />
                                </div>

                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', marginTop: 'auto', height: '52px', fontSize: '16px', fontWeight: 'bold' }}
                                    onClick={handleQuickLog}
                                >
                                    Log Trade
                                </button>
                            </div>
                        </div>

                        {/* Equity Curve */}
                        <div className="card" style={{ padding: '24px', flex: 1, minWidth: 0 }}>
                            <EquityCurve trades={trades} height="100%" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekly Review Widget */}
            <div style={{ width: '100%', marginTop: 'auto' }}>
                <WeeklySummaryWidget trades={trades} />
            </div>
        </div>
    );
}
