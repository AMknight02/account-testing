-- Create questions table
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  order_num integer not null,
  text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null
);

-- Create answers table
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  question_id uuid not null references public.questions(id),
  selected_option text not null check (selected_option in ('a', 'b', 'c', 'd', 'other')),
  other_text text,
  created_at timestamptz not null default now()
);

-- Create completion_status table
create table if not exists public.completion_status (
  user_id uuid primary key references auth.users(id),
  completed_at timestamptz not null default now()
);

-- Enable RLS
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.completion_status enable row level security;

-- Questions: readable by any authenticated user
create policy "Authenticated users can read questions"
  on public.questions for select
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
