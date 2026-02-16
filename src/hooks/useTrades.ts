import { useState, useEffect, useCallback } from 'react';
import { Trade } from '../types';
import { useAccounts } from '../context/AccountContext';

export function useTrades() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get active account from context
    const { activeAccount, accounts } = useAccounts();

    const fetchTrades = useCallback(async () => {
        try {
            setLoading(true);
            // Pass activeAccount to backend
            const data = await window.electronAPI.trades.getAll(activeAccount);
            setTrades(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch trades');
        } finally {
            setLoading(false);
        }
    }, [activeAccount]); // Re-fetch when account changes

    useEffect(() => {
        fetchTrades();
    }, [fetchTrades]);

    const createTrade = useCallback(async (tradeData: any) => {
        try {
            // Determine account ID
            let targetAccountId = activeAccount;
            if (targetAccountId === 'all') {
                // Fallback: Use 'main-account' if it exists, or the first account, or default
                const main = accounts.find(a => a.id === 'main-account');
                targetAccountId = main ? main.id : (accounts[0]?.id || 'main-account');
            }

            const newTrade = await window.electronAPI.trades.create({
                ...tradeData,
                accountId: targetAccountId
            });

            setTrades(prev => [newTrade, ...prev]);
            return newTrade;
        } catch (err: any) {
            setError(err.message || 'Failed to create trade');
            throw err;
        }
    }, [activeAccount, accounts]);

    const updateTrade = useCallback(async (id: string, data: Partial<Trade>) => {
        try {
            await window.electronAPI.trades.update(id, data);
            // Optimistic update or refresh
            setTrades(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
        } catch (err: any) {
            setError(err.message || 'Failed to update trade');
            throw err;
        }
    }, []);

    const deleteTrade = useCallback(async (id: string) => {
        try {
            await window.electronAPI.trades.delete(id);
            setTrades(prev => prev.filter(t => t.id !== id));
        } catch (err: any) {
            setError(err.message || 'Failed to delete trade');
            throw err;
        }
    }, []);

    const deleteManyTrades = useCallback(async (ids: string[]) => {
        try {
            await window.electronAPI.trades.deleteMany(ids);
            setTrades(prev => prev.filter(t => !ids.includes(t.id)));
        } catch (err: any) {
            setError(err.message || 'Failed to delete trades');
            throw err;
        }
    }, []);

    return { trades, loading, error, refresh: fetchTrades, createTrade, updateTrade, deleteTrade, deleteManyTrades };
}
