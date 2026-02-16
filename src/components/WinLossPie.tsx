
import { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, Sector } from 'recharts';
import { Trade } from '../types';

const COLORS = {
    long: '#22c55e',   // Green for Long
    short: '#ef4444',  // Red for Short
    win: 'var(--accent)',
    loss: 'var(--danger)'
};

interface DirectionalStats {
    count: number;
    netPnL: number;
    winRate: number;
    expectancy: number;
    profitFactor: number;
    avgRR: number;
}

function computeDirectionStats(trades: Trade[], direction: 'Long' | 'Short'): DirectionalStats {
    const filtered = trades.filter(t => t.direction === direction);
    const wins = filtered.filter(t => (t.pnl || 0) > 0);
    const losses = filtered.filter(t => (t.pnl || 0) < 0);
    const totalPnL = filtered.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const winPnL = wins.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const lossPnL = Math.abs(losses.reduce((acc, t) => acc + (t.pnl || 0), 0));

    return {
        count: filtered.length,
        netPnL: totalPnL,
        winRate: filtered.length > 0 ? (wins.length / filtered.length) * 100 : 0,
        expectancy: filtered.length > 0 ? totalPnL / filtered.length : 0,
        profitFactor: lossPnL > 0 ? winPnL / lossPnL : winPnL > 0 ? Infinity : 0,
        avgRR: filtered.filter(t => t.achievedR).reduce((acc, t) => acc + (t.achievedR || 0), 0) / (filtered.filter(t => t.achievedR).length || 1)
    };
}

// Custom active shape for hover effect
const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, netPnL } = props;

    return (
        <g>
            {/* Expanded segment */}
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius - 2}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
                style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.5))' }}
            />
            {/* Center text - Direction */}
            <text x={cx} y={cy - 12} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={600}>
                {payload.name}
            </text>
            {/* Center text - Net PnL */}
            <text
                x={cx}
                y={cy + 12}
                textAnchor="middle"
                fill={netPnL >= 0 ? COLORS.win : COLORS.loss}
                fontSize={18}
                fontWeight={700}
            >
                ${netPnL >= 0 ? '+' : ''}{netPnL.toFixed(2)}
            </text>
        </g>
    );
};

export function WinLossPie({ trades }: { trades: Trade[] }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const longs = trades.filter(t => t.direction === 'Long').length;
    const shorts = trades.filter(t => t.direction === 'Short').length;

    const longStats = useMemo(() => computeDirectionStats(trades, 'Long'), [trades]);
    const shortStats = useMemo(() => computeDirectionStats(trades, 'Short'), [trades]);

    const data = [
        { name: 'Long', value: longs, stats: longStats, color: COLORS.long },
        { name: 'Short', value: shorts, stats: shortStats, color: COLORS.short },
    ];

    // Default center display (when not hovering)
    const wins = trades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(0) : '0';

    if (trades.length === 0) return null;

    const hoveredData = activeIndex !== null ? data[activeIndex] : null;

    return (
        <div className="card" style={{ height: '300px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '4px' }}>
                <h4 style={{ margin: 0, textAlign: 'center' }}>Directional Performance</h4>
            </div>

            <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            startAngle={90}
                            endAngle={-270}
                            paddingAngle={3}
                            dataKey="value"
                            // @ts-ignore
                            activeIndex={activeIndex ?? undefined}
                            activeShape={(props: any) => renderActiveShape({ ...props, netPnL: hoveredData?.stats.netPnL || 0 })}
                            onMouseEnter={(_, index) => setActiveIndex(index)}
                            onMouseLeave={() => setActiveIndex(null)}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    stroke="none"
                                    style={{ cursor: 'pointer' }}
                                />
                            ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={24} iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                </ResponsiveContainer>

                {/* Default Center Label (when not hovering) */}
                {activeIndex === null && (
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        pointerEvents: 'none',
                        // Offset slightly up to account for the legend taking up bottom space
                        marginTop: '-12px'
                    }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Win Rate</div>
                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{winRate}%</div>
                    </div>
                )}
            </div>

            {/* Floating Tooltip */}
            {hoveredData && (
                <div style={{
                    position: 'absolute',
                    top: '16px',
                    ...(hoveredData.name === 'Short' ? { left: '16px' } : { right: '16px' }),
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    minWidth: '160px',
                    zIndex: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    animation: 'fadeIn 0.15s ease'
                }}>
                    <div style={{
                        fontWeight: 600,
                        marginBottom: '8px',
                        color: hoveredData.color,
                        borderBottom: `2px solid ${hoveredData.color}`,
                        paddingBottom: '6px'
                    }}>
                        {hoveredData.name} Trades
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Count</span>
                            <span>{hoveredData.stats.count}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Win Rate</span>
                            <span>{hoveredData.stats.winRate.toFixed(1)}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Expectancy</span>
                            <span style={{ color: hoveredData.stats.expectancy >= 0 ? COLORS.win : COLORS.loss }}>
                                ${hoveredData.stats.expectancy.toFixed(2)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Profit Factor</span>
                            <span>{hoveredData.stats.profitFactor === Infinity ? '∞' : hoveredData.stats.profitFactor.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Avg RR</span>
                            <span>{hoveredData.stats.avgRR.toFixed(2)}R</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
