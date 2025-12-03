# Render Deployment Instructions

## Current Status
✅ Files prepared for Render deployment
✅ Server updated for platform compatibility
⏳ Render service creation in progress

## Next Steps

### 1. Complete Render Service Setup
In your Render dashboard, configure:
- **Service Name:** vatpilot-backend (or your preferred name)
- **Build Command:** `cd server && npm install`
- **Start Command:** `cd server && npm start`
- **Health Check Path:** `/api/health`

### 2. Add Environment Variables
Copy the variables from `render-env-vars.txt`:
```
MONGO_URI=your-mongodb-connection-string
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=VATpilot Support <your-email@domain.com>
CORS_ORIGIN=https://vatpilot.netlify.app
NODE_ENV=production
```

### 3. Update Client with Your Render URL
Once deployed, get your Render service URL (e.g., `https://vatpilot-backend.onrender.com`)
Then update `client/src/lib/api.js` line 17:
```javascript
production: 'https://YOUR-SERVICE-NAME.onrender.com/api'
```

### 4. Test Deployment
After deployment, test these endpoints:
- Health check: `https://your-service.onrender.com/api/health`
- Detailed health: `https://your-service.onrender.com/api/health/detailed`

### 5. Update Netlify Environment
In Netlify, set:
```
VITE_API_URL=https://your-service.onrender.com/api
```

## Advantages Over Railway
✅ Reliable environment variable injection
✅ Better free tier limits
✅ Excellent uptime and performance
✅ Great integration with Netlify
✅ No mysterious environment variable issues

## Rollback Plan (if needed)
The Railway service is still available as backup. Simply revert the API URL in the client if needed.