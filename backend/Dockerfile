FROM node:18-alpine
WORKDIR /app

# copy only package manifests first for layer caching
COPY package*.json ./
RUN npm install --production

# copy rest
COPY . .

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "server.js"]
