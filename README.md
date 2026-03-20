# Call Intelligence Platform

Next.js (App Router) app that ingests sales call audio, transcribes with [OpenAI Whisper](https://platform.openai.com/docs/guides/speech-to-text), analyzes transcripts with GPT (structured JSON), and surfaces insights on a **main dashboard** and **per-call** pages. UI uses Tailwind CSS, [shadcn/ui](https://ui.shadcn.com)-style components, [Recharts](https://recharts.org), and [Framer Motion](https://www.framer.com/motion/) (client-only).

## Prerequisites

- Node.js 20+ recommended. On **Node 18**, the app polyfills `globalThis.File` from `node:buffer` so the OpenAI SDK can build Whisper uploads (`toFile`); upgrading to Node 20 LTS avoids experimental `buffer.File` warnings.
- OpenAI API key with access to Whisper and chat models (default analysis model: `gpt-4o-mini`, override with `OPENAI_ANALYSIS_MODEL`).
- **Either** a [Supabase](https://supabase.com) project **or** local file persistence (see below).

## Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Environment** — copy [`.env.example`](.env.example) to `.env.local` and set at least:

   - `OPENAI_API_KEY` (required to transcribe and analyze)

3. **Persistence (pick one)**

   **A — Supabase (recommended for production)**  
   - Set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (and optionally `NEXT_PUBLIC_SUPABASE_ANON_KEY`).  
   - Run [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) in the SQL editor.  
   - Create a private Storage bucket **`call-audio`**.

   **B — Local files (quick start, no Supabase)**  
   - If Supabase vars are **not** set, the app stores calls and audio under **`.data/call-intelligence/`** (gitignored) — works with both `npm run dev` and `npm start`.  
   - Playback uses `GET /api/calls/[id]/audio`.  
   - On **serverless** platforms (ephemeral disk), set `CALL_INTEL_DISABLE_LOCAL_STORE=true` and use Supabase instead. Optional: `CALL_INTEL_LOCAL_DATA_DIR`.

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000): upload an audio file, wait for the pipeline to finish, then open the **Dashboard** or the call link.

## Application flow

1. Upload audio  
2. Transcribe (Whisper)  
3. AI analysis (single GPT JSON pass: sentiment, scores, questionnaire Q1–Q15, keywords, actions, observations, talk-time estimate)  
4. Persist insights  
5. Main + individual dashboards  

## Project structure (high level)

| Path | Role |
|------|------|
| [`src/app/api/calls`](src/app/api/calls) | `POST` save upload (202), `GET` list + aggregates |
| [`src/app/api/calls/[id]/process`](src/app/api/calls/[id]/process) | `POST` run Whisper + GPT (long request; client calls after upload) |
| [`src/app/api/calls/[id]`](src/app/api/calls/[id]) | `GET` call detail + signed audio URL |
| [`src/lib/pipeline/process-call.ts`](src/lib/pipeline/process-call.ts) | Storage upload → transcribe → analyze → DB |
| [`src/lib/openai/`](src/lib/openai/) | OpenAI client, Whisper, GPT analysis |
| [`src/lib/constants/questionnaire.ts`](src/lib/constants/questionnaire.ts) | Fixed Q1–Q15 discovery questions |
| [`src/components/dashboard-main.tsx`](src/components/dashboard-main.tsx) | Main dashboard metrics + charts |
| [`src/components/call-detail-view.tsx`](src/components/call-detail-view.tsx) | Individual call sections |

## Limits and operations notes

- Upload size is capped around **24MB** in the API route (Whisper / serverless-friendly demo limit). Adjust in [`src/app/api/calls/route.ts`](src/app/api/calls/route.ts) if your host allows larger bodies.
- **Transcription + analysis** run in **`POST /api/calls/[id]/process`** (not in the background after upload). That keeps the HTTP request alive until OpenAI finishes; fire-and-forget work after a 202 response is unreliable behind **nginx**, **PM2**, and many hosts.
- `export const maxDuration = 300` is set on the upload and **process** routes where supported (e.g. Vercel Pro). If you reverse-proxy Node, raise timeouts for `/api/calls/` — e.g. nginx `proxy_read_timeout 300s;` and `client_max_body_size 25m;`.
- Never commit API keys. Rotate any key that was exposed publicly.

## Scripts

- `npm run dev` — development server  
- `npm run build` — production build  
- `npm run start` — serve production build  
- `npm run lint` — ESLint  

## References

- [Next.js documentation](https://nextjs.org/docs)
