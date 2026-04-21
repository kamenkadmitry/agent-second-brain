### Stage 1: Build ###
FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Copy workspace manifests first for layer cache.
COPY pnpm-workspace.yaml package.json .npmrc ./
COPY apps/backend/package.json apps/backend/
COPY apps/backend/prisma apps/backend/prisma/

RUN pnpm install --filter @asb/backend... --frozen-lockfile=false

# Copy remaining sources and build.
COPY apps/backend/tsconfig.json apps/backend/
COPY apps/backend/src apps/backend/src
COPY apps/backend/tests apps/backend/tests

RUN pnpm --filter @asb/backend exec prisma generate
RUN pnpm --filter @asb/backend build

### Stage 2: Runtime ###
FROM node:20-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat tini
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

ENV NODE_ENV=production

COPY --from=build /app/pnpm-workspace.yaml /app/package.json /app/.npmrc ./
COPY --from=build /app/apps/backend/package.json apps/backend/
COPY --from=build /app/apps/backend/prisma apps/backend/prisma/
COPY --from=build /app/apps/backend/dist apps/backend/dist
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/backend/node_modules apps/backend/node_modules

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "pnpm --filter @asb/backend exec prisma migrate deploy && (pnpm --filter @asb/backend exec tsx prisma/seed.ts || true) && node apps/backend/dist/index.js"]
