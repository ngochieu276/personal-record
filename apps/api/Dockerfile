# syntax = docker/dockerfile:1

# Built from the monorepo root (see fly.toml). Do not `docker build` from apps/api.

ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

FROM base AS build

# Native addons (if any dependency compiles against node-gyp)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Skip postinstall (prisma emit) until sources are copied; generated contract is in git.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @personal-record/api...

COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

FROM base

ENV NODE_ENV=production
ENV PORT=8080

COPY --from=build /app /app

EXPOSE 8080
CMD ["pnpm", "--filter", "@personal-record/api", "start"]
