# 5K Training Dashboard

Sub-17:50 5K training plan with live Strava data integration.

## Architecture

```
Strava → GitHub Actions (daily sync) → Google Sheet → This Dashboard
```

## Deploy to Vercel (5 minutes)

### Step 1: Push to GitHub
1. Create a new **private** repo on GitHub (e.g., `training-dashboard`)
2. Upload all files from this folder to the repo
   - Or use git:
   ```bash
   cd training-dashboard
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/training-dashboard.git
   git push -u origin main
   ```

### Step 2: Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account
2. Click "Add New Project"
3. Import your `training-dashboard` repo
4. Vercel auto-detects Vite — leave all settings as default
5. Click "Deploy"
6. In ~60 seconds you'll get a live URL like `training-dashboard-abc123.vercel.app`

### Step 3: Bookmark it
- On mobile: open the URL in Safari/Chrome → "Add to Home Screen"
- It'll behave like a native app — full screen, no browser chrome

## How it works

- **Google Sheet** is published as CSV (read-only, no auth needed)
- Dashboard fetches the CSV on every page load
- Refresh button pulls latest data on demand
- Strava sync runs daily at 6 AM UTC via GitHub Actions
- All data flows: Strava API → GitHub Actions → Google Sheet → Dashboard

## Updating the plan

Edit `src/App.jsx` — the plan data is in the `PHASES` array. Push to GitHub and Vercel auto-deploys.

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`
