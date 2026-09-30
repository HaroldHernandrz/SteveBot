FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends xvfb xauth \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
RUN npx playwright install --with-deps chromium
COPY . .

CMD ["xvfb-run", "-a", "--server-args=-screen 0 1280x720x24", "npm", "start"]
