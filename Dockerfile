# Use the Debian-based 'slim' image
FROM node:18-slim

# --- ADD THIS LINE ---
# Install the OpenSSL CLI tool so Prisma can auto-detect the version
RUN apt-get update && apt-get install -y openssl

# -----------------------

WORKDIR /app

# 1. Copy package files
COPY package*.json ./

# 2. Install ALL dependencies
RUN npm ci

# 3. Copy the rest of your app code
COPY . .

# 4. Run prisma generate (will now detect openssl 3.0)
RUN npx prisma generate

# 5. Build your Next.js app
RUN npm run build

# 6. Prune devDependencies
RUN npm prune --production

EXPOSE 3000

CMD ["npm", "start"]
