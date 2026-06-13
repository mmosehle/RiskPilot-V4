/* ═══════════════════════════════════════════════════════════
   RISKPILOT — supabase-config.js
   ⚠️  Replace BOTH values below with YOUR Supabase credentials
   ⚠️  Get them from: Supabase Dashboard → Settings → API Keys
═══════════════════════════════════════════════════════════ */

const SUPABASE_URL  = 'https://sbyhbgwboldzlzpnjdry.supabase.co';
const SUPABASE_ANON = 'sb_publishable_AJveUfKIPLlkh5YQZs2NyA_mdk2twp7'; 

/* ── DO NOT EDIT BELOW THIS LINE ── */

// The Supabase v2 CDN exposes the library as `window.supabase` (the namespace).
// We call .createClient() on it and store the RESULT back as window.supabase
// so every page can call window.supabase.auth.getSession() etc.
(function () {
  try {
    // CDN v2 puts the library at window.supabase (namespace object)
    var lib = window.supabase;
    if (!lib || typeof lib.createClient !== 'function') {
      throw new Error('Supabase library not loaded yet');
    }
    window.supabase = lib.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log('RiskPilot: Supabase client ready ✓');
  } catch (e) {
    console.error('RiskPilot: Failed to create Supabase client —', e.message);
  }
})();
