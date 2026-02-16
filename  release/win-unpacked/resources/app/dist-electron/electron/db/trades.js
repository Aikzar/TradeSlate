"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradeRepository = void 0;
const index_1 = require("./index");
const crypto_1 = require("crypto");
function fromRow(row) {
    return {
        id: row.id,
        market: row.market,
        direction: row.direction,
        entryDateTime: row.entry_date_time,
        exitTime: row.exit_time,
        entryPrice: row.entry_price,
        exitPrice: row.exit_price,
        contracts: row.contracts,
        plannedSL: row.planned_sl,
        plannedTP: row.planned_tp,
        risk: row.risk,
        pnl: row.pnl,
        plannedRR: row.planned_rr,
        achievedR: row.achieved_r,
        setup: row.setup,
        entryTrigger: row.entry_trigger,
        confluences: JSON.parse(row.confluences || '[]'),
        notesRaw: row.notes_raw,
        notesClean: row.notes_clean,
        emotionPre: row.emotion_pre,
        emotionPost: row.emotion_post,
        tiltScore: row.tilt_score,
        maePrice: row.mae_price,
        mfePrice: row.mfe_price,
        durationSeconds: row.duration_seconds,
        win: Boolean(row.win),
        tags: JSON.parse(row.tags || '[]'),
        mistakes: JSON.parse(row.mistakes || '[]'),
        session: row.session,
        status: row.status,
        images: JSON.parse(row.images || '[]'),
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}
exports.TradeRepository = {
    getAll: (accountId) => {
        const db = (0, index_1.getDB)();
        let query = 'SELECT * FROM trades';
        const params = [];
        if (accountId && accountId !== 'all') {
            query += ' WHERE account_id = ?';
            params.push(accountId);
        }
        query += ' ORDER BY entry_date_time DESC';
        const rows = db.prepare(query).all(...params);
        return rows.map(fromRow);
    },
    create: (tradeData) => {
        var _a;
        const db = (0, index_1.getDB)();
        const id = (0, crypto_1.randomUUID)();
        const now = new Date().toISOString();
        // Ensure account_id is set
        const accountId = tradeData.accountId || 'main-account';
        const { confluences, tags, mistakes, images } = tradeData, restData = __rest(tradeData, ["confluences", "tags", "mistakes", "images"]);
        const fullTrade = Object.assign({ id,
            // @ts-ignore
            accountId, confluences: confluences || [], tags: tags || [], mistakes: mistakes || [], images: images || [], createdAt: now, updatedAt: now }, restData);
        const stmt = db.prepare(`
      INSERT INTO trades (
        id, account_id, market, direction, entry_date_time, exit_time,
        entry_price, exit_price, contracts,
        planned_sl, planned_tp, risk, pnl, planned_rr, achieved_r,
        setup, entry_trigger, confluences,
        notes_raw, notes_clean, emotion_pre, emotion_post, tilt_score,
        mae_price, mfe_price, duration_seconds, win,
        tags, mistakes, session, status, images, created_at, updated_at
      ) VALUES (
        @id, @accountId, @market, @direction, @entry_date_time, @exit_time,
        @entry_price, @exit_price, @contracts,
        @planned_sl, @planned_tp, @risk, @pnl, @planned_rr, @achieved_r,
        @setup, @entry_trigger, @confluences,
        @notes_raw, @notes_clean, @emotion_pre, @emotion_post, @tilt_score,
        @mae_price, @mfe_price, @duration_seconds, @win,
        @tags, @mistakes, @session, @status, @images, @created_at, @updated_at
      )
    `);
        // ... (rest of run) ...
        stmt.run({
            id: fullTrade.id,
            market: fullTrade.market,
            direction: fullTrade.direction,
            entry_date_time: fullTrade.entryDateTime,
            exit_time: fullTrade.exitTime || null,
            entry_price: fullTrade.entryPrice,
            exit_price: fullTrade.exitPrice || null,
            contracts: fullTrade.contracts,
            planned_sl: fullTrade.plannedSL || null,
            planned_tp: fullTrade.plannedTP || null,
            risk: fullTrade.risk || null,
            pnl: (_a = fullTrade.pnl) !== null && _a !== void 0 ? _a : null,
            planned_rr: fullTrade.plannedRR || null,
            achieved_r: fullTrade.achievedR || null,
            setup: fullTrade.setup || null,
            entry_trigger: fullTrade.entryTrigger || null,
            confluences: JSON.stringify(fullTrade.confluences || []),
            notes_raw: fullTrade.notesRaw || null,
            notes_clean: fullTrade.notesClean || null,
            emotion_pre: fullTrade.emotionPre || null,
            emotion_post: fullTrade.emotionPost || null,
            tilt_score: fullTrade.tiltScore || null,
            mae_price: fullTrade.maePrice || null,
            mfe_price: fullTrade.mfePrice || null,
            duration_seconds: fullTrade.durationSeconds || null,
            win: fullTrade.win ? 1 : 0,
            tags: JSON.stringify(fullTrade.tags || []),
            mistakes: JSON.stringify(fullTrade.mistakes || []),
            session: fullTrade.session || null,
            status: fullTrade.status || 'CLOSED',
            images: JSON.stringify(fullTrade.images || []),
            created_at: fullTrade.createdAt,
            updated_at: fullTrade.updatedAt
        });
        return fullTrade;
    },
    update: (id, tradeData) => {
        var _a;
        const db = (0, index_1.getDB)();
        const existing = db.prepare('SELECT * FROM trades WHERE id = ?').get(id);
        if (!existing)
            return null;
        const currentTrade = fromRow(existing);
        const updatedTrade = Object.assign(Object.assign(Object.assign({}, currentTrade), tradeData), { updatedAt: new Date().toISOString() });
        const stmt = db.prepare(`
        UPDATE trades SET 
            market = @market, direction = @direction, entry_date_time = @entry_date_time, exit_time = @exit_time,
            entry_price = @entry_price, exit_price = @exit_price, contracts = @contracts,
            planned_sl = @planned_sl, planned_tp = @planned_tp, risk = @risk, pnl = @pnl, 
            planned_rr = @planned_rr, achieved_r = @achieved_r,
            setup = @setup, entry_trigger = @entry_trigger, confluences = @confluences,
            notes_raw = @notes_raw, notes_clean = @notes_clean, 
            emotion_pre = @emotion_pre, emotion_post = @emotion_post, tilt_score = @tilt_score,
            mae_price = @mae_price, mfe_price = @mfe_price, duration_seconds = @duration_seconds, win = @win,
            tags = @tags, mistakes = @mistakes, session = @session, status = @status, images = @images,
            updated_at = @updated_at
        WHERE id = @id
       `);
        stmt.run({
            id: updatedTrade.id,
            market: updatedTrade.market,
            direction: updatedTrade.direction,
            entry_date_time: updatedTrade.entryDateTime,
            exit_time: updatedTrade.exitTime || null,
            entry_price: updatedTrade.entryPrice,
            exit_price: updatedTrade.exitPrice || null,
            contracts: updatedTrade.contracts,
            planned_sl: updatedTrade.plannedSL || null,
            planned_tp: updatedTrade.plannedTP || null,
            risk: updatedTrade.risk || null,
            pnl: (_a = updatedTrade.pnl) !== null && _a !== void 0 ? _a : null,
            planned_rr: updatedTrade.plannedRR || null,
            achieved_r: updatedTrade.achievedR || null,
            setup: updatedTrade.setup || null,
            entry_trigger: updatedTrade.entryTrigger || null,
            confluences: JSON.stringify(updatedTrade.confluences || []),
            notes_raw: updatedTrade.notesRaw || null,
            notes_clean: updatedTrade.notesClean || null,
            emotion_pre: updatedTrade.emotionPre || null,
            emotion_post: updatedTrade.emotionPost || null,
            tilt_score: updatedTrade.tiltScore || null,
            mae_price: updatedTrade.maePrice || null,
            mfe_price: updatedTrade.mfePrice || null,
            duration_seconds: updatedTrade.durationSeconds || null,
            win: updatedTrade.win ? 1 : 0,
            tags: JSON.stringify(updatedTrade.tags || []),
            mistakes: JSON.stringify(updatedTrade.mistakes || []),
            session: updatedTrade.session || null,
            status: updatedTrade.status || 'CLOSED',
            images: JSON.stringify(updatedTrade.images || []),
            updated_at: updatedTrade.updatedAt
        });
        return updatedTrade;
    },
    delete: (id) => {
        const db = (0, index_1.getDB)();
        db.prepare('DELETE FROM trades WHERE id = ?').run(id);
    }
};
