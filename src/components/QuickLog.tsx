
import React, { useState, useMemo } from 'react';
import { Trade } from '../types';
import { toLocalStorageString, parseLocalToUTC } from '../utils/dateUtils';

interface QuickLogProps {
    onTradeLogged?: () => void;
}

// Contract values per market ($ per point)
const CONTRACT_VALUES: Record<string, number> = {
    NQ: 20,
    ES: 50,
    MNQ: 2,
    MES: 5,
    CL: 10,
    GC: 10
};

export function QuickLog({ onTradeLogged }: QuickLogProps) {
    const [formData, setFormData] = useState<Partial<Trade>>({
        market: 'NQ',
        direction: 'Long',
        entryDateTime: toLocalStorageString(new Date()),
        contracts: 1,
        status: 'CLOSED'
    });

    const [confluencesRaw, setConfluencesRaw] = useState('');
    const [notes, setNotes] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'contracts' ? parseInt(value) || 1 : value }));
    };

    // Live Calculations
    const calculations = useMemo(() => {
        const contractValue = CONTRACT_VALUES[formData.market || 'NQ'] || 20;
        const contracts = formData.contracts || 1;
        const entryPrice = parseFloat(String(formData.entryPrice)) || 0;
        const exitPrice = parseFloat(String(formData.exitPrice)) || 0;
        const plannedSL = parseFloat(String(formData.plannedSL)) || 0;
        const plannedTP = parseFloat(String(formData.plannedTP)) || 0;
        const direction = formData.direction === 'Long' ? 1 : -1;

        // Risk = |entry - SL| * contracts * contractValue
        const riskPoints = plannedSL ? Math.abs(entryPrice - plannedSL) : 0;
        const risk = riskPoints * contracts * contractValue;

        // PnL = (exit - entry) * direction * contracts * contractValue
        const pnlPoints = exitPrice ? (exitPrice - entryPrice) * direction : 0;
        const pnl = pnlPoints * contracts * contractValue;

        // Planned R:R = |TP - entry| / |entry - SL|
        const rewardPoints = plannedTP ? Math.abs(plannedTP - entryPrice) : 0;
        const plannedRR = riskPoints > 0 ? rewardPoints / riskPoints : 0;

        // Achieved R = pnlPoints / riskPoints
        const achievedR = riskPoints > 0 && exitPrice ? pnlPoints / riskPoints : 0;

        return { risk, pnl, plannedRR, achievedR };
    }, [formData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!formData.entryPrice) {
                alert('Entry Price is required');
                return;
            }

            const confluences = confluencesRaw.split(',').map(c => c.trim()).filter(Boolean);

            await window.electronAPI.trades.create({
                ...formData,
                entryDateTime: parseLocalToUTC(formData.entryDateTime!),
                exitTime: formData.exitTime ? parseLocalToUTC(formData.exitTime) : undefined,
                entryPrice: parseFloat(String(formData.entryPrice)),
                exitPrice: formData.exitPrice ? parseFloat(String(formData.exitPrice)) : undefined,
                plannedSL: formData.plannedSL ? parseFloat(String(formData.plannedSL)) : undefined,
                plannedTP: formData.plannedTP ? parseFloat(String(formData.plannedTP)) : undefined,
                maePrice: formData.maePrice ? parseFloat(String(formData.maePrice)) : undefined,
                mfePrice: formData.mfePrice ? parseFloat(String(formData.mfePrice)) : undefined,
                risk: calculations.risk,
                pnl: calculations.pnl,
                plannedRR: calculations.plannedRR,
                achievedR: calculations.achievedR,
                win: calculations.pnl > 0,
                confluences,
                notesRaw: notes,
                tags: [],
                mistakes: [],
                images: [],
            } as any);

            onTradeLogged?.();
            alert('Trade Logged!');

            // Reset form
            setFormData({
                market: 'NQ',
                direction: 'Long',
                entryDateTime: toLocalStorageString(new Date()),
                contracts: 1,
                status: 'CLOSED'
            });
            setConfluencesRaw('');
            setNotes('');
        } catch (err: any) {
            console.error(err);
            alert('Failed to log trade: ' + err.message);
        }
    };

    return (
        <div className="card flex-col gap-4" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 48px)' }}>
            <div className="flex justify-between items-center">
                <h3 style={{ margin: 0 }}>Add New Trade</h3>
            </div>

            <form onSubmit={handleSubmit} className="flex-col gap-4">
                {/* Market & Direction */}
                <div className="flex gap-2">
                    <div className="input-group w-full">
                        <label className="input-label">Market</label>
                        <select name="market" value={formData.market} onChange={handleChange}>
                            <option value="MNQ">MNQ</option>
                            <option value="NQ">NQ</option>
                            <option value="MES">MES</option>
                            <option value="ES">ES</option>
                            <option value="CL">CL</option>
                            <option value="GC">GC</option>
                        </select>
                    </div>
                    <div className="input-group w-full">
                        <label className="input-label">Direction</label>
                        <select name="direction" value={formData.direction} onChange={handleChange}>
                            <option value="Long">Long</option>
                            <option value="Short">Short</option>
                        </select>
                    </div>
                </div>

                {/* Entry Date & Time */}
                <div className="input-group">
                    <label className="input-label">Entry Date & Time</label>
                    <input
                        name="entryDateTime"
                        type="datetime-local"
                        step="1"
                        value={formData.entryDateTime}
                        onChange={handleChange}
                    />
                </div>

                {/* Exit Time */}
                <div className="input-group">
                    <label className="input-label">Exit Date & Time</label>
                    <input
                        name="exitTime"
                        type="datetime-local"
                        step="1"
                        onChange={handleChange}
                    />
                </div>

                {/* Entry & Exit Price */}
                <div className="flex gap-2">
                    <div className="input-group w-full">
                        <label className="input-label">Entry Price</label>
                        <input
                            name="entryPrice"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            onChange={handleChange}
                        />
                    </div>
                    <div className="input-group w-full">
                        <label className="input-label">Exit Price</label>
                        <input
                            name="exitPrice"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Planned SL & TP */}
                <div className="flex gap-2">
                    <div className="input-group w-full">
                        <label className="input-label">Planned SL</label>
                        <input
                            name="plannedSL"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            onChange={handleChange}
                        />
                    </div>
                    <div className="input-group w-full">
                        <label className="input-label">Planned TP</label>
                        <input
                            name="plannedTP"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Contracts */}
                <div className="input-group">
                    <label className="input-label">Contracts</label>
                    <input
                        name="contracts"
                        type="number"
                        value={formData.contracts}
                        onChange={handleChange}
                        min="1"
                    />
                </div>

                {/* Setup */}
                <div className="input-group">
                    <label className="input-label">Setup</label>
                    <select name="setup" onChange={handleChange}>
                        <option value="">-- Select --</option>
                        <option value="A+ Setup">A+ Setup</option>
                        <option value="Breakout">Breakout</option>
                        <option value="Pullback">Pullback</option>
                        <option value="Reversal">Reversal</option>
                        <option value="FOMO">FOMO</option>
                    </select>
                </div>

                {/* Entry Trigger */}
                <div className="input-group">
                    <label className="input-label">Entry Trigger</label>
                    <select name="entryTrigger" onChange={handleChange}>
                        <option value="">-- Select --</option>
                        <option value="Break of Structure">Break of Structure</option>
                        <option value="Order Block">Order Block</option>
                        <option value="FVG Fill">FVG Fill</option>
                        <option value="Liquidity Sweep">Liquidity Sweep</option>
                    </select>
                </div>

                {/* Confluences */}
                <div className="input-group">
                    <label className="input-label">Confluences (comma separated)</label>
                    <input
                        type="text"
                        value={confluencesRaw}
                        onChange={e => setConfluencesRaw(e.target.value)}
                        placeholder="Type and press Enter..."
                    />
                </div>

                {/* MAE & MFE */}
                <div className="flex gap-2">
                    <div className="input-group w-full">
                        <label className="input-label">MAE Price</label>
                        <input
                            name="maePrice"
                            type="number"
                            step="0.01"
                            placeholder="Max Adverse"
                            onChange={handleChange}
                        />
                    </div>
                    <div className="input-group w-full">
                        <label className="input-label">MFE Price</label>
                        <input
                            name="mfePrice"
                            type="number"
                            step="0.01"
                            placeholder="Max Favorable"
                            onChange={handleChange}
                        />
                    </div>
                </div>

                {/* Notes */}
                <div className="input-group">
                    <label className="input-label">Notes</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Trade notes..."
                        style={{ minHeight: '60px', resize: 'vertical' }}
                    />
                </div>

                {/* Live Calculations Display */}
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <div className="card" style={{ flex: 1, minWidth: '80px', padding: '8px', textAlign: 'center' }}>
                        <div className="input-label">Risk ($)</div>
                        <div style={{ fontWeight: 'bold' }}>{calculations.risk.toFixed(2)}</div>
                    </div>
                    <div className="card" style={{ flex: 1, minWidth: '80px', padding: '8px', textAlign: 'center' }}>
                        <div className="input-label">P/L ($)</div>
                        <div style={{ fontWeight: 'bold', color: calculations.pnl >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                            {calculations.pnl.toFixed(2)}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    <div className="card" style={{ flex: 1, minWidth: '80px', padding: '8px', textAlign: 'center' }}>
                        <div className="input-label">Planned R:R</div>
                        <div style={{ fontWeight: 'bold' }}>{calculations.plannedRR.toFixed(2)}</div>
                    </div>
                    <div className="card" style={{ flex: 1, minWidth: '80px', padding: '8px', textAlign: 'center' }}>
                        <div className="input-label">Achieved R</div>
                        <div style={{ fontWeight: 'bold', color: calculations.achievedR >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                            {calculations.achievedR.toFixed(2)}
                        </div>
                    </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
                    Add Trade
                </button>
            </form>
        </div>
    );
}
