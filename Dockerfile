# ZenPipe Flagship Dockerfile
# Production-ready, ultra-lightweight Alpine Linux container
FROM node:24-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3333

# ZenPipe has zero external npm dependencies!
# Copy application source files directly
COPY package.json ./
COPY server.ts ./
COPY bin/ ./bin/
COPY src/ ./src/
COPY public/ ./public/

# Ensure CLI executable permissions
RUN chmod +x ./bin/zenpipe.js ./bin/zentube.js

# Expose ZenPipe streaming port
EXPOSE 3333

# Native healthcheck using Node.js built-in fetch
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3333/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start ZenPipe engine with native TypeScript stripping
CMD ["node", "--experimental-strip-types", "server.ts"]
