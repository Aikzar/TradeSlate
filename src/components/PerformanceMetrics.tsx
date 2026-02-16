
import { useMemo } from 'react';
import { Trade } from '../types';

interface PerformanceMetricsProps {
    trades: Trade[];
}

export function PerformanceMetrics({ trades }: PerformanceMetricsProps) {
    const metrics = useMemo(() => {
        if (trades.length === 0) return null;

        const wins = trades.filter(t => (t.pnl || 0) > 0);
        const losses = trades.filter(t => (t.pnl || 0) < 0);
        const breakevens = trades.filter(t => (t.pnl || 0) === 0);

        const totalPnL = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const winRate = (wins.length / trades.length) * 100;

        const avgWin = wins.length > 0 ? wins.reduce((acc, t) => acc + (t.pnl || 0), 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((acc, t) => acc + (t.pnl || 0), 0) / losses.length) : 0;

        const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;
        const expectancy = (winRate / 100 * avgWin) - ((losses.length / trades.length) * avgLoss);

        // Avg Win R / Achieved R calculations
        const avgWinR = wins.length > 0 ? wins.reduce((acc, t) => acc + (t.achievedR || 0), 0) / wins.length : 0;

        // Streaks
        let maxWinStreak = 0, maxLossStreak = 0, currentWinStreak = 0, currentLossStreak = 0;
        trades.forEach(t => {
            if ((t.pnl || 0) > 0) {
                currentWinStreak++;
                currentLossStreak = 0;
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
            } else if ((t.pnl || 0) < 0) {
                currentLossStreak++;
                currentWinStreak = 0;
                maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
            }
        });

        // Max Drawdown Calculation
        let equity = 0;
        let peak = 0;
        let maxDD = 0;
        trades.forEach(t => {
            equity += (t.pnl || 0);
            if (equity > peak) peak = equity;
            const dd = peak - equity;
            if (dd > maxDD) maxDD = dd;
        });

        return {
            totalPnL,
            totalTrades: trades.length,
            winRate,
            profitFactor,
            expectancy,
            avgWin,
            avgLoss,
            avgWinR,
            maxWinStreak,
            maxLossStreak,
            maxDD
        };
    }, [trades]);

    if (!metrics) {
        return (
            <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No trades to analyze
            </div>
        );
    }

    const MetricCard = ({ label, value, color, highlight }: { label: string; value: string | number; color?: string; highlight?: boolean }) => (
        <div className="card" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '16px',
            border: highlight ? '1px solid var(--accent)' : '1px solid var(--border)',
            boxShadow: highlight ? '0 0 10px var(--accent-glow)' : 'none'
        }}>
            <span className="input-label" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>{label}</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: color || 'var(--text-primary)' }}>{value}</span>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Primary KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
                <MetricCard label="Net PnL" value={`$${metrics.totalPnL.toFixed(2)}`} color={metrics.totalPnL >= 0 ? 'var(--accent)' : 'var(--danger)'} highlight />
                <MetricCard label="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} color={metrics.winRate >= 50 ? 'var(--accent)' : 'var(--danger)'} />
                <MetricCard label="Profit Factor" value={metrics.profitFactor.toFixed(2)} color={metrics.profitFactor >= 2 ? 'var(--accent)' : undefined} />
                <MetricCard label="Expectancy" value={`$${metrics.expectancy.toFixed(2)}`} color={metrics.expectancy >= 0 ? 'var(--accent)' : 'var(--danger)'} />
                <MetricCard label="Max Drawdown" value={`-$${metrics.maxDD.toFixed(2)}`} color="var(--danger)" />
            </div>

            {/* Secondary Metrics (no duplicates with Pro KPI row) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                <MetricCard label="Avg Win R" value={`${metrics.avgWinR.toFixed(2)}R`} />
                <MetricCard label="Max Win Streak" value={metrics.maxWinStreak} color="var(--accent)" />
                <MetricCard label="Max Loss Streak" value={metrics.maxLossStreak} color="var(--danger)" />
            </div>
        </div>
    );
}
