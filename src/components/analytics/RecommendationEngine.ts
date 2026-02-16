import { Trade } from '../../types';

export interface Recommendation {
    id: string;
    type: 'Critical' | 'Warning' | 'Optimization' | 'Good';
    title: string;
    description: string;
    actionable: string;
    relatedTrades?: Trade[];
    metricValue?: string;
}

export class RecommendationEngine {
    private trades: Trade[];

    constructor(trades: Trade[]) {
        this.trades = trades;
    }

    public generate(): Recommendation[] {
        const recommendations: Recommendation[] = [];

        // 1. Dynamic Sigma-Based Stops
        const sigmaRec = this.analyzeSigmaStops();
        if (sigmaRec) recommendations.push(sigmaRec);

        // 2. Heat Zone Analysis
        const heatRecs = this.analyzeHeatZones();
        recommendations.push(...heatRecs);

        // 3. Discipline Enforcement
        const disciplineRecs = this.analyzeDiscipline();
        recommendations.push(...disciplineRecs);

        // 4. Signal Quality (Basic version)
        // const signalRec = this.analyzeSignalQuality();
        // if (signalRec) recommendations.push(signalRec);

        return recommendations;
    }

    private getTradeRisk(trade: Trade): number {
        const { entryPrice, initialSL, plannedSL } = trade;
        const sl = initialSL || plannedSL;
        if (!entryPrice || !sl) return 0;
        return Math.abs(entryPrice - sl);
    }

    private analyzeSigmaStops(): Recommendation | null {
        // Filter for winners with valid MAE and Risk
        const winners = this.trades.filter(t => (t.pnl || 0) > 0 && t.maePrice && this.getTradeRisk(t) > 0);

        if (winners.length < 5) return null; // Need some data

        const maeValues: number[] = [];

        winners.forEach(t => {
            const risk = this.getTradeRisk(t);
            const maeDist = Math.abs(t.entryPrice - (t.maePrice || t.entryPrice));
            // We care about the raw distance for Sigma calculation relative to price, 
            // OR relative to R? The prompt says "Stop Distance = Mean(MAE) + 3*StdDev(MAE)"
            // Usually this implies price distance, but let's normalize to R for universal applicability across assets if needed.
            // However, "Replace fixed point stops" implies we are talking about price points.
            // Let's stick to R-multiples for the recommendation to be asset-agnostic in the UI, 
            // but the internal logic mimics the Sigma distribution.

            const maeR = maeDist / risk;
            maeValues.push(maeR);
        });

        const mean = maeValues.reduce((a, b) => a + b, 0) / maeValues.length;
        const variance = maeValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / maeValues.length;
        const stdDev = Math.sqrt(variance);

        const threeSigma = mean + (3 * stdDev);

        // Interpretation
        // If 3-sigma is significantly less than 1.0R (e.g. < 0.6R), it means current stops are too wide.
        if (threeSigma < 0.6) {
            return {
                id: 'sigma-tighten',
                type: 'Optimization',
                title: 'Sigma Optimization: Tighten Stops',
                description: `Your 3-Sigma variation for winners is only ${threeSigma.toFixed(2)}R. Current stops are likely larger than necessary.`,
                actionable: `Consider tightening initial stops to ~${(threeSigma * 1.2).toFixed(2)}R to improve RR without impacting win rate.`,
                metricValue: `${threeSigma.toFixed(2)}R`
            };
        }

        // If 3-sigma is > 1.0R, it implies winners often take huge heat before working.
        if (threeSigma > 1.2) {
            return {
                id: 'sigma-widen',
                type: 'Warning',
                title: 'Sigma Optimization: Volatile Entries',
                description: `Your winners often require deeply adverse excursions (3-Sigma = ${threeSigma.toFixed(2)}R).`,
                actionable: `Review entry timing. You are surviving by luck or wide stops. Wait for pullbacks to improve Signal-to-Noise.`,
                metricValue: `${threeSigma.toFixed(2)}R`
            };
        }

        return {
            id: 'sigma-good',
            type: 'Good',
            title: 'Gaussian Stop Efficiency',
            description: `Your 3-Sigma MAE (${threeSigma.toFixed(2)}R) is well-aligned with your risk parameters.`,
            actionable: 'Maintain current stop placement logic.',
            metricValue: `${threeSigma.toFixed(2)}R`
        };
    }

