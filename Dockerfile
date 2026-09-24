# Build context: this repo root (cliqhub-bff).
# Stage 1 clones getcliqio/cliqhub-frontend and builds the Vite SPA.
ARG FRONTEND_REPO=https://github.com/getcliqio/cliqhub-frontend.git
ARG FRONTEND_REF=main
# Bump FRONTEND_SHA whenever SPA main must be re-cloned (Docker otherwise
# caches the git clone layer and ships a stale SPA after frontend-only pushes).
ARG FRONTEND_SHA=a770580a3062cd9a9d8c8d209c8789b9cb639d02
ARG GH_TOKEN=

FROM node:20-alpine AS frontend-build
ARG FRONTEND_REPO
ARG FRONTEND_REF
ARG FRONTEND_SHA
ARG GH_TOKEN
WORKDIR /repo
RUN apk add --no-cache git \
 && echo "frontend_sha=${FRONTEND_SHA}" \
 && if [ -n "$GH_TOKEN" ]; then \
      git clone --depth 1 --branch "$FRONTEND_REF" \
        "https://x-access-token:${GH_TOKEN}@${FRONTEND_REPO#https://}" /repo; \
    else \
      git clone --depth 1 --branch "$FRONTEND_REF" "$FRONTEND_REPO" /repo; \
    fi \
 && echo "cloned=$(git -C /repo rev-parse HEAD)"
WORKDIR /repo
RUN npm ci && npm run build

FROM node:20-alpine AS bff-build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=bff-build /app/dist ./dist
COPY --from=bff-build /app/node_modules ./node_modules
COPY --from=bff-build /app/package.json ./
COPY --from=frontend-build /repo/dist ./spa
# STATIC_DIR=/app/spa on Railway
CMD ["node", "dist/server.js"]
