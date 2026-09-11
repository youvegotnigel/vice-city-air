FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY public ./public

# NODE_ENV defaults to "development" here (not "production") so that the
# /api/test/* automation hooks (data reset, latency/error injection) stay
# available when the container is run out of the box, since this image is
# meant to be used as an AUT for test automation, not as a real deployment.
# Override with `-e NODE_ENV=production` to see those hooks get disabled.
ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server/index.js"]
