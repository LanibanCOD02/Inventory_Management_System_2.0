FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application files
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data

# Create directory for persistent data
RUN mkdir -p /data/uploads/products /data/uploads/bills /data/uploads/invoices && chown -R node:node /data

# Switch to non-root user for security
USER node

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
