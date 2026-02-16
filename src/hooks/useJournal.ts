
import { useState, useEffect, useCallback } from 'react';
import { JournalEntry } from '../types';

export function useJournal() {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.journal.getAll();
            setEntries(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to load journal entries');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    const saveEntry = useCallback(async (entry: Partial<JournalEntry>) => {
        try {
            const saved = await window.electronAPI.journal.save(entry);
            setEntries(prev => {
                const index = prev.findIndex(e => e.id === saved.id);
                if (index >= 0) {
                    const newEntries = [...prev];
                    newEntries[index] = saved;
                    return newEntries;
                } else {
                    return [saved, ...prev];
                }
            });
            return saved;
        } catch (err: any) {
            setError(err.message || 'Failed to save entry');
            throw err;
        }
    }, []);

    // Helper to get entry for a specific date (YYYY-MM-DD local)
    const getEntryByDate = useCallback((date: string) => {
        return entries.find(e => e.date === date);
    }, [entries]);

    return { entries, loading, error, refresh: fetchEntries, saveEntry, getEntryByDate };
}
