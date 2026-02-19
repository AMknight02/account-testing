-- ============================================
-- Migration: Drop old schema, create new schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop old tables (order matters due to foreign keys)
drop table if exists public.completion_status cascade;
drop table if exists public.answers cascade;
drop table if exists public.question_options cascade;
drop table if exists public.questions cascade;

-- ============================================
-- Create new tables
-- ============================================

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  edition text not null check (edition in ('her', 'his')),
  order_num integer not null,
  intensity text not null check (intensity in ('light', 'moderate', 'dark')),
  intensity_emoji text not null,
  title text not null,
  scenario text not null,
  created_at timestamptz not null default now()
);

create table public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  option_text text not null,
  is_other boolean not null default false,
  order_num integer not null
);

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  question_id uuid not null references public.questions(id),
  selected_option_id uuid references public.question_options(id),
  other_text text,
  created_at timestamptz not null default now(),
  constraint answers_user_question_unique unique (user_id, question_id)
);

create table public.completion_status (
  user_id uuid primary key references auth.users(id),
  completed_at timestamptz not null default now()
);

-- ============================================
-- Enable RLS
-- ============================================

alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.answers enable row level security;
alter table public.completion_status enable row level security;

-- ============================================
-- RLS Policies
-- ============================================

-- Questions: readable by any authenticated user
create policy "Authenticated users can read questions"
  on public.questions for select
  to authenticated
  using (true);

-- Question options: readable by any authenticated user
create policy "Authenticated users can read question_options"
  on public.question_options for select
  to authenticated
  using (true);

-- Answers: users can insert their own
create policy "Users can insert own answers"
  on public.answers for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Answers: users can update their own
create policy "Users can update own answers"
  on public.answers for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Answers: users can read own answers, or other users' answers if that user has completed
create policy "Users can read own or completed users answers"
  on public.answers for select
  to authenticated
  using (
    auth.uid() = user_id
    or user_id in (select cs.user_id from public.completion_status cs)
  );

-- Completion status: users can insert their own
create policy "Users can insert own completion status"
  on public.completion_status for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Completion status: readable by any authenticated user
create policy "Authenticated users can read completion status"
  on public.completion_status for select
  to authenticated
  using (true);
