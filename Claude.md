# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

AM NEVOIE CA ACESTE ELEMENTE DE DESIGN SA FIE IMPLEMENTATE PRIN TAILWIND CSS
# ICONITELE VOR FI DE TIP LINEART / VECTORIALA SI NU VOR FI ICONITE DE TIP SVG


#### **🎨 Color Palette**
Primary colors for the futuristic energy trading interface:

```css
/* Core Brand Colors */
--color-dark-petrol: #003135;    /* Deep petrol blue (main background) */
--color-teal-dark: #024950;      /* Teal blue (secondary background) */
--color-alert-red: #DC2626;      /* Vibrant red for alerts and warnings */
--color-alert-orange: #EA580C;   /* Orange for medium alerts */
--color-cyan: #0FA4AF;           /* Cyan teal (primary highlights) */
--color-soft-blue: #AFDDE5;      /* Soft light blue (text on dark) */
```

**Usage Guidelines:**
- **Backgrounds**: Use `#003135` or `#024950` for dark sections
- **Primary Text**: Use `#AFDDE5` or white on dark backgrounds
- **Interactive Elements**: Use `#0FA4AF` for links, buttons, active states
- **Alert Colors**: Use `#DC2626` for critical/high alerts, `#EA580C` for medium alerts
- **Cards/Panels**: Dark petrol with subtle borders in soft blue

#### **🔤 Typography**
Modern, technical font stack:

```css
/* Font Stack */
--font-primary: 'Inter', -apple-system, sans-serif;
--font-mono: 'Roboto Mono', 'SF Mono', monospace;

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
```

#### **✨ Design Principles**

1. **High Contrast**: Ensure all text has sufficient contrast against dark backgrounds
2. **Futuristic Aesthetic**: Clean lines, subtle gradients, tech-inspired elements
3. **Energy Focus**: Use cyan/teal for energy-related metrics and visualizations
4. **Minimalist**: Reduce visual clutter, focus on data clarity
5. **Responsive**: Mobile-first approach with fluid typography

#### **🏗️ Component Patterns**

**Cards:**
```css
.card-dark {
  background: linear-gradient(135deg, #003135 0%, #024950 100%);
  border: 1px solid rgba(175, 221, 229, 0.2);
  backdrop-filter: blur(10px);
}
```

**Buttons:**
```css
.btn-primary {
  background: #0FA4AF;
  color: #003135;
  font-weight: 600;
}

.btn-primary:hover {
  background: #AFDDE5;
  transform: translateY(-1px);
}
```

**Data Display:**
- Use monospace font for numbers and codes
- Cyan highlights for positive values
- Brick red for negative/warning values
- Soft blue for neutral information

### **Legacy Color System (DEPRECATED)**
The following colors should be phased out:

