"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportProfileRepository = void 0;
const index_1 = require("./index");
const crypto_1 = __importDefault(require("crypto"));
exports.ImportProfileRepository = {
    getAll: () => {
        const db = (0, index_1.getDB)();
        return db.prepare('SELECT * FROM import_profiles ORDER BY name').all();
    },
    getById: (id) => {
        const db = (0, index_1.getDB)();
        return db.prepare('SELECT * FROM import_profiles WHERE id = ?').get(id);
    },
    create: (name, columnMappings, dateFormat, delimiter = ',') => {
        const db = (0, index_1.getDB)();
        const id = crypto_1.default.randomUUID();
        const now = new Date().toISOString();
        db.prepare(`
            INSERT INTO import_profiles (id, name, type, column_mappings, date_format, delimiter, created_at, updated_at)
            VALUES (?, ?, 'custom', ?, ?, ?, ?, ?)
        `).run(id, name, JSON.stringify(columnMappings), dateFormat || null, delimiter, now, now);
        return id;
    },
    update: (id, data) => {
        const db = (0, index_1.getDB)();
        const now = new Date().toISOString();
        const existing = exports.ImportProfileRepository.getById(id);
        if (!existing)
            throw new Error('Profile not found');
        const updates = ['updated_at = ?'];
        const values = [now];
        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.columnMappings !== undefined) {
            updates.push('column_mappings = ?');
            values.push(JSON.stringify(data.columnMappings));
        }
        if (data.dateFormat !== undefined) {
            updates.push('date_format = ?');
            values.push(data.dateFormat);
        }
        if (data.delimiter !== undefined) {
            updates.push('delimiter = ?');
            values.push(data.delimiter);
        }
        values.push(id);
        db.prepare(`UPDATE import_profiles SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    },
    delete: (id) => {
        const db = (0, index_1.getDB)();
        db.prepare('DELETE FROM import_profiles WHERE id = ?').run(id);
    }
};
