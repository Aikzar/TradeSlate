import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DetailItem {
    label: string;
    value: string | number;
    color?: string;
}

interface ProKPICardProps {
    label: string;
    value: string | number;
    color?: string;
    secondaryLabel?: string;
    detailData?: DetailItem[];
    variant?: 'popover' | 'side-by-side';
}

export function ProKPICard({
    label,
    value,
    color,
    secondaryLabel,
    detailData,
    variant = 'popover'
}: ProKPICardProps) {
    const [showPopover, setShowPopover] = useState(false);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });
    const cardRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    // Update popover position when shown (only for popover variant)
    useEffect(() => {
        if (variant === 'popover' && showPopover && cardRef.current) {
            const rect = cardRef.current.getBoundingClientRect();
            setPopoverPos({
                top: rect.bottom + 8, // 8px below the card
                left: rect.left + rect.width / 2 // Center horizontally
            });
        }
    }, [showPopover, variant]);

    // Close popover when clicking outside
    useEffect(() => {
        if (variant !== 'popover') return;

        const handleClickOutside = (e: MouseEvent) => {
            if (
                cardRef.current &&
                !cardRef.current.contains(e.target as Node) &&
                popoverRef.current &&
                !popoverRef.current.contains(e.target as Node)
            ) {
                setShowPopover(false);
            }
        };
        if (showPopover) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showPopover, variant]);

    const hasDetails = detailData && detailData.length > 0;

    // Popover Content (Portal)
    const popoverContent = variant === 'popover' && showPopover && hasDetails && createPortal(
        <div
            ref={popoverRef}
            style={{
                position: 'fixed',
                top: popoverPos.top,
                left: popoverPos.left,
                transform: 'translateX(-50%)',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '12px 16px',
                minWidth: '220px',
                zIndex: 99999,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                pointerEvents: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setShowPopover(true)}
            onMouseLeave={() => setShowPopover(false)}
        >
            {/* Popover Arrow */}
            <div style={{
                position: 'absolute',
                top: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid var(--border)'
            }} />
            <div style={{
                position: 'absolute',
                top: '-5px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderBottom: '5px solid var(--bg-secondary)'
            }} />

            {/* Detail Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detailData.map((item, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '16px'
                        }}
                    >
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {item.label}
                        </span>
                        <span style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: item.color || 'var(--text-primary)'
                        }}>
                            {item.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>,
        document.body
    );

    return (
        <>
            <div
                ref={cardRef}
                className="card"
                style={{
                    padding: '16px 20px',
                    minWidth: variant === 'side-by-side' ? '300px' : '140px',
                    flex: 1,
                    cursor: (hasDetails && variant === 'popover') ? 'pointer' : 'default',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    borderColor: (showPopover && variant === 'popover') ? 'var(--accent)' : undefined,
                    display: variant === 'side-by-side' ? 'flex' : 'block',
                    alignItems: variant === 'side-by-side' ? 'center' : undefined,
                    gap: variant === 'side-by-side' ? '24px' : undefined
                }}
                onClick={() => variant === 'popover' && hasDetails && setShowPopover(!showPopover)}
                onMouseEnter={() => variant === 'popover' && hasDetails && setShowPopover(true)}
                onMouseLeave={() => variant === 'popover' && hasDetails && setShowPopover(false)}
            >
                {/* Main Content (Left Side) */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minWidth: variant === 'side-by-side' ? '120px' : undefined
                }}>
                    <span style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        {label}
                        {variant === 'popover' && hasDetails && (
                            <span style={{
                                fontSize: '10px',
                                opacity: 0.5,
                                transition: 'opacity 0.2s'
                            }}>ⓘ</span>
                        )}
                    </span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: color || 'var(--text-primary)' }}>
                        {value}
                    </span>
                    {secondaryLabel && (
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {secondaryLabel}
                        </span>
                    )}
                </div>

                {/* Side-by-Side Details (Right Side) */}
                {variant === 'side-by-side' && hasDetails && (
                    <>
                        {/* Divider */}
                        <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--border)', opacity: 0.5 }} />

                        {/* List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                            {detailData.map((item, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}
                                >
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                        {item.label}
                                    </span>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: item.color || 'var(--text-primary)',
                                        opacity: 0.9
                                    }}>
                                        {item.value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Render popover via portal (only for popover variant) */}
            {popoverContent}
        </>
    );
}
