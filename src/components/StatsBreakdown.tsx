
import { useMemo, useState } from 'react';
import { Trade } from '../types';

interface StatsBreakdownProps {
    trades: Trade[];
}

type GroupBy = 'setup' | 'tag' | 'market' | 'direction' | 'day' | 'hour' | 'duration';

interface GroupStats {
    name: string;
    count: number;
    winRate: number;
    totalPnL: number;
    avgWin: number;
    avgLoss: number;
    pf: number;
}

export function StatsBreakdown({ trades }: StatsBreakdownProps) {
    const [groupBy, setGroupBy] = useState<GroupBy>('setup');
    const [sortConfig, setSortConfig] = useState<{ key: keyof GroupStats; direction: 'asc' | 'desc' }>({
        key: 'totalPnL',
        direction: 'desc'
    });

    const groupedStats = useMemo(() => {
        const groups: Record<string, Trade[]> = {};

        trades.forEach(trade => {
            let key = 'Unknown';
            const date = new Date(trade.entryDateTime);

            switch (groupBy) {
                case 'setup':
                    key = trade.setup || 'No Setup';
                    break;
                case 'market':
                    key = trade.market || 'Unknown';
                    break;
                case 'direction':
                    key = trade.direction;
                    break;
                case 'day':
                    key = date.toLocaleDateString('en-US', { weekday: 'long' });
                    break;
                case 'hour':
                    const h = date.getHours();
                    key = `${h}:00 - ${h + 1}:00`;
                    break;
                case 'duration':
                    const s = Math.floor(trade.durationSeconds || 0);
                    if (s < 10) key = '< 10s';
                    else if (s < 30) key = '10s - 30s';
                    else if (s < 60) key = '30s - 1m';
                    else if (s < 120) key = '1m - 2m';
                    else if (s < 300) key = '2m - 5m';
                    else if (s < 600) key = '5m - 10m';
                    else if (s < 900) key = '10m - 15m';
                    else if (s < 1800) key = '15m - 30m';
                    else if (s < 3600) key = '30m - 1h';
                    else if (s < 7200) key = '1h - 2h';
                    else if (s < 14400) key = '2h - 4h';
                    else if (s < 28800) key = '4h - 8h';
                    else if (s < 43200) key = '8h - 12h';
                    else if (s < 86400) key = '12h - 24h';
                    else if (s < 172800) key = '1d - 2d';
                    else if (s < 345600) key = '2d - 4d';
                    else if (s < 691200) key = '4d - 8d';
                    else if (s < 1209600) key = '8d - 14d';
                    else key = '2 Weeks +';
                    break;
                case 'tag':
                    // handled separately below loop for multi-tag
                    break;
            }

            if (groupBy !== 'tag') {
                if (!groups[key]) groups[key] = [];
                groups[key].push(trade);
            } else {
                if (!trade.tags || trade.tags.length === 0) {
                    if (!groups['No Tags']) groups['No Tags'] = [];
                    groups['No Tags'].push(trade);
                } else {
                    trade.tags.forEach(tag => {
                        if (!groups[tag]) groups[tag] = [];
                        groups[tag].push(trade);
                    });
                }
            }
        });

        const stats: GroupStats[] = Object.entries(groups).map(([name, groupTrades]) => {
            const wins = groupTrades.filter(t => (t.pnl || 0) > 0);
            const losses = groupTrades.filter(t => (t.pnl || 0) < 0);
            const totalPnL = groupTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
            const avgWin = wins.reduce((acc, t) => acc + (t.pnl || 0), 0) / (wins.length || 1);
            const avgLoss = losses.reduce((acc, t) => acc + (t.pnl || 0), 0) / (losses.length || 1);
            const pf = Math.abs(avgWin * wins.length) / Math.abs(avgLoss * losses.length) || 0;

            return {
                name,
                count: groupTrades.length,
                winRate: (wins.length / groupTrades.length) * 100,
                totalPnL,
                avgWin,
                avgLoss,
                pf
            };
        });

        return stats.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

    }, [trades, groupBy, sortConfig]);

    const requestSort = (key: keyof GroupStats) => {
        let direction: 'asc' | 'desc' = 'desc'; // Default to desc for metrics usually
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: keyof GroupStats) => {
        if (sortConfig.key !== key) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
        return sortConfig.direction === 'asc'
            ? <span style={{ marginLeft: '4px' }}>↑</span>
            : <span style={{ marginLeft: '4px' }}>↓</span>;
    };

    return (
        <div className="card flex-col gap-4">
            <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0 }}>Performance Breakdown</h3>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {(['setup', 'market', 'direction', 'day', 'hour', 'duration', 'tag'] as GroupBy[]).map(g => (
                        <button
                            key={g}
                            className={`btn ${groupBy === g ? 'btn-primary' : ''}`}
                            onClick={() => {
                                setGroupBy(g);
                                // Reset sort to default Net PnL when changing group? 
                                // User said: "if you haven't clicked anything and just got on the tab it should always rank via the net pnl"
                                // Effectively resizing group implies "getting on the tab" logic or refreshing view. 
                                // Let's reset to ensure "standard ranking is the net pnl"
                                setSortConfig({ key: 'totalPnL', direction: 'desc' });
                            }}
                            style={{ textTransform: 'capitalize', fontSize: '12px', padding: '6px 12px' }}
                        >
                            {g}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '8px' }}>Group</th>
                            <th
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => requestSort('count')}
                            >
                                Count {getSortIndicator('count')}
                            </th>
                            <th
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => requestSort('winRate')}
                            >
                                Win Rate {getSortIndicator('winRate')}
                            </th>
                            <th
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => requestSort('pf')}
                            >
                                PF {getSortIndicator('pf')}
                            </th>
                            <th
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => requestSort('avgWin')}
                            >
                                Avg Win {getSortIndicator('avgWin')}
                            </th>
                            <th
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => requestSort('avgLoss')}
                            >
                                Avg Loss {getSortIndicator('avgLoss')}
                            </th>
                            <th
                                style={{ padding: '8px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => requestSort('totalPnL')}
                            >
                                Net PnL {getSortIndicator('totalPnL')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedStats.map(stat => (
                            <tr key={stat.name} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '10px', fontWeight: 500 }}>{stat.name}</td>
                                <td style={{ padding: '10px' }}>{stat.count}</td>
                                <td style={{ padding: '10px' }}>
                                    <div className="flex items-center gap-2">
                                        <div style={{
                                            width: '40px',
                                            height: '4px',
                                            backgroundColor: 'var(--bg-primary)',
                                            borderRadius: '2px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${stat.winRate}%`,
                                                height: '100%',
                                                backgroundColor:
                                                    stat.winRate === 100 ? 'var(--accent)' : // Green-ish (usually)
                                                        stat.winRate === 0 ? 'var(--danger)' :   // Red
                                                            'var(--text-primary)'                    // White
                                            }} />
                                        </div>
                                        <span style={{
                                            color:
                                                stat.winRate === 100 ? 'var(--accent)' :
                                                    stat.winRate === 0 ? 'var(--danger)' :
                                                        'var(--text-primary)'
                                        }}>
                                            {stat.winRate.toFixed(0)}%
                                        </span>
                                    </div>
                                </td>
                                <td style={{
                                    padding: '10px',
                                    color: stat.pf > 1 || stat.pf === Infinity ? 'var(--accent)' : stat.pf < 1 ? 'var(--danger)' : 'var(--text-primary)'
                                }}>
                                    {stat.pf === Infinity ? 'Infinity' : stat.pf.toFixed(2)}
                                </td>
                                <td style={{
                                    padding: '10px',
                                    color: stat.avgWin > 0 ? 'var(--accent)' : 'var(--text-primary)'
                                }}>
                                    +${stat.avgWin.toFixed(0)}
                                </td>
                                <td style={{
                                    padding: '10px',
                                    color: stat.avgLoss < 0 ? 'var(--danger)' : 'var(--text-primary)'
                                }}>
                                    -${Math.abs(stat.avgLoss).toFixed(0)}
                                </td>
                                <td style={{
                                    padding: '10px',
                                    fontWeight: 'bold',
                                    color: stat.totalPnL > 0 ? 'var(--accent)' : stat.totalPnL < 0 ? 'var(--danger)' : 'var(--text-primary)'
                                }}>
                                    ${stat.totalPnL.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
