FROM oven/bun:1-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./
COPY bun.lock ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy application code
COPY . .

# Build the application
RUN bun run build

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run the application
CMD ["bun", "start"]
