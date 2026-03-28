# Deploy the API on Render

The **frontend** (Vercel) only serves the React app. The **backend** (Express + MongoDB) should run on Render (or similar). This guide uses [Render](https://render.com).

## 1. MongoDB (choose one)

### Option A — MongoDB Atlas (free tier, recommended)

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → create a cluster (free M0).
2. **Database Access** → create a database user (username + password).
3. **Network Access** → **Add IP Address** → **Allow access from anywhere** `0.0.0.0/0` (needed for Render’s servers).
4. **Connect** → **Drivers** → copy the connection string, e.g.  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ash_quick_pay?retryWrites=true&w=majority`  
   Replace `USER`, `PASSWORD`, and set a database name (e.g. `ash_quick_pay`).

### Option B — Render MongoDB

Render also offers MongoDB as a paid add-on; create it from the Render dashboard and copy the **Internal** or **External** connection string Render gives you.

---

## 2. Create the Web Service on Render

1. Sign in at [dashboard.render.com](https://dashboard.render.com).
2. **New +** → **Web Service**.
3. Connect your **GitHub** repo (same repo as the Aurthayon project).
4. Configure:

| Setting | Value |
|--------|--------|
| **Name** | e.g. `aurthayon-api` |
| **Region** | Choose closest to your users |
| **Branch** | `main` (or your default branch) |
| **Root Directory** | Path to the folder that contains **`package.json`** and **`server.js`** — **no** `cd` and **no** spaces. Examples: `backend` if the repo root has a `backend` folder; or `ash-quick-pay-main/ash-quick-pay-main/backend` if your GitHub tree is nested. **Wrong:** `cd backend` (Render will look for a folder literally named `cd backend` and fail). |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance type** | Free is OK to start |

5. **Advanced** → **Health Check Path**: `/health`

> If Render says it can’t find `package.json`, your **Root Directory** is wrong. It must be the `backend` folder inside the project (the one with `server.js`).

---

## 3. Environment variables (Render → Web Service → **Environment**)

Add these (click **Add Environment Variable** for each):

| Key | Value | Notes |
|-----|--------|--------|
| `NODE_ENV` | `production` | |
| `MONGODB_URI` | Your Atlas or Render Mongo connection string | Keep secret |
| `JWT_SECRET` | Long random string (32+ chars) | Generate once, keep secret |
| `ADMIN_API_KEY` | Long random string | For admin routes |
| `CORS_ORIGIN` | `https://bkash-project.vercel.app` | **Your real Vercel URL**, no trailing slash. Comma-separate if you have preview URLs too. |
| `BKASH_CALLBACK_BASE_URL` | `https://bkash-project.vercel.app` | Same as public frontend (bKash returns users here). |

### bKash (pick one path)

**Easiest for testing (no real bKash yet):**

| Key | Value |
|-----|--------|
| `BKASH_USE_MOCK` | `true` (or `1` or `yes`) |

With mock mode you do **not** need `BKASH_APP_KEY`, etc. If this variable is **missing** or **false**, the server requires all bKash keys and will crash with `Missing required environment variable: BKASH_APP_KEY`.

**Real bKash sandbox later:**

| Key | Value |
|-----|--------|
| `BKASH_USE_MOCK` | `false` |
| `BKASH_SANDBOX` | `true` |
| `BKASH_APP_KEY` | from bKash |
| `BKASH_APP_SECRET` | from bKash |
| `BKASH_USERNAME` | from bKash |
| `BKASH_PASSWORD` | from bKash |

> On Render, `NODE_ENV` is `production`. If `BKASH_USE_MOCK` is false and `BKASH_SANDBOX` is not `true`, the app expects `BKASH_BASE_URL` for live production bKash — set that only when you leave sandbox.

**Do not set `PORT` yourself** — Render injects `PORT`; the app already uses it.

---

## 4. Deploy

1. Click **Create Web Service** (or **Save** if editing).
2. Wait for the first deploy (build + start logs).
3. Open your service URL + `/health`, e.g.  
   `https://aurthayon-api.onrender.com/health`  
   You should see: `{"ok":true}`.

Copy the **base URL** (no path), e.g. `https://aurthayon-api.onrender.com`.

---

## 5. Point Vercel at this API

1. Vercel → your project → **Settings** → **Environment Variables**.
2. Add **`VITE_API_URL`** = `https://aurthayon-api.onrender.com` (your Render URL, **no** trailing slash).
3. **Redeploy** the frontend (Environment variables for `VITE_*` apply at **build** time).

---

## 6. Free tier note

Render free web services **spin down after idle**. The first request after sleep can take **~30–60 seconds**. That’s normal; upgrade if you need always-on.

---

## Quick checklist

- [ ] MongoDB reachable from the internet (Atlas `0.0.0.0/0` or Render internal URL).
- [ ] Render **Root Directory** = folder containing backend `package.json`.
- [ ] `CORS_ORIGIN` = exact Vercel URL(s).
- [ ] `BKASH_CALLBACK_BASE_URL` = same public site users use for `/pay/callback`.
- [ ] `VITE_API_URL` on Vercel = Render service URL, then **redeploy** Vercel.
