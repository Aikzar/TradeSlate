import { useMemo } from 'react';
import { Trade } from '../types';

interface WeekCalendarProps {
    trades: Trade[];

    startDate: Date;
    onTradeClick: (trade: Trade) => void;
    onDayClick: (date: string) => void;
}

export function WeekCalendar({ trades, startDate, onTradeClick, onDayClick }: WeekCalendarProps) {
    const days = useMemo(() => {
        const d = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            d.push(date);
        }
        return d;
    }, [startDate]);

    const tradesByDay = useMemo(() => {
        const map: Record<string, Trade[]> = {};
        trades.forEach(t => {
            const dateKey = new Date(t.entryDateTime).toLocaleDateString('en-CA');
            if (!map[dateKey]) map[dateKey] = [];
            map[dateKey].push(t);
        });
        // Sort trades by time
        Object.keys(map).forEach(key => {
            map[key].sort((a, b) => new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime());
        });
        return map;
    }, [trades]);



    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '12px',
            height: '100%',
            width: '100%',
            overflow: 'hidden' // Container handles overflow
        }}>
            {days.map(date => {
                const dateKey = date.toLocaleDateString('en-CA');
                const dayTrades = tradesByDay[dateKey] || [];
                let tooltip = '';

                const isToday = new Date().toDateString() === date.toDateString();
                const dayPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

                return (
                    <div
                        key={dateKey}
                        className="card"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            padding: '0',
                            backgroundColor: isToday ? 'rgba(var(--accent-rgb), 0.05)' : undefined,
                            borderColor: isToday ? 'var(--accent)' : undefined,
                            borderWidth: isToday ? '1px' : undefined,
                            overflow: 'hidden',
                            position: 'relative'
                        }}
                        title={tooltip} // Add tooltip to the whole card or just the bar? Requirement says "Hovering over this line". But practically, the line is thin. Better to put on the header or line. I will put it on the line as requested primarily.
                    >


                        {/* Header */}
                        <div
                            onClick={() => onDayClick(dateKey)}
                            style={{
                                padding: '12px',
                                borderBottom: '1px solid var(--border)',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                marginTop: '0'
                            }}
                        >
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                {date.toLocaleDateString('default', { weekday: 'short' })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: '6px' }}>
                                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{date.getDate()}</span>
                                <span style={{ fontSize: '12px', opacity: 0.7 }}>
                                    {date.toLocaleDateString('default', { month: 'short' })}
                                </span>
                            </div>
                            {dayTrades.length > 0 && (
                                <div style={{
                                    marginTop: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px'
                                }}>
                                    <div style={{
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        color: dayPnL >= 0 ? 'var(--accent)' : 'var(--danger)'
                                    }}>
                                        ${dayPnL.toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                                        {dayTrades.length} {dayTrades.length === 1 ? 'Trade' : 'Trades'}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Trade List Area */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}>
                            {dayTrades.map(trade => (
                                <div
                                    key={trade.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTradeClick(trade);
                                    }}
                                    style={{
                                        padding: '8px',
                                        borderRadius: '6px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        transition: 'transform 0.1s',
                                    }}
                                    className="hover:scale-[1.02]"
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                        <span style={{ fontWeight: 'bold' }}>{trade.market}</span>
                                        <span style={{
                                            color: trade.direction === 'Long' ? 'var(--accent)' : '#f85149'
                                        }}>
                                            {trade.direction[0]}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                        <span>{new Date(trade.entryDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: (trade.pnl || 0) >= 0 ? 'var(--accent)' : '#f85149'
                                        }}>
                                            ${(trade.pnl || 0).toFixed(0)}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {/* Empty State placeholder for click target */}
                            <div
                                style={{ flex: 1, minHeight: '20px' }}
                                onClick={() => onDayClick(dateKey)}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
