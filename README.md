# ⚽ Football Forecast Analytics

A comprehensive football prediction and analytics platform combining real-time data scraping, machine learning predictions, and modern web technologies. Built with production-grade UX/UI, accessibility features, and performance optimizations.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.18.0+ ([Download](https://nodejs.org/))
- **Python** 3.11+ ([Download](https://www.python.org/))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/)) or Docker
- **Git** ([Download](https://git-scm.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FootballForecast
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see Environment Setup section)
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

4. **Install Python dependencies**
   ```bash
   # Using uv (recommended)
   pip install uv
   uv sync
   
   # Or using pip
   pip install -r requirements.txt
   ```

5. **Setup database**
   ```bash
   # Option 1: Local PostgreSQL
   createdb football_forecast
   
   # Option 2: Docker (see Docker section)
   docker-compose up -d postgres
   
   # Run migrations
   npm run db:push
   ```

6. **Start the application**
   ```bash
   # Development mode (starts both Node.js and Python services)
   npm run dev
   
   # Or start services separately
   npm run dev:node    # Node.js backend + frontend
   npm run dev:python  # Python ML service
   ```

7. **Open your browser**
   ```
   http://localhost:5000
   ```

## 🏗️ Architecture

### Technology Stack

**Frontend**
- React 18 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Radix UI for components
- React Query for state management

**Backend**
- Node.js with Express
- TypeScript for type safety
- Drizzle ORM with PostgreSQL
- WebSocket for real-time updates
- Session-based authentication

**ML Service**
- Python with FastAPI
- XGBoost for predictions
- Pandas/NumPy for data processing
- Playwright for web scraping

**Database**
- PostgreSQL with comprehensive schema
- Optimized indexes for performance
- Foreign key relationships for data integrity

### Project Structure

```
FootballForecast/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and configurations
│   └── index.html
├── server/                # Node.js backend
│   ├── routers/          # API route handlers
│   ├── middleware/       # Express middleware
│   ├── services/         # Business logic
│   └── index.ts          # Server entry point
├── src/                  # Python ML service
│   ├── api/              # FastAPI endpoints
│   ├── ml/               # Machine learning models
│   ├── scrapers/         # Web scraping modules
│   └── utils/            # Python utilities
├── shared/               # Shared TypeScript types
└── migrations/           # Database migrations
```

## 🔧 Environment Setup

### Required Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/football_forecast

# Application
PORT=5000
NODE_ENV=development

# ML Service
ML_SERVICE_PORT=8000
ML_SERVICE_URL=http://localhost:8000

# Session Security
SESSION_SECRET=your_generated_secret_here

# Optional: External API
API_FOOTBALL_KEY=your_api_key_here
```

### Generate Session Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🐳 Docker Setup

### Quick Start with Docker Compose

```bash
# Start all services (PostgreSQL, Node.js, Python)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Database Only

```bash
# Start only PostgreSQL
docker-compose up -d postgres

# Connect to database
docker-compose exec postgres psql -U postgres -d football_forecast
```

## 📊 Database Management

### Migrations

```bash
# Push schema changes to database
npm run db:push

# Generate migration files (if needed)
npx drizzle-kit generate

# View database schema
npx drizzle-kit studio
```

### Sample Data

The application includes comprehensive sample data that automatically loads when external APIs are unavailable:

- Premier League and La Liga fixtures
- Team standings and statistics
- Historical match data
- Prediction samples

## 🤖 ML Service

### Features

- **Match Predictions**: Win/Draw/Loss probabilities
- **Expected Goals**: xG calculations for both teams
- **Market Predictions**: Over/Under, Both Teams to Score
- **Feature Analysis**: Key factors influencing predictions
- **Model Training**: Automated retraining with new data

### API Endpoints

```bash
# Health check
GET http://localhost:8000/health

# Single prediction
POST http://localhost:8000/predict
{
  "home_team_id": 33,
  "away_team_id": 34
}

# Batch predictions
POST http://localhost:8000/predict/batch
{
  "requests": [
    {"home_team_id": 33, "away_team_id": 34},
    {"home_team_id": 35, "away_team_id": 36}
  ]
}

# Model status
GET http://localhost:8000/model/status

# Retrain model
POST http://localhost:8000/train
{
  "start_date": "2023-01-01",
  "end_date": "2023-12-31"
}
```

## 🕷️ Web Scraping

### Supported Sources

- **FBRef**: Match statistics and team ratings
- **WhoScored**: Detailed match insights
- **API-Football**: Live fixtures and standings

### Configuration

```bash
# Enable/disable scraping
ENABLE_SCRAPING=true

# Scraping intervals (milliseconds)
SCRAPING_INTERVAL_FIXTURES=3600000  # 1 hour
SCRAPING_INTERVAL_STANDINGS=7200000 # 2 hours
```

## 🔒 Security

### Authentication

- Session-based authentication
- Secure password hashing
- CSRF protection
- Rate limiting

### API Security

- Request rate limiting
- Input validation with Zod
- SQL injection prevention
- XSS protection

## 🚀 Deployment

### Production Deployment

The application is deployed to production environments:

- **Frontend & API**: [https://football-forecast.netlify.app](https://football-forecast.netlify.app)
- **Database**: Supabase PostgreSQL at [https://mokwkueoqemmcfxownxt.supabase.co](https://mokwkueoqemmcfxownxt.supabase.co)

### Deployment Documentation

- **[ENV_SETUP.md](ENV_SETUP.md)** - Environment variable setup instructions
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Detailed deployment instructions
- **[DEPLOYMENT_VERIFICATION.md](DEPLOYMENT_VERIFICATION.md)** - Deployment verification checklist
- **[DEPLOYMENT_REPORT.md](DEPLOYMENT_REPORT.md)** - Comprehensive deployment report

### Production Build

```bash
# Build frontend and backend
npm run build

# Start production server
npm start
```

### Environment Variables for Production

```bash
NODE_ENV=production
DATABASE_URL=postgresql://postgres:password@db.mokwkueoqemmcfxownxt.supabase.co:5432/postgres
API_FOOTBALL_KEY=your_api_key_here
API_BEARER_TOKEN=your_secure_token_here
SCRAPER_AUTH_TOKEN=your_secure_token_here
SESSION_SECRET=your_production_secret
SESSION_SECURE=true
LOG_LEVEL=warn
```

### CI/CD Pipeline

Continuous integration and deployment is configured using GitHub Actions:

```bash
# Deploy to production
git push origin main  # Automatically triggers deployment

# Manual deployment
npm run build
netlify deploy --prod
```

See `.github/workflows/deploy.yml` for the complete CI/CD configuration.

## 🧪 Testing

### Run Tests

```bash
# Node.js tests
npm test

# Python tests
cd src && python -m pytest

# E2E tests
npm run test:e2e
```

### Manual Testing

1. **Database Connection**: Check logs for successful DB connection
2. **API Endpoints**: Test `/api/health` endpoint
3. **ML Service**: Test `/health` on Python service
4. **Frontend**: Verify UI loads and displays data
5. **Predictions**: Test prediction generation

## 📈 Performance

### Optimization Features

- **Database Indexes**: Optimized queries for large datasets
- **Caching**: In-memory caching for frequent requests
- **Lazy Loading**: Component-level code splitting
- **Compression**: Gzip compression for API responses
- **Connection Pooling**: Efficient database connections

### Monitoring

- Request/response logging
- Error tracking and reporting
- Performance metrics
- Database query analysis

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev          # Start both Node.js and Python services
npm run dev:node     # Node.js backend + frontend only
npm run dev:python   # Python ML service only

# Building
npm run build        # Build for production
npm run check        # TypeScript type checking

# Database
npm run db:push      # Push schema changes
npm run db:studio    # Open Drizzle Studio

# Utilities
npm run lint         # Lint code
npm run format       # Format code
```

### IDE Setup

#### VS Code (Recommended)

Install recommended extensions:
- TypeScript and JavaScript Language Features
- Python
- Tailwind CSS IntelliSense
- Prettier
- ESLint

#### Configuration Files

- `.vscode/settings.json` - VS Code settings
- `.vscode/launch.json` - Debug configurations
- `.vscode/tasks.json` - Build tasks

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check PostgreSQL is running
pg_isready -h localhost -p 5432

# Verify connection string in .env
DATABASE_URL=postgresql://postgres:password@localhost:5432/football_forecast
```

**Python Service Not Starting**
```bash
# Check Python version
python --version  # Should be 3.11+

# Install dependencies
pip install -r requirements.txt

# Check port availability
netstat -an | grep 8000
```

**Build Errors**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist .vite
```

**Permission Errors (Windows)**
```bash
# Run as administrator or check file permissions
# Ensure antivirus isn't blocking Node.js/Python
```

### Debug Mode

```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Node.js debugging
node --inspect server/index.ts

# Python debugging
python -m debugpy --listen 5678 src/api/main.py
```

## 📝 API Documentation

### Node.js API Endpoints

```
GET    /api/health              # Health check
GET    /api/leagues             # Get all leagues
GET    /api/fixtures            # Get fixtures
GET    /api/predictions         # Get predictions
POST   /api/auth/login          # User login
POST   /api/auth/register       # User registration
```

### Python ML API

```
GET    /health                  # ML service health
POST   /predict                 # Single prediction
POST   /predict/batch           # Batch predictions
GET    /model/status            # Model information
POST   /train                   # Retrain model
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript/Python type annotations
- Write tests for new features
- Update documentation
- Follow existing code style
- Test across different platforms

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Documentation

- **[Style Guide](STYLE_GUIDE.md)** - Design system and visual guidelines
- **[Component Documentation](COMPONENT_DOCS.md)** - Detailed component API reference
- **[Migration Report](MIGRATION_REPORT.md)** - Platform migration details

## 🎨 Production Features

### UX/UI Enhancements
- **Modern Design System**: Inter font, consistent spacing, semantic colors
- **Responsive Design**: Mobile-first approach with breakpoint optimization
- **Smooth Animations**: Subtle hover effects, transitions, and loading states
- **Glass Effects**: Modern glassmorphism for enhanced visual appeal

### Accessibility (WCAG 2.1 AA)
- **Screen Reader Support**: ARIA labels, semantic HTML, live regions
- **Keyboard Navigation**: Full keyboard accessibility with focus management
- **High Contrast**: Support for high contrast and reduced motion preferences
- **Skip Navigation**: Skip links for efficient screen reader navigation

### Performance Optimizations
- **Lazy Loading**: Code splitting for heavy components
- **Error Boundaries**: Graceful error handling at component level
- **Loading States**: Skeleton screens and progressive loading
- **Bundle Optimization**: Tree shaking and dynamic imports

### Developer Experience
- **TypeScript**: Full type safety across frontend and backend
- **Component Library**: Reusable, documented components
- **Testing Support**: Built-in test IDs and accessibility testing
- **Development Tools**: Hot reload, error overlays, debugging support

## 🙏 Acknowledgments

- **API-Football** for football data API
- **FBRef** and **WhoScored** for statistical data
- **PostgreSQL** for robust local and cloud database hosting
- **Vercel** for deployment platform
- **Radix UI** for accessible component primitives
- **Tailwind CSS** for utility-first styling
- Open source community for amazing tools and libraries

---

## Built with ❤️ for football analytics enthusiasts
