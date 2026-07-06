# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package configuration
COPY package*.json ./

# Install all dependencies (including devDependencies for compiling)
RUN npm ci

# Copy full source code
COPY . .

# Run production compilation
RUN npm run build

# Stage 2: Production release
FROM nginx:alpine

# Copy compiled static assets from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Replace standard configuration with our custom SPA router configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the mandatory ingress port
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
