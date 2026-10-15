# Works on Render, Railway, Fly.io, Google Cloud Run, a VPS, or anywhere Docker runs.
FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["npx", "tsx", "server.ts"]
