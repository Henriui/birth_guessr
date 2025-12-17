# Frontend (React)

This is the React SPA for **Baby Birth Guessr**.

## Local development

From `frontend/`:

```bash
npm install
npm run dev
```

Vite runs on `http://localhost:5173` and proxies `/api` to `http://127.0.0.1:3000`.

## Environment

- **`VITE_TURNSTILE_SITE_KEY`** is required for event creation (Cloudflare Turnstile).
  - For local dev, create `frontend/.env`:
    - `VITE_TURNSTILE_SITE_KEY=...`

## Tests

```bash
npm test -- --run
```

## E2E (Playwright)

```bash
npm run e2e
```
