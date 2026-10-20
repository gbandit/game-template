# Pinned by digest for the golden build cache; see backend/Dockerfile.
FROM oven/bun:1-alpine@sha256:629e17411f1f129dbec3af78d5af9c9f2a937435c80349437206c6b0b7422373 AS build

WORKDIR /app
COPY package.json bun.lock ./
# Not --frozen-lockfile: what bun.lock lists stays pinned, and a dependency
# added to package.json without updating the lockfile is resolved here, so
# adding one never needs Bun installed locally.
RUN --mount=type=cache,target=/root/.bun/install/cache bun install

COPY . .
RUN bun run build

# This image is only a build artifact for gbandit: put the static frontend
# bundle in /out, and the platform will publish and serve it via shared nginx.
FROM scratch
COPY --from=build /app/dist /out
