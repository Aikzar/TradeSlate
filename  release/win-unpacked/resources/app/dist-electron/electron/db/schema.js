"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = void 0;
exports.schema = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_aggregated INTEGER DEFAULT 1, -- Include in 'All Accounts' view
    color TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    account_id TEXT, -- Foreign Key to accounts.id
    market TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'Long' or 'Short'
    entry_date_time TEXT NOT NULL, -- ISO timestamp
    exit_time TEXT, -- ISO timestamp
    
    setup TEXT,
    entry_trigger TEXT,
    confluences TEXT, -- JSON array
    
    entry_price REAL,
    exit_price REAL,
    planned_sl REAL,
    planned_tp REAL,
    contracts INTEGER,
    
    -- Computed / Metrics
    risk REAL,
    pnl REAL,
    planned_rr REAL,
    achieved_r REAL,
    win INTEGER, -- 0 or 1
    duration_seconds INTEGER,
    
    -- MAE/MFE
    mae_price REAL,
    mfe_price REAL,
    
    -- Notes & Psych
    notes_raw TEXT,
    notes_clean TEXT,
    emotion_pre TEXT,
    emotion_post TEXT,
    tilt_score INTEGER,
    
    session TEXT,
    tags TEXT, -- JSON array
    mistakes TEXT, -- JSON array
    images TEXT, -- JSON array
    
    status TEXT DEFAULT 'CLOSED', -- 'OPEN', 'CLOSED', 'SKIPPED'
    
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(account_id) REFERENCES accounts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_trades_date ON trades(entry_date_time);
  CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market);

  CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL, -- YYYY-MM-DD
      content TEXT,
      mood TEXT,
      tags TEXT, -- JSON Array
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  
  CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entries(date);

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    author TEXT,
    is_custom INTEGER DEFAULT 0, -- 0 for default 365, 1 for user added
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;
