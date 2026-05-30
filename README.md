# WatchDiff — Website Change Monitor SaaS

Monitor any webpage for changes. Get instant email alerts with exact diffs.

## Tech Stack
- **Backend**: Node.js + Express
- **Database**: Supabase (free tier)
- **Hosting**: Vercel (free tier)
- **Payments**: Paddle (no Stripe needed)
- **Email**: Gmail SMTP

---

## Setup Guide

### Step 1 — Supabase (Database)
1. Go to supabase.com → create free account
2. Create new project
3. Go to SQL Editor → paste contents of `schema.sql` → Run
4. Go to Settings → API → copy:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_KEY`

### Step 2 — Gmail App Password (for email alerts)
1. Go to myaccount.google.com → Security → 2-Step Verification → App passwords
2. Create app password for "Mail"
3. Copy the 16-char password → `EMAIL_PASS`

### Step 3 — Environment Variables
Copy `.env.example` to `.env` and fill in all values:
```
cp .env.example .env
```

### Step 4 — Run locally
```bash
npm install
node server.js
```
Open http://localhost:3000

### Step 5 — Deploy to Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```
Then add all env variables in Vercel dashboard → Settings → Environment Variables

---

## Monetization
Connect Paddle (paddle.com):
1. Create Paddle account
2. Create products for Pro ($29/mo) and Enterprise ($99/mo)
3. Add Paddle payment links to the pricing page

---

## File Structure
```
policy-tracker/
├── server.js          # Main Express server + cron job
├── schema.sql         # Run once in Supabase SQL editor
├── vercel.json        # Vercel deployment config
├── .env.example       # Copy to .env and fill in
├── lib/
│   ├── supabase.js    # Database client
│   ├── crawler.js     # URL fetching + diff engine
│   ├── email.js       # Email alert sender
│   ├── auth.js        # JWT middleware
│   └── plans.js       # Plan limits
├── routes/
│   ├── auth.js        # Register, login, logout
│   └── monitors.js    # CRUD + check + history
└── public/
    ├── index.html     # Landing page
    ├── login.html     # Login page
    ├── register.html  # Register page
    └── dashboard.html # Main app dashboard
```
