FROM node:25-bookworm-slim AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json apps/web/
COPY pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --filter web...
COPY apps/web apps/web
RUN pnpm --filter web build && pnpm --filter web --prod deploy /out --legacy

FROM node:25-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3000
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY --from=build /out /app
USER app
EXPOSE 3000
CMD ["node", "build"]
