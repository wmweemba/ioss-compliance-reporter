# VATpilot - Email Capture Setup Guide

## 🚀 Quick Setup Instructions

### 1. Environment Configuration

#### Server Setup (.env)
```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your values:
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/vatpilot
CORS_ORIGIN=http://localhost:5173
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL="VATpilot Support <vatpilot@mynexusgroup.com>"
```

#### Client Setup (.env)
```bash
cd client
cp .env.example .env
```

Edit `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 2. Database Setup

#### Option A: Local MongoDB
```bash
# Install MongoDB locally
# Windows: Download from mongodb.com
# macOS: brew install mongodb/brew/mongodb-community
# Ubuntu: sudo apt install mongodb

# Start MongoDB
mongod
```

#### Option B: MongoDB Atlas (Recommended)
1. Create account at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create new cluster (free tier available)
3. Get connection string
4. Replace `MONGO_URI` in `.env` with your Atlas connection string

### 3. Email Service Setup (Resend)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from dashboard
3. Add API key to `RESEND_API_KEY` in server `.env`
4. Verify your sending domain (or use resend.dev for testing)

### 4. Shopify OAuth Setup (Optional)

**For Shopify store integration (order fetching):**

1. **Create Shopify Partner Account**:
   - Go to [partners.shopify.com](https://partners.shopify.com)
   - Sign up for a partner account

2. **Create Shopify App**:
   - In Partner Dashboard → Apps → "Create app"
   - Choose "Public app" for production or "Custom app" for development
   - App name: "VATpilot IOSS Compliance"

3. **Configure App Settings**:
   - **App URL**: `http://localhost:5000` (development) or your production URL
   - **Allowed redirection URL(s)**: `http://localhost:5000/api/shopify/callback`
   - **Scopes**: Select `read_orders` and `read_assigned_fulfillment_orders`

4. **Get API Credentials**:
   - Copy **API key** and **API secret** from your app dashboard
   - Add to server `.env`:
   ```bash
   SHOPIFY_API_KEY=your_api_key_here
   SHOPIFY_API_SECRET=your_api_secret_here
   HOST_NAME=localhost:5000  # or your production domain
   ```

5. **Test OAuth Flow**:
   - Visit: `http://localhost:5000/api/shopify/auth?shop=your-test-store`
   - Complete OAuth authorization
   - Verify redirect to dashboard with success status

### 5. Start Development Servers

#### Terminal 1 - Backend:
```bash
cd server
pnpm run dev
# Server runs on http://localhost:5000
```

#### Terminal 2 - Frontend:
```bash
cd client  
pnpm run dev
# Client runs on http://localhost:5173
```

### 6. Test the Integration

1. Open http://localhost:5173
2. Complete the risk quiz
3. Select answers that trigger CRITICAL or MODERATE risk
4. Submit email in the capture form
5. Check:
   - ✅ Database entry created
   - ✅ Email sent via Resend
   - ✅ Toast notification shown
   - ✅ Success state displayed

## 🔧 API Endpoints

### POST /api/leads
Creates new lead and sends email
```json
{
  "email": "user@example.com",
  "riskLevel": "CRITICAL_RISK",
  "userAnswers": {
    "origin": "non_eu",
    "destination": "eu", 
    "aov": "under_150",
    "ioss_status": "no"
  }
}
```

### GET /api/leads
Retrieves all leads (for admin)
```bash
curl http://localhost:5000/api/leads
```

### GET /api/health  
Health check endpoint
```bash
curl http://localhost:5000/api/health
```

## 🐛 Troubleshooting

### Backend Issues
```bash
# Check MongoDB connection
# Error: MongoServerError
# Solution: Ensure MongoDB is running or Atlas connection string is correct

# Check Resend API
# Error: Authentication failed
# Solution: Verify RESEND_API_KEY in .env file

# Check CORS issues
# Error: Cross-origin blocked
# Solution: Verify CORS_ORIGIN matches client URL
```

### Frontend Issues  
```bash
# API connection issues
# Error: Network Error
# Solution: Ensure backend is running on correct port

# Environment variables not loading
# Error: undefined API_URL
# Solution: Restart dev server after adding .env file
```

### Database Issues
```bash
# View MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Connect to database
mongo ioss-compliance
db.leads.find().pretty()
```

## 📊 Development Workflow

1. **Make changes** to RiskQuiz component
2. **Test locally** with both servers running  
3. **Check database** for new entries
4. **Verify emails** in Resend dashboard
5. **Commit changes** when working properly

## 🌟 Next Steps

- [ ] Add user authentication
- [ ] Create admin dashboard for leads
- [ ] Implement lead scoring
- [ ] Add email templates
- [ ] Set up production deployment
- [ ] Add analytics tracking