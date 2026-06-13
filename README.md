# RiskPilot v3 — Master Your Risk

> Full-stack trading risk management system with user accounts, persistent data, and a live admin dashboard.  
> Built for South African traders | ZAR & USD | Supabase backend

---

## What's New in v3

- ✅ Sign Up & Login pages (email + password)
- ✅ Forgot Password (email reset link)
- ✅ All trade data saved to the cloud — never lost on refresh
- ✅ Profile page (name, surname, email, marketing opt-in status)
- ✅ Reset All Data button
- ✅ ZAR / USD currency toggle
- ✅ Full mobile responsive layout

---

## File Structure

```
riskpilot-v3/
├── auth.html          ← Login / Sign Up / Forgot Password page
├── index.html         ← Main trading dashboard
├── style.css          ← All styles (dark gold theme)
├── app.js             ← All trading logic + Supabase data sync
├── supabase-config.js ← ⚠️ YOUR Supabase URL & Key go here
└── README.md          ← This file
```

---

## Part 1 — Setting Up Supabase (Free Database)

Supabase is a free, open-source Firebase alternative. It gives you:
- A **PostgreSQL database** to store all trade data
- **Built-in authentication** (signup, login, forgot password)
- A **web dashboard** to see all users, their data, and marketing opt-ins
- **No server to manage** — it's all in the cloud

---

### Step 1 — Create a Free Supabase Account

1. Go to **[supabase.com](https://supabase.com)**
2. Click **Start your project**
3. Sign up with your GitHub account (recommended) or email
4. You're now in the Supabase dashboard

---

### Step 2 — Create a New Project

1. Click **New Project**
2. Fill in:
   - **Name:** `riskpilot` (or anything you like)
   - **Database Password:** choose a strong password and **save it somewhere safe**
   - **Region:** choose `South Africa (Cape Town)` for fastest speed
3. Click **Create new project**
4. Wait about 1–2 minutes for the project to spin up

---

### Step 3 — Create the Database Table

This table stores each user's trading data.

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Paste the following SQL and click **Run**:

```sql
-- Create the main data table
CREATE TABLE riskpilot_data (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  weekly_budget  NUMERIC DEFAULT 0,
  daily_budget   NUMERIC DEFAULT 0,
  used_today     NUMERIC DEFAULT 0,
  weekly_wallet  NUMERIC DEFAULT 0,
  currency       TEXT DEFAULT 'ZAR',
  journal        TEXT DEFAULT '[]',
  last_saved     TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (users can only see their own data)
ALTER TABLE riskpilot_data ENABLE ROW LEVEL SECURITY;

-- Policy: users can only read their own row
CREATE POLICY "Users read own data"
  ON riskpilot_data FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users can insert their own row
CREATE POLICY "Users insert own data"
  ON riskpilot_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can update their own row
CREATE POLICY "Users update own data"
  ON riskpilot_data FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: users can delete their own row
CREATE POLICY "Users delete own data"
  ON riskpilot_data FOR DELETE
  USING (auth.uid() = user_id);
```

4. You should see **"Success. No rows returned"** — that means it worked ✅

---

### Step 4 — Get Your API Keys

1. In the left sidebar, click **Project Settings** (gear icon at the bottom)
2. Click **API**
3. You will see two important values:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`
4. Copy both values — you'll need them in the next step

---

### Step 5 — Add Your Keys to RiskPilot

1. Open the file `supabase-config.js` in any text editor (Notepad, VS Code, etc.)
2. Replace the placeholder values:

```javascript
// BEFORE (placeholder):
const SUPABASE_URL  = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY_HERE';

// AFTER (your real values):
const SUPABASE_URL  = 'https://abcdefghijkl.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

3. Save the file

> ⚠️ The **anon key** is safe to put in frontend code — it's designed for this.  
> Never put your **service_role** key in frontend code.

---

### Step 6 — Enable Email Confirmations (Optional but Recommended)

By default, Supabase requires users to confirm their email before logging in.

To keep it simple during testing, you can turn this off:

1. Go to **Authentication** → **Providers** → **Email**
2. Toggle **"Confirm email"** to OFF
3. Click **Save**

Turn it back ON when you're ready to go live.

---

### Step 7 — Configure the Password Reset Redirect URL

1. Go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, click **Add URL**
3. Add your site URL, for example:
   - Local testing: `http://localhost:5500` or `http://127.0.0.1:5500`
   - GitHub Pages: `https://yourusername.github.io/riskpilot`
4. Click **Save**

---

## Part 2 — Running RiskPilot Locally

### Option A — Open directly (simplest)
Double-click `auth.html` to open in your browser.

> ⚠️ Some browsers block Supabase API calls when opening files directly (`file://`).  
> If login doesn't work, use Option B below.

### Option B — Use VS Code Live Server (recommended for local testing)

1. Install **[Visual Studio Code](https://code.visualstudio.com/)** (free)
2. Open VS Code → **Extensions** (Ctrl+Shift+X) → search **"Live Server"** → Install
3. Open your `riskpilot-v3` folder in VS Code
4. Right-click `auth.html` → **"Open with Live Server"**
5. Your browser opens at `http://127.0.0.1:5500/auth.html`

---

## Part 3 — Deploying to GitHub Pages

Follow these steps to put RiskPilot live on the internet for free.

### Step 1 — Create a GitHub repository
1. Go to [github.com](https://github.com) → sign in
2. Click **+** → **New repository**
3. Name it `riskpilot`, set to **Public**, check **Add README**
4. Click **Create repository**

### Step 2 — Upload all 5 files
1. Click **Add file** → **Upload files**
2. Drag all 5 files: `auth.html`, `index.html`, `style.css`, `app.js`, `supabase-config.js`
3. Commit changes

### Step 3 — Enable GitHub Pages
1. **Settings** → **Pages**
2. Source: **Deploy from a branch** → Branch: **main** → `/(root)`
3. Click **Save**

### Step 4 — Update Supabase Redirect URL
1. Go back to Supabase → **Authentication** → **URL Configuration**
2. Add your GitHub Pages URL: `https://yourusername.github.io`
3. Save

Your site is live at: `https://yourusername.github.io/riskpilot`

---

## Part 4 — Viewing Your Users & Data in Supabase

This is the "admin panel" for RiskPilot — no extra software needed.

### See all registered users
1. Go to your Supabase dashboard
2. Click **Authentication** → **Users**
3. You'll see every user's email, sign-up date, last sign-in, and email confirmation status

### See who opted into marketing emails
1. Click **Authentication** → **Users**
2. Click on any user's row to open their profile
3. Scroll down to **Raw User Meta Data** — you'll see:
```json
{
  "name": "John",
  "surname": "Doe",
  "marketing_emails": true
}
```

### See all trade data
1. Click **Table Editor** in the left sidebar
2. Click the **riskpilot_data** table
3. You'll see one row per user with their budget, wallet, and journal (stored as JSON)

### Run custom queries
Use the **SQL Editor** to run queries like:

```sql
-- See all users who opted into marketing emails
SELECT 
  u.email,
  u.raw_user_meta_data->>'name' AS first_name,
  u.raw_user_meta_data->>'surname' AS last_name,
  u.raw_user_meta_data->>'marketing_emails' AS marketing_opt_in,
  u.created_at
FROM auth.users u
WHERE u.raw_user_meta_data->>'marketing_emails' = 'true';
```

```sql
-- See all users and their weekly wallet balance
SELECT 
  u.email,
  u.raw_user_meta_data->>'name' AS name,
  d.weekly_wallet,
  d.currency,
  d.last_saved
FROM auth.users u
JOIN riskpilot_data d ON u.id = d.user_id
ORDER BY d.weekly_wallet DESC;
```

---

## How to Use RiskPilot v3

### First time
1. Open `auth.html` (or your live URL)
2. Click **Create Account** and fill in your details
3. If email confirmation is ON, check your inbox and click the confirmation link
4. Sign in → you're taken straight to the dashboard

### Returning user
1. Open the URL → you're taken to the sign-in page automatically
2. Enter your email and password → dashboard loads with all your saved data

### Forgot password
1. On the sign-in page, click **Forgot password?**
2. Enter your email → click **Send Reset Link**
3. Check your inbox → click the link → you'll be redirected to the dashboard where you can set a new password

### Profile page
- Click **My Profile** in the sidebar
- See your name, surname, email, and marketing opt-in status
- View your account stats (total trades, win rate, best R:R)
- Use **Reset All Data** to wipe everything and start fresh

---

## Security Notes

- All passwords are hashed by Supabase — never stored in plain text
- Row Level Security ensures users can only see their own data
- The anon key is safe to expose in frontend code — it has no admin privileges
- Password resets are handled entirely by Supabase via secure email links

---

## Disclaimer

RiskPilot is a risk planning and journaling tool. It does not constitute financial advice. Trading forex, indices, and commodities carries significant risk. Always trade responsibly.

---

*RiskPilot v3 — Master Your Risk*
