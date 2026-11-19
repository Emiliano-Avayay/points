# syntax=docker/dockerfile:1

# ---------- Etapa 1: build de la SPA (React + Vite) ----------
FROM node:24-alpine AS build
WORKDIR /app
ENV CI=true PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
# Typecheck de la app + build de producción (no incluye el servidor de Vite).
RUN npx tsc -p tsconfig.app.json --noEmit && npx vite build

# ---------- Etapa 2: servidor estático no privilegiado ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
ENV NGINX_ENTRYPOINT_QUIET_LOGS=1
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
