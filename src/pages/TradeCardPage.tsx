import React, { useState, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useTrades } from '../hooks/useTrades';
import {
    TEMPLATES,
    TemplateId,
    TradeCardProps
} from '../components/tradecard/TradeCardTemplates';
import { Download, X, ChevronDown, Upload, Calendar } from 'lucide-react';
import { getDisplayImageUrl } from '../utils/imageUtils';
import '../components/tradecard/tradecard.css';

// Default Backgrounds for Aesthetic/Classic
const DEFAULT_AESTHETIC_BACKGROUNDS = [
    'assets/backgrounds/Greek_Aesthetic.jpg',
    'assets/backgrounds/Money_Aesthetic.jpg',
    'assets/backgrounds/Porche_Aesthetic.jpg'
];

// Default field visibility
const DEFAULT_SHOW_FIELDS: TradeCardProps['showFields'] = {
    market: true,
    direction: true,
    entryPrice: true,
    exitPrice: true,
    pnl: true,
    contracts: true,
    duration: true,
    rr: true
};

// Aspect ratio options
const ASPECT_RATIOS = {
    '1:1': { label: '1:1', value: 1 },
    '4:5': { label: '4:5', value: 4 / 5 },
    '5:4': { label: '5:4', value: 5 / 4 },
    '9:16': { label: '9:16', value: 9 / 16 },
    '16:9': { label: '16:9', value: 16 / 9 }
} as const;

type AspectRatioKey = keyof typeof ASPECT_RATIOS;

// Date filter options
type DateFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

const isWithinDateRange = (dateString: string, filter: DateFilter, customRange?: { start: Date; end: Date }): boolean => {
    if (filter === 'all') return true;

    const tradeDate = new Date(dateString);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
        case 'today':
            return tradeDate >= startOfToday;
        case 'week':
            const weekAgo = new Date(startOfToday);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return tradeDate >= weekAgo;
        case 'month':
            const monthAgo = new Date(startOfToday);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return tradeDate >= monthAgo;
        case 'custom':
            if (customRange) {
                const start = new Date(customRange.start);
                start.setHours(0, 0, 0, 0);
                const end = new Date(customRange.end);
                end.setHours(23, 59, 59, 999);
                return tradeDate >= start && tradeDate <= end;
            }
            return true;
        default:
            return true;
    }
};

