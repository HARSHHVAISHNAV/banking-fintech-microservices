FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files FIRST — Docker caches this layer
# npm install only reruns if package.json changes
COPY package*.json ./
RUN npm install

# Copy source AFTER — changes here don't invalidate npm cache
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80