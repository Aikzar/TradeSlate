import { COTDataPoint } from '../types';
import { Flame, Eye, Target, TrendingUp } from 'lucide-react';

interface COTQuickSignalsProps {
    data: COTDataPoint[];
}

export function COTQuickSignals({ data }: COTQuickSignalsProps) {
    if (!data || data.length === 0) return null;

    // Use Forex data for the trade plan if possible, otherwise use what's available
    const forexData = data.filter(d => d.category === 'Forex');
    const signalsData = forexData.length > 0 ? forexData : data;

    // Logic identical to COTSignals.tsx but simplified UI
    const sortedByStrength = [...signalsData].sort((a, b) => b.net_pct_current - a.net_pct_current);
    const bestLong = sortedByStrength.find(d => d.net_pct_current > 0 && d.delta > 0);

    const sortedAsc = [...signalsData].sort((a, b) => a.net_pct_current - b.net_pct_current);
    const bestShort = sortedAsc.find(d => d.net_pct_current < 0 && d.delta < 0);

    const flips = signalsData.filter(d => d.is_flip);

    let recommendedPair = '';
    if (bestLong && bestShort && bestLong.category === 'Forex' && bestShort.category === 'Forex') {
        recommendedPair = `Long ${bestLong.contract}${bestShort.contract}`;
    }

    return (
        <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Target size={18} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                    Institutional Bias Recommendations
                </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Recommended Pair (Priority) */}
                {recommendedPair && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'rgba(96, 165, 250, 0.1)',
                        border: '1px solid rgba(96, 165, 250, 0.2)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ fontSize: '10px', color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase' }}>Recommended Pair</div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>{recommendedPair}</div>
                        </div>
                        <TrendingUp size={20} color="#60a5fa" />
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Best Long */}
                    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <Flame size={12} color="var(--accent)" />
                            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>BEST LONG</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: bestLong ? 'var(--accent)' : 'var(--text-secondary)' }}>
                            {bestLong?.contract || 'None'}
                        </div>
                    </div>

                    {/* Best Short */}
                    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <Flame size={12} color="var(--danger)" />
                            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>BEST SHORT</span>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: bestShort ? 'var(--danger)' : 'var(--text-secondary)' }}>
                            {bestShort?.contract || 'None'}
                        </div>
                    </div>
                </div>

                {/* COT Flips */}
                {flips.length > 0 && (
                    <div style={{ padding: '10px', borderRadius: '8px', background: 'rgba(234, 179, 8, 0.05)', border: '1px solid rgba(234, 179, 8, 0.1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                            <Eye size={12} color="#eab308" />
                            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-secondary)' }}>COT FLIPS</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#eab308' }}>
                            {flips.map(f => f.contract).join(', ')}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
