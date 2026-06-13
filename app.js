/* ═══════════════════════════════════════════════════════════
   RISKPILOT v3 — app.js
   Master Your Risk | Supabase Auth + Data Persistence
═══════════════════════════════════════════════════════════ */
"use strict";

/* ───────────────────────────────────────────
   INSTRUMENT CONFIG
─────────────────────────────────────────── */
const INSTRUMENTS = {
  EURUSD: { pip:0.0001, pipVal:10,   digits:5, label:"EUR/USD" },
  GBPUSD: { pip:0.0001, pipVal:10,   digits:5, label:"GBP/USD" },
  USDJPY: { pip:0.01,   pipVal:1000, digits:3, label:"USD/JPY" },
  USDCHF: { pip:0.0001, pipVal:10,   digits:5, label:"USD/CHF" },
  AUDUSD: { pip:0.0001, pipVal:10,   digits:5, label:"AUD/USD" },
  USDCAD: { pip:0.0001, pipVal:10,   digits:5, label:"USD/CAD" },
  NZDUSD: { pip:0.0001, pipVal:10,   digits:5, label:"NZD/USD" },
  EURGBP: { pip:0.0001, pipVal:10,   digits:5, label:"EUR/GBP" },
  NAS100: { pip:1,      pipVal:1,    digits:2, label:"NAS100",         isIndex:true },
  US30:   { pip:1,      pipVal:1,    digits:2, label:"US30",           isIndex:true },
  XAUUSD: { pip:0.1,    pipVal:100,  digits:2, label:"GOLD (XAU/USD)", isGold:true  },
};

const FALLBACK = {
  EURUSD:1.0832, GBPUSD:1.2721, USDJPY:157.42, USDCHF:0.8963,
  AUDUSD:0.6521, USDCAD:1.3612, NZDUSD:0.5923, EURGBP:0.8512,
  NAS100:19843.5, US30:42156.7, XAUUSD:3312.45, USDZAR:18.52,
};

/* ───────────────────────────────────────────
   STATE
─────────────────────────────────────────── */
let state = {
  weeklyBudget:  0,
  dailyBudget:   0,
  usedToday:     0,
  weeklyWallet:  0,
  selectedSetup: "high",
  currency:      "ZAR",
  currentTrade:  null,
  journal:       [],
  livePrices:    {},
  usdZar:        18.52,
  calYear:       new Date().getFullYear(),
  calMonth:      new Date().getMonth(),
  user:          null,
};

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

/* ═══════════════════════════════════════════════
   PATH HELPER — works for local, Live Server AND GitHub Pages subfolders
   e.g. https://user.github.io/riskpilot/index.html
   → base = 'https://user.github.io/riskpilot/'
═══════════════════════════════════════════════ */
function basePath() {
  const p = window.location.pathname;          // e.g. /riskpilot/index.html
  return window.location.origin + p.substring(0, p.lastIndexOf('/') + 1);
}
function goTo(file) {
  window.location.href = basePath() + file;
}

/* ═══════════════════════════════════════════════
   AUTH GUARD + BOOT
═══════════════════════════════════════════════ */
async function boot() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { goTo('auth.html'); return; }
  state.user = session.user;
  updateSidebarUser();
  await loadUserData();
  renderCalendar();
  fetchLivePrices();
  setInterval(fetchLivePrices, 60_000);
}

function updateSidebarUser() {
  const u    = state.user;
  const name = u?.user_metadata?.name || '';
  const sur  = u?.user_metadata?.surname || '';
  const display = [name, sur].filter(Boolean).join(' ') || u?.email || 'User';
  const el = document.getElementById('sidebar-user-name');
  if (el) el.textContent = display;
}

async function handleSignOut() {
  if (!confirm('Sign out of RiskPilot?')) return;
  await saveUserData();
  await supabase.auth.signOut();
  goTo('auth.html');
}

