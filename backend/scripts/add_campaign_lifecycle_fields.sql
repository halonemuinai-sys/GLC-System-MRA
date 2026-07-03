-- Migration: Campaign Lifecycle fields (KPI targets + post-campaign actuals)
-- Run this in Supabase SQL Editor (dashboard.supabase.com → SQL Editor)
-- Schema: marketing_budget

ALTER TABLE marketing_budget.marketing_plans
  ADD COLUMN IF NOT EXISTS target_sales        DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS target_leads        INTEGER,
  ADD COLUMN IF NOT EXISTS target_reach        INTEGER,
  ADD COLUMN IF NOT EXISTS target_impressions  INTEGER,
  ADD COLUMN IF NOT EXISTS target_roi_pct      DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS target_notes        TEXT,
  ADD COLUMN IF NOT EXISTS actual_sales        DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS actual_leads        INTEGER,
  ADD COLUMN IF NOT EXISTS actual_reach        INTEGER,
  ADD COLUMN IF NOT EXISTS actual_impressions  INTEGER,
  ADD COLUMN IF NOT EXISTS actual_roi_pct      DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS actual_notes        TEXT,
  ADD COLUMN IF NOT EXISTS actuals_filled_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actuals_filled_by   VARCHAR(50);
