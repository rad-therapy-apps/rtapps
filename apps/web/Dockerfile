# What this file does: multi-stage Docker build for `apps/web` — installs the pnpm workspace,
# builds the SvelteKit app with adapter-node, then produces a slim production runtime image.
# Used here and why: package.json manifests are copied and `pnpm install` run *before* the rest
# of the source, so Docker's layer cache keeps the (slow) install layer warm across source-only
# changes; `pnpm --prod deploy /out --legacy` (the `--legacy` flag pnpm needs for `deploy` at this
# pnpm/workspace version) assembles just `apps/web` plus its production deps into a self-contained
# `/out` directory — the `build` output and `arcade/` game files (per `package.json`'s
# `"files": ["arcade", "build"]`) plus pruned `node_modules` — so the runtime stage doesn't need
# the whole monorepo or workspace symlinks.
# How it fits the project: this image is the `web` service in the docker-compose stack behind the
# same-origin proxy (ADR-0002/ADR-0005); it only ever talks to `api:8000` over the compose network.
# Depends on: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `pnpm-lock.yaml`,
# `packages/api-client`, `packages/schemas` (workspace deps `apps/web` builds against).
# Used by: `docker compose build web` / `docker-compose.yml`; CI's image-build step.

# --- build stage: full workspace install + SvelteKit build + pnpm deploy to a self-contained dir ---
FROM node:26-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo
# Manifests only (no source yet), so `pnpm install` below is cached unless a dependency changes.
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY packages/api-client/package.json packages/api-client/
COPY packages/schemas/package.json packages/schemas/
COPY pnpm-lock.yaml ./
# `--filter web...` installs `web` and everything it depends on (its workspace deps included),
# not the whole monorepo's dependency set.
RUN pnpm install --frozen-lockfile --filter web...
COPY apps/web apps/web
COPY packages/api-client packages/api-client
COPY packages/schemas packages/schemas
# Builds the SvelteKit app, then `deploy` copies `apps/web` (per its `"files"` field) plus its
# resolved production dependencies into /out as a standalone, non-workspace directory.
RUN pnpm --filter web build && pnpm --filter web --prod deploy /out --legacy

# --- runtime stage: just the deployed output, run as a non-root user ---
FROM node:26-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build /out /app
USER app
EXPOSE 3000
CMD ["node", "build"]
