# baby_birth_guessr

A small Rust/Axum backend for running a baby birth guessing game:

- Hosts create an event for an upcoming birth.
- Invitees can submit guesses for birth date and baby weight.
- The app stores data in PostgreSQL using Diesel ORM.

This README explains how to get the project running after cloning the repo.

---

## Prerequisites

- **Rust** (via [rustup](https://rustup.rs/))
- **PostgreSQL** 13+ with command-line tools `psql` and `createdb`
- **Diesel CLI** with Postgres support (optional but recommended for managing migrations)
- A shell environment that can run `bash` scripts if you want to use `run.sh` (e.g. WSL, Git Bash, or a Unix-like shell)

---

## 1. Clone the repository

```bash
git clone <YOUR_FORK_OR_ORIGIN_URL>
cd baby_birth_guessr
```

---

## 2. Configure the database

Set a `DATABASE_URL` for your Postgres instance. A common pattern is:

```bash
export DATABASE_URL=postgres://<user>:<password>@localhost:5432/baby_birth_guessr
```

If you **do not** set `DATABASE_URL`, the `run.sh` script will fall back to:

```text
postgres://postgres:postgres@localhost:5432/baby_birth_guessr
```

Make sure that user/password/host/port correspond to a real Postgres installation.

### Diesel CLI (optional but recommended)

Install Diesel CLI with Postgres support (requires Postgres client libraries):

```bash
cargo install diesel_cli --no-default-features --features postgres
```

If this fails with a `libpq` error, ensure your Postgres development libraries are installed and visible on your system, then re-run the command.

Once the CLI is installed, you can run:

```bash
diesel setup
```

This will create a `diesel.toml` and an initial `migrations/` folder (if not already present), and connect to the database specified by `DATABASE_URL`.

---

## 3. Running the application

### Using the helper script (recommended)

The project includes a small helper script `run.sh` that:

- Ensures a database exists for the configured `DATABASE_URL` (creates it if necessary).
- Prints a placeholder for running migrations (you can later plug in your `diesel migration run` command here).
- Starts the Axum server with `cargo run`.

From the project root:

```bash
chmod +x run.sh   # only needed once
./run.sh
```

### Running manually

You can also manage the DB yourself and just run the server directly:

1. Ensure the database from `DATABASE_URL` exists.
2. Run migrations (e.g. `diesel migration run`).
3. Start the server:

```bash
cargo run
```

The server will listen by default on:

- `http://127.0.0.1:3000/` – basic root endpoint.
- `http://127.0.0.1:3000/health` – simple health check endpoint.

---

## 4. Development notes

- The backend uses **Axum** and **Tokio** for async HTTP handling.
- **Diesel** is used for talking to PostgreSQL (models, queries, migrations).
- Logging is done with `tracing` / `tracing-subscriber`.

As the project evolves, this README should be updated with:

- Details of the API endpoints (event creation, guesses, etc.).
- Database schema details (events, invitees, guesses tables).
- Any additional setup required for the frontend or deployment.
