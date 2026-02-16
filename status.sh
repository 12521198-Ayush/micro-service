#!/bin/bash

# Check status of all microservices

echo "📊 Microservices Status Check"
echo "=============================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Function to check if a service is responding
check_service() {
    local service_name=$1
    local port=$2
    
    if curl -s --max-time 2 "http://localhost:${port}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${service_name}${NC} - http://localhost:${port}"
    else
        echo -e "${RED}❌ ${service_name}${NC} - Not responding on port ${port}"
    fi
}

# Check Redis
echo -e "${BLUE}Redis:${NC}"
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis is not running${NC}"
    echo -e "   Start with: ${YELLOW}redis-server${NC}"
fi

echo ""
echo -e "${BLUE}Services:${NC}"
check_service "User Service     " 3000
check_service "Contact Service  " 3001
check_service "Template Service " 3003
check_service "Campaign Service " 3004
check_service "Team Service     " 3005
check_service "WhatsApp Service " 3006

echo ""
echo -e "${BLUE}Running Processes:${NC}"
SERVICE_COUNT=$(ps aux | grep "node src/app.js" | grep -v grep | wc -l | tr -d ' ')
if [ "$SERVICE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}${SERVICE_COUNT} service(s) running${NC}"
    ps aux | grep "node src/app.js" | grep -v grep | awk '{print "  PID: " $2 " - " $11 " " $12 " " $13}'
else
    echo -e "${YELLOW}No services running${NC}"
    echo -e "Start services with: ${BLUE}./start.sh${NC}"
fi

echo ""
