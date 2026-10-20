# Base images are pinned by digest because the golden build cache
# (platform/scripts/ci/build-golden-seed.sh) is built from this file: a tag
# that moves after the seed is built makes every new project miss it. Change a
# pin, then rebuild the seed.
FROM rust:1-slim-bookworm@sha256:a24e292b4af7bdee351a31d3a6379972a5652f0ea22a1b6d6883324ac4f5097c AS builder

WORKDIR /app

# sqlite3 builds the throwaway schema below. Placed before COPY so the layer
# survives source changes.
RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 && \
    rm -rf /var/lib/apt/lists/*

COPY . .

# The build is self-contained: your migrations are replayed into a throwaway
# file so sqlx's query! macros typecheck against the schema they will run
# against. No secret and no live database, so the same `docker build` works on
# your own machine. The app applies the same migrations to the real file when it
# starts.
#
# The binary is copied, not stripped: /app/target is a cache mount, so it has to
# leave that path either way, and the symbol table it keeps is what turns a panic
# backtrace from bare addresses into named frames (see RUST_BACKTRACE below).
# Costs ~9 MB in the image.
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/app/target \
    for f in migrations/*.sql; do [ -e "$f" ] || continue; sqlite3 -bail /tmp/db_schema < "$f" || exit 1; done && \
    DATABASE_URL=sqlite:///tmp/db_schema cargo build && cp target/debug/replace_with_project /app/replace_with_project

FROM gcr.io/distroless/cc-debian12@sha256:e5d81ddde149641e2a9ba55be4545bc125c67de07508b03ba4c22e6eb0ded5aa

WORKDIR /app

COPY --from=builder /app/replace_with_project /app/replace_with_project

EXPOSE 8080

ENV RUST_BACKTRACE=1

CMD ["./replace_with_project"]
