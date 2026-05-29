# --- Build stage -----------------------------------------------------------
# Compile the static Vite bundle in a full Node image.
FROM node:20-alpine AS build

WORKDIR /app

# Install deps against the lockfile first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Runtime stage ---------------------------------------------------------
# Serve the static bundle with nginx — no Node runtime in production.
FROM nginx:1.27-alpine AS runtime

# Replace the default site with our SPA + security-header config.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

# Lightweight container healthcheck for the platform/orchestrator.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
