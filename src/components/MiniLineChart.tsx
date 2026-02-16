import { useMemo } from 'react';

interface MiniChartProps {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    strokeWidth?: number;
}

export function MiniLineChart({
    data,
    width = 300,
    height = 50,
    color = 'var(--accent)',
    strokeWidth = 2
}: MiniChartProps) {

    if (!data || data.length < 2) {
        return <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderRadius: '4px' }}>No Data</div>;
    }

    const points = useMemo(() => {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1; // Avoid divide by zero

        // Add 10% padding
        // const padding = range * 0.1;

        // Adjust y to flip coordinate system (SVG 0 is top)
        return data.map((val, index) => {
            const x = (index / (data.length - 1)) * width;
            const normalizedY = (val - min) / range;
            const y = height - (normalizedY * height); // Invert Y
            return `${x},${y}`;
        }).join(' ');
    }, [data, width, height]);

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
            {/* Simple line for now */}
            <polyline
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