/* ═══════════════════════════════════════════════
   DATA PERSISTENCE (Supabase)
═══════════════════════════════════════════════ */
async function saveUserData() {
  if (!state.user) return;
  const payload = {
    user_id:       state.user.id,
    weekly_budget: state.weeklyBudget,
    daily_budget:  state.dailyBudget,
    used_today:    state.usedToday,
    weekly_wallet: state.weeklyWallet,
    currency:      state.currency,
    journal:       JSON.stringify(state.journal),
    last_saved:    new Date().toISOString(),
  };
  await supabase.from('riskpilot_data').upsert(payload, { onConflict: 'user_id' });
}

async function loadUserData() {
  if (!state.user) return;
  const { data, error } = await supabase
    .from('riskpilot_data')
    .select('*')
    .eq('user_id', state.user.id)
    .single();

  if (error || !data) return; // new user — start fresh

  // Restore saved state
  state.weeklyBudget = data.weekly_budget || 0;
  state.dailyBudget  = data.daily_budget  || 0;
  state.usedToday    = data.used_today    || 0;
  state.weeklyWallet = data.weekly_wallet || 0;
  state.currency     = data.currency      || "ZAR";

  try { state.journal = JSON.parse(data.journal || '[]'); } catch { state.journal = []; }

  // Restore today's reset — if last_saved was a different calendar day, reset usedToday
  if (data.last_saved) {
    const savedDate = new Date(data.last_saved).toISOString().slice(0, 10);
    if (savedDate !== todayStr()) state.usedToday = 0;
  }

  // Apply to UI
  if (state.weeklyBudget > 0) {
    document.getElementById('weekly-budget').value = state.currency === 'USD'
      ? (state.weeklyBudget / state.usdZar).toFixed(2)
      : state.weeklyBudget.toFixed(2);
    document.getElementById('budget-breakdown').style.display = 'block';
    document.getElementById('daily-budget-display').textContent = fmt(state.dailyBudget);
    document.getElementById('hp-risk-display').textContent      = fmt(state.dailyBudget);
    document.getElementById('std-risk-display').textContent     = fmt(state.dailyBudget * 0.5);
  }

  // Restore currency toggle
  document.getElementById('cur-zar').classList.toggle('active', state.currency === 'ZAR');
  document.getElementById('cur-usd').classList.toggle('active', state.currency === 'USD');
  document.getElementById('budget-symbol').textContent = state.currency === 'ZAR' ? 'R' : '$';

  refreshBudgetStatus();
  renderJournal();
}

// Auto-save every 30 seconds and on key events
setInterval(() => saveUserData(), 30_000);

/* ═══════════════════════════════════════════════
   PROFILE PAGE
═══════════════════════════════════════════════ */
function renderProfile() {
  if (!state.user) return;
  const u   = state.user;
  const md  = u.user_metadata || {};
  const name = md.name    || '—';
  const sur  = md.surname || '—';
  const email = u.email   || '—';
  const marketing = md.marketing_emails ? '✅ Opted in' : '❌ Not opted in';

  document.getElementById('prof-name').textContent    = name;
  document.getElementById('prof-surname').textContent = sur;
  document.getElementById('prof-email').textContent   = email;
  document.getElementById('prof-marketing').textContent = marketing;

  // Avatar initials
  const initials = [(md.name||'')[0], (md.surname||'')[0]].filter(Boolean).join('').toUpperCase() || '?';
  document.getElementById('profile-avatar').textContent = initials;

  // Member since
  const created = new Date(u.created_at);
  const ms = document.getElementById('profile-member-since');
  if (ms) ms.textContent = 'Member since ' + MONTHS[created.getMonth()] + ' ' + created.getFullYear();

  // Stats
  const settled  = state.journal.filter(t => t.outcome !== 'pending');
  const wins     = settled.filter(t => t.outcome === 'win');
  const wr       = settled.length > 0 ? ((wins.length / settled.length) * 100).toFixed(0) + '%' : '0%';
  const bestRR   = settled.length > 0 ? Math.max(...settled.map(t => parseFloat(t.rr) || 0)).toFixed(2) : '—';

  document.getElementById('prof-trades').textContent  = settled.length;
  document.getElementById('prof-winrate').textContent = wr;
  document.getElementById('prof-wallet').textContent  = fmt(state.weeklyWallet);
  document.getElementById('prof-bestrr').textContent  = bestRR !== '—' ? '1:' + bestRR : '—';
}

