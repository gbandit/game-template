# gbandit game template

A starting point for a web game hosted on [gbandit](https://gbandit.com): a
React + Vite + Tailwind frontend and an optional Rust (axum) backend with
player accounts already wired up.

## Get started

```sh
curl -fsSL https://github.com/gbandit/cli/releases/latest/download/install.sh | sh
gbandit login
gbandit scaffold my-game
cd my-game
gbandit deploy
```

The game is now at `https://dev-<slug>.gbandit.com`, and `gbandit promote`
puts it on `https://<slug>.gbandit.com`. The
[docs](https://docs.gbandit.com/getting-started-template) cover turning on the
backend and a database.

## Run it locally

You need [Rust](https://rustup.rs) and [Bun](https://bun.sh).

```sh
cd backend && cargo run
```

```sh
cd frontend && bun install && bun run dev
```

Open <http://localhost:5173>. Signing in through gbandit does not work on
`localhost`, so use the `DEV` button in the bottom-right corner to act as a
test user.

Once the backend has a database, run `sqlx database setup` in `backend/` first
(`cargo install sqlx-cli`), since `query!` checks your SQL against it while
compiling.
