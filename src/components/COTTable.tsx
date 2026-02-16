import { useState } from 'react';
import { COTDataPoint } from '../types';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowUp, ArrowDown } from 'lucide-react';

interface COTTableProps {
    data: COTDataPoint[];
}

type SortField = 'net_pct_current' | 'delta' | 'net_current' | 'net_value_usd';
type SortOrder = 'asc' | 'desc';

export function COTTable({ data }: COTTableProps) {
    const [sortField, setSortField] = useState<SortField>('net_pct_current');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const sortedData = [...data].sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    const formatNumber = (num: number, decimals: number = 0) => {
        return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    // FIX: Proper formatting for Net Value, handle NaN
    const formatBillions = (num: number | undefined | null): string => {
        if (num === undefined || num === null || isNaN(num)) {
            return '$0';
        }
        const absNum = Math.abs(num);
        const sign = num < 0 ? '-' : '';

        if (absNum >= 1_000_000_000) {
            return `${sign}$${(absNum / 1_000_000_000).toFixed(1)}B`;
        }
        if (absNum >= 1_000_000) {
            return `${sign}$${(absNum / 1_000_000).toFixed(0)}M`;
        }
        if (absNum >= 1_000) {
            return `${sign}$${(absNum / 1_000).toFixed(0)}K`;
        }
        return `${sign}$${absNum.toFixed(0)}`;
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return <span style={{ color: 'var(--accent)', marginLeft: '4px' }}>
            {sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
        </span>;
    };

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                    <tr style={{
                        borderBottom: '1px solid var(--border)',
                        backgroundColor: 'rgba(0,0,0,0.2)'
                    }}>
                        <th style={{ padding: '16px' }} className="input-label">Currency</th>
                        <th
                            style={{ padding: '16px', cursor: 'pointer' }}
                            className="input-label"
                            onClick={() => handleSort('net_current')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                Net Position
                                <SortIcon field="net_current" />
                            </div>
                        </th>
                        <th
                            style={{ padding: '16px', cursor: 'pointer' }}
                            className="input-label"
                            onClick={() => handleSort('net_value_usd')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                Net Value ($)
                                <SortIcon field="net_value_usd" />
                            </div>
                        </th>
                        <th
                            style={{ padding: '16px', cursor: 'pointer' }}
                            className="input-label"
                            onClick={() => handleSort('net_pct_current')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                Net % (LF)
                                <SortIcon field="net_pct_current" />
                            </div>
                        </th>
                        <th
                            style={{ padding: '16px', cursor: 'pointer' }}
                            className="input-label"
                            onClick={() => handleSort('delta')}
                        >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                1-Wk Delta
                                <SortIcon field="delta" />
                            </div>
                        </th>
                        <th style={{ padding: '16px', textAlign: 'right' }} className="input-label">Signal</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.map((row) => {
                        const isFlip = row.is_flip;
                        const isConfirmedBullish = row.net_pct_current > 0 && row.delta > 0;
                        const isConfirmedBearish = row.net_pct_current < 0 && row.delta < 0;
                        const isDivergence = (row.net_pct_current > 0 && row.delta < 0) || (row.net_pct_current < 0 && row.delta > 0);

                        // Row Style - Gold for flips
                        const rowBg = isFlip ? 'rgba(234, 179, 8, 0.08)' : 'transparent';

                        // Text Colors based on agreement rule
                        let pctColor = 'var(--text-secondary)';
                        let deltaColor = 'var(--text-secondary)';

                        if (isFlip) {
                            pctColor = '#eab308';
                            deltaColor = '#eab308';
                        } else if (isConfirmedBullish) {
                            pctColor = 'var(--accent)';
                            deltaColor = 'var(--accent)';
                        } else if (isConfirmedBearish) {
                            pctColor = 'var(--danger)';
                            deltaColor = 'var(--danger)';
                        } else if (isDivergence) {
                            pctColor = '#71717a';
                            deltaColor = '#71717a';
                        }

                        // Net Value color
                        const netValColor = (row.net_value_usd || 0) >= 0 ? 'var(--accent)' : 'var(--danger)';

                        return (
                            <tr
                                key={row.contract}
                                style={{
                                    borderBottom: '1px solid var(--border)',
                                    backgroundColor: rowBg,
                                    transition: 'background-color 0.2s ease'
                                }}
                            >
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {isFlip && <AlertTriangle size={16} color="#eab308" />}
                                        <span style={{
                                            fontWeight: 600,
                                            color: isFlip ? '#eab308' : 'var(--text-primary)',
                                            fontSize: '15px'
                                        }}>
                                            {row.contract}
                                        </span>
                                    </div>
                                </td>
                                <td style={{ padding: '16px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                    {formatNumber(row.net_current)}
                                </td>
                                <td style={{ padding: '16px', fontFamily: 'monospace', color: netValColor }}>
                                    {formatBillions(row.net_value_usd)}
                                </td>
                                <td style={{ padding: '16px', fontFamily: 'monospace', fontWeight: 600, color: pctColor }}>
                                    {row.net_pct_current > 0 ? '+' : ''}{formatNumber(row.net_pct_current, 1)}%
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace', color: deltaColor }}>
                                        {row.delta > 0 && <TrendingUp size={14} />}
                                        {row.delta < 0 && <TrendingDown size={14} />}
                                        {row.delta > 0 ? '+' : ''}{formatNumber(row.delta, 1)}%
                                    </div>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                    {isFlip ? (
                                        <Badge color="#eab308" bg="rgba(234, 179, 8, 0.15)" text="⚠️ COT FLIP" border="rgba(234, 179, 8, 0.3)" />
                                    ) : isConfirmedBullish ? (
                                        <Badge color="var(--accent)" bg="rgba(34, 197, 94, 0.1)" text="STRONG LONG" border="rgba(34, 197, 94, 0.2)" />
                                    ) : isConfirmedBearish ? (
                                        <Badge color="var(--danger)" bg="rgba(239, 68, 68, 0.1)" text="STRONG SHORT" border="rgba(239, 68, 68, 0.2)" />
                                    ) : isDivergence ? (
                                        <Badge color="#71717a" bg="rgba(113, 113, 122, 0.1)" text="WEAK / PROFIT TAKING" />
                                    ) : (
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>NEUTRAL</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {data.length === 0 && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No data available.
                </div>
            )}
        </div>
    );
}

function Badge({ text, color, bg, border }: { text: string, color: string, bg: string, border?: string }) {
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: bg,
            color: color,
            border: border ? `1px solid ${border}` : 'none',
            letterSpacing: '0.05em'
        }}>
            {text}
        </span>
    );
}
