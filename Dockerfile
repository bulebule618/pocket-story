FROM node:24-alpine
WORKDIR /app
COPY --chown=node:node package.json pnpm-lock.yaml server.mjs ./
RUN npm install --omit=dev --ignore-scripts
COPY --chown=node:node server ./server
COPY --chown=node:node migrations ./migrations
COPY --chown=node:node dist ./dist
RUN mkdir /data && chown node:node /data
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173 DATA_DIR=/data
EXPOSE 4173
VOLUME /data
CMD ["node", "server.mjs"]

