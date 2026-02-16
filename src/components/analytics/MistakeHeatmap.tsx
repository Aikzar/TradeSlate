import React, { useMemo } from 'react';
import { Trade } from '../../types';
import { Grid, AlertTriangle } from 'lucide-react';

interface MistakeHeatmapProps {
    trades: Trade[];
}

export function MistakeHeatmap({ trades }: MistakeHeatmapProps) {
    const [timezoneOffset, setTimezoneOffset] = React.useState(0);

    React.useEffect(() => {
        (async () => {
            try {
                const tzSetting = await window.electronAPI.settings.get('timezone_offset');
                if (tzSetting) {
                    const val = typeof tzSetting === 'string' ? parseInt(tzSetting) : (tzSetting.value ? parseInt(tzSetting.value) : 0);
                    if (!isNaN(val)) setTimezoneOffset(val);
                }
            } catch (e) {
                console.error("Failed to load timezone offset", e);
            }
        })();
    }, []);

    const analysis = useMemo(() => {
        const tradesWithMistakes = trades.filter(t => t.mistakes && t.mistakes.length > 0);

        if (tradesWithMistakes.length < 3) return null;

        // Create heatmap grid: rows = days (Mon-Fri), cols = hours (0-23)
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23

        // Initialize grid
        const grid: { [day: string]: { [hour: number]: { count: number; trades: number; mistakes: string[] } } } = {};
        const tradesGrid: { [day: string]: { [hour: number]: number } } = {};

        days.forEach(day => {
            grid[day] = {};
            tradesGrid[day] = {};
            hours.forEach(hour => {
                grid[day][hour] = { count: 0, trades: 0, mistakes: [] };
                tradesGrid[day][hour] = 0;
            });
        });

        // Helper to adjust time
        const getAdjustedTime = (date: Date) => {
            // We use local getHours() as base, then shift by user offset
            // This is "System Time + Offset" logic
            let hour = date.getHours() + timezoneOffset;
            let dayIndex = date.getDay(); // 0 = Sun, 1 = Mon ...

            // Handle wrap-around
            if (hour >= 24) {
                hour -= 24;
                dayIndex = (dayIndex + 1) % 7;
            } else if (hour < 0) {
                hour += 24;
                dayIndex = (dayIndex - 1 + 7) % 7;
            }

            // Convert back to day string
            // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            return { day: dayNames[dayIndex], hour };
        };

        // Count all trades by day/hour
        trades.forEach(trade => {
            const date = new Date(trade.entryDateTime);
            const { day, hour } = getAdjustedTime(date);

            if (days.includes(day) && hours.includes(hour)) {
                tradesGrid[day][hour]++;
            }
        });

        // Count mistakes by day/hour
        tradesWithMistakes.forEach(trade => {
            const date = new Date(trade.entryDateTime);
            const { day, hour } = getAdjustedTime(date);

            if (days.includes(day) && hours.includes(hour) && trade.mistakes) {
                grid[day][hour].count += trade.mistakes.length;
                grid[day][hour].trades++;
                grid[day][hour].mistakes.push(...trade.mistakes);
            }
        });

        // Find max for color scaling
        let maxMistakes = 0;
        days.forEach(day => {
            hours.forEach(hour => {
                if (grid[day][hour].count > maxMistakes) {
                    maxMistakes = grid[day][hour].count;
                }
            });
        });

        // Find worst time slots
        const timeSlots: { day: string; hour: number; count: number; mistakes: string[] }[] = [];
        days.forEach(day => {
            hours.forEach(hour => {
                if (grid[day][hour].count > 0) {
                    timeSlots.push({
                        day,
                        hour,
                        count: grid[day][hour].count,
                        mistakes: grid[day][hour].mistakes
                    });
                }
            });
        });
        timeSlots.sort((a, b) => b.count - a.count);

        // Count mistake types
        const mistakeTypes: { [type: string]: number } = {};
        tradesWithMistakes.forEach(trade => {
            trade.mistakes?.forEach(m => {
                mistakeTypes[m] = (mistakeTypes[m] || 0) + 1;
            });
        });

        const sortedMistakeTypes = Object.entries(mistakeTypes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            grid,
            tradesGrid,
            days,
            hours,
            maxMistakes,
            worstSlots: timeSlots.slice(0, 3),
            totalMistakes: tradesWithMistakes.reduce((a, t) => a + (t.mistakes?.length || 0), 0),
            tradesWithMistakes: tradesWithMistakes.length,
            sortedMistakeTypes
        };
    }, [trades, timezoneOffset]);

    if (!analysis) {
        return (
            <div style={{ padding: '60px', textAlign: 'center' }}>
                <Grid size={64} style={{ opacity: 0.1, marginBottom: '16px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>
                    Need at least 3 trades with tagged mistakes to generate the heatmap.
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
                    Add mistakes to your trades in the Journal.
                </p>
            </div>
        );
    }

    const getColor = (count: number) => {
        if (count === 0) return 'rgba(255,255,255,0.03)';
        const intensity = Math.min(count / analysis.maxMistakes, 1);
        // Red gradient
        return `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`;
    };

    const formatHour = (hour: number) => {
        return hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`;
    };

    const HeatmapGrid = ({ hoursRange, title }: { hoursRange: number[], title: string }) => (
        <div style={{ marginBottom: '24px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', opacity: 0.5, textTransform: 'uppercase' }}>{title}</h4>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '4px' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '8px', textAlign: 'left', fontSize: '12px', opacity: 0.5 }}></th>
                            {hoursRange.map(hour => (
                                <th key={hour} style={{ padding: '8px', textAlign: 'center', fontSize: '11px', opacity: 0.7, minWidth: '40px' }}>
                                    {formatHour(hour)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {analysis.days.map(day => (
                            <tr key={day}>
                                <td style={{ padding: '8px 16px 8px 0', fontSize: '13px', fontWeight: '500' }}>
                                    {day}
                                </td>
                                {hoursRange.map(hour => {
                                    const cell = analysis.grid[day][hour];
                                    const tradeCounts = analysis.tradesGrid[day][hour];
                                    return (
                                        <td
                                            key={hour}
                                            style={{
                                                padding: '12px 4px',
                                                textAlign: 'center',
                                                backgroundColor: getColor(cell.count),
                                                borderRadius: '4px',
                                                cursor: cell.count > 0 ? 'help' : 'default',
                                                fontSize: '11px'
                                            }}
                                            title={cell.count > 0
                                                ? `${cell.count} mistakes in ${tradeCounts} trades\n${[...new Set(cell.mistakes)].join(', ')}`
                                                : `${tradeCounts} trades, no mistakes`
                                            }
                                        >
                                            {cell.count > 0 && (
                                                <span style={{ fontWeight: 'bold' }}>
                                                    {cell.count}
                                                </span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase' }}>
                        Total Mistakes
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--danger)' }}>
                        {analysis.totalMistakes}
                    </div>
                </div>
                <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase' }}>
                        Trades with Mistakes
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '900' }}>
                        {analysis.tradesWithMistakes}
                    </div>
                </div>
                <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px', textTransform: 'uppercase' }}>
                        Worst Time
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                        {analysis.worstSlots[0]
                            ? `${analysis.worstSlots[0].day.slice(0, 3)} ${formatHour(analysis.worstSlots[0].hour)}`
                            : 'N/A'
                        }
                    </div>
                </div>
            </div>

            {/* Heatmap */}
            <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <Grid size={20} color="var(--danger)" />
                        Mistake Frequency
                    </h3>
                    <div style={{ fontSize: '12px', opacity: 0.5 }}>
                        Timezone Offset: {timezoneOffset > 0 ? `+${timezoneOffset}` : timezoneOffset}h
                    </div>
                </div>

                <HeatmapGrid hoursRange={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]} title="AM Session (00:00 - 11:59)" />
                <HeatmapGrid hoursRange={[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]} title="PM Session (12:00 - 23:59)" />

                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '24px', justifyContent: 'center' }}>
                    <span style={{ fontSize: '12px', opacity: 0.5 }}>Fewer</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
                            <div
                                key={i}
                                style={{
                                    width: '24px',
                                    height: '16px',
                                    backgroundColor: intensity === 0
                                        ? 'rgba(255,255,255,0.03)'
                                        : `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`,
                                    borderRadius: '3px'
                                }}
                            />
                        ))}
                    </div>
                    <span style={{ fontSize: '12px', opacity: 0.5 }}>More Mistakes</span>
                </div>
            </div>

            {/* Insights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '20px' }}>
                        <AlertTriangle size={20} color="#eab308" />
                        Danger Zones
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {analysis.worstSlots.map((slot, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: 'var(--danger)10',
                                    border: '1px solid var(--danger)20'
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>
                                        {slot.day} {formatHour(slot.hour)}
                                    </div>
                                    <div style={{ fontSize: '11px', opacity: 0.5, marginTop: '2px' }}>
                                        {[...new Set(slot.mistakes)].slice(0, 3).join(', ')}
                                    </div>
                                </div>
                                <div style={{ color: 'var(--danger)', fontWeight: 'bold', fontSize: '1.25rem' }}>
                                    {slot.count}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="card" style={{ padding: '24px' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0, marginBottom: '20px' }}>
                        <AlertTriangle size={20} color="var(--danger)" />
                        Most Common Mistakes
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {analysis.sortedMistakeTypes.map(([mistake, count], idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(255,255,255,0.03)'
                                }}
                            >
                                <span>{mistake}</span>
                                <span style={{ fontWeight: 'bold' }}>{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
