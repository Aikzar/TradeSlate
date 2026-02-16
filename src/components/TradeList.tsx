
import { Trade } from '../types';

interface TradeListProps {
    trades: Trade[];
    loading: boolean;
    onEdit?: (trade: Trade) => void;
}

export function TradeList({ trades, loading, onEdit }: TradeListProps) {
    if (loading) {
        return <div className="p-4 text-center text-secondary">Loading trades...</div>;
    }

    if (trades.length === 0) {
        return (
            <div style={{ padding: '32px', color: 'var(--text-secondary)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span>No trades found.</span>
                <span style={{ fontSize: '0.9em', opacity: 0.7 }}>Start logging your session!</span>
            </div>
        );
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Time</th>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Market</th>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Dir</th>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Price</th>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Size</th>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
                        <th style={{ padding: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>PnL</th>
                    </tr>
                </thead>
                <tbody>
                    {trades.map((trade) => (
                        <tr
                            key={trade.id}
                            style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                            className="hover:bg-secondary"
                            onClick={() => onEdit?.(trade)}
                        >
                            <td style={{ padding: '12px' }}>
                                {new Date(trade.entryDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '12px', fontWeight: 500 }}>{trade.market}</td>
                            <td style={{ padding: '12px' }}>
                                <span style={{
                                    color: trade.direction === 'Long' ? 'var(--accent)' : '#f85149',
                                    backgroundColor: trade.direction === 'Long' ? 'rgba(35, 134, 54, 0.1)' : 'rgba(248, 81, 73, 0.1)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                }}>
                                    {trade.direction}
                                </span>
                            </td>
                            <td style={{ padding: '12px' }}>{trade.entryPrice.toFixed(2)}</td>
                            <td style={{ padding: '12px' }}>{trade.contracts}</td>
                            <td style={{ padding: '12px' }}>
                                <span style={{
                                    fontSize: '12px',
                                    opacity: 0.8,
                                    border: '1px solid var(--border)',
                                    padding: '2px 6px',
                                    borderRadius: '12px'
                                }}>
                                    {trade.status}
                                </span>
                            </td>
                            <td style={{ padding: '12px', fontWeight: 'bold' }}>
                                {trade.pnl !== undefined ? (
                                    <span style={{ color: trade.pnl >= 0 ? 'var(--accent)' : '#f85149' }}>
                                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                                    </span>
                                ) : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
