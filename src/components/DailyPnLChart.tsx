
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trade } from '../types';

interface DailyPnLChartProps {
    trades: Trade[];
}

export function DailyPnLChart({ trades }: DailyPnLChartProps) {
    const data = useMemo(() => {
        const pnlByDate: Record<string, number> = {};

        trades.forEach(t => {
            const date = new Date(t.entryDateTime).toLocaleDateString('en-CA'); // YYYY-MM-DD
            pnlByDate[date] = (pnlByDate[date] || 0) + (t.pnl || 0);
        });

        return Object.entries(pnlByDate)
            .map(([date, pnl]) => ({ date, pnl }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [trades]);

    if (data.length === 0) return <div className="card text-center p-4 text-secondary">No data</div>;

    return (
        <div className="card" style={{ height: '300px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>Daily PnL</h4>
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} tickFormatter={str => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} />
                    <YAxis stroke="#a1a1aa" fontSize={12} tickFormatter={(val) => `$${val}`} />
                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                        formatter={(val: number | undefined) => [`$${(val || 0).toFixed(2)}`, 'PnL']}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Bar dataKey="pnl">
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
