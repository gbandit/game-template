use axum::extract::FromRequestParts;
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode, decode_header, jwk::JwkSet};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tokio::time::sleep;

use crate::AppState;
use crate::errors::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccessTokenClaims {
    pub iss: String,
    pub sub: String,
    pub aud: String,
    pub exp: i64,
    pub iat: i64,
    pub jti: String,
    pub username: Option<String>,
    #[serde(default)]
    pub is_anon: bool,
}

#[derive(Clone)]
pub struct AuthVerifier {
    issuer: String,
    audience: String,
    keys: Arc<RwLock<Vec<JwkDecodingKey>>>,
}

struct JwkDecodingKey {
    kid: Option<String>,
    decoding_key: DecodingKey,
}

impl AuthVerifier {
    pub async fn from_jwks_url(
        issuer: String,
        audience: String,
        jwks_url: String,
        http: reqwest::Client,
        refresh_interval: Duration,
    ) -> Result<Self, String> {
        let initial_keys = fetch_jwks_keys(&http, &jwks_url).await?;
        let keys = Arc::new(RwLock::new(initial_keys));
        let refresh_keys = Arc::clone(&keys);
        let refresh_http = http.clone();
        let refresh_jwks_url = jwks_url.clone();

        tokio::spawn(async move {
            loop {
                sleep(refresh_interval).await;
                match fetch_jwks_keys(&refresh_http, &refresh_jwks_url).await {
                    Ok(new_keys) => {
                        if let Ok(mut guard) = refresh_keys.write() {
                            *guard = new_keys;
                        } else {
                            tracing::error!("auth jwks cache lock poisoned");
                            return;
                        }
                    }
                    Err(err) => {
                        tracing::warn!(jwks_url = %refresh_jwks_url, error = %err, "failed to refresh auth jwks");
                    }
                }
            }
        });

        Ok(Self {
            issuer,
            audience,
            keys,
        })
    }

    pub fn verify(&self, token: &str) -> Result<AccessTokenClaims, String> {
        let mut validation = Validation::new(Algorithm::ES256);
        validation.set_issuer(&[self.issuer.as_str()]);
        validation.set_audience(&[self.audience.as_str()]);
        validation.required_spec_claims = ["sub", "exp", "iat", "aud", "iss"]
            .into_iter()
            .map(str::to_string)
            .collect();

        verify_with_jwks(token, &validation, &self.keys)
    }
}

fn decode_claims(
    token: &str,
    decoding_key: &DecodingKey,
    validation: &Validation,
) -> Result<AccessTokenClaims, String> {
    decode::<AccessTokenClaims>(token, decoding_key, validation)
        .map(|data| data.claims)
        .map_err(|err| format!("invalid access token: {err}"))
}

fn verify_with_jwks(
    token: &str,
    validation: &Validation,
    keys: &Arc<RwLock<Vec<JwkDecodingKey>>>,
) -> Result<AccessTokenClaims, String> {
    let header =
        decode_header(token).map_err(|err| format!("invalid access token header: {err}"))?;
    let kid = header.kid.as_deref();
    let guard = keys
        .read()
        .map_err(|_| "auth jwks cache lock poisoned".to_string())?;

    if guard.is_empty() {
        return Err("auth jwks cache is empty".into());
    }

    let preferred =
        kid.and_then(|value| guard.iter().find(|key| key.kid.as_deref() == Some(value)));
    if let Some(key) = preferred {
        return decode_claims(token, &key.decoding_key, validation);
    }

    let mut last_err = None;
    for key in guard.iter() {
        match decode_claims(token, &key.decoding_key, validation) {
            Ok(claims) => return Ok(claims),
            Err(err) => last_err = Some(err),
        }
    }

    Err(last_err.unwrap_or_else(|| "invalid access token".into()))
}

async fn fetch_jwks_keys(
    http: &reqwest::Client,
    jwks_url: &str,
) -> Result<Vec<JwkDecodingKey>, String> {
    let jwks = http
        .get(jwks_url)
        .send()
        .await
        .map_err(|err| format!("failed to fetch auth jwks: {err}"))?
        .error_for_status()
        .map_err(|err| format!("auth jwks endpoint returned error: {err}"))?
        .json::<JwkSet>()
        .await
        .map_err(|err| format!("failed to parse auth jwks: {err}"))?;

    let keys = jwks
        .keys
        .into_iter()
        .map(|jwk| {
            let kid = jwk.common.key_id.clone();
            let decoding_key = DecodingKey::from_jwk(&jwk)
                .map_err(|err| format!("invalid jwk in auth jwks: {err}"))?;
            Ok(JwkDecodingKey { kid, decoding_key })
        })
        .collect::<Result<Vec<_>, String>>()?;

    if keys.is_empty() {
        return Err("auth jwks did not contain any keys".into());
    }

    Ok(keys)
}

fn dev_user(name: &str) -> Option<AccessTokenClaims> {
    let sub = match name.to_lowercase().as_str() {
        "eric" => "dev-eric",
        "anna" => "dev-anna",
        "steve" => "dev-steve",
        _ => return None,
    };
    Some(AccessTokenClaims {
        iss: "dev".into(),
        sub: sub.into(),
        aud: "game-backend".into(),
        exp: i64::MAX,
        iat: 0,
        jti: format!("dev-{sub}"),
        username: Some(name.to_lowercase()),
        is_anon: false,
    })
}

#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub claims: AccessTokenClaims,
}

impl AuthenticatedUser {
    pub fn id(&self) -> &str {
        &self.claims.sub
    }

    pub fn name(&self) -> &str {
        self.claims.username.as_deref().unwrap_or("Player")
    }

    pub fn is_anon(&self) -> bool {
        self.claims.is_anon
    }
}

impl FromRequestParts<AppState> for AuthenticatedUser {
    type Rejection = AppError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        if state.config.dev_auth_enabled {
            if let Some(name) = parts
                .headers
                .get("x-dev-user")
                .and_then(|v| v.to_str().ok())
            {
                let claims = dev_user(name)
                    .ok_or_else(|| AppError::BadRequest(format!("unknown dev user: {name}")))?;
                tracing::debug!(user = name, "using dev auth bypass");
                return Ok(Self { claims });
            }
        }

        let auth_header = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("missing authorization header".into()))?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .or_else(|| auth_header.strip_prefix("bearer "))
            .ok_or_else(|| {
                AppError::Unauthorized("authorization header must use bearer token".into())
            })?;

        let claims = state
            .auth_verifier
            .verify(token)
            .map_err(AppError::Unauthorized)?;

        Ok(Self { claims })
    }
}