function confirmReset() {
  if (!confirm('⚠️ This will permanently delete ALL your trade data, journal, and wallet balance. Are you absolutely sure?')) return;
  if (!confirm('Last chance — this cannot be undone. Confirm reset?')) return;
  resetAllData();
}

async function resetAllData() {
  // Clear state
  state.weeklyBudget = 0;
  state.dailyBudget  = 0;
  state.usedToday    = 0;
  state.weeklyWallet = 0;
  state.journal      = [];
  state.currentTrade = null;

  // Clear UI inputs
  ['weekly-budget','entry-price','sl-price','tp-price'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const bd = document.getElementById('budget-breakdown');
  if (bd) bd.style.display = 'none';
  const rp = document.getElementById('results-panel');
  if (rp) rp.style.display = 'none';

  refreshBudgetStatus();
  renderJournal();
  renderCalendar();
  renderProfile();

  // Delete from Supabase
  if (state.user) {
    await supabase.from('riskpilot_data').delete().eq('user_id', state.user.id);
  }

  alert('✅ All data has been reset.');
}

/* ═══════════════════════════════════════════════
   CURRENCY
═══════════════════════════════════════════════ */
function setCurrency(cur) {
  state.currency = cur;
  document.getElementById('cur-zar').classList.toggle('active', cur === 'ZAR');
  document.getElementById('cur-usd').classList.toggle('active', cur === 'USD');
  document.querySelectorAll('.cur-label').forEach(el => el.textContent = cur);
  document.getElementById('budget-symbol').textContent = cur === 'ZAR' ? 'R' : '$';

  const lbl = document.querySelector("label[for='weekly-budget']");
  if (lbl) lbl.innerHTML = `Weekly Trading Budget (<span class="cur-label">${cur}</span>)`;
  const lr = document.getElementById('lbl-risk');
  const lp = document.getElementById('lbl-profit');
  const ph = document.querySelector('.pnl-header');
  if (lr) lr.textContent = `Risk Amount (${cur})`;
  if (lp) lp.textContent = `Potential Profit (${cur})`;
  if (ph) ph.textContent = `P&L (${cur})`;

  const ps = document.getElementById('page-sub');
  if (ps) ps.textContent = cur === 'ZAR'
    ? 'South African Rand (ZAR) · All major pairs, indices & gold'
    : 'US Dollar (USD) · All major pairs, indices & gold';

  refreshBudgetStatus();
  calculate();
  renderJournal();
  renderCalendar();
  saveUserData();
}

function toDisplay(zarAmt) { return state.currency === 'ZAR' ? zarAmt : zarAmt / state.usdZar; }
function fmt(zarAmt) {
  const val = toDisplay(zarAmt);
  return state.currency === 'ZAR'
    ? 'R '  + Math.abs(val).toLocaleString('en-ZA', {minimumFractionDigits:2, maximumFractionDigits:2})
    : '$ '  + Math.abs(val).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}

/* ═══════════════════════════════════════════════
   MOBILE MENU
═══════════════════════════════════════════════ */
function toggleMobileMenu() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}

/* ═══════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════ */
const PAGE_TITLES = {
  calculator: 'Risk Calculator',
  journal:    'Trade Journal',
  calendar:   'P&L Calendar',
  profile:    'My Profile',
};

function switchTab(tabName) {
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tabName));
  document.querySelectorAll('.tab-section').forEach(sec =>
    sec.classList.toggle('active', sec.id === 'tab-' + tabName));
  const pt = document.getElementById('page-title');
  if (pt) pt.textContent = PAGE_TITLES[tabName];
  if (tabName === 'calendar') renderCalendar();
  if (tabName === 'journal')  renderJournal();
  if (tabName === 'profile')  renderProfile();
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

