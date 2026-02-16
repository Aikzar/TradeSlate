import { X, FileText, BarChart3, Zap, GraduationCap, Target, TrendingUp } from 'lucide-react';

interface StrategyGuideModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function StrategyGuideModal({ isOpen, onClose }: StrategyGuideModalProps) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                zIndex: 2000,
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%', maxWidth: '800px', maxHeight: '90vh',
                    borderRadius: '24px', overflow: 'hidden',
                    background: 'rgba(23, 23, 23, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    display: 'flex', flexDirection: 'column',
                    animation: 'modalEnter 0.3s ease-out'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.03)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <GraduationCap size={24} color="var(--accent)" />
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '0.02em', color: 'var(--text-primary)' }}>
                            INSTITUTIONAL BIAS: THE BLUEPRINT
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Section 1: Data Source */}
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent)' }}>
                            <FileText size={18} />
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                1. THE DATA SOURCE
                            </h3>
                        </div>
                        <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>Source:</strong> CFTC "Commitments of Traders" (COT) Report.</li>
                                <li style={{ marginBottom: '8px' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>Who We Track:</strong>
                                    <ul style={{ marginTop: '4px' }}>
                                        <li><strong style={{ color: 'var(--text-primary)' }}>Financials:</strong> "Leveraged Funds" (Hedge Funds/Speculators).</li>
                                        <li><strong style={{ color: 'var(--text-primary)' }}>Commodities:</strong> "Managed Money".</li>
                                    </ul>
                                </li>
                                <li style={{ marginBottom: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>The Time Lag:</strong> Data represents positions held on <strong style={{ color: 'var(--text-primary)' }}>Tuesday</strong> but is released on <strong style={{ color: 'var(--text-primary)' }}>Friday</strong>.</li>
                            </ul>
                            <p style={{ margin: 0, fontStyle: 'italic', opacity: 0.8 }}><strong style={{ color: 'var(--accent)' }}>Pro Tip:</strong> When analyzing a signal, look at the price action on <strong style={{ color: 'var(--text-primary)' }}>Tuesday</strong> to see if "Smart Money" left footprints on the chart.</p>
                        </div>
                    </section>

                    {/* Section 2: Metrics */}
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent)' }}>
                            <BarChart3 size={18} />
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                2. THE METRICS
                            </h3>
                        </div>
                        <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                <li style={{ marginBottom: '4px' }}><strong style={{ color: 'var(--text-primary)' }}>Net Position:</strong> Total Longs minus Total Shorts.</li>
                                <li style={{ marginBottom: '4px' }}><strong style={{ color: 'var(--text-primary)' }}>Net % (Conviction):</strong> (Net Position / Open Interest). This tells us how "crowded" the trade is.</li>
                                <li style={{ marginBottom: '4px' }}>
                                    <strong style={{ color: 'var(--text-primary)' }}>Delta (Momentum):</strong> The change in sentiment since last week.
                                    <ul style={{ marginTop: '4px' }}>
                                        <li><strong style={{ color: '#86efac' }}>Green Delta:</strong> They are buying more.</li>
                                        <li><strong style={{ color: '#fca5a5' }}>Red Delta:</strong> They are selling.</li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 3: Signals */}
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent)' }}>
                            <Zap size={18} />
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                3. THE SIGNALS
                            </h3>
                        </div>
                        <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <p style={{ margin: 0 }}>🟢 <strong style={{ color: '#86efac' }}>STRONG LONG:</strong> Net % is <strong style={{ color: 'var(--text-primary)' }}>Positive (+)</strong> AND Delta is <strong style={{ color: 'var(--text-primary)' }}>Positive (+)</strong>.</p>
                            <p style={{ margin: 0 }}>🔴 <strong style={{ color: '#fca5a5' }}>STRONG SHORT:</strong> Net % is <strong style={{ color: 'var(--text-primary)' }}>Negative (-)</strong> AND Delta is <strong style={{ color: 'var(--text-primary)' }}>Negative (-)</strong>.</p>
                            <p style={{ margin: 0 }}>⚠️ <strong style={{ color: '#fde047' }}>COT FLIP (Gold):</strong> The most powerful signal. When institutions flip from Net Short to Net Long (or vice versa). Signals a potential trend reversal.</p>
                            <p style={{ margin: 0 }}>⚪ <strong style={{ color: 'var(--text-primary)' }}>DIVERGENCE:</strong> When price and momentum disagree (e.g., Net Long but Selling). Stand aside.</p>
                        </div>
                    </section>

                    {/* Section 4: Pick a Pair */}
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent)' }}>
                            <Target size={18} />
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                4. HOW TO PICK A PAIR
                            </h3>
                        </div>
                        <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>The Golden Rule:</strong> Pair the <strong style={{ color: 'var(--text-primary)' }}>Strongest</strong> currency against the <strong style={{ color: 'var(--text-primary)' }}>Weakest</strong>.</p>
                            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Formula:</strong> <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>[Strong Currency] / [Weak Currency]</code></p>
                            <div>
                                <strong style={{ color: 'var(--text-primary)' }}>Example:</strong>
                                <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>AUD</strong> is Strong (+40%).</li>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>CAD</strong> is Weak (-50%).</li>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>Trade:</strong> <strong style={{ color: 'var(--accent)' }}>LONG AUD/CAD</strong> (Buy AUD, Sell CAD).</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 5: Strength Index */}
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent)' }}>
                            <TrendingUp size={18} />
                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                5. THE STRENGTH INDEX (SCORING)
                            </h3>
                        </div>
                        <div style={{ paddingLeft: '12px', borderLeft: '2px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>What is it?</strong> A score that measures the "Edge" of a specific pair.</p>
                            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Formula:</strong> <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>(Base Net %) - (Quote Net %)</code>.</p>
                            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>The 25 Rule:</strong> Only take trades where the Score is extreme.</p>
                            <ul style={{ margin: 0, paddingLeft: '20px' }}>
                                <li style={{ marginBottom: '4px' }}><strong style={{ color: 'var(--text-primary)' }}>LONG Signal:</strong> Score must be <strong style={{ color: '#86efac' }}>&gt; +25</strong>.</li>
                                <li style={{ marginBottom: '4px' }}><strong style={{ color: 'var(--text-primary)' }}>SHORT Signal:</strong> Score must be <strong style={{ color: '#fca5a5' }}>&lt; -25</strong>.</li>
                            </ul>
                            <div style={{ marginTop: '8px' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Real World Example:</strong>
                                <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                                    <li>AUD (+43%) minus CAD (-58%) = <strong style={{ color: 'var(--accent)' }}>101</strong>.</li>
                                    <li><strong style={{ color: 'var(--text-primary)' }}>Score: 101</strong> (Massive Edge → Strong Buy).</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <div style={{ padding: '20px 32px', background: 'rgba(255, 255, 255, 0.02)', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        className="btn btn-primary"
                        style={{ padding: '8px 24px' }}
                    >
                        Got it, thanks!
                    </button>
                </div>
            </div>
            <style>
                {`
                @keyframes modalEnter {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                `}
            </style>
        </div>
    );
}
