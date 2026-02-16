
import React, { useMemo } from 'react';
import { Trade } from '../types';
import { Trophy, TrendingDown, Clock, Calendar, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface InsightsGridProps {
    trades: Trade[];
}

export function InsightsGrid({ trades }: InsightsGridProps) {
    const insights = useMemo(() => {
        if (trades.length === 0) return null;

        const wins = trades.filter(t => (t.pnl || 0) > 0);
        const losses = trades.filter(t => (t.pnl || 0) < 0);

        // Best / Worst Trade
        const bestTrade = [...trades].sort((a, b) => (b.pnl || 0) - (a.pnl || 0))[0];
        const worstTrade = [...trades].sort((a, b) => (a.pnl || 0) - (b.pnl || 0))[0];

        // Durations
        const avgDuration = trades.reduce((acc, t) => acc + (t.durationSeconds || 0), 0) / trades.length;
        const avgWinDuration = wins.length ? wins.reduce((acc, t) => acc + (t.durationSeconds || 0), 0) / wins.length : 0;
        const avgLossDuration = losses.length ? losses.reduce((acc, t) => acc + (t.durationSeconds || 0), 0) / losses.length : 0;

        // Day Analysis
        const days: Record<string, { count: number; pnl: number }> = {};
        trades.forEach(t => {
            const day = new Date(t.entryDateTime).toLocaleDateString('en-US', { weekday: 'long' });
            if (!days[day]) days[day] = { count: 0, pnl: 0 };
            days[day].count++;
            days[day].pnl += (t.pnl || 0);
        });

        const dayEntries = Object.entries(days);
        const mostActiveDay = dayEntries.sort((a, b) => b[1].count - a[1].count)[0];
        const mostProfitableDay = dayEntries.sort((a, b) => b[1].pnl - a[1].pnl)[0];
        const leastProfitableDay = dayEntries.sort((a, b) => a[1].pnl - b[1].pnl)[0];

        // Format duration helper
        const formatDuration = (secs: number) => {
            if (secs < 60) return `${Math.round(secs)}s`;
            const mins = Math.floor(secs / 60);
            if (mins < 60) return `${mins}m ${Math.round(secs % 60)}s`;
            const hrs = Math.floor(mins / 60);
            return `${hrs}h ${mins % 60}m`;
        };

        return {
            bestTrade,
            worstTrade,
            avgDuration: formatDuration(avgDuration),
            avgWinDuration: formatDuration(avgWinDuration),
            avgLossDuration: formatDuration(avgLossDuration),
            mostActiveDay: mostActiveDay ? { name: mostActiveDay[0], ...mostActiveDay[1] } : null,
            mostProfitableDay: mostProfitableDay ? { name: mostProfitableDay[0], ...mostProfitableDay[1] } : null,
            leastProfitableDay: leastProfitableDay ? { name: leastProfitableDay[0], ...leastProfitableDay[1] } : null,
        };
    }, [trades]);

    if (!insights) return null;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>



            {/* Durations */}
            <InsightCard
                icon={<Clock size={18} color="var(--text-secondary)" />}
                label="Avg Trade Duration"
                value={insights.avgDuration}
            />
            <InsightCard
                icon={<Clock size={18} color="var(--accent)" />}
                label="Avg Win Duration"
                value={insights.avgWinDuration}
            />
            <InsightCard
                icon={<Clock size={18} color="var(--danger)" />}
                label="Avg Loss Duration"
                value={insights.avgLossDuration}
            />

            {/* Extreme Trades */}
            <InsightCard
                icon={<Trophy size={18} color="var(--accent)" />}
                label="Best Trade"
                value={`$${insights.bestTrade.pnl?.toFixed(2)}`}
                subValue={`${insights.bestTrade.market} • ${new Date(insights.bestTrade.entryDateTime).toLocaleDateString()}`}
                valueColor="var(--accent)"
            />
            <InsightCard
                icon={<TrendingDown size={18} color="var(--danger)" />}
                label="Worst Trade"
                value={`$${insights.worstTrade.pnl?.toFixed(2)}`}
                subValue={`${insights.worstTrade.market} • ${new Date(insights.worstTrade.entryDateTime).toLocaleDateString()}`}
                valueColor="var(--danger)"
            />
        </div>
    );
}

function InsightCard({ icon, label, value, subValue, valueColor }: { icon: React.ReactNode, label: string, value: string, subValue?: string, valueColor?: string }) {
    return (
        <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                {icon}
                <span className="input-label" style={{ fontSize: '12px' }}>{label}</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: valueColor || 'var(--text-primary)' }}>
                {value}
            </div>
            {subValue && (
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {subValue}
                </div>
            )}
        </div>
    );
}
