import { useMemo, useState, useEffect } from 'react';
import { useTrades } from '../hooks/useTrades';
import { Trade } from '../types';
import { StatsBreakdown } from '../components/StatsBreakdown';
import { DrawdownChart } from '../components/DrawdownChart';
import { EquityCurve } from '../components/EquityCurve';
import { WinLossPie } from '../components/WinLossPie';
import { DurationAnalysis } from '../components/DurationAnalysis';
import { PnLByHour } from '../components/PnLByHour';
import { PnLByDay } from '../components/PnLByDay';
import { RDistributionChart } from '../components/RDistributionChart';
import { Calendar, Clock } from 'lucide-react';

// =============== HELPER COMPONENTS ===============

// Simple metric card for Row A2/A3
function MetricCard({ label, value, color, highlight }: {
    label: string;
    value: string | number;
    color?: string;
    highlight?: boolean;
}) {
    return (
        <div className="card" style={{
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            border: highlight ? '1px solid var(--accent)' : '1px solid var(--border)',
            boxShadow: highlight ? '0 0 10px var(--accent-glow)' : 'none'
        }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
            </span>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: color || 'var(--text-primary)' }}>
                {value}
            </span>
        </div>
    );
}

// Wide KPI card with inline details (for Row A1)
function WideKPICard({
    label,
    value,
    secondaryLabel,
    color,
    detailData
}: {
    label: string;
    value: string | number;
    secondaryLabel?: string;
    color?: string;
    detailData: { label: string; value: string | number; color?: string }[];
}) {
    return (
        <div className="card" style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '24px'
        }}>
            {/* Left: Main Value */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '100px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {label}
                </span>
                <span style={{ fontSize: '32px', fontWeight: 'bold', color: color || 'var(--text-primary)' }}>
                    {value}
                </span>
                {secondaryLabel && (
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {secondaryLabel}
                    </span>
                )}
            </div>

            {/* Divider */}
            <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--border)', opacity: 0.5 }} />

            {/* Right: Detail List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                {detailData.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: item.color || 'var(--text-primary)' }}>{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Small card for Day/Duration grid (Row C)
function SmallMetricCard({
    icon,
    label,
    value,
    subValue,
    accentColor
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subValue?: string;
    accentColor?: string;
}) {
    return (
        <div className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '80px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                {icon}
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {label}
                </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: accentColor || 'var(--text-primary)' }}>
                {value}
            </div>
            {subValue && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{subValue}</div>
            )}
        </div>
    );
}

// =============== MAIN COMPONENT ===============

export function Stats() {
    const { trades, loading } = useTrades();
    const [filterDateRange, setFilterDateRange] = useState<'All' | 'This Week' | 'Last Week' | 'This Month' | 'Last Month' | 'This Year' | 'Custom'>('All');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [filterMarket, setFilterMarket] = useState('All');
    const [filterDirection, setFilterDirection] = useState('All');
    const [filterSetup, setFilterSetup] = useState('All');
    const [filterTag, setFilterTag] = useState('All');
    const [beRange, setBeRange] = useState({ min: -0.1, max: 0.1 });
    const [showDrawdown, setShowDrawdown] = useState(true);

    // Load BE settings
    useEffect(() => {
        (async () => {
            if (!window.electronAPI?.settings) return;
            try {
                const s = await window.electronAPI.settings.get('break_even_range');
                if (s) setBeRange(s);
            } catch (e) {
                console.error("Failed to load BE settings", e);
            }
        })();
    }, []);

    // Filter options
    const markets = useMemo(() => [...new Set(trades.map(t => t.market))], [trades]);
    const setups = useMemo(() => [...new Set(trades.map(t => t.setup).filter(Boolean))], [trades]);
    const tags = useMemo(() => [...new Set(trades.flatMap(t => t.tags || []))], [trades]);

    // Apply filters
    const filteredTrades = useMemo(() => {
        let result = [...trades];

        // Date filter
        const now = new Date();
        const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfLastWeek = new Date(startOfWeek); startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        const endOfLastWeek = new Date(startOfWeek); endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        if (filterDateRange === 'This Week') {
            result = result.filter(t => new Date(t.entryDateTime) >= startOfWeek);
        } else if (filterDateRange === 'Last Week') {
            result = result.filter(t => { const d = new Date(t.entryDateTime); return d >= startOfLastWeek && d <= endOfLastWeek; });
        } else if (filterDateRange === 'This Month') {
            result = result.filter(t => new Date(t.entryDateTime) >= startOfMonth);
        } else if (filterDateRange === 'Last Month') {
            result = result.filter(t => { const d = new Date(t.entryDateTime); return d >= startOfLastMonth && d <= endOfLastMonth; });
        } else if (filterDateRange === 'This Year') {
            result = result.filter(t => new Date(t.entryDateTime) >= startOfYear);
        } else if (filterDateRange === 'Custom' && customStartDate && customEndDate) {
            const start = new Date(customStartDate);
            const end = new Date(customEndDate); end.setHours(23, 59, 59, 999);
            result = result.filter(t => { const d = new Date(t.entryDateTime); return d >= start && d <= end; });
        }

        if (filterMarket !== 'All') result = result.filter(t => t.market === filterMarket);
        if (filterDirection !== 'All') result = result.filter(t => t.direction === filterDirection);
        if (filterSetup !== 'All') result = result.filter(t => t.setup === filterSetup);
        if (filterTag === 'No Tags') result = result.filter(t => !t.tags || t.tags.length === 0);
        else if (filterTag !== 'All') result = result.filter(t => t.tags?.includes(filterTag));

        return result.sort((a, b) => new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime());
    }, [trades, filterDateRange, customStartDate, customEndDate, filterMarket, filterDirection, filterSetup, filterTag]);

    // Compute all metrics
    const metrics = useMemo(() => {
        if (filteredTrades.length === 0) return null;

        const wins = filteredTrades.filter(t => (t.pnl || 0) > 0);
        const losses = filteredTrades.filter(t => (t.pnl || 0) < 0);

        const totalPnL = filteredTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

        const winRate = (wins.length / filteredTrades.length) * 100;

        const avgWin = wins.length > 0 ? wins.reduce((acc, t) => acc + (t.pnl || 0), 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((acc, t) => acc + (t.pnl || 0), 0) / losses.length) : 0;

        const totalProfit = wins.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const totalLoss = losses.reduce((acc, t) => acc + (t.pnl || 0), 0);

        // Profit Retention % = (Sum PnL / Sum MFE($)) * 100 [Winners only]
        // Note: MFE is stored as price. MFE Value = abs(entry - mfePrice) * contracts * pointValue?
        // Wait, MFE price is the price level. To get dollar value, we need R-multiple or reuse known PnL math.
        // Simplified approach based on request: "MFE converted to dollar value".
        // PnL = (Exit - Entry) * ...
        // MFE_PnL = (MFE_Price - Entry) * ...
        // Ratio = PnL / MFE_PnL. This simplifies to (Exit - Entry) / (MFE_Price - Entry).
        // Contracts and point multipliers cancel out.
        // So we can just sum the ratios? No, sum of PnL / sum of MFE_PnL.
        // We need to calculate MFE dollar value for each trade.
        // MFE_Dollar = (MFE_Price - Entry) / (Exit - Entry) * PnL?
        // If PnL is known, MFE_$ = PnL * (MFE_Dist / Exit_Dist).
        const profitRetentionRaw = wins.reduce((acc, t) => {
            const entry = t.entryPrice;
            const exit = t.exitPrice;
            const mfe = t.mfePrice;
            const pnl = t.pnl || 0;

            if (!entry || !exit || !mfe || !pnl) return acc;

            const pnlDist = Math.abs(exit - entry);
            const mfeDist = Math.abs(mfe - entry);

            if (pnlDist === 0) return acc;

            const potential = pnl * (mfeDist / pnlDist);
            return {
                captured: acc.captured + pnl,
                potential: acc.potential + potential
            };
        }, { captured: 0, potential: 0 });

        const profitRetention = profitRetentionRaw.potential > 0
            ? (profitRetentionRaw.captured / profitRetentionRaw.potential) * 100
            : 0;

        const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;
        const expectancy = (winRate / 100 * avgWin) - ((losses.length / filteredTrades.length) * avgLoss);

        const avgWinR = wins.length > 0 ? wins.reduce((acc, t) => acc + (t.achievedR || 0), 0) / wins.length : 0;

        // Streaks
        let maxWinStreak = 0, maxLossStreak = 0, currentWinStreak = 0, currentLossStreak = 0;
        filteredTrades.forEach(t => {
            if ((t.pnl || 0) > 0) { currentWinStreak++; currentLossStreak = 0; maxWinStreak = Math.max(maxWinStreak, currentWinStreak); }
            else if ((t.pnl || 0) < 0) { currentLossStreak++; currentWinStreak = 0; maxLossStreak = Math.max(maxLossStreak, currentLossStreak); }
        });

        // Max Drawdown
        let equity = 0, peak = 0, maxDD = 0;
        filteredTrades.forEach(t => {
            equity += (t.pnl || 0);
            if (equity > peak) peak = equity;
            const dd = peak - equity;
            if (dd > maxDD) maxDD = dd;
        });

        // Durations
        const formatDuration = (secs: number) => {
            if (!secs || secs === 0) return '0s';
            if (secs < 60) return `${Math.round(secs)}s`;
            const mins = Math.floor(secs / 60);
            if (mins < 60) return `${mins}m ${Math.round(secs % 60)}s`;
            const hrs = Math.floor(mins / 60);
            return `${hrs}h ${mins % 60}m`;
        };

        // Re-calculate Total Contracts
        const totalContracts = filteredTrades.reduce((acc, t) => acc + (t.contracts || 1), 0);

        // Break-Even Calculation
        const beCount = filteredTrades.filter(t => {
            const r = t.achievedR ?? 0;
            return r > beRange.min && r < beRange.max;
        }).length;

        const calculateMedian = (arr: number[]) => {
            if (arr.length === 0) return 0;
            const sorted = [...arr].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        };

        const avgDuration = filteredTrades.length > 0 ? filteredTrades.reduce((acc, t) => acc + (t.durationSeconds || 0), 0) / filteredTrades.length : 0;
        const longestDuration = Math.max(...filteredTrades.map(t => t.durationSeconds || 0));
        const avgWinDuration = wins.length ? wins.reduce((acc, t) => acc + (t.durationSeconds || 0), 0) / wins.length : 0;
        const medianWinDuration = wins.length ? calculateMedian(wins.map(t => t.durationSeconds || 0)) : 0;
        const avgLossDuration = losses.length ? losses.reduce((acc, t) => acc + (t.durationSeconds || 0), 0) / losses.length : 0;
        const medianLossDuration = losses.length ? calculateMedian(losses.map(t => t.durationSeconds || 0)) : 0;

        // Median PnL (in Dollars)
        const medianWinPnL = wins.length ? calculateMedian(wins.map(t => t.pnl || 0)) : 0;
        const medianLossPnL = losses.length ? calculateMedian(losses.map(t => t.pnl || 0)) : 0;

        // MFE and MAE (All Trades)
        const calculateR = (t: Trade, type: 'MFE' | 'MAE') => {
            const sl = t.initialSL || t.plannedSL;
            const price = type === 'MFE' ? t.mfePrice : t.maePrice;

            if (!sl || t.entryPrice === sl || price === undefined || price === null) return null;

            const riskPoints = Math.abs(t.entryPrice - sl);
            if (riskPoints === 0) return null;

            // User Formula: |Entry - Price| / Risk
            return Math.abs(t.entryPrice - price) / riskPoints;
        };

        const allMFEs = filteredTrades
            .map(t => calculateR(t, 'MFE'))
            .filter((r): r is number => r !== null);

        const avgMFE = allMFEs.length ? allMFEs.reduce((a, b) => a + b, 0) / allMFEs.length : 0;
        const medianMFE = allMFEs.length ? calculateMedian(allMFEs) : 0;

        const allMAEs = filteredTrades
            .map(t => calculateR(t, 'MAE'))
            .filter((r): r is number => r !== null);

        const avgMAE = allMAEs.length ? allMAEs.reduce((a, b) => a + b, 0) / allMAEs.length : 0;
        const medianMAE = allMAEs.length ? calculateMedian(allMAEs) : 0;

        const largestWin = wins.length > 0 ? Math.max(...wins.map(t => t.pnl || 0)) : 0;
        const largestLoss = losses.length > 0 ? Math.min(...losses.map(t => t.pnl || 0)) : 0;

        const winningContracts = wins.reduce((acc, t) => acc + (t.contracts || 1), 0);
        const losingContracts = losses.reduce((acc, t) => acc + (t.contracts || 1), 0);

        // Std Deviation
        const winStdDev = wins.length > 1 ? Math.sqrt(wins.reduce((acc, t) => acc + Math.pow((t.pnl || 0) - avgWin, 2), 0) / wins.length) : 0;
        const lossStdDev = losses.length > 1 ? Math.sqrt(losses.reduce((acc, t) => acc + Math.pow(Math.abs(t.pnl || 0) - avgLoss, 2), 0) / losses.length) : 0;

        // Day Analysis
        const days: Record<string, { count: number; pnl: number; wins: number; losses: number }> = {};
        filteredTrades.forEach(t => {
            const day = new Date(t.entryDateTime).toLocaleDateString('en-US', { weekday: 'long' });
            if (!days[day]) days[day] = { count: 0, pnl: 0, wins: 0, losses: 0 };
            days[day].count++;
            days[day].pnl += (t.pnl || 0);
            if ((t.pnl || 0) > 0) days[day].wins++;
            else if ((t.pnl || 0) < 0) days[day].losses++;
        });
        const dayEntries = Object.entries(days);
        const mostActiveDay = [...dayEntries].sort((a, b) => b[1].count - a[1].count)[0];
        const leastActiveDay = [...dayEntries].sort((a, b) => a[1].count - b[1].count)[0];
        const mostProfitableDay = [...dayEntries].sort((a, b) => b[1].pnl - a[1].pnl)[0];
        const leastProfitableDay = [...dayEntries].sort((a, b) => a[1].pnl - b[1].pnl)[0];
        const daysWithTrades = dayEntries.filter(([_, d]) => d.count > 0);
        const bestWinRateDay = [...daysWithTrades].sort((a, b) => (b[1].wins / b[1].count) - (a[1].wins / a[1].count))[0];
        const worstLossRateDay = [...daysWithTrades].sort((a, b) => (b[1].losses / b[1].count) - (a[1].losses / a[1].count))[0];

        return {
            totalTrades: filteredTrades.length,
            totalContracts,
            beCount,
            totalPnL, winRate, profitFactor, expectancy, maxDD, profitRetention,
            avgWin, avgLoss, totalProfit, totalLoss,
            avgWinR, maxWinStreak, maxLossStreak,
            wins: wins.length, losses: losses.length,
            largestWin, largestLoss, winningContracts, losingContracts,
            winStdDev, lossStdDev,
            avgTradeTime: avgDuration,
            longestTrade: longestDuration,
            avgWinDuration, medianWinDuration,
            avgLossDuration, medianLossDuration,
            medianWinPnL, medianLossPnL,
            avgMFE, medianMFE, avgMAE, medianMAE,
            formatDuration,
            mostActive: mostActiveDay ? mostActiveDay[0] : '-',
            bestDay: mostProfitableDay ? mostProfitableDay[0] : '-',
            worstDay: leastProfitableDay ? leastProfitableDay[0] : '-',
            mostActiveDay: mostActiveDay ? { name: mostActiveDay[0], count: mostActiveDay[1].count } : null,
            leastActiveDay: leastActiveDay ? { name: leastActiveDay[0], count: leastActiveDay[1].count } : null,
            mostProfitableDay: mostProfitableDay ? { name: mostProfitableDay[0], pnl: mostProfitableDay[1].pnl } : null,
            leastProfitableDay: leastProfitableDay ? { name: leastProfitableDay[0], pnl: leastProfitableDay[1].pnl } : null,
            bestWinRateDay: bestWinRateDay ? { name: bestWinRateDay[0], rate: (bestWinRateDay[1].wins / bestWinRateDay[1].count * 100) } : null,
            worstLossRateDay: worstLossRateDay ? { name: worstLossRateDay[0], rate: (worstLossRateDay[1].losses / worstLossRateDay[1].count * 100) } : null,
        };
    }, [filteredTrades, beRange]);

    if (loading) return <div className="p-4">Loading stats...</div>;

    const gap = '16px';

    return (
        <div style={{ width: '100%', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', boxSizing: 'border-box' }}>

            {/* ========== HEADER & FILTERS ========== */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <h2 style={{ margin: 0 }}>Analytics</h2>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <select style={{ padding: '8px', minWidth: '120px' }} value={filterMarket} onChange={e => setFilterMarket(e.target.value)}>
                        <option value="All">All Markets</option>
                        {markets.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select style={{ padding: '8px', minWidth: '100px' }} value={filterDirection} onChange={e => setFilterDirection(e.target.value)}>
                        <option value="All">All Sides</option>
                        <option value="Long">Long</option>
                        <option value="Short">Short</option>
                    </select>
                    <select style={{ padding: '8px', minWidth: '120px' }} value={filterSetup} onChange={e => setFilterSetup(e.target.value)}>
                        <option value="All">All Setups</option>
                        {setups.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select style={{ padding: '8px', minWidth: '120px' }} value={filterTag} onChange={e => setFilterTag(e.target.value)}>
                        <option value="All">All Tags</option>
                        <option value="No Tags">No Tags</option>
                        {tags.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select style={{ padding: '8px', minWidth: '120px' }} value={filterDateRange} onChange={e => setFilterDateRange(e.target.value as any)}>
                            <option>All</option>
                            <option>This Week</option>
                            <option>Last Week</option>
                            <option>This Month</option>
                            <option>Last Month</option>
                            <option>This Year</option>
                            <option>Custom</option>
                        </select>
                        {filterDateRange === 'Custom' && (
                            <>
                                <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} style={{ padding: '7px', width: '130px' }} />
                                <span style={{ color: 'var(--text-secondary)' }}>to</span>
                                <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} style={{ padding: '7px', width: '130px' }} />
                            </>
                        )}
                    </div>
                </div>
            </div>

            {metrics && (
                <>
                    {/* ========== ROW A1: 3 Wide KPI Cards ========== */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap }}>
                        <WideKPICard
                            label="TOTAL TRADES"
                            value={metrics.totalTrades}
                            secondaryLabel={`Break-Even: ${metrics.beCount}`}
                            detailData={[
                                { label: 'Total Contracts', value: metrics.totalContracts },
                                { label: 'Avg Trade Time', value: metrics.formatDuration(metrics.avgTradeTime) },
                                { label: 'Longest Trade', value: metrics.formatDuration(metrics.longestTrade) },
                                { label: 'Expectancy', value: `$${metrics.expectancy.toFixed(2)}`, color: metrics.expectancy >= 0 ? 'var(--accent)' : 'var(--danger)' },
                                { label: 'Best Day', value: metrics.bestDay || '-', color: 'var(--accent)' },
                                { label: 'Worst Day', value: metrics.worstDay || '-', color: 'var(--danger)' },
                                { label: 'Most Active', value: metrics.mostActive || '-' },
                                { label: 'Profit Retention', value: `${metrics.profitRetention.toFixed(1)}%`, color: metrics.profitRetention >= 50 ? 'var(--accent)' : undefined },
                            ]}
                        />
                        <WideKPICard
                            label="AVG WIN"
                            value={`$${metrics.avgWin.toFixed(2)}`}
                            color="var(--accent)"
                            secondaryLabel={`${metrics.wins} Wins`}
                            detailData={[
                                { label: 'Total Profit', value: `$${metrics.totalProfit.toFixed(2)}`, color: 'var(--accent)' },
                                { label: 'Win Contracts', value: metrics.winningContracts },
                                { label: 'Largest Win', value: `$${metrics.largestWin.toFixed(2)}`, color: 'var(--accent)' },
                                { label: 'Median Win', value: `$${metrics.medianWinPnL.toFixed(2)}`, color: 'var(--accent)' },
                                { label: 'Std. Deviation', value: `$${metrics.winStdDev.toFixed(2)}` },
                                { label: 'Avg Duration', value: metrics.formatDuration(metrics.avgWinDuration) },
                                { label: 'Avg MFE', value: `${metrics.avgMFE.toFixed(2)}R`, color: 'var(--accent)' },
                                { label: 'Median MFE', value: `${metrics.medianMFE.toFixed(2)}R`, color: 'var(--accent)' },
                            ]}
                        />
                        <WideKPICard
                            label="AVG LOSS"
                            value={`$${metrics.avgLoss.toFixed(2)}`}
                            color="var(--danger)"
                            secondaryLabel={`${metrics.losses} Losses`}
                            detailData={[
                                { label: 'Total Loss', value: `$${Math.abs(metrics.totalLoss).toFixed(2)}`, color: 'var(--danger)' },
                                { label: 'Loss Contracts', value: metrics.losingContracts },
                                { label: 'Largest Loss', value: `$${Math.abs(metrics.largestLoss).toFixed(2)}`, color: 'var(--danger)' },
                                { label: 'Median Loss', value: `$${Math.abs(metrics.medianLossPnL).toFixed(2)}`, color: 'var(--danger)' },
                                { label: 'Std. Deviation', value: `$${metrics.lossStdDev.toFixed(2)}` },
                                { label: 'Avg Duration', value: metrics.formatDuration(metrics.avgLossDuration) },
                                { label: 'Avg MAE', value: `${metrics.avgMAE.toFixed(2)}R`, color: 'var(--danger)' },
                                { label: 'Median MAE', value: `${metrics.medianMAE.toFixed(2)}R`, color: 'var(--danger)' },
                            ]}
                        />
                    </div>

                    {/* ========== ROW A2: 8 Equal Metric Cards ========== */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap }}>
                        <MetricCard label="NET PNL" value={`$${metrics.totalPnL.toFixed(2)}`} color={metrics.totalPnL >= 0 ? 'var(--accent)' : 'var(--danger)'} highlight />
                        <MetricCard label="WIN RATE" value={`${metrics.winRate.toFixed(1)}%`} />
                        <MetricCard label="PROFIT FACTOR" value={metrics.profitFactor.toFixed(2)} color={metrics.profitFactor >= 2 ? 'var(--accent)' : undefined} />
                        <MetricCard label="EXPECTANCY" value={`$${metrics.expectancy.toFixed(2)}`} color={metrics.expectancy >= 0 ? 'var(--accent)' : 'var(--danger)'} />
                        <MetricCard label="MAX DRAWDOWN" value={`-$${metrics.maxDD.toFixed(2)}`} color="var(--danger)" />
                        <MetricCard label="AVG WIN RR" value={`${metrics.avgWinR.toFixed(2)}RR`} />
                        <MetricCard label="MAX WIN STREAK" value={metrics.maxWinStreak} color="var(--accent)" />
                        <MetricCard label="MAX LOSS STREAK" value={metrics.maxLossStreak} color="var(--danger)" />
                    </div>

                    {/* ========== ROW B: 3 Main Charts ========== */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap }}>
                        <EquityCurve trades={filteredTrades} />
                        <div className="card" style={{ height: '300px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                <button
                                    onClick={() => setShowDrawdown(true)}
                                    style={{
                                        border: 'none',
                                        background: showDrawdown ? 'var(--accent)' : 'transparent',
                                        color: showDrawdown ? '#000' : 'var(--text-secondary)',
                                        padding: '4px 8px',
                                        borderRadius: '3px',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    DD
                                </button>
                                <button
                                    onClick={() => setShowDrawdown(false)}
                                    style={{
                                        border: 'none',
                                        background: !showDrawdown ? 'var(--accent)' : 'transparent',
                                        color: !showDrawdown ? '#000' : 'var(--text-secondary)',
                                        padding: '4px 8px',
                                        borderRadius: '3px',
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    R-Dist
                                </button>
                            </div>

                            {showDrawdown ? (
                                <DrawdownChart trades={filteredTrades} />
                            ) : (
                                <div style={{ height: '100%', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                                    <h4 style={{ margin: '0 0 16px 0' }}>R-Multiple Distribution</h4>
                                    <RDistributionChart trades={filteredTrades} beRange={beRange} />
                                </div>
                            )}
                        </div>
                        <WinLossPie trades={filteredTrades} />
                    </div>

                    {/* ========== ROW C: 2x6 Day/Duration Grid ========== */}
                    {/* Row C1: Days */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap }}>
                        <SmallMetricCard icon={<Calendar size={14} color="var(--text-secondary)" />} label="MOST ACTIVE DAY" value={metrics.mostActiveDay?.name || '-'} subValue={`${metrics.mostActiveDay?.count || 0} trades`} />
                        <SmallMetricCard icon={<Calendar size={14} color="var(--text-secondary)" />} label="LEAST ACTIVE DAY" value={metrics.leastActiveDay?.name || '-'} subValue={`${metrics.leastActiveDay?.count || 0} trades`} />
                        <SmallMetricCard icon={<Calendar size={14} color="var(--accent)" />} label="MOST PROFITABLE DAY" value={metrics.mostProfitableDay?.name || '-'} subValue={`$${metrics.mostProfitableDay?.pnl?.toFixed(2) || '0.00'}`} accentColor="var(--accent)" />
                        <SmallMetricCard icon={<Calendar size={14} color="var(--text-secondary)" />} label="BEST DAY (WIN RATE)" value={metrics.bestWinRateDay?.name || '-'} subValue={`${metrics.bestWinRateDay?.rate?.toFixed(0) || 0}% win rate`} />
                        <SmallMetricCard icon={<Calendar size={14} color="var(--danger)" />} label="LEAST PROFITABLE DAY" value={metrics.leastProfitableDay?.name || '-'} subValue={`$${metrics.leastProfitableDay?.pnl?.toFixed(2) || '0.00'}`} accentColor="var(--danger)" />
                        <SmallMetricCard icon={<Calendar size={14} color="var(--text-secondary)" />} label="WORST DAY (LOSS RATE)" value={metrics.worstLossRateDay?.name || '-'} subValue={`${metrics.worstLossRateDay?.rate?.toFixed(0) || 0}% loss rate`} />
                    </div>
                    {/* Row C2: Durations */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap }}>
                        <SmallMetricCard icon={<Clock size={14} color="var(--text-secondary)" />} label="AVG TRADE DURATION" value={metrics.formatDuration(metrics.avgTradeTime)} />
                        <SmallMetricCard icon={<Clock size={14} color="var(--text-secondary)" />} label="LONGEST TRADE DURATION" value={metrics.formatDuration(metrics.longestTrade)} />
                        <SmallMetricCard icon={<Clock size={14} color="var(--accent)" />} label="AVG WIN DURATION" value={metrics.formatDuration(metrics.avgWinDuration)} accentColor="var(--accent)" />
                        <SmallMetricCard icon={<Clock size={14} color="var(--accent)" />} label="MEDIAN WIN DURATION" value={metrics.formatDuration(metrics.medianWinDuration)} accentColor="var(--accent)" />
                        <SmallMetricCard icon={<Clock size={14} color="var(--danger)" />} label="AVG LOSS DURATION" value={metrics.formatDuration(metrics.avgLossDuration)} accentColor="var(--danger)" />
                        <SmallMetricCard icon={<Clock size={14} color="var(--danger)" />} label="MEDIAN LOSS DURATION" value={metrics.formatDuration(metrics.medianLossDuration)} accentColor="var(--danger)" />
                    </div>

                    {/* ========== ROW D: 3 Lower Charts ========== */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap }}>
                        <DurationAnalysis trades={filteredTrades} />
                        <PnLByHour trades={filteredTrades} />
                        <PnLByDay trades={filteredTrades} />
                    </div>

                    {/* ========== ROW E: Performance Breakdown ========== */}
                    <StatsBreakdown trades={filteredTrades} />
                </>
            )}

            {!metrics && (
                <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No trades to analyze. Add trades to see your analytics.
                </div>
            )}
        </div>
    );
}
