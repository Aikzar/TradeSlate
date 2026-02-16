
import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { Trade } from '../types';

interface HoldTimeScatterProps {
    trades: Trade[];
}

export function HoldTimeScatter({ trades }: HoldTimeScatterProps) {
    const data = useMemo(() => {
        return trades.map(t => {
            let durationMin = 0;
            if (t.exitTime) {
                const entry = new Date(t.entryDateTime).getTime();
                const exit = new Date(t.exitTime).getTime();
                durationMin = (exit - entry) / 1000 / 60;
            }

            // If duration calculation failed or missing, skip or default 0
            if (durationMin < 0) durationMin = 0;

            return {
                id: t.id,
                duration: parseFloat(durationMin.toFixed(1)),
                pnl: t.pnl || 0,
                win: (t.pnl || 0) > 0
            };
        }).filter(d => d.duration > 0 || d.pnl !== 0);
    }, [trades]);

    if (data.length === 0) return <div className="card text-center p-4 text-secondary">No data</div>;

    return (
        <div className="card" style={{ height: '300px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 16px 0' }}>Hold Time vs PnL</h4>
            <ResponsiveContainer width="100%" height="85%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis type="number" dataKey="duration" name="Duration" unit="m" stroke="#a1a1aa">
                        <Label value="Duration (min)" offset={-10} position="insideBottom" fill="#71717a" style={{ fontSize: '12px' }} />
                    </XAxis>
                    <YAxis type="number" dataKey="pnl" name="PnL" unit="$" stroke="#a1a1aa">
                        <Label value="PnL ($)" angle={-90} position="insideLeft" fill="#71717a" style={{ fontSize: '12px' }} />
                    </YAxis>
                    <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', color: 'var(--text-primary)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Scatter name="Wins" data={data.filter(d => d.win)} fill="#22c55e" shape="circle" />
                    <Scatter name="Losses" data={data.filter(d => !d.win)} fill="#ef4444" shape="square" />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}
