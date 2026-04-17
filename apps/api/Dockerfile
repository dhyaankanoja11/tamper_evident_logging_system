FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm install
RUN npm run build --workspaces --if-present
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["npm", "start"]