-- ============================================
-- Migration: Add unique constraint for save-progress upserts
-- Run this ONLY if you already applied migration.sql without the constraint.
-- ============================================

-- Delete any duplicate answers (keep the most recent per user+question)
delete from public.answers a
using public.answers b
where a.user_id = b.user_id
  and a.question_id = b.question_id
  and a.created_at < b.created_at;

-- Add unique constraint to support upsert (one answer per user per question)
alter table public.answers
  add constraint answers_user_question_unique unique (user_id, question_id);
