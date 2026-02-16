import React, { useMemo, useState, useEffect } from 'react';
import { Trade, BehavioralThresholds } from '../../types';
import { AlertTriangle, Clock, TrendingUp, Shield } from 'lucide-react';

interface BehavioralPatternsProps {
    trades: Trade[];
}

interface BehavioralIncident {
    type: 'revenge' | 'fomo' | 'overtrading';
    timestamp: string;
    description: string;
    tradeIds: string[];
    severity: 'low' | 'medium' | 'high';
}

const DEFAULT_THRESHOLDS: BehavioralThresholds = {
    fomoVelocityTrades: 3,
    fomoVelocityWindow: 2,
    revengeWindow: 5,
    timingMode: 'intra-day',
    maxIntervalMinutes: 120
};

export function BehavioralPatterns({ trades }: BehavioralPatternsProps) {
    const [thresholdsMap, setThresholdsMap] = useState<Record<string, BehavioralThresholds>>({});

    useEffect(() => {
        const load = async () => {
            try {
                const data = await window.electronAPI.settings.get('behavioral_thresholds');
                if (data) setThresholdsMap(data);
            } catch (e) { console.error(e); }
        };
        load();
    }, []);

    const analysis = useMemo(() => {
        if (trades.length < 2) return null;

        // Sort trades by entry time
        const sortedTrades = [...trades]
            .filter(t => t.entryDateTime)
            .sort((a, b) => new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime());

        const incidents: BehavioralIncident[] = [];
        let totalTimeBetweenTrades = 0;
        let tradeIntervals: number[] = [];

        // Analyze consecutive trades
        for (let i = 1; i < sortedTrades.length; i++) {
            const prevTrade = sortedTrades[i - 1];
            const currTrade = sortedTrades[i];

            // Get thresholds for current trade's account
            const thresholds = (currTrade.accountId && thresholdsMap[currTrade.accountId])
                ? thresholdsMap[currTrade.accountId]
                : DEFAULT_THRESHOLDS;

            const prevTime = new Date(prevTrade.exitTime || prevTrade.entryDateTime).getTime();
            const currTime = new Date(currTrade.entryDateTime).getTime();
            const timeBetween = (currTime - prevTime) / 1000 / 60; // minutes

            const prevDay = new Date(prevTrade.entryDateTime).toDateString();
            const currDay = new Date(currTrade.entryDateTime).toDateString();
            const sameDay = prevDay === currDay;

            // Smart logic:
            // 1. If intra-day mode, ONLY count same-day intervals
            // 2. Regardless of mode, SKIP intervals longer than maxIntervalMinutes (Break detection)
            const isBreak = timeBetween > thresholds.maxIntervalMinutes;
            const shouldCount = (thresholds.timingMode === 'continuous' || sameDay) && !isBreak;

            if (shouldCount && timeBetween > 0) {
                tradeIntervals.push(timeBetween);
                totalTimeBetweenTrades += timeBetween;
            }
            // Revenge Trading Detection
            // Previous trade was a loss, next trade within Window (same market)
            const prevLoss = (prevTrade.pnl || 0) < 0;
            const largerSize = (currTrade.contracts || 1) > (prevTrade.contracts || 1);
            const inRevengeWindow = timeBetween < thresholds.revengeWindow;
            const sameMarket = prevTrade.market === currTrade.market;

            if (prevLoss && largerSize && inRevengeWindow && sameMarket) {
                incidents.push({
                    type: 'revenge',
                    timestamp: currTrade.entryDateTime,
                    description: `After losing $${Math.abs(prevTrade.pnl || 0).toFixed(2)} on ${prevTrade.market}, you entered again within ${timeBetween.toFixed(1)} minutes (Threshold: <${thresholds.revengeWindow}m) with larger size.`,
                    tradeIds: [prevTrade.id, currTrade.id],
                    severity: timeBetween < (thresholds.revengeWindow / 3) ? 'high' : 'medium'
                });
            }

            // FOMO Detection - Velocity check
            // Check if user executed X trades within Y minutes
            const fomoCount = thresholds.fomoVelocityTrades; // e.g. 3
            const fomoWindow = thresholds.fomoVelocityWindow; // e.g. 2 mins

            if (i >= fomoCount - 1) {
                // Check the trade (fomoCount - 1) places back
                const startWindowTrade = sortedTrades[i - fomoCount + 1];
                const startWindowTime = new Date(startWindowTrade.entryDateTime).getTime(); // Note: Using entry time for start of window

                // Diff between first trade's entry and current trade's entry
                // (Velocity is usually Entry-to-Entry frequency)
                const windowDuration = (currTime - startWindowTime) / 1000 / 60;

                if (windowDuration <= fomoWindow) {
                    // Get all IDs in this window
                    const ids = [];
                    for (let k = 0; k < fomoCount; k++) ids.push(sortedTrades[i - k].id);

                    // Avoid duplicate incidents? 
                    // If trade i triggers it, and trade i+1 triggers it, we typically flag both or group them.
                    // For now, simpler to push incident per trigger trade, user can see the cluster.
                    // BUT duplicates might flood.
                    // Check if the previous trade ALREADY triggered a FOMO incident that covers this group?
                    // Optimization: If incidents.last is fomo and close, maybe update it? 
                    // Let's keep distinct incidents for now, simple is robust.

                    // Actually, let's only flag if we haven't flagged this 'burst' recently? 
                    // Or just flag it. The UI groups them visually.
                    incidents.push({
                        type: 'fomo',
                        timestamp: currTrade.entryDateTime,
                        description: `Rapid-fire: ${fomoCount} trades within ${windowDuration.toFixed(1)} minutes (Threshold: ${fomoCount} in ${fomoWindow}m)`,
                        tradeIds: ids,
                        severity: 'high'
                    });
                }
            }
        }

        // Overtrading Detection - More than 10 trades in a single day
        const tradesByDay: { [date: string]: Trade[] } = {};
        sortedTrades.forEach(t => {
            const date = new Date(t.entryDateTime).toLocaleDateString();
            if (!tradesByDay[date]) tradesByDay[date] = [];
            tradesByDay[date].push(t);
        });

        Object.entries(tradesByDay).forEach(([date, dayTrades]) => {
            if (dayTrades.length > 10) {
                incidents.push({
                    type: 'overtrading',
                    timestamp: dayTrades[0].entryDateTime,
                    description: `${dayTrades.length} trades on ${date}. Consider if all were high-quality setups.`,
                    tradeIds: dayTrades.map(t => t.id),
                    severity: dayTrades.length > 15 ? 'high' : 'medium'
                });
            }
        });

        // Calculate discipline score
        const avgTimeBetween = tradeIntervals.length > 0
            ? tradeIntervals.reduce((a, b) => a + b, 0) / tradeIntervals.length
            : 0;

        // Score based on: 
        // - Fewer incidents = better
        // - Longer average time between trades = better (up to a point)
        // - Consistent position sizing = better
        const incidentPenalty = Math.min(incidents.length * 10, 50);
        const timingScore = Math.min(avgTimeBetween / 30 * 20, 20); // Max 20 points for 30+ min avg

        const sizes = sortedTrades.map(t => t.contracts || 1);
        const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
        const sizeVariance = sizes.reduce((a, b) => a + Math.pow(b - avgSize, 2), 0) / sizes.length;
        const consistencyScore = Math.max(30 - sizeVariance * 5, 0); // Max 30 points for consistent sizing

        const disciplineScore = Math.round(Math.max(0, Math.min(100, 50 + timingScore + consistencyScore - incidentPenalty)));

        return {
            incidents,
            disciplineScore,
            avgTimeBetweenTrades: avgTimeBetween,
            totalTrades: sortedTrades.length,
            revengeCount: incidents.filter(i => i.type === 'revenge').length,
            fomoCount: incidents.filter(i => i.type === 'fomo').length,
            overtradingDays: incidents.filter(i => i.type === 'overtrading').length
        };
    }, [trades, thresholdsMap]);

    if (!analysis || trades.length < 2) {
        return (
            <div style={{ padding: '60px', textAlign: 'center' }}>
                <Shield size={64} style={{ opacity: 0.1, marginBottom: '16px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>
                    Need at least 2 trades to analyze behavioral patterns.
                </p>
            </div>
        );
    }

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'var(--accent)';
        if (score >= 60) return '#eab308';
        return 'var(--danger)';
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'var(--danger)';
            case 'medium': return '#eab308';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Discipline Score
                    </div>
                    <div style={{ fontSize: '3rem', fontWeight: '900', color: getScoreColor(analysis.disciplineScore), lineHeight: 1 }}>
                        {analysis.disciplineScore}
                    </div>
                </div>
                <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Revenge Trades
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: analysis.revengeCount > 0 ? 'var(--danger)' : 'var(--accent)' }}>
                        {analysis.revengeCount}
                    </div>
                </div>
                <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        FOMO Entries
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: analysis.fomoCount > 0 ? 'var(--danger)' : 'var(--accent)' }}>
                        {analysis.fomoCount}
                    </div>
                </div>
                <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Avg Time Between
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                        {analysis.avgTimeBetweenTrades > 0
                            ? `${analysis.avgTimeBetweenTrades.toFixed(0)}m`
                            : '--'}
                    </div>
                </div>
            </div>

            {/* Incidents List */}
            <div className="card" style={{ padding: '24px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '24px' }}>
                    <AlertTriangle size={20} color="var(--danger)" />
                    Behavioral Incidents ({analysis.incidents.length})
                </h3>

                {analysis.incidents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', opacity: 0.5 }}>
                        <Shield size={48} style={{ marginBottom: '12px' }} />
                        <p>No behavioral issues detected. Great discipline!</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {analysis.incidents.map((incident, idx) => (
                            <div
                                key={idx}
                                style={{
                                    padding: '16px',
                                    borderRadius: '8px',
                                    backgroundColor: `${getSeverityColor(incident.severity)}10`,
                                    border: `1px solid ${getSeverityColor(incident.severity)}30`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {incident.type === 'revenge' && <AlertTriangle size={16} color={getSeverityColor(incident.severity)} />}
                                        {incident.type === 'fomo' && <TrendingUp size={16} color={getSeverityColor(incident.severity)} />}
                                        {incident.type === 'overtrading' && <Clock size={16} color={getSeverityColor(incident.severity)} />}
                                        <span style={{ fontWeight: 'bold', textTransform: 'capitalize', color: getSeverityColor(incident.severity) }}>
                                            {incident.type === 'fomo' ? 'FOMO' : incident.type.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '12px', opacity: 0.5 }}>
                                        {new Date(incident.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                    {incident.description}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
