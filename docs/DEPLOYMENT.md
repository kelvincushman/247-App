# Deployment Guide - 247 Trades Platform

Complete deployment guide for both backend and mobile applications.

## Architecture Overview

```
                   ┌─────────────────┐
                   │   Mobile Apps   │
                   │  (iOS/Android)  │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │   Load Balancer │
                   └────────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼─────┐      ┌────▼─────┐      ┌────▼─────┐
    │ API Node │      │ API Node │      │ API Node │
    │ Server 1 │      │ Server 2 │      │ Server 3 │
    └────┬─────┘      └────┬─────┘      └────┬─────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼─────┐      ┌────▼─────┐      ┌────▼─────┐
    │PostgreSQL│      │  Redis   │      │   S3     │
    │ Database │      │  Cache   │      │ Storage  │
    └──────────┘      └──────────┘      └──────────┘
```

## Prerequisites

### Backend Server Requirements
- Ubuntu 20.04+ or similar Linux distribution
- Node.js 16+ installed
- PostgreSQL 13+ installed
- Nginx for reverse proxy
- PM2 for process management
- SSL certificate (Let's Encrypt)
- Domain name configured

### Third-party Services
- Stripe account (live keys)
- AWS account (S3 for file storage)
- Email service (Gmail/SendGrid)
- Firebase account (for push notifications)

## Backend Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install Nginx
sudo apt install nginx -y

# Install PM2
sudo npm install -g pm2

# Install certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE 247_trades;
CREATE USER trades_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE 247_trades TO trades_user;

# Enable PostGIS extension
\c 247_trades
CREATE EXTENSION IF NOT EXISTS postgis;

# Exit
\q
```

### 3. Application Deployment

```bash
# Create app directory
sudo mkdir -p /var/www/247-trades-api
sudo chown $USER:$USER /var/www/247-trades-api

# Clone repository
cd /var/www/247-trades-api
git clone <repository-url> .

# Install dependencies
npm ci --production

# Create .env file
nano .env
```

Production `.env` file:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
API_URL=https://api.247trades.com

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=247_trades
DB_USER=trades_user
DB_PASSWORD=secure_password_here
DB_DIALECT=postgres

# JWT Configuration
JWT_SECRET=generate_secure_random_string_here
JWT_EXPIRY=7d
JWT_REFRESH_SECRET=generate_another_secure_random_string
JWT_REFRESH_EXPIRY=30d

# Stripe Configuration (LIVE KEYS)
STRIPE_SECRET_KEY=sk_live_your_live_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_live_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PLATFORM_FEE_PERCENT=15

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-west-2
AWS_S3_BUCKET=247-trades-production

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=247 Trades <noreply@247trades.com>

# Socket.io Configuration
SOCKET_CORS_ORIGIN=*
SOCKET_PING_TIMEOUT=60000
SOCKET_PING_INTERVAL=25000

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_FILE=/var/log/247-trades/app.log
```

### 4. Database Migrations

```bash
# Run migrations
npm run db:migrate

# Seed initial data (if needed)
npm run db:seed
```

### 5. PM2 Process Management

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: '247-trades-api',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
    },
    error_file: '/var/log/247-trades/error.log',
    out_file: '/var/log/247-trades/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
  }],
};
```

Start application:

```bash
# Create log directory
sudo mkdir -p /var/log/247-trades
sudo chown $USER:$USER /var/log/247-trades

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it gives you

