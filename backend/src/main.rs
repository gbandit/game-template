// Uncomment together with the pool in `run` when you add a database.
// use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
// use std::str::FromStr;
use std::error::Error;
use tokio::net::TcpListener;

use replace_with_project::{AppState, app, auth::AuthVerifier, config::Config};

#[tokio::main]
async fn main() {
    let _ = dotenvy::dotenv();

    // Kubernetes adds an RFC3339 timestamp prefix to every log line via the
    // platform's `--timestamps` log fetch, so emit lines without our own
    // timestamp to avoid duplication in the logs viewer.
    tracing_subscriber::fmt()
        .without_time()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "replace_with_project=info,tower_http=info".into()),
        )
        .init();

    // A panic is logged through tracing like every other line, so it carries
    // a level and reaches `gbandit logs backend` as an error.
    std::panic::set_hook(Box::new(|info| {
        let backtrace = std::backtrace::Backtrace::capture();
        tracing::error!(%backtrace, "{info}");
    }));

    if let Err(error) = run().await {
        tracing::error!("backend failed to start: {error}");
        std::process::exit(1);
    }
}

async fn run() -> Result<(), Box<dyn Error + Send + Sync>> {
    let config = Config::from_env();
    let auth_verifier = AuthVerifier::from_jwks_url(
        config.auth_issuer.clone(),
        config.auth_audience.clone(),
        config.auth_jwks_url.clone(),
        reqwest::Client::new(),
        config.auth_jwks_refresh_interval,
    )
    .await
    .map_err(|error| {
        format!(
            "failed to initialize auth verifier from {}: {error}",
            config.auth_jwks_url
        )
    })?;

    // Uncomment when you add a database. `journal_mode = WAL` is load-bearing:
    // the Database tab and the backup sweep read the file while the game is
    // running. `create_if_missing` makes the very first boot work, before any
    // migration has created anything.
    // let pool = SqlitePoolOptions::new()
    //     .max_connections(5)
    //     .connect_with(
    //         SqliteConnectOptions::from_str(&config.database_url)
    //             .map_err(context("invalid DATABASE_URL"))?
    //             .create_if_missing(true)
    //             .journal_mode(SqliteJournalMode::Wal),
    //     )
    //     .await
    //     .map_err(context("failed to connect to database"))?;
    //
    // Your code owns your schema. This applies every migration in
    // backend/migrations that has not run yet, before the server accepts its
    // first request — so a migration that fails stops the boot and fails the
    // deploy with its own error.
    // sqlx::migrate!("./migrations")
    //     .run(&pool)
    //     .await
    //     .map_err(context("failed to apply migrations"))?;

    let state = AppState {
        // pool,
        config: config.clone(),
        auth_verifier,
    };

    let app = app(state);

    let addr = config.listen_addr;

    tracing::info!("listening on {addr}");

    let listener = TcpListener::bind(addr)
        .await
        .map_err(context("failed to bind listener"))?;

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .map_err(context("server error"))?;

    Ok(())
}

/// Says what was being done when `error` happened; `main` logs it once.
fn context<E: Error>(message: &'static str) -> impl FnOnce(E) -> Box<dyn Error + Send + Sync> {
    move |error| format!("{message}: {error}").into()
}

async fn shutdown_signal() {
    let ctrl_c = tokio::signal::ctrl_c();
    let mut sigterm = match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
    {
        Ok(sigterm) => sigterm,
        Err(error) => {
            tracing::error!(error = %error, "failed to install SIGTERM handler");
            return;
        }
    };

    tokio::select! {
        _ = ctrl_c => tracing::info!("received SIGINT, shutting down"),
        _ = sigterm.recv() => tracing::info!("received SIGTERM, shutting down"),
    }
}
