import { useState, useMemo } from 'react';
import { useTrades } from '../hooks/useTrades';
import { CalendarHeatmap } from '../components/CalendarHeatmap';
import { WeekCalendar } from '../components/WeekCalendar';
import { TradeSummaryModal } from '../components/TradeSummaryModal';
import { DayDetailsModal } from '../components/DayDetailsModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Trade } from '../types';

type ViewType = 'Week' | 'Month' | 'Quarter' | 'Year';

interface CalendarPageProps {
    onNavigateToJournal?: (tradeId: string) => void;
}

export function CalendarPage({ onNavigateToJournal }: CalendarPageProps) {
    const { trades, loading } = useTrades();
    const [viewType, setViewType] = useState<ViewType>('Month');
    const [baseDate, setBaseDate] = useState(new Date());

    // Modal State
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [viewingTrade, setViewingTrade] = useState<Trade | null>(null);

    const periodStats = useMemo(() => {
        if (loading || !trades) return { totalPnL: 0, count: 0 };

        let start: Date;
        let end: Date;

        const d = new Date(baseDate);
        if (viewType === 'Week') {
            const day = d.getDay();
            start = new Date(d.setDate(d.getDate() - day));
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(end.getDate() + 7);
        } else if (viewType === 'Month') {
            start = new Date(d.getFullYear(), d.getMonth(), 1);
            end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        } else if (viewType === 'Quarter') {
            const quarter = Math.floor(d.getMonth() / 3);
            start = new Date(d.getFullYear(), quarter * 3, 1);
            end = new Date(d.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
        } else {
            start = new Date(d.getFullYear(), 0, 1);
            end = new Date(d.getFullYear(), 11, 31, 23, 59, 59);
        }

        const filtered = trades.filter(t => {
            const tradeDate = new Date(t.entryDateTime);
            return tradeDate >= start && tradeDate <= end;
        });

        const totalPnL = filtered.reduce((acc, t) => acc + (t.pnl || 0), 0);
        return { totalPnL, count: filtered.length, start, end };
    }, [trades, baseDate, viewType, loading]);



    const navigate = (direction: number) => {
        const next = new Date(baseDate);
        if (viewType === 'Week') next.setDate(next.getDate() + (direction * 7));
        else if (viewType === 'Month') next.setMonth(next.getMonth() + direction);
        else if (viewType === 'Quarter') next.setMonth(next.getMonth() + (direction * 3));
        else next.setFullYear(next.getFullYear() + direction);
        setBaseDate(next);
    };

    const handleEditTrade = (tradeId: string) => {
        if (onNavigateToJournal) {
            onNavigateToJournal(tradeId);
        }
    };

    const renderCalendarGrids = () => {
        if (viewType === 'Month') {
            return (
                <div className="card" style={{ padding: '24px' }}>
                    <CalendarHeatmap
                        trades={trades}
                        year={baseDate.getFullYear()}
                        month={baseDate.getMonth()}
                        onDateClick={(date) => setSelectedDate(date)}
                    />
                </div>
            );
        }

        if (viewType === 'Week') {
            const start = periodStats.start ? new Date(periodStats.start) : new Date(); // Fallback
            return (
                <div style={{ height: '100%' }}>
                    <WeekCalendar
                        trades={trades}
                        startDate={start}
                        onTradeClick={(t) => setViewingTrade(t)}
                        onDayClick={(date) => setSelectedDate(date)}
                    />
                </div>
            );
        }

        if (viewType === 'Quarter') {
            const quarter = Math.floor(baseDate.getMonth() / 3);
            const months = [0, 1, 2].map(i => {
                const d = new Date(baseDate.getFullYear(), (quarter * 3) + i, 1);
                return { year: d.getFullYear(), month: d.getMonth() };
            });

            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                    {months.map(m => (
                        <div key={`${m.year}-${m.month}`} className="card" style={{ padding: '20px' }}>
                            <h4 style={{ margin: '0 0 16px 0', textAlign: 'center' }}>
                                {new Date(m.year, m.month).toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </h4>
                            <CalendarHeatmap
                                trades={trades}
                                year={m.year}
                                month={m.month}
                                onDateClick={(date) => setSelectedDate(date)}
                            />
                        </div>
                    ))}
                </div>
            );
        }

        // Year View
        const yearMonths = Array.from({ length: 12 }, (_, i) => ({ year: baseDate.getFullYear(), month: i }));
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                {yearMonths.map(m => (
                    <div key={`${m.year}-${m.month}`} className="card" style={{ padding: '20px' }}>
                        <h4 style={{ margin: '0 0 16px 0', textAlign: 'center' }}>
                            {new Date(m.year, m.month).toLocaleString('default', { month: 'long' })}
                        </h4>
                        <CalendarHeatmap
                            trades={trades}
                            year={m.year}
                            month={m.month}
                            onDateClick={(date) => setSelectedDate(date)}
                        />
                    </div>
                ))}
            </div>
        );
    };

    const getPeriodLabel = () => {
        if (viewType === 'Week') {
            return `Week of ${periodStats.start?.toLocaleDateString()}`;
        }
        if (viewType === 'Month') {
            return baseDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        if (viewType === 'Quarter') {
            const q = Math.floor(baseDate.getMonth() / 3) + 1;
            return `Q${q} ${baseDate.getFullYear()}`;
        }
        return `Year ${baseDate.getFullYear()}`;
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            padding: '24px',
            boxSizing: 'border-box',
            gap: '24px',
            overflowY: 'hidden' // Important for scrollable Week view
        }}>
            {/* Header / Filter Bar */}
            <div className="flex justify-between items-center bg-secondary p-4 rounded-xl border border-border shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex bg-tertiary p-1 rounded-lg">
                        {(['Week', 'Month', 'Quarter', 'Year'] as ViewType[]).map(v => (
                            <button
                                key={v}
                                className={`btn ${viewType === v ? 'btn-primary' : ''}`}
                                style={{ padding: '6px 16px', fontSize: '13px' }}
                                onClick={() => setViewType(v)}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                        <button className="btn" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
                        <span style={{ fontWeight: 600, fontSize: '16px', minWidth: '150px', textAlign: 'center' }}>
                            {getPeriodLabel()}
                        </span>
                        <button className="btn" onClick={() => navigate(1)}><ChevronRight size={18} /></button>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Period PnL</div>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: periodStats.totalPnL >= 0 ? 'var(--accent)' : 'var(--danger)'
                        }}>
                            ${periodStats.totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Trades</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{periodStats.count}</div>
                    </div>
                </div>
            </div>

            {/* Notifications / Warnings */}


            {/* Calendar Grid */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                {renderCalendarGrids()}
            </div>

            {/* Modals */}
            {selectedDate && (
                <DayDetailsModal
                    date={selectedDate}
                    trades={trades}
                    onClose={() => setSelectedDate(null)}
                    onTradeClick={(t) => {
                        setSelectedDate(null);
                        setViewingTrade(t);
                    }}
                />
            )}

            {viewingTrade && (
                <TradeSummaryModal
                    trade={viewingTrade}
                    onClose={() => setViewingTrade(null)}
                    onEdit={handleEditTrade}
                />
            )}
        </div>
    );
}

