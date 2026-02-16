import React, { useState, useEffect, useRef } from 'react';

interface TagAutocompleteProps {
    value: string[];
    onChange: (tags: string[]) => void;
    suggestions: string[];
    placeholder: string;
}

export function TagAutocomplete({ value, onChange, suggestions, placeholder }: TagAutocompleteProps) {
    const [input, setInput] = useState(value.join(', '));
    const [shownSuggestions, setShownSuggestions] = useState<string[]>([]);
    const [focused, setFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef(input);

    inputRef.current = input;

    // Sync input when upstream value changes, but cautiously to preserve partial typing (trailing commas)
    useEffect(() => {
        // We compare the 'parsed' version of our current input with the new value prop.
        // If they are identical (meaning our input currently represents the prop value correctly),
        // we do NOT overwrite the input. This prevents stripping trailing commas/spaces.
        const currentParsed = inputRef.current.split(',').map(s => s.trim()).filter(Boolean);
        if (JSON.stringify(currentParsed) !== JSON.stringify(value)) {
            setInput(value.join(', '));
        }
    }, [value]);

    const getCurrentTerm = (val: string) => {
        const parts = val.split(',');
        return parts[parts.length - 1].trim();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInput(val);

        // Update parent immediately
        const tags = val.split(',').map(s => s.trim()).filter(Boolean);
        onChange(tags);

        // Filter suggestions
        const term = getCurrentTerm(val).toLowerCase();

        // If input is cleared or comma typed, show suggestions again
        if (!term && focused) {
            const filtered = suggestions.filter(s => !tags.includes(s));
            setShownSuggestions(filtered.slice(0, 5));
            return;
        } else if (!term && !focused) {
            setShownSuggestions([]);
            return;
        }

        const filtered = suggestions.filter(s => s.toLowerCase().startsWith(term) && !tags.includes(s));
        setShownSuggestions(filtered.slice(0, 5));
        setActiveIndex(0);
    };

    const handleFocus = () => {
        setFocused(true);
        const term = getCurrentTerm(input).toLowerCase();
        const tags = input.split(',').map(s => s.trim());

        // Always filter suggestions based on current term (empty or not)
        // If term is empty, startsWith("") returns true for everything, showing all unused suggestions
        const filtered = suggestions.filter(s => s.toLowerCase().startsWith(term) && !tags.includes(s));
        setShownSuggestions(filtered.slice(0, 5));
    };

    const handleBlur = () => {
        // Delay hide to allow click
        setTimeout(() => setFocused(false), 200);
    };

    const selectSuggestion = (s: string) => {
        const parts = input.split(',');
        parts.pop(); // remove partial

        // Only add a leading space if there are already other tags
        const prefix = parts.length > 0 ? ' ' : '';
        parts.push(prefix + s);

        const newValue = parts.join(',') + ', ';
        setInput(newValue);
        onChange(newValue.split(',').map(t => t.trim()).filter(Boolean));
        setShownSuggestions([]);

        // Refocus and keeping typing
        const inputEl = containerRef.current?.querySelector('input');
        if (inputEl) inputEl.focus();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!focused || shownSuggestions.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(i => (i + 1) % shownSuggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(i => (i - 1 + shownSuggestions.length) % shownSuggestions.length);
        } else if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            selectSuggestion(shownSuggestions[activeIndex]);
        }
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <input
                value={input}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                // Use input/btn classes from parent context if available, or duplicate styles
                className="bg-black/20 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-full"
            />
            {focused && shownSuggestions.length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    width: '100%',
                    background: '#2A2A35', // Approximating var(--bg-secondary)
                    border: '1px solid #3F3F46', // Approximating var(--border)
                    borderRadius: '4px',
                    zIndex: 100,
                    maxHeight: '150px',
                    overflowY: 'auto',
                    marginTop: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                    {shownSuggestions.map((s, i) => (
                        <div
                            key={s}
                            onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }} // Use onMouseDown to prevent blur
                            className={`px-3 py-2 cursor-pointer text-sm ${i === activeIndex ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-300 hover:bg-white/5'}`}
                        >
                            {s}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
