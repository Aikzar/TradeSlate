
import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { Trade } from '../types';

export function TimeAnalysis({ trades }: { trades: Trade[] }) {
    const { hourlyData, dailyData } = useMemo(() => {
        const hours = Array(24).fill(0).map((_, i) => ({ hour: i, pnl: 0, count: 0 }));
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => ({ day: d, pnl: 0, count: 0 }));

        trades.forEach(t => {
            const date = new Date(t.entryDateTime);
            const h = date.getHours();
            const d = date.getDay();

            hours[h].pnl += (t.pnl || 0);
            hours[h].count++;

            days[d].pnl += (t.pnl || 0);
            days[d].count++;
        });

        // Filter out empty hours/days for cleaner charts? Or keep for structure?
        // Let's keep typical trading hours (e.g. 8-18) visible if we want, but dynamic is better.
        // For now, filter out zero-activity buckets to save space? 
        // No, fixed axis is often better for "Time of Day". Let's use all hours that have data.
        const activeHours = hours.filter(h => h.count > 0);
        const activeDays = days.filter(d => d.count > 0);

        return { hourlyData: activeHours, dailyData: activeDays };

    }, [trades]);

    if (trades.length === 0) return null;

    return (
        <>
            {/* Hour of Day */}
            <div className="card" style={{ height: '300px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 16px 0' }}>PnL by Hour</h4>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="hour" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={(h) => `${h}:00`} />
                        <YAxis
                            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                            tickFormatter={(val) => `$${val}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            cursor={{ fill: 'var(--bg-tertiary)' }}
                            formatter={(value: number | undefined) => [`$${(value || 0).toFixed(2)}`, 'PnL']}
                            labelFormatter={(label) => `${label}:00`}
                        />
                        <Bar dataKey="pnl">
                            {hourlyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? 'var(--accent)' : 'var(--danger)'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Day of Week */}
            <div className="card" style={{ height: '300px', padding: '16px', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 16px 0' }}>PnL by Day</h4>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={(d) => d.substring(0, 3)} />
                        <YAxis
                            tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                            tickFormatter={(val) => `$${val}`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            cursor={{ fill: 'var(--bg-tertiary)' }}
                            formatter={(value: number | undefined) => [`$${(value || 0).toFixed(2)}`, 'PnL']}
                        />
                        <Bar dataKey="pnl">
                            {dailyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? 'var(--accent)' : 'var(--danger)'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </>
    );
}
