#!/bin/bash

# Startup Guide for All Microservices
# Run this after configuring .env files

echo "🚀 Starting All Microservices..."
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Redis is running
echo -e "${BLUE}Checking Redis...${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠️  Redis is not running. Starting Redis...${NC}"
    redis-server --daemonize yes
    sleep 2
    if redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis started successfully${NC}"
    else
        echo -e "${RED}❌ Failed to start Redis. Please start it manually: redis-server${NC}"
    fi
fi
echo ""

# Function to start a service
start_service() {
    local service_name=$1
    local service_path=$2
    local port=$3
    
    echo -e "${BLUE}Starting ${service_name} on port ${port}...${NC}"
    
    if [ -d "$service_path" ]; then
        cd "$service_path"
        
        if [ ! -f ".env" ]; then
            echo -e "${YELLOW}⚠️  No .env file found. Copying from .env.example...${NC}"
            if [ -f ".env.example" ]; then
                cp .env.example .env
                echo -e "${YELLOW}⚠️  Please update .env file with your configuration${NC}"
            fi
        fi
        
        # Start service in background
        npm start > "../${service_name}.log" 2>&1 &
        local pid=$!
        
        # Wait a bit and check if process is still running
        sleep 2
        if ps -p $pid > /dev/null; then
            echo -e "${GREEN}✅ ${service_name} started (PID: $pid)${NC}"
            echo "$pid" > "../${service_name}.pid"
        else
            echo -e "${RED}❌ Failed to start ${service_name}. Check ${service_name}.log for errors${NC}"
        fi
        
        cd - > /dev/null
    else
        echo -e "${RED}❌ Directory ${service_path} not found${NC}"
    fi
    
    echo ""
}

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start all services
start_service "user-service" "${SCRIPT_DIR}/user-service" 3000
start_service "contact-service" "${SCRIPT_DIR}/Contact Service" 3001
start_service "template-service" "${SCRIPT_DIR}/template-service" 3003
start_service "campaign-service" "${SCRIPT_DIR}/campaign-service" 3004
start_service "team-service" "${SCRIPT_DIR}/team-service" 3005
start_service "whatsapp-service" "${SCRIPT_DIR}/whatsapp-service" 3006

echo -e "${GREEN}✨ All services started!${NC}"
echo ""
echo "📊 Service Status:"
echo "  User Service:     http://localhost:3000/health"
echo "  Contact Service:  http://localhost:3001/health"
echo "  Template Service: http://localhost:3003/health"
echo "  Campaign Service: http://localhost:3004/health"
echo "  Team Service:     http://localhost:3005/health"
echo "  WhatsApp Service: http://localhost:3006/health"
echo ""
echo "📝 Logs are saved in the microservices directory:"
echo "  - user-service.log"
echo "  - contact-service.log"
echo "  - template-service.log"
echo "  - campaign-service.log"
echo "  - team-service.log"
echo "  - whatsapp-service.log"
echo ""
echo "🛑 To stop all services, run: ./stop.sh"
echo ""
