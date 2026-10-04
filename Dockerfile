FROM node:24-bookworm

WORKDIR /app

COPY package*.json ./

# postinstall needs prisma + scripts; install deps first, generate after COPY
RUN npm ci --ignore-scripts

COPY . .

# Migrate needs a live DB — skip at build; CMD runs db:migrate:deploy on start.
RUN SKIP_DB_MIGRATE=1 npm run postinstall

EXPOSE 3000

# Apply schema + idempotent MySQL patches on start (covers columns missing from migrate history).
CMD ["sh", "-c", "npm run db:migrate:deploy && npm run dev"]
