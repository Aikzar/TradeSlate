# TradeSlate

[![Release](https://img.shields.io/github/v/release/Aikzar/TradeSlate?style=flat-square)](https://github.com/Aikzar/TradeSlate/releases)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-green?style=flat-square)](LICENSE)

**The Offline-First, AI-Augmented Trading Journal for Power Users.**

TradeSlate is a professional-grade trading journal built for speed, privacy, and deep analysis. It combines the reliability of offline storage with the power of optional AI analysis, designed specifically for futures and crypto traders who demand control over their data.

---

## Core Principles

*   **🛡️ Offline-First & Private**: Your data stays on your machine. All trades, journals, and statistics are stored locally in a high-performance SQLite database. No cloud accounts, no subscription fees, no data mining.
*   **⚡ Low-Friction Entry**: Log trades in seconds. Smart parsing, auto-completion, and quick-entry templates remove the friction from journaling, so you can focus on the market.
*   **🤖 Optional AI Augmentation**: Leverage Google Gemini AI for deep insights, pattern recognition, and "tough love" feedback—but only when *you* choose. AI features are opt-in and use your own API key.
*   **📊 Power-User Analytics**: Go beyond simple P&L. Track MFE/MAE, R-multiples, heatmaps, and psychological tags. Visualize your edge with professional-grade charts and equity curves.
*   **🗣️ Voice-to-Text Integration**: Dictate your trade thoughts in real-time. Built-in local STT (Whisper via Transformers.js) or cloud-based transcription ensures you capture your mindset without typing.
*   **✏️ Built-in Chart Markup**: Draw directly on your uploaded charts within the app. Add trendlines, support/resistance boxes, circles, and text annotations to highlight your edge without external tools.

---

## Visual Gallery

| Dashboard Overview | Trade Entry |
|:---:|:---:|
| ![Homepage](Assets/Tradeslate%20Preview%20Images/Homepage.png) | ![Trade Entry Log](Assets/Tradeslate%20Preview%20Images/Trade_Entry_Tab.png) |

| AI Analysis | Trade Card |
|:---:|:---:|
| ![Individual Trade AI Analysis](Assets/Tradeslate%20Preview%20Images/Individual_Trade_Reviews-Review_Tab.png) | ![Aesthetic Trade Card](Assets/Tradeslate%20Preview%20Images/Trade_Card_Tab.png) |

| Analytics | Weekly Review |
|:---:|:---:|
| ![In-Depth Analytics](Assets/Tradeslate%20Preview%20Images/Analytics_Tab.png) | ![(AI) Weekly Review](Assets/Tradeslate%20Preview%20Images/Weekly_Reviews-Review_Tab.png) |

---

## Feature Deep Dive

### 1. Professional Dashboard
The command center for your trading day.

![Dashboard Overview](Assets/Tradeslate%20Preview%20Images/Homepage.png)

*   **Equity Curve**: Visualize your account growth in real-time.
*   **Quick Stats**: Instant view of your Win Rate, Profit Factor, Expectancy, and Streak status.
*   **Weekly Trade Review**: An AI-powered summary of your week's performance, highlighting top wins and areas for improvement (Right Panel).
*   **Institutional Bias (COT)**: A dedicated widget displaying "Commitment of Traders" data to align your bias with institutional positioning.
*   **Daily Affirmations**: Rotate through powerful trading affirmations to prime your psychology.

### 2. Advanced Journaling & Log
Effortless data entry with professional depth.

![Trade Entry](Assets/Tradeslate%20Preview%20Images/Trade_Entry_Tab.png)

*   **Multimedia Rich**: 
    *   **Images**: Upload local screenshots or paste web links directly.
    *   **Video**: Link your YouTube session recording with a specific timestamp to review your exact execution moment.
*   **Voice Dictation**: Use the "Dictate" button to speak your thoughts. The app uses a local Whisper model to transcribe your voice securely.
*   **Smart Rewrite**: Click "Rewrite" to have AI clean up your dictated notes into structured, professional trading prose.
*   **Detailed Attributes**: Log every detail: Setup, Trigger, Confluences, Mistakes, Tags, Pre/Post Emotions, and Risk parameters.
*   **Bulk Actions**: Select multiple trades in the list to Delete in bulk.

### 3. Deep Analytics
Understand your edge with granular metrics.

![Analytics](Assets/Tradeslate%20Preview%20Images/Analytics_Tab.png)

*   **KPI Cards**: Track Net PnL, Win Rate, Profit Factor, Expectancy, Max Drawdown, Avg Win RR, and Win/Loss Streaks.
*   **Detailed Metrics**: 
    *   **Profit Retention**: How much of the move did you capture?
    *   **MFE/MAE**: Analyze your trade's Maximum Favorable Excursion vs. Adverse Excursion.
    *   **Time Stats**: Average Trade Duration, Time in Winning Trades vs. Losing Trades.
*   **Interactive Charts**:
    *   **Equity Curve**: Track capital growth over time.
    *   **Drawdown Chart**: Visualize drawdown depth and recovery periods.
    *   **R-Distribution**: See the distribution of your R-multiples.
    *   **Win/Loss Pie**: Visual ratio of outcomes.
    *   **PnL be Time**: Heatmap-style charts for PnL by Hour of Day and Day of Week.
    *   **Duration Scatter**: Analysis of hold times vs. profitability.
*   **Stats Breakdown**: Filter and analyze performance specifically by **Setup**, **Tag**, **Market**, or **Direction** (Long/Short).

### 4. Calendar
Visualizing your consistency.

![Calendar](Assets/Tradeslate%20Preview%20Images/Calendar_Tab.png)

*   **Multi-View**: Toggle between **Week**, **Month**, **Quarter**, and **Year** views.
*   **Performance Heatmap**: A color-coded grid (Green/Red) showing your daily PnL intensity.
*   **Weekly Calendar**: A detailed hourly view of your trades plotted across the week to spot timing patterns.
*   **Interactive Details**: Click any day to open a `Day Details` modal with a list of all trades for that session.

### 5. Review & Improvement System
The core engine for trader growth.

#### Weekly Recap
An aggregate view of your weekly performance metrics.

![Weekly Review](Assets/Tradeslate%20Preview%20Images/Weekly_Reviews-Review_Tab.png)

#### Individual Trade Review
*   **AI Analysis**: Get a score (1-10) and qualitative feedback on your trade execution.
*   **Psychology Check**: AI analyzes your notes for emotional tilt or discipline issues.
*   **Improvement Tips**: Actionable advice for next time.

![Individual Review](Assets/Tradeslate%20Preview%20Images/Individual_Trade_Reviews-Review_Tab.png)

#### Behavioral Patterns
Automated detection of recurring habits (e.g., "Revenge Trading", "Over-leveraging").

![Patterns](Assets/Tradeslate%20Preview%20Images/Patterns-Review_Tab.png)

#### Execution Quality
Specific analysis of your entries and exits relative to price action.

![Execution](Assets/Tradeslate%20Preview%20Images/Trade_Execution-Review_Tab.png)

#### Mistake Heatmap
Visualizing where your costly errors define themselves.

![Mistake Heatmap](Assets/Tradeslate%20Preview%20Images/Heatmap_Mistakes-Review_Tab.png)

#### Monte Carlo Projections
Simulate 1000s of future equity curves based on your current stats to check effective ruin probability.

![Monte Carlo](Assets/Tradeslate%20Preview%20Images/Monte_Carlo_Projection-Review_Tab.png)

#### Ask AI
A chat interface to query your trade database (e.g., "Show me my worst losses on Mondays").

![Ask AI](Assets/Tradeslate%20Preview%20Images/Ask_AI_About_Your_Trades-Review_Tab.png)

### 6. Trade Cards
Shareable proof of your performance.

![Trade Cards](Assets/Tradeslate%20Preview%20Images/Trade_Card_Tab.png)

*   **Templates**: Choose from "Elite Pro", "Neon Trader", "Aesthetic", or "Minimalist".
*   **Customization**: Toggle visible data points (PnL, Setup, Notes).
*   **Export**: Download high-resolution images for social media or archives.

### 7. Settings & Data
Total control over your environment.

![Settings](Assets/Tradeslate%20Preview%20Images/AI_Assistant_Section-Settings_Tab.png)

*   **Account Management**: Create and edit multiple trading accounts with custom names and identifying colors.
*   **Trading Preferences**: Define custom Break-Even thresholds (in R-Multiple) and global Timezone Offsets.
*   **Behavioral & Risk**: Configure automated flags for **FOMO (Velocity)**, **Revenge Trading**, and **Fumble (Missed Wins)** detection.
*   **Import Trades**: Flexible CSV module to bulk-import historical data from any platform.
*   **AI Assistant**:
    *   **Prompts**: Customize the system instructions for Individual Reviews, Weekly Insights, and Note Rewriting.
    *   **Models**: Select specific Gemini models (Flash or Pro) per task to balance speed, cost, and depth.
*   **Voice Dictation (STT)**:
    *   **Provider**: Choose between **Local (WebGPU/Private)** or **Cloud (OpenAI)** engines.
    *   **Hardware**: Select input microphones and download local engine tiers (Tiny to Large).
*   **Affirmations**: Manage, schedule, and bulk-import your custom daily performance psychology list.
*   **Data Management**: 
    *   **Export**: Full JSON export of your database (trades, accounts, settings) for backup.
    *   **Import**: Restore or merge your data from a JSON backup file.
    *   **Seed Data**: Populate the app with demo trades to explore features.

---

## 🛠️ Installation

1.  **Download**: Get the latest release from the [Releases](https://github.com/Aikzar/TradeSlate/releases) page.
2.  **Install**: Run `TradeSlate-Setup-1.0.0.exe`.
3.  **Setup**:
    *   (Optional) Go to **Settings** -> **AI Assistant** to enter your Google Gemini API Key, optainable via [Google AI Studio](https://aistudio.google.com/), for AI features.
    *   (Optional) Seed demo data to explore the features.
4.  **Journal**: Start logging your trades!

## 💻 Tech Stack

Built with a modern stack for performance and reliability:

*   **React 19**: Utilizing the latest React features for a responsive, fluid UI.
*   **Electron**: Cross-platform desktop application framework.
*   **SQLite (Better-SQLite3)**: Robust, serverless SQL database engine for instant data retrieval.
*   **Transformers.js**: On-device machine learning for voice transcription (Whisper).
*   **Google Gemini API**: Integration for advanced LLM-based trade analysis.

## License
This project is licensed under the **PolyForm Noncommercial License 1.0.0**.

---

Vibecoded with ❤️ for kaizen traders.
