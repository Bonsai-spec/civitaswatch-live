FROM node:22.12-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/web/package*.json ./apps/web/

RUN npm install

COPY . .

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["sh", "-c", "npm run prisma:generate --workspace apps/api && npm exec --workspace apps/api -- prisma migrate deploy && npm run start:api"]
