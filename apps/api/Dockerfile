FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm install
RUN npm run build --prefix packages/core
RUN npm run build --prefix packages/crypto
RUN npm run build --prefix packages/types
RUN npm run build --prefix packages/storage
RUN npm run build --prefix apps/api || true
# If api doesn't have a build script, we can just run ts-node or compile it.
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["npm", "start"]