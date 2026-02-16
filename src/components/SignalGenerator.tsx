import { COTDataPoint } from '../types';
import { TrendingUp, TrendingDown, Target } from 'lucide-react';

interface SignalGeneratorProps {
    data: COTDataPoint[];
}

const TRADABLE_PAIRS = [
    // MAJOR PAIRS
    { pair: "EUR/USD", base: "EUR", quote: "USD" },
    { pair: "GBP/USD", base: "GBP", quote: "USD" },
    { pair: "AUD/USD", base: "AUD", quote: "USD" },
    { pair: "NZD/USD", base: "NZD", quote: "USD" },
    { pair: "USD/CAD", base: "USD", quote: "CAD" },
    { pair: "USD/CHF", base: "USD", quote: "CHF" },
    { pair: "USD/JPY", base: "USD", quote: "JPY" },

    // CROSS PAIRS (High Probability)
    { pair: "EUR/JPY", base: "EUR", quote: "JPY" },
    { pair: "GBP/JPY", base: "GBP", quote: "JPY" },
    { pair: "AUD/JPY", base: "AUD", quote: "JPY" },
    { pair: "AUD/CAD", base: "AUD", quote: "CAD" },
    { pair: "EUR/AUD", base: "EUR", quote: "AUD" },
    { pair: "GBP/AUD", base: "GBP", quote: "AUD" },
    { pair: "AUD/NZD", base: "AUD", quote: "NZD" },
];

export function SignalGenerator({ data }: SignalGeneratorProps) {
    if (!data || data.length === 0) return null;

    // 1. Identify Strongest and Weakest Currencies
    // Strict criteria: Must be POSITIVE Net % to be Strong, NEGATIVE to be Weak.
    // Ideally we confirm with Delta too, but user prompt says "Signal = STRONG LONG...".
    // Let's use Net % threshold or just relative strength?
    // User Example: "AUD Strong (+43%), CAD Weak (-58%)."
    // So we just need positive vs negative bias.
    // But stronger signals come from Strong Long vs Strong Short.

    // Let's build a map of currency strength
    // We need to map "AUD" -> { net: 43, signal: 'STRONG LONG' }
    // The contract names might vary ("AUSTRALIAN DOLLAR", "AUD").
    // We need a mapping helper or rely on "contract" property matching Base/Quote.
    // The `data` has `contract` name e.g. "USD Index", "EUR", "GBP", "JPY", "CAD", "AUD", "NZD", "CHF", "MXN", "BRL".

    const currencyMap: Record<string, COTDataPoint> = {};

    data.forEach(d => {
        // Normalize names to match TRADABLE_PAIRS
        let code = d.contract;
        if (d.contract === 'USD Index') code = 'USD';
        if (d.contract === 'JAPANESE YEN') code = 'JPY'; // usually just JPY in my map
        // My map uses: EUR, GBP, JPY, CHF, CAD, AUD, NZD, MXN, BRL. 
        // So they match directly mostly.

        currencyMap[code] = d;
    });

    const signals: Array<{ pair: string, direction: 'LONG' | 'SHORT', strengthGap: number, base: string, quote: string }> = [];

    TRADABLE_PAIRS.forEach(p => {
        const base = currencyMap[p.base];
        const quote = currencyMap[p.quote];

        if (!base || !quote) return;

        const baseNet = base.net_pct_current;
        const quoteNet = quote.net_pct_current;

        // Strength Gap calculation
        // If Long Base, Short Quote: Gap = Base - Quote (Expected Positive)
        // If Short Base, Long Quote: Gap = Quote - Base (Expected Positive for Short?)
        // User says: "AUD +43% minus CAD -58% = 101% Strength Gap"
        // So Strength Gap = Base Net% - Quote Net%.

        const gap = baseNet - quoteNet;

        // Check Conditions
        // BUY SIGNAL: Base Strong (>0), Quote Weak (<0)
        // SELL SIGNAL: Base Weak (<0), Quote Strong (>0)
        // Or broadly: Just use the gap?
        // User Logic: 
        // "BUY SIGNAL: If Base is Strong AND Quote is Weak."
        // "SELL SIGNAL: If Base is Weak AND Quote is Strong."

        // Define Strong as > 0, Weak as < 0?
        // Or "STRONG LONG" signal from parser?
        // Let's use Net % > 0 as Strong, < 0 as Weak for basic version.
        // We can check `is_flip` too.

        const isBaseStrong = baseNet > 0 || base.is_flip;
        const isBaseWeak = baseNet < 0;
        const isQuoteStrong = quoteNet > 0 || quote.is_flip;
        const isQuoteWeak = quoteNet < 0;

        if (isBaseStrong && isQuoteWeak) {
            const strengthGap = Math.abs(gap);
            if (strengthGap >= 25) {
                signals.push({
                    pair: p.pair,
                    direction: 'LONG',
                    strengthGap,
                    base: p.base,
                    quote: p.quote
                });
            }
        } else if (isBaseWeak && isQuoteStrong) {
            const strengthGap = Math.abs(gap);
            if (strengthGap >= 25) {
                signals.push({
                    pair: p.pair,
                    direction: 'SHORT',
                    strengthGap,
                    base: p.base,
                    quote: p.quote
                });
            }
        }
    });

    // Sort by Strength Gap
    signals.sort((a, b) => b.strengthGap - a.strengthGap);

    if (signals.length === 0) return null;

    return (
        <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <div style={{
                    padding: '8px', borderRadius: '8px',
                    background: 'rgba(96, 165, 250, 0.2)', border: '1px solid rgba(96, 165, 250, 0.3)',
                    display: 'flex'
                }}>
                    <Target size={20} color="#60a5fa" />
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Generated Trade Signals
                    </h3>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Algorithmic pairing based on currency strength differentials
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {signals.map((s, i) => (
                    <div key={i} style={{
                        padding: '16px', borderRadius: '12px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    fontWeight: 700, fontSize: '16px',
                                    color: s.direction === 'LONG' ? 'var(--accent)' : 'var(--danger)'
                                }}>
                                    {s.direction} {s.pair}
                                </span>
                                {s.direction === 'LONG'
                                    ? <TrendingUp size={16} color="var(--accent)" />
                                    : <TrendingDown size={16} color="var(--danger)" />
                                }
                            </div>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {s.direction === 'LONG'
                                    ? `Buy ${s.base} / Sell ${s.quote}`
                                    : `Sell ${s.base} / Buy ${s.quote}`
                                }
                            </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {s.strengthGap.toFixed(0)}%
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                Strength Gap
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
