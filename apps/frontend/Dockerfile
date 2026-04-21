### Stage 1: Build ###
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

COPY pnpm-workspace.yaml package.json .npmrc ./
COPY apps/frontend/package.json apps/frontend/
RUN pnpm install --filter @asb/frontend... --frozen-lockfile=false

COPY apps/frontend apps/frontend
RUN pnpm --filter @asb/frontend build

### Stage 2: Runtime ###
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
