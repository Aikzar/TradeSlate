import { Trade } from '../types';
import { TradeDetail } from './TradeDetail';

interface TradeEditModalProps {
    trade: Trade;
    onClose: () => void;
    onUpdate: (id: string, data: Partial<Trade>) => Promise<void>;
}

export function TradeEditModal({ trade, onClose, onUpdate }: TradeEditModalProps) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '900px',
                height: '90vh',
                maxHeight: '800px', // Limit height for large screens
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '12px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden'
            }}>
                <TradeDetail
                    trade={trade}
                    onClose={onClose}
                    onUpdate={onUpdate}
                />
            </div>
        </div>
    );
}
