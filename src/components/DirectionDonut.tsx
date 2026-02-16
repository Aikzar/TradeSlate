
import { PieChart, Pie, Cell, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import { Trade } from '../types';

interface DirectionDonutProps {
    trades: Trade[];
}

const COLORS = ['#22c55e', '#ef4444']; // Green for Long, Red for Short

export function DirectionDonut({ trades }: DirectionDonutProps) {
    const longs = trades.filter(t => t.direction === 'Long').length;
    const shorts = trades.filter(t => t.direction === 'Short').length;

    const data = [
        { name: 'Long', value: longs },
        { name: 'Short', value: shorts }
    ];

    if (trades.length === 0) {
        return (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: 'var(--text-secondary)' }}>
                No trades yet
            </div>
        );
    }

    return (
        <div className="card" style={{ height: '250px' }}>
            <h4 style={{ margin: '0 0 8px 0', textAlign: 'center' }}>Direction</h4>
            <ResponsiveContainer width="100%" height="90%">
                <PieChart margin={{ top: 20, bottom: 20, left: 0, right: 0 }}>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}
