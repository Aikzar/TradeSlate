import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, ArrowRight, Wand2 } from 'lucide-react';

interface RewriteModalProps {
    originalText: string;
    rewrittenText: string;
    onClose: () => void;
    onApply: (finalText: string) => void;
}

export function RewriteModal({ originalText, rewrittenText, onClose, onApply }: RewriteModalProps) {
    const [editedText, setEditedText] = useState(rewrittenText);

    // If rewrittenText updates (e.g. initial load), update state
    useEffect(() => {
        setEditedText(rewrittenText);
    }, [rewrittenText]);

    return createPortal(
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(4px)'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="bg-zinc-950 border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
                style={{ width: '95vw', height: '90vh' }}
            >

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Wand2 size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">AI Rewrite Suggestion</h3>
                            <p className="text-sm text-zinc-400">Review and refine the AI-suggested improvements.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Side by Side */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Original Column */}
                    <div className="flex-1 flex flex-col border-r border-white/10 min-w-0 bg-black/20">
                        <div className="p-3 border-b border-white/5 bg-white/5 shrink-0">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Original Text</label>
                        </div>
                        <textarea
                            className="flex-1 w-full bg-transparent p-6 text-sm text-zinc-400 focus:outline-none resize-none font-mono leading-relaxed"
                            value={originalText}
                            readOnly
                        />
                    </div>

                    {/* Arrow Divider (Visual only, subtle) */}
                    <div className="w-px bg-white/10 flex flex-col items-center justify-center relative shrink-0">
                        <div className="absolute top-1/2 -translate-y-1/2 z-10 bg-zinc-900 border border-white/10 rounded-full p-2 text-zinc-500 shadow-xl">
                            <ArrowRight size={16} />
                        </div>
                    </div>

                    {/* New Column */}
                    <div className="flex-1 flex flex-col min-w-0 bg-purple-900/5">
                        <div className="p-3 border-b border-purple-500/20 bg-purple-500/10 flex justify-between items-center shrink-0">
                            <label className="text-xs font-bold text-purple-300 uppercase tracking-widest">Rewritten (Editable)</label>
                            <span className="text-[10px] text-purple-400/60 font-mono">GEMINI 2.5 FLASH</span>
                        </div>
                        <textarea
                            className="flex-1 w-full bg-transparent p-6 text-sm text-white focus:outline-none resize-none font-mono leading-relaxed selection:bg-purple-500/30"
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 bg-zinc-900 shrink-0">
                    <button
                        onClick={onClose}
                        className="btn border-white/10 hover:bg-white/5 text-zinc-400 px-6 py-3 h-auto text-sm"
                    >
                        Discard
                    </button>
                    <button
                        onClick={() => onApply(editedText)}
                        className="btn bg-purple-600 hover:bg-purple-500 text-white border-none shadow-lg shadow-purple-900/20 px-8 py-3 h-auto text-sm font-semibold flex items-center gap-2"
                    >
                        <Check size={18} />
                        Apply Changes
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
}
