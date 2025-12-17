# Baby Birth Guessr 👶

A real-time baby birth guessing game! Hosts create an event, and friends can guess the birth date and weight. Updates appear instantly for everyone connected.

## Screenshot

The screenshot in this repo may be out of date. If you want to refresh it, replace `image.png` with a current capture.

## Features

*   **Create & join events:** Create an event, share the invite key, and have friends join and submit a guess.
*   **Guess window:** Optionally set a separate guess close date (otherwise due date is used as the cutoff).
*   **Real-time updates:** Live updates via Server-Sent Events (SSE).
*   **Charts:** Scatter plot of guesses (Date vs. Weight), including handling for overlapping points.
*   **Admin controls (secret key):**
    *   Claim admin access with a 3-word secret key.
    *   Edit event description.
    *   Toggle whether guesses can be edited.
    *   Delete guesses.
    *   End the event by setting the correct answer.
    *   Delete the entire event.
*   **Share links:** `/share/{key}` provides a link-friendly preview/redirect to `/event?key=...`.
*   **Localization:** English + Finnish.
*   **Theme:** Light/Dark mode.
*   **Privacy & Terms pages:** Built-in `/privacy` and `/terms` routes (linked in the footer).
*   **Cookie banner:** Informs users about essential cookies and Terms acceptance.
*   **Data retention:** Events and associated guesses are automatically deleted after 1 year.
*   **Modern Stack:**
    *   **Backend:** Rust (Axum), Diesel (Postgres), Tokio (SSE/Broadcast).
    *   **Frontend:** React 19 (Vite), TypeScript, MUI, Recharts.

## Prerequisites

*   **Rust** (stable)
*   **Node.js** (v18+)
*   **PostgreSQL**

## Getting Started

### 1. Database Setup

Ensure PostgreSQL is running and set your `DATABASE_URL` in a `.env` file or environment:

```bash
cp .env.example .env
# Edit .env with your postgres credentials
```

Migrations are embedded and run automatically on startup.

### 2. Backend

The backend serves the API and facilitates real-time updates.

```bash
cargo run
```

Server listens on `http://127.0.0.1:3000`.

### 3. Frontend

The frontend is a React SPA located in `frontend/`.

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

> **Note:** The Vite dev server proxies `/api` requests to the Rust backend at port 3000.

## Configuration

### Environment variables

See `.env.example` for the full list.

- **`DATABASE_URL`** (required)
  - PostgreSQL connection string.
- **`HOST`** (optional)
  - Bind address for the backend (default: `0.0.0.0`).
- **`PORT`** (optional)
  - Port for the backend (default: `3000`).
- **`TURNSTILE_SECRET_KEY`** (required for creating events)
  - Cloudflare Turnstile server-side secret.
  - Turnstile verification is skipped when `APP_ENV=test`.
- **`VITE_TURNSTILE_SITE_KEY`** (required for the frontend)
  - Cloudflare Turnstile site key.
  - For local dev, you can set this in your shell, or create `frontend/.env` with:
    - `VITE_TURNSTILE_SITE_KEY=...`

## Pages

- **`/privacy`**: Privacy policy.
- **`/terms`**: Terms of service.
- **`/event?key=...`**: Event view.
- **`/share/{key}`**: Share-friendly preview/redirect for an event.

If an event key is invalid (or the event was deleted), the UI shows an "Event not found" screen.

## Admin actions (secret key)

When an event is created, the API returns a **3-word secret key** (e.g. `swift-amber-otter`).

- The UI shows this key once at creation time and saves it locally in the browser.
- Anyone with the secret key can perform admin actions.
- Admin requests use `Authorization: Bearer <secret_key>`.

Local storage keys:

- **`cookie_consent`**: cookie/terms banner dismissal.
- **`event_admin_key_<event_id>`**: saved secret key for that event.

## Data retention

Events (and all associated guesses) are automatically deleted after **1 year**.

- A background cleanup task runs on startup and then once every 24 hours.

## Architecture

### API Endpoints

*   `POST /api/events`: Create a new event.
    *   Returns event data and the `secret_key`.
*   `DELETE /api/events/{id}`: Delete an event.
    *   Header: `Authorization: Bearer <secret_key>`
*   `GET /api/events/by-key/{key}`: Retrieve event details by invite key.
*   `POST /api/events/{id}/guesses`: Submit a new guess.
*   `GET /api/events/{id}/guesses`: List all guesses for an event.
*   `PUT /api/events/{id}/guesses/{invitee_id}`: Update a guess (when enabled).
*   `DELETE /api/events/{id}/guesses/{invitee_id}`: Delete a guess (admin).
*   `POST /api/events/{id}/claim`: Verify secret key (admin).
    *   Header: `Authorization: Bearer <secret_key>`
*   `PUT /api/events/{id}/settings`: Update event settings (admin).
    *   Header: `Authorization: Bearer <secret_key>`
*   `PUT /api/events/{id}/description`: Update event description (admin).
    *   Header: `Authorization: Bearer <secret_key>`
*   `POST /api/events/{id}/answer`: Set the final answer / end the event (admin).
    *   Header: `Authorization: Bearer <secret_key>`
*   `GET /api/events/live?event_key=...`: **SSE** endpoint for real-time updates.

### Real-time Updates

The backend uses a `tokio::sync::broadcast` channel to publish new guesses. When a user submits a guess, it is saved to the DB and then broadcasted to all clients listening on the SSE endpoint for that specific event.

## Podman Deployment (Recommended)

We recommend using **Podman** for deployment, especially on Windows, as it offers better control through the concept of **Pods**.

### Option 1: Native Pods (Best for control)

This method runs the database and application in a single Pod, sharing the network namespace (improving performance and simplifying networking).

1.  Ensure you have **Podman** installed.
2.  Run the provided script:

**Bash (Git Bash/WSL):**
```bash
./podman-deploy.sh
```

This script exposes:

- **HTTP**: `http://localhost:3000`
- **HTTPS** (Caddy `tls internal`): `https://localhost:8443`

**Features included:**
*   **SSL/HTTPS:** Includes a Caddy sidecar on port 443 (Self-signed).
*   **DDNS:** Updates Cloudflare DNS automatically (if configured).

**Production Setup:**
1.  **Router:** Forward External Port **443** -> Internal Port **8443** (Port 443 is privileged, so we use 8443 locally).
2.  **Cloudflare:** Set SSL/TLS mode to **Full** (allows self-signed certs).

## License

MIT
