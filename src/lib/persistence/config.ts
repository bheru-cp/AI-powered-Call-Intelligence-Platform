import { isSupabaseConfigured } from "@/lib/supabase/admin";

/**
 * When Supabase env vars are missing, persist calls and audio under `.data/call-intelligence/`
 * so the app works with only `OPENAI_API_KEY` (no cloud DB required).
 *
 * - **Default:** on whenever Supabase is not configured (`npm run dev` and `npm start` both work).
 * - **Opt out:** set `CALL_INTEL_DISABLE_LOCAL_STORE=true` if you must fail closed without Supabase
 *   (e.g. serverless host where disk should not be used).
 */
export function isLocalPersistenceMode(): boolean {
  if (isSupabaseConfigured()) {
    return false;
  }
  if (
    process.env.CALL_INTEL_DISABLE_LOCAL_STORE === "true" ||
    process.env.CALL_INTEL_DISABLE_LOCAL_STORE === "1"
  ) {
    return false;
  }
  return true;
}

/** Reads/writes are possible (Supabase or local dev store). */
export function isPersistenceBackendAvailable(): boolean {
  return isSupabaseConfigured() || isLocalPersistenceMode();
}
