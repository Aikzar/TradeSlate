import { useState, useEffect, useRef } from 'react';
import { SignalGenerator } from '../components/SignalGenerator';
import { COTTable } from '../components/COTTable';
import { COTSignals } from '../components/COTSignals';
import { StrategyGuideModal } from '../components/StrategyGuideModal';
import { COTReport } from '../types';
import { RefreshCw, AlertCircle, ChevronDown, FolderOpen, Calendar, CloudDownload, Info } from 'lucide-react';

// Asset categories available in the dropdown
const CATEGORIES = ['All Assets', 'Forex', 'Indices', 'Crypto', 'Bonds', 'Commodities'] as const;
type Category = typeof CATEGORIES[number];

export function COTPage() {
    const [report, setReport] = useState<COTReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<Category>('All Assets');
    const [historyDates, setHistoryDates] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>('LATEST');
    const [statusToast, setStatusToast] = useState<{ msg: string, type: 'success' | 'info' | 'error' } | null>(null);
    const [showStrategyGuide, setShowStrategyGuide] = useState(false);



    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadData = async (date: string = 'LATEST') => {
        try {
            setLoading(true);
            setError(null);
            let data;

            if (date === 'LATEST') {
                data = await window.electronAPI.cot.getLatest();
            } else {
                data = await window.electronAPI.cot.getReportByDate(date);
            }

            if (data) {
                setReport(data);
                // If we loaded latest, sync selector to actual date if possible
                if (date === 'LATEST' && data.date) {
                    // Don't change selectedDate state to keep "LATEST" logic, just display date
                }
            }
        } catch (err: any) {
            console.error('Failed to load COT data:', err);
            setError(err.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            const dates = await window.electronAPI.cot.getHistoryDates();
            setHistoryDates(dates || []);
        } catch (e) {
            console.error('Failed to fetch history dates', e);
        }
    };

    const handleAutoFetch = async () => {
        try {
            setLoading(true);
            setStatusToast({ msg: 'Fetching data from CFTC...', type: 'info' });

            const result = await window.electronAPI.cot.fetchLatest();
            console.log('Fetch Result:', result);

            if (result.status === 'ERROR') {
                throw new Error('Fetch failed. Check logs.');
            }

            // Refresh history and data
            await fetchHistory();
            await loadData('LATEST');
            setSelectedDate('LATEST');

            const msgs: Record<string, string> = {
                'SAVED': 'Active week data saved successfully.',
                'UPDATED': 'Data updated with corrections.',
                'UP_TO_DATE': 'Data is already up to date.'
            };

            setStatusToast({
                msg: msgs[result.status] || 'Fetch complete',
                type: result.status === 'ERROR' ? 'error' : 'success'
            });

            // Clear toast after 3s
            setTimeout(() => setStatusToast(null), 3000);

        } catch (err: any) {
            console.error('Auto fetch failed:', err);
            setError('Fetch Failed: ' + err.message);
            setStatusToast({ msg: 'Fetch failed', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleLoadFromAssets = async () => {
        try {
            setLoading(true);
            const result = await window.electronAPI.cot.loadFromAssets();
            setReport(result.report);
            await fetchHistory(); // Refresh DB history
        } catch (err: any) {
            setError('Asset Load Failed: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            setLoading(true);
            const text = await file.text();
            const data = await window.electronAPI.cot.parseFile(text);
            setReport(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };



    // Format Date Helper
    const formatReleaseDate = (dateStr: string) => {
        if (!dateStr || dateStr === 'LEGACY') return 'Unknown Date';
        const date = new Date(dateStr);
        const utcDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);

        const release = new Date(utcDate);
        release.setDate(utcDate.getDate() + 3);

        const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
        const dateFmt = utcDate.toLocaleDateString('en-US', options);
        const releaseFmt = release.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `Data Date: ${dateFmt} (Released ${releaseFmt})`;
    };

    const hasAutoFetched = useRef(false);

    useEffect(() => {
        const init = async () => {
            const dates = await window.electronAPI.cot.getHistoryDates();
            setHistoryDates(dates || []);

            if (dates && dates.length > 0) {
                await loadData(dates[0]);
                setSelectedDate(dates[0]);
            } else {
                await loadData('LATEST');
            }

            if (!hasAutoFetched.current) {
                const now = new Date();
                const day = now.getUTCDay();
                const hour = now.getUTCHours();
                const min = now.getUTCMinutes();

                const isAfterRelease = (day === 5 && (hour > 20 || (hour === 20 && min >= 40))) || day === 6 || day === 0;

                if (isAfterRelease) {
                    let daysAgo = 0;
                    if (day === 5) daysAgo = 3;
                    else if (day === 6) daysAgo = 4;
                    else if (day === 0) daysAgo = 5;

                    const expectedDate = new Date(now);
                    expectedDate.setUTCDate(now.getUTCDate() - daysAgo);
                    const expectedStr = expectedDate.toISOString().split('T')[0];

                    if (!dates || !dates.includes(expectedStr)) {
                        hasAutoFetched.current = true;
                        handleAutoFetch();
                    }
                }
            }
        };
        init();
    }, []);

    // Filter data
    const filteredData = report?.data.filter(d =>
        selectedCategory === 'All Assets' || d.category === selectedCategory
    ) ?? [];

    const availableCategories = report?.data
        ? ['All Assets', ...new Set(report.data.map(d => d.category))]
        : CATEGORIES;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '24px', boxSizing: 'border-box', gap: '24px', overflowY: 'auto' }}>

            {/* Header & Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Institutional Bias (COT)
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {report ? formatReleaseDate(report.date) : 'CFTC Futures & Options Reports'}
                        </p>
                        {statusToast && (
                            <div style={{
                                padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                                background: statusToast.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)',
                                color: statusToast.type === 'error' ? '#fca5a5' : '#86efac',
                                border: `1px solid ${statusToast.type === 'error' ? '#f87171' : '#4ade80'}`
                            }}>
                                {statusToast.msg}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>

                    {/* Week Selector */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <label style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>
                            REPORT WEEK
                        </label>
                        <div style={{ position: 'relative' }}>
                            <select
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    loadData(e.target.value);
                                }}
                                style={{
                                    appearance: 'none',
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '6px',
                                    padding: '6px 32px 6px 12px',
                                    fontSize: '13px',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    minWidth: '140px'
                                }}
                            >
                                <option value="LATEST">Latest Available</option>
                                {historyDates.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <Calendar size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.7 }} />
                        </div>
                    </div>

                    <div style={{ width: '1px', height: '32px', background: 'var(--border)', margin: '0 8px' }} />

                    {/* Action Buttons */}
                    <button onClick={handleAutoFetch} disabled={loading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {loading ? <RefreshCw size={16} className="animate-spin" /> : <CloudDownload size={16} />}
                        <span>Fetch Latest</span>
                    </button>

                    <button onClick={handleLoadFromAssets} disabled={loading} className="btn" style={{ gap: '8px' }} title="Load from Assets folder">
                        <FolderOpen size={16} />
                    </button>

                    <button onClick={() => setShowStrategyGuide(true)} className="btn" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }} title="Strategy Guide">
                        <Info size={16} />
                    </button>



                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".txt,.csv" style={{ display: 'none' }} />
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {/* Main Content */}
            {report ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Filters */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 600 }}>ASSET CLASS:</span>
                        <div style={{ position: 'relative' }}>
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value as Category)}
                                style={{ appearance: 'none', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 40px 10px 16px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', minWidth: '200px' }}
                            >
                                {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px', opacity: 0.7 }}>
                            Showing data for: <strong>{report.date}</strong>
                        </span>
                    </div>

                    <COTSignals data={filteredData} />
                    <COTTable data={filteredData} />

                    {/* Signal Generator Panel */}
                    <SignalGenerator data={report.data} />

                    <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.6, paddingBottom: '24px' }}>
                        Data Sources: CFTC "Traders in Financial Futures" & "Disaggregated Futures" • Released Fridays 15:30 EST
                    </div>
                </div>
            ) : (
                !loading && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px', borderStyle: 'dashed' }}>
                        <CloudDownload size={48} style={{ color: 'var(--text-secondary)', marginBottom: '16px', opacity: 0.5 }} />
                        <div style={{ marginBottom: '8px', fontSize: '16px' }}>No Data Available</div>
                        <div style={{ marginBottom: '24px', fontSize: '13px', opacity: 0.7 }}>Click "Fetch Latest" to check for new reports.</div>
                        <button onClick={handleAutoFetch} className="btn btn-primary">Fetch Latest Now</button>
                    </div>
                )
            )}

            <StrategyGuideModal
                isOpen={showStrategyGuide}
                onClose={() => setShowStrategyGuide(false)}
            />


        </div>
    );
}
