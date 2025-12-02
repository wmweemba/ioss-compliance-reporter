# Deployment Guide - VATpilot

This guide covers deploying VATpilot to Railway (backend) and Netlify (frontend).

## 🚀 Backend Deployment (Railway)

### 1. Prepare Railway Project

1. **Create Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Create New Project**: Click "New Project" → "Deploy from GitHub repo"
3. **Connect Repository**: Select your `ioss-compliance-reporter` repository
4. **Root Directory**: Keep root directory (nixpacks.toml will handle server subdirectory)

### 2. Configure Environment Variables

In Railway dashboard, go to your service → Variables tab and add:

```bash
NODE_ENV=production
MONGO_URI=mongodb+srv://wmweemba_db_user:S3k3l3t1*@ioss-compliance-reporte.lafpxt7.mongodb.net/vatpilot?appName=VATpilot-SaaS
CORS_ORIGIN=https://vatpilot.netlify.app
RESEND_API_KEY=re_2R5gDWVK_6VeKdpmdvnxPkCZq9kSsL18d
FROM_EMAIL="VATpilot Support <onboarding@resend.dev>"
JWT_SECRET=ioss-compliance-super-secret-jwt-key-2025
JWT_EXPIRE=30d
BCRYPT_SALT_ROUNDS=12
```

### 3. Deploy

- Railway will automatically deploy when you push to main branch
- Check deployment logs for any issues
- Note your Railway URL (e.g., `https://your-app.railway.app`)

---

## 🌐 Frontend Deployment (Netlify)

### 1. Prepare Netlify Project

1. **Create Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **New Site from Git**: Connect your GitHub repository
3. **Build Settings**:
   - Base directory: `client`
   - Build command: `npm run build`
   - Publish directory: `client/dist`

### 2. Configure Environment Variables

In Netlify dashboard, go to Site settings → Environment variables:

```bash
VITE_API_URL=https://your-railway-app.railway.app/api
VITE_NODE_ENV=production
```

**Important**: Replace `your-railway-app.railway.app` with your actual Railway URL.

### 3. Update CORS Configuration

After deploying to Netlify, update your Railway environment variables:

```bash
CORS_ORIGIN=https://your-netlify-site.netlify.app
```

Replace with your actual Netlify URL.

---

## 🔧 Post-Deployment Steps

### 1. Test the Application

1. **Health Check**: Visit `https://your-railway-app.railway.app/api/health`
2. **Complete Quiz**: Test the full flow on your Netlify site
3. **Check Database**: Verify leads are saving to MongoDB Atlas
4. **Email Testing**: Confirm emails are being sent via Resend

### 2. Update URLs

After deployment, you'll need to:

1. **Update Railway CORS**: Set to your actual Netlify URL
2. **Update Netlify API URL**: Set to your actual Railway URL
3. **Update Documentation**: Update README with live URLs

### 3. DNS Configuration (Optional)

For custom domains:

1. **Railway**: Add custom domain in Railway dashboard
2. **Netlify**: Configure custom domain in Netlify dashboard
3. **Update Environment Variables**: Use your custom domains

---

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS_ORIGIN matches your frontend URL exactly
2. **API Not Found**: Verify VITE_API_URL includes `/api` path
3. **Database Connection**: Check MongoDB Atlas whitelist (0.0.0.0/0 for Railway)
4. **Email Not Sending**: Verify Resend API key is correct
5. **Build Detection Issues**: Railway should auto-detect the monorepo structure with nixpacks.toml
6. **Root Directory**: If Railway doesn't detect the server, ensure nixpacks.toml is in the root

### Health Checks

- **Backend**: `GET /api/health` should return `{"status":"ok","message":"VATpilot API is running"}`
- **Frontend**: Site should load and display the risk quiz
- **Database**: MongoDB Atlas should show `vatpilot` database with `leads` collection

---

## 📊 Monitoring

### Railway Metrics
- Check CPU and memory usage
- Monitor response times
- Review deployment logs

### Netlify Analytics
- Track site visits
- Monitor build times
- Check function logs

### MongoDB Atlas
- Monitor database connections
- Check storage usage
- Review query performance

---

## 🔒 Security Notes

- All environment variables are properly configured
- MongoDB connection uses authentication
- CORS is properly configured for production
- Email API keys are secured
- No sensitive data in client-side code

---

## 📈 Next Steps

After successful deployment:

1. **Custom Domain**: Configure professional domains
2. **Analytics**: Add Google Analytics or similar
3. **Monitoring**: Set up uptime monitoring
4. **Backup**: Configure database backups
5. **CI/CD**: Enhance automated deployment pipeline