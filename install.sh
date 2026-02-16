#!/bin/bash

# Microservices Installation Script
# This script installs dependencies for all microservices

echo "🚀 Installing dependencies for all microservices..."
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to install dependencies for a service
install_service() {
    local service_name=$1
    local service_path=$2
    
    echo -e "${BLUE}📦 Installing dependencies for ${service_name}...${NC}"
    
    if [ -d "$service_path" ]; then
        cd "$service_path"
        
        if [ -f "package.json" ]; then
            npm install
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✅ ${service_name} dependencies installed successfully${NC}"
            else
                echo -e "${RED}❌ Failed to install ${service_name} dependencies${NC}"
            fi
        else
            echo -e "${RED}❌ No package.json found in ${service_path}${NC}"
        fi
        
        cd - > /dev/null
    else
        echo -e "${RED}❌ Directory ${service_path} not found${NC}"
    fi
    
    echo ""
}

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Install dependencies for each service
install_service "User Service" "${SCRIPT_DIR}/user-service"
install_service "Contact Service" "${SCRIPT_DIR}/Contact Service"
install_service "Template Service" "${SCRIPT_DIR}/template-service"
install_service "Campaign Service" "${SCRIPT_DIR}/campaign-service"
install_service "Team Service" "${SCRIPT_DIR}/team-service"
install_service "WhatsApp Service" "${SCRIPT_DIR}/whatsapp-service"

echo -e "${GREEN}✨ All installations complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure .env files for each service (copy from .env.example)"
echo "2. Create databases using schema.sql files"
echo "3. Start Redis server: redis-server"
echo "4. Start services: cd <service-name> && npm start"
echo ""