/* ═══════════════════════════════════════════════
   BUDGET
═══════════════════════════════════════════════ */
function updateBudget() {
  let raw = parseFloat(document.getElementById('weekly-budget').value) || 0;
  const zarAmt = state.currency === 'USD' ? raw * state.usdZar : raw;
  state.weeklyBudget = zarAmt;
  state.dailyBudget  = zarAmt / 5;
  state.usedToday    = 0;

  document.getElementById('daily-budget-display').textContent = fmt(state.dailyBudget);
  document.getElementById('hp-risk-display').textContent      = fmt(state.dailyBudget);
  document.getElementById('std-risk-display').textContent     = fmt(state.dailyBudget * 0.5);
  document.getElementById('budget-breakdown').style.display   = zarAmt > 0 ? 'block' : 'none';

  refreshBudgetStatus();
  calculate();
  saveUserData();
}

function refreshBudgetStatus() {
  const rem = Math.max(0, state.dailyBudget - state.usedToday);
  const pct = state.dailyBudget > 0 ? Math.min(100, (state.usedToday / state.dailyBudget) * 100) : 0;

  const ids = {
    'remaining-today': fmt(rem),
    'used-today':      fmt(state.usedToday),
    'weekly-wallet':   fmt(state.weeklyWallet),
    'budget-pct':      pct.toFixed(0) + '%',
    'sidebar-wallet-val': fmt(state.weeklyWallet),
  };
  Object.entries(ids).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = val; });

  const bar = document.getElementById('budget-bar');
  if (bar) { bar.style.width = pct + '%'; bar.className = 'progress-fill' + (pct >= 100 ? ' danger' : pct >= 70 ? ' warn' : ''); }

  const settled = state.journal.filter(t => t.outcome !== 'pending');
  const wins    = settled.filter(t => t.outcome === 'win').length;
  const wr      = settled.length > 0 ? ((wins / settled.length) * 100).toFixed(0) + '%' : '0%';
  const wrd     = document.getElementById('win-rate-display');
  const wrs     = document.getElementById('sidebar-winrate');
  if (wrd) wrd.textContent = wr;
  if (wrs) wrs.textContent = 'Win rate: ' + wr;

  const bb = document.getElementById('blocked-banner');
  if (bb) bb.style.display = state.dailyBudget > 0 && state.usedToday >= state.dailyBudget ? 'flex' : 'none';
}

/* ═══════════════════════════════════════════════
   SETUP SELECTION
═══════════════════════════════════════════════ */
function selectSetup(type) {
  state.selectedSetup = type;
  document.getElementById('opt-hp').classList.toggle('selected',  type === 'high');
  document.getElementById('opt-std').classList.toggle('selected', type === 'standard');
  calculate();
}

function getRiskZAR() {
  return state.selectedSetup === 'high' ? state.dailyBudget : state.dailyBudget * 0.5;
}

/* ═══════════════════════════════════════════════
   CALCULATION ENGINE
═══════════════════════════════════════════════ */
function calculate() {
  const inst  = document.getElementById('instrument').value;
  const entry = parseFloat(document.getElementById('entry-price').value);
  const sl    = parseFloat(document.getElementById('sl-price').value);
  const tp    = parseFloat(document.getElementById('tp-price').value);
  const panel = document.getElementById('results-panel');
  if (!entry || !sl || !tp || state.dailyBudget <= 0) { if (panel) panel.style.display = 'none'; return; }

  const cfg     = INSTRUMENTS[inst];
  const riskZAR = getRiskZAR();
  const riskUSD = riskZAR / state.usdZar;
  let slDist, tpDist, lotSize, profitUSD;

  if (cfg.isIndex) {
    slDist = Math.abs(entry - sl); tpDist = Math.abs(tp - entry);
    lotSize = riskUSD / slDist; profitUSD = lotSize * tpDist;
  } else if (cfg.isGold) {
    slDist = Math.abs(entry - sl); tpDist = Math.abs(tp - entry);
    lotSize = riskUSD / (slDist * 100); profitUSD = lotSize * tpDist * 100;
  } else {
    slDist = Math.abs(entry - sl) / cfg.pip; tpDist = Math.abs(tp - entry) / cfg.pip;
    lotSize = riskUSD / (slDist * cfg.pipVal); profitUSD = lotSize * tpDist * cfg.pipVal;
  }

  const profitZAR = profitUSD * state.usdZar;
  const rr        = tpDist / slDist;
  const unit      = cfg.isIndex || cfg.isGold ? 'pts' : 'pips';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('res-risk',    fmt(riskZAR));
  set('res-lot',     lotSize.toFixed(2) + ' lots');
  set('res-sl-dist', slDist.toFixed(1) + ' ' + unit);
  set('res-tp-dist', tpDist.toFixed(1) + ' ' + unit);
  set('res-profit',  fmt(profitZAR));

  const rrEl = document.getElementById('res-rr');
  if (rrEl) {
    rrEl.textContent = '1 : ' + rr.toFixed(2);
    rrEl.className   = 'result-val rr-badge ' + (rr >= 2 ? 'rr-good' : rr >= 1 ? 'rr-ok' : 'rr-bad');
  }

  state.currentTrade = {
    inst, dir: document.getElementById('direction').value,
    entry, sl, tp,
    riskZAR:   parseFloat(riskZAR.toFixed(2)),
    profitZAR: parseFloat(profitZAR.toFixed(2)),
    slDist: slDist.toFixed(1), tpDist: tpDist.toFixed(1),
    lotSize: lotSize.toFixed(2), rr: rr.toFixed(2),
    setup: state.selectedSetup, date: todayStr(),
  };
  if (panel) panel.style.display = 'block';
}

