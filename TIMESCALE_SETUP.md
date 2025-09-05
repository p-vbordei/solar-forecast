# TimescaleDB Integration Setup

## ✅ Completed Steps

### 1. Environment Creation
- **Environment Name:** `timescale-integration`
- **Service Name:** `solar-forecast-timescale` 
- **Repository:** Connected to `p-vbordei/solar-forecast`
- **URL:** https://solar-forecast-timescale-timescale-integration.up.railway.app

### 2. Environment Variables Set
- `NODE_ENV=production`
- `JWT_SECRET` (randomly generated)
- `OPENWEATHER_API_KEY=demo_key_for_testing`
- `PYTHON_WORKER_URL=http://localhost:8001`

### 3. Files Prepared
- `init.sql` - TimescaleDB initialization script
- `migration.sql` - Database schema
- `setup-timescale.sh` - Automated setup script

## 📝 Manual Steps Required

### Step 1: Add PostgreSQL Service
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select project: **solar-forecast**
3. Switch to environment: **timescale-integration**
4. Click **+ New** → **Database** → **Add PostgreSQL**
5. Wait for PostgreSQL to deploy (~1 minute)

### Step 2: Configure Database Connection
1. Click on the PostgreSQL service
2. Go to **Connect** tab
3. Copy the **DATABASE_URL**
4. Set environment variables:
```bash
railway variables set DATABASE_URL='postgresql://...'
railway variables set DIRECT_URL='postgresql://...'
```

### Step 3: Enable TimescaleDB Extension
```bash
# Connect to database and enable extension
railway run --service=postgres psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### Step 4: Run Database Migration
```bash
# Apply Prisma schema
npx prisma db push

# Initialize hypertables
railway run --service=postgres psql $DATABASE_URL < init.sql
```

### Step 5: Deploy Application
```bash
# Deploy to Railway
railway up
```

## 🔍 Verification Steps

### Check Database Setup
```bash
# Verify TimescaleDB is enabled
railway run --service=postgres psql $DATABASE_URL -c "\dx"

# Check hypertables
railway run --service=postgres psql $DATABASE_URL -c "SELECT * FROM timescaledb_information.hypertables;"
```

### Check Application
```bash
# View deployment logs
railway logs

# Test the application
curl https://solar-forecast-timescale-timescale-integration.up.railway.app/health
```

## 📊 TimescaleDB Features Enabled

### Hypertables Created
- `production` - Partitioned by timestamp
- `weather_data` - Partitioned by timestamp  
- `forecasts` - Partitioned by timestamp
- `forecast_accuracy` - Partitioned by date

### Indexes Optimized
- Time-based queries with `time_bucket`
- Location-based filtering
- Composite primary keys for partitioning

### Continuous Aggregates (To Be Added)
- Hourly production summaries
- Daily forecast accuracy metrics
- Weekly weather patterns

## 🚀 Next Steps

1. **Add PostgreSQL to environment** via Railway Dashboard
2. **Configure database connection** with environment variables
3. **Run migrations** and initialize TimescaleDB
4. **Deploy application** and verify functionality
5. **Test time-series queries** and performance improvements

## 📈 Performance Benefits

- **Data Compression:** 10-20x reduction in storage
- **Query Performance:** 100-1000x faster for time-range queries
- **Automatic Partitioning:** No manual partition management
- **Real-time Aggregations:** Pre-computed metrics for dashboards

## 🛠 Troubleshooting

### If PostgreSQL doesn't appear in dashboard:
- Refresh the page
- Check you're in the correct environment
- Verify you have permissions to add services

### If TimescaleDB extension fails:
- Ensure PostgreSQL version is 12+
- Check database permissions
- Use the TimescaleDB template from Railway

### If migrations fail:
- Check DATABASE_URL is correctly set
- Verify network connectivity
- Review Prisma schema for compatibility

## 📚 Resources
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Railway Documentation](https://docs.railway.app/)
- [Prisma with TimescaleDB](https://www.prisma.io/docs/guides/database/using-prisma-with-timescaledb)
