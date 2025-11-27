# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./
RUN npm install

# Copy source
COPY backend/ ./

# Generate Prisma client (must be done before build)
# Set a dummy DATABASE_URL for generation (not used at build time)
ENV DATABASE_URL="file:./dev.db"
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# --- Runtime Stage ---
FROM node:20-alpine

WORKDIR /app

# Install only production deps
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy built JS output
COPY --from=builder /app/dist ./dist

# Copy Prisma schema & migrations
COPY backend/prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 5000

CMD ["node", "dist/index.js"]
