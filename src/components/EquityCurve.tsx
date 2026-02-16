
import { useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Trade } from '../types';

interface EquityCurveProps {
    trades: Trade[];
    height?: number | string;
    style?: React.CSSProperties;
}

export function EquityCurve({ trades, height = 300, style }: EquityCurveProps) {
    const chartData = useMemo(() => {
        const sorted = [...trades].sort((a, b) =>
            new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime()
        );

        let runningPnL = 0;
        const data = sorted.map((trade, index) => {
            runningPnL += (trade.pnl || 0);
            return {
                index: index + 1, // Start from 1 since 0 is 'Start'
                date: new Date(trade.entryDateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                pnl: runningPnL
            };
        });

        // Add starting point
        if (data.length > 0) {
            data.unshift({ index: 0, date: 'Start', pnl: 0 });
        }

        return data;
    }, [trades]);

    if (trades.length === 0) {
        return (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--text-secondary)' }}>
                No trades to display
            </div>
        );
    }

    const finalPnL = chartData[chartData.length - 1]?.pnl || 0;
    const lineColor = finalPnL >= 0 ? '#22c55e' : '#ef4444';
    const gradientId = finalPnL >= 0 ? 'colorGreen' : 'colorRed';

    return (
        <div className="card" style={{ height: typeof height === 'number' ? `${height}px` : height, padding: '16px', flexShrink: 0, ...style, background: 'rgba(24, 24, 27, 0.4)' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Equity Curve</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: finalPnL >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                        {finalPnL >= 0 ? '+' : ''}${finalPnL.toFixed(2)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.6 }}>
                        {trades.length} trades
                    </span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} opacity={0.5} />
                    <XAxis
                        dataKey="index"
                        stroke="#71717a"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={30}
                    />
                    <YAxis
                        stroke="#71717a"
                        fontSize={10}
                        tickFormatter={(value) => `$${value}`}
                        tickLine={false}
                        axisLine={false}
                        orientation="left"
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
                        formatter={(value: number | undefined) => [`$${(value || 0).toFixed(2)}`, 'Equity']}
                        labelFormatter={(index) => {
                            const item = chartData.find(d => d.index === index);
                            return item ? `${item.date} (Trade #${item.index})` : '';
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="pnl"
                        stroke={lineColor}
                        strokeWidth={2}
                        fill={`url(#${gradientId})`}
                        animationDuration={1000}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
