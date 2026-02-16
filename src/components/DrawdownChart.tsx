
import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trade } from '../types';

interface DrawdownChartProps {
    trades: Trade[];
}

export function DrawdownChart({ trades }: DrawdownChartProps) {
    if (trades.length === 0) return null;

    const data = useMemo(() => {
        // Sort trades by entryDateTime if needed for cumulative calculations,
        // but for drawdown based on trade sequence, the order in the array is usually sufficient.
        // The original code had a sort, but the drawdown calculation below assumes the input `trades` array order.
        // If sorting is truly needed, it should be applied before the map.
        // For now, I'll assume the input `trades` array is already in the desired order for drawdown calculation.

        let maxPeak = -Infinity;
        let equity = 0;
        return trades.map((t, i) => {
            equity += (t.pnl || 0);
            if (equity > maxPeak) maxPeak = equity;
            const drawdown = equity - maxPeak;
            return { trade: i + 1, drawdown };
        });
    }, [trades]);

    // Only show if there is actually some drawdown or trades?
    // If all trades are positive, drawdown is 0. 

    return (
        <div className="card" style={{ height: '300px', padding: '16px', display: 'flex', flexDirection: 'column', background: 'rgba(24, 24, 27, 0.4)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Drawdown from Peak</h4>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <defs>
                        <linearGradient id="colorDrawdown" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.5} />
                    <XAxis
                        dataKey="trade"
                        stroke="#71717a"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#71717a"
                        fontSize={10}
                        tickFormatter={(val) => `-$${Math.abs(val)}`}
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
                        cursor={{ stroke: '#3f3f46', strokeWidth: 1 }}
                        formatter={(val: number | undefined) => [`-$${Math.abs(val || 0).toFixed(2)}`, 'Drawdown']}
                        labelFormatter={(label) => `Trade #${label}`}
                    />
                    <Area
                        type="monotone"
                        dataKey="drawdown"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fill="url(#colorDrawdown)"
                        animationDuration={1000}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
