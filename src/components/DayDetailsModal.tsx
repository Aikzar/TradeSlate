import { useMemo } from 'react';
import { Trade } from '../types';
import { X } from 'lucide-react';

interface DayDetailsModalProps {
    date: string; // YYYY-MM-DD
    trades: Trade[];

    onClose: () => void;
    onTradeClick: (trade: Trade) => void;
}

export function DayDetailsModal({ date, trades, onClose, onTradeClick }: DayDetailsModalProps) {
    const dayTrades = useMemo(() => {
        return trades.filter(t =>
            new Date(t.entryDateTime).toLocaleDateString('en-CA') === date
        ).sort((a, b) => new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime());
    }, [date, trades]);

    const stats = useMemo(() => {
        const totalPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
        const wins = dayTrades.filter(t => (t.pnl || 0) > 0).length;
        const losses = dayTrades.filter(t => (t.pnl || 0) <= 0).length;
        return { totalPnL, wins, losses };
    }, [dayTrades]);

    const dateObj = new Date(date);



    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="card" style={{
                width: '900px', // Widened further for columns
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                padding: '0',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-tertiary)'
                }}>
                    <div>
                        <h3 style={{ margin: 0 }}>{dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {dayTrades.length} Trades •
                            <span style={{
                                color: stats.totalPnL >= 0 ? 'var(--accent)' : 'var(--danger)',
                                fontWeight: 'bold',
                                marginLeft: '4px'
                            }}>
                                ${stats.totalPnL.toFixed(2)}
                            </span>
                        </div>
                    </div>
                    <button className="btn" onClick={onClose} style={{ padding: '8px' }}>
                        <X size={20} />
                    </button>
                </div>

                <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', flex: 1 }}>



                    {/* Trade List */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                            Trades
                        </h4>
                        {dayTrades.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                No trades recorded.
                            </div>
                        ) : (
                            dayTrades.map(trade => (
                                <div
                                    key={trade.id}
                                    onClick={() => onTradeClick(trade)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px',
                                        backgroundColor: 'var(--bg-primary)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer'
                                    }}
                                    className="hover:bg-secondary"
                                >
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '6px',
                                            backgroundColor: trade.direction === 'Long' ? 'rgba(var(--accent-rgb), 0.1)' : 'rgba(248, 81, 73, 0.1)',
                                            color: trade.direction === 'Long' ? 'var(--accent)' : '#f85149',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '18px'
                                        }}>
                                            {trade.direction[0]}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{trade.market}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {new Date(trade.entryDateTime).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontWeight: 'bold',
                                            color: (trade.pnl || 0) >= 0 ? 'var(--accent)' : '#f85149',
                                            fontSize: '16px'
                                        }}>
                                            ${(trade.pnl || 0).toFixed(2)}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {trade.contracts} contracts
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