#### **Primary Brand Colors** (Main UI Elements)
- `primary-50` to `primary-950` - Professional blue scale for buttons, links, active states
- Primary brand color: `primary-600` (#0284c7)

#### **Accent Colors** (Text & Backgrounds)
- `accent-50` to `accent-950` - Sophisticated gray-blue for text, borders, backgrounds
- Main text: `accent-900`, Secondary text: `accent-600`, Borders: `accent-200`

#### **Semantic Colors**
- `success-*` - Green scale for positive states
- `warning-*` - Amber scale for warnings
- `danger-*` - Red scale for errors
- `neutral-*` - Pure gray scale for neutral elements

### **Required Component Classes**
Always use these pre-built classes from `app.css`:

#### **Buttons**
- `.btn-primary` - Main actions (blue background)
- `.btn-secondary` - Secondary actions (white with border)
- `.btn-success` - Positive actions (green)
- `.btn-warning` - Warning actions (amber)
- `.btn-danger` - Destructive actions (red)
- `.btn-ghost` - Minimal actions (no background)
- `.btn-outline` - Outlined primary style

#### **Form Elements**
- `.input` - Text inputs with brand focus states
- `.select` - Dropdown selects with brand styling
- `.textarea` - Textarea with brand styling
- `.label` - Form labels with brand typography

#### **Cards & Containers**
- `.card` - Standard white card with brand shadows
- `.card-elevated` - Card with stronger elevation
- `.card-accent` - Card with brand accent background
- `.card-success/.card-warning/.card-danger` - Semantic cards
- `.metric-card` - For displaying metrics/KPIs

#### **Status Elements**
- `.status-success/.status-warning/.status-danger/.status-info/.status-neutral/.status-active`

#### **Tables**
- `.table` - Complete table styling with brand colors
- `.table-row-hover` - Hover effects for table rows

#### **Navigation**
- `.nav-link` - Navigation item styling
- `.nav-link-active` - Active navigation state

### **Layout Utilities**
- `.page-container` - Max-width container with proper padding
- `.section-header` - Page section headers with brand styling
- `.content-header` - Content area headers
- `.divider` - Horizontal dividers with brand colors

### **Brand Guidelines Enforcement**
1. **Before making ANY frontend changes**, verify component exists in `app.css`
2. **If new styling needed**, extend existing classes or create new ones following brand patterns
3. **Never use** arbitrary colors - only use the brand color system
4. **Test visual consistency** across all pages after changes
5. **Follow existing patterns** seen in the dashboard, reports, and mandates pages

### **Quick Reference - Approved Colors Only:**
```css
/* Text Colors */
text-accent-900   /* Primary text */
text-accent-600   /* Secondary text */
text-accent-500   /* Muted text */

/* Background Colors */
bg-accent-50      /* Light page background */
bg-white          /* Card backgrounds */
bg-primary-50     /* Accent backgrounds */

/* Border Colors */
border-accent-200 /* Standard borders */
border-accent-300 /* Input borders */

/* Interactive Colors */
text-primary-600  /* Links */
bg-primary-600    /* Primary buttons */
```

**🚫 FORBIDDEN:** Never use `gray-*`, `blue-*`, `slate-*`, `zinc-*` or other non-brand colors.**

### **Brand Reference Files**
- **Color System**: `/frontend/tailwind.config.js` - Complete brand color definitions
- **Component Library**: `/frontend/src/app.css` - All approved component classes
- **Examples**:
  - `/frontend/src/routes/+page.svelte` - Dashboard (perfect brand implementation)
  - `/frontend/src/routes/reports/+page.svelte` - Reports page (brand compliant)
  - `/frontend/src/routes/mandates/+page.svelte` - Mandates page (brand compliant)

### **Brand Compliance Checklist**
Before any frontend commit, verify:
- [ ] No `gray-*`, `blue-*`, `indigo-*`, `slate-*`, `zinc-*` classes used
- [ ] All buttons use `.btn-*` classes
- [ ] All inputs use `.input`, `.select`, `.textarea` classes
- [ ] All cards use `.card*` classes
- [ ] All tables use `.table` class
- [ ] All text uses `text-accent-*` or `text-primary-*` colors
- [ ] All backgrounds use approved brand colors only
- [ ] Status elements use `.status-*` classes
- [ ] Navigation uses `.nav-link*` classes

**VIOLATION OF BRAND GUIDELINES WILL RESULT IN IMMEDIATE REJECTION OF CHANGES.**


## 🚧 **IMPLEMENTATION PRIORITY OVERRIDE**

**⚠️ AUTHENTICATION SYSTEM DEFERRED ⚠️**
- **Decision**: Skip JWT authentication implementation until final phase
- **Current**: Continue using hardcoded user IDs for development
- **Rationale**: Focus on core business functionality first
- **Timeline**: Authentication will be implemented as the very last step before production deployment

**Development Priority Order:**
1. ✅ ~~Authentication~~ - **DEFERRED TO END**
2. 🟡 **Market Data Integration** - Start here
3. 🟡 **Risk Engine Implementation** - Second priority
4. 🟠 **Reporting System** - Third priority
5. 🔴 **Authentication System** - Final step before production




## Architecture Overview

### Tech Stack Rationale
- **SvelteKit**: Full-stack framework with built-in API routes, simpler than React
- **Tailwind CSS**: Utility-first CSS, no runtime overhead
- **Prisma**: Type-safe database access, excellent DX
- **FastAPI**: High-performance Python API for analytics

  Correct Architecture:
  - SvelteKit: Full-stack framework with Controller/Service/Repository layers (using Prisma ORM)
  - Python Worker: Microservice for ML/analytics tasks only (called by SvelteKit backend)



Database is PostgreSQL
Implementation ( Deployment) will be done on Railway.

Tot ce tine de python se va instala folosind uv: UV (Uniform Version Manager) is an all-in-one, ultra-fast Python package and project manager developed by Astral, aiming to replace tools like pip, venv, pipx, and poetry with a single, faster solution written in Rust.
https://github.com/astral-sh/uv


Vom pune tot codul de python intr-un python worker, care va fi deci parte dintr-un **worker**.




# vei crea un logs.md in care iti vei nota prompturile ce ti-am cerut si ce ai incercat sa faci ca sa ai o evidenta

# For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.
# Pentru eficiență maximă → când sunt necesare operații independente, acestea trebuie executate în paralel, nu secvențial.

# ICONITELE VOR FI DE TIP LINEART / VECTORIALA SI NU VOR FI ICONITE DE TIP SVG


## !!!! FOARTE IMPORTNT !!!
VA FI FOLOSITA STRUCTURA CSR
1. Controller Layer: The Controller layer handles incoming HTTP requests, processes them, and returns the appropriate HTTP responses. It acts as an intermediary between the client and the service layer. Keep Controllers Thin: Controllers should only handle request validation and response generation. All business logic should reside in the Service layer.

2. Service Layer: The Service layer contains the business logic of the application. It processes the data received from the controller, performs necessary operations, and communicates with the repository layer to fetch or persist data.

3. Repository Layer: The Repository layer handles data access and persistence. It communicates with the database or other data sources, encapsulating the logic for querying, saving, and updating data.

Each layer has a specific responsibility, making the code easier to manage, test, and scale.

Aplicatia trebuie dimensionata pentru a gestiona:
- 10 utilizatori concurenti
- 100 de locuri pentru care se va face prognoza de productie solara
- 5 firme care vor fi conectate la aplicatie ( 10 utilizatori per firma, dar nu concurenti)




### Code Style for PYTHON
- **NO CLASSES** - Use functions and dictionaries
- Clear variable names
- Comprehensive docstrings
- Type hints where helpful
- Linear flow - avoid deep nesting

### Configuration Updates
1. Update client YAML for client-specific changes
2. Update `config.yaml` for system-wide changes
3. Add new env vars to `.env.example`

## 📊 IMPLEMENTATION STATUS - Solar Forecast Platform

### ✅ Phase 1 Completed (Current)
The foundation of the Solar Forecast Platform has been successfully implemented:

#### **Project Structure**
```
solar/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte        # Main layout with sidebar navigation
│   │   ├── +page.svelte          # Dashboard with real-time metrics
│   │   └── api/locations/        # CSR pattern API implementation
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Navigation.svelte # Line-art icon navigation
│   │   │   ├── Header.svelte     # Real-time clock & weather
│   │   │   └── dashboard/
│   │   │       ├── MetricCard.svelte
│   │   │       ├── ProductionChart.svelte
│   │   │       ├── AlertsPanel.svelte
│   │   │       ├── LocationsMap.svelte
│   │   │       └── ForecastAccuracy.svelte
│   │   ├── server/
│   │   │   ├── services/         # Business logic layer
│   │   │   │   └── location.service.ts
│   │   │   └── repositories/     # Data access layer
│   │   │       └── location.repository.ts
│   │   └── types/                # TypeScript definitions
│   │       └── location.ts
│   └── app.css                   # Global styles with dark theme
├── tailwind.config.js            # Dark theme configuration
├── package.json                  # Dependencies
└── README.md                     # Setup instructions
```

#### **Implemented Features**
1. **Dark Theme UI** ✅
   - Colors: #003135 (dark-petrol), #024950 (teal-dark), #0FA4AF (cyan), #AFDDE5 (soft-blue)
   - Glass morphism effects with backdrop-blur
   - Smooth animations and transitions

2. **CSR Architecture** ✅
   - Controller: `/routes/api/locations/+server.ts`
   - Service: `/lib/server/services/location.service.ts`
   - Repository: `/lib/server/repositories/location.repository.ts`

3. **Dashboard Components** ✅
   - Real-time production monitoring
   - Alert system with priority levels
   - Location overview with status indicators
   - Forecast accuracy analysis
   - Interactive charts using ECharts

4. **Navigation System** ✅
   - Sidebar with line-art SVG icons
   - Active route highlighting
   - User profile section
   - Real-time weather and clock display

### ✅ Phase 2 - Completed
- [x] Database integration with Prisma
- [x] CSR Architecture in SvelteKit (Controller/Service/Repository)
- [x] Python worker as ML microservice
- [x] PostgreSQL database schema
- [x] Reports page with 8 report types
- [x] Advanced analysis page with forecast visualization
- [x] Comprehensive Prisma schema (16 models)

### 📋 Phase 3 - Planned
- [ ] WebSocket real-time updates
- [ ] ML model integration
- [ ] Connect Python worker to database

### 🔴 Phase 4 - Deferred
- [ ] JWT Authentication (intentionally deferred to final phase)

## 📊 LATEST UPDATES (2025-09-03)

### New Pages Implemented
1. **Reports Page** (`/reports`)
   - 8 report types: Production, Efficiency, Forecast Accuracy, Maintenance, Financial, Compliance, Weather Impact, Location Comparison
   - Category filtering and date range selection
   - Export formats: PDF, Excel, CSV
   - Recent reports tracking

2. **Analysis Page** (`/analysis`)
   - Advanced forecast visualization with ECharts
   - Time aggregation: 15min, hourly, daily, weekly
   - Confidence bands visualization
   - Accuracy metrics: MAPE, RMSE, MAE
   - Auto-refresh and manual refresh options
   - Export functionality

### Database Schema (Prisma) - Industry Standard
**16 Comprehensive Models:**
- **Core**: User, Client, Location, Plant, ApiKey
- **Time-Series**: Forecast, Production, WeatherData, ForecastAccuracy
- **Operations**: Alert, MaintenanceLog, Report, ReportExecution
- **ML**: MLModel (version control, deployment tracking)
- **System**: AuditLog, SystemConfig

**Key Features:**
- Industry-standard solar metrics (PR, CF, Availability)
- Complete irradiance tracking (GHI, DNI, DHI, GTI)
- Forecast confidence bands and quality scores
- Data quality flags and validation
- Ready for TimescaleDB hypertables
- Multi-tenant architecture support

### **Running the Application**

#### 1. Start PostgreSQL Database
```bash
# Ensure PostgreSQL is running
# Database: solar_forecast
```

#### 2. Start Python Worker (ML Microservice)
```bash
cd /Users/vladbordei/Documents/Development/solar/python-worker
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8001
# Python Worker API: http://localhost:8001
```

#### 3. Start SvelteKit Application
```bash
cd /Users/vladbordei/Documents/Development/solar
npm install
npx prisma generate
npx prisma db push
npm run dev
# Frontend: http://localhost:5173
```

### **Key Design Decisions**
- **NO EMOJIS** in UI - Only line-art/vector icons
- **CSR Pattern** in SvelteKit - Controller/Service/Repository layers
- **Prisma ORM** for type-safe database access
- **Python Worker** as pure microservice for ML/analytics only
- **Dark Theme Only** - No light mode switch
- **TypeScript** throughout for type safety

### **Architecture Summary**
- **SvelteKit Backend**: Handles all business logic, database operations, API routes
- **Python Worker**: ML microservice for forecasting, weather data, and analytics
- **Database**: PostgreSQL with Prisma ORM for type-safe queries
- **Communication**: SvelteKit services call Python worker via HTTP for ML tasks
