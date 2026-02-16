import { Trade } from '../types';
import { AnnotatedImage } from './AnnotatedImage';

export interface ReviewTrade {
    tradeId: string;
    imageUrl: string | null;
    title?: string;
    conclusion: string;
    tip: string;
}

interface HighlightCardProps {
    trade: Trade;
    review?: ReviewTrade;
    type: 'best' | 'worst';
    onClick: () => void;
    condensed?: boolean;
    compact?: boolean; // New prop for Home Widget specifically (cards but smaller)
}

export function HighlightCard({ trade, review, type, onClick, condensed = false, compact = false }: HighlightCardProps) {
    const isBest = type === 'best';
    const accentColor = isBest ? 'var(--accent)' : 'var(--danger)';

    // Background Image
    const bgImage = review?.imageUrl || (trade.images && trade.images.length > 0 ? trade.images[0] : null);

    // Title Logic
    const title = review?.title || trade.market;

    // Subtitle Logic
    const date = new Date(trade.entryDateTime);
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const subtitle = compact
        ? `${dateStr} • ${trade.direction} • ${trade.pnl ? '$' + trade.pnl.toFixed(0) : '-'}`
        : `${dateStr}, ${timeStr} | ${trade.market} | ${trade.direction} | ${trade.pnl ? '$' + trade.pnl.toFixed(2) : '-'} (${trade.achievedR ? trade.achievedR.toFixed(2) + 'R' : '-'})`;

    const width = compact ? '100%' : (condensed ? '100%' : '320px');
    const height = compact ? '120px' : (condensed ? '80px' : '200px');

    return (
        <div
            onClick={onClick}
            style={{
                width: width,
                minWidth: (compact || condensed) ? '0' : '320px',
                height: height,
                borderRadius: '12px',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                border: condensed ? '1px solid var(--border)' : 'none',
                backgroundColor: 'var(--bg-secondary)',
                marginTop: condensed ? '8px' : '0'
            }}
            className="hover:opacity-90 transition-opacity"
        >
            {/* Background Image Layer - Show for compact mode too! */}
            {!condensed && (
                <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
                    {bgImage ? (
                        <AnnotatedImage
                            src={bgImage}
                            alt={title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            annotations={trade.imageAnnotations?.[0]} // Assuming first image match
                        />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #000, #333)' }} />
                    )}
                </div>
            )}

            {/* Gradient Overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: condensed ? 'transparent' : `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%)`,
                border: condensed ? 'none' : `1px solid ${accentColor}40`,
                borderRadius: '12px'
            }} />

            {/* Content */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: (condensed || compact) ? '12px' : '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: condensed ? 'center' : 'flex-end',
                height: '100%'
            }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: (condensed || compact) ? '14px' : '18px',
                            marginBottom: '4px',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {title}
                        </div>
                        <div style={{
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {subtitle}
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Badge (if reviewed) */}
            {review && !condensed && (
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: accentColor,
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                    AI
                </div>
            )}
        </div>
    );
}
