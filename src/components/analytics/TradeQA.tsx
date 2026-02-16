import React, { useState } from 'react';
import { Trade } from '../../types';
import { MessageSquare, Send, Loader2, Sparkles } from 'lucide-react';

interface TradeQAProps {
    trades: Trade[];
    onNavigateToTrade?: (tradeId: string) => void;
}

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    chartType?: 'bar' | 'line' | 'pie' | 'table' | 'none';
    chartData?: {
        labels: string[];
        values: number[];
        colors?: string[];
    };
    chartTitle?: string;
    insight?: string;
}

export function TradeQA({ trades, onNavigateToTrade }: TradeQAProps) {
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);

    const exampleQueries = [
        "What is my win rate on Tuesdays?",
        "Show my PnL by market",
        "What's my best hour to trade?",
        "Which setup has the highest win rate?",
        "Compare my Long vs Short performance"
    ];

    const handleSubmit = async (queryText: string = query) => {
        if (!queryText.trim() || loading) return;

        const userMessage: ChatMessage = { role: 'user', content: queryText };
        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setLoading(true);

        try {
            const result = await window.electronAPI.ai.queryTrades(queryText, trades);

            // Handle Quota Error specifically
            // @ts-ignore - The electron API might return this error object
            if (result.errorType === 'QUOTA_EXCEEDED') {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Daily AI Limit Reached. [Update API Key](settings://ai) to continue.`,
                    insight: "Tip: Adding your own Gemini API key removes these limits."
                }]);
                return;
            }

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: result.answer,
                chartType: result.chartType,
                chartData: result.chartData,
                chartTitle: result.chartTitle,
                insight: result.insight
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (err: any) {
            // Check if error message is our custom quota error (fallback)
            if (err.message && err.message.includes('QUOTA_EXCEEDED')) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Daily AI Limit Reached. [Update API Key](settings://ai) to continue.`
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Sorry, I couldn't process that query: ${err.message}`
                }]);
            }
        } finally {
            setLoading(false);
        }
    };

    const renderMessageContent = (content: string) => {
        // Parse [Label](trade://ID) or [Label](settings://ai)
        const parts = [];
        let lastIndex = 0;
        // Updated regex to capture both protocols
        const regex = /\[([^\]]+)\]\((trade|settings):\/\/([^\)]+)\)/g;
        let match;

        while ((match = regex.exec(content)) !== null) {
            // Add text before match
            if (match.index > lastIndex) {
                parts.push(content.substring(lastIndex, match.index));
            }

            const label = match[1];
            const protocol = match[2];
            const id = match[3];

            if (protocol === 'trade') {
                parts.push(
                    <span
                        key={match.index}
                        onClick={() => onNavigateToTrade?.(id)}
                        style={{
                            color: 'var(--accent)',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {label}
                    </span>
                );
            } else if (protocol === 'settings') {
                parts.push(
                    <button
                        key={match.index}
                        onClick={() => window.location.hash = '#settings'} // Or use a proper navigation handler if available
                        // Since we are in a tab, we probably need a callback to switch tabs globally?
                        // The prompt implies we can just navigate. Let's assume onNavigateToTrade logic or similar.
                        // Actually, the user might need to click the sidebar. 
                        // For now, let's style it as a button but we might need a prop `onNavigateToSettings`?
                        // Let's assume the user knows where settings is, or try to implement a global event.
                        // Wait, React Router? Or Custom Router?
                        // Looking at the codebase, it seems to use state-based routing in App.tsx or similar.
                        // Let's just create a visually distinct link for now.
                        style={{
                            backgroundColor: 'var(--accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            marginTop: '8px',
                            display: 'inline-block'
                        }}
                    >
                        {label} ➝
                    </button>
                );
            }

            lastIndex = regex.lastIndex;
        }

        // Add remaining text
        if (lastIndex < content.length) {
            parts.push(content.substring(lastIndex));
        }

        return parts.length > 0 ? parts : content;
    };

    const renderChart = (message: ChatMessage) => {
        if (!message.chartData || message.chartType === 'none') return null;

        const { labels, values, colors } = message.chartData;
        const maxValue = Math.max(...values.map(Math.abs));

        if (message.chartType === 'bar') {
            return (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                    {message.chartTitle && (
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.7 }}>{message.chartTitle}</h4>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {labels.map((label, idx) => {
                            const value = values[idx];
                            const width = Math.max(5, Math.abs(value) / maxValue * 100);
                            const color = colors?.[idx] || (value >= 0 ? 'var(--accent)' : 'var(--danger)');

                            return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '100px', fontSize: '13px', textAlign: 'right', opacity: 0.7 }}>
                                        {label}
                                    </div>
                                    <div style={{ flex: 1, height: '24px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div
                                            style={{
                                                width: `${width}%`,
                                                height: '100%',
                                                backgroundColor: color,
                                                borderRadius: '4px',
                                                transition: 'width 0.3s ease'
                                            }}
                                        />
                                    </div>
                                    <div style={{ width: '60px', fontSize: '13px', fontWeight: 'bold', color }}>
                                        {typeof value === 'number' && !isNaN(value)
                                            ? (value % 1 === 0 ? value : value.toFixed(1))
                                            : value}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (message.chartType === 'pie') {
            const total = values.reduce((a, b) => a + b, 0);
            return (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                    {message.chartTitle && (
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.7 }}>{message.chartTitle}</h4>
                    )}
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                        {/* Simple pie representation as stacked bar */}
                        <div style={{ display: 'flex', height: '20px', flex: 1, borderRadius: '10px', overflow: 'hidden' }}>
                            {labels.map((_, idx) => {
                                const pct = (values[idx] / total) * 100;
                                const defaultColors = ['var(--accent)', '#eab308', 'var(--danger)', '#3b82f6', '#8b5cf6'];
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            width: `${pct}%`,
                                            height: '100%',
                                            backgroundColor: colors?.[idx] || defaultColors[idx % defaultColors.length]
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {labels.map((label, idx) => {
                            const defaultColors = ['var(--accent)', '#eab308', 'var(--danger)', '#3b82f6', '#8b5cf6'];
                            return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                    <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: colors?.[idx] || defaultColors[idx % defaultColors.length] }} />
                                    <span>{label}: {values[idx]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        if (message.chartType === 'table') {
            return (
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px', overflowX: 'auto' }}>
                    {message.chartTitle && (
                        <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', opacity: 0.7 }}>{message.chartTitle}</h4>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            {labels.map((label, idx) => (
                                <tr key={idx}>
                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>{label}</td>
                                    <td style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'right', fontWeight: 'bold' }}>
                                        {values[idx]}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        return null;
    };

    if (trades.length === 0) {
        return (
            <div style={{ padding: '60px', textAlign: 'center' }}>
                <MessageSquare size={64} style={{ opacity: 0.1, marginBottom: '16px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>
                    Need trade data to answer questions. Add some trades first!
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                    <Sparkles size={24} color="var(--accent)" />
                    Chat with Your Data
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
                    Ask questions about your trading performance in plain English.
                </p>
            </div>

            {/* Example Queries */}
            {messages.length === 0 && (
                <div style={{ marginBottom: '24px' }}>
                    <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Try asking:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {exampleQueries.map((q, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSubmit(q)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '20px',
                                    color: 'var(--text-primary)',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                className="hover:bg-white/10"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                    >
                        <div
                            style={{
                                maxWidth: '80%',
                                padding: '16px',
                                borderRadius: '16px',
                                backgroundColor: msg.role === 'user' ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                color: msg.role === 'user' ? 'white' : 'var(--text-primary)'
                            }}
                        >
                            <p style={{ margin: 0, lineHeight: '1.5' }}>
                                {renderMessageContent(msg.content)}
                            </p>
                            {msg.role === 'assistant' && renderChart(msg)}
                            {msg.insight && (
                                <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: 'var(--accent)10', borderRadius: '8px', border: '1px solid var(--accent)20', fontSize: '13px' }}>
                                    💡 {msg.insight}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.5 }}>
                        <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                        <span>Analyzing your data...</span>
                    </div>
                )}
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    placeholder="Ask a question about your trades..."
                    style={{
                        flex: 1,
                        padding: '14px 18px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        fontSize: '15px'
                    }}
                    disabled={loading}
                />
                <button
                    onClick={() => handleSubmit()}
                    disabled={!query.trim() || loading}
                    style={{
                        padding: '14px 20px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--accent)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: 'bold',
                        opacity: !query.trim() || loading ? 0.5 : 1
                    }}
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
        </div>
    );
}
