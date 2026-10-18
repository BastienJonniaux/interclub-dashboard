# Stage 1: Build
FROM node:20-slim AS builder

WORKDIR /app

# Install openssl required by Prisma
RUN apt-get update -y && apt-get install -y openssl

# Copy dependency manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate Prisma client
RUN npm ci
RUN npx prisma generate

# Copy source code and build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-slim AS runner

WORKDIR /app

# Install openssl in runtime
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3001

# Copy package manifests and production dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
