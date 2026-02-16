import { useState, useCallback, useRef, useEffect } from 'react';
import { Trade } from '../types';
import { Trophy, AlertTriangle, RefreshCw, Sparkles, ChevronLeft, ChevronRight, Calendar, History, RotateCw, Zap } from 'lucide-react';
import { AnnotatedImage } from './AnnotatedImage';

interface ReviewTrade {
    tradeId: string;
    title: string;
    reason: string;
    conclusion: string;
    tip: string;
    imageUrl?: string | null; // Optional, might be resolved later or linked via tradeId
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
    id: string; // "YYYY-MM-DD" Monday
    week_label: string;
    start_date: string;
    end_date: string;
    json_data: WeeklyReviewData;
    updated_at: string;
}

interface Props {
    trades: Trade[];
    onTradeClick?: (trade: Trade) => void;
}

// Helper to get formatted dates
const getWeekRange = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const id = monday.toISOString().split('T')[0];
    return { monday, sunday, id };
};

// Single trade card for the slider
function TradeCard({
    review,
    trade,
    type,
    imageUrl,
    onClick
}: {
    review: ReviewTrade;
    trade: Trade | undefined;
    type: 'best' | 'tactical' | 'worst' | 'standard';
    imageUrl: string | null;
    onClick: () => void;
}) {
    const isBest = type === 'best';
    const isTactical = type === 'tactical';
    const isStandard = type === 'standard';

    // Color Logic
    let accentColor = 'var(--danger)'; // Default worst
    if (isBest) accentColor = 'var(--accent)'; // Green
    if (isTactical) accentColor = '#eab308'; // Amber/Yellow
    if (isStandard) accentColor = '#a1a1aa'; // Zinc/Gray

    // Gradient Logic
    let bgGradient = 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)';
    if (isBest) {
        bgGradient = 'linear-gradient(135deg, rgba(35, 134, 54, 0.15) 0%, rgba(35, 134, 54, 0.05) 100%)';
    } else if (isTactical) {
        bgGradient = 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)';
    } else if (isStandard) {
        bgGradient = 'linear-gradient(135deg, rgba(161, 161, 170, 0.15) 0%, rgba(161, 161, 170, 0.05) 100%)';
    }

    // Find annotations if we have a trade and the image url matches one of trade images
    // Note: AI might not return imageUrl directly anymore, we rely on trade.images
    const displayImage = imageUrl || (trade?.images && trade.images.length > 0 ? trade.images[0] : null);

    // Attempt to match annotation if we have a specific image
    const annotations = trade && displayImage && trade.images
        ? trade.imageAnnotations?.[trade.images.findIndex(img => img === displayImage)]
        : undefined;

    return (
        <div
            onClick={onClick}
            style={{
                width: '320px',
                minWidth: '320px',
                borderRadius: '12px',
                background: bgGradient,
                border: `1px solid ${accentColor}30`,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer',
                height: '100%' // Full height for alignment
            }}
            onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${accentColor}20`;
            }}
            onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Image Section */}
            <div
                style={{
                    width: '100%',
                    height: '160px',
                    backgroundColor: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {displayImage ? (
                    <AnnotatedImage
                        src={displayImage}
                        annotations={annotations}
                        alt="Trade chart"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: 0.4
                    }}>
                        <Sparkles size={24} />
                        <span style={{ fontSize: '12px' }}>No chart image</span>
                    </div>
                )}

                {/* Badge overlay */}
                <div
                    style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        backgroundColor: isBest
                            ? 'rgba(35, 134, 54, 0.9)'
                            : isTactical
                                ? 'rgba(234, 179, 8, 0.9)'
                                : isStandard
                                    ? 'rgba(113, 113, 122, 0.9)'
                                    : 'rgba(239, 68, 68, 0.9)',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    {isBest && <Trophy size={12} />}
                    {isTactical && <Zap size={12} />}
                    {isStandard && <History size={12} />}
                    {!isBest && !isTactical && !isStandard && <AlertTriangle size={12} />}

                    {isBest && 'PROCESS WIN'}
                    {isTactical && 'TACTICAL IMPROVEMENT'}
                    {isStandard && 'STANDARD EXECUTION'}
                    {!isBest && !isTactical && !isStandard && 'CRITICAL'}
                </div>
            </div>

            {/* Content Section */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>

                {/* Title & Reason */}
                <div>
                    <h5 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-primary)' }}>{review.title}</h5>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{review.reason}"</p>
                </div>

                {/* Trade Info */}
                {trade ? (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid var(--border)',
                        paddingTop: '8px'
                    }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                            {trade.market} {trade.direction}
                        </span>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: (trade.pnl || 0) >= 0 ? 'var(--accent)' : 'var(--danger)',
                        }}>
                            {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}
                        </span>
                    </div>
                ) : (
                    <div style={{
                        borderTop: '1px solid var(--border)',
                        paddingTop: '8px',
                        fontSize: '11px',
                        color: 'var(--warning)',
                        fontStyle: 'italic'
                    }}>
                        Trade data missing (ID mismatch)
                    </div>
                )}

                {trade && (
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>
                        {new Date(trade.entryDateTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                )}

                {/* Conclusion */}
                <p style={{
                    margin: 0,
                    fontSize: '13px',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)',
                    flex: 1
                }}>
                    {review.conclusion}
                </p>

                {/* Tip Box */}
                {review.tip && (
                    <div
                        style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            backgroundColor: `${accentColor}15`,
                            borderLeft: `3px solid ${accentColor}`,
                            fontSize: '12px',
                            lineHeight: '1.4'
                        }}
                    >
                        <strong>Action:</strong> {review.tip}
                    </div>
                )}
            </div>
        </div>
    );
}

// Horizontal slider component
function TradeSlider({
    title,
    icon,
    reviews,
    allTrades,
    resolvedImages,
    type,
    onTradeClick
}: {
    title: string;
    icon: React.ReactNode;
    reviews: ReviewTrade[];
    allTrades: Trade[];
    resolvedImages: Record<string, string>;
    type: 'best' | 'tactical' | 'worst' | 'standard';
    onTradeClick: (trade: Trade) => void;
}) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    useEffect(() => {
        checkScroll();
    }, [reviews]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = 340;
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            setTimeout(checkScroll, 300);
        }
    };

    let accentColor = 'var(--danger)';
    if (type === 'best') accentColor = 'var(--accent)';
    if (type === 'tactical') accentColor = '#eab308'; // Amber
    if (type === 'standard') accentColor = '#a1a1aa'; // Zinc

    // Always render section title, even if empty, to show "None" state
    // But if totally undefined (loading), skip.
    if (!reviews) return null;

    return (
        <div style={{ marginBottom: '24px' }}>
            {/* Section Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: `${accentColor}20`,
                    color: accentColor
                }}>
                    {icon}
                </div>
                <h4 style={{ margin: 0, fontSize: '16px' }}>{title}</h4>
                <span style={{
                    fontSize: '12px',
                    opacity: 0.5,
                    marginLeft: 'auto'
                }}>
                    {reviews.length} trade{reviews.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Slider Container or Empty State */}
            {reviews.length === 0 ? (
                <div style={{
                    padding: '24px',
                    borderRadius: '12px',
                    border: '1px dashed var(--border)',
                    textAlign: 'center',
                    opacity: 0.5,
                    fontSize: '14px'
                }}>
                    No trades flagged for this category.
                </div>
            ) : (
                <div style={{ position: 'relative' }}>
                    {canScrollLeft && (
                        <button onClick={() => scroll('left')} className="absolute left-[-16px] top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-zinc-800 border border-zinc-700 shadow-xl hover:bg-zinc-700 transition">
                            <ChevronLeft size={18} />
                        </button>
                    )}

                    {canScrollRight && reviews.length > 2 && (
                        <button onClick={() => scroll('right')} className="absolute right-[-16px] top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-zinc-800 border border-zinc-700 shadow-xl hover:bg-zinc-700 transition">
                            <ChevronRight size={18} />
                        </button>
                    )}

                    <div
                        ref={scrollRef}
                        onScroll={checkScroll}
                        style={{
                            display: 'flex',
                            gap: '16px',
                            overflowX: 'auto',
                            scrollSnapType: 'x mandatory',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            paddingBottom: '8px'
                        }}
                    >
                        {reviews.map((review, idx) => {
                            // Robust ID Matching: Try exact, then string conversion
                            const trade = allTrades.find(t =>
                                t.id === review.tradeId ||
                                String(t.id) === String(review.tradeId)
                            );

                            const imageUrl = review.imageUrl
                                ? (resolvedImages[review.imageUrl] || review.imageUrl)
                                : null;

                            return (
                                <div
                                    key={review.tradeId || idx}
                                    style={{ scrollSnapAlign: 'start' }}
                                >
                                    <TradeCard
                                        review={review}
                                        trade={trade}
                                        type={type}
                                        imageUrl={imageUrl}
                                        onClick={() => trade && onTradeClick(trade)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper to get weeks for a given month view
function getWeeksInMonth(year: number, month: number) {
    const weeks: { monday: Date; sunday: Date }[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from the Monday of the first week
    const current = new Date(firstDay);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    current.setDate(diff);

    // Loop until we pass the last day of the month
    while (current <= lastDay || (current.getMonth() === month && current.getDate() <= lastDay.getDate())) {
        const monday = new Date(current);
        const sunday = new Date(current);
        sunday.setDate(monday.getDate() + 6);

        // Include if any part of the week is in this month
        if (monday.getMonth() === month || sunday.getMonth() === month) {
            weeks.push({ monday, sunday });
        }

        // Break if we are already in the next month completely
        if (monday.getMonth() > month && monday.getFullYear() >= year) break;
        if (monday.getFullYear() > year) break;

        current.setDate(current.getDate() + 7);
    }
    return weeks;
}

function WeekPicker({ selectedDate, onSelect, onClose }: { selectedDate: Date, onSelect: (d: Date) => void, onClose: () => void }) {
    const [viewDate, setViewDate] = useState(new Date(selectedDate));
    const weeks = getWeeksInMonth(viewDate.getFullYear(), viewDate.getMonth());
    const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const changeMonth = (delta: number) => {
        const d = new Date(viewDate);
        d.setMonth(d.getMonth() + delta);
        setViewDate(d);
    };

    return (
        <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '12px',
            zIndex: 100,
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            width: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <button
                    onClick={() => changeMonth(-1)}
                    className="icon-btn-sm"
                    style={{ padding: '4px' }}
                >
                    <ChevronLeft size={16} />
                </button>
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{monthLabel}</div>
                <button
                    onClick={() => changeMonth(1)}
                    className="icon-btn-sm"
                    style={{ padding: '4px' }}
                >
                    <ChevronRight size={16} />
                </button>
            </div>

            {/* Weeks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {weeks.map((week, i) => {
                    const isSelected = selectedDate >= week.monday && selectedDate <= week.sunday;
                    const label = `${week.monday.getDate()} - ${week.sunday.getDate()}`;
                    const isCurrentMonth = week.monday.getMonth() === viewDate.getMonth();

                    return (
                        <button
                            key={i}
                            onClick={() => {
                                onSelect(week.monday);
                                onClose();
                            }}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                                color: isSelected ? 'white' : (isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '13px',
                                transition: 'background-color 0.2s',
                                opacity: isCurrentMonth || isSelected ? 1 : 0.5
                            }}
                            className={!isSelected ? "hover:bg-white/5" : ""}
                        >
                            <span>Week {i + 1}</span>
                            <span style={{ opacity: 0.7 }}>{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Backdrop to close */}
            <div
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    zIndex: -1
                }}
                onClick={onClose}
            />
        </div>
    );
}

export function WeeklyReviewCarousel({ trades, onTradeClick }: Props) {
    const [currentReview, setCurrentReview] = useState<WeeklyReviewData | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Defaults to today
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedReviewMeta, setSavedReviewMeta] = useState<SavedReview | null>(null);
    const [resolvedImages, setResolvedImages] = useState<Record<string, string>>({});
    const [showPicker, setShowPicker] = useState(false);

    // Derived Week Range
    const { monday, sunday, id: weekId } = getWeekRange(selectedDate);
    const weekLabel = `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    // Resolve local:// image paths
    const resolveImage = useCallback(async (url: string) => {
        if (!url) return null;
        if (url.startsWith('local://')) {
            try {
                const resolved = await window.electronAPI.images.resolvePath(url);
                setResolvedImages(prev => ({ ...prev, [url]: resolved }));
                return resolved;
            } catch {
                return null;
            }
        }
        return url;
    }, []);

    // Load available review for this week from DB
    const loadSavedReview = useCallback(async () => {
        try {
            setLoading(true);
            const saved = await window.electronAPI.weeklyReviews.get(weekId);
            if (saved) {
                setSavedReviewMeta(saved);
                setCurrentReview(saved.jsonData);
            } else {
                setSavedReviewMeta(null);
                setCurrentReview(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [weekId]);

    // Initial load
    useEffect(() => {
        loadSavedReview();
    }, [loadSavedReview]);


    // Filter trades for the selected week to pass to AI
    const getTradesForWeek = useCallback(() => {
        return trades.filter(t => {
            const d = new Date(t.entryDateTime);
            return d >= monday && d <= sunday;
        });
    }, [trades, monday, sunday]);

    const handleGenerate = async (forceUpdate = false) => {
        const weeklyTrades = getTradesForWeek();

        if (weeklyTrades.length < 2) {
            setError('Need at least 2 trades in this week to generate a review.');
            return;
        }

        // Logic: specific check if user wants to overwrite
        if (savedReviewMeta && !forceUpdate) {
            const confirm = await window.electronAPI.dialog.confirm(
                `A review for this week already exists (Last updated: ${new Date(savedReviewMeta.updated_at).toLocaleString()}).\n\nDo you want to regenerate it? This will overwrite previous insights.`,
                "Overwrite Existing Review?"
            );
            if (!confirm) return;
        }

        setLoading(true);
        setError(null);
        try {
            const result = await window.electronAPI.ai.weeklyReview(weeklyTrades, weekId);

            // Save to DB
            const reviewToSave: SavedReview = {
                id: weekId,
                week_label: weekLabel,
                start_date: monday.toISOString(),
                end_date: sunday.toISOString(),
                json_data: result,
                updated_at: new Date().toISOString()
            };

            await window.electronAPI.weeklyReviews.save(reviewToSave);

            // Update State
            setCurrentReview(result);
            setSavedReviewMeta(reviewToSave);

            // Resolve Images for new data
            const allReviews = [...(result.top_process_wins || []), ...(result.critical_review_needed || [])];
            for (const t of allReviews) {
                if (t.imageUrl) resolveImage(t.imageUrl);
            }

        } catch (err: any) {
            setError(err.message || 'Failed to generate review');
        } finally {
            setLoading(false);
        }
    };

    const shiftWeek = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(newDate);
    };

    return (
        <div className="card" style={{ padding: '0', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Header / Week Picker */}
            <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-secondary)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: 'var(--accent)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Calendar size={20} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px' }}>Weekly Performance Review</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <button onClick={() => shiftWeek('prev')} className="icon-btn-sm" title="Previous Week"><ChevronLeft size={14} /></button>

                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setShowPicker(!showPicker)}
                                    className="hover:bg-white/5"
                                    style={{
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        minWidth: '140px',
                                        textAlign: 'center',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'inherit',
                                        cursor: 'pointer',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Calendar size={14} style={{ opacity: 0.7 }} />
                                    {weekLabel}
                                </button>

                                {showPicker && (
                                    <WeekPicker
                                        selectedDate={selectedDate}
                                        onSelect={(d) => {
                                            setSelectedDate(d);
                                            setShowPicker(false);
                                        }}
                                        onClose={() => setShowPicker(false)}
                                    />
                                )}
                            </div>

                            <button onClick={() => shiftWeek('next')} className="icon-btn-sm" title="Next Week"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {savedReviewMeta && (
                        <span style={{ fontSize: '12px', opacity: 0.6, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <History size={12} />
                            Saved: {new Date(savedReviewMeta.updated_at).toLocaleDateString()}
                        </span>
                    )}

                    <button
                        className="btn btn-primary"
                        onClick={() => handleGenerate(true)} // Force update if clicked
                        disabled={loading}
                        style={{
                            padding: '8px 16px',
                            gap: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : (savedReviewMeta ? <RotateCw size={16} /> : <Sparkles size={16} />)}
                        {loading ? 'Analyzing...' : (savedReviewMeta ? 'Regenerate Analysis' : 'Generate Analysis')}
                    </button>
                </div>
            </div>

            <div style={{ padding: '24px' }}>
                {/* Error State */}
                {error && (
                    <div style={{
                        padding: '16px',
                        marginBottom: '24px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <AlertTriangle size={18} />
                        {error}
                    </div>
                )}

                {/* Loading Placeholders or Empty State */}
                {loading && !currentReview && (
                    <div className="flex flex-col items-center justify-center py-12 opacity-50">
                        <RefreshCw size={48} className="animate-spin mb-4 text-accent" />
                        <p>Crunching the numbers for {weekLabel}...</p>
                    </div>
                )}

                {!loading && !currentReview && !error && (
                    <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
                        <Sparkles size={48} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium">No review generated for this week yet.</p>
                        <p className="text-sm opacity-60 max-w-md text-center mt-2">
                            Click "Generate Analysis" to process your {getTradesForWeek().length} trades from this week and get actionable coaching insights.
                        </p>
                    </div>
                )}

                {/* Review Content */}
                {currentReview && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Card */}
                        <div style={{
                            padding: '20px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                            border: '1px solid var(--border)',
                            marginBottom: '32px'
                        }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>
                                🎯 Executive Summary
                            </h4>
                            <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--text-primary)', margin: 0 }}>
                                {currentReview.week_summary}
                            </p>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div className="p-3 rounded bg-zinc-900/50 border border-white/5">
                                    <span className="text-xs uppercase text-zinc-500 font-bold block mb-1">Next Week's Focus</span>
                                    <span className="text-sm text-accent font-medium">{currentReview.next_week_focus}</span>
                                </div>
                                <div className="p-3 rounded bg-zinc-900/50 border border-white/5">
                                    <span className="text-xs uppercase text-zinc-500 font-bold block mb-1">Simulator Replay</span>
                                    <span className="text-sm text-blue-400 font-medium">{currentReview.replay_recommendation}</span>
                                </div>
                            </div>
                        </div>

                        {/* Best Trades Slider */}
                        <TradeSlider
                            title="Top Process Wins"
                            icon={<Trophy size={18} />}
                            reviews={currentReview.top_process_wins || []}
                            allTrades={trades}
                            resolvedImages={resolvedImages}
                            type="best"
                            onTradeClick={(t) => onTradeClick && onTradeClick(t)}
                        />

                        {/* Gap */}
                        <div style={{ height: '16px' }} />

                        {/* Tactical Improvements Slider */}
                        <TradeSlider
                            title="Tactical Improvements"
                            icon={<Zap size={18} />}
                            reviews={currentReview.tactical_improvements || []}
                            allTrades={trades}
                            resolvedImages={resolvedImages}
                            type="tactical"
                            onTradeClick={(t) => onTradeClick && onTradeClick(t)}
                        />

                        {/* Gap */}
                        <div style={{ height: '16px' }} />

                        {/* Worst Trades Slider */}
                        <TradeSlider
                            title="Critical Reviews Needed"
                            icon={<AlertTriangle size={18} />}
                            reviews={currentReview.critical_review_needed || []}
                            allTrades={trades}
                            resolvedImages={resolvedImages}
                            type="worst"
                            onTradeClick={(t) => onTradeClick && onTradeClick(t)}
                        />

                        {/* Gap */}
                        <div style={{ height: '16px' }} />

                        {/* Uncategorized Trades (Fallback) */}
                        {(() => {
                            // Collect all trade IDs mentioned in the AI review
                            const mentionedIds = new Set<string>();
                            const allCategories = [
                                ...(currentReview.top_process_wins || []),
                                ...(currentReview.tactical_improvements || []), // Check this exists
                                ...(currentReview.critical_review_needed || [])
                            ];
                            allCategories.forEach(r => mentionedIds.add(String(r.tradeId)));

                            // Find trades in the current week that were NOT mentioned
                            const uncategorizedTrades = getTradesForWeek().filter(t =>
                                !mentionedIds.has(String(t.id))
                            );

                            if (uncategorizedTrades.length === 0) return null;

                            // Convert to ReviewTrade format for the slider
                            const uncategorizedReviews: ReviewTrade[] = uncategorizedTrades.map(t => ({
                                tradeId: t.id,
                                title: `${t.market} ${t.direction}`,
                                reason: 'Routine Execution / Not Highlighted by AI',
                                conclusion: 'Standard result matching stats.',
                                tip: 'Maintain consistency.',
                                imageUrl: null // Will fallback to trade images
                            }));

                            return (
                                <TradeSlider
                                    title="Standard Executions"
                                    icon={<History size={18} />}
                                    reviews={uncategorizedReviews}
                                    allTrades={trades} // Pass full list, slider handles matching
                                    resolvedImages={resolvedImages}
                                    type="standard"
                                    onTradeClick={(t) => onTradeClick && onTradeClick(t)}
                                />
                            );
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}
