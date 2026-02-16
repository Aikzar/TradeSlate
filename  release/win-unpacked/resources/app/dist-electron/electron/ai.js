"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const settings_1 = require("./db/settings");
exports.AIService = {
    getModel() {
        return __awaiter(this, void 0, void 0, function* () {
            const apiKeyObj = settings_1.SettingsRepository.get('gemini_api_key');
            if (!apiKeyObj || !apiKeyObj.value) {
                throw new Error('API Key not found. Please configure it in Settings.');
            }
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKeyObj.value);
            return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        });
    },
    analyzeTrade(trade) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const model = yield this.getModel();
                const prompt = `
            You are a professional trading coach. Analyze this trade execution and provide constructive feedback.
            
            Trade Data:
            - Market: ${trade.market} ${trade.direction}
            - Entry: ${trade.entryDateTime} @ ${trade.entryPrice}
            - Exit: ${trade.exitTime} @ ${trade.exitPrice}
            - PnL: ${trade.pnl}
            - Setup: ${trade.setup}
            - Mistakes: ${((_a = trade.mistakes) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'None listed'}
            - Trader Notes: ${trade.notesRaw || 'None'}
            
            Provide a JSON response with the following structure:
            {
                "score": 1-10 rating of execution quality,
                "feedback": "Concise feedback paragraph (max 2 sentences)",
                "psychology_check": "Observation on emotional state based on notes/results",
                "improvement_tip": "One actionable tip for next time"
            }
            Return ONLY valid JSON.
            `;
                const result = yield model.generateContent(prompt);
                const response = result.response;
                let text = response.text();
                // Cleanup markdown code blocks if present
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(text);
            }
            catch (error) {
                console.error('AI Analysis Failed:', error);
                throw new Error('AI Analysis Failed: ' + error.message);
            }
        });
    },
    coachJournal(entryContent, mood) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const model = yield this.getModel();
                const prompt = `
            You are a trading psychologist. The trader just wrote this journal entry:
            
            "Mood: ${mood}"
            "Entry: ${entryContent}"
            
            Provide a JSON response with:
            {
                "insight": "Psychological insight based on their writing",
                "question": "A deep reflection question to ask them right now"
            }
            Return ONLY valid JSON.
            `;
                const result = yield model.generateContent(prompt);
                const response = result.response;
                let text = response.text();
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(text);
            }
            catch (error) {
                throw new Error('AI Coach Failed: ' + error.message);
            }
        });
    }
};
