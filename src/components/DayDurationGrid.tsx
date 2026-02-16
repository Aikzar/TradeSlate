import { useMemo } from 'react';
import { Trade } from '../types';
import { Calendar, Clock } from 'lucide-react';

interface DayDurationGridProps {
    trades: Trade[];
}

export function DayDurationGrid({ trades }: DayDurationGridProps) {
    const metrics = useMemo(() => {
        if (trades.length === 0) return null;

        const wins = trades.filter(t => (t.pnl || 0) > 0);
        const losses = trades.filter(t => (t.pnl || 0) < 0);

        // Day Analysis
        const days: Record<string, { count: number; pnl: number; wins: number; losses: number }> = {};
        trades.forEach(t => {
            const day = new Date(t.entryDateTime).toLocaleDateString('en-US', { weekday: 'long' });
            if (!days[day]) days[day] = { count: 0, pnl: 0, wins: 0, losses: 0 };
            days[day].count++;
            days[day].pnl += (t.pnl || 0);
            if ((t.pnl || 0) > 0) days[day].wins++;
            else if ((t.pnl || 0) < 0) days[day].losses++;
        });

        const dayEntries = Object.entries(days);

        // Day metrics
        const mostActiveDay = [...dayEntries].sort((a, b) => b[1].count - a[1].count)[0];
        const leastActiveDay = [...dayEntries].sort((a, b) => a[1].count - b[1].count)[0];
        const mostProfitableDay = [...dayEntries].sort((a, b) => b[1].pnl - a[1].pnl)[0];
        const leastProfitableDay = [...dayEntries].sort((a, b) => a[1].pnl - b[1].pnl)[0];

        // Best/Worst day by win rate
        const daysWithTrades = dayEntries.filter(([_, d]) => d.count > 0);
        const bestWinRateDay = [...daysWithTrades].sort((a, b) =>
            (b[1].wins / b[1].count) - (a[1].wins / a[1].count)
        )[0];
        const worstLossRateDay = [...daysWithTrades].sort((a, b) =>
            (b[1].losses / b[1].count) - (a[1].losses / a[1].count)
        )[0];

        // Duration metrics
        const formatDuration = (secs: number) => {
            if (!secs || secs === 0) return '0s';
            if (secs < 60) return `${Math.round(secs)}s`;
            const mins = Math.floor(secs / 60);
            if (mins < 60) return `${mins}m ${Math.round(secs % 60)}s`;
            const hrs = Math.floor(mins / 60);
            return `${hrs}h ${mins % 60}m`;
        };

        const calculateMedian = (arr: number[]) => {
            if (arr.length === 0) return 0;
            const sorted = [...arr].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        };

        const avgTradeDuration = trades.reduce((acc, t) => acc + (t.durationSeconds || 0), 0) / trades.length;
        const longestTradeDuration = Math.max(...trades.map(t => t.durationSeconds || 0));

        const avgWinDuration = wins.length ? wins.reduce((acc, t) => acc + (t.durationSeconds || 0), 0) / wins.length : 0;
        const medianWinDuration = wins.length ? calculateMedian(wins.map(t => t.durationSeconds || 0)) : 0;

        const avgLossDuration = losses.length ? losses.reduce((acc, t) => acc + (t.durationSeconds || 0), 0) / losses.length : 0;
        const medianLossDuration = losses.length ? calculateMedian(losses.map(t => t.durationSeconds || 0)) : 0;

        return {
            // Day Row
            mostActiveDay: mostActiveDay ? { name: mostActiveDay[0], count: mostActiveDay[1].count } : null,
            leastActiveDay: leastActiveDay ? { name: leastActiveDay[0], count: leastActiveDay[1].count } : null,
            mostProfitableDay: mostProfitableDay ? { name: mostProfitableDay[0], pnl: mostProfitableDay[1].pnl } : null,
            bestWinRateDay: bestWinRateDay ? { name: bestWinRateDay[0], rate: (bestWinRateDay[1].wins / bestWinRateDay[1].count * 100) } : null,
            leastProfitableDay: leastProfitableDay ? { name: leastProfitableDay[0], pnl: leastProfitableDay[1].pnl } : null,
            worstLossRateDay: worstLossRateDay ? { name: worstLossRateDay[0], rate: (worstLossRateDay[1].losses / worstLossRateDay[1].count * 100) } : null,
            // Duration Row
            avgTradeDuration: formatDuration(avgTradeDuration),
            longestTradeDuration: formatDuration(longestTradeDuration),
            avgWinDuration: formatDuration(avgWinDuration),
            medianWinDuration: formatDuration(medianWinDuration),
            avgLossDuration: formatDuration(avgLossDuration),
            medianLossDuration: formatDuration(medianLossDuration),
        };
    }, [trades]);

    if (!metrics) return null;

    // Card component for consistency
    const MetricCard = ({
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
    }) => (
        <div className="card" style={{
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minHeight: '80px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                {icon}
                <span style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    {label}
                </span>
            </div>
            <div style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: accentColor || 'var(--text-primary)'
            }}>
                {value}
            </div>
            {subValue && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {subValue}
                </div>
            )}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Row 1: Day Metrics */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '16px',
                columnGap: '16px'
            }}>
                {/* General (Cols 1-2) */}
                <MetricCard
                    icon={<Calendar size={14} color="var(--text-secondary)" />}
                    label="MOST ACTIVE DAY"
                    value={metrics.mostActiveDay?.name || '-'}
                    subValue={`${metrics.mostActiveDay?.count || 0} trades`}
                />
                <MetricCard
                    icon={<Calendar size={14} color="var(--text-secondary)" />}
                    label="LEAST ACTIVE DAY"
                    value={metrics.leastActiveDay?.name || '-'}
                    subValue={`${metrics.leastActiveDay?.count || 0} trades`}
                />

                {/* Wins (Cols 3-4) - Green accent */}
                <MetricCard
                    icon={<Calendar size={14} color="var(--accent)" />}
                    label="MOST PROFITABLE DAY"
                    value={metrics.mostProfitableDay?.name || '-'}
                    subValue={`$${metrics.mostProfitableDay?.pnl?.toFixed(2) || '0.00'}`}
                    accentColor="var(--accent)"
                />
                <MetricCard
                    icon={<Calendar size={14} color="var(--accent)" />}
                    label="BEST DAY (WIN RATE)"
                    value={metrics.bestWinRateDay?.name || '-'}
                    subValue={`${metrics.bestWinRateDay?.rate?.toFixed(0) || 0}% win rate`}
                    accentColor="var(--accent)"
                />

                {/* Losses (Cols 5-6) - Red accent */}
                <MetricCard
                    icon={<Calendar size={14} color="var(--danger)" />}
                    label="LEAST PROFITABLE DAY"
                    value={metrics.leastProfitableDay?.name || '-'}
                    subValue={`$${metrics.leastProfitableDay?.pnl?.toFixed(2) || '0.00'}`}
                    accentColor="var(--danger)"
                />
                <MetricCard
                    icon={<Calendar size={14} color="var(--danger)" />}
                    label="WORST DAY (LOSS RATE)"
                    value={metrics.worstLossRateDay?.name || '-'}
                    subValue={`${metrics.worstLossRateDay?.rate?.toFixed(0) || 0}% loss rate`}
                    accentColor="var(--danger)"
                />
            </div>

            {/* Row 2: Duration Metrics */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '16px'
            }}>
                {/* General (Cols 1-2) */}
                <MetricCard
                    icon={<Clock size={14} color="var(--text-secondary)" />}
                    label="AVG TRADE DURATION"
                    value={metrics.avgTradeDuration}
                />
                <MetricCard
                    icon={<Clock size={14} color="var(--text-secondary)" />}
                    label="LONGEST TRADE DURATION"
                    value={metrics.longestTradeDuration}
                />

                {/* Wins (Cols 3-4) - Green accent */}
                <MetricCard
                    icon={<Clock size={14} color="var(--accent)" />}
                    label="AVG WIN DURATION"
                    value={metrics.avgWinDuration}
                    accentColor="var(--accent)"
                />
                <MetricCard
                    icon={<Clock size={14} color="var(--accent)" />}
                    label="MEDIAN WIN DURATION"
                    value={metrics.medianWinDuration}
                    accentColor="var(--accent)"
                />

                {/* Losses (Cols 5-6) - Red accent */}
                <MetricCard
                    icon={<Clock size={14} color="var(--danger)" />}
                    label="AVG LOSS DURATION"
                    value={metrics.avgLossDuration}
                    accentColor="var(--danger)"
                />
                <MetricCard
                    icon={<Clock size={14} color="var(--danger)" />}
                    label="MEDIAN LOSS DURATION"
                    value={metrics.medianLossDuration}
                    accentColor="var(--danger)"
                />
            </div>
        </div>
    );
}