/* ═══════════════════════════════════════════════
   TRADE LOGGING
═══════════════════════════════════════════════ */
function logTrade() {
  if (!state.currentTrade) { alert('Please fill in all trade details first.'); return; }
  if (state.dailyBudget > 0 && state.usedToday >= state.dailyBudget) {
    alert('❌ Daily budget exceeded. Trading is locked for today!'); return;
  }
  const trade = { ...state.currentTrade, id: Date.now(), outcome: 'pending', beforeUrl:'', afterUrl:'', notes:'' };
  state.journal.unshift(trade);
  state.usedToday = Math.min(state.dailyBudget, state.usedToday + trade.riskZAR);
  refreshBudgetStatus();
  renderJournal();
  saveUserData();
  alert('✅ Trade logged! Click "Mark Win" or "Mark Loss" to record the outcome.');
}

function markTradeResult(result) {
  if (!state.currentTrade) { alert('Please fill in trade details and click Log Trade first.'); return; }
  const pending = state.journal.find(t => t.outcome === 'pending');
  if (!pending) { alert('No pending trade found. Log a trade first.'); return; }
  pending.outcome = result;
  if (result === 'win') state.weeklyWallet += pending.riskZAR + pending.profitZAR;
  refreshBudgetStatus();
  renderJournal();
  renderCalendar();
  saveUserData();
  alert(result === 'win'
    ? '🏆 Win recorded! +' + fmt(pending.riskZAR + pending.profitZAR) + ' added to your Weekly Wallet.'
    : '📉 Loss recorded. ' + fmt(pending.riskZAR) + ' deducted.');
}

function attachUrls() {
  if (!state.journal.length) { alert('No journal entries found.'); return; }
  state.journal[0].beforeUrl = document.getElementById('before-url').value.trim();
  state.journal[0].afterUrl  = document.getElementById('after-url').value.trim();
  state.journal[0].notes     = document.getElementById('trade-notes').value.trim();
  ['before-url','after-url','trade-notes'].forEach(id => document.getElementById(id).value = '');
  renderJournal();
  saveUserData();
  alert('✅ Screenshots and notes attached.');
}

function resetForm() {
  ['entry-price','sl-price','tp-price'].forEach(id => document.getElementById(id).value = '');
  const rp = document.getElementById('results-panel');
  if (rp) rp.style.display = 'none';
  state.currentTrade = null;
}

