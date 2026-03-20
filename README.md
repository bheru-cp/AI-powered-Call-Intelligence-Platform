# Call Intelligence Platform

AI-powered sales call analysis app built with Next.js 14, TypeScript, Tailwind, and OpenAI.

It lets you:
- upload call recordings,
- transcribe with Whisper,
- analyze with GPT into structured insights,
- view team-level metrics on a main dashboard,
- and inspect detailed intelligence per call.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript (strict)
- Tailwind CSS + shadcn/ui-style components
- OpenAI API (Whisper + GPT)
- Supabase (optional) or local file persistence
- Recharts + Framer Motion

## Features

- Audio upload and processing pipeline
- Structured AI output (summary, sentiment, score, questionnaire, keywords, action items)
- Main dashboard with cards, sentiment chart, keyword tags, and recent calls
- Per-call dashboard with:
  - summary and sentiment
  - transcript + audio playback
  - talk-time split and score
  - performance dimensions
  - questionnaire coverage
  - top keyword tags
  - follow-up and observations

## Quick Start

1) Install dependencies

```bash
npm install
```

2) Create environment file

```bash
cp .env.example .env.local
```

3) Set required env vars in `.env.local`

- `OPENAI_API_KEY` (required)
- Optional: `OPENAI_ANALYSIS_MODEL` (defaults to `gpt-4o-mini`)

4) Choose persistence mode

### Option A: Supabase (recommended for production)

Set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Then:
- run SQL from `supabase/migrations/001_init.sql`
- create storage bucket `call-audio`

### Option B: Local storage (good for local/dev)

If Supabase env vars are not set, app stores files in:
- `.data/call-intelligence/` (default)
- falls back to `/tmp/call-intelligence-platform` if `.data` is not writable

Optional overrides:
- `CALL_INTEL_LOCAL_DATA_DIR=/absolute/path`
- `CALL_INTEL_DISABLE_LOCAL_STORE=true` (disable local storage)

5) Start app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for full list.

Important ones:

- `OPENAI_API_KEY`
- `OPENAI_ANALYSIS_MODEL` (optional)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `CALL_INTEL_LOCAL_DATA_DIR` (optional)
- `CALL_INTEL_DISABLE_LOCAL_STORE` (optional)

## API Flow

1. `POST /api/calls`  
   Stores uploaded file and returns `202` with call ID.

2. `POST /api/calls/[id]/process`  
   Runs long-lived processing (Whisper + GPT).  
   Updates call status through `transcribing -> analyzing -> complete/failed`.

3. `GET /api/calls`  
   Returns dashboard items + aggregate metrics.

4. `GET /api/calls/[id]`  
   Returns per-call details and audio URL when available.

## Project Structure

| Path | Purpose |
|---|---|
| `src/app` | App Router pages and API routes |
| `src/components` | UI components (dashboard + call detail + forms) |
| `src/lib/openai` | OpenAI client, transcription, and analysis |
| `src/lib/pipeline` | End-to-end call processing orchestration |
| `src/lib/persistence` | Local persistence helpers |
| `src/lib/dashboard` | Aggregate metric builders |
| `src/types` | Shared TypeScript types |

## Scripts

- `npm run dev` - run dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - lint project

## Notes & Troubleshooting

- Max upload size is enforced in `src/app/api/calls/route.ts` (~24MB by default).
- If OpenAI returns `401`, verify `.env.local` has a valid `OPENAI_API_KEY` and restart server.
- For server deployments (nginx/pm2), increase request timeout for processing endpoints.
- Never commit `.env.local` or API keys.
