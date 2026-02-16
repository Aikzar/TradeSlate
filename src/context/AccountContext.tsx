import React, { createContext, useContext, useState, useEffect } from 'react';

interface Account {
    id: string;
    name: string;
    isAggregated: boolean;
    color?: string;
    createdAt: string;
}

interface AccountContextType {
    accounts: Account[];
    activeAccount: string; // 'all' or UUID
    loading: boolean;
    setActiveAccount: (id: string) => void;
    refreshAccounts: () => Promise<void>;
    createAccount: (name: string, color?: string) => Promise<void>;
    updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
}

const AccountContext = createContext<AccountContextType | undefined>(undefined);

export function AccountProvider({ children }: { children: React.ReactNode }) {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [activeAccount, setActiveAccountState] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    const refreshAccounts = async () => {
        try {
            const data = await window.electronAPI.accounts.getAll();
            setAccounts(data);

            // If active account no longer exists (e.g. deleted elsewhere), fallback to 'all' or main
            // But 'all' is always valid. If it was a specific UUID that's gone:
            if (activeAccount !== 'all' && !data.find(a => a.id === activeAccount)) {
                setActiveAccountState('all');
            }
        } catch (err) {
            console.error('Failed to fetch accounts:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Load persisted selection
        const saved = localStorage.getItem('tradeslate_active_account');
        if (saved) setActiveAccountState(saved);

        refreshAccounts();
    }, []);

    const setActiveAccount = (id: string) => {
        setActiveAccountState(id);
        localStorage.setItem('tradeslate_active_account', id);
    };

    const createAccount = async (name: string, color?: string) => {
        await window.electronAPI.accounts.create(name, color);
        await refreshAccounts();
    };

    const updateAccount = async (id: string, data: Partial<Account>) => {
        await window.electronAPI.accounts.update(id, data);
        await refreshAccounts();
    };

    const deleteAccount = async (id: string) => {
        await window.electronAPI.accounts.delete(id);
        if (activeAccount === id) setActiveAccount('all');
        await refreshAccounts();
    };

    return (
        <AccountContext.Provider value={{
            accounts,
            activeAccount,
            loading,
            setActiveAccount,
            refreshAccounts,
            createAccount,
            updateAccount,
            deleteAccount
        }}>
            {children}
        </AccountContext.Provider>
    );
}

export function useAccounts() {
    const context = useContext(AccountContext);
    if (context === undefined) {
        throw new Error('useAccounts must be used within an AccountProvider');
    }
    return context;
}