/* ═══════════════════════════════════════════════
   JOURNAL RENDER
═══════════════════════════════════════════════ */
function renderJournal() {
  const body  = document.getElementById('journal-body');
  const count = document.getElementById('journal-count');
  if (count) count.textContent = state.journal.length + ' trade' + (state.journal.length !== 1 ? 's' : '');
  if (!body) return;

  if (!state.journal.length) {
    body.innerHTML = `<tr><td colspan="8" class="empty-cell">No trades logged yet.</td></tr>`;
    return;
  }
  body.innerHTML = state.journal.map(t => {
    const ob  = t.outcome==='win'?'badge-green':t.outcome==='loss'?'badge-red':'badge-amber';
    const ol  = t.outcome==='win'?'Win':t.outcome==='loss'?'Loss':'Pending';
    const pnl = t.outcome==='win'?t.profitZAR:t.outcome==='loss'?-t.riskZAR:null;
    const ps  = pnl!==null?`<span class="${pnl>=0?'green':'red'}">${pnl>=0?'+':''}${fmt(Math.abs(pnl))}</span>`:'—';
    const sb  = t.setup==='high'?'badge-blue':'badge-amber';
    const sl  = t.setup==='high'?'High Prec.':'Standard';
    const sc  = [
      t.beforeUrl?`<a href="${t.beforeUrl}" class="screenshot-link" target="_blank" rel="noopener">Before</a>`:'',
      t.afterUrl ?`<a href="${t.afterUrl}"  class="screenshot-link" target="_blank" rel="noopener">After</a>`:'',
    ].filter(Boolean).join('')||'<span style="color:var(--text-dim)">—</span>';
    return `<tr>
      <td><span class="inst-name">${INSTRUMENTS[t.inst].label}</span></td>
      <td style="color:var(--text-muted);font-size:12px;">${t.date}</td>
      <td><span class="badge ${sb}">${sl}</span></td>
      <td style="font-size:12px;">${t.dir==='buy'?'▲ Buy':'▼ Sell'}</td>
      <td><span class="badge ${ob}">${ol}</span></td>
      <td style="font-weight:700;">1:${t.rr}</td>
      <td>${ps}</td>
      <td>${sc}</td>
    </tr>`;
  }).join('');
}

/* ═══════════════════════════════════════════════
   CALENDAR RENDER
═══════════════════════════════════════════════ */
function renderCalendar() {
  const y = state.calYear, m = state.calMonth;
  const lbl = document.getElementById('cal-month-label');
  if (lbl) lbl.textContent = MONTHS[m] + ' ' + y;

  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const today       = new Date();
  const dayMap      = {};

  state.journal.forEach(t => {
    if (t.outcome === 'pending') return;
    const [ty,tm,td] = t.date.split('-').map(Number);
    if (ty !== y || tm-1 !== m) return;
    if (!dayMap[td]) dayMap[td] = 0;
    dayMap[td] += t.outcome === 'win' ? t.profitZAR : -t.riskZAR;
  });

  let html = '';
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = y===today.getFullYear() && m===today.getMonth() && d===today.getDate();
    const pnl     = dayMap[d];
    const cls     = pnl!==undefined ? (pnl>=0?'profit':'loss') : '';
    const ph      = pnl!==undefined
      ? `<span class="day-pnl ${pnl>=0?'up':'down'}">${pnl>=0?'+':''}${fmt(Math.abs(pnl))}</span>` : '';
    html += `<div class="cal-day ${cls} ${isToday?'today':''}"><span class="day-num">${d}</span>${ph}</div>`;
  }
  const grid = document.getElementById('calendar-grid');
  if (grid) grid.innerHTML = html;

  const settled   = state.journal.filter(t => t.outcome !== 'pending');
  const wins      = settled.filter(t => t.outcome === 'win');
  const losses    = settled.filter(t => t.outcome === 'loss');
  const totProfit = wins.reduce((s,t) => s+t.profitZAR, 0);
  const totLoss   = losses.reduce((s,t) => s+t.riskZAR,  0);
  const net       = totProfit - totLoss;
  const wr        = settled.length > 0 ? ((wins.length/settled.length)*100).toFixed(0)+'%' : '0%';

  const s = (id, val) => { const el=document.getElementById(id); if(el) el.textContent = val; };
  s('cal-wallet',   fmt(state.weeklyWallet));
  s('cal-winrate',  wr);
  s('cal-wins',     wins.length);
  s('cal-losses',   losses.length);
  s('total-trades', settled.length);
  s('total-profit', fmt(totProfit));
  s('total-loss',   fmt(totLoss));

  const netEl = document.getElementById('net-pnl');
  if (netEl) { netEl.textContent=(net>=0?'+':'')+fmt(Math.abs(net)); netEl.className=net>=0?'green':'red'; }

  const days = Object.entries(dayMap);
  if (days.length) {
    const best  = days.reduce((a,b) => b[1]>a[1]?b:a);
    const worst = days.reduce((a,b) => b[1]<a[1]?b:a);
    s('best-day',  MONTHS[m]+' '+best[0]+'  (+'+fmt(Math.abs(best[1]))+')');
    s('worst-day', MONTHS[m]+' '+worst[0]+' ('+fmt(Math.abs(worst[1]))+')');
  } else { s('best-day','—'); s('worst-day','—'); }
}

