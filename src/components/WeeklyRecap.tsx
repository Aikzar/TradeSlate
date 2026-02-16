import { WeeklyReviewCarousel } from './WeeklyReviewCarousel';
import { Trade } from '../types';

interface WeeklyRecapProps {
    trades: Trade[];
    condensed?: boolean;
    onTradeClick?: (trade: Trade) => void;
}

export function WeeklyRecap({ trades, onTradeClick }: WeeklyRecapProps) {
    return (
        <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '24px 0' }}>
            <WeeklyReviewCarousel trades={trades} onTradeClick={onTradeClick} />
        </div>
    );
}
