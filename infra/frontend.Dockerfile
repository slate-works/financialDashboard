FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
COPY frontend/pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install

COPY frontend/ ./

RUN pnpm run build

# Production server with Node.js (Next.js standalone)
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
