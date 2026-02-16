import React, { useMemo } from 'react';
import { Trade } from '../../types';
import { RecommendationEngine, Recommendation } from './RecommendationEngine';
import { AlertTriangle, CheckCircle, TrendingUp, ShieldAlert, Zap, ArrowRight } from 'lucide-react';

interface SmartRecommendationsProps {
    trades: Trade[];
}

export const SmartRecommendations: React.FC<SmartRecommendationsProps> = ({ trades }) => {

    const recommendations = useMemo(() => {
        const engine = new RecommendationEngine(trades);
        return engine.generate();
    }, [trades]);

    if (recommendations.length === 0) {
        return null;
    }

    const getIcon = (type: Recommendation['type']) => {
        switch (type) {
            case 'Critical': return <ShieldAlert size={20} color="var(--danger)" />;
            case 'Warning': return <AlertTriangle size={20} color="#eab308" />;
            case 'Optimization': return <Zap size={20} color="var(--accent)" />;
            case 'Good': return <CheckCircle size={20} color="var(--success)" />;
            default: return <TrendingUp size={20} />;
        }
    };

    const getBorderColor = (type: Recommendation['type']) => {
        switch (type) {
            case 'Critical': return 'var(--danger)';
            case 'Warning': return '#eab308';
            case 'Optimization': return 'var(--accent)';
            case 'Good': return 'var(--success)';
            default: return 'var(--border)';
        }
    };

    return (
        <div className="section-container" style={{ marginBottom: '32px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Zap size={20} color="var(--accent)" />
                Smart Recommendations
                <span style={{ fontSize: '12px', opacity: 0.5, fontWeight: 'normal' }}>
                    Based on {trades.length} trades
                </span>
            </h3>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px'
            }}>
                {recommendations.map(rec => (
                    <div
                        key={rec.id}
                        style={{
                            padding: '16px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: `1px solid rgba(255,255,255,0.05)`,
                            borderLeft: `3px solid ${getBorderColor(rec.type)}`,
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {getIcon(rec.type)}
                                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{rec.title}</div>
                            </div>
                            {rec.metricValue && (
                                <div style={{
                                    fontSize: '11px',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: 'rgba(255,255,255,0.1)'
                                }}>
                                    {rec.metricValue}
                                </div>
                            )}
                        </div>

                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                            {rec.description}
                        </div>

                        <div style={{
                            marginTop: 'auto',
                            paddingTop: '12px',
                            borderTop: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            gap: '6px',
                            alignItems: 'start'
                        }}>
                            <ArrowRight size={14} style={{ marginTop: '2px', opacity: 0.7 }} />
                            <div style={{ fontSize: '12px', fontWeight: '500', color: '#fff' }}>
                                {rec.actionable}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