export const TradeCardPage: React.FC = () => {
    const { trades } = useTrades();
    const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('apex-pro');
    const [customTitle, setCustomTitle] = useState('');
    const [customNote, setCustomNote] = useState('');
    const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
    const [watermark, setWatermark] = useState('');
    const [showFields, setShowFields] = useState(DEFAULT_SHOW_FIELDS);
    const [isExporting, setIsExporting] = useState(false);
    const [aspectRatio] = useState<AspectRatioKey>('1:1');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);
    const [displayMode, setDisplayMode] = useState<'dollar' | 'percent' | 'rr'>('dollar');
    const [resolvedImages, setResolvedImages] = useState<Record<number, string>>({});

    const cardRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const bgInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-select random background for Aesthetic template
    useLayoutEffect(() => {
        // Trigger if Aesthetic selected AND no background is currently set (null or falsey)
        if (selectedTemplate === 'aesthetic' && !backgroundImage) {
            const randomBg = DEFAULT_AESTHETIC_BACKGROUNDS[Math.floor(Math.random() * DEFAULT_AESTHETIC_BACKGROUNDS.length)];
            setBackgroundImage(randomBg);
        }
    }, [selectedTemplate]); // Focus on template change

    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // Robust size tracking
    useLayoutEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                const { width, height } = entry.contentRect;
                setContainerSize({ width, height });
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Derived scale based on container size and aspect ratio
    // Simplified scale calculation for 1:1
    const scale = useMemo(() => {
        if (containerSize.width === 0 || containerSize.height === 0) return 0.3;

        const padding = 48;
        const availableWidth = Math.max(0, containerSize.width - padding);
        const availableHeight = Math.max(0, containerSize.height - padding);

        // 1:1 means width = height = 1200
        return Math.min(availableWidth / 1200, availableHeight / 1200, 1);
    }, [containerSize]);

    // Get selected trade
    const selectedTrade = trades.find(t => t.id === selectedTradeId) || null;

    // Resolve local images for the selected trade
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

    useLayoutEffect(() => {
        if (selectedTrade?.images) {
            setResolvedImages({}); // Clear prev
            selectedTrade.images.forEach((url, idx) => {
                if (url.startsWith('local://')) {
                    resolveImageSrc(url, idx);
                }
            });
        }
    }, [selectedTrade?.id, selectedTrade?.images, resolveImageSrc]);

    // Sort and filter trades
    const filteredTrades = useMemo(() => {
        return [...trades]
            .filter(trade => isWithinDateRange(trade.entryDateTime, dateFilter, customDateRange || undefined))
            .sort((a, b) =>
                new Date(b.entryDateTime).getTime() - new Date(a.entryDateTime).getTime()
            );
    }, [trades, dateFilter, customDateRange]);

    // Handle screenshot upload from file
    const handleScreenshotUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setScreenshotUrl(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
        // Reset the input value to allow re-selecting the same file
        if (e.target) {
            e.target.value = '';
        }
    }, []);

    // Select or toggle trade image
    const handleSelectTradeImage = useCallback((imageUrl: string) => {
        setScreenshotUrl(prevUrl => prevUrl === imageUrl ? null : imageUrl);
    }, []);

    // Remove screenshot
    const handleRemoveScreenshot = useCallback(() => {
        setScreenshotUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    // Handle background image upload
    const handleBgUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setBackgroundImage(event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = '';
    }, []);

    const handleSelectBg = useCallback((imgUrl: string) => {
        setBackgroundImage(prev => prev === imgUrl ? null : imgUrl);
    }, []);

    // Toggle field visibility
    const toggleField = useCallback((field: keyof typeof showFields) => {
        setShowFields(prev => ({ ...prev, [field]: !prev[field] }));
    }, []);

    // Export as PNG using html2canvas
    const handleExport = useCallback(async () => {
        if (!cardRef.current || !selectedTrade) return;

        setIsExporting(true);

        try {
            // Dynamically import html2canvas
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(cardRef.current, {
                backgroundColor: null,
                scale: 2, // Higher resolution
                useCORS: true,
                logging: false
            });

            // Create download link
            const link = document.createElement('a');
            link.download = `trade-${selectedTrade.market}-${new Date().toISOString().split('T')[0]}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export image. Please try again.');
        } finally {
            setIsExporting(false);
        }
    }, [selectedTrade]);

    // Get Template component
    const TemplateComponent = TEMPLATES[selectedTemplate].Component;

    // Get trade images for the selected trade
    const tradeImages = selectedTrade?.images || [];

    // Get available annotations if the screenshot matches a trade image
    const annotations = useMemo(() => {
        if (!selectedTrade || !screenshotUrl) return undefined;
        // Find index of the currently displayed screenshot in the trade's images
        const idx = selectedTrade.images.findIndex(img => img === screenshotUrl);
        if (idx !== -1 && selectedTrade.imageAnnotations) {
            return selectedTrade.imageAnnotations[idx];
        }
        return undefined;
    }, [selectedTrade, screenshotUrl]);

    // Get the display URL for the currently selected screenshot
    const displayScreenshotUrl = useMemo(() => {
        if (!screenshotUrl) return undefined;
        if (screenshotUrl.startsWith('local://')) {
            const idx = selectedTrade?.images.indexOf(screenshotUrl);
            return (idx !== undefined && idx !== -1) ? (resolvedImages[idx] || '') : '';
        }
        return getDisplayImageUrl(screenshotUrl);
    }, [screenshotUrl, selectedTrade?.images, resolvedImages]);

    return (
        <div className="trade-card-page">
            {/* Header Bar with Download Button */}
            <div className="trade-card-header">
                <h1 className="trade-card-page-title">Trade Card</h1>
                {selectedTrade && (
                    <button
                        className="export-button"
                        onClick={handleExport}
                        disabled={isExporting}
                    >
                        <Download size={18} />
                        {isExporting ? 'Exporting...' : 'Download PNG'}
                    </button>
                )}
            </div>

            <div className="trade-card-content">
                {/* Preview Area */}
                <div
                    ref={containerRef}
                    className="trade-card-preview-area"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        width: '100%',
                        height: '100%',
                        position: 'relative'
                    }}
                >
                    {selectedTrade ? (
                        <>
                            {/* VISIBLE PREVIEW CARD */}
                            <div
                                className={`aspect-${aspectRatio.replace(':', '-')} ${screenshotUrl ? 'has-image' : 'no-image'}`}
                                style={{
                                    width: '1200px',
                                    height: `${1200 / ASPECT_RATIOS[aspectRatio].value}px`,
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'center center',
                                    flexShrink: 0,
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                                }}
                            >
                                <TemplateComponent
                                    trade={selectedTrade}
                                    customTitle={customTitle}
                                    customNote={customNote}
                                    screenshotUrl={displayScreenshotUrl}
                                    backgroundImage={backgroundImage || undefined}
                                    watermark={watermark}
                                    annotations={annotations}
                                    showFields={showFields}
                                    displayMode={displayMode}
                                />
                            </div>

                            {/* HIDDEN EXPORT CARD (Fixed High Res) - Use position absolute instead of visibility hidden for capture */}
                            <div style={{ position: 'absolute', top: 0, left: '-9999px', overflow: 'hidden', width: '1200px', height: '1200px' }}>
                                <div
                                    ref={cardRef} // Export function uses this ref
                                    className={`trade-card-wrapper aspect-${aspectRatio.replace(':', '-')} ${screenshotUrl ? 'has-image' : 'no-image'}`}
                                    style={{
                                        width: '1200px',
                                        height: `${1200 / ASPECT_RATIOS[aspectRatio].value}px`,
                                    }}
                                >
                                    <TemplateComponent
                                        trade={selectedTrade}
                                        customTitle={customTitle}
                                        customNote={customNote}
                                        screenshotUrl={displayScreenshotUrl}
                                        backgroundImage={backgroundImage || undefined}
                                        watermark={watermark}
                                        annotations={annotations}
                                        showFields={showFields}
                                        displayMode={displayMode}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            color: 'var(--text-secondary)'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>📊</div>
                            <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>
                                Select a Trade
                            </div>
                            <div style={{ fontSize: '14px' }}>
                                Choose a trade from the dropdown to create your share card
                            </div>
                        </div>
                    )}
                </div>

                {/* Customization Panel */}
                <div className="trade-card-options-panel">
                    {/* Trade Selector with Date Filter */}
                    <div className="customization-panel">
                        <div className="customization-section">
                            <label className="customization-label">Select Trade</label>

                            {/* Date Filter Row: Calendar on left, Toggle on right */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                {/* Calendar Date Picker */}
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setShowDatePicker(!showDatePicker)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 12px',
                                            background: dateFilter === 'custom' ? 'var(--accent)' : 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            color: dateFilter === 'custom' ? '#fff' : 'var(--text-primary)',
                                            cursor: 'pointer',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <Calendar size={16} />
                                        {dateFilter === 'custom' && customDateRange
                                            ? `${customDateRange.start.toLocaleDateString()} - ${customDateRange.end.toLocaleDateString()}`
                                            : 'Date Range'}
                                    </button>

                                    {/* Date Picker Popup */}
                                    {showDatePicker && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            marginTop: '8px',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '12px',
                                            padding: '16px',
                                            zIndex: 100,
                                            minWidth: '280px',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                                        }}>
                                            <div style={{ marginBottom: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Quick Select</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                                {(['all', 'today', 'week', 'month'] as DateFilter[]).map(filter => (
                                                    <button
                                                        key={filter}
                                                        onClick={() => {
                                                            setDateFilter(filter);
                                                            setCustomDateRange(null);
                                                            setShowDatePicker(false);
                                                        }}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: dateFilter === filter ? 'var(--accent)' : 'var(--bg-tertiary)',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            color: dateFilter === filter ? '#fff' : 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        {filter === 'all' ? 'All' :
                                                            filter === 'today' ? 'Today' :
                                                                filter === 'week' ? 'This Week' : 'This Month'}
                                                    </button>
                                                ))}
                                            </div>

                                            <div style={{ marginBottom: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>Custom Range</div>
                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>From</label>
                                                    <input
                                                        type="date"
                                                        value={customDateRange?.start?.toISOString().split('T')[0] || ''}
                                                        onChange={(e) => {
                                                            const newStart = new Date(e.target.value);
                                                            setCustomDateRange(prev => ({
                                                                start: newStart,
                                                                end: prev?.end || newStart
                                                            }));
                                                            setDateFilter('custom');
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            background: 'var(--bg-tertiary)',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '6px',
                                                            color: 'var(--text-primary)'
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>To</label>
                                                    <input
                                                        type="date"
                                                        value={customDateRange?.end?.toISOString().split('T')[0] || ''}
                                                        onChange={(e) => {
                                                            const newEnd = new Date(e.target.value);
                                                            setCustomDateRange(prev => ({
                                                                start: prev?.start || newEnd,
                                                                end: newEnd
                                                            }));
                                                            setDateFilter('custom');
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            padding: '8px',
                                                            background: 'var(--bg-tertiary)',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: '6px',
                                                            color: 'var(--text-primary)'
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setShowDatePicker(false)}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    background: 'var(--accent)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                    fontWeight: 600
                                                }}
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Percentage / Dollar Toggle */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        padding: '4px',
                                        border: '1px solid var(--border)'
                                    }}
                                >
                                    <button
                                        onClick={() => setDisplayMode('dollar')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '28px',
                                            background: displayMode === 'dollar' ? 'var(--accent)' : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: displayMode === 'dollar' ? '#fff' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 'bold'
                                        }}
                                        title="Show dollar amount"
                                    >
                                        $
                                    </button>
                                    <button
                                        onClick={() => setDisplayMode('percent')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '28px',
                                            background: displayMode === 'percent' ? 'var(--accent)' : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: displayMode === 'percent' ? '#fff' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 'bold'
                                        }}
                                        title="Show percentage"
                                    >
                                        %
                                    </button>
                                    <button
                                        onClick={() => setDisplayMode('rr')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '32px',
                                            height: '28px',
                                            background: displayMode === 'rr' ? 'var(--accent)' : 'transparent',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: displayMode === 'rr' ? '#fff' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: 'bold'
                                        }}
                                        title="Show Risk-to-Reward"
                                    >
                                        RR
                                    </button>
                                </div>
                            </div>

                            <div style={{ position: 'relative' }}>
                                <select
                                    value={selectedTradeId || ''}
                                    onChange={(e) => {
                                        setSelectedTradeId(e.target.value || null);
                                        // Reset screenshot when changing trade
                                        setScreenshotUrl(null);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        paddingRight: '40px',
                                        appearance: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Choose a trade...</option>
                                    {filteredTrades.map(trade => {
                                        let displayVal = '';
                                        if (displayMode === 'dollar') {
                                            displayVal = `${(trade.pnl || 0) >= 0 ? '+' : ''}$${(trade.pnl || 0).toFixed(2)}`;
                                        } else if (displayMode === 'percent') {
                                            const pct = (trade.entryPrice && trade.exitPrice && trade.entryPrice !== 0)
                                                ? ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * (trade.direction === 'Long' ? 1 : -1)
                                                : 0;
                                            displayVal = `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
                                        } else if (displayMode === 'rr') {
                                            displayVal = `${(trade.achievedR || 0).toFixed(2)}R`;
                                        }

                                        const pnlDisplay = ` • ${displayVal}`;
                                        return (
                                            <option key={trade.id} value={trade.id}>
                                                {trade.market} • {trade.direction} • {new Date(trade.entryDateTime).toLocaleDateString()}
                                                {pnlDisplay}
                                            </option>
                                        );
                                    })}
                                </select>
                                <ChevronDown
                                    size={18}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        pointerEvents: 'none',
                                        color: 'var(--text-secondary)'
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ASPECT RATIO REMOVED - LOCKED TO 1:1 */}

                    {/* Template Selector */}
                    <div className="customization-panel">
                        <div className="customization-section">
                            <label className="customization-label">Template</label>
                            <div className="template-selector">
                                {Object.entries(TEMPLATES).map(([id, template]) => (
                                    <div
                                        key={id}
                                        className={`template-option ${selectedTemplate === id ? 'active' : ''}`}
                                        onClick={() => setSelectedTemplate(id as TemplateId)}
                                    >
                                        <div className={`template-preview template-preview-${id}`}>
                                            <span style={{ fontSize: '20px' }}>
                                                {id === 'apex-pro' && '⚡'}
                                                {id === 'neon-trader' && '🌈'}
                                                {id === 'aesthetic' && '🎨'}
                                                {id === 'minimalist' && '◻️'}
                                            </span>
                                        </div>
                                        <div className="template-name">{template.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Background Image Selection (Aesthetic Only) */}
                    {selectedTemplate === 'aesthetic' && (
                        <div className="customization-panel">
                            <div className="customization-section">
                                <label className="customization-label">Background Image</label>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
                                    {DEFAULT_AESTHETIC_BACKGROUNDS.map((bg, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleSelectBg(bg)}
                                            style={{
                                                aspectRatio: '1',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                cursor: 'pointer',
                                                border: backgroundImage === bg ? '2px solid var(--accent)' : '2px solid transparent',
                                                position: 'relative'
                                            }}
                                        >
                                            <img src={bg} alt="Background option" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                </div>

                                <div className="screenshot-actions">
                                    <div
                                        className="screenshot-upload-compact"
                                        onClick={() => bgInputRef.current?.click()}
                                    >
                                        <Upload size={16} />
                                        <span>Upload Background</span>
                                    </div>
                                    {backgroundImage && (
                                        <button
                                            className="screenshot-clear-btn"
                                            onClick={() => setBackgroundImage(null)}
                                        >
                                            <X size={16} />
                                            <span>Clear BG</span>
                                        </button>
                                    )}
                                </div>
                                <input
                                    ref={bgInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleBgUpload}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Custom Text section follows */}
                    <div className="customization-panel">
                        <div className="customization-section">
                            <label className="customization-label">Custom Title</label>
                            <input
                                type="text"
                                value={customTitle}
                                onChange={(e) => setCustomTitle(e.target.value)}
                                placeholder="e.g., My Best Trade"
                                maxLength={15}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div className="customization-section">
                            <label className="customization-label">Custom Note</label>
                            <textarea
                                value={customNote}
                                onChange={(e) => setCustomNote(e.target.value)}
                                placeholder="e.g., Perfect setup, followed my plan"
                                rows={2}
                                maxLength={550}
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>

                        <div className="customization-section">
                            <label className="customization-label">Watermark / Username</label>
                            <input
                                type="text"
                                value={watermark}
                                onChange={(e) => setWatermark(e.target.value)}
                                placeholder="e.g., @YourName"
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>


                    {/* Image Selection */}
                    <div className="customization-panel">
                        <div className="customization-section">
                            <label className="customization-label">Screenshot</label>

                            {/* Current Screenshot Preview */}
                            {screenshotUrl && (
                                <div className="screenshot-preview">
                                    <img src={displayScreenshotUrl} alt="Screenshot" />
                                    <button
                                        className="screenshot-remove"
                                        onClick={handleRemoveScreenshot}
                                        title="Remove image"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}

                            {/* Trade Images Thumbnails */}
                            {tradeImages.length > 0 && (
                                <div className="trade-images-section">
                                    <label className="customization-label-small">From Trade</label>
                                    <div className="trade-image-thumbnails">
                                        {tradeImages.map((imgUrl, index) => {
                                            const displayUrl = imgUrl.startsWith('local://')
                                                ? resolvedImages[index] || ''
                                                : getDisplayImageUrl(imgUrl);
                                            return (
                                                <div
                                                    key={index}
                                                    className={`trade-image-thumbnail ${screenshotUrl === imgUrl ? 'active' : ''}`}
                                                    onClick={() => handleSelectTradeImage(imgUrl)}
                                                >
                                                    <img src={displayUrl} alt={`Trade image ${index + 1}`} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="screenshot-actions">
                                <div
                                    className="screenshot-upload-compact"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={16} />
                                    <span>Upload from PC</span>
                                </div>

                                {screenshotUrl && (
                                    <button
                                        className="screenshot-clear-btn"
                                        onClick={handleRemoveScreenshot}
                                    >
                                        <X size={16} />
                                        <span>Clear Image</span>
                                    </button>
                                )}
                            </div>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleScreenshotUpload}
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    {/* Field Visibility */}
                    <div className="customization-panel">
                        <div className="customization-section">
                            <label className="customization-label">Show Fields</label>
                            <div className="field-toggles">
                                {Object.entries(showFields).map(([field, visible]) => (
                                    <label key={field} className="field-toggle">
                                        <input
                                            type="checkbox"
                                            checked={visible}
                                            onChange={() => toggleField(field as keyof typeof showFields)}
                                        />
                                        <span className="field-toggle-label">
                                            {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </div >
    );
};
