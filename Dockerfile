# syntax=docker/dockerfile:1

# ---- Build stage ----
# Compiles TypeScript and the native better-sqlite3 binding. The runtime stage
# uses the SAME node:22-alpine base image so the compiled binding's Node ABI
# and libc (musl) match exactly — that is what avoids a runtime rebuild.
FROM node:22-alpine AS build
WORKDIR /app

# better-sqlite3 has no musl (Alpine) prebuilt binary, so it compiles its native
# addon here. This toolchain is needed only in this stage.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json .npmrc ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop the dev toolchain from the artifact we carry into the runtime image.
RUN npm prune --omit=dev

# ---- Runtime stage ----
# Slim, non-root, no build toolchain. Only the compiled output and runtime
# dependencies are copied in.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN chown -R node:node /app && mkdir -p /data && chown -R node:node /data

COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node public ./public

USER node
EXPOSE 3000
ENV PORT=3000
# Read cache TTL in ms; 0 disables expiry. Overridable via `docker run -e CACHE_TTL_MS=...`.
ENV CACHE_TTL_MS=30000
CMD ["node", "dist/index.js"]