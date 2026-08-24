FROM node:20-bookworm

WORKDIR /app

COPY package*.json ./

# postinstall needs prisma + scripts; install deps first, generate after COPY
RUN npm ci --ignore-scripts

COPY . .

RUN npm run postinstall

EXPOSE 3000

# Apply schema + idempotent MySQL patches on start (covers columns missing from migrate history).
CMD ["sh", "-c", "npm run db:migrate:deploy && npm run dev"]
