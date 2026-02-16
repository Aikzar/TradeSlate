import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccounts } from '../context/AccountContext';
import { ChevronDown, Plus, User, Users } from 'lucide-react';

interface AccountSelectorProps {
    variant?: 'full' | 'icon';
    value?: string;
    onChange?: (accountId: string) => void;
    showAllOption?: boolean;
}

export function AccountSelector({
    variant = 'full',
    value,
    onChange,
    showAllOption = true
}: AccountSelectorProps) {
    const { accounts, activeAccount, setActiveAccount, createAccount } = useAccounts();
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newAccountName, setNewAccountName] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    // Determine effective current selection
    const currentId = value !== undefined ? value : activeAccount;

    // Find the account object
    const selected = currentId === 'all'
        ? { id: 'all', name: 'All Accounts', color: '#ffffff' }
        : accounts.find(a => a.id === currentId) || { id: 'all', name: 'All Accounts', color: '#ffffff' };

    // If we are in controlled mode (value is set) and 'all' is selected but showAllOption is false, 
    // it likely means the value is invalid or not yet set. Default to first account or show warning?
    // For now, styling handles fallback.

    const Icon = currentId === 'all' ? Users : User;

    const handleSelect = (id: string) => {
        if (onChange) {
            onChange(id);
        } else {
            setActiveAccount(id);
        }
        setIsOpen(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAccountName.trim()) return;

        try {
            const newId = await createAccount(newAccountName);
            setNewAccountName('');
            setIsCreating(false);
            // Auto-select the new account
            if (onChange) {
                onChange(newId);
            }
            // If uncontrolled, createAccount might not auto-select in context (depends on context impl),
            // but usually we might want to switch to it.
            // For now, let's assume the user manually switches or context does it.
            if (!onChange) {
                setActiveAccount(newId);
            }
            setIsOpen(false);
        } catch (err) {
            console.error(err);
        }
    };

    const toggleOpen = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            if (variant === 'icon') {
                setDropdownPos({
                    top: rect.bottom + 8,
                    left: rect.left
                });
            } else {
                setDropdownPos({
                    top: rect.bottom + 4,
                    left: rect.left
                });
            }
        }
        setIsOpen(!isOpen);
    };

    // Close on scroll/resize
    useEffect(() => {
        const close = () => setIsOpen(false);
        window.addEventListener('scroll', close);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close);
            window.removeEventListener('resize', close);
        };
    }, []);

    return (
        <>
            {variant === 'icon' ? (
                <button
                    ref={buttonRef}
                    onClick={toggleOpen}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/5 transition-colors group relative ${isOpen ? 'bg-white/10' : ''}`}
                    title={selected.name}
                    style={{ border: '1px solid var(--border)' }}
                >
                    <Icon
                        size={20}
                        style={{
                            color: selected.color || '#3b82f6',
                            filter: currentId === 'all' ? 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' : `drop-shadow(0 0 8px ${selected.color}44)`
                        }}
                    />
                </button>
            ) : (
                <button
                    ref={buttonRef}
                    onClick={toggleOpen}
                    className="btn h-9 bg-zinc-900 border border-white/10 hover:bg-zinc-800 flex items-center gap-2 px-3 text-sm"
                    style={{ minWidth: '160px', justifyContent: 'space-between' }}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{
                                backgroundColor: selected.color || '#3b82f6',
                                boxShadow: currentId === 'all' ? '0 0 8px rgba(255,255,255,0.5)' : `0 0 8px ${selected.color}88`
                            }}
                        />
                        <span className="font-medium text-zinc-200 truncate">{selected.name}</span>
                    </div>
                    <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            )}

            {isOpen && createPortal(
                <>
                    <div
                        className="fixed inset-0 z-[999]"
                        onClick={() => { setIsOpen(false); setIsCreating(false); }}
                    />
                    <div
                        className="fixed w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[1000] overflow-hidden flex flex-col backdrop-blur-xl animate-fade-in"
                        style={{
                            left: variant === 'icon' ? '70px' : dropdownPos.left,
                            top: variant === 'icon' ? 'auto' : dropdownPos.top,
                            bottom: variant === 'icon' ? '20px' : 'auto',
                            position: 'fixed'
                        }}
                    >

                        {/* List */}
                        <div className="max-h-64 overflow-y-auto p-1">
                            {showAllOption && (
                                <>
                                    <button
                                        onClick={() => handleSelect('all')}
                                        className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${currentId === 'all' ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                        style={{
                                            borderLeft: currentId === 'all' ? `3px solid #ffffff` : '3px solid transparent',
                                            paddingLeft: currentId === 'all' ? '9px' : '12px'
                                        }}
                                    >
                                        <Users size={16} className="text-white" />
                                        <span className="text-sm">All Accounts</span>
                                    </button>
                                    <div className="h-px bg-white/10 my-1 mx-2" />
                                </>
                            )}

                            {accounts.map(acc => (
                                <button
                                    key={acc.id}
                                    onClick={() => handleSelect(acc.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${currentId === acc.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                    style={{
                                        borderLeft: currentId === acc.id ? `3px solid ${acc.color || '#3b82f6'}` : '3px solid transparent',
                                        paddingLeft: currentId === acc.id ? '9px' : '12px'
                                    }}
                                >
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: acc.color || '#3b82f6' }} />
                                    <span className="text-sm truncate">{acc.name}</span>
                                </button>
                            ))}
                        </div>

                        {/* Footer / Create */}
                        <div className="p-2 border-t border-white/10 bg-zinc-900/50">
                            {isCreating ? (
                                <form onSubmit={handleCreate} className="flex flex-col gap-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Name"
                                        className="bg-black/20 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500 w-full"
                                        value={newAccountName}
                                        onChange={e => setNewAccountName(e.target.value)}
                                    />
                                    <div className="flex gap-2 text-xs">
                                        <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 py-1 rounded">Add</button>
                                        <button type="button" onClick={() => setIsCreating(false)} className="px-2 hover:bg-white/10 rounded">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded transition-colors"
                                >
                                    <Plus size={14} />
                                    <span>Add Account</span>
                                </button>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </>
    );
}
