# Stage 1: Build client
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Install server dependencies
FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --only=production

# Stage 3: Production image
FROM node:20-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app

# Copy server
COPY server/ ./server/
COPY --from=server-deps /app/server/node_modules ./server/node_modules

# Copy built client
COPY --from=client-builder /app/client/dist ./client/dist

# Create uploads directory
RUN mkdir -p uploads && chown -R node:node /app

USER node
ENV NODE_ENV=production
EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "if [ \"$CCTV_REQUIRE_DATABASE\" = \"true\" ]; then node server/db/installCctv.js || exit 1; fi; exec node server/index.js"]
