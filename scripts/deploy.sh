#!/bin/bash

# World Cup Prediction Pool - Deployment Script
# Usage: ./scripts/deploy.sh [devnet|mainnet]

set -e

NETWORK=${1:-devnet}

echo "🚀 Deploying World Cup Prediction Pool to $NETWORK..."

# ==================== Colors ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==================== Check Prerequisites ====================
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js required but not installed.${NC}"; exit 1; }
command -v anchor >/dev/null 2>&1 || { echo -e "${RED}Anchor required but not installed.${NC}"; exit 1; }
command -v solana >/dev/null 2>&1 || { echo -e "${RED}Solana CLI required but not installed.${NC}"; exit 1; }

echo -e "${GREEN}✓ All prerequisites met${NC}"

# ==================== Deploy Solana Program ====================
echo -e "\n${YELLOW}Deploying Solana program...${NC}"

cd programs/prediction-pool

# Build program
echo "Building program..."
anchor build

# Deploy based on network
if [ "$NETWORK" = "mainnet" ]; then
    echo "Deploying to mainnet-beta..."
    anchor deploy --provider.cluster mainnet
elif [ "$NETWORK" = "devnet" ]; then
    echo "Deploying to devnet..."
    anchor deploy --provider.cluster devnet
fi

# Get program ID
PROGRAM_ID=$(solana program show --programs | grep "prediction_pool" | awk '{print $1}')
echo -e "${GREEN}✓ Program deployed: $PROGRAM_ID${NC}"

cd ../..

# ==================== Update Environment Files ====================
echo -e "\n${YELLOW}Updating environment files...${NC}"

# Backend .env
cat > backend/.env << EOF
TXLINE_BASE_URL=https://txline.txodds.com
TXLINE_JWT=your_jwt_token_here
TXLINE_API_TOKEN=your_api_token_here
SOLANA_RPC_URL=$( [ "$NETWORK" = "mainnet" ] && echo "https://api.mainnet-beta.solana.com" || echo "https://api.devnet.solana.com" )
SOLANA_COMMITMENT=confirmed
PREDICTION_POOL_PROGRAM_ID=$PROGRAM_ID
TXLINE_PROGRAM_ID=6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J
ENABLE_KEEPER_BOT=true
PORT=8080
NODE_ENV=$NETWORK
EOF

echo -e "${GREEN}✓ Backend .env updated${NC}"

# ==================== Install Dependencies ====================
echo -e "\n${YELLOW}Installing dependencies...${NC}"

cd backend
npm install
cd ..

# cd frontend
# npm install
# cd ..

echo -e "${GREEN}✓ Dependencies installed${NC}"

# ==================== Build Backend ====================
echo -e "\n${YELLOW}Building backend...${NC}"

cd backend
npm run build
cd ..

echo -e "${GREEN}✓ Backend built${NC}"

# ==================== Deployment Summary ====================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\nProgram ID: ${YELLOW}$PROGRAM_ID${NC}"
echo -e "Network: ${YELLOW}$NETWORK${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Update TXLINE_JWT and TXLINE_API_TOKEN in backend/.env"
echo -e "2. Deploy frontend: cd frontend && npm run build && vercel deploy"
echo -e "3. Start backend: cd backend && npm start"
echo -e "4. Test settlement: curl -X POST http://localhost:8080/api/admin/settle/17952170"
echo -e "\n${GREEN}Good luck with the hackathon! 🚀${NC}"