# Monitor
pm2 monit
```

### 6. Nginx Configuration

Create `/etc/nginx/sites-available/247-trades`:

```nginx
# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream servers
upstream api_backend {
    least_conn;
    server localhost:3000;
    # Add more servers for load balancing
    # server localhost:3001;
    # server localhost:3002;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.247trades.com;

    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.247trades.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.247trades.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.247trades.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client body size limit (for file uploads)
    client_max_body_size 20M;

    # Logging
    access_log /var/log/nginx/247-trades-access.log;
    error_log /var/log/nginx/247-trades-error.log;

    # API endpoints
    location /api {
        limit_req zone=api_limit burst=20 nodelay;

        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket for Socket.io
    location /socket.io {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 86400;
    }

    # Webhooks (no rate limiting)
    location /webhooks {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check
    location /health {
        proxy_pass http://api_backend;
        access_log off;
    }

    # Static files (if serving any)
    location /uploads {
        alias /var/www/247-trades-api/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable site and restart Nginx:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/247-trades /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable on boot
sudo systemctl enable nginx
```

### 7. SSL Certificate

```bash
# Obtain SSL certificate
sudo certbot --nginx -d api.247trades.com

# Auto-renewal (certbot sets this up automatically)
# Test renewal
sudo certbot renew --dry-run
```

### 8. Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.247trades.com/webhooks/stripe`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.succeeded`
   - `transfer.created`
   - `transfer.failed`
   - `payout.paid`
   - `payout.failed`
   - `account.updated`
4. Copy webhook secret to `.env` file

### 9. Monitoring and Logs

```bash
# View PM2 logs
pm2 logs

# View Nginx access logs
sudo tail -f /var/log/nginx/247-trades-access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/247-trades-error.log

# View application logs
tail -f /var/log/247-trades/app.log

# PM2 monitoring
pm2 monit

# System monitoring
htop
```

## Mobile App Deployment

### iOS Deployment

#### 1. Prepare for App Store

Update `app.json`:

```json
{
  "expo": {
    "name": "247 Trades",
    "slug": "247-trades",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.247trades.app",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "We need your location to show nearby jobs and for GPS tracking during active jobs.",
        "NSCameraUsageDescription": "We need camera access to take photos of jobs.",
        "NSPhotoLibraryUsageDescription": "We need photo library access to upload job images."
      }
    }
  }
}
```

#### 2. Build with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

#### 3. App Store Connect

1. Create app in App Store Connect
2. Fill in app information
3. Add screenshots
4. Submit for review

### Android Deployment

#### 1. Prepare for Google Play

Update `app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.247trades.app",
      "versionCode": 1,
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

#### 2. Build with EAS

```bash
# Build for Android
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

#### 3. Google Play Console

1. Create app in Google Play Console
2. Fill in store listing
3. Add screenshots
4. Upload APK/AAB
5. Submit for review

## Environment Configuration

### Production API URL

Update mobile app to use production API:

File: `src/api/client.js`

```javascript
const API_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://api.247trades.com/api';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});
```

## Database Backup

### Automated Backups

Create backup script `/usr/local/bin/backup-247-trades.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/247-trades"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="247_trades"
DB_USER="trades_user"

mkdir -p $BACKUP_DIR

# Backup database
pg_dump -U $DB_USER -Fc $DB_NAME > $BACKUP_DIR/db_backup_$DATE.dump

# Upload to S3
aws s3 cp $BACKUP_DIR/db_backup_$DATE.dump s3://247-trades-backups/

# Keep only last 7 days locally
find $BACKUP_DIR -name "db_backup_*.dump" -mtime +7 -delete

echo "Backup completed: db_backup_$DATE.dump"
```

Set up cron job:

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-247-trades.sh

# Add to crontab
sudo crontab -e

# Add this line (backup daily at 2 AM)
0 2 * * * /usr/local/bin/backup-247-trades.sh >> /var/log/247-trades-backup.log 2>&1
```

### Restore from Backup

```bash
# Stop application
pm2 stop all

# Restore database
pg_restore -U trades_user -d 247_trades -c /var/backups/247-trades/db_backup_YYYYMMDD_HHMMSS.dump

# Restart application
pm2 start all
```

## Security Checklist

- [ ] SSL certificate installed and auto-renewal configured
- [ ] Firewall configured (UFW or iptables)
- [ ] Database access restricted to localhost
- [ ] Strong passwords for all services
- [ ] JWT secrets are random and secure
- [ ] Stripe live keys configured correctly
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] All dependencies updated
- [ ] PM2 cluster mode enabled
- [ ] Logs rotation configured
- [ ] Automated backups running
- [ ] Monitoring alerts set up

## Monitoring

### Setup Monitoring

Install monitoring tools:

```bash
# Install New Relic (optional)
npm install newrelic

# Or use PM2 Plus
pm2 link <secret> <public>
```

### Health Checks

Set up external monitoring:
- UptimeRobot
- Pingdom
- StatusCake

Monitor these endpoints:
- `https://api.247trades.com/health`
- `https://api.247trades.com/api/auth/health` (if exists)

## Scaling

### Horizontal Scaling

Add more API servers:

1. Set up additional server instances
2. Install and configure same as first server
3. Update Nginx upstream configuration:

```nginx
upstream api_backend {
    least_conn;
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
    server 10.0.1.12:3000;
}
```

### Redis for Session/Cache

```bash
# Install Redis
sudo apt install redis-server -y

# Configure Redis
sudo nano /etc/redis/redis.conf

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

Update application to use Redis for Socket.io scaling (see SOCKET_SERVER.md).

## CI/CD Pipeline

Example GitHub Actions workflow:

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /var/www/247-trades-api
            git pull origin main
            npm ci --production
            npm run db:migrate
            pm2 reload ecosystem.config.js
```

## Rollback Procedure

If deployment fails:

```bash
# View commit history
git log --oneline

# Rollback to previous commit
git reset --hard <previous-commit-hash>

# Reinstall dependencies
npm ci --production

# Reload application
pm2 reload all

# If database migration needed
npm run db:migrate:undo
```

## Support and Maintenance

### Regular Tasks

- **Daily**: Check logs for errors
- **Weekly**: Review server resources (CPU, RAM, Disk)
- **Monthly**: Update dependencies, review security patches
- **Quarterly**: Review and optimize database performance

### Emergency Contacts

Keep contact information for:
- Server hosting provider
- Domain registrar
- Stripe support
- AWS support

## Next Steps

1. Set up monitoring and alerts
2. Configure automated backups
3. Test disaster recovery procedures
4. Set up staging environment
5. Document runbook for common issues
6. Plan for scaling strategy
