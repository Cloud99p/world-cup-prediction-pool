#!/bin/bash

# World Cup Prediction Pool - Quick Credential Setup
# This script helps you get all required credentials

set -e

echo "🔑 World Cup Prediction Pool - Credential Setup"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ==================== Step 1: Check Solana CLI ====================
echo -e "${YELLOW}Step 1: Checking Solana CLI...${NC}"
if command -v solana &> /dev/null; then
    echo -e "${GREEN}✓ Solana CLI installed${NC}"
    solana --version
else
    echo -e "${RED}✗ Solana CLI not found${NC}"
    echo "Install from: https://docs.solana.com/cli/install-solana-cli"
    echo ""
    echo "Skipping Solana CLI setup - you can use Phantom wallet instead."
fi
echo ""

# ==================== Step 2: Check Node.js ====================
echo -e "${YELLOW}Step 2: Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    echo -e "${GREEN}✓ Node.js installed${NC}"
    node --version
else
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "Install from: https://nodejs.org"
    exit 1
fi
echo ""

# ==================== Step 3: Get TxLINE JWT ====================
echo -e "${YELLOW}Step 3: Getting TxLINE JWT Token...${NC}"
echo "Fetching guest JWT from TxLINE..."

JWT_RESPONSE=$(curl -s -X POST https://txline.txodds.com/auth/guest/start \
  -H "Content-Type: application/json")

JWT_TOKEN=$(echo $JWT_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$JWT_TOKEN" ]; then
    echo -e "${GREEN}✓ JWT Token received${NC}"
    echo "Token: ${JWT_TOKEN:0:50}..."
    echo ""
    echo "⚠️  IMPORTANT: Save this token!"
    echo "   Add to backend/.env as: TXLINE_JWT=$JWT_TOKEN"
    echo ""
    
    # Test the JWT
    echo "Testing JWT token..."
    TEST_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
      https://txline.txodds.com/api/scores/snapshot/17952170 \
      -H "Authorization: Bearer $JWT_TOKEN")
    
    if [ "$TEST_RESPONSE" = "200" ]; then
        echo -e "${GREEN}✓ JWT token is valid!${NC}"
    else
        echo -e "${YELLOW}⚠ JWT token may need activation (HTTP $TEST_RESPONSE)${NC}"
        echo "   Follow full activation in docs/CREDENTIAL_SETUP.md"
    fi
else
    echo -e "${RED}✗ Failed to get JWT token${NC}"
    echo "   Check your internet connection and try again"
    echo "   Or get manually: curl -X POST https://txline.txodds.com/auth/guest/start"
fi
echo ""

# ==================== Step 4: Create Environment Files ====================
echo -e "${YELLOW}Step 4: Creating environment files...${NC}"

# Backend .env
if [ -f backend/.env ]; then
    echo -e "${YELLOW}⚠ backend/.env already exists${NC}"
    read -p "Overwrite? (y/n): " overwrite
    if [ "$overwrite" = "y" ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✓ backend/.env created${NC}"
    fi
else
    cp backend/.env.example backend/.env
    echo -e "${GREEN}✓ backend/.env created${NC}"
fi

# Frontend .env.local
if [ -f frontend/.env.local ]; then
    echo -e "${YELLOW}⚠ frontend/.env.local already exists${NC}"
else
    cp frontend/.env.example frontend/.env.local
    echo -e "${GREEN}✓ frontend/.env.local created${NC}"
fi

# Update backend .env with JWT if we got it
if [ -n "$JWT_TOKEN" ]; then
    sed -i.bak "s|TXLINE_JWT=.*|TXLINE_JWT=$JWT_TOKEN|g" backend/.env
    rm backend/.env.bak 2>/dev/null || true
    echo -e "${GREEN}✓ JWT added to backend/.env${NC}"
fi

echo ""

# ==================== Step 5: Install Dependencies ====================
echo -e "${YELLOW}Step 5: Installing dependencies...${NC}"

echo "Installing backend dependencies..."
cd backend
npm install --silent
cd ..
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo "Installing frontend dependencies..."
cd frontend
npm install --silent
cd ..
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

echo ""

# ==================== Summary ====================
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Review backend/.env and update any missing values"
echo "2. Get devnet SOL: https://faucet.solana.com"
echo "3. Deploy program: ./scripts/deploy.sh devnet"
echo "4. Start backend: cd backend && npm run dev"
echo "5. Start frontend: cd frontend && npm run dev"
echo "6. Open http://localhost:3000"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "- Full credential guide: docs/CREDENTIAL_SETUP.md"
echo "- Architecture: docs/ARCHITECTURE.md"
echo "- Quick start: docs/QUICKSTART.md"
echo ""
echo -e "${GREEN}Good luck with the hackathon! 🚀${NC}"
