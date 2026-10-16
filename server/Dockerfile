FROM node:22.23.3-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS base
WORKDIR /app
RUN chown node:node /app
USER node

FROM base AS local
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY --chown=node:node . .
EXPOSE 5000
CMD ["node", "--watch", "server.js"]

FROM base AS runtime
ENV NODE_ENV=production
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY --chown=node:node app.js server.js ./
COPY --chown=node:node config ./config
COPY --chown=node:node controllers ./controllers
COPY --chown=node:node db ./db
COPY --chown=node:node domain ./domain
COPY --chown=node:node jobs ./jobs
COPY --chown=node:node middleware ./middleware
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node routes ./routes
COPY --chown=node:node services ./services
COPY --chown=node:node utils ./utils
EXPOSE 5000
CMD ["node", "server.js"]
