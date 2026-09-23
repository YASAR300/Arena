# ==============================================================================
# STAGE 1: Dependency Builder
# ==============================================================================
FROM node:20-alpine AS dependencies

WORKDIR /usr/src/app

# Install build tools for native compilation if required
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package*.json ./

# Install all dependencies including devDependencies for linting & tests
RUN npm ci

# ==============================================================================
# STAGE 2: Production Dependencies Pruner
# ==============================================================================
FROM node:20-alpine AS pruner

WORKDIR /usr/src/app

COPY package*.json ./
# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# ==============================================================================
# STAGE 3: Production Runtime (Hardened & Non-root)
# ==============================================================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=5000

# Install dumb-init to properly handle PID 1 signal forwarding
RUN apk add --no-cache dumb-init curl

# Create unprivileged application user
USER node

# Copy production node_modules from pruner
COPY --chown=node:node --from=pruner /usr/src/app/node_modules ./node_modules

# Copy application source code
COPY --chown=node:node package*.json ./
COPY --chown=node:node src ./src

# Expose HTTP port
EXPOSE 5000

# Container health check probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/server.js"]
