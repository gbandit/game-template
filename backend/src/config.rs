use std::env;
use std::net::SocketAddr;
use std::time::Duration;

// Uncomment all the database stuff once you write your first migration and want to start using a
// database
#[derive(Clone)]
pub struct Config {
    pub listen_addr: SocketAddr,
    // pub database_url: String,
    pub auth_issuer: String,
    pub auth_audience: String,
    pub auth_jwks_url: String,
    pub auth_jwks_refresh_interval: Duration,
}

impl Config {
    // For important env variables it's better to not use fallbacks and panic when missing
    // so that bad configuration can be fixed immediately.
    pub fn from_env() -> Self {
        let auth_issuer = env::var("AUTH_ISSUER").expect("AUTH_ISSUER must be set");
        let auth_audience = env::var("AUTH_AUDIENCE").expect("AUTH_AUDIENCE must be set");
        let auth_jwks_url = env::var("AUTH_JWKS_URL").expect("AUTH_JWKS_URL must be set");
        // let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
        let listen_addr = String::from("0.0.0.0:8080")
            .parse()
            .expect("Must use a valid listen address");
        let auth_jwks_refresh_interval = Duration::from_secs(300);

        Self {
            listen_addr,
            // database_url,
            auth_issuer,
            auth_audience,
            auth_jwks_url,
            auth_jwks_refresh_interval,
        }
    }
}
