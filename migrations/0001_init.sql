-- Migration: 0001_init
-- Creates tables for Anticipat user data stored in Cloudflare D1

CREATE TABLE IF NOT EXISTS loan_profiles (
  user_id    TEXT PRIMARY KEY,
  data       TEXT NOT NULL,       -- JSON-serialised LoanProfile
  updated_at TEXT NOT NULL        -- ISO-8601 timestamp
);

CREATE TABLE IF NOT EXISTS monthly_actions (
  id         TEXT PRIMARY KEY,    -- MonthlyAction.id (uuid)
  user_id    TEXT NOT NULL,
  month      TEXT NOT NULL,       -- YYYY-MM
  data       TEXT NOT NULL,       -- JSON-serialised MonthlyAction
  created_at TEXT NOT NULL        -- ISO-8601 timestamp
);

CREATE INDEX IF NOT EXISTS idx_monthly_actions_user_month
  ON monthly_actions (user_id, month);
