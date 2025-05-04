FROM node:18-alpine

# Install python for Anki deck generation and tesseract for OCR
RUN apk add --no-cache python3 py3-pip tesseract-ocr ffmpeg tzdata

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy application code
COPY . .

# Install Python dependencies
RUN pip3 install genanki

# Build TypeScript
RUN pnpm build

# Expose port (if your bot needs to expose a port)
EXPOSE 3000

# Run the application
CMD ["pnpm", "start"] 