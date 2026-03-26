# QuickPay

React (Vite) + Express + MongoDB + bKash tokenized checkout. The web app uses JWT auth from the API and completes payments via bKash redirect and server-side execute.

## Run locally

1. **MongoDB** — either install locally or start Docker:

   ```bash
   docker compose up -d
   ```

2. **Backend env** — copy `backend/.env.example` to `backend/.env` and set at least:

   - `MONGODB_URI` (e.g. `mongodb://127.0.0.1:27017/ash_quick_pay`)
   - `JWT_SECRET` (long random string)
   - `ADMIN_API_KEY` (any secret for admin routes)

   For **local payment flow without real bKash**, set:

   ```env
   BKASH_USE_MOCK=true
   ```

   With mock mode, “Pay with bKash” sends you straight to `/pay/callback` with a test `paymentID` so execute + receipt work offline.

   For **real sandbox**, set `BKASH_USE_MOCK=false`, fill bKash keys from the developer portal, and keep `BKASH_SANDBOX=true`.

3. **Frontend env** — copy `.env.example` to `.env`. For local dev, leave `VITE_API_URL` empty so `/api` is proxied to Express (port 4000).

4. **Install and run**

   ```bash
   npm run setup
   npm run docker:up
   npm run dev:all
   ```

   - App: [http://localhost:8080](http://localhost:8080)
   - API: [http://localhost:4000](http://localhost:4000) (`GET /health`)

5. **Try it** — sign up, open **Make a Payment**, enter an amount, complete the redirect (mock or bKash), then confirm on `/pay/callback` and check the dashboard.

## Scripts

| Script        | Description                                      |
| ------------- | ------------------------------------------------ |
| `npm run setup` | Install root + `backend` dependencies          |
| `npm run dev`   | Vite only                                     |
| `npm run dev:backend` | Express only                            |
| `npm run dev:all`     | Vite + API together                     |
| `npm run build` | Production build of the frontend                 |
| `npm test`      | Vitest                                           |
