
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SettingsRepository } from './db/settings';
import { Trade } from '../src/types';

const DEFAULT_TRADE_REVIEW_PROMPT = `
You are a professional trading coach. Analyze this trade execution and provide constructive feedback.

Trade Data:
- Market: {{market}} {{direction}}
- Entry: {{entryDateTime}} @ {{entryPrice}}
- Exit: {{exitTime}} @ {{exitPrice}}
- PnL: {{pnl}}
- Setup: {{setup}}
- Mistakes: {{mistakes}}
- Trader Notes: {{notesRaw}}

Metrics (Ground Truth):
- Heat %: {{heatPercent}}
- MFE R: {{mfeR}}
- Profit Capture: {{profitCapturePercent}}

Instructions for Metrics:
1. These metrics are the 'Ground Truth' for this trade. 
2. If heat_percent is > 1.0 (100%), immediately flag this as a critical risk failure (Moving Stops).
3. If profit_capture_percent is < 0.1 (10%) on a winner, flag it as an early exit issue.
4. If these metrics are null, NaN, or 0 when prices are missing, ignore them and rely on the trader notes and price data instead.

Provide a JSON response with the following structure:
{
    "verdict": "A short 2-3 word label for this trade (e.g. 'Disciplined Loss', 'Lucky Win', 'Impulsive Entry')",
    "score": 1-10 rating of execution quality,
    "feedback": "Concise feedback paragraph (max 2 sentences)",
    "psychology_check": "Observation on emotional state based on notes/results",
    "improvement_tip": "One actionable tip for next time"
}
Return ONLY valid JSON.
`;

const DEFAULT_WEEKLY_REVIEW_PROMPT = `
You are a professional trading coach. Review the following trade data for the selected week.

STRICT CATEGORIZATION RULES:

1. **Top Process Wins**: 
   - MUST be a winning trade (Status: WIN).
   - MUST have 0 mistakes listed.
   - Ideally has positive achieved R (if available).
   - *If none qualify, leave this array empty.*

2. **Tactical Improvements** (NEW CATEGORY):
   - Winning trades that had minor mistakes (e.g., "Early Exit", "Fomo but worked").
   - Small losses (Loss > -1.0R) with technical edges but minor execution errors.
   - *These are "Good but could be better" trades.*

3. **Critical Reviews**:
   - **MANDATORY**: any trade with "Tilt", "Oversized Risk", or "Revenge" in mistakes/tags.
   - Large losses (Loss <= -1.0R).
   - Trades with 3+ mistakes listed.
   - *These are "Fatal Errors" that threaten longevity.*

Labels: Reference trades using the format: [Asset | Date | Direction](trade://ID). 
CRITICAL: You MUST use the exact "id" provided in the data for the "tradeId" field. Do not alter or shorten it.

Instructions:
- Remove all 'Is:' or 'Analysis:' prefixes from your summaries.
- Provide a 1-sentence surgical insight for each trade card.
- Focus the 'Next Week Focus' on the single most recurring mistake in the 'Critical Review' section.
- **COST OPTIMIZATION**: Focus ONLY on the most significant 3-5 trades per category. You may skip routine, neutral, or less important trades to save space. Any trade you skip will be automatically categorized as "Standard Execution" by the system.

Trade Data:
{{minifiedWeeklyTradeData}}

Return ONLY a JSON response:
{
    "week_summary": "2-sentence technical/psychological overview.",
    "top_process_wins": [{ "title": "Title", "reason": "Why", "tradeId": "original_id_exact", "conclusion": "1-sentence insight", "tip": "Short tip" }],
    "tactical_improvements": [{ "title": "Title", "reason": "What could be better", "tradeId": "original_id_exact", "conclusion": "1-sentence insight", "tip": "Improvement tip" }],
    "critical_review_needed": [{"title": "Title", "reason": "Rule broken", "tradeId": "original_id_exact", "conclusion": "1-sentence insight", "tip": "Correction" }],
    "next_week_focus": "One specific drill.",
    "replay_recommendation": "1 specific trade (asset/time) for simulator replay."
}
Return ONLY valid JSON.`;

