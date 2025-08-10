FROM oven/bun:1-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Set memory limits for better stability
ENV NODE_OPTIONS="--max-old-space-size=2048"

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./
COPY bun.lock ./

# Install dependencies with memory optimization
RUN bun install --frozen-lockfile --no-save 

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
