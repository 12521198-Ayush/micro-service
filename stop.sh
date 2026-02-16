#!/bin/bash

# Stop All Microservices

echo "🛑 Stopping All Microservices..."
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file="${SCRIPT_DIR}/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid
            echo -e "${GREEN}✅ Stopped ${service_name} (PID: $pid)${NC}"
        else
            echo -e "${RED}⚠️  ${service_name} process not found (PID: $pid)${NC}"
        fi
        rm "$pid_file"
    else
        echo -e "${RED}⚠️  No PID file found for ${service_name}${NC}"
    fi
}

# Stop all services
stop_service "user-service"
stop_service "contact-service"
stop_service "template-service"
stop_service "campaign-service"
stop_service "team-service"
stop_service "whatsapp-service"

echo ""
echo -e "${GREEN}✨ All services stopped!${NC}"
echo ""
