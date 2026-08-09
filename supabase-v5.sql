/* ═══════════════════════════════════════════════════════════
   RISKPILOT v5 — Supabase SQL
   Run this in Supabase → SQL Editor → New query
   This is ADDITIVE — safe to run alongside existing v4 tables
═══════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════
   1. TRADING ACCOUNTS TABLE
══════════════════════════════════════ */
CREATE TABLE IF NOT EXISTS trading_accounts (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_type      TEXT        NOT NULL CHECK (account_type IN ('personal','prop')),
  account_name      TEXT        NOT NULL,
  currency          TEXT        NOT NULL DEFAULT 'ZAR',
  weekly_wallet     NUMERIC     DEFAULT 0,
  checklist         TEXT        DEFAULT '[]',  -- JSON array of checklist items
  -- Personal fields
  weekly_budget     NUMERIC     DEFAULT NULL,
  profit_goal       NUMERIC     DEFAULT NULL,
  -- Prop firm fields
  account_size      NUMERIC     DEFAULT NULL,
  profit_target_pct NUMERIC     DEFAULT NULL,
  daily_loss_pct    NUMERIC     DEFAULT NULL,
  max_loss_pct      NUMERIC     DEFAULT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trading accounts"
  ON trading_accounts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

/* ══════════════════════════════════════
   2. TRADE JOURNAL TABLE
   (replaces the JSON blob in riskpilot_data)
══════════════════════════════════════ */
CREATE TABLE IF NOT EXISTS trade_journal (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id      UUID        REFERENCES trading_accounts(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument      TEXT        NOT NULL,
  direction       TEXT        NOT NULL CHECK (direction IN ('buy','sell')),
  setup_type      TEXT        NOT NULL CHECK (setup_type IN ('A','B')),
  entry_price     NUMERIC,
  sl_price        NUMERIC,
  tp_price        NUMERIC,
  lot_size        NUMERIC,
  risk_amount     NUMERIC,     -- in account currency
  profit_zar      NUMERIC,     -- potential profit in account currency
  rr_ratio        NUMERIC,
  outcome         TEXT        DEFAULT 'pending' CHECK (outcome IN ('pending','win','loss','not_triggered')),
  trade_date      DATE        DEFAULT CURRENT_DATE,
  before_url      TEXT,
  after_url       TEXT,
  notes           TEXT,
  checklist_state TEXT        DEFAULT '{}',  -- JSON: {item:true/false}
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trade_journal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own trades"
  ON trade_journal FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

/* ══════════════════════════════════════
   3. HELPFUL ADMIN QUERIES
══════════════════════════════════════ */

-- See all accounts across all users:
/*
SELECT
  u.email,
  a.account_name,
  a.account_type,
  a.currency,
  a.account_size,
  a.weekly_wallet,
  a.created_at
FROM trading_accounts a
JOIN auth.users u ON a.user_id = u.id
ORDER BY a.created_at DESC;
*/

-- See all trades for a specific account:
/*
SELECT * FROM trade_journal
WHERE account_id = 'YOUR_ACCOUNT_ID_HERE'
ORDER BY trade_date DESC;
*/
