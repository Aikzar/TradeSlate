import { useState, useEffect, useCallback } from 'react';
import { useTrades } from '../hooks/useTrades';
import { Trade } from '../types';
import { AnnotatedImage } from '../components/AnnotatedImage';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { TradeSummaryModal } from '../components/TradeSummaryModal';
import { WeeklyRecap } from '../components/WeeklyRecap';
import { Search, Brain, Target, Zap, TrendingUp, MessageSquare, Grid, Shield, Sparkles } from 'lucide-react';
import {
    BehavioralPatterns,
    ExecutionQuality,
    MonteCarloProjections,
    MistakeHeatmap,
    TradeQA
} from '../components/analytics';

type Tab = 'recap' | 'individual' | 'patterns' | 'execution' | 'projections' | 'qa' | 'heatmap';

export function TradeReview() {
    const { trades, loading } = useTrades();
    const [activeTab, setActiveTab] = useState<Tab>('recap');
    const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
    const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [resolvedImages, setResolvedImages] = useState<{ [key: number]: string }>({});
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedAsset, setSelectedAsset] = useState<string>('all');

    // 1. Global Filtering (Date & Asset) applies to ALL tabs
    const globalFilteredTrades = trades.filter(t => {
        let matches = true;

        // Asset Filter
        if (selectedAsset !== 'all') {
            matches = matches && t.market === selectedAsset;
        }

        // Date Range Filter
        if (startDate) {
            matches = matches && new Date(t.entryDateTime) >= new Date(startDate);
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matches = matches && new Date(t.entryDateTime) <= end;
        }

        return matches;
    });

    // 2. Analyzed Trades (for Individual Review Sidebar & Analysis)
    const analyzedTrades = globalFilteredTrades.filter(t => t.meta?.ai_analysis);

    // 3. Sidebar Search Filter
    const sidebarFilteredTrades = analyzedTrades.filter(t => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return t.market.toLowerCase().includes(q) ||
            (t.setup || '').toLowerCase().includes(q) ||
            (t.meta?.ai_analysis?.feedback || '').toLowerCase().includes(q);
    });

    // Compute unique assets
    const uniqueAssets = Array.from(new Set(trades.map(t => t.market))).sort();

    // Resolve local:// paths
    const resolveImageSrc = useCallback(async (url: string, idx: number) => {
        if (url.startsWith('local://')) {
            try {
                const resolved = await window.electronAPI.images.resolvePath(url);
                setResolvedImages(prev => ({ ...prev, [idx]: resolved }));
            } catch (err) {
                console.error('Failed to resolve image path:', err);
            }
        }
    }, []);

    useEffect(() => {
        if (selectedTrade) {
            const safeImages = Array.isArray(selectedTrade.images) ? selectedTrade.images : [];
            safeImages.forEach((url: string, idx: number) => {
                if (url.startsWith('local://') && !resolvedImages[idx]) {
                    resolveImageSrc(url, idx);
                }
            });
        } else {
            setResolvedImages({});
        }
    }, [selectedTrade, resolveImageSrc]);

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'var(--accent)';
        if (score >= 5) return '#eab308'; // Warning yellow
        return 'var(--danger)';
    };

    const tabs = [
        { id: 'recap' as Tab, label: 'Weekly Recap', icon: Sparkles },
        { id: 'individual' as Tab, label: 'Individual Review', icon: Brain },
        { id: 'execution' as Tab, label: 'Execution', icon: Target },
        { id: 'patterns' as Tab, label: 'Patterns', icon: Shield },
        { id: 'heatmap' as Tab, label: 'Heatmap', icon: Grid },
        { id: 'projections' as Tab, label: 'Projections', icon: TrendingUp },
        { id: 'qa' as Tab, label: 'Ask AI', icon: MessageSquare },
    ];

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
            width: '100%',
            background: 'radial-gradient(circle at top right, #1a1e23 0%, var(--bg-primary) 40%)'
        }}>
            {/* Header / Tab Navigation */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 24px',
                borderBottom: '1px solid var(--border)',
                backgroundColor: 'rgba(0,0,0,0.2)',
            }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 16px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                                    color: isActive ? 'white' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: isActive ? 'bold' : 'normal',
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                }}
                                className={!isActive ? 'hover:bg-white/5' : ''}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Global Filters */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        value={selectedAsset}
                        onChange={e => setSelectedAsset(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            minWidth: '120px'
                        }}
                    >
                        <option value="all">All Assets</option>
                        {uniqueAssets.map(asset => (
                            <option key={asset} value={asset}>{asset}</option>
                        ))}
                    </select>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                                fontFamily: 'inherit'
                            }}
                        />
                        <span style={{ color: 'var(--text-secondary)' }}>-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '12px',
                                fontFamily: 'inherit'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Weekly Recap Tab */}
            {activeTab === 'recap' && (
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
                    <WeeklyRecap trades={globalFilteredTrades} onTradeClick={setViewingTrade} />
                </div>
            )}

            {/* Individual Review Tab */}
            {activeTab === 'individual' && (
                <div style={{ display: 'flex', flex: 1, flexDirection: 'row', alignItems: 'stretch' }}>
                    {/* Left Sidebar: Analyzed Trades List */}
                    <div style={{
                        width: '400px',
                        borderRight: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        height: 'calc(100vh - 69px)',
                        position: 'sticky',
                        top: 0,
                        backgroundColor: 'rgba(0,0,0,0.2)'
                    }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <Brain size={24} color="var(--accent)" />
                                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>AI Trade Review</h2>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                <input
                                    type="text"
                                    placeholder="Search reviews..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: '36px' }}
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {loading && <div style={{ padding: '24px', textAlign: 'center', opacity: 0.5 }}>Loading...</div>}
                            {!loading && analyzedTrades.length === 0 && (
                                <div style={{ padding: '40px 24px', textAlign: 'center' }}>
                                    <div style={{ opacity: 0.3, marginBottom: '12px' }}><Brain size={48} style={{ margin: '0 auto' }} /></div>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                                        No AI reviews found matching filters.<br />
                                        Adjust filters or go to the <b>Journal</b> to analyze more trades.
                                    </p>
                                </div>
                            )}
                            {!loading && sidebarFilteredTrades.map(trade => {
                                const analysis = trade.meta.ai_analysis;
                                const score = analysis?.score || 0;
                                return (
                                    <div
                                        key={trade.id}
                                        onClick={() => setSelectedTrade(trade)}
                                        style={{
                                            padding: '16px 24px',
                                            borderBottom: '1px solid var(--border)',
                                            cursor: 'pointer',
                                            backgroundColor: selectedTrade?.id === trade.id ? 'var(--bg-tertiary)' : 'transparent',
                                            transition: 'all 0.2s'
                                        }}
                                        className="hover:bg-white/5"
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontWeight: '600', fontSize: '15px' }}>{trade.market}</span>
                                            <div style={{
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: `${getScoreColor(score)}20`,
                                                color: getScoreColor(score),
                                                fontSize: '12px',
                                                fontWeight: 'bold',
                                                border: `1px solid ${getScoreColor(score)}40`
                                            }}>
                                                {score}/10
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', opacity: 0.7 }}>
                                            <span>{new Date(trade.entryDateTime).toLocaleDateString()}</span>
                                            <span style={{ color: (trade.pnl || 0) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                                                {trade.pnl != null ? `$${trade.pnl.toFixed(2)}` : '-'}
                                            </span>
                                        </div>
                                        {analysis?.feedback && (
                                            <p style={{
                                                margin: '8px 0 0 0',
                                                fontSize: '12px',
                                                opacity: 0.5,
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                lineHeight: '1.4'
                                            }}>
                                                {analysis.feedback}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Side: Detailed Review */}
                    <div style={{ flex: 1, overflowY: 'auto', height: 'calc(100vh - 69px)', padding: '40px' }}>
                        {!selectedTrade ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
                                <Brain size={64} style={{ opacity: 0.1 }} />
                                <div style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Select a trade to view the AI analysis</div>
                            </div>
                        ) : (
                            <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                {/* Header Stats */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <h1 style={{ margin: '0 0 8px 0', fontSize: '2.5rem', fontWeight: '800' }}>{selectedTrade.market} Review</h1>
                                        <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)' }}>
                                            <span>{new Date(selectedTrade.entryDateTime).toLocaleString()}</span>
                                            <span>•</span>
                                            <span style={{ color: selectedTrade.direction === 'Long' ? 'var(--accent)' : 'var(--danger)', fontWeight: 'bold' }}>
                                                {selectedTrade.direction.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.5, marginBottom: '4px' }}>Execution Score</div>
                                        <div style={{
                                            fontSize: '3rem',
                                            fontWeight: '900',
                                            color: getScoreColor(selectedTrade.meta.ai_analysis.score),
                                            lineHeight: 1
                                        }}>
                                            {selectedTrade.meta.ai_analysis.score}<span style={{ fontSize: '1.25rem', opacity: 0.3 }}>/10</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Stats Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                                    <div className="card" style={{ padding: '20px' }}>
                                        <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>PROFIT / LOSS</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: (selectedTrade.pnl || 0) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                                            ${(selectedTrade.pnl || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="card" style={{ padding: '20px' }}>
                                        <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>ACHIEVED R</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                            {(selectedTrade.achievedR || 0).toFixed(2)}R
                                        </div>
                                    </div>
                                    <div className="card" style={{ padding: '20px' }}>
                                        <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>SETUP</div>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{selectedTrade.setup || 'Not Set'}</div>
                                    </div>
                                    <div className="card" style={{ padding: '20px' }}>
                                        <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px' }}>MISTAKES</div>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {selectedTrade.mistakes && selectedTrade.mistakes.length > 0 ? (
                                                selectedTrade.mistakes.map(m => (
                                                    <span key={m} style={{ fontSize: '11px', padding: '2px 8px', backgroundColor: 'var(--danger)20', color: 'var(--danger)', borderRadius: '4px', border: '1px solid var(--danger)40' }}>
                                                        {m}
                                                    </span>
                                                ))
                                            ) : <span style={{ opacity: 0.5 }}>None</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* AI Section */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
                                    <div className="card" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}><Brain size={120} /></div>
                                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '24px' }}>
                                            <Brain size={20} color="var(--accent)" />
                                            AI Feedback
                                        </h3>
                                        <p style={{ fontSize: '1.1rem', lineHeight: '1.6', margin: 0 }}>
                                            {selectedTrade.meta.ai_analysis.feedback}
                                        </p>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        <div className="card" style={{ padding: '24px', backgroundColor: 'var(--accent)05', border: '1px solid var(--accent)20' }}>
                                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', fontSize: '14px', color: 'var(--accent)' }}>
                                                <Target size={16} />
                                                Psychology Check
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', opacity: 0.8 }}>
                                                {selectedTrade.meta.ai_analysis.psychology_check}
                                            </p>
                                        </div>

                                        <div className="card" style={{ padding: '24px', backgroundColor: '#eab30805', border: '1px solid #eab30820' }}>
                                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px 0', fontSize: '14px', color: '#eab308' }}>
                                                <Zap size={16} />
                                                Improvement Tip
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5', opacity: 0.8 }}>
                                                {selectedTrade.meta.ai_analysis.improvement_tip}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Chart Section */}
                                {(selectedTrade.images && selectedTrade.images.length > 0) && (
                                    <div style={{ marginTop: '16px' }}>
                                        <h3 style={{ marginBottom: '20px', opacity: 0.7 }}>Execution Charts</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                            {selectedTrade.images.map((url: string, idx: number) => {
                                                let imgSrc = url;
                                                if (url.startsWith('local://')) {
                                                    imgSrc = resolvedImages[idx] || '';
                                                } else if (url.includes('bookmap.com/s/') && !url.includes('image.php')) {
                                                    const parts = url.split('/');
                                                    const id = parts[parts.length - 1]?.split('?')[0];
                                                    if (id && id.length > 5) {
                                                        imgSrc = `https://bookmap.com/s/image.php?id=${id}`;
                                                    }
                                                }

                                                return (
                                                    <div key={idx} className="card" style={{ overflow: 'hidden', padding: '12px' }}>
                                                        <ErrorBoundary>
                                                            <AnnotatedImage
                                                                src={imgSrc}
                                                                annotations={(selectedTrade.imageAnnotations || {})[idx]}
                                                                alt={`Chart ${idx + 1}`}
                                                                style={{ width: '100%', borderRadius: '8px', display: 'block' }}
                                                            />
                                                        </ErrorBoundary>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Trader Notes */}
                                {selectedTrade.notesRaw && (
                                    <div className="card" style={{ padding: '32px' }}>
                                        <h3 style={{ margin: '0 0 20px 0', opacity: 0.7 }}>Trader's Context</h3>
                                        <div style={{
                                            fontSize: '15px',
                                            lineHeight: '1.6',
                                            padding: '20px',
                                            borderRadius: '8px',
                                            backgroundColor: 'rgba(255,255,255,0.03)',
                                            whiteSpace: 'pre-wrap'
                                        }}>
                                            {selectedTrade.notesRaw}
                                        </div>
                                    </div>
                                )}

                                <div style={{ height: '80px' }} />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'patterns' && <BehavioralPatterns trades={globalFilteredTrades} />}
            {activeTab === 'execution' && <ExecutionQuality trades={globalFilteredTrades} onSelectTrade={setViewingTrade} />}
            {activeTab === 'projections' && <MonteCarloProjections trades={globalFilteredTrades} />}
            {activeTab === 'qa' && (
                <TradeQA
                    trades={globalFilteredTrades}
                    onNavigateToTrade={(tradeId) => {
                        const trade = trades.find(t => t.id === tradeId);
                        if (trade) {
                            setSelectedTrade(trade);
                            setActiveTab('individual');
                        }
                    }}
                />
            )}
            {activeTab === 'heatmap' && <MistakeHeatmap trades={globalFilteredTrades} />}

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
