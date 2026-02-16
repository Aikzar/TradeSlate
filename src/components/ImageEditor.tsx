import React, { useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Minus, Circle, Pencil, Type, X, Check, Undo, Palette, Square } from 'lucide-react';

interface ImageEditorProps {
    imageSrc: string;
    initialAnnotations?: DrawAction[];
    onSave: (dataUrl: string, annotations: DrawAction[]) => void;
    onCancel: () => void;
}

type Tool = 'line' | 'circle' | 'draw' | 'text' | 'rect';

export interface DrawAction {
    type: Tool;
    color: string;
    lineWidth: number;
    points?: { x: number; y: number }[];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    text?: string;
    position?: { x: number; y: number };
}

// Helper: Snap line to nearest axis (H, V, or 45°)
function snapLineEnd(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number } {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const angle = Math.atan2(absDy, absDx) * (180 / Math.PI);

    if (angle < 22.5) {
        return { x: end.x, y: start.y };
    } else if (angle > 67.5) {
        return { x: start.x, y: end.y };
    } else {
        const dist = Math.max(absDx, absDy);
        return {
            x: start.x + dist * Math.sign(dx),
            y: start.y + dist * Math.sign(dy)
        };
    }
}

// Helper: Constrain to square
function constrainToSquare(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number } {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    return {
        x: start.x + size * Math.sign(dx),
        y: start.y + size * Math.sign(dy)
    };
}

