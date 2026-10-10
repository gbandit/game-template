FROM oven/bun:1-alpine AS build

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
