# Build from repo root:
#   docker build -f backend/Dockerfile .
# Compose sets context: . and dockerfile: backend/Dockerfile

# --- Compile Solidity and export artifacts for deploy-on-start ---
FROM node:20-bookworm-slim AS contracts-builder
WORKDIR /repo
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY contracts/package*.json ./contracts/
RUN cd contracts && npm ci
COPY contracts/ ./contracts/
# export-artifacts.js writes to ../backend/src/contracts/artifacts
RUN mkdir -p backend/src/contracts \
  && cd contracts \
  && npm run compile:artifacts

# --- Backend runtime ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app

# Prisma migrate / query engines need OpenSSL on Debian slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./
COPY --from=contracts-builder /repo/backend/src/contracts/artifacts ./src/contracts/artifacts

RUN npx prisma generate \
  && mkdir -p logs \
  && sed -i 's/\r$//' docker-entrypoint.sh \
  && chmod +x docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
