# Use Node.js 22 Alpine for smaller image size
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for better caching)
COPY package*.json ./
RUN npm install

COPY . .

# Expose the port Vite runs on
EXPOSE 4000

# Set environment variables
ENV NODE_ENV=development
ENV PORT=4000

# Use Vite for hot reloading
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "4000"]