    private analyzeHeatZones(): Recommendation[] {
        const recs: Recommendation[] = [];
        const heatBuckets = {
            surgical: [] as Trade[], // 0 - 0.2
            healthy: [] as Trade[],  // 0.2 - 0.5
            sweaty: [] as Trade[],   // 0.6 - 0.8
            lucky: [] as Trade[],    // 0.9 - 1.0 (Winners)
            invalid: [] as Trade[]   // 0.9 - 1.0 (Losers)
        };

        this.trades.forEach(t => {
            const risk = this.getTradeRisk(t);
            if (risk === 0 || !t.maePrice) return;

            const maeDist = Math.abs(t.entryPrice - (t.maePrice || t.entryPrice));
            const heat = maeDist / risk;
            const isWin = (t.pnl || 0) > 0;

            if (heat <= 0.2) heatBuckets.surgical.push(t);
            else if (heat <= 0.5) heatBuckets.healthy.push(t);
            else if (heat <= 0.8) heatBuckets.sweaty.push(t);
            else if (heat <= 1.0) {
                if (isWin) heatBuckets.lucky.push(t);
                else heatBuckets.invalid.push(t);
            }
        });

        // 1. Surgical Opportunities
        if (heatBuckets.surgical.length > 3) {
            // Check if we can move to BE
            // Logic: If surgical trades often end up failing after being up?
            // For now, just a general optimization tip if many trades are surgical.
            recs.push({
                id: 'heat-surgical',
                type: 'Good',
                title: 'Surgical Entry Precision',
                description: `High frequency of "Surgical" entries (${heatBuckets.surgical.length} trades with < 0.2R Heat).`,
                actionable: 'Aggressively move stops to Breakeven once 0.5R is secured to finance "free trades".',
                relatedTrades: heatBuckets.surgical.slice(0, 5)
            });
        }

        // 2. Sweaty Trades Warning
        if (heatBuckets.sweaty.length > 3) {
            recs.push({
                id: 'heat-sweaty',
                type: 'Warning',
                title: 'High "Sweaty Trade" Frequency',
                description: `${heatBuckets.sweaty.length} trades sat in 0.6R - 0.8R drawdown before resolving.`,
                actionable: 'Review these entries. You are likely entering too early. Wait for the retest of the retest.',
                relatedTrades: heatBuckets.sweaty.slice(0, 5)
            });
        }

        // 3. Lucky Escapes
        if (heatBuckets.lucky.length > 0) {
            recs.push({
                id: 'heat-lucky',
                type: 'Critical',
                title: 'Technical Invalidation ("Lucky Escapes")',
                description: `${heatBuckets.lucky.length} winners nearly hit your full stop (0.9R+ Heat).`,
                actionable: 'Do not count these as valid wins. Your analysis was likely wrong, but market noise saved you.',
                relatedTrades: heatBuckets.lucky.slice(0, 3)
            });
        }

        return recs;
    }

    private analyzeDiscipline(): Recommendation[] {
        const recs: Recommendation[] = [];
        const violations: Trade[] = [];
        const fumbled: Trade[] = [];
        const panic: Trade[] = [];

        this.trades.forEach(t => {
            const risk = this.getTradeRisk(t);
            if (risk === 0 || !t.maePrice) return;
            const isWin = (t.pnl || 0) > 0;

            const maeDist = Math.abs(t.entryPrice - (t.maePrice || t.entryPrice));
            const heat = maeDist / risk;

            // Strict Adherence (Heat > 1.05R to allow for slight slippage/wick)
            if (heat > 1.1) {
                violations.push(t);
            }

            // Fumbled Profits (MFE > 1R, Result = Loss/BE)
            if (t.mfePrice && !isWin) {
                const mfeDist = Math.abs((t.mfePrice || t.entryPrice) - t.entryPrice);
                const mfeR = mfeDist / risk;
                if (mfeR > 1.0) {
                    fumbled.push(t);
                }
            }

            // Panic Exit (Loss with Heat < 0.2R)
            if (!isWin && heat < 0.2 && t.exitPrice) {
                // Also ensure it wasn't a tiny scalp attempt, check duration? 
                // "Panic Exit" usually means manual close. 
                // If the loss is small (Realized R > -0.5), it might be a panic exit.
                // If Realized R is -1, it's a full stop, so heat should be 1.

                const realizedDist = Math.abs(t.entryPrice - t.exitPrice);
                const realizedR = realizedDist / risk;

                // A panic exit is a small loss where price didn't really go against you.
                if (realizedR < 0.5) {
                    panic.push(t);
                }
            }
        });

        if (violations.length > 0) {
            recs.push({
                id: 'disc-stops',
                type: 'Critical',
                title: 'Stop Loss Violated (Danger Zone)',
                description: `Detected ${violations.length} trades where MAE exceeded 1.1R.`,
                actionable: 'STRICT ADHERENCE WARNING. You are moving stops or averaging down. This effectively voids positive expectancy.',
                relatedTrades: violations.slice(0, 3)
            });
        }

        if (fumbled.length > 0) {
            recs.push({
                id: 'disc-fumble',
                type: 'Warning',
                title: 'Fumbled Profits',
                description: `${fumbled.length} trades went > 1.0R in your favor but ended red.`,
                actionable: 'Implement a hard rule: Move SL to Breakeven at +1.0R MFE to protect capital.',
                relatedTrades: fumbled.slice(0, 3)
            });
        }

        if (panic.length > 0) {
            recs.push({
                id: 'disc-panic',
                type: 'Optimization',
                title: 'Premature "Panic" Exits',
                description: `${panic.length} losses were manually closed with minimal heat (< 0.2R).`,
                actionable: 'Trust your technical invalidation. If the thesis isn\'t broken (stop hit), stay in the trade.',
                relatedTrades: panic.slice(0, 3)
            });
        }

        return recs;
    }
}
