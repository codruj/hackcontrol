FROM node:18-slim

RUN apt-get update -qq && apt-get install -y -qq openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    NPM_CONFIG_FETCH_TIMEOUT=600000 npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

RUN npm prune --production

EXPOSE 3000

CMD ["npm", "start"]
