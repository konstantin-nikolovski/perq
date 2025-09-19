FROM node:18-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@9.12.2 --activate

COPY package.json pnpm-lock.yaml .
COPY .npmrc .

RUN pnpm install --prod --frozen-lockfile && pnpm store prune

COPY . .

RUN pnpm run build

CMD ["pnpm", "run", "docker-start"]
