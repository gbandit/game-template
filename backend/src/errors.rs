use axum::http::StatusCode;
use axum::http::header::CONTENT_TYPE;
use axum::response::{IntoResponse, Response};
use serde_json::json;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("bad request: {0}")]
    BadRequest(String),

    #[error("unauthorized: {0}")]
    Unauthorized(String),

    #[error("not found")]
    NotFound,

    #[error("database error: {0}")]
    Db(#[from] sqlx::Error),

    #[error("internal error: {0}")]
    Internal(String),
}

/// What the player sees for a failure on our side. The real cause is only
/// logged: it can name tables, queries or secrets.
const SERVER_ERROR_DETAIL: &str = "Something went wrong on our side. Try again in a moment.";

/// Every failure is answered as RFC 9457 Problem Details
/// (`application/problem+json`), the same shape gBandit itself answers with,
/// so the frontend shows `detail` to the player whoever answered.
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, detail) = match &self {
            AppError::BadRequest(msg) => {
                tracing::warn!(error = %msg, "bad request");
                (StatusCode::BAD_REQUEST, msg.as_str())
            }
            AppError::Unauthorized(msg) => {
                tracing::warn!(error = %msg, "unauthorized request");
                (StatusCode::UNAUTHORIZED, msg.as_str())
            }
            AppError::NotFound => {
                tracing::info!("resource not found");
                (StatusCode::NOT_FOUND, "Not found.")
            }
            AppError::Db(e) => {
                tracing::error!(error = %e, "database error");
                (StatusCode::INTERNAL_SERVER_ERROR, SERVER_ERROR_DETAIL)
            }
            AppError::Internal(msg) => {
                tracing::error!(error = %msg, "internal error");
                (StatusCode::INTERNAL_SERVER_ERROR, SERVER_ERROR_DETAIL)
            }
        };

        let body = json!({
            "type": "about:blank",
            "title": status.canonical_reason().unwrap_or("Error"),
            "status": status.as_u16(),
            "detail": detail,
        });
        (
            status,
            [(CONTENT_TYPE, "application/problem+json")],
            body.to_string(),
        )
            .into_response()
    }
}
