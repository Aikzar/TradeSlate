import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trade } from '../types';

interface RDistributionChartProps {
    trades: Trade[];
    beRange?: { min: number; max: number };
}

export function RDistributionChart({ trades, beRange }: RDistributionChartProps) {
    const data = useMemo(() => {
        // Init bins
        // Bins: <-1, -1 to <0, 0 to <1, 1 to <2, 2 to <3, 3+
        const bins = [
            { label: '< -1R', min: -Infinity, max: -1, count: 0, fill: '#ef4444' }, // Big Losers
            { label: '-1R to 0R', min: -1, max: 0, count: 0, fill: '#ef4444' },    // Standard Losers
            { label: '0R to 1R', min: 0, max: 1, count: 0, fill: '#22c55e' },     // Small Winners
            { label: '1R to 2R', min: 1, max: 2, count: 0, fill: '#22c55e' },     // Standard Winners
            { label: '2R to 3R', min: 2, max: 3, count: 0, fill: '#22c55e' },     // Big Winners
            { label: '3R+', min: 3, max: Infinity, count: 0, fill: '#22c55e' }    // Home Runs
        ];

        trades.forEach(t => {
            // Calculate Achieved R: Net PnL / Initial Risk
            // Exclude if Risk is 0 or null
            if (!t.risk || t.risk === 0) return;

            const r = (t.pnl || 0) / t.risk;

            // Filter out Break-Even trades if range is provided
            if (beRange && r > beRange.min && r < beRange.max) return;

            // Find matching bin
            for (const bin of bins) {
                // Use >= min and < max logic, except for last bin which handles infinity
                if (r >= bin.min && r < bin.max) {
                    bin.count++;
                    break;
                }
            }
        });

        // Map to simple object array for Recharts
        return bins.map(b => ({
            name: b.label,
            count: b.count,
            fill: b.fill
        }));
    }, [trades]);

    if (!trades || trades.length === 0) return null;

    return (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.5} />
                    <XAxis
                        dataKey="name"
                        stroke="#71717a"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                    />
                    <YAxis
                        stroke="#71717a"
                        fontSize={10}
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
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
