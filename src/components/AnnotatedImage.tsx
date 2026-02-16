import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DrawAction } from './ImageEditor';

interface AnnotatedImageProps {
    src: string;
    annotations?: DrawAction[];
    alt?: string;
    className?: string;
    style?: React.CSSProperties;
    onError?: () => void;
    onClick?: (e: React.MouseEvent) => void;
    onMouseMove?: (e: React.MouseEvent) => void;
    onMouseLeave?: () => void;
}

/**
 * Renders an image with annotations overlaid.
 * For images without annotations, just renders a regular img tag.
 * For images with annotations, renders a canvas at FULL original resolution
 * and uses CSS to scale it down for display, preserving quality when zoomed.
 */
export function AnnotatedImage({
    src,
    annotations,
    alt,
    className,
    style,
    onError,
    onClick,
    onMouseMove,
    onMouseLeave
}: AnnotatedImageProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const imageRef = useRef<HTMLImageElement | null>(null);

    // Draw a single action on the canvas
    const drawAction = useCallback((ctx: CanvasRenderingContext2D, action: DrawAction) => {
        ctx.strokeStyle = action.color;
        ctx.fillStyle = action.color;
        ctx.lineWidth = action.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (action.type) {
            case 'draw':
                if (action.points && action.points.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(action.points[0].x, action.points[0].y);
                    for (let i = 1; i < action.points.length; i++) {
                        ctx.lineTo(action.points[i].x, action.points[i].y);
                    }
                    ctx.stroke();
                }
                break;

            case 'line':
                if (action.start && action.end) {
                    ctx.beginPath();
                    ctx.moveTo(action.start.x, action.start.y);
                    ctx.lineTo(action.end.x, action.end.y);
                    ctx.stroke();
                }
                break;

            case 'rect':
                if (action.start && action.end) {
                    const x = Math.min(action.start.x, action.end.x);
                    const y = Math.min(action.start.y, action.end.y);
                    const w = Math.abs(action.end.x - action.start.x);
                    const h = Math.abs(action.end.y - action.start.y);
                    ctx.strokeRect(x, y, w, h);
                }
                break;

            case 'circle':
                if (action.start && action.end) {
                    const radiusX = Math.abs(action.end.x - action.start.x);
                    const radiusY = Math.abs(action.end.y - action.start.y);
                    const centerX = (action.start.x + action.end.x) / 2;
                    const centerY = (action.start.y + action.end.y) / 2;

                    ctx.beginPath();
                    ctx.ellipse(centerX, centerY, radiusX / 2, radiusY / 2, 0, 0, 2 * Math.PI);
                    ctx.stroke();
                }
                break;

            case 'text':
                if (action.text && action.position) {
                    const textSize = action.lineWidth * 6;
                    ctx.font = `${textSize}px Arial`;
                    ctx.fillText(action.text, action.position.x, action.position.y);
                }
                break;
        }
    }, []);

    // Draw all annotations on the canvas
    const redraw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const img = imageRef.current;

        if (!canvas || !ctx || !img) return;

        // Reset canvas size to match image (high-res)
        canvas.width = img.width;
        canvas.height = img.height;

        // Clear and draw image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // Draw annotations
        if (annotations && annotations.length > 0) {
            annotations.forEach((action) => {
                drawAction(ctx, action);
            });
        }
    }, [annotations, drawAction]);

    // Load image only when src changes
    useEffect(() => {
        if (!src) {
            setLoadError(true);
            return;
        }

        setImageLoaded(false);
        setLoadError(false);
        imageRef.current = null;

        const img = new Image();
        if (src.startsWith('http://') || src.startsWith('https://')) {
            img.crossOrigin = 'anonymous';
        }

        img.onload = () => {
            imageRef.current = img;
            setImageLoaded(true);
            redraw(); // Initial draw
        };

        img.onerror = () => {
            setLoadError(true);
            onError?.();
        };

        img.src = src;
    }, [src, onError]); // NOT sensitive to annotations

    // Redraw whenever annotations change, if image is already loaded
    useEffect(() => {
        if (imageLoaded) {
            redraw();
        }
    }, [annotations, imageLoaded, redraw]);

    if (loadError) {
        return null; // Let parent handle error display
    }

    // Always render canvas to ensure smooth transition when adding annotations
    // This prevents image reloading since the component structure stays stable


    // Render canvas at full resolution, CSS scales it down
    // This preserves quality when zoomed
    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{
                ...style,
                width: '100%',
                height: '100%',
                objectFit: 'contain'
            }}
            aria-label={alt}
            role="img"
            onClick={onClick}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        />
    );
}
