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
exports.computeTradeMetrics = computeTradeMetrics;
const index_1 = require("./index");
const crypto_1 = require("crypto");
/**
 * Compute pre-calculated trade metrics.
 * Returns null for any metric that cannot be computed (missing data or division by zero).
 */
function computeTradeMetrics(trade) {
    var _a, _b, _c, _d, _e;
    const dir = trade.direction === 'Short' ? -1 : 1;
    const entry = (_a = trade.entryPrice) !== null && _a !== void 0 ? _a : null;
    const exit = (_b = trade.exitPrice) !== null && _b !== void 0 ? _b : null;
    const sl = (_c = trade.initialSL) !== null && _c !== void 0 ? _c : null;
    const mae = (_d = trade.maePrice) !== null && _d !== void 0 ? _d : null;
    const mfe = (_e = trade.mfePrice) !== null && _e !== void 0 ? _e : null;
    const riskDenom = (entry != null && sl != null) ? Math.abs(entry - sl) : null;
    // Heat % = (MAE - Entry) / (SL - Entry)  [direction-aware]
    let heatPercent = null;
    if (mae != null && entry != null && sl != null) {
        const denom = (sl - entry) * dir;
        if (denom !== 0)
            heatPercent = ((mae - entry) * dir) / denom;
    }
    // MFE R = (MFE - Entry) / |Entry - SL|
    let mfeR = null;
    if (mfe != null && entry != null && riskDenom && riskDenom !== 0) {
        mfeR = ((mfe - entry) * dir) / riskDenom;
    }
    // MAE R = (MAE - Entry) / |Entry - SL|  (negative = drawdown)
    let maeR = null;
    if (mae != null && entry != null && riskDenom && riskDenom !== 0) {
        maeR = ((mae - entry) * dir) / riskDenom;
    }
    // Profit Capture % = (Exit - Entry) / (MFE - Entry)
    let profitCapturePercent = null;
    if (exit != null && entry != null && mfe != null) {
        const denom = (mfe - entry) * dir;
        if (denom !== 0)
            profitCapturePercent = ((exit - entry) * dir) / denom;
    }
    return { heatPercent, mfeR, maeR, profitCapturePercent };
}
function fromRow(row) {
    var _a, _b, _c, _d;
    return {
        id: row.id,
        accountId: row.account_id,
        market: row.market,
        direction: row.direction,
        entryDateTime: row.entry_date_time,
        exitTime: row.exit_time,
        entryPrice: row.entry_price,
        exitPrice: row.exit_price,
        contracts: row.contracts,
        plannedSL: row.planned_sl,
        initialSL: row.initial_sl,
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
        aiVerdict: row.ai_verdict,
        emotionPre: row.emotion_pre,
        emotionPost: row.emotion_post,
        tiltScore: row.tilt_score,
        maePrice: row.mae_price,
        mfePrice: row.mfe_price,
        heatPercent: (_a = row.heat_percent) !== null && _a !== void 0 ? _a : null,
        mfeR: (_b = row.mfe_r) !== null && _b !== void 0 ? _b : null,
        maeR: (_c = row.mae_r) !== null && _c !== void 0 ? _c : null,
        profitCapturePercent: (_d = row.profit_capture_percent) !== null && _d !== void 0 ? _d : null,
        durationSeconds: row.duration_seconds,
        win: Boolean(row.win),
        tags: JSON.parse(row.tags || '[]'),
        mistakes: JSON.parse(row.mistakes || '[]'),
        session: row.session,
        status: row.status,
        images: JSON.parse(row.images || '[]'),
        imageAnnotations: JSON.parse(row.image_annotations || '{}'),
        videoUrl: row.video_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        meta: JSON.parse(row.meta || '{}')
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
    getRaw: (id) => {
        const db = (0, index_1.getDB)();
        return db.prepare('SELECT * FROM trades WHERE id = ?').get(id);
    },
    create: (tradeData) => {
        var _a, _b, _c, _d, _e, _f;
        const db = (0, index_1.getDB)();
        const id = (0, crypto_1.randomUUID)();
        const now = new Date().toISOString();
        // Ensure account_id is set
        const accountId = tradeData.accountId || 'main-account';
        const { confluences, tags, mistakes, images } = tradeData, restData = __rest(tradeData, ["confluences", "tags", "mistakes", "images"]);
        const fullTrade = Object.assign({ id,
            accountId, confluences: confluences || [], tags: tags || [], mistakes: mistakes || [], images: images || [], createdAt: now, updatedAt: now }, restData);
        // Compute derived metrics
        const metrics = computeTradeMetrics(fullTrade);
        const stmt = db.prepare(`
      INSERT INTO trades (
        id, account_id, market, direction, entry_date_time, exit_time,
        entry_price, exit_price, contracts,
        planned_sl, initial_sl, planned_tp, risk, pnl, planned_rr, achieved_r,
        setup, entry_trigger, confluences,
        notes_raw, notes_clean, ai_verdict, emotion_pre, emotion_post, tilt_score,
        mae_price, mfe_price, heat_percent, mfe_r, mae_r, profit_capture_percent,
        duration_seconds, win,
        tags, mistakes, session, status, images, video_url, created_at, updated_at, meta
      ) VALUES (
        @id, @account_id, @market, @direction, @entry_date_time, @exit_time,
        @entry_price, @exit_price, @contracts,
        @planned_sl, @initial_sl, @planned_tp, @risk, @pnl, @planned_rr, @achieved_r,
        @setup, @entry_trigger, @confluences,
        @notes_raw, @notes_clean, @ai_verdict, @emotion_pre, @emotion_post, @tilt_score,
        @mae_price, @mfe_price, @heat_percent, @mfe_r, @mae_r, @profit_capture_percent,
        @duration_seconds, @win,
        @tags, @mistakes, @session, @status, @images, @video_url, @created_at, @updated_at, @meta
      )
    `);
        stmt.run({
            id: fullTrade.id,
            account_id: fullTrade.accountId,
            market: fullTrade.market,
            direction: fullTrade.direction,
            entry_date_time: fullTrade.entryDateTime,
            exit_time: fullTrade.exitTime || null,
            entry_price: fullTrade.entryPrice,
            exit_price: fullTrade.exitPrice || null,
            contracts: fullTrade.contracts,
            planned_sl: fullTrade.plannedSL || null,
            initial_sl: fullTrade.initialSL || fullTrade.plannedSL || null, // Default to planned_sl if not set
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
            ai_verdict: fullTrade.aiVerdict || null,
            emotion_pre: fullTrade.emotionPre || null,
            emotion_post: fullTrade.emotionPost || null,
            tilt_score: fullTrade.tiltScore || null,
            mae_price: fullTrade.maePrice || null,
            mfe_price: fullTrade.mfePrice || null,
            heat_percent: (_b = metrics.heatPercent) !== null && _b !== void 0 ? _b : null,
            mfe_r: (_c = metrics.mfeR) !== null && _c !== void 0 ? _c : null,
            mae_r: (_d = metrics.maeR) !== null && _d !== void 0 ? _d : null,
            profit_capture_percent: (_e = metrics.profitCapturePercent) !== null && _e !== void 0 ? _e : null,
            duration_seconds: fullTrade.durationSeconds || (() => {
                if (fullTrade.entryDateTime && fullTrade.exitTime) {
                    const start = new Date(fullTrade.entryDateTime).getTime();
                    const end = new Date(fullTrade.exitTime).getTime();
                    return Math.max(0, (end - start) / 1000);
                }
                return null;
            })(),
            win: fullTrade.win ? 1 : (((_f = fullTrade.pnl) !== null && _f !== void 0 ? _f : 0) > 0 ? 1 : 0),
            tags: JSON.stringify(fullTrade.tags || []),
            mistakes: JSON.stringify(fullTrade.mistakes || []),
            session: fullTrade.session || null,
            status: fullTrade.status || 'CLOSED',
            images: JSON.stringify(fullTrade.images || []),
            video_url: fullTrade.videoUrl || null,
            created_at: fullTrade.createdAt,
            updated_at: fullTrade.updatedAt,
            meta: JSON.stringify(fullTrade.meta || {})
        });
        return fullTrade;
    },
    update: (id, tradeData) => {
        var _a, _b, _c, _d, _e, _f;
        const db = (0, index_1.getDB)();
        const existing = db.prepare('SELECT * FROM trades WHERE id = ?').get(id);
        if (!existing)
            return null;
        const currentTrade = fromRow(existing);
        const updatedTrade = Object.assign(Object.assign(Object.assign({}, currentTrade), tradeData), { updatedAt: new Date().toISOString() });
        // Re-compute derived metrics on update
        const metrics = computeTradeMetrics(updatedTrade);
        const stmt = db.prepare(`
        UPDATE trades SET 
            account_id = @account_id,
            market = @market, direction = @direction, entry_date_time = @entry_date_time, exit_time = @exit_time,
            entry_price = @entry_price, exit_price = @exit_price, contracts = @contracts,
            planned_sl = @planned_sl, initial_sl = @initial_sl, planned_tp = @planned_tp, risk = @risk, pnl = @pnl, 
            planned_rr = @planned_rr, achieved_r = @achieved_r,
            setup = @setup, entry_trigger = @entry_trigger, confluences = @confluences,
            notes_raw = @notes_raw, notes_clean = @notes_clean, ai_verdict = @ai_verdict,
            emotion_pre = @emotion_pre, emotion_post = @emotion_post, tilt_score = @tilt_score,
            mae_price = @mae_price, mfe_price = @mfe_price,
            heat_percent = @heat_percent, mfe_r = @mfe_r, mae_r = @mae_r, profit_capture_percent = @profit_capture_percent,
            duration_seconds = @duration_seconds, win = @win,
            tags = @tags, mistakes = @mistakes, session = @session, status = @status, images = @images, 
            image_annotations = @image_annotations, video_url = @video_url,
            updated_at = @updated_at, meta = @meta
        WHERE id = @id
       `);
        stmt.run({
            id: updatedTrade.id,
            account_id: updatedTrade.accountId || null,
            market: updatedTrade.market,
            direction: updatedTrade.direction,
            entry_date_time: updatedTrade.entryDateTime,
            exit_time: updatedTrade.exitTime || null,
            entry_price: updatedTrade.entryPrice,
            exit_price: updatedTrade.exitPrice || null,
            contracts: updatedTrade.contracts,
            planned_sl: updatedTrade.plannedSL || null,
            initial_sl: updatedTrade.initialSL || null,
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
            ai_verdict: updatedTrade.aiVerdict || null,
            emotion_pre: updatedTrade.emotionPre || null,
            emotion_post: updatedTrade.emotionPost || null,
            tilt_score: updatedTrade.tiltScore || null,
            mae_price: updatedTrade.maePrice || null,
            mfe_price: updatedTrade.mfePrice || null,
            heat_percent: (_b = metrics.heatPercent) !== null && _b !== void 0 ? _b : null,
            mfe_r: (_c = metrics.mfeR) !== null && _c !== void 0 ? _c : null,
            mae_r: (_d = metrics.maeR) !== null && _d !== void 0 ? _d : null,
            profit_capture_percent: (_e = metrics.profitCapturePercent) !== null && _e !== void 0 ? _e : null,
            duration_seconds: updatedTrade.durationSeconds || (() => {
                if (updatedTrade.entryDateTime && updatedTrade.exitTime) {
                    const start = new Date(updatedTrade.entryDateTime).getTime();
                    const end = new Date(updatedTrade.exitTime).getTime();
                    return Math.max(0, (end - start) / 1000);
                }
                return null;
            })(),
            win: updatedTrade.win ? 1 : (((_f = updatedTrade.pnl) !== null && _f !== void 0 ? _f : 0) > 0 ? 1 : 0),
            tags: JSON.stringify(updatedTrade.tags || []),
            mistakes: JSON.stringify(updatedTrade.mistakes || []),
            session: updatedTrade.session || null,
            status: updatedTrade.status || 'CLOSED',
            images: JSON.stringify(updatedTrade.images || []),
            image_annotations: JSON.stringify(updatedTrade.imageAnnotations || {}),
            video_url: updatedTrade.videoUrl || null,
            updated_at: updatedTrade.updatedAt,
            meta: JSON.stringify(updatedTrade.meta || {})
        });
        return updatedTrade;
    },
    delete: (id) => {
        const db = (0, index_1.getDB)();
        db.prepare('DELETE FROM trades WHERE id = ?').run(id);
    },
    deleteMany: (ids) => {
        const db = (0, index_1.getDB)();
        const placeholders = ids.map(() => '?').join(',');
        db.prepare(`DELETE FROM trades WHERE id IN (${placeholders})`).run(...ids);
    }
};
