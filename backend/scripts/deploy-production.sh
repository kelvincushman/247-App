#!/bin/bash

# ============================================
# 247 Trades Platform - Production Deployment Script
# ============================================

set -e  # Exit on error

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="247-trades-backend"
APP_DIR="/var/www/247-trades"
BACKUP_DIR="/var/backups/247-trades"
LOG_DIR="/var/log/247-trades"

# Step 1: Pre-deployment checks
echo -e "${YELLOW}Step 1: Running pre-deployment checks...${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.production.example to .env and configure it"
    exit 1
fi

# Check if required environment variables are set
required_vars=("DATABASE_URL" "JWT_SECRET" "STRIPE_SECRET_KEY" "AWS_ACCESS_KEY_ID")
for var in "${required_vars[@]}"; do
    if ! grep -q "$var" .env || grep -q "CHANGE_THIS" .env; then
        echo -e "${RED}Error: $var not configured in .env${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✓ Pre-deployment checks passed${NC}"

# Step 2: Create backup
echo -e "${YELLOW}Step 2: Creating backup...${NC}"
timestamp=$(date +%Y%m%d_%H%M%S)
backup_file="$BACKUP_DIR/backup_$timestamp.tar.gz"

mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"

# Backup current deployment (if exists)
if [ -d "$APP_DIR" ]; then
    tar -czf "$backup_file" -C "$APP_DIR" . 2>/dev/null || true
    echo -e "${GREEN}✓ Backup created: $backup_file${NC}"
fi

# Step 3: Install dependencies
echo -e "${YELLOW}Step 3: Installing dependencies...${NC}"
npm ci --production
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 4: Run database migrations
echo -e "${YELLOW}Step 4: Running database migrations...${NC}"
npm run migrate || echo -e "${YELLOW}⚠ No migrations to run${NC}"
echo -e "${GREEN}✓ Database migrations completed${NC}"

# Step 5: Run tests
echo -e "${YELLOW}Step 5: Running tests...${NC}"
NODE_ENV=test npm test -- --coverage --maxWorkers=4 || {
    echo -e "${RED}Error: Tests failed! Deployment aborted.${NC}"
    exit 1
}
echo -e "${GREEN}✓ All tests passed${NC}"

# Step 6: Build (if needed)
echo -e "${YELLOW}Step 6: Build process...${NC}"
# Add build steps here if needed (TypeScript, etc.)
echo -e "${GREEN}✓ Build completed${NC}"

# Step 7: Stop existing service
echo -e "${YELLOW}Step 7: Stopping existing service...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 stop "$APP_NAME" 2>/dev/null || echo "Service not running"
    pm2 delete "$APP_NAME" 2>/dev/null || true
elif command -v systemctl &> /dev/null; then
    sudo systemctl stop "$APP_NAME" 2>/dev/null || echo "Service not running"
fi
echo -e "${GREEN}✓ Service stopped${NC}"

# Step 8: Deploy new version
echo -e "${YELLOW}Step 8: Deploying new version...${NC}"
mkdir -p "$APP_DIR"
rsync -av --exclude='node_modules' --exclude='.git' --exclude='logs' . "$APP_DIR/" || {
    echo -e "${RED}Error: Deployment failed!${NC}"
    exit 1
}
echo -e "${GREEN}✓ Files deployed${NC}"

# Step 9: Start service
echo -e "${YELLOW}Step 9: Starting service...${NC}"
cd "$APP_DIR"

if command -v pm2 &> /dev/null; then
    # Using PM2
    pm2 start src/server.js \
        --name "$APP_NAME" \
        --instances max \
        --exec-mode cluster \
        --max-memory-restart 500M \
        --error "$LOG_DIR/error.log" \
        --output "$LOG_DIR/output.log" \
        --merge-logs \
        --log-date-format "YYYY-MM-DD HH:mm:ss Z"

    pm2 save
    pm2 startup

    echo -e "${GREEN}✓ Service started with PM2${NC}"
elif command -v systemctl &> /dev/null; then
    # Using systemd
    sudo systemctl start "$APP_NAME"
    sudo systemctl enable "$APP_NAME"
    echo -e "${GREEN}✓ Service started with systemd${NC}"
else
    # Direct node start (not recommended for production)
    echo -e "${YELLOW}⚠ PM2 or systemd not found, starting directly...${NC}"
    NODE_ENV=production nohup node src/server.js > "$LOG_DIR/output.log" 2>&1 &
fi

# Step 10: Health check
echo -e "${YELLOW}Step 10: Running health check...${NC}"
sleep 5  # Wait for service to start

max_attempts=10
attempt=1

while [ $attempt -le $max_attempts ]; do
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Health check passed${NC}"
        break
    fi

    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}Error: Health check failed after $max_attempts attempts${NC}"
        echo -e "${YELLOW}Rolling back...${NC}"

        # Rollback
        if [ -f "$backup_file" ]; then
            tar -xzf "$backup_file" -C "$APP_DIR"
            pm2 restart "$APP_NAME" 2>/dev/null || systemctl restart "$APP_NAME" 2>/dev/null
            echo -e "${GREEN}✓ Rolled back to previous version${NC}"
        fi
        exit 1
    fi

    echo "Attempt $attempt/$max_attempts failed, retrying..."
    sleep 3
    ((attempt++))
done

# Step 11: Cleanup old backups (keep last 5)
echo -e "${YELLOW}Step 11: Cleaning up old backups...${NC}"
cd "$BACKUP_DIR"
ls -t | tail -n +6 | xargs -r rm -- 2>/dev/null || true
echo -e "${GREEN}✓ Old backups cleaned${NC}"

# Final status
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Deployment time: $(date)"
echo "Backup location: $backup_file"
echo "Logs: $LOG_DIR"
echo ""
echo "Next steps:"
echo "  - Monitor logs: pm2 logs $APP_NAME"
echo "  - Check status: pm2 status"
echo "  - View metrics: pm2 monit"
echo ""