export const AIService = {
    async getModel(taskType: 'rewrite' | 'review' | 'weekly' | 'query' = 'review') {
        const apiKeyObj = SettingsRepository.get('gemini_api_key');

        let apiKey = '';
        if (typeof apiKeyObj === 'string') {
            apiKey = apiKeyObj;
        } else if (apiKeyObj && apiKeyObj.value) {
            apiKey = apiKeyObj.value;
        }

        if (!apiKey) {
            throw new Error('API Key not found. Please configure it in Settings.');
        }

        // Determine model based on task type settings
        let modelName = "gemini-2.5-flash"; // Default

        try {
            if (taskType === 'rewrite') {
                const setting = SettingsRepository.get('ai_model_rewrite');
                if (setting && setting.value) modelName = setting.value;
            } else if (taskType === 'review') {
                const setting = SettingsRepository.get('ai_model_review');
                if (setting && setting.value) modelName = setting.value;
            } else if (taskType === 'weekly') {
                const setting = SettingsRepository.get('ai_model_weekly');
                if (setting && setting.value) modelName = setting.value;
            }
        } catch (e) {
            console.warn('Failed to load model setting, using default:', e);
        }

        // AUTO-FIX: Map legacy/generic model names to latest valid versions
        if (modelName.includes('gemini-1.5') || modelName.includes('gemini-2.0')) {
            modelName = 'gemini-2.5-flash';
        }
        if (modelName.includes('preview')) { // Map 3.0 preview to stable if needed, or leave for now
            // modelName = 'gemini-3.0-flash'; 
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        return genAI.getGenerativeModel({ model: modelName });
    },

    async analyzeTrade(trade: Trade) {
        try {
            const model = await this.getModel('review');

            let promptTemplate = DEFAULT_TRADE_REVIEW_PROMPT;
            const customPrompt = SettingsRepository.get('ai_prompt_trade_review');
            if (customPrompt && typeof customPrompt.value === 'string' && customPrompt.value.trim().length > 10) {
                promptTemplate = customPrompt.value;
            }

            // Calculate effective notes (Fallback Rule: Clean > Raw)
            // If notesClean exists and is not empty, use it. Otherwise use notesRaw.
            const effectiveNotes = (trade.notesClean && trade.notesClean.trim().length > 0)
                ? trade.notesClean
                : (trade.notesRaw || 'None');

            // Replace placeholders
            const prompt = promptTemplate
                .replace('{{market}}', trade.market)
                .replace('{{direction}}', trade.direction)
                .replace('{{entryDateTime}}', trade.entryDateTime)
                .replace('{{entryPrice}}', trade.entryPrice.toString())
                .replace('{{exitTime}}', trade.exitTime || '')
                .replace('{{exitPrice}}', (trade.exitPrice || 0).toString())
                .replace('{{pnl}}', (trade.pnl || 0).toString())
                .replace('{{setup}}', trade.setup || 'None')
                .replace('{{mistakes}}', trade.mistakes?.join(', ') || 'None listed')
                .replace('{{notesRaw}}', effectiveNotes)
                .replace('{{heatPercent}}', trade.heatPercent != null ? (trade.heatPercent * 100).toFixed(1) + '%' : 'null')
                .replace('{{mfeR}}', trade.mfeR != null ? trade.mfeR.toFixed(2) + 'R' : 'null')
                .replace('{{profitCapturePercent}}', trade.profitCapturePercent != null ? (trade.profitCapturePercent * 100).toFixed(1) + '%' : 'null');

            const result = await model.generateContent(prompt);
            const response = result.response;
            let text = response.text();

            // Cleanup markdown code blocks if present
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(text);
        } catch (error: any) {
            console.error('AI Analysis Failed:', error);
            throw new Error('AI Analysis Failed: ' + error.message);
        }
    },

    async coachJournal(entryContent: string, mood: string) {
        try {
            const model = await this.getModel('review'); // Use review model for coaching

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

            const result = await model.generateContent(prompt);
            const response = result.response;
            let text = response.text();

            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(text);
        } catch (error: any) {
            throw new Error('AI Coach Failed: ' + error.message);
        }
    },

    async queryTrades(query: string, trades: Trade[]) {
        try {
            const model = await this.getModel('query');

            // --- PLANNER STEP ---
            const PLANNER_PROMPT = `
            You are a data retriever. Based on the user's question, identify which fields are needed from the database to answer it accurately.
            
            Available fields: 
            - id, market, direction, entryPrice, exitPrice, pnl, achievedR, setup, mistakes, createdAt, entryDateTime,
            - status (WIN/LOSS), heatPercent, mfeR, profitCapturePercent, durationSeconds, notes, tags
            
            Return ONLY a JSON object:
            {
                "reasoning": "Explain why you selected these fields/filters (e.g. 'User asks for biggest loss, so I need pnl and market sorted by pnl ascending')",
                "required_fields": ["list", "of", "fields", "needed"],
                "filter": "e.g. all_time, last_7_days, last_30_days, winners_only, losers_only, long_only, short_only",
                "sort": "pnl_asc | pnl_desc | date_desc | date_asc | null",
                "limit": 10 // or null if aggregation is needed
            }
            
            User Question: "${query}"
            
            Return ONLY valid JSON.
            `;

            const plannerResult = await model.generateContent(PLANNER_PROMPT);
            const plannerResponse = plannerResult.response;
            let plannerText = plannerResponse.text().replace(/```json/g, '').replace(/```/g, '').trim();
            const plan = JSON.parse(plannerText);

            console.log("AI Query Plan:", plan);

            // --- DATA FILTERING STEP ---
            let filteredTrades = [...trades];

            // 1. Apply Date Filters
            const now = new Date();
            if (plan.filter?.includes('last_7_days')) {
                const cutoff = new Date(now);
                cutoff.setDate(cutoff.getDate() - 7);
                cutoff.setHours(0, 0, 0, 0);
                filteredTrades = filteredTrades.filter(t => new Date(t.entryDateTime) >= cutoff);
            } else if (plan.filter?.includes('last_30_days')) {
                const cutoff = new Date(now);
                cutoff.setDate(cutoff.getDate() - 30);
                cutoff.setHours(0, 0, 0, 0);
                filteredTrades = filteredTrades.filter(t => new Date(t.entryDateTime) >= cutoff);
            }

            // 2. Apply Attribute Filters
            if (plan.filter?.includes('winners')) {
                filteredTrades = filteredTrades.filter(t => t.pnl && t.pnl > 0);
            } else if (plan.filter?.includes('losers')) {
                filteredTrades = filteredTrades.filter(t => t.pnl && t.pnl <= 0);
            }
            if (plan.filter?.includes('long')) {
                filteredTrades = filteredTrades.filter(t => t.direction === 'Long');
            } else if (plan.filter?.includes('short')) {
                filteredTrades = filteredTrades.filter(t => t.direction === 'Short');
            }

            // 3. Apply Sorting
            if (plan.sort === 'pnl_asc') {
                filteredTrades.sort((a, b) => (a.pnl || 0) - (b.pnl || 0));
            } else if (plan.sort === 'pnl_desc') {
                filteredTrades.sort((a, b) => (b.pnl || 0) - (a.pnl || 0));
            } else if (plan.sort === 'date_desc') {
                filteredTrades.sort((a, b) => new Date(b.entryDateTime).getTime() - new Date(a.entryDateTime).getTime());
            } else if (plan.sort === 'date_asc') {
                filteredTrades.sort((a, b) => new Date(a.entryDateTime).getTime() - new Date(b.entryDateTime).getTime());
            }

            // 4. Apply Limit (Safety cap: always limit if not aggregating, but let's trust the planner or default to 500)
            const limit = plan.limit ? Math.min(plan.limit, 100) : 100; // Cap at 100 for context window safety
            const finalTrades = filteredTrades.slice(0, limit);

            // 5. Project Fields
            const fieldMap = (t: Trade) => {
                const projected: any = {};
                // Always include Market and ID (for linking) and Date (for time context)
                projected.id = t.id;
                projected.market = t.market;
                projected.date = t.entryDateTime; // Critical: AI needs this for "Wednesday" queries

                // If specific fields request, map them. Else send a default summary.
                if (plan.required_fields && plan.required_fields.length > 0) {
                    plan.required_fields.forEach((f: string) => {
                        // Skip if already added
                        if (['id', 'market', 'date'].includes(f)) return;

                        // @ts-ignore
                        if (t[f] !== undefined) projected[f] = t[f];
                        // Map specific common aliases if needed
                        if (f === 'pnl') projected.pnl = t.pnl;
                    });
                } else {
                    // Default fallback
                    return {
                        id: t.id,
                        market: t.market,
                        direction: t.direction,
                        pnl: t.pnl,
                        setup: t.setup,
                        date: t.entryDateTime
                    };
                }
                return projected;
            };

            const dataContext = finalTrades.map(fieldMap);

            console.log(`Sending ${dataContext.length} trades to AI. (Original: ${trades.length})`);


            // --- FINAL ANSWER STEP ---
            const prompt = `
            You are a trading data analyst. Answer the trader's question based ONLY on the provided data.
            
            Trade Data (Top ${dataContext.length} matches based on your plan):
            ${JSON.stringify(dataContext, null, 2)}
            
            Planner Reasoning used: "${plan.reasoning}"
            
            Trader's Question: "${query}"
            
            Formatting Rules:
            1. If referencing a specific trade (e.g. "biggest win", "last trade"), you **MUST** format it as a clickable link: [Trade Description](trade://ID)
               Example: "Your best trade was [NQ Long on Tuesday](trade://12345-abcde)."
            2. If the user asks for an aggregation (e.g. "total pnl", "win rate"), do NOT list individual trades unless explicitly asked.
            3. Do NOT show raw IDs like "12345" in text outside of the link syntax.
            
            Provide a JSON response with:
            {
                "answer": "Clear, concise answer with links where appropriate.",
                "chartType": "bar" | "line" | "pie" | "table" | "none",
                "chartData": {
                    "labels": ["label1", "label2"],
                    "values": [10, 20],
                    "colors": ["#238636", "#ef4444"] // optional
                },
                "chartTitle": "Title for the chart",
                "insight": "One sentence additional insight or recommendation"
            }
            
            Return ONLY valid JSON.
            `;

            const result = await model.generateContent(prompt);
            const response = result.response;
            let text = response.text();

            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(text);
        } catch (error: any) {
            console.error('AI Query Failed:', error);

            // Check for Quota Exceeded (429) or specific error message
            const errorMsg = error.message || '';
            const isQuotaError = errorMsg.includes('429') || errorMsg.includes('Quota exceeded') || errorMsg.includes('Too Many Requests');

            if (isQuotaError) {
                // Return a specific structure that the UI can recognize
                return {
                    errorType: 'QUOTA_EXCEEDED',
                    message: "You've reached the maximum number of AI queries allowed on the free tier today.",
                    resetTime: 'Midnight PT'
                };
            }

            throw new Error('AI Query Failed: ' + error.message);
        }
    },



    async weeklyReview(trades: Trade[], _weekId?: string) {
        try {
            const model = await this.getModel('weekly');

            // 1. Minify Data (Filter last 7 days or specific week if filtered by caller)
            // If weekId is provided, we assume the trades passed are already filtered for that week,
            // or we could double check. For now, we trust the caller (UI) to pass the correct trades.
            // But we will ensure we only process trades that make sense.

            const minifiedData = trades.map(t => {
                // Formatting Date for Context
                const dateObj = new Date(t.entryDateTime);
                const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const humanLabel = `${t.market} | ${dateStr} | ${t.direction}`;

                return {
                    id: t.id,
                    human_label: humanLabel,
                    market: t.market,
                    setup: t.setup,
                    achieved_r: t.achievedR ? Number(t.achievedR.toFixed(2)) : null,
                    heat_percent: t.heatPercent ? Number(t.heatPercent.toFixed(2)) : null,
                    status: t.pnl && t.pnl > 0 ? 'WIN' : 'LOSS',
                    mistakes: t.mistakes,
                    notes: (t.notesClean && t.notesClean.trim().length > 0) ? t.notesClean : (t.notesRaw || '')
                };
            });

            // 2. Get Prompt
            let promptTemplate = DEFAULT_WEEKLY_REVIEW_PROMPT;
            const customPrompt = SettingsRepository.get('ai_prompt_weekly_review');
            if (customPrompt && typeof customPrompt.value === 'string' && customPrompt.value.trim().length > 10) {
                promptTemplate = customPrompt.value;
            }

            // 3. Construct Prompt
            const prompt = promptTemplate.replace('{{minifiedWeeklyTradeData}}', JSON.stringify(minifiedData, null, 2));

            // 4. Call AI
            const result = await model.generateContent(prompt);
            const response = result.response;
            let text = response.text();

            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(text);

            return parsed;
        } catch (error: any) {
            console.error('Weekly Review Failed:', error);
            throw new Error('Weekly Review Failed: ' + error.message);
        }
    },

    async rewriteJournal(text: string, context: { market?: string; direction?: string }) {
        try {
            const model = await this.getModel('rewrite');

            const defaultRewritePrompt = `Act as a technical S2T cleanup tool for traders. 
Task: Convert the messy voice transcription below into a clear, legible record.

Constraints:
1. Fix grammar, remove filler words (um, ah, like), and correct phonetic S2T errors.
2. Contextualize using {{market}} and {{direction}}. 
3. Recognize and format trading terms: CVD, Absorption, LIQ, VWAP, etc.
4. STRICT: No flowery "AI-speak" or professional transitions. 
5. Preserve original emotional tone and raw logic—do not sanitize the trader's intent.

Transcription:
{{notes_raw}}`;

            let promptTemplate = defaultRewritePrompt;
            const customPrompt = SettingsRepository.get('ai_prompt_rewrite');
            if (customPrompt && typeof customPrompt.value === 'string' && customPrompt.value.trim().length > 10) {
                promptTemplate = customPrompt.value;
            }

            let prompt = '';

            // Check if the template uses the explicit {{notes_raw}} placeholder
            if (promptTemplate.includes('{{notes_raw}}')) {
                prompt = promptTemplate
                    .replace('{{market}}', context.market || 'Unknown Market')
                    .replace('{{direction}}', context.direction || 'Unknown Direction')
                    .replace('{{notes_raw}}', text);
            } else {
                // Fallback for legacy prompts (or if user deleted the placeholder)
                prompt = `
                Task: ${promptTemplate
                        .replace('{{market}}', context.market || 'Unknown Market')
                        .replace('{{direction}}', context.direction || 'Unknown Direction')
                    }

                Original Text:
                "${text}"

                Output ONLY the rewritten text. Do not add any conversational filler.
                `;
            }

            const result = await model.generateContent(prompt);
            const response = result.response;
            let resultText = response.text();

            // Cleanup if it returns markdown code blocks
            return resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        } catch (error: any) {
            console.error('AI Rewrite Failed:', error);
            throw new Error('AI Rewrite Failed: ' + error.message);
        }
    }
};