export function ImageEditor({ imageSrc, initialAnnotations, onSave, onCancel }: ImageEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    const [tool, setTool] = useState<Tool>('draw');
    const [color, setColor] = useState('#ff0000');
    const [lineWidth, setLineWidth] = useState(3);
    const [fontSize, setFontSize] = useState(24);
    const [actions, setActions] = useState<DrawAction[]>(initialAnnotations || []);
    const [currentAction, setCurrentAction] = useState<DrawAction | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Text tool state
    const [textInput, setTextInput] = useState('');
    const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);
    const [isTypingText, setIsTypingText] = useState(false);

    const [imageLoaded, setImageLoaded] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
    const [shiftHeld, setShiftHeld] = useState(false);

    // Load image
    useEffect(() => {
        console.log('ImageEditor: Loading image, src length:', imageSrc?.length, 'starts with:', imageSrc?.substring(0, 50));

        setImageLoaded(false);
        setLoadError(null);
        if (!initialAnnotations) {
            setActions([]);
        }

        if (!imageSrc) {
            setLoadError('No image source provided');
            return;
        }

        const img = new Image();

        // Only set crossOrigin for http URLs, not for data: or file:// URLs
        if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
            img.crossOrigin = 'anonymous';
        }

        img.onload = () => {
            console.log('ImageEditor: Image loaded successfully, dimensions:', img.width, 'x', img.height);
            imageRef.current = img;

            // Validate image dimensions
            if (img.width === 0 || img.height === 0) {
                setLoadError('Image has invalid dimensions');
                return;
            }

            // Full-screen overlay - use most of the window for the canvas
            // Leave room for toolbar and instructions
            const availableWidth = window.innerWidth * 0.85;
            const availableHeight = window.innerHeight * 0.75;

            const scale = Math.min(availableWidth / img.width, availableHeight / img.height, 1);

            setCanvasSize({
                width: Math.floor(img.width * scale),
                height: Math.floor(img.height * scale)
            });
            setImageLoaded(true);
        };

        img.onerror = (err) => {
            console.error('ImageEditor: Failed to load image:', err);
            console.error('ImageEditor: Image src was:', imageSrc?.substring(0, 100));
            setLoadError('Failed to load image. The image may be corrupted or inaccessible.');
        };

        img.src = imageSrc;
    }, [imageSrc, initialAnnotations]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't capture if typing text
            if (isTypingText) {
                if (e.key === 'Escape') {
                    setIsTypingText(false);
                    setTextPosition(null);
                    setTextInput('');
                }
                if (e.key === 'Enter') {
                    // Submit text
                    if (textInput && textPosition) {
                        setActions(prev => [...prev, {
                            type: 'text',
                            color,
                            lineWidth: fontSize / 6,
                            text: textInput,
                            position: textPosition
                        }]);
                    }
                    setIsTypingText(false);
                    setTextPosition(null);
                    setTextInput('');
                }
                return;
            }

            if (e.key === 'Shift') setShiftHeld(true);
            if (e.key === 'Escape') onCancel();
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                setActions(prev => prev.slice(0, -1));
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') setShiftHeld(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isTypingText, textInput, textPosition, color, fontSize, onCancel]);

    // Handle text input changes
    const handleTextInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setTextInput(e.target.value);
    }, []);

    // Draw a single action
    const drawAction = useCallback((ctx: CanvasRenderingContext2D, action: DrawAction, scaleX = 1, scaleY = 1) => {
        ctx.strokeStyle = action.color;
        ctx.fillStyle = action.color;
        ctx.lineWidth = action.lineWidth * Math.max(scaleX, scaleY);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (action.type) {
            case 'draw':
                if (action.points && action.points.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(action.points[0].x * scaleX, action.points[0].y * scaleY);
                    for (let i = 1; i < action.points.length; i++) {
                        ctx.lineTo(action.points[i].x * scaleX, action.points[i].y * scaleY);
                    }
                    ctx.stroke();
                }
                break;

            case 'line':
                if (action.start && action.end) {
                    ctx.beginPath();
                    ctx.moveTo(action.start.x * scaleX, action.start.y * scaleY);
                    ctx.lineTo(action.end.x * scaleX, action.end.y * scaleY);
                    ctx.stroke();
                }
                break;

            case 'rect':
                if (action.start && action.end) {
                    const x = Math.min(action.start.x, action.end.x) * scaleX;
                    const y = Math.min(action.start.y, action.end.y) * scaleY;
                    const w = Math.abs(action.end.x - action.start.x) * scaleX;
                    const h = Math.abs(action.end.y - action.start.y) * scaleY;
                    ctx.strokeRect(x, y, w, h);
                }
                break;

            case 'circle':
                if (action.start && action.end) {
                    const radiusX = Math.abs(action.end.x - action.start.x) * scaleX;
                    const radiusY = Math.abs(action.end.y - action.start.y) * scaleY;
                    const centerX = ((action.start.x + action.end.x) / 2) * scaleX;
                    const centerY = ((action.start.y + action.end.y) / 2) * scaleY;

                    ctx.beginPath();
                    ctx.ellipse(centerX, centerY, radiusX / 2, radiusY / 2, 0, 0, 2 * Math.PI);
                    ctx.stroke();
                }
                break;

            case 'text':
                if (action.text && action.position) {
                    const textSize = action.lineWidth * 6 * Math.max(scaleX, scaleY);
                    ctx.font = `${textSize}px Arial`;
                    ctx.fillText(action.text, action.position.x * scaleX, action.position.y * scaleY);
                }
                break;
        }
    }, []);

    // Redraw canvas
    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = imageRef.current;

        if (!canvas || !ctx || !img) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw all saved actions
        [...actions, currentAction].filter(Boolean).forEach((action) => {
            if (action) drawAction(ctx, action);
        });

        // Draw live text preview
        if (isTypingText && textPosition && textInput) {
            ctx.fillStyle = color;
            ctx.font = `${fontSize}px Arial`;
            ctx.fillText(textInput, textPosition.x, textPosition.y);
        }
    }, [actions, currentAction, drawAction, isTypingText, textPosition, textInput, color, fontSize]);

    useEffect(() => {
        if (imageLoaded) {
            redraw();
        }
    }, [imageLoaded, redraw]);

    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (e.button === 2) {
            e.preventDefault();
            if (isDrawing) {
                setCurrentAction(null);
                setIsDrawing(false);
            }
            return;
        }

        if (tool === 'text') {
            // If already typing, submit current text first
            if (isTypingText && textInput && textPosition) {
                setActions(prev => [...prev, {
                    type: 'text',
                    color,
                    lineWidth: fontSize / 6,
                    text: textInput,
                    position: textPosition
                }]);
            }
            // Start new text at click position
            setTextPosition(getMousePos(e));
            setTextInput('');
            setIsTypingText(true);
            return;
        }

        setIsDrawing(true);
        const pos = getMousePos(e);

        if (tool === 'draw') {
            setCurrentAction({
                type: 'draw',
                color,
                lineWidth,
                points: [pos]
            });
        } else {
            setCurrentAction({
                type: tool,
                color,
                lineWidth,
                start: pos,
                end: pos
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !currentAction) return;

        let pos = getMousePos(e);

        if (tool === 'draw' && currentAction.points) {
            setCurrentAction({
                ...currentAction,
                points: [...currentAction.points, pos]
            });
        } else if (currentAction.start) {
            if (shiftHeld) {
                if (tool === 'line') {
                    pos = snapLineEnd(currentAction.start, pos);
                } else if (tool === 'rect' || tool === 'circle') {
                    pos = constrainToSquare(currentAction.start, pos);
                }
            }
            setCurrentAction({
                ...currentAction,
                end: pos
            });
        }
    };

    const handleMouseUp = () => {
        if (currentAction) {
            setActions(prev => [...prev, currentAction]);
            setCurrentAction(null);
        }
        setIsDrawing(false);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (isDrawing) {
            setCurrentAction(null);
            setIsDrawing(false);
        }
    };

    const handleUndo = () => {
        setActions(prev => prev.slice(0, -1));
    };

    const handleSave = () => {
        // Submit any pending text
        if (isTypingText && textInput && textPosition) {
            const textAction: DrawAction = {
                type: 'text',
                color,
                lineWidth: fontSize / 6,
                text: textInput,
                position: textPosition
            };
            setActions(prev => [...prev, textAction]);
        }

        const canvas = canvasRef.current;
        const img = imageRef.current;
        if (!canvas || !img) return;

        // Create full-resolution export
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = img.width;
        exportCanvas.height = img.height;
        const exportCtx = exportCanvas.getContext('2d');
        if (!exportCtx) return;

        exportCtx.drawImage(img, 0, 0);

        const scaleX = img.width / canvasSize.width;
        const scaleY = img.height / canvasSize.height;

        // Include pending text if typing
        const allActions = isTypingText && textInput && textPosition
            ? [...actions, { type: 'text' as Tool, color, lineWidth: fontSize / 6, text: textInput, position: textPosition }]
            : actions;

        allActions.forEach((action) => {
            drawAction(exportCtx, action, scaleX, scaleY);
        });

        const dataUrl = exportCanvas.toDataURL('image/png');
        onSave(dataUrl, allActions);
    };

    const toolsList: { id: Tool; icon: React.ReactNode; label: string }[] = [
        { id: 'draw', icon: <Pencil size={18} />, label: 'Freehand' },
        { id: 'line', icon: <Minus size={18} />, label: 'Line (Shift: snap)' },
        { id: 'rect', icon: <Square size={18} />, label: 'Rectangle (Shift: square)' },
        { id: 'circle', icon: <Circle size={18} />, label: 'Circle (Shift: perfect)' },
        { id: 'text', icon: <Type size={18} />, label: 'Text' },
    ];

    const colorsList = ['#ff0000', '#00ff00', '#0088ff', '#ffff00', '#ff00ff', '#ffffff', '#000000'];

    const thumbSize = 4 + (lineWidth - 1) * (16 / 9);

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0, // Cover the ENTIRE screen
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 20
        }} onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>

            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-3 p-2.5 bg-zinc-900/95 rounded-xl border border-white/10 flex-wrap justify-center" onClick={e => e.stopPropagation()}>
                {/* Tools */}
                <div className="flex gap-1">
                    {toolsList.map(t => (
                        <button
                            key={t.id}
                            onClick={() => { setTool(t.id); setIsTypingText(false); }}
                            className="p-2 rounded-lg transition-all"
                            style={{
                                backgroundColor: tool === t.id ? '#2563eb' : 'rgba(255,255,255,0.05)',
                                color: tool === t.id ? '#fff' : 'rgba(255,255,255,0.7)',
                                boxShadow: tool === t.id ? '0 0 0 2px #60a5fa, 0 0 0 4px #1e3a5f' : 'none',
                                transform: tool === t.id ? 'scale(1.05)' : 'scale(1)'
                            }}
                            title={t.label}
                        >
                            {t.icon}
                        </button>
                    ))}
                </div>

                <div className="w-px h-6 bg-white/20" />

                {/* Colors */}
                <div className="flex gap-1 items-center">
                    <Palette size={16} className="text-white/50 mr-1" />
                    {colorsList.map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-white/20 hover:scale-105'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>

                <div className="w-px h-6 bg-white/20" />

                {/* Stroke Width */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-white/50">{tool === 'text' ? 'Font:' : 'Size:'}</span>
                    {tool === 'text' ? (
                        <select
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-sm"
                        >
                            {[12, 16, 20, 24, 32, 48, 64, 80].map(s => (
                                <option key={s} value={s}>{s}px</option>
                            ))}
                        </select>
                    ) : (
                        <>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={lineWidth}
                                onChange={(e) => setLineWidth(Number(e.target.value))}
                                className="w-20 h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 ${(lineWidth - 1) * 100 / 9}%, rgba(255,255,255,0.1) ${(lineWidth - 1) * 100 / 9}%)`
                                }}
                            />
                            {/* Preview dot with white border for visibility */}
                            <div
                                className="rounded-full"
                                style={{
                                    width: thumbSize,
                                    height: thumbSize,
                                    backgroundColor: color,
                                    border: '2px solid white',
                                    boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
                                    minWidth: 8,
                                    minHeight: 8
                                }}
                            />
                        </>
                    )}
                </div>

                <div className="w-px h-6 bg-white/20" />

                {/* Actions */}
                <div className="flex gap-1">
                    <button
                        onClick={handleUndo}
                        disabled={actions.length === 0}
                        className="p-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo size={18} />
                    </button>
                    <button
                        onClick={onCancel}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                        title="Cancel (Esc)"
                    >
                        <X size={18} />
                    </button>
                    <button
                        onClick={handleSave}
                        className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                        title="Save"
                    >
                        <Check size={18} />
                    </button>
                </div>
            </div>

            {/* Text input when typing */}
            {isTypingText && (
                <div className="mb-2 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <input
                        type="text"
                        value={textInput}
                        onChange={handleTextInputChange}
                        autoFocus
                        placeholder="Type text here (Enter to confirm, Esc to cancel)"
                        className="bg-black/80 border border-white/30 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 w-80"
                        style={{ color, fontSize: Math.min(fontSize, 24) }}
                    />
                    <button
                        onClick={() => {
                            if (textInput && textPosition) {
                                setActions(prev => [...prev, {
                                    type: 'text',
                                    color,
                                    lineWidth: fontSize / 6,
                                    text: textInput,
                                    position: textPosition
                                }]);
                            }
                            setIsTypingText(false);
                            setTextPosition(null);
                            setTextInput('');
                        }}
                        className="p-2 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                    >
                        <Check size={18} />
                    </button>
                    <button
                        onClick={() => {
                            setIsTypingText(false);
                            setTextPosition(null);
                            setTextInput('');
                        }}
                        className="p-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Canvas */}
            {loadError ? (
                <div className="text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20 text-center">
                    <p className="mb-2 font-medium">Error loading image</p>
                    <button onClick={onCancel} className="bg-red-500 text-white px-4 py-2 rounded">Close</button>
                </div>
            ) : !imageLoaded ? (
                <div className="flex flex-col items-center justify-center text-white/50 p-8">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p>Loading image editor...</p>
                </div>
            ) : (
                <div
                    className="flex items-center justify-center"
                    onClick={e => e.stopPropagation()}
                >
                    <canvas
                        ref={canvasRef}
                        width={canvasSize.width}
                        height={canvasSize.height}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onContextMenu={handleContextMenu}
                        className="rounded-lg border border-white/20 cursor-crosshair shadow-2xl"
                        style={{
                            backgroundColor: '#1a1a1a',
                            display: 'block'
                        }}
                    />
                </div>
            )}

            {/* Instructions */}
            <div className="mt-3 text-xs text-white/40 font-medium text-center">
                {tool === 'text'
                    ? 'Click to place text, type in the box above, Enter to confirm'
                    : `Click and drag to draw${shiftHeld ? ' (constrained)' : ''} • Right-click to cancel • Ctrl+Z to undo`}
            </div>
        </div>,
        document.body
    );
}
