
import { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { Stats } from './pages/Stats';
import { Journal } from './pages/Journal';
import { CalendarPage } from './pages/CalendarPage';
import { TradeReview } from './pages/TradeReview';
import { TradeCardPage } from './pages/TradeCardPage';
import { Settings } from './pages/Settings';
import { COTPage } from './pages/COTPage';
import { AccountProvider } from './context/AccountContext';


type Page = 'dashboard' | 'stats' | 'journal' | 'calendar' | 'review' | 'tradecard' | 'settings' | 'cot';

import { AccountSelector } from './components/AccountSelector';

import { LayoutDashboard, LineChart, Book, Calendar as CalendarIcon, Settings as SettingsIcon, ClipboardCheck, IdCard, Landmark } from 'lucide-react';
import { focusedConfirm } from './utils/dialogUtils';

function App() {
    const [page, setPage] = useState<Page>('dashboard');
    const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    const navigate = async (newPage: Page) => {
        if (isDirty && !await focusedConfirm('You have unsaved changes. Are you sure you want to leave?')) {
            return;
        }
        setIsDirty(false); // Reset dirty state when navigating away
        setPage(newPage);
    };

    const handleNavigateToJournal = async (tradeId: string) => {
        if (isDirty && !await focusedConfirm('You have unsaved changes. Are you sure you want to leave?')) {
            return;
        }
        setIsDirty(false); // Reset dirty state
        setSelectedTradeId(tradeId);
        setPage('journal');
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                // Ignore global shortcuts if the user is typing in an input or textarea
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                    return;
                }

                switch (e.key.toLowerCase()) {
                    case 'd':
                        e.preventDefault();
                        navigate('dashboard');
                        break;
                    case 's':
                        e.preventDefault();
                        navigate('stats');
                        break;
                    case 'j':
                        e.preventDefault();
                        navigate('journal');
                        break;
                    case 'c':
                        e.preventDefault();
                        navigate('calendar');
                        break;
                    case ',':
                        e.preventDefault();
                        navigate('settings');
                        break;
                    case 'r':
                        e.preventDefault();
                        navigate('review');
                        break;
                    case 't':
                        e.preventDefault();
                        navigate('tradecard');
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDirty]); // Re-bind when isDirty changes to handle confirmation correctly

    return (
        <AccountProvider>
            <div style={{ display: 'flex', width: '100%', height: '100vh', flexDirection: 'row' }}>
                {/* Sidebar is outside the scrollable area */}
                {/* Navigation Sidebar */}
                <nav style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: '60px',
                    height: '100%',
                    borderRight: '1px solid var(--border)',
                    padding: '8px',
                    alignItems: 'center',
                    justifyContent: 'space-between', // Push top/bottom groups apart
                    flexShrink: 0,
                    boxSizing: 'border-box',
                    zIndex: 50,
                    backgroundColor: 'var(--bg-secondary)',
                    overflow: 'visible' // Ensure dropdowns can pop out
                }}>
                    {/* Top Group: Nav Links */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                        <button
                            className={`btn ${page === 'dashboard' ? 'btn-primary' : ''}`}
                            onClick={() => navigate('dashboard')}
                            title="Dashboard"
                            style={{ padding: '8px' }}
                        >
                            <LayoutDashboard size={20} />
                        </button>
                        <button
                            className={`btn ${page === 'journal' ? 'btn-primary' : ''}`}
                            onClick={() => navigate('journal')}
                            title="Journal"
                            style={{ padding: '8px' }}
                        >
                            <Book size={20} />
                        </button>
                        <button
                            className={`btn ${page === 'calendar' ? 'btn-primary' : ''}`}
                            onClick={() => navigate('calendar')}
                            title="Calendar"
                            style={{ padding: '8px' }}
                        >
                            <CalendarIcon size={20} />
                        </button>
                        <button
                            className={`btn ${page === 'stats' ? 'btn-primary' : ''}`}
                            onClick={() => navigate('stats')}
                            title="Stats"
                            style={{ padding: '8px' }}
                        >
                            <LineChart size={20} />
                        </button>

                        <button
                            className={`btn ${page === 'review' ? 'btn-primary' : ''}`}
                            onClick={() => navigate('review')}
                            title="Trade Review"
                            style={{ padding: '8px' }}
                        >
                            <ClipboardCheck size={20} />
                        </button>
                        <button
                            className={`btn ${page === 'cot' ? 'btn-primary' : ''}`}
                            onClick={() => navigate('cot')}
                            title="Institutional Bias (COT)"
                            style={{ padding: '8px' }}
                        >
                            <Landmark size={20} />
                        </button>
                        <button
                            className={`btn ${page === 'tradecard' ? 'btn-primary' : ''}`}
                            onClick={() => navigate('tradecard')}
                            title="Trade Card (Ctrl+T)"
                            style={{ padding: '8px' }}
                        >
                            <IdCard size={20} />
                        </button>
                    </div>

                    {/* Bottom Group: Account & Settings */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', width: '100%' }}>
                        {/* Account Selector (Icon Mode) */}
                        <div style={{ position: 'relative', zIndex: 60 }}>
                            <AccountSelector variant="icon" />
                        </div>

                        <button
                            className={`btn ${page === 'settings' ? 'btn-primary' : ''}`}
                            onClick={() => navigate('settings')}
                            title="Settings"
                            style={{ padding: '8px' }}
                        >
                            <SettingsIcon size={20} />
                        </button>
                    </div>
                </nav>

                {/* Main Content - Scrollable */}
                <main style={{ flex: 1, overflowY: 'auto', height: '100vh' }}>
                    {page === 'dashboard' && <Dashboard />}
                    {page === 'stats' && <Stats />}
                    {page === 'journal' && (
                        <Journal
                            initialTradeId={selectedTradeId}
                            onClearSelection={() => setSelectedTradeId(null)}
                            onDirtyChange={setIsDirty}
                        />
                    )}
                    {page === 'calendar' && (
                        <CalendarPage
                            onNavigateToJournal={handleNavigateToJournal}
                        />
                    )}
                    {page === 'review' && <TradeReview />}
                    {page === 'tradecard' && <TradeCardPage />}
                    {page === 'cot' && <COTPage />}
                    {page === 'settings' && <Settings />}
                </main>
            </div>
        </AccountProvider>
    )
}

export default App
