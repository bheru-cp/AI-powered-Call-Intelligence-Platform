-- Call Intelligence Platform — schema + storage policy notes
-- Run in Supabase SQL editor or via CLI. Create a public bucket "call-audio" in Dashboard > Storage
-- and allow authenticated/service role uploads as needed.

create extension if not exists "pgcrypto";

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  original_filename text not null,
  duration_seconds numeric,
  audio_path text not null,
  status text not null check (
    status in (
      'uploaded',
      'transcribing',
      'analyzing',
      'complete',
      'failed'
    )
  ),
  error_message text
);

create table if not exists public.call_insights (
  call_id uuid primary key references public.calls (id) on delete cascade,
  transcript text,
  summary text,
  call_sentiment text check (
    call_sentiment in ('positive', 'neutral', 'negative')
  ),
  agent_talk_pct numeric,
  customer_talk_pct numeric,
  overall_score numeric,
  performance jsonb not null default '{}'::jsonb,
  questionnaire jsonb not null default '[]'::jsonb,
  top_keywords jsonb not null default '[]'::jsonb,
  action_items jsonb not null default '[]'::jsonb,
  positive_observations jsonb not null default '[]'::jsonb,
  negative_observations jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists calls_created_at_idx on public.calls (created_at desc);
create index if not exists calls_status_idx on public.calls (status);

-- Demo / server-only access: enable RLS and allow service role via bypass.
-- For anon demo UI reading through Next.js API (service role), lock direct client access.

alter table public.calls enable row level security;
alter table public.call_insights enable row level security;

-- No policies = only service role can access (when using SUPABASE_SERVICE_ROLE_KEY on server).

comment on table public.calls is 'Sales call recordings metadata and pipeline status';
comment on table public.call_insights is 'AI-derived transcript and structured insights per call';
