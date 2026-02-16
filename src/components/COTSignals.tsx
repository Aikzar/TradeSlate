import { COTDataPoint } from '../types';
import { Flame, Eye, Target } from 'lucide-react';

interface COTSignalsProps {
    data: COTDataPoint[];
}

export function COTSignals({ data }: COTSignalsProps) {
    if (!data || data.length === 0) return null;

    // Use ALL data passed in (already filtered by category in parent)
    // Sort by Net % to find strongest positions
    const sortedByStrength = [...data].sort((a, b) => b.net_pct_current - a.net_pct_current);

    // Find Best Long: Highest positive Net % AND positive Delta (Agreement Rule)
    const bestLong = sortedByStrength.find(d => d.net_pct_current > 0 && d.delta > 0);

    // Find Best Short: Lowest negative Net % AND negative Delta (Agreement Rule)
    const sortedAsc = [...data].sort((a, b) => a.net_pct_current - b.net_pct_current);
    const bestShort = sortedAsc.find(d => d.net_pct_current < 0 && d.delta < 0);

    // Find all flips for watchlist
    const flips = data.filter(d => d.is_flip);

    // Determine recommended pair
    let recommendedPair = '';
    let pairDetail = '';
    if (bestLong && bestShort) {
        // For Forex, create a tradeable pair; for other categories show both
        const isBothForex = bestLong.category === 'Forex' && bestShort.category === 'Forex';
        if (isBothForex) {
            recommendedPair = `Long ${bestLong.contract}${bestShort.contract}`;
            pairDetail = `Buy ${bestLong.contract} / Sell ${bestShort.contract}`;
        } else {
            recommendedPair = `Long ${bestLong.contract}`;
            pairDetail = `Short ${bestShort.contract}`;
        }
    }

    // Determine category label for subtitle
    const category = data.length > 0 && data[0].category ? data[0].category : 'All';
    const subtitle = category === 'Forex'
        ? 'Based on Leveraged Fund positioning & momentum (Majors Only)'
        : `Based on Leveraged Fund positioning & momentum (${category})`;

    return (
        <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(239, 68, 68, 0.2))',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex'
                }}>
                    <Target size={20} color="var(--text-primary)" />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Institutional Trade Plan
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {subtitle}
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {/* Best Long */}
                <SignalCard
                    icon={<Flame size={18} color="var(--accent)" />}
                    label="🔥 BEST LONG"
                    value={bestLong?.contract || 'None'}
                    detail={bestLong ? `+${bestLong.net_pct_current.toFixed(1)}% | Δ+${bestLong.delta.toFixed(1)}%` : 'No confirmed bullish setup'}
                    color="var(--accent)"
                    highlight={!!bestLong}
                />

                {/* Best Short */}
                <SignalCard
                    icon={<Flame size={18} color="var(--danger)" />}
                    label="🔥 BEST SHORT"
                    value={bestShort?.contract || 'None'}
                    detail={bestShort ? `${bestShort.net_pct_current.toFixed(1)}% | Δ${bestShort.delta.toFixed(1)}%` : 'No confirmed bearish setup'}
                    color="var(--danger)"
                    highlight={!!bestShort}
                />

                {/* Recommended Pair */}
                <SignalCard
                    icon={<Target size={18} color="#60a5fa" />}
                    label="✅ RECOMMENDED PAIR"
                    value={recommendedPair || 'N/A'}
                    detail={pairDetail || 'Insufficient setups'}
                    color="#60a5fa"
                    highlight={!!recommendedPair}
                    large
                />

                {/* Watchlist (Flips) */}
                <SignalCard
                    icon={<Eye size={18} color="#eab308" />}
                    label="⚠️ WATCHLIST (FLIPS)"
                    value={flips.length > 0 ? flips.map(f => f.contract).join(', ') : 'None'}
                    detail={flips.length > 0 ? 'Sentiment reversal detected' : 'No COT flips this week'}
                    color="#eab308"
                    highlight={flips.length > 0}
                />
            </div>
        </div>
    );
}

interface SignalCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    detail: string;
    color: string;
    highlight?: boolean;
    large?: boolean;
}

function SignalCard({ icon, label, value, detail, color, highlight, large }: SignalCardProps) {
    return (
        <div style={{
            background: highlight ? 'rgba(39, 39, 42, 0.6)' : 'rgba(39, 39, 42, 0.3)',
            borderRadius: '8px',
            padding: '16px',
            border: `1px solid ${highlight ? color + '33' : 'rgba(255,255,255,0.05)'}`,
            gridColumn: large ? 'span 2' : 'span 1'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {icon}
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {label}
                </span>
            </div>
            <div style={{
                fontSize: large ? '24px' : '20px',
                fontWeight: 700,
                color: highlight ? color : 'var(--text-secondary)',
                marginBottom: '4px'
            }}>
                {value}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {detail}
            </div>
        </div>
    );
}
