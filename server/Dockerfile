# Build context is the repo root (npm workspaces share one lockfile).
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

# Every workspace manifest is needed for `npm ci` to match the lockfile.
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --workspace server --omit=dev && npm cache clean --force

# Node 24 runs the TypeScript source directly; there is no build step.
COPY server/src server/src

USER node
WORKDIR /app/server
EXPOSE 3000
CMD ["node", "src/index.ts"]
