/* ═══════════════════════════════════════════════════════════
   RISKPILOT — supabase-config.js
   ⚠️  Replace BOTH values below with YOUR Supabase credentials
═══════════════════════════════════════════════════════════ */

const SUPABASE_URL  = 'https://sbyhbgwboldzlzpnjdry.supabase.co';
const SUPABASE_ANON = 'sb_publishable_AJveUfKIPLlkh5YQZs2NyA_mdk2twp7';

/* ── DO NOT EDIT BELOW THIS LINE ── */
(function () {
  try {
    var lib = window.supabase;
    if (!lib || typeof lib.createClient !== 'function') {
      throw new Error('Supabase CDN not loaded');
    }

    window.supabase = lib.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        // Fixed storage key so every page shares the same session
        // regardless of URL path or key format (sb_publishable vs eyJ)
        storageKey:      'riskpilot-auth-token',
        storage:          window.localStorage,
        persistSession:   true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
      }
    });

    console.log('RiskPilot: Supabase client ready ✓');
  } catch (e) {
    console.error('RiskPilot: Supabase init failed —', e.message);
  }
})();
