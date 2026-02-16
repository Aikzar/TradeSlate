import React from 'react';
import { Trade } from '../../types';
import { AnnotatedImage } from '../AnnotatedImage';
import { DrawAction } from '../ImageEditor';
import './tradecard.css';

export interface TradeCardProps {
    trade: Trade;
    customTitle?: string;
    customNote?: string;
    screenshotUrl?: string;
    backgroundImage?: string;
    watermark?: string;
    annotations?: DrawAction[];
    showFields: {
        market: boolean;
        direction: boolean;
        entryPrice: boolean;
        exitPrice: boolean;
        pnl: boolean;
        contracts: boolean;
        duration: boolean;
        rr: boolean;
    };
    displayMode?: 'dollar' | 'percent' | 'rr';
}

// ... (helper functions unchanged) ...

// Helper functions
const formatPnL = (pnl: number | undefined): string => {
    if (pnl === undefined || pnl === null) return '$0.00';
    const formatted = Math.abs(pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return pnl >= 0 ? `+$${formatted}` : `-$${formatted}`;
};

const formatPnLPercent = (trade: Trade): string => {
    if (!trade.entryPrice || !trade.exitPrice || trade.entryPrice === 0) return '0.00%';
    const direction = trade.direction || 'Long';
    const pct = ((trade.exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * (direction === 'Long' ? 1 : -1);
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
};

const formatRR = (trade: Trade): string => {
    if (trade.achievedR === undefined || trade.achievedR === null) return '0.00R';
    return `${trade.achievedR.toFixed(2)}R`;
};

const getDisplayPnL = (trade: Trade, mode: 'dollar' | 'percent' | 'rr' | undefined): string => {
    if (mode === 'percent') return formatPnLPercent(trade);
    if (mode === 'rr') return formatRR(trade);
    return formatPnL(trade.pnl);
};

const formatPrice = (price: number | undefined): string => {
    if (price === undefined || price === null) return '-';
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
};

const formatDuration = (seconds: number | undefined): string => {
    if (!seconds) return '-';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
};

const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '-';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (e) {
        return '-';
    }
};

const isProfitable = (pnl: number | undefined): boolean => {
    return (pnl ?? 0) >= 0;
};

// ============================================
// TEMPLATE 1: ELITE PRO
// ============================================
export const EliteProTemplate: React.FC<TradeCardProps> = ({
    trade,
    customTitle,
    customNote,
    screenshotUrl,
    watermark,
    annotations,
    showFields,
    displayMode
}) => {
    const profitable = isProfitable(trade.pnl);
    const pnlClass = profitable ? 'pnl-positive pnl-glow-positive' : 'pnl-negative pnl-glow-negative';
    const direction = trade.direction || 'Long';

    return (
        <div className={`trade-card-export-target template-apex-pro ${screenshotUrl ? 'has-image' : 'no-image'}`}>
            <div className="apex-header">
                <div className="apex-logo">TradeSlate</div>
                <div className="apex-market">
                    {showFields.market && <span className="apex-market-name">{trade.market || 'Unknown'}</span>}
                    {showFields.direction && (
                        <span className={`direction-badge direction-${direction.toLowerCase()}`}>
                            {direction}
                        </span>
                    )}
                </div>
            </div>

            <div className="apex-content">
                {customTitle && (
                    <div className="apex-custom-title">
                        {customTitle}
                    </div>
                )}

                {showFields.pnl && (
                    <div className="apex-pnl-group">
                        <div className="apex-pnl-label">Realized P&L</div>
                        <div className={`apex-pnl-value ${pnlClass}`}>
                            {getDisplayPnL(trade, displayMode)}
                        </div>
                    </div>
                )}

                <div className="apex-content-scaler">
                    <div className="apex-stats">
                        {showFields.entryPrice && (
                            <div className="apex-stat">
                                <span className="apex-stat-label">Entry Price</span>
                                <span className="apex-stat-value">{formatPrice(trade.entryPrice)}</span>
                            </div>
                        )}
                        {showFields.exitPrice && (
                            <div className="apex-stat">
                                <span className="apex-stat-label">Exit Price</span>
                                <span className="apex-stat-value">{formatPrice(trade.exitPrice)}</span>
                            </div>
                        )}
                        {showFields.contracts && (
                            <div className="apex-stat">
                                <span className="apex-stat-label">Contracts</span>
                                <span className="apex-stat-value">{trade.contracts ?? '-'}</span>
                            </div>
                        )}
                        {showFields.duration && (
                            <div className="apex-stat">
                                <span className="apex-stat-label">Duration</span>
                                <span className="apex-stat-value">{formatDuration(trade.durationSeconds)}</span>
                            </div>
                        )}
                        {showFields.rr && trade.achievedR !== undefined && trade.achievedR !== null && (
                            <div className="apex-stat">
                                <span className="apex-stat-label">R Multiple</span>
                                <span className="apex-stat-value">{Number(trade.achievedR).toFixed(2)}R</span>
                            </div>
                        )}
                    </div>

                    {screenshotUrl && (
                        <div className="apex-image-container">
                            <AnnotatedImage
                                src={screenshotUrl}
                                annotations={annotations}
                                className="apex-screenshot"
                                alt="Trade Screenshot"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {customNote && <div className="apex-custom-note">"{customNote}"</div>}

            <div className="apex-footer">
                <span className="apex-watermark">@{watermark || 'tradeslate.app'}</span>
                <span className="apex-date">{formatDate(trade.entryDateTime)}</span>
            </div>
        </div>
    );
};

// ============================================
// TEMPLATE 2: NEON TRADER
// ============================================
export const NeonTraderTemplate: React.FC<TradeCardProps> = ({
    trade,
    customTitle,
    customNote,
    screenshotUrl,
    watermark,
    annotations,
    showFields,
    displayMode
}) => {
    const profitable = isProfitable(trade.pnl);
    const pnlClass = profitable ? 'pnl-positive pnl-glow-positive' : 'pnl-negative pnl-glow-negative';
    const direction = trade.direction || 'Long';

    return (
        <div className={`trade-card-export-target template-neon-trader ${screenshotUrl ? 'has-image' : 'no-image'}`}>
            <div className="neon-header">
                <div className="neon-logo">{customTitle || 'TradeSlate'}</div>
                {showFields.market && (
                    <div className="neon-username">
                        <span>{trade.market || 'Unknown'}</span>
                    </div>
                )}
            </div>

            <div className="neon-badges">
                {showFields.direction && (
                    <span className={`neon-badge direction-${direction.toLowerCase()}`}>
                        ↗ {direction}
                    </span>
                )}
                {showFields.contracts && (
                    <span className="neon-badge">{trade.contracts ?? '-'} contracts</span>
                )}
            </div>

            <div className="neon-content">
                {showFields.pnl && (
                    <div className={`neon-pnl ${pnlClass}`}>
                        {getDisplayPnL(trade, displayMode)}
                    </div>
                )}

                <div className="neon-content-scaler">
                    <div className="neon-prices">
                        {showFields.entryPrice && (
                            <div className="neon-price-block">
                                <span className="neon-price-label">Open Price</span>
                                <span className="neon-price-value">${formatPrice(trade.entryPrice)}</span>
                            </div>
                        )}
                        {showFields.exitPrice && (
                            <div className="neon-price-block">
                                <span className="neon-price-label">Close Price</span>
                                <span className="neon-price-value">${formatPrice(trade.exitPrice)}</span>
                            </div>
                        )}
                    </div>

                    {screenshotUrl && (
                        <div className="neon-image-container">
                            <AnnotatedImage
                                src={screenshotUrl}
                                annotations={annotations}
                                className="neon-screenshot"
                                alt="Trade Screenshot"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {customNote && <div className="neon-custom-note">"{customNote}"</div>}

            <div className="neon-footer">
                {watermark && <span className="neon-watermark">@{watermark}</span>}
                <span className="neon-date">{formatDate(trade.entryDateTime)}</span>
            </div>
        </div>
    );
};


// ============================================
// TEMPLATE 3: AESTHETIC
// ============================================
export const AestheticTemplate: React.FC<TradeCardProps> = ({
    trade,
    customTitle,
    customNote,
    screenshotUrl,
    backgroundImage,
    watermark,
    annotations,
    showFields,
    displayMode
}) => {
    const profitable = isProfitable(trade.pnl);
    const pnlClass = profitable ? 'pnl-positive' : 'pnl-negative';
    const direction = trade.direction || 'Long';

    return (
        <div className={`trade-card-export-target template-aesthetic ${screenshotUrl ? 'has-image' : 'no-image'}`} style={
            backgroundImage ? {
                background: `url(${backgroundImage}) center center / cover no-repeat`
            } : undefined
        }>
            {backgroundImage && (
                <div className="aesthetic-overlay" />
            )}
            <div className="aesthetic-content-layer">
                <div className="minimalist-header">
                    {showFields.market && <span className="minimalist-market">{trade.market || 'Unknown'}</span>}
                    {showFields.direction && (
                        <span className={`minimalist-direction ${pnlClass}`}>
                            {direction.toUpperCase()}
                        </span>
                    )}
                </div>

                {customTitle && <div className="minimalist-custom-title">{customTitle}</div>}

                <div className="minimalist-content">
                    {showFields.pnl && (
                        <div className="minimalist-pnl-group">
                            <div className="minimalist-pnl-label">Profit / Loss</div>
                            <div className={`minimalist-pnl ${pnlClass}`}>
                                {getDisplayPnL(trade, displayMode)}
                            </div>
                        </div>
                    )}

                    <div className="minimalist-content-scaler">
                        {screenshotUrl && (
                            <div className="minimalist-image-container">
                                <AnnotatedImage
                                    src={screenshotUrl}
                                    annotations={annotations}
                                    className="minimalist-screenshot"
                                    alt="Trade Screenshot"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            </div>
                        )}

                        <div className="minimalist-stats">
                            {showFields.entryPrice && (
                                <div className="minimalist-stat">
                                    <div className="minimalist-stat-label">Entry</div>
                                    <div className="minimalist-stat-value">{formatPrice(trade.entryPrice)}</div>
                                </div>
                            )}
                            {showFields.exitPrice && (
                                <div className="minimalist-stat">
                                    <div className="minimalist-stat-label">Exit</div>
                                    <div className="minimalist-stat-value">{formatPrice(trade.exitPrice)}</div>
                                </div>
                            )}
                            {showFields.contracts && (
                                <div className="minimalist-stat">
                                    <div className="minimalist-stat-label">Size</div>
                                    <div className="minimalist-stat-value">{trade.contracts ?? '-'}</div>
                                </div>
                            )}
                            {showFields.duration && (
                                <div className="minimalist-stat">
                                    <div className="minimalist-stat-label">Duration</div>
                                    <div className="minimalist-stat-value">{formatDuration(trade.durationSeconds)}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {customNote && <div className="minimalist-custom-note">"{customNote}"</div>}

                <div className="minimalist-footer">
                    {watermark && <div className="template-watermark">@{watermark}</div>}
                    <div className="minimalist-date">{formatDate(trade.entryDateTime)}</div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// TEMPLATE 4: MINIMALIST
// ============================================
export const MinimalistTemplate: React.FC<TradeCardProps> = ({
    trade,
    customTitle,
    customNote,
    screenshotUrl,
    watermark,
    annotations,
    showFields,
    displayMode
}) => {
    const profitable = isProfitable(trade.pnl);
    const pnlClass = profitable ? 'pnl-positive' : 'pnl-negative';
    const direction = trade.direction || 'Long';

    return (
        <div className={`trade-card-export-target template-minimalist ${screenshotUrl ? 'has-image' : 'no-image'}`}>
            <div className="minimalist-header">
                {showFields.market && <span className="minimalist-market">{trade.market || 'Unknown'}</span>}
                {showFields.direction && (
                    <span className={`minimalist-direction ${pnlClass}`}>
                        {direction.toUpperCase()}
                    </span>
                )}
            </div>

            {customTitle && <div className="minimalist-custom-title">{customTitle}</div>}

            <div className="minimalist-content">
                {showFields.pnl && (
                    <div className="minimalist-pnl-group">
                        <div className="minimalist-pnl-label">Profit / Loss</div>
                        <div className={`minimalist-pnl ${pnlClass}`}>
                            {getDisplayPnL(trade, displayMode)}
                        </div>
                    </div>
                )}

                {screenshotUrl && (
                    <div className="minimalist-image-container">
                        <AnnotatedImage
                            src={screenshotUrl}
                            annotations={annotations}
                            className="minimalist-screenshot"
                            alt="Trade Screenshot"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </div>
                )}

                <div className="minimalist-stats">
                    {showFields.entryPrice && (
                        <div className="minimalist-stat">
                            <div className="minimalist-stat-label">Entry</div>
                            <div className="minimalist-stat-value">{formatPrice(trade.entryPrice)}</div>
                        </div>
                    )}
                    {showFields.exitPrice && (
                        <div className="minimalist-stat">
                            <div className="minimalist-stat-label">Exit</div>
                            <div className="minimalist-stat-value">{formatPrice(trade.exitPrice)}</div>
                        </div>
                    )}
                    {showFields.contracts && (
                        <div className="minimalist-stat">
                            <div className="minimalist-stat-label">Size</div>
                            <div className="minimalist-stat-value">{trade.contracts ?? '-'}</div>
                        </div>
                    )}
                    {showFields.duration && (
                        <div className="minimalist-stat">
                            <div className="minimalist-stat-label">Duration</div>
                            <div className="minimalist-stat-value">{formatDuration(trade.durationSeconds)}</div>
                        </div>
                    )}
                </div>
            </div>

            {customNote && <div className="minimalist-custom-note">"{customNote}"</div>}

            <div className="minimalist-footer">
                {watermark && <div className="template-watermark">@{watermark}</div>}
                <div className="minimalist-date">{formatDate(trade.entryDateTime)}</div>
            </div>
        </div>
    );
};

// Template registry
export const TEMPLATES = {
    'apex-pro': {
        id: 'apex-pro',
        name: 'Elite Pro',
        description: 'Elite professional style',
        Component: EliteProTemplate
    },
    'neon-trader': {
        id: 'neon-trader',
        name: 'Neon Trader',
        description: 'Vibrant gradient style',
        Component: NeonTraderTemplate
    },
    'aesthetic': {
        id: 'aesthetic',
        name: 'Aesthetic',
        description: 'Aesthetic background focus',
        Component: AestheticTemplate
    },
    'minimalist': {
        id: 'minimalist',
        name: 'Minimalist',
        description: 'Clean & simple',
        Component: MinimalistTemplate
    }
} as const;

export type TemplateId = keyof typeof TEMPLATES;
