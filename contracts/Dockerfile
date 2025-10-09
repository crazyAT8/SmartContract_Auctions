FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Compile contracts
RUN npx hardhat compile

# Expose port
EXPOSE 8545

# Start Hardhat node
CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
