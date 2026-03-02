#!/bin/bash
set -e

GREEN='\033[0;32m'
DIM='\033[2m'
NC='\033[0m'

echo -e "${GREEN}▓▓▓ MACRODASH v2 ▓▓▓${NC}"
echo ""

# Setup .env
if [ ! -f .env ]; then
    echo -e "${DIM}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}→ .env created. Add your API keys before using AI features.${NC}"
fi

# Python venv
if [ ! -d venv ]; then
    echo -e "${DIM}Creating Python virtual environment...${NC}"
    python3 -m venv venv
fi

echo -e "${DIM}Installing Python dependencies...${NC}"
source venv/bin/activate
pip install -r backend/requirements.txt -q

# Frontend deps
if [ ! -d frontend/node_modules ]; then
    echo -e "${DIM}Installing frontend dependencies...${NC}"
    cd frontend && npm install && cd ..
fi

echo ""
echo -e "${GREEN}Starting servers...${NC}"
echo -e "${DIM}Backend:  http://localhost:8001${NC}"
echo -e "${DIM}Frontend: http://localhost:5174${NC}"
echo ""

# Start backend
PYTHONPATH=. uvicorn backend.main:app --reload --port 8001 &
BACKEND_PID=$!

# Start frontend
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

# Cleanup on exit
cleanup() {
    echo ""
    echo -e "${DIM}Shutting down...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    wait 2>/dev/null
    echo -e "${GREEN}Done.${NC}"
}

trap cleanup EXIT INT TERM

wait
