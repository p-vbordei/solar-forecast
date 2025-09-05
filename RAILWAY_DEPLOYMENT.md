# Solar Forecast Platform - Railway Deployment Guide

Complete guide for deploying the Solar Forecast Platform to Railway.

## Prerequisites

- GitHub account with repository access
- Railway account ([sign up free](https://railway.app))
- Code pushed to GitHub repository

## Step 1: Prepare Repository

Ensure these files exist in your repository root:

### ✅ Required Files (Already Created)

- `railway.json` - Railway configuration
- `Dockerfile` - Container build settings
- `package.json` - With `start` script
- `src/routes/health/+server.ts` - Health check endpoint
- `svelte.config.js` - Using Node adapter

## Step 2: Deploy to Railway

### Option A: Deploy via GitHub (Recommended)

1. **Login to Railway**
   ```
   https://railway.app/dashboard
   ```

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Authorize Railway to access GitHub
   - Select your `solar` repository

3. **Railway Auto-Detection**
   - Railway will detect the configuration files
   - Build will start automatically using Dockerfile

### Option B: Deploy via CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project (from project root)
railway init

# Deploy
railway up
```

## Step 3: Configure Database

### TimescaleDB Setup (Required for Time-Series Data)

**Method 1: Railway TimescaleDB Template (Recommended)**
1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy a Template"**  
3. Search for "TimescaleDB" and select the official template
4. Deploy using `timescale/timescaledb:latest-pg16` image
5. Railway automatically provides:
   - `DATABASE_URL` - Full connection string for Prisma
   - `POSTGRES_DB=railway` - Database name
   - `POSTGRES_USER=postgres` - Username
   - `POSTGRES_PASSWORD` - Auto-generated secure password
   - `POSTGRES_HOST` - Internal hostname
   - `POSTGRES_PORT=5432` - Port

**Method 2: Custom TimescaleDB Service**
```yaml
# Add this service to your Railway project
services:
  timescaledb:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_DB: solar_forecast
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - timescale_data:/var/lib/postgresql/data
    restart: always
```

**Method 3: PostgreSQL + TimescaleDB Extension**
1. Add PostgreSQL database in Railway
2. Connect via Railway CLI and enable TimescaleDB:
   ```sql
   -- Connect: railway connect
   CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
   SELECT timescaledb_version();
   ```

**⚠️ Important:** TimescaleDB is required for optimal time-series performance with forecast and production data. Regular PostgreSQL will work but won't have the time-series optimizations.

### Manual Database (if needed)

If using external database, add in Railway settings:
```
DATABASE_URL=postgresql://user:password@host:5432/database_name
DIRECT_URL=postgresql://user:password@host:5432/database_name
```

## Step 4: Environment Variables

In Railway project settings → Variables, add:

### Required Variables
```bash
NODE_ENV=production
JWT_SECRET=<generate-32-char-random-string>
OPENWEATHER_API_KEY=<your-openweather-api-key>

# TimescaleDB Connection (auto-provided by Railway TimescaleDB service)
DATABASE_URL=${{TimescaleDB.DATABASE_URL}}
DIRECT_URL=${{TimescaleDB.DATABASE_URL}}
```

### Optional Variables
```bash
# Python worker (if deployed separately)
PYTHON_WORKER_URL=https://your-python-worker.railway.app

# Public API URL (auto-set by Railway)
PUBLIC_API_URL=https://your-app.railway.app

# TimescaleDB Public URL (if external connections needed)
DATABASE_PUBLIC_URL=${{TimescaleDB.DATABASE_PUBLIC_URL}}
```

### Generate Secure Keys
```bash
# Generate random secrets
openssl rand -hex 32
```

## Step 5: Deploy Python Worker (Optional)

If you want to deploy the Python worker separately:

1. **Create New Railway Service**
   - In same project, click "New Service"
   - Connect same GitHub repository
   - Set root directory to `python-worker`

2. **Python Worker Environment Variables**
   ```bash
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   OPENWEATHER_API_KEY=<same-as-main-app>
   ```

## Step 6: Deployment Configuration

Railway uses these files automatically:

### `railway.json` (Already configured)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30
  }
}
```

### `Dockerfile` (Already configured)
- Multi-stage Node.js build
- Prisma client generation
- Health check endpoint
- Non-root user security

## Step 7: Deploy & Monitor

### Deployment Process

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Deploy Solar Forecast Platform to Railway"
   git push origin railway_deploy
   ```

2. **Automatic Deployment**
   - Railway detects push
   - Runs Docker build process
   - Deploys application
   - Runs health checks at `/health`

### Monitor Deployment

1. **View Logs**
   - Build logs during deployment
   - Runtime logs after deployment
   - Database connection logs

2. **Check Metrics**
   - Memory usage
   - CPU utilization
   - Response times

3. **Health Check**
   - Railway monitors `/health`
   - Auto-restarts on failure

## Step 8: Database Management

### Initial Data Setup

After first deployment, initialize the database:

```bash
# Connect via Railway CLI
railway run bash

# Run database migrations
npx prisma migrate deploy

# Generate Prisma client (if needed)
npx prisma generate

# Initialize TimescaleDB hypertables (IMPORTANT for time-series performance)
npm run db:init-timescale

# Seed database (if you have seed data)
npm run db:seed
```

### Database Migrations

For schema changes:

```bash
# Local development
npm run db:migrate

# Production (auto-runs on deploy via Dockerfile)
npm run db:deploy
```

## Step 9: Connect Services (If Using Separate Python Worker)

If you deployed the Python worker separately, connect them:

1. **Get Python Worker URL**
   - Go to Python worker service in Railway
   - Copy the public URL

2. **Update Main App Environment**
   ```bash
   PYTHON_WORKER_URL=https://your-python-worker.railway.app
   ```

## Step 10: Custom Domain (Optional)

1. Go to project settings → Domains
2. Add custom domain
3. Configure DNS:
   ```
   CNAME record: solar.your-domain.com → your-app.railway.app
   ```

## Troubleshooting

### Common Issues & Solutions

#### Build Failures
- **Check Node version**: Requires 18.x (specified in Dockerfile)
- **Missing dependencies**: Ensure all in package.json
- **Prisma issues**: Check DATABASE_URL is set

#### Database Connection
```bash
# Test connection
railway run npx prisma db push
```

#### Port Configuration
- Railway provides PORT automatically
- App uses: `process.env.PORT || 3000`

#### Memory Issues
- Default 512MB usually sufficient for this app
- Increase in Railway settings if needed

### Debug Commands

```bash
# View logs
railway logs

# Run commands in production env
railway run npx prisma studio
railway run npm run check

# Shell access
railway run bash
```

## Rollback Procedure

If deployment fails:

1. **Quick Rollback**
   - Click "Rollback" in Railway dashboard
   - Select previous working deployment

2. **Manual Rollback**
   ```bash
   git revert HEAD
   git push origin railway_deploy
   ```

## Production Checklist

Before going live:

- [ ] Set strong JWT_SECRET (32+ characters)
- [ ] Configure OPENWEATHER_API_KEY
- [ ] Verify database migrations work
- [ ] Test health check endpoint (`/health`)
- [ ] Configure custom domain (optional)
- [ ] Set up monitoring alerts
- [ ] Test all critical features:
  - [ ] Dashboard loads
  - [ ] Reports page works
  - [ ] Analysis page displays charts
  - [ ] Database connections stable
- [ ] Backup database
- [ ] Document admin procedures

## Architecture Overview

### Deployment Options

**Option 1: Single Service (Recommended for start)**
```
Railway Service 1: SvelteKit App + Python Worker
├── Frontend (SvelteKit)
├── API Routes (/src/routes/api/)
├── Database (TimescaleDB)
└── Python Worker (subprocess/integrated)
```

**Option 2: Microservices (Scalable)**
```
Railway Service 1: SvelteKit Frontend + API
Railway Service 2: Python Worker (FastAPI)
Railway Service 3: TimescaleDB Database
```

## Support Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Status](https://status.railway.app)
- [Community Discord](https://discord.gg/railway)

## Quick Reference

### URLs
- **Development**: http://localhost:5173
- **Railway App**: https://your-app.railway.app
- **Railway Dashboard**: https://railway.app/dashboard

### Key Commands
```bash
railway login              # Authenticate CLI
railway link              # Link to project
railway up                # Deploy
railway logs              # View logs
railway run [cmd]         # Run command in prod env
railway connect           # Connect to database
```

### Environment Variables
```bash
DATABASE_URL              # Auto-provided by TimescaleDB service
DIRECT_URL                # Same as DATABASE_URL for Prisma
DATABASE_PUBLIC_URL       # Public URL for external connections
PORT                      # Auto-provided by Railway (3000)
NODE_ENV                  # Set to "production"
JWT_SECRET                # Your secret key
OPENWEATHER_API_KEY       # Weather data API key
PUBLIC_API_URL            # Auto-set to Railway domain
PYTHON_WORKER_URL         # If using separate worker service

# TimescaleDB specific (auto-configured)
PGDATA                    # PostgreSQL data directory
PGHOST                    # Database host (private network)
PGPORT                    # Database port (5432)
PGUSER                    # Database username (railway)
PGDATABASE                # Database name (railway)
PGPASSWORD                # Auto-generated secure password
POSTGRES_DB               # Same as PGDATABASE
POSTGRES_USER             # Same as PGUSER
POSTGRES_PASSWORD         # Same as PGPASSWORD
```

### Solar Platform Specific

#### Key Features to Test
1. **Dashboard** - Real-time metrics display
2. **Reports** - 8 report types with filtering
3. **Analysis** - Forecast visualization with ECharts
4. **Health Check** - `/health` endpoint monitoring
5. **Database** - Prisma ORM with TimescaleDB

#### Performance Expectations
- **Build Time**: 2-3 minutes (includes Prisma generation)
- **Cold Start**: ~5 seconds
- **Memory Usage**: 200-400MB typical
- **Database**: Handles 10 concurrent users easily

---

**Deployment typically takes 3-5 minutes. Railway handles all infrastructure automatically.**

## Post-Deployment Verification

After successful deployment, verify these endpoints:

1. **Main App**: `https://your-app.railway.app/`
2. **Health Check**: `https://your-app.railway.app/health`
3. **API Routes**: `https://your-app.railway.app/api/locations`
4. **Reports**: `https://your-app.railway.app/reports`
5. **Analysis**: `https://your-app.railway.app/analysis`

All should return proper responses without errors.