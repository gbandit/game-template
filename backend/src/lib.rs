pub mod auth;
pub mod config;
pub mod db;
pub mod errors;
pub mod models;
pub mod routes;

use std::time::Instant;

use axum::Router;
use axum::body::Body;
use axum::extract::{FromRef, Request};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use tower_http::catch_panic::CatchPanicLayer;
// Uncomment when you add a database.
// use sqlx::SqlitePool;

use auth::AuthVerifier;
use config::Config;
use errors::AppError;

#[derive(Clone)]
pub struct AppState {
    // Uncomment when you add a database.
    // pub pool: SqlitePool,
    pub config: Config,
    pub auth_verifier: AuthVerifier,
}

// impl FromRef<AppState> for SqlitePool {
//     fn from_ref(state: &AppState) -> Self {
//         state.pool.clone()
//     }
// }

impl FromRef<AppState> for Config {
    fn from_ref(state: &AppState) -> Self {
        state.config.clone()
    }
}

async fn fallback() -> AppError {
    AppError::NotFound
}

pub fn app(state: AppState) -> Router {
    Router::new()
        .route("/", get(|| async { "running" }))
        .route("/api/me", get(routes::me::get_me))
        .fallback(fallback)
        // A panicking handler answers 500 instead of dropping the connection;
        // the panic itself is logged by the hook in main.rs.
        .layer(CatchPanicLayer::custom(|_| {
            AppError::Internal("handler panicked".into()).into_response()
        }))
        .layer(middleware::from_fn(log_request))
        // Health is below the request-log middleware so probe traffic doesn't fill the logs.
        .route("/api/health", get(routes::health::health))
        .with_state(state)
}

async fn log_request(req: Request<Body>, next: Next) -> Response {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let start = Instant::now();
    let resp = next.run(req).await;
    let latency_ms = start.elapsed().as_millis();
    let status = resp.status().as_u16();
    tracing::info!(%method, %uri, status, latency_ms, "response");
    resp
}
