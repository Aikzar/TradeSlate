import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Quote } from 'lucide-react';
import { focusedAlert, focusedConfirm } from '../utils/dialogUtils';

interface QuoteItem {
    id: number;
    text: string;
    author: string;
    category: 'general' | 'trading' | 'mindset';
}

export function AffirmationsManager() {
    const [quotes, setQuotes] = useState<QuoteItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [newText, setNewText] = useState('');
    const [newAuthor, setNewAuthor] = useState('');

    useEffect(() => {
        loadQuotes();
    }, []);

    const loadQuotes = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.quotes.getAll();
            setQuotes(data || []);
        } catch (error) {
            console.error('Failed to load quotes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newText.trim()) return;
        try {
            await window.electronAPI.quotes.add(newText, newAuthor || 'Unknown');
            setNewText('');
            setNewAuthor('');
            await loadQuotes();
            await focusedAlert('Affirmation added successfully!');
        } catch (error: any) {
            console.error('Failed to add quote:', error);
            await focusedAlert('Failed to add: ' + error.message);
        }
    };

    const handleDelete = async (id: number) => {
        if (!await focusedConfirm('Are you sure you want to delete this affirmation?')) return;
        try {
            await window.electronAPI.quotes.delete(id);
            await loadQuotes();
        } catch (error: any) {
            console.error('Failed to delete quote:', error);
            await focusedAlert('Failed to delete: ' + error.message);
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
            {/* Add New */}
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <h3 className="text-sm font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2">
                    <Plus size={16} /> Add New Affirmation
                </h3>
                <div className="flex flex-col gap-3">
                    <textarea
                        className="w-full bg-black/20 border border-white/10 rounded p-3 text-sm focus:border-accent outline-none transition-colors resize-none h-20"
                        placeholder="Enter a powerful affirmation or trading rule..."
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <input
                            type="text"
                            className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm focus:border-accent outline-none transition-colors flex-1"
                            placeholder="Author (Optional)"
                            value={newAuthor}
                            onChange={e => setNewAuthor(e.target.value)}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newText.trim()}
                            className="px-6 py-2 bg-accent text-zinc-950 font-bold rounded hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            Add Affirmation
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-zinc-400 uppercase flex items-center gap-2">
                    <Quote size={16} /> Your Library ({quotes.length})
                </h3>

                {loading ? (
                    <div className="text-center py-8 text-zinc-500">Loading affirmations...</div>
                ) : quotes.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 border border-dashed border-white/10 rounded-lg">
                        No affirmations yet. Add one above to get started!
                    </div>
                ) : (
                    <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {quotes.map(quote => (
                            <div key={quote.id} className="p-3 rounded bg-white/5 border border-white/5 flex justify-between items-start group hover:border-white/10 transition-colors">
                                <div>
                                    <p className="text-zinc-200 font-medium leading-relaxed">"{quote.text}"</p>
                                    <p className="text-zinc-500 text-xs mt-1">— {quote.author}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(quote.id)}
                                    className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-white/5 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
