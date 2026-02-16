import { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { Trade } from '../types';

export function PnLByHour({ trades }: { trades: Trade[] }) {
    const [viewMode, setViewMode] = useState<'Total' | 'Avg' | 'WinRate'>('Total');

    const hourlyData = useMemo(() => {
        const hours = Array(24).fill(0).map((_, i) => ({
            hour: i,
            pnl: 0,
            count: 0,
            wins: 0,
            avg: 0,
            winRate: 0
        }));

        trades.forEach(t => {
            const date = new Date(t.entryDateTime);
            const h = date.getHours();
            hours[h].pnl += (t.pnl || 0);
            if ((t.pnl || 0) > 0) hours[h].wins++;
            hours[h].count++;
        });

        // Calculate averages and win rates
        hours.forEach(h => {
            h.avg = h.count > 0 ? h.pnl / h.count : 0;
            h.winRate = h.count > 0 ? (h.wins / h.count) * 100 : 0;
        });

        return hours.filter(h => h.count > 0);
    }, [trades]);

    if (trades.length === 0) return null;

    return (
        <div className="card" style={{ height: '300px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative', background: 'rgba(24, 24, 27, 0.4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>PnL by Hour</h4>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '2px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setViewMode('Total')}
                        style={{
                            border: 'none',
                            background: viewMode === 'Total' ? 'var(--accent)' : 'transparent',
                            color: viewMode === 'Total' ? '#000' : 'var(--text-secondary)',
                            padding: '4px 8px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Total
                    </button>
                    <button
                        onClick={() => setViewMode('Avg')}
                        style={{
                            border: 'none',
                            background: viewMode === 'Avg' ? 'var(--accent)' : 'transparent',
                            color: viewMode === 'Avg' ? '#000' : 'var(--text-secondary)',
                            padding: '4px 8px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Avg
                    </button>
                    <button
                        onClick={() => setViewMode('WinRate')}
                        style={{
                            border: 'none',
                            background: viewMode === 'WinRate' ? 'var(--accent)' : 'transparent',
                            color: viewMode === 'WinRate' ? '#000' : 'var(--text-secondary)',
                            padding: '4px 8px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        WR%
                    </button>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.5} />
                    <XAxis
                        dataKey="hour"
                        stroke="#71717a"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(h) => `${h}:00`}
                    />
                    <YAxis
                        stroke="#71717a"
                        fontSize={10}
                        tickFormatter={(val) => viewMode === 'WinRate' ? `${val}%` : `$${val}`}
                        tickLine={false}
                        axisLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            fontSize: '12px'
                        }}
                        itemStyle={{ color: 'var(--text-primary)', padding: '2px 0' }}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        formatter={(value: number | undefined) => [
                            viewMode === 'WinRate' ? `${(value || 0).toFixed(1)}%` : `$${(value || 0).toFixed(2)}`,
                            viewMode === 'Total' ? 'Total PnL' : viewMode === 'Avg' ? 'Avg PnL' : 'Win Rate'
                        ]}
                        labelFormatter={(label) => `${label}:00`}
                    />
                    <Bar
                        dataKey={viewMode === 'Total' ? 'pnl' : viewMode === 'Avg' ? 'avg' : 'winRate'}
                        radius={[4, 4, 0, 0]}
                    >
                        {hourlyData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={
                                    viewMode === 'WinRate'
                                        ? 'var(--accent)' // Win rate is always positive (0-100)
                                        : (viewMode === 'Total' ? entry.pnl : entry.avg) >= 0 ? 'var(--accent)' : 'var(--danger)'
                                }
                                opacity={0.8}
                            />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
