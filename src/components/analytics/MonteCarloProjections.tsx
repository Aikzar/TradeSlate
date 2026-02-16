import React, { useMemo, useState } from 'react';
import { Trade } from '../../types';
import { TrendingUp, RefreshCw, Target } from 'lucide-react';

interface MonteCarloProjectionsProps {
    trades: Trade[];
}

interface SimulationResult {
    percentile5: number[];
    percentile25: number[];
    percentile50: number[];
    percentile75: number[];
    percentile95: number[];
}

export function MonteCarloProjections({ trades }: MonteCarloProjectionsProps) {
    const [startingCapital, setStartingCapital] = useState(10000);
    const [riskPerTrade, setRiskPerTrade] = useState(1); // Percentage
    const [tradesPerMonth, setTradesPerMonth] = useState(20);
    const [months, setMonths] = useState(6);
    const [simRunning, setSimRunning] = useState(false);

    const stats = useMemo(() => {
        // Filter for closed trades (including Win/Loss statuses)
        const closedTrades = trades.filter(t =>
            t.pnl !== undefined &&
            t.status !== 'OPEN' &&
            t.status !== 'SKIPPED'
        );

        if (closedTrades.length < 10) return null;

        const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
        const losses = closedTrades.filter(t => (t.pnl || 0) < 0);

        const winRate = wins.length / closedTrades.length;
        const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + (t.pnl || 0), 0) / wins.length : 0;
        const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, t) => a + (t.pnl || 0), 0) / losses.length) : 0;

        // Calculate average R of winning trades only (Avg Win RR)
        const winningRTrades = wins.filter(t => t.achievedR !== undefined);
        const avgWinRR = winningRTrades.length > 0
            ? winningRTrades.reduce((a, t) => a + (t.achievedR || 0), 0) / winningRTrades.length
            : (avgWin / avgLoss) || 1;

        // Sample R distribution: use actual achievedR from all trades for variety,
        // but the simulation fallback will use avgWinRR.
        const rTrades = closedTrades.filter(t => t.achievedR !== undefined);
        const rDistribution = rTrades.length >= 10
            ? rTrades.map(t => t.achievedR || 0)
            : closedTrades.map(t => {
                if ((t.pnl || 0) >= 0) return avgWinRR;
                return -1;
            });

        return {
            winRate,
            avgWin,
            avgLoss,
            avgWinRR,
            rDistribution,
            totalTrades: closedTrades.length
        };
    }, [trades]);

    const simulation = useMemo(() => {
        if (!stats || simRunning) return null;

        const numSimulations = 1000;
        const totalTrades = tradesPerMonth * months;
        const riskAmount = startingCapital * (riskPerTrade / 100);

        // Run Monte Carlo simulation
        const equityCurves: number[][] = [];

        for (let sim = 0; sim < numSimulations; sim++) {
            let equity = startingCapital;
            const curve = [equity];

            for (let trade = 0; trade < totalTrades; trade++) {
                // Random outcome based on win rate
                const isWin = Math.random() < stats.winRate;

                // Sample from R distribution or use average
                let rMultiple: number;
                if (stats.rDistribution.length > 0) {
                    // Filter distribution by win/loss status for better sampling?
                    // For now keeping simple: random sample from distribution.
                    // However, if we want to honor the "isWin" strictly using average:
                    const filteredR = isWin
                        ? stats.rDistribution.filter(r => r > 0)
                        : stats.rDistribution.filter(r => r <= 0);

                    rMultiple = filteredR.length > 0
                        ? filteredR[Math.floor(Math.random() * filteredR.length)]
                        : (isWin ? stats.avgWinRR : -1);
                } else {
                    rMultiple = isWin ? stats.avgWinRR : -1;
                }

                // Calculate P&L
                const pnl = riskAmount * rMultiple;
                equity = Math.max(0, equity + pnl);
                curve.push(equity);
            }

            equityCurves.push(curve);
        }

        // Calculate percentiles at each trade point
        const percentile5: number[] = [];
        const percentile25: number[] = [];
        const percentile50: number[] = [];
        const percentile75: number[] = [];
        const percentile95: number[] = [];

        for (let i = 0; i <= totalTrades; i++) {
            const values = equityCurves.map(curve => curve[i]).sort((a, b) => a - b);
            percentile5.push(values[Math.floor(numSimulations * 0.05)]);
            percentile25.push(values[Math.floor(numSimulations * 0.25)]);
            percentile50.push(values[Math.floor(numSimulations * 0.50)]);
            percentile75.push(values[Math.floor(numSimulations * 0.75)]);
            percentile95.push(values[Math.floor(numSimulations * 0.95)]);
        }

        // Calculate final statistics
        const finalEquities = equityCurves.map(curve => curve[curve.length - 1]);
        const medianFinal = percentile50[percentile50.length - 1];
        const worstCase = percentile5[percentile5.length - 1];
        const bestCase = percentile95[percentile95.length - 1];
        const profitableSims = finalEquities.filter(e => e > startingCapital).length;
        const probabilityOfProfit = (profitableSims / numSimulations) * 100;

        // Max drawdown statistics
        const maxDrawdowns = equityCurves.map(curve => {
            let peak = curve[0];
            let maxDD = 0;
            for (const equity of curve) {
                if (equity > peak) peak = equity;
                const dd = (peak - equity) / peak;
                if (dd > maxDD) maxDD = dd;
            }
            return maxDD;
        });
        const avgMaxDrawdown = maxDrawdowns.reduce((a, b) => a + b, 0) / maxDrawdowns.length * 100;

        return {
            percentile5,
            percentile25,
            percentile50,
            percentile75,
            percentile95,
            medianFinal,
            worstCase,
            bestCase,
            probabilityOfProfit,
            avgMaxDrawdown,
            totalTrades
        };
    }, [stats, startingCapital, riskPerTrade, tradesPerMonth, months]);

    if (!stats) {
        return (
            <div style={{ padding: '60px', textAlign: 'center' }}>
                <TrendingUp size={64} style={{ opacity: 0.1, marginBottom: '16px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>
                    Need at least 10 closed trades with P&L data for Monte Carlo projections.
                </p>
            </div>
        );
    }

    // Simple chart rendering using SVG
    const renderChart = () => {
        if (!simulation) return null;

        const width = 800;
        const height = 300;
        const padding = { top: 20, right: 60, bottom: 40, left: 80 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const allValues = [
            ...simulation.percentile5,
            ...simulation.percentile95
        ];
        const minY = Math.min(...allValues) * 0.9;
        const maxY = Math.max(...allValues) * 1.1;

        const xScale = (i: number) => padding.left + (i / simulation.totalTrades) * chartWidth;
        const yScale = (v: number) => padding.top + (1 - (v - minY) / (maxY - minY)) * chartHeight;

        const createPath = (data: number[]) => {
            return data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`).join(' ');
        };

        return (
            <svg width={width} height={height} style={{ display: 'block', margin: '0 auto' }}>
                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map(pct => {
                    const y = padding.top + chartHeight * (1 - pct);
                    const value = minY + (maxY - minY) * pct;
                    return (
                        <g key={pct}>
                            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.1)" />
                            <text x={padding.left - 10} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="11">
                                ${(value / 1000).toFixed(0)}k
                            </text>
                        </g>
                    );
                })}

                {/* Confidence bands */}
                <path
                    d={`${createPath(simulation.percentile5)} L ${xScale(simulation.totalTrades)} ${yScale(simulation.percentile95[simulation.totalTrades])} ${simulation.percentile95.map((v, i) => `L ${xScale(simulation.totalTrades - i)} ${yScale(simulation.percentile95[simulation.totalTrades - i])}`).join(' ')} Z`}
                    fill="rgba(35, 134, 54, 0.1)"
                />
                <path
                    d={`${createPath(simulation.percentile25)} L ${xScale(simulation.totalTrades)} ${yScale(simulation.percentile75[simulation.totalTrades])} ${simulation.percentile75.map((v, i) => `L ${xScale(simulation.totalTrades - i)} ${yScale(simulation.percentile75[simulation.totalTrades - i])}`).join(' ')} Z`}
                    fill="rgba(35, 134, 54, 0.2)"
                />

                {/* Median line */}
                <path d={createPath(simulation.percentile50)} fill="none" stroke="var(--accent)" strokeWidth="2" />

                {/* Starting capital line */}
                <line
                    x1={padding.left}
                    y1={yScale(startingCapital)}
                    x2={width - padding.right}
                    y2={yScale(startingCapital)}
                    stroke="rgba(255,255,255,0.3)"
                    strokeDasharray="4,4"
                />

                {/* Labels */}
                <text x={width / 2} y={height - 8} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12">
                    Trades ({months} months)
                </text>
            </svg>
        );
    };

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Input Controls */}
            <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Target size={20} />
                    Simulation Parameters
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    <div className="input-group">
                        <label className="input-label">Starting Capital ($)</label>
                        <input
                            type="number"
                            value={startingCapital}
                            onChange={e => setStartingCapital(parseInt(e.target.value) || 10000)}
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Risk Per Trade (%)</label>
                        <input
                            type="number"
                            step="0.1"
                            value={riskPerTrade}
                            onChange={e => setRiskPerTrade(parseFloat(e.target.value) || 1)}
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Trades Per Month</label>
                        <input
                            type="number"
                            value={tradesPerMonth}
                            onChange={e => setTradesPerMonth(parseInt(e.target.value) || 20)}
                        />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Projection (Months)</label>
                        <input
                            type="number"
                            value={months}
                            onChange={e => setMonths(parseInt(e.target.value) || 6)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Based On */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
                <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>YOUR WIN RATE</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                        {(stats.winRate * 100).toFixed(1)}%
                    </div>
                </div>
                <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>AVG WIN</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                        ${stats.avgWin.toFixed(0)}
                    </div>
                </div>
                <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>AVG LOSS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                        ${stats.avgLoss.toFixed(0)}
                    </div>
                </div>
                <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>AVG WIN RR</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                        {stats.avgWinRR.toFixed(2)}RR
                    </div>
                </div>
            </div>

            {/* Chart */}
            {simulation && (
                <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <TrendingUp size={20} color="var(--accent)" />
                        Equity Curve Projection (1000 Simulations)
                    </h3>
                    {renderChart()}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '20px', fontSize: '12px' }}>
                        <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'rgba(35, 134, 54, 0.1)', marginRight: '6px', borderRadius: '2px' }} />5th-95th Percentile</span>
                        <span><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'rgba(35, 134, 54, 0.3)', marginRight: '6px', borderRadius: '2px' }} />25th-75th Percentile</span>
                        <span><span style={{ display: 'inline-block', width: '12px', height: '3px', backgroundColor: 'var(--accent)', marginRight: '6px' }} />Median</span>
                    </div>
                </div>
            )}

            {/* Results */}
            {simulation && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>MEDIAN OUTCOME</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: simulation.medianFinal > startingCapital ? 'var(--accent)' : 'var(--danger)' }}>
                            ${simulation.medianFinal.toFixed(0)}
                        </div>
                        <div style={{ fontSize: '11px', opacity: 0.5 }}>
                            {((simulation.medianFinal - startingCapital) / startingCapital * 100).toFixed(1)}% return
                        </div>
                    </div>
                    <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>WORST CASE (5%)</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                            ${simulation.worstCase.toFixed(0)}
                        </div>
                        <div style={{ fontSize: '11px', opacity: 0.5 }}>
                            {((simulation.worstCase - startingCapital) / startingCapital * 100).toFixed(1)}%
                        </div>
                    </div>
                    <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>PROFIT PROBABILITY</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: simulation.probabilityOfProfit > 50 ? 'var(--accent)' : 'var(--danger)' }}>
                            {simulation.probabilityOfProfit.toFixed(0)}%
                        </div>
                    </div>
                    <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>AVG MAX DRAWDOWN</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#eab308' }}>
                            {simulation.avgMaxDrawdown.toFixed(1)}%
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
