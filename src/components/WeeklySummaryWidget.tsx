import { useState, useEffect } from 'react';
import { Trade } from '../types';
import { getAlgorithmicWeeklyHighlights, getPreviousWeekRange } from '../utils/analytics';
import { Trophy, AlertTriangle, Sparkles, Lightbulb, Target } from 'lucide-react';
import { TradeSummaryModal } from './TradeSummaryModal';
import { HighlightCard } from './HighlightCard';

interface Props {
    trades: Trade[];
}

interface ReviewTrade {
    tradeId: string;
    title: string;
    reason: string;
    conclusion: string;
    tip: string;
}

interface WeeklyReviewData {
    week_summary: string;
    top_process_wins: ReviewTrade[];
    tactical_improvements: ReviewTrade[];
    critical_review_needed: ReviewTrade[];
    next_week_focus: string;
    replay_recommendation: string;
}

interface SavedReview {
    id: string;
    week_label: string;
    start_date: string;
    end_date: string;
    jsonData: WeeklyReviewData;  // Changed from json_data to match repository
    updated_at: string;
}

export function WeeklySummaryWidget({ trades }: Props) {
    const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);
    const [aiReview, setAiReview] = useState<SavedReview | null>(null);
    const [loading, setLoading] = useState(true);

    // Get previous week's date range
    const { monday, sunday, weekId } = getPreviousWeekRange();
    const weekLabel = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    // Filter trades from previous week only
    const previousWeekTrades = trades.filter(t => {
        const d = new Date(t.entryDateTime);
        return d >= monday && d <= sunday;
    });

    // Get algorithmic highlights (fallback)
    const highlights = getAlgorithmicWeeklyHighlights(previousWeekTrades);

    // Load AI review for previous week
    useEffect(() => {
        const loadAiReview = async () => {
            try {
                setLoading(true);
                const review = await window.electronAPI.weeklyReviews.get(weekId);
                setAiReview(review);
            } catch (err) {
                console.error('Failed to load AI review:', err);
                setAiReview(null);
            } finally {
                setLoading(false);
            }
        };
        loadAiReview();
    }, [weekId]);

    // If no trades from previous week, show nothing
    if (previousWeekTrades.length === 0) {
        return null;
    }

    // Show AI insights if available
    if (!loading && aiReview?.jsonData) {
        const data = aiReview.jsonData;

        // Extract all categories
        const topProcessWins = data.top_process_wins || [];
        const tacticalImprovements = data.tactical_improvements || [];
        const criticalReviews = data.critical_review_needed || [];
        const focusThisWeek = data.next_week_focus || '';

        return (
            <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, var(--accent), #10b981)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Sparkles size={18} color="white" />
                        </div>
                        <h3 style={{ margin: 0 }}>AI Weekly Insights</h3>
                    </div>
                    <span style={{ fontSize: '12px', opacity: 0.5 }}>{weekLabel}</span>
                </div>

                {/* Focus This Week */}
                {focusThisWeek && (
                    <div style={{
                        padding: '16px',
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(35, 134, 54, 0.15) 0%, rgba(35, 134, 54, 0.05) 100%)',
                        border: '1px solid rgba(35, 134, 54, 0.3)',
                        marginBottom: '20px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <Target size={16} color="var(--accent)" />
                            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Focus This Week
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                            {focusThisWeek}
                        </p>
                    </div>
                )}

                {/* Categories Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                    {/* Top Process Wins */}
                    {topProcessWins.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--accent)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                <Trophy size={14} /> Top Process Wins
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                                {topProcessWins.map((pattern, idx) => {
                                    const trade = trades.find(t =>
                                        t.id === pattern.tradeId ||
                                        String(t.id) === String(pattern.tradeId)
                                    );
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => trade && setViewingTrade(trade)}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '8px',
                                                background: 'linear-gradient(135deg, rgba(35, 134, 54, 0.15) 0%, rgba(35, 134, 54, 0.05) 100%)',
                                                border: '1px solid rgba(35, 134, 54, 0.3)',
                                                cursor: trade ? 'pointer' : 'default',
                                                transition: 'transform 0.2s',
                                            }}
                                            onMouseEnter={e => {
                                                if (trade) e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                                {pattern.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '6px' }}>
                                                "{pattern.reason}"
                                            </div>
                                            {pattern.tip && (
                                                <div style={{
                                                    fontSize: '11px',
                                                    padding: '6px 8px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(35, 134, 54, 0.2)',
                                                    borderLeft: '2px solid var(--accent)',
                                                    marginTop: '6px'
                                                }}>
                                                    <strong>Action:</strong> {pattern.tip}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tactical Improvements */}
                    {tacticalImprovements.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#eab308', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                <Lightbulb size={14} /> Tactical Improvements
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                                {tacticalImprovements.map((pattern, idx) => {
                                    const trade = trades.find(t =>
                                        t.id === pattern.tradeId ||
                                        String(t.id) === String(pattern.tradeId)
                                    );
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => trade && setViewingTrade(trade)}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '8px',
                                                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)',
                                                border: '1px solid rgba(234, 179, 8, 0.3)',
                                                cursor: trade ? 'pointer' : 'default',
                                                transition: 'transform 0.2s',
                                            }}
                                            onMouseEnter={e => {
                                                if (trade) e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                                {pattern.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '6px' }}>
                                                "{pattern.reason}"
                                            </div>
                                            {pattern.tip && (
                                                <div style={{
                                                    fontSize: '11px',
                                                    padding: '6px 8px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(234, 179, 8, 0.2)',
                                                    borderLeft: '2px solid #eab308',
                                                    marginTop: '6px'
                                                }}>
                                                    <strong>Action:</strong> {pattern.tip}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Critical Reviews */}
                    {criticalReviews.length > 0 && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--danger)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                <AlertTriangle size={14} /> Critical Reviews Needed
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                                {criticalReviews.map((mistake, idx) => {
                                    const trade = trades.find(t =>
                                        t.id === mistake.tradeId ||
                                        String(t.id) === String(mistake.tradeId)
                                    );
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => trade && setViewingTrade(trade)}
                                            style={{
                                                padding: '12px',
                                                borderRadius: '8px',
                                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
                                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                                cursor: trade ? 'pointer' : 'default',
                                                transition: 'transform 0.2s',
                                            }}
                                            onMouseEnter={e => {
                                                if (trade) e.currentTarget.style.transform = 'translateY(-2px)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                            }}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-primary)' }}>
                                                {mistake.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '6px' }}>
                                                "{mistake.reason}"
                                            </div>
                                            {mistake.tip && (
                                                <div style={{
                                                    fontSize: '11px',
                                                    padding: '6px 8px',
                                                    borderRadius: '4px',
                                                    background: 'rgba(239, 68, 68, 0.2)',
                                                    borderLeft: '2px solid var(--danger)',
                                                    marginTop: '6px'
                                                }}>
                                                    <strong>Action:</strong> {mistake.tip}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Link to full review */}
                <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    borderRadius: '6px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    opacity: 0.7
                }}>
                    <Lightbulb size={14} />
                    <span>View the full detailed analysis in the <strong>Review</strong> tab</span>
                </div>

                {viewingTrade && (
                    <TradeSummaryModal
                        trade={viewingTrade}
                        onClose={() => setViewingTrade(null)}
                        onEdit={() => { }}
                    />
                )}
            </div>
        );
    }

    // Fallback to algorithmic highlights
    return (
        <div className="card" style={{ padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Weekly Highlights</h3>
                <span style={{ fontSize: '12px', opacity: 0.5 }}>{weekLabel}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1 }}>

                {/* Best Trades Column */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--accent)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <Trophy size={14} /> Top Process Wins
                    </div>
                    {highlights.best.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {highlights.best.map(t => (
                                <HighlightCard
                                    key={t.id}
                                    trade={t}
                                    type="best"
                                    onClick={() => setViewingTrade(t)}
                                    compact={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div style={{ opacity: 0.4, fontSize: '13px', fontStyle: 'italic' }}>No wins this week yet.</div>
                    )}
                </div>

                {/* Worst Trades Column */}
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--danger)', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <AlertTriangle size={14} /> Review Needed
                    </div>
                    {highlights.worst.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {highlights.worst.map(t => (
                                <HighlightCard
                                    key={t.id}
                                    trade={t}
                                    type="worst"
                                    onClick={() => setViewingTrade(t)}
                                    compact={true}
                                />
                            ))}
                        </div>
                    ) : (
                        <div style={{ opacity: 0.4, fontSize: '13px', fontStyle: 'italic' }}>No losses this week!</div>
                    )}
                </div>
            </div>

            {viewingTrade && (
                <TradeSummaryModal
                    trade={viewingTrade}
                    onClose={() => setViewingTrade(null)}
                    onEdit={() => { }}
                />
            )}
        </div>
    );
}
