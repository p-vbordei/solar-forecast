# Solar Forecast Platform - Quick Start Guide

## 🚀 Quick Start (3 Steps)

### Step 1: Start Database
```bash
# Ensure PostgreSQL is running
# If not installed: brew install postgresql@14 && brew services start postgresql@14
psql -U postgres -c "SELECT 1;" # Test connection
```

### Step 2: Start Python Worker (Terminal 1)
```bash
cd python-worker
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001
# Should see: "Uvicorn running on http://0.0.0.0:8001"
```

### Step 3: Start SvelteKit (Terminal 2)
```bash
cd /Users/vladbordei/Documents/Development/solar
npm run dev
# Should see: "VITE ready" and "Local: http://localhost:5173/"
```

**✅ System Ready!** Open http://localhost:5173 in your browser

---

## 📁 Project Structure

```
solar/
├── src/                    # SvelteKit Application
│   ├── routes/            # Pages and API routes
│   │   └── api/           # REST API endpoints (Controllers)
│   └── lib/
│       └── server/
│           ├── services/  # Business logic
│           ├── repositories/ # Database queries (Prisma)
│           └── database.ts # Prisma client
│
├── python-worker/         # Python ML Microservice
│   └── app/
│       └── modules/       # ML modules (forecast, weather, etc.)
│
└── prisma/
    └── schema.prisma      # Database schema
```

---

## 🏗️ Architecture Summary

```
Browser → SvelteKit (5173) → Service Layer → Repository (Prisma) → PostgreSQL
                            ↓
                      Python Worker (8001)
                      (ML/Analytics only)
```

### Key Points:
- **SvelteKit**: Handles ALL business logic and database operations
- **Python Worker**: ONLY for ML predictions and analytics
- **Database**: Accessed ONLY through Prisma in SvelteKit

---

## 🛠️ Common Commands

### Database
```bash
npx prisma studio          # Visual database browser
npx prisma db push        # Sync schema with database
npx prisma generate       # Regenerate Prisma client
```

### Development
```bash
npm run dev               # Start SvelteKit
npm run build            # Build for production
npm run preview          # Preview production build
```

### Testing
```bash
node test-system.js       # Run system tests
curl http://localhost:5173/api/locations  # Test API
curl http://localhost:8001/health        # Test Python worker
```

---

## 🔍 Troubleshooting

### Problem: "Database connection failed"
```bash
# Check PostgreSQL is running
pg_isready
# If not: brew services start postgresql@14

# Check database exists
psql -U postgres -l | grep solar_forecast
# If not: psql -U postgres -c "CREATE DATABASE solar_forecast;"
```

### Problem: "Python worker not responding"
```bash
# Check if port 8001 is in use
lsof -i :8001
# Kill if needed: kill -9 <PID>

# Restart Python worker
cd python-worker
uv sync  # Install dependencies
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### Problem: "Prisma client errors"
```bash
# Regenerate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Check .env file has correct DATABASE_URL
cat .env | grep DATABASE_URL
```

---

## 🌟 Key Files to Know

| File | Purpose |
|------|---------|
| `src/routes/api/locations/+server.ts` | Location API controller |
| `src/lib/server/services/location.service.ts` | Business logic |
| `src/lib/server/repositories/location.repository.ts` | Database queries |
| `prisma/schema.prisma` | Database schema |
| `.env` | Environment variables |
| `python-worker/app/main.py` | Python worker entry |

---

## 📝 Development Workflow

1. **Making API Changes**:
   - Edit controller in `src/routes/api/`
   - Update service in `src/lib/server/services/`
   - Modify repository if needed

2. **Database Changes**:
   - Edit `prisma/schema.prisma`
   - Run `npx prisma db push`
   - Run `npx prisma generate`

3. **Adding ML Features**:
   - Add endpoint in Python worker
   - Call from SvelteKit service layer
   - Never access DB from Python

---

## 🎯 Current Phase Status

- ✅ **Phase 1**: Basic UI and dashboard
- ✅ **Phase 2**: Database + CSR Architecture
- 🔄 **Phase 3**: ML models and real-time updates (next)
- ⏳ **Phase 4**: Authentication (deferred)

---

## 📞 Need Help?

1. Check `ARCHITECTURE.md` for detailed architecture
2. Check `SYSTEM_STATUS.md` for current system state
3. Run `node test-system.js` to diagnose issues
4. Check logs:
   - SvelteKit: Terminal running `npm run dev`
   - Python: Terminal running `uvicorn`
   - Database: `npx prisma studio`

---

## 🚦 Status Check

Run this to verify everything is working:
```bash
node test-system.js
```

Expected output:
```
✅ Database connected successfully
✅ Prisma schema test passed
✅ Python worker is healthy
✅ SvelteKit API working
✅ CSR Architecture verified
🎉 System is fully operational!
```