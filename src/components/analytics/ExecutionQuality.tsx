import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trade } from '../../types';
import { Target, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { SmartRecommendations } from './SmartRecommendations';

interface ExecutionQualityProps {
    trades: Trade[];
    onSelectTrade?: (trade: Trade) => void;
}

interface FumbledTradeItem {
    trade: Trade;
    mfeR: number;
    fumbledAmount: number;
}

interface HeatItem {
    trade: Trade;
    heatPct: number;
}

function Tooltip({ content, position }: { content: string, position: { top: number, left: number } }) {
    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                transform: 'translateX(-50%)',
                zIndex: 100000,
                pointerEvents: 'none'
            }}
        >
            <div
                className="animate-fade-in"
                style={{
                    width: '260px',
                    backgroundColor: '#18181b', // Zinc 900
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                    whiteSpace: 'normal',
                    textAlign: 'left'
                }}
            >
                <div style={{ fontSize: '12px', lineHeight: '1.4', color: '#d4d4d8' }}>
                    {content}
                </div>
                {/* Arrow */}
                <div style={{
                    position: 'absolute',
                    top: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%) rotate(45deg)',
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#18181b',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                }} />
            </div>
        </div>,
        document.body
    );
}

const TooltipIcon = ({ text }: { text: string }) => {
    const [show, setShow] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const iconRef = useRef<HTMLDivElement>(null);

    const handleEnter = () => {
        if (iconRef.current) {
            const rect = iconRef.current.getBoundingClientRect();
            setPos({
                top: rect.bottom + 10,
                left: rect.left + rect.width / 2
            });
            setShow(true);
        }
    };

    return (
        <div
            ref={iconRef}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '6px' }}
            onMouseEnter={handleEnter}
            onMouseLeave={() => setShow(false)}
        >
            <div
                style={{
                    padding: '2px',
                    borderRadius: '50%',
                    cursor: 'help',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    backgroundColor: show ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'
                }}
            >
                <Info size={14} style={{ color: show ? '#ffffff' : '#a1a1aa', transition: 'color 0.2s' }} />
            </div>
            {show && <Tooltip content={text} position={pos} />}
        </div>
    );
};

export function ExecutionQuality({ trades, onSelectTrade }: ExecutionQualityProps) {
    const [fumbleThreshold, setFumbleThreshold] = useState(1.0);

    // Load threshold from settings
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const data = await window.electronAPI.settings.get('behavioral_thresholds');
                if (data && data.default && data.default.fumbleThreshold) {
                    setFumbleThreshold(data.default.fumbleThreshold);
                } else if (data && data['main-account'] && data['main-account'].fumbleThreshold) {
                    setFumbleThreshold(data['main-account'].fumbleThreshold);
                }
            } catch (e) {
                console.error("Failed to load behavior settings", e);
            }
        };
        loadSettings();
    }, []);

    const analysis = useMemo(() => {
        let totalHeat = 0;
        let validHeatCount = 0;

        // Plan Efficiency (Wins)
        let totalRealizedR_Wins = 0;
        let totalPlannedR_Wins = 0;
        let validRCount_Wins = 0;

        // Fumble Rate (Loss/BE)
        let fumbleCount = 0;
        let lossBeCount = 0;
        const fumbledTrades: FumbledTradeItem[] = [];
        let totalFumbledDollars = 0;

        // BE Excursion
        let totalBeMfeR = 0;
        let beCount = 0;

        // Entry Efficiency (All)
        let totalMfeR = 0;
        let totalMaeR = 0;
        let validEntryEffCount = 0;

        const heatItems: HeatItem[] = [];

        trades.forEach(trade => {
            const { entryPrice, exitPrice, maePrice, mfePrice, plannedSL, plannedTP, direction, contracts, pnl, initialSL } = trade;
            const sl = initialSL || plannedSL;
            const isLong = direction === 'Long';
            const size = contracts || 1;
            const isWin = (pnl || 0) > 0;
            const isLossOrBE = !isWin;

            // Risk Unit (in price points)
            const riskPoints = (entryPrice && sl) ? Math.abs(entryPrice - sl) : 0;
            const hasRisk = riskPoints > 0;

            // 1. Avg Entry Heat (All Trades with MAE & SL)
            if (entryPrice && maePrice && sl) {
                let currentHeat = 0;
                let actualDrawdown = 0;

                if (isLong) {
                    actualDrawdown = entryPrice - maePrice;
                } else {
                    actualDrawdown = maePrice - entryPrice;
                }

                if (hasRisk) {
                    currentHeat = (actualDrawdown / riskPoints) * 100;
                    currentHeat = Math.max(0, currentHeat);
                    totalHeat += currentHeat;
                    validHeatCount++;
                    heatItems.push({ trade, heatPct: currentHeat });
                }
            }

            // 2. Plan Efficiency (Wins Only)
            if (isWin && entryPrice && exitPrice && sl && plannedTP && hasRisk) {
                let realizedR = 0;
                let plannedR = 0;

                if (isLong) {
                    realizedR = (exitPrice - entryPrice) / riskPoints;
                    plannedR = (plannedTP - entryPrice) / riskPoints;
                } else {
                    realizedR = (entryPrice - exitPrice) / riskPoints;
                    plannedR = (entryPrice - plannedTP) / riskPoints;
                }

                totalRealizedR_Wins += realizedR;
                totalPlannedR_Wins += plannedR;
                validRCount_Wins++;
            }

            // Calculation of MFE R and MAE R for Entry Efficiency & Fumbles
            let mfeR = 0;
            let maeR = 0;
            let hasExecutionMetrics = false;

            if (entryPrice && hasRisk) {
                if (mfePrice) {
                    const favExcursion = isLong ? (mfePrice - entryPrice) : (entryPrice - mfePrice);
                    mfeR = favExcursion / riskPoints;
                }
                if (maePrice) {
                    const advExcursion = isLong ? (entryPrice - maePrice) : (maePrice - entryPrice);
                    maeR = Math.max(0, advExcursion / riskPoints); // Clamp MAE at 0
                }
                hasExecutionMetrics = true;
            }

            // 3. Missed Opportunities (Fumble Rate) - Loss/BE Only
            // 6. Fumbled Profits (Money Left) - Loss/BE Only
            if (isLossOrBE && hasExecutionMetrics && mfePrice && exitPrice) {
                lossBeCount++;

                if (mfeR >= fumbleThreshold) {
                    fumbleCount++;

                    // Fumbled Profit Calculation: Max MFE - Exit
                    let potentialProfit = 0;
                    let actualRealized = 0;

                    if (isLong) {
                        potentialProfit = (mfePrice - entryPrice) * size;
                        actualRealized = (exitPrice - entryPrice) * size;
                    } else {
                        potentialProfit = (entryPrice - mfePrice) * size;
                        actualRealized = (entryPrice - exitPrice) * size;
                    }

                    const leftOnTable = Math.max(0, potentialProfit - actualRealized);
                    totalFumbledDollars += leftOnTable;

                    fumbledTrades.push({
                        trade,
                        mfeR,
                        fumbledAmount: leftOnTable
                    });
                }
            }

            // 4. BE Excursion (Avg MFE of BE/Loss trades that are essentially BE)
            // Using a loose definition of BE: |Realized R| < 0.25
            if (hasExecutionMetrics && entryPrice && exitPrice) {
                const realizedPnL = isLong ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
                const realizedR = realizedPnL / riskPoints;

                if (Math.abs(realizedR) < 0.25) {
                    totalBeMfeR += mfeR;
                    beCount++;
                }
            }

            // 5. Entry Efficiency (All Trades)
            // Avg MFE / Avg MAE
            if (hasExecutionMetrics && mfePrice && maePrice) {
                totalMfeR += mfeR;
                totalMaeR += maeR;
                validEntryEffCount++;
            }

        });

        const avgHeat = validHeatCount > 0 ? totalHeat / validHeatCount : 0;

        const avgRealizedR = validRCount_Wins > 0 ? totalRealizedR_Wins / validRCount_Wins : 0;
        const avgPlannedR = validRCount_Wins > 0 ? totalPlannedR_Wins / validRCount_Wins : 0;
        const planEfficiency = avgPlannedR > 0 ? (avgRealizedR / avgPlannedR) * 100 : 0;

        const fumbleRate = lossBeCount > 0 ? (fumbleCount / lossBeCount) * 100 : 0;

        const avgBeMfe = beCount > 0 ? totalBeMfeR / beCount : 0;

        const avgMfeAll = validEntryEffCount > 0 ? totalMfeR / validEntryEffCount : 0;
        const avgMaeAll = validEntryEffCount > 0 ? totalMaeR / validEntryEffCount : 0;
        const entryEfficiency = avgMaeAll > 0 ? (avgMfeAll / avgMaeAll) : (avgMfeAll > 0 ? 10 : 0); // Cap at 10 if 0 MAE

        // Sort Highest Heat (Worst entries)
        const worstEntries = [...heatItems]
            .sort((a, b) => b.heatPct - a.heatPct)
            .slice(0, 5);

        // Sort Fumbled Trades (Money Left On Table)
        const worstFumbles = [...fumbledTrades]
            .sort((a, b) => b.fumbledAmount - a.fumbledAmount)
            .slice(0, 5);

        return {
            avgHeat,
            validHeatCount,
            planEfficiency,
            avgRealizedR,
            avgPlannedR,
            validRCount_Wins,
            fumbleRate,
            lossBeCount,
            avgBeMfe,
            beCount,
            entryEfficiency,
            totalFumbledDollars,
            worstEntries,
            worstFumbles,
            validEntryEffCount
        };

    }, [trades, fumbleThreshold]);

    const getScoreColor = (score: number, isInverse = false) => {
        if (isInverse) {
            if (score <= 20) return 'var(--accent)';
            if (score <= 50) return '#eab308';
            return 'var(--danger)';
        }
        if (score >= 70) return 'var(--accent)';
        if (score >= 40) return '#eab308';
        return 'var(--danger)';
    };

    // If no data
    if (trades.length === 0) {
        return (
            <div style={{ padding: '60px', textAlign: 'center' }}>
                <Target size={64} style={{ opacity: 0.1, marginBottom: '16px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>
                    No trades to analyze.
                </p>
            </div>
        );
    }

    return (
        <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '16px',
                marginBottom: '32px',
                position: 'relative',
                zIndex: 100
            }}>

                {/* 1. Plan Efficiency */}
                <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        Plan Efficiency
                        <TooltipIcon text="Wins Only. (Realized R / Planned R). 100% = sticking to plan." />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: getScoreColor(analysis.planEfficiency), lineHeight: 1 }}>
                        {analysis.validRCount_Wins > 0 ? `${analysis.planEfficiency.toFixed(0)}%` : '-'}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '8px' }}>
                        {analysis.avgRealizedR.toFixed(1)}R / {analysis.avgPlannedR.toFixed(1)}R
                    </div>
                </div>

                {/* 2. Avg Entry Heat */}
                <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        Avg Entry Heat
                        <TooltipIcon text="Drawdown / Risk. Lower is better." />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: getScoreColor(analysis.avgHeat, true), lineHeight: 1 }}>
                        {analysis.validHeatCount > 0 ? `${analysis.avgHeat.toFixed(0)}%` : '-'}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '8px' }}>
                        Based on {analysis.validHeatCount} trades
                    </div>
                </div>

                {/* 3. Missed Opportunities (Fumble Rate) */}
                <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        Missed Opps
                        <TooltipIcon text={`% of Loss/BE trades that went > ${fumbleThreshold}R in your favor.`} />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: getScoreColor(100 - analysis.fumbleRate), lineHeight: 1 }}>
                        {analysis.lossBeCount > 0 ? `${analysis.fumbleRate.toFixed(0)}%` : '-'}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '8px' }}>
                        Threshold: {fumbleThreshold}R
                    </div>
                </div>

                {/* 4. Avg BE Excursion */}
                <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        Avg BE MFE
                        <TooltipIcon text="How far (in R) your Break-Even trades usually go before coming back." />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff', lineHeight: 1 }}>
                        {analysis.beCount > 0 ? `${analysis.avgBeMfe.toFixed(1)}R` : '-'}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '8px' }}>
                        {analysis.beCount} BE trades
                    </div>
                </div>

                {/* 5. Entry Efficiency */}
                <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        Entry Efficiency
                        <TooltipIcon text="Avg MFE / Avg MAE. > 1.0 means you usually have more room to run than heat." />
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: analysis.entryEfficiency > 1.5 ? 'var(--accent)' : '#fff', lineHeight: 1 }}>
                        {analysis.validEntryEffCount > 0 ? analysis.entryEfficiency.toFixed(1) : '-'}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '8px' }}>
                        Ratio (Signal/Noise)
                    </div>
                </div>

                {/* 6. Fumbled Profits */}
                <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Fumbled Profits
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--danger)', lineHeight: 1 }}>
                        ${analysis.totalFumbledDollars.toFixed(0)}
                    </div>
                    <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '8px' }}>
                        Left on table (Losses/BE)
                    </div>
                </div>
            </div>

            {/* Lists */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', position: 'relative', zIndex: 1 }}>

                {/* Fumbled Profits List */}
                <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '20px' }}>
                        <TrendingDown size={20} color="var(--danger)" />
                        Biggest Fumbles (Loss/BE with Profits)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {analysis.worstFumbles.length === 0 && <div style={{ opacity: 0.5, fontSize: '14px' }}>No severe fumbles recorded.</div>}
                        {analysis.worstFumbles.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => onSelectTrade?.(item.trade)}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{item.trade.market}</div>
                                    <div style={{ fontSize: '12px', opacity: 0.5 }}>
                                        {new Date(item.trade.entryDateTime).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: 'var(--danger)', fontWeight: 'bold' }}>
                                        -${item.fumbledAmount.toFixed(0)}
                                    </div>
                                    <div style={{ fontSize: '11px', opacity: 0.5 }}>
                                        Up {item.mfeR.toFixed(1)}R ({item.trade.direction})
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Highest Heat */}
                <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '20px' }}>
                        <TrendingUp size={20} color="#eab308" />
                        Highest Heat Entries
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {analysis.worstEntries.length === 0 && <div style={{ opacity: 0.5, fontSize: '14px' }}>No data available</div>}
                        {analysis.worstEntries.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => onSelectTrade?.(item.trade)}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    backgroundColor: 'rgba(255,255,255,0.03)',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{item.trade.market}</div>
                                    <div style={{ fontSize: '12px', opacity: 0.5 }}>
                                        {new Date(item.trade.entryDateTime).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ color: getScoreColor(item.heatPct, true), fontWeight: 'bold' }}>
                                        {item.heatPct.toFixed(0)}% Heat
                                    </div>
                                    <div style={{ fontSize: '11px', opacity: 0.5 }}>
                                        Drawdown vs Risk
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>


            </div>

            <SmartRecommendations trades={trades} />
        </div >
    );
}
