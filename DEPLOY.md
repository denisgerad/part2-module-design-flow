# Deploying to Vercel — Step by Step

## What's in this folder

```
vercel-deploy/
├── api/
│   └── claude.js        ← Serverless function (replaces Express proxy)
├── public/
│   └── index.html       ← Your Part 2 demo (API endpoint updated)
├── vercel.json          ← Routing config
├── package.json         ← Project metadata
├── .gitignore           ← Keeps secrets out of git
└── DEPLOY.md            ← This file
```

---

## Prerequisites

- GitHub account
- Vercel account (free) — sign up at vercel.com with your GitHub account
- Vercel CLI (optional but faster):  `npm install -g vercel`

---

## Step 1 — Push to GitHub

```bash
# Inside the vercel-deploy folder
git init
git add .
git commit -m "Initial deploy — LLM Agent Architecture Lab Part 2"

# Create a new repo on GitHub (github.com → New repository)
# Name it: llm-agent-architecture-lab
# Then connect and push:

git remote add origin https://github.com/YOUR_USERNAME/llm-agent-architecture-lab.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Import to Vercel

1. Go to **vercel.com** → **Add New Project**
2. Click **Import Git Repository**
3. Select your `llm-agent-architecture-lab` repo
4. Vercel will detect the `vercel.json` automatically
5. **Do not change any build settings** — leave defaults
6. Click **Deploy**

Your first deploy will fail at runtime (not build time) because the
API key isn't set yet. That's expected. Fix it in Step 3.

---

## Step 3 — Add your API key

1. In Vercel dashboard → your project → **Settings** → **Environment Variables**
2. Add:
   - **Name:**  `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-...` (your full Anthropic API key)
   - **Environment:** Production, Preview, Development (tick all three)
3. Click **Save**

**IMPORTANT:** Never put your API key in any file that gets committed to git.
The `.gitignore` already excludes `.env` files for safety.

---

## Step 4 — Update the allowed origin

After your first deploy, Vercel gives you a URL like:
```
https://llm-agent-architecture-lab-abc123.vercel.app
```

Open `api/claude.js` and replace the placeholder:
```javascript
// Change this:
'https://your-project.vercel.app',

// To your actual URL:
'https://llm-agent-architecture-lab-abc123.vercel.app',
```

Commit and push — Vercel redeploys automatically:
```bash
git add api/claude.js
git commit -m "Update allowed origin with deployment URL"
git push
```

---

## Step 5 — Redeploy with the API key

In Vercel dashboard → your project → **Deployments** → click the three dots
on the latest deployment → **Redeploy**. This picks up the environment variable.

Or push any change to trigger an automatic redeploy.

---

## Verify it works

Open your Vercel URL in the browser.

- Navigate to the **Consequences** tab → click **Run Parallel Comparison**
- Navigate to **Agent at Step 4** → click **Run Pipeline**

Both should call `/api/claude` (visible in browser DevTools → Network tab)
and return responses from Mistral via Anthropic.

---

## Local development (after Vercel deploy)

Your HTML still works locally with your Express proxy:
```bash
# Start your existing Express proxy
node server.js

# Open the file directly or via Live Server
# The API auto-detects localhost and uses http://localhost:3000/api/claude
```

The auto-detection in `index.html`:
```javascript
const API = window.location.hostname === 'localhost' || ...
  ? 'http://localhost:3000/api/claude'   // local
  : '/api/claude';                        // Vercel
```

---

## Troubleshooting

**"API key not configured" error in browser:**
→ Check Step 3. Make sure you redeployed after adding the environment variable.

**CORS error in browser console:**
→ Check Step 4. Your deployment URL must be in the ALLOWED_ORIGINS list in `api/claude.js`.

**Function timeout:**
→ Anthropic calls occasionally take 20–30 seconds for long prompts.
  `vercel.json` sets `maxDuration: 60` seconds which covers this.
  Vercel free tier allows up to 60 seconds.

**"This Serverless Function has crashed":**
→ Check Vercel dashboard → your project → **Functions** tab → view logs.
  Most common cause: API key not set or incorrect.

---

## Cost

- **Vercel free tier:** 100GB bandwidth, 100 hours function execution/month
  — more than enough for a demo or internal tool
- **Anthropic API:** charged per token used by the demo runs
  — each full pipeline run is approximately 3,000–6,000 tokens (~$0.01–0.02)
