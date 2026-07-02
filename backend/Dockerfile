# Use Node.js LTS as the base image
FROM node:20-slim

ENV NODE_ENV=production

WORKDIR /app

RUN chown node:node /app

USER node

COPY --chown=node:node package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

EXPOSE 8000

CMD ["npm", "start"]
