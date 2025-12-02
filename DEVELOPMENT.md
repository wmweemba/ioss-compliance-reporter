# Development Workflow Guide

This guide explains how to work with both development and production environments for VATpilot.

## 🔧 Environment Setup

### Environment Files Structure

```
├── server/
│   ├── .env                 # Active development environment
│   ├── .env.development     # Development template
│   ├── .env.railway         # Production template (for Railway deployment)
│   └── .env.production      # Production configuration (gitignored)
└── client/
    ├── .env                 # Active development environment  
    ├── .env.development     # Development template
    ├── .env.netlify         # Production template (for Netlify deployment)
    └── .env.production      # Production configuration (gitignored)
```

## 🚀 Development Workflow

### 1. Daily Development

For regular development work, use the standard commands:

```bash
# Start backend (development mode)
cd server
npm run dev

# Start frontend (development mode) 
cd client  
npm run dev
```

This uses:
- **Backend**: `http://localhost:5000` with development database
- **Frontend**: `http://localhost:5173` with local API
- **Database**: Production `vatpilot` database (safe for testing)
- **Email**: Real emails via Resend (use test emails during development)

### 2. Test Production Mode Locally

Before deploying, test production configuration locally:

```bash
# Test backend in production mode
cd server
npm run dev:prod

# Test frontend with production build
cd client
npm run build
npm run preview
```

### 3. Environment Switching

#### Quick Development Setup
```bash
# Copy development environment (if needed)
cd server && cp .env.development .env
cd client && cp .env.development .env
```

#### Quick Production Testing
```bash  
# Copy production environment for local testing
cd server && cp .env.railway .env
cd client && cp .env.netlify .env
# Remember to update URLs to your deployed endpoints
```

## 🌐 Deployment Workflow

### 1. Pre-Deployment Testing

```bash
# 1. Test production build locally
cd client
npm run build
npm run preview

# 2. Test server in production mode
cd server  
npm run start:prod

# 3. Run tests (when available)
npm test
```

### 2. Deploy to Production

```bash
# 1. Commit your changes
git add .
git commit -m "feat: your changes description"

# 2. Push to trigger auto-deployment
git push origin main
```

### 3. Post-Deployment Verification

```bash
# Check health endpoints
curl https://your-railway-app.railway.app/api/health
curl https://vatpilot.netlify.app

# Test complete flow
# 1. Visit your live site
# 2. Complete the quiz
# 3. Check MongoDB Atlas for new leads
# 4. Verify email delivery
```

## 🗂️ Database Strategy

### Development Database
- **Name**: `vatpilot` (production database)
- **Strategy**: Use production database for development
- **Reason**: Immediate real-world testing, shared lead collection

### Production Database  
- **Name**: `vatpilot` (same as development)
- **Strategy**: Single database for all environments
- **Benefits**: Immediate lead capture, simplified management

**Note**: This is safe because:
- No destructive operations in the codebase
- Only INSERT operations for leads
- Real leads are valuable even from testing

## 🔄 Environment Variables Management

### Development (.env files)
```bash
# Server Development
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
MONGO_URI=mongodb+srv://...

# Client Development  
VITE_API_URL=http://localhost:5000/api
VITE_NODE_ENV=development
```

### Production (Platform Environment Variables)
```bash
# Railway Environment Variables
NODE_ENV=production  
CORS_ORIGIN=https://vatpilot.netlify.app
MONGO_URI=mongodb+srv://...

# Netlify Environment Variables
VITE_API_URL=https://your-railway-app.railway.app/api
VITE_NODE_ENV=production
```

## 🛠️ Available Scripts

### Backend Scripts
```bash
npm start          # Production start
npm run dev        # Development with nodemon
npm run start:prod # Local production test
npm run dev:prod   # Development with production env
```

### Frontend Scripts  
```bash
npm run dev         # Development server
npm run build       # Production build
npm run preview     # Preview production build
npm run dev:prod    # Development with production mode
npm run build:dev   # Build with development settings
```

## 🔍 Debugging & Testing

### Local Development Issues
```bash
# Check environment loading
cd server && node -e "console.log(process.env.NODE_ENV, process.env.CORS_ORIGIN)"
cd client && npm run dev -- --debug

# Test API connectivity
curl http://localhost:5000/api/health
```

### Production Issues  
```bash
# Check deployed endpoints
curl https://your-railway-app.railway.app/api/health

# Check build logs
# Railway: Check deployment logs in dashboard
# Netlify: Check build logs in site dashboard
```

### Database Testing
```bash
# Test MongoDB connection locally
cd server
node -e "
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));
"
```

## 🔐 Security Best Practices

### Environment Files
- ✅ `.env` files are gitignored
- ✅ Use `.env.template` files for sharing structure
- ✅ Never commit API keys or passwords
- ✅ Use different secrets for development and production

### API Keys
- ✅ Resend API key works for both dev and production
- ✅ MongoDB Atlas configured for all environments
- ✅ CORS properly configured for each environment

## 📦 Continuous Integration

### Recommended Workflow
```bash
# 1. Feature development
git checkout -b feature/your-feature
# ... make changes ...
npm run dev  # test locally

# 2. Pre-commit testing  
npm run build  # ensure builds work
npm test       # run tests (when available)

# 3. Commit and merge
git add .
git commit -m "feat: your feature"
git checkout main
git merge feature/your-feature

# 4. Deploy
git push origin main  # triggers auto-deployment
```

## 🚨 Troubleshooting

### Common Development Issues
1. **CORS Errors**: Ensure CORS_ORIGIN matches your frontend URL
2. **API Connection**: Verify VITE_API_URL in client/.env
3. **Database Connection**: Check MongoDB Atlas network access

### Common Production Issues  
1. **Build Failures**: Check Node.js version compatibility
2. **Environment Variables**: Verify all required vars are set
3. **URL Mismatches**: Ensure frontend/backend URLs are correct

---

This workflow ensures you can develop efficiently while maintaining a stable production environment! 🚀