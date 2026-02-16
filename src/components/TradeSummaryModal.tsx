import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Trade } from '../types';
import { Edit, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react';
import { AnnotatedImage } from './AnnotatedImage';
import { DrawAction } from './ImageEditor';
import { getDisplayImageUrl } from '../utils/imageUtils';

interface Props {
    trade: Trade;
    onClose: () => void;
    onEdit: (tradeId: string) => void;
}

export function TradeSummaryModal({ trade, onClose, onEdit }: Props) {
    const isWin = (trade.pnl || 0) >= 0;
    const [notesExpanded, setNotesExpanded] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewIdx, setPreviewIdx] = useState<number | null>(null);
    const [resolvedImages, setResolvedImages] = useState<Record<number, string>>({});

    // Resolve local:// paths to file:// URLs for display
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

    // Resolve local images when images array changes
    useEffect(() => {
        const safeImages = Array.isArray(trade.images) ? trade.images : [];
        safeImages.forEach((url: string, idx: number) => {
            if (url.startsWith('local://') && !resolvedImages[idx]) {
                resolveImageSrc(url, idx);
            }
        });
    }, [trade.images, resolveImageSrc, resolvedImages]);

    // Safe arrays
    const safeTags = Array.isArray(trade.tags) ? trade.tags : [];
    const safeMistakes = Array.isArray(trade.mistakes) ? trade.mistakes : [];
    const safeImages = Array.isArray(trade.images) ? trade.images : [];

    const hasMistakes = safeMistakes.length > 0;
    const notesText = trade.notesRaw || '';
    const shouldTruncateNotes = notesText.length > 150;

    return createPortal(
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                zIndex: 9999
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '600px',
                    maxHeight: '90vh',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-tertiary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Status Indicator */}
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: hasMistakes ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: hasMistakes ? 'var(--danger)' : 'var(--accent)'
                        }}>
                            {hasMistakes ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
                        </div>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* Direction Arrow + Market */}
                                <span style={{
                                    fontSize: '20px',
                                    color: trade.direction === 'Long' ? 'var(--accent)' : 'var(--danger)'
                                }}>
                                    {trade.direction === 'Long' ? '↑' : '↓'}
                                </span>
                                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 'bold' }}>{trade.market}</h2>
                                <span style={{
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    textTransform: 'uppercase',
                                    backgroundColor: trade.direction === 'Long' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                    color: trade.direction === 'Long' ? 'var(--accent)' : 'var(--danger)'
                                }}>
                                    {trade.direction}
                                </span>
                            </div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
                                {new Date(trade.entryDateTime).toLocaleString()}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                onClick={() => onEdit(trade.id)}
                            >
                                <Edit size={14} />
                                Edit
                            </button>
                            <button
                                className="btn"
                                style={{ padding: '6px 10px' }}
                                onClick={onClose}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* PnL prominent */}
                        <div style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: isWin ? 'var(--accent)' : 'var(--danger)'
                        }}>
                            {trade.pnl != null ? `$${trade.pnl.toFixed(2)}` : '-'}
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

                    {/* Primary Metrics Row */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '16px',
                        marginBottom: '20px'
                    }}>
                        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Setup</div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>{trade.setup || '-'}</div>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Trigger</div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>{trade.entryTrigger || '-'}</div>
                        </div>
                        <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Contracts</div>
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>{trade.contracts}</div>
                        </div>
                    </div>

                    {/* Trade Details Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px',
                        marginBottom: '20px'
                    }}>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Entry Price</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>{trade.entryPrice}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Exit Price</div>
                            <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>{trade.exitPrice || '-'}</div>
                        </div>
                        {trade.plannedSL && (
                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Planned SL</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>{trade.plannedSL}</div>
                            </div>
                        )}
                        {trade.plannedTP && (
                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>Planned TP</div>
                                <div style={{ fontFamily: 'monospace', fontSize: '14px' }}>{trade.plannedTP}</div>
                            </div>
                        )}
                        {trade.maePrice && (
                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>MAE Price</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{trade.maePrice}</span>
                                    {(trade.initialSL || trade.plannedSL) && trade.entryPrice !== (trade.initialSL || trade.plannedSL) && (
                                        <span style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600 }}>
                                            ({(trade.direction === 'Long'
                                                ? (trade.entryPrice - trade.maePrice) / Math.abs(trade.entryPrice - (trade.initialSL || trade.plannedSL)!)
                                                : (trade.maePrice - trade.entryPrice) / Math.abs(trade.entryPrice - (trade.initialSL || trade.plannedSL)!)
                                            ).toFixed(2)}R)
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        {trade.mfePrice && (
                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '2px' }}>MFE Price</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '14px' }}>{trade.mfePrice}</span>
                                    {(trade.initialSL || trade.plannedSL) && trade.entryPrice !== (trade.initialSL || trade.plannedSL) && (
                                        <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>
                                            ({(trade.direction === 'Long'
                                                ? (trade.mfePrice - trade.entryPrice) / Math.abs(trade.entryPrice - (trade.initialSL || trade.plannedSL)!)
                                                : (trade.entryPrice - trade.mfePrice) / Math.abs(trade.entryPrice - (trade.initialSL || trade.plannedSL)!)
                                            ).toFixed(2)}R)
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tags Section */}
                    {safeTags.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Tags</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {safeTags.map((tag, i) => (
                                    <span key={i} style={{
                                        padding: '4px 10px',
                                        borderRadius: '9999px',
                                        fontSize: '11px',
                                        fontWeight: '500',
                                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                                        color: '#60a5fa',
                                        border: '1px solid rgba(59, 130, 246, 0.3)'
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mistakes Section */}
                    {safeMistakes.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Mistakes</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {safeMistakes.map((mistake, i) => (
                                    <span key={i} style={{
                                        padding: '4px 10px',
                                        borderRadius: '9999px',
                                        fontSize: '11px',
                                        fontWeight: '500',
                                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                        color: '#f87171',
                                        border: '1px solid rgba(239, 68, 68, 0.3)'
                                    }}>
                                        ⚠️ {mistake}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Journal Notes */}
                    {notesText && (
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Journal Notes</div>
                            <div style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                padding: '12px',
                                borderRadius: '8px',
                                fontSize: '13px',
                                lineHeight: '1.5',
                                color: 'var(--text-primary)',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {shouldTruncateNotes && !notesExpanded
                                    ? notesText.slice(0, 150) + '...'
                                    : notesText
                                }
                                {shouldTruncateNotes && (
                                    <button
                                        onClick={() => setNotesExpanded(!notesExpanded)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'var(--accent)',
                                            cursor: 'pointer',
                                            padding: '4px 0',
                                            marginLeft: '8px',
                                            fontSize: '12px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        {notesExpanded ? (
                                            <>Show less <ChevronUp size={12} /></>
                                        ) : (
                                            <>Read more <ChevronDown size={12} /></>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Images Section */}
                    {safeImages.length > 0 && (
                        <div>
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Charts / Snapshots ({safeImages.length})
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
                                {safeImages.map((url, idx) => {
                                    const imageAnnotations = (trade.imageAnnotations || {})[idx] as DrawAction[] | undefined;
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                const imgSrc = url.startsWith('local://') ? resolvedImages[idx] || '' : getDisplayImageUrl(url);
                                                setPreviewUrl(imgSrc);
                                                setPreviewIdx(idx);
                                            }}
                                            style={{
                                                aspectRatio: '16/9',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                border: '1px solid var(--border)',
                                                position: 'relative'
                                            }}
                                        >
                                            <AnnotatedImage
                                                src={url.startsWith('local://') ? resolvedImages[idx] || '' : getDisplayImageUrl(url)}
                                                annotations={imageAnnotations}
                                                alt={`Chart ${idx + 1}`}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    transition: 'transform 0.2s'
                                                }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                backgroundColor: 'rgba(0,0,0,0.4)',
                                                opacity: 0,
                                                transition: 'all 0.3s ease',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backdropFilter: 'blur(4px)'
                                            }}
                                                className="hover-overlay"
                                                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                                                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Video Thumbnail - Opens in Browser */}
                    {(() => {
                        const url = trade.videoUrl;
                        if (!url) return null;
                        try {
                            const u = new URL(url);
                            let videoId = '';
                            let start = 0;

                            if (u.hostname.includes('youtube.com')) {
                                videoId = u.searchParams.get('v') || '';
                            } else if (u.hostname.includes('youtu.be')) {
                                videoId = u.pathname.slice(1);
                            }

                            // Clean ID
                            if (videoId) videoId = videoId.replace(/\/$/, '');

                            const t = u.searchParams.get('t');
                            if (t) {
                                const m = t.match(/(\d+)m/);
                                const s = t.match(/(\d+)s/);
                                if (m) start += parseInt(m[1]) * 60;
                                if (s) start += parseInt(s[1]);
                                if (!m && !s && !isNaN(parseInt(t))) start = parseInt(t);
                            }

                            if (!videoId) return null;

                            const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                            const watchUrl = `https://www.youtube.com/watch?v=${videoId}${start > 0 ? `&t=${start}` : ''}`;
                            const timeLabel = start > 0 ? `${Math.floor(start / 60)}:${String(start % 60).padStart(2, '0')}` : null;

                            return (
                                <div style={{ marginTop: '20px' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                        Video Recording
                                    </div>
                                    <a
                                        href={watchUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            aspectRatio: '16/9',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            border: '1px solid var(--border)',
                                            backgroundColor: 'black',
                                            position: 'relative',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <img
                                            src={thumbnailUrl}
                                            alt="Video Thumbnail"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                                            }}
                                        />
                                        {/* Play Button */}
                                        <div style={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: 'rgba(0,0,0,0.3)'
                                        }}>
                                            <div style={{
                                                width: '64px',
                                                height: '64px',
                                                backgroundColor: '#dc2626',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                                            }}>
                                                <svg style={{ width: '32px', height: '32px', color: 'white', marginLeft: '4px' }} fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M8 5v14l11-7z" />
                                                </svg>
                                            </div>
                                        </div>
                                        {/* Time Badge */}
                                        {timeLabel && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '12px',
                                                right: '12px',
                                                backgroundColor: 'rgba(0,0,0,0.8)',
                                                color: 'white',
                                                fontSize: '12px',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontFamily: 'monospace'
                                            }}>
                                                ▶ {timeLabel}
                                            </div>
                                        )}
                                        {/* Click Hint */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '12px',
                                            left: '12px',
                                            backgroundColor: 'rgba(0,0,0,0.8)',
                                            color: 'white',
                                            fontSize: '11px',
                                            padding: '4px 8px',
                                            borderRadius: '4px'
                                        }}>
                                            Click to open in browser
                                        </div>
                                    </a>
                                </div>
                            );
                        } catch (e) {
                            return null;
                        }
                    })()}
                </div>
            </div>

            {/* Image Lightbox */}
            {previewUrl && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 10000,
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        backdropFilter: 'blur(24px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '32px',
                        cursor: 'zoom-out'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        setPreviewUrl(null);
                    }}
                >
                    <button
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            padding: '12px',
                            backgroundColor: 'rgba(39, 39, 42, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setPreviewUrl(null);
                        }}
                    >
                        <X size={20} />
                    </button>
                    <AnnotatedImage
                        src={previewUrl}
                        annotations={previewIdx !== null ? (trade.imageAnnotations || {})[previewIdx] as DrawAction[] | undefined : undefined}
                        alt="Preview"
                        style={{
                            maxHeight: '85vh',
                            maxWidth: '90vw',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            boxShadow: '0 0 60px rgba(0,0,0,0.6)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <a
                        href={previewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            position: 'absolute',
                            bottom: '24px',
                            padding: '10px 16px',
                            backgroundColor: 'rgba(39, 39, 42, 0.9)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'white',
                            textDecoration: 'none',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <ExternalLink size={14} />
                        Open in new tab
                    </a>
                </div>
            )}
        </div>,
        document.body
    );
}
