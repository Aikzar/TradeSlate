import { useMemo } from 'react';
import { Trade } from '../types';

interface CalendarHeatmapProps {
    trades: Trade[];
}

interface DayStats {
    date: string;
    count: number;
    pnl: number;
    wins: number;
    losses: number;
}

interface CalendarHeatmapProps {
    trades: Trade[];
    year?: number;
    month?: number;
    dates?: Date[];
    onDateClick?: (date: string) => void;
}

interface DayStats {
    date: string;
    count: number;
    pnl: number;
    wins: number;
    losses: number;
}

export function CalendarHeatmap({ trades, year, month, dates, onDateClick }: CalendarHeatmapProps) {
    const calendarData = useMemo(() => {
        const stats: Record<string, DayStats> = {};

        trades.forEach(t => {
            const date = new Date(t.entryDateTime);
            const dateKey = date.toLocaleDateString('en-CA'); // YYYY-MM-DD (local)

            if (!stats[dateKey]) {
                stats[dateKey] = { date: dateKey, count: 0, pnl: 0, wins: 0, losses: 0 };
            }

            stats[dateKey].count++;
            stats[dateKey].pnl += (t.pnl || 0);
            if ((t.pnl || 0) > 0) stats[dateKey].wins++;
            if ((t.pnl || 0) < 0) stats[dateKey].losses++;
        });

        return stats;
    }, [trades]);

    const displayDays = useMemo(() => {
        if (dates) return dates;
        if (year === undefined || month === undefined) return [];

        const days = [];
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // Pad start
        const startDay = firstDayOfMonth.getDay(); // 0 = Sunday
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }

        // Actual days
        for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
            days.push(new Date(year, month, i));
        }
        return days;
    }, [year, month, dates]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)', paddingBottom: '4px' }}>
                        {d}
                    </div>
                ))}

                {displayDays.map((date, index) => {
                    if (!date) return <div key={`empty-${index}`} />;

                    const dateKey = date.toLocaleDateString('en-CA');
                    const dayStat = calendarData[dateKey];

                    let bgColor = 'var(--bg-primary)';
                    let textColor = 'var(--text-secondary)';

                    if (dayStat) {
                        if (dayStat.pnl > 0) {
                            bgColor = 'rgba(46, 160, 67, 0.2)'; // Green tint
                            textColor = 'var(--accent)';
                        } else if (dayStat.pnl < 0) {
                            bgColor = 'rgba(248, 81, 73, 0.2)'; // Red tint
                            textColor = '#f85149';
                        } else {
                            bgColor = 'var(--border)';
                            textColor = 'var(--text-primary)';
                        }
                    }

                    const isToday = new Date().toDateString() === date.toDateString();

                    return (
                        <div
                            key={dateKey}
                            onClick={() => onDateClick?.(dateKey)}
                            style={{
                                height: '80px',
                                backgroundColor: bgColor,
                                borderRadius: '6px',
                                padding: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                                cursor: 'pointer'
                            }}
                            title={dayStat ? `${dayStat.count} trades, $${dayStat.pnl.toFixed(2)}` : ''}
                        >
                            <div style={{ fontSize: '12px', opacity: 0.7 }}>{date.getDate()}</div>
                            {dayStat && (
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: textColor }}>
                                        ${Number(dayStat.pnl).toFixed(0)}
                                    </div>
                                    <div style={{ fontSize: '11px', opacity: 0.8, color: 'var(--text-secondary)' }}>
                                        {dayStat.count} {dayStat.count === 1 ? 'Trade' : 'Trades'}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
