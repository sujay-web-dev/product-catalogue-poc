# Build context is the repo root (npm workspaces share one lockfile).
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --workspace client

COPY tsconfig.base.json ./
COPY client client
RUN npm run build --workspace client

# Static files only at runtime: nginx serves the build and proxies /api.
FROM nginx:alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
