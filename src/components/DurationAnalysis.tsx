
import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Trade } from '../types';

interface DurationAnalysisProps {
    trades: Trade[];
}

// 11 bucket definitions
const DURATION_BUCKETS = [
    { label: '<15s', min: 0, max: 15 },
    { label: '15-30s', min: 15, max: 30 },
    { label: '30s-1m', min: 30, max: 60 },
    { label: '1-2m', min: 60, max: 120 },
    { label: '2-5m', min: 120, max: 300 },
    { label: '5-10m', min: 300, max: 600 },
    { label: '10-30m', min: 600, max: 1800 },
    { label: '30m-1h', min: 1800, max: 3600 },
    { label: '1-2h', min: 3600, max: 7200 },
    { label: '2-4h', min: 7200, max: 14400 },
    { label: '4h+', min: 14400, max: Infinity },
];

type ViewMode = 'volume' | 'performance';

export function DurationAnalysis({ trades }: DurationAnalysisProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('volume');

    const data = useMemo(() => {
        const buckets = DURATION_BUCKETS.map(b => ({
            ...b,
            count: 0,
            contracts: 0,
            wins: 0,
            totalPnL: 0
        }));

        trades.forEach(t => {
            const sec = t.durationSeconds || 0;
            const bucket = buckets.find(b => sec >= b.min && sec < b.max);
            if (bucket) {
                bucket.count++;
                bucket.contracts += t.contracts || 1;
                bucket.totalPnL += t.pnl || 0;
                if ((t.pnl || 0) > 0) bucket.wins++;
            }
        });

        return buckets.map(b => ({
            name: b.label,
            count: b.count,
            contracts: b.contracts,
            winRate: b.count > 0 ? (b.wins / b.count) * 100 : 0,
            expectancy: b.count > 0 ? b.totalPnL / b.count : 0
        }));
    }, [trades]);

    if (trades.length === 0) return null;

    return (
        <div className="card" style={{ padding: '16px', height: '340px', display: 'flex', flexDirection: 'column' }}>
            {/* Header with Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0 }}>Duration Analysis</h4>
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                    padding: '3px'
                }}>
                    <button
                        onClick={() => setViewMode('volume')}
                        style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            background: viewMode === 'volume' ? 'var(--accent)' : 'transparent',
                            color: viewMode === 'volume' ? '#000' : 'var(--text-secondary)',
                            fontWeight: viewMode === 'volume' ? 600 : 400,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Volume
                    </button>
                    <button
                        onClick={() => setViewMode('performance')}
                        style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            background: viewMode === 'performance' ? 'var(--accent)' : 'transparent',
                            color: viewMode === 'performance' ? '#000' : 'var(--text-secondary)',
                            fontWeight: viewMode === 'performance' ? 600 : 400,
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Performance
                    </button>
                </div>
            </div>

            {/* Charts Container */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
                {viewMode === 'volume' ? (
                    <>
                        {/* Trade Count Chart */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="input-label" style={{ textAlign: 'center', marginBottom: '8px' }}>Trade Count</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} layout="vertical" margin={{ left: 5, right: 10 }}>
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={55}
                                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                                        interval={0}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                        cursor={{ fill: 'var(--bg-tertiary)' }}
                                        formatter={(value: number) => [`${value} trades`, 'Count']}
                                    />
                                    <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#8884d8' : 'var(--bg-tertiary)'} fillOpacity={0.7} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Contract Amount Chart */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="input-label" style={{ textAlign: 'center', marginBottom: '8px' }}>Total Contracts</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} layout="vertical" margin={{ left: 5, right: 10 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                        cursor={{ fill: 'var(--bg-tertiary)' }}
                                        formatter={(value: number) => [`${value} contracts`, 'Contracts']}
                                    />
                                    <Bar dataKey="contracts" fill="#82ca9d" radius={[0, 4, 4, 0]}>
                                        {data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.contracts > 0 ? '#82ca9d' : 'var(--bg-tertiary)'} fillOpacity={0.7} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Win Rate Chart */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="input-label" style={{ textAlign: 'center', marginBottom: '8px' }}>Win Rate %</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} layout="vertical" margin={{ left: 5, right: 10 }}>
                                    <XAxis type="number" domain={[0, 100]} hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        width={55}
                                        tick={{ fontSize: 9, fill: 'var(--text-secondary)' }}
                                        interval={0}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                        cursor={{ fill: 'var(--bg-tertiary)' }}
                                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Win Rate']}
                                    />
                                    <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                                        {data.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.count > 0 ? (entry.winRate >= 50 ? 'var(--accent)' : 'var(--danger)') : 'var(--bg-tertiary)'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Expectancy Chart */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span className="input-label" style={{ textAlign: 'center', marginBottom: '8px' }}>Expectancy ($)</span>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data} layout="vertical" margin={{ left: 5, right: 10 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 9, fill: 'var(--text-secondary)' }} hide />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                        cursor={{ fill: 'var(--bg-tertiary)' }}
                                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Expectancy']}
                                    />
                                    <Bar dataKey="expectancy" radius={[0, 4, 4, 0]}>
                                        {data.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.count > 0 ? (entry.expectancy >= 0 ? 'var(--accent)' : 'var(--danger)') : 'var(--bg-tertiary)'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