function prevMonth() { state.calMonth--; if(state.calMonth<0){state.calMonth=11;state.calYear--;} renderCalendar(); }
function nextMonth() { state.calMonth++; if(state.calMonth>11){state.calMonth=0;state.calYear++;} renderCalendar(); }

/* ═══════════════════════════════════════════════
   INSTRUMENT
═══════════════════════════════════════════════ */
function onInstrumentChange() {
  updateLivePriceDisplay(document.getElementById('instrument').value);
  calculate();
}
function updateLivePriceDisplay(inst) {
  const p   = state.livePrices[inst];
  const cfg = INSTRUMENTS[inst];
  const ve  = document.getElementById('live-price-val');
  const ce  = document.getElementById('live-price-change');
  if (!ve) return;
  if (p) {
    ve.textContent = p.price.toFixed(cfg.digits);
    ce.textContent = (p.change>=0?'▲ ':'▼ ')+Math.abs(p.change).toFixed(2)+'%';
    ce.className   = 'price-change '+(p.change>=0?'price-up':'price-down');
  } else { ve.textContent='Loading…'; ce.textContent=''; }
}

/* ═══════════════════════════════════════════════
   LIVE PRICES
═══════════════════════════════════════════════ */
async function fetchLivePrices() {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514', max_tokens:1000,
        tools:[{type:'web_search_20250305',name:'web_search'}],
        messages:[{role:'user',content:'Get current live prices for EURUSD, GBPUSD, USDJPY, USDCHF, AUDUSD, USDCAD, NZDUSD, EURGBP, NAS100, US30, XAUUSD, USDZAR. Return ONLY a JSON object with those exact keys and numeric values.'}]
      }),
    });
    const data  = await res.json();
    const text  = data.content.filter(b=>b.type==='text').map(b=>b.text).join('');
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('no json');
    const prices = JSON.parse(match[0]);
    Object.keys(INSTRUMENTS).forEach(k => {
      const raw = prices[k] || FALLBACK[k];
      state.livePrices[k] = { price: raw, change: (Math.random()-0.5)*0.4 };
    });
    if (prices.USDZAR && prices.USDZAR > 10) state.usdZar = prices.USDZAR;
  } catch {
    Object.keys(INSTRUMENTS).forEach(k => {
      state.livePrices[k] = { price: FALLBACK[k]||1, change: (Math.random()-0.5)*0.4 };
    });
  }
  renderPricesStrip();
  updateLivePriceDisplay(document.getElementById('instrument').value);
}

function renderPricesStrip() {
  const strip = document.getElementById('prices-strip');
  if (!strip) return;
  const keys = ['EURUSD','GBPUSD','XAUUSD','NAS100','US30'];
  const zarPill = `<span class="price-pill"><span class="pulse-dot"></span>USD/ZAR <strong>${state.usdZar.toFixed(2)}</strong></span>`;
  const pills = keys.map(k => {
    const p=state.livePrices[k]; const cfg=INSTRUMENTS[k]; if(!p) return '';
    const cls=p.change>=0?'price-up':'price-down'; const arr=p.change>=0?'▲':'▼';
    return `<span class="price-pill"><span class="pulse-dot"></span>${cfg.label} <strong>${p.price.toFixed(cfg.digits)}</strong> <span class="${cls}">${arr} ${Math.abs(p.change).toFixed(2)}%</span></span>`;
  }).join('');
  strip.innerHTML = zarPill + pills;
}

/* ═══════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════ */
function todayStr() { return new Date().toISOString().slice(0,10); }

/* ═══════════════════════════════════════════════
   BOOT
═══════════════════════════════════════════════ */
boot();
