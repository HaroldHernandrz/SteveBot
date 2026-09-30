FROM node:22-bookworm-slim

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends chromium xvfb xauth \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

CMD ["xvfb-run", "-a", "--server-args=-screen 0 1280x720x24", "npm", "start"]
