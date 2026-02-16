"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IMPORTABLE_TRADE_FIELDS = void 0;
// Fields available for import mapping
exports.IMPORTABLE_TRADE_FIELDS = [
    { key: 'market', label: 'Market/Symbol', required: true },
    { key: 'direction', label: 'Direction (Long/Short)', required: true },
    { key: 'entryDateTime', label: 'Entry Date/Time', required: true },
    { key: 'exitTime', label: 'Exit Date/Time', required: false },
    { key: 'entryPrice', label: 'Entry Price', required: true },
    { key: 'exitPrice', label: 'Exit Price', required: false },
    { key: 'contracts', label: 'Contracts/Size', required: true },
    { key: 'pnl', label: 'Profit/Loss', required: false },
    { key: 'durationSeconds', label: 'Duration', required: false },
    { key: 'setup', label: 'Setup Type', required: false },
    { key: 'notesRaw', label: 'Notes', required: false },
    { key: 'plannedSL', label: 'Stop Loss', required: false },
    { key: 'plannedTP', label: 'Take Profit', required: false },
];
