/* ═══════════════════════════════════════════════════════════
   RISKPILOT — supabase-config.js
   ⚠️  STEP 1: Replace the two values below with your own
       Supabase project URL and anon key (see README for guide)
═══════════════════════════════════════════════════════════ */

const SUPABASE_URL  = 'https://sbyhbgwboldzlzpnjdry.supabase.co';
const SUPABASE_ANON = 'sb_publishable_AJveUfKIPLlkh5YQZs2NyA_mdk2twp7'; 

// Initialise the Supabase client (available globally as `supabase`)
const { createClient } = window.supabase ?? supabaseJs;
window.supabase = supabaseJs.createClient(SUPABASE_URL, SUPABASE_ANON);
