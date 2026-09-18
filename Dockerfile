# --- build ------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- runtime ----------------------------------------------------------------
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

EXPOSE 3001

# Pending migrations run before the app starts, so a deploy of new code never
# serves requests against an old schema. Migrations are the compiled .js ones.
CMD ["sh", "-c", "npm run migration:run:prod && node dist/main"]
