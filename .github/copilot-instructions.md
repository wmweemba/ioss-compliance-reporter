# VATpilot Copilot Instructions

## Architecture Overview
VATpilot is a MERN stack SaaS for EU VAT IOSS compliance, with a lead generation flow → Shopify integration → order analysis pipeline.

**Key Data Flow:** Risk Quiz → Lead Capture → Email Activation → Dashboard → Shopify OAuth → Order Sync → IOSS Analysis

## Project Structure
- `server/` - Express.js API with MongoDB/Mongoose
- `client/` - React 19 + Vite frontend with shadcn/ui
- `scripts/` - Data generation utilities
- Two main models: `Lead.js` (quiz submissions) and `Order.js` (Shopify order data)

## Core Patterns

### Lead-Centric Architecture
All operations are scoped to `leadId` - each beta user has their own isolated data:
```javascript
// API routes require leadId parameter
router.get('/orders', async (req, res) => {
  const { leadId } = req.query;
  if (!leadId) return res.status(400).json({ error: 'leadId parameter is required' });
```

### Email-to-Dashboard Workflow
Email templates include personalized dashboard links:
```javascript
const dashboardUrl = leadId ? `${siteUrl}/dashboard?leadId=${leadId}` : siteUrl
// Used in generateEmailContent() function in server.js
```

### Environment-Aware API Configuration
`client/src/lib/api.js` automatically switches between dev/prod endpoints:
- Dev: `http://localhost:5000/api` 
- Prod: `https://vatpilot.onrender.com/api`
- Uses `import.meta.env.VITE_API_URL` if set

### IOSS Compliance Logic
Orders are automatically analyzed on save with virtual fields:
```javascript
// In Order.js model
orderSchema.virtual('iossEligible').get(function() {
  return this.euDestination && this.totalPrice >= 22 && this.totalPrice <= 150;
});
```

## Development Workflows

### Start Development
```bash
# Root level - starts both client and server
npm run dev

# Individual services
npm run server:dev  # Nodemon on :5000
npm run client:dev  # Vite on :5173
```

### Environment Management
```bash
npm run env:dev   # Copy development configs
npm run env:prod  # Copy production configs
```

### Data Generation
```bash
npm run generate-data      # Create dummy leads/orders
npm run generate-ioss-report  # Generate sample CSV
npm run validate-data      # Verify data integrity
```

## Integration Points

### Shopify OAuth Flow
Route: `server/routes/shopify.js`
- `/api/shopify/auth` - Initiate OAuth with leadId
- `/api/shopify/callback` - Handle OAuth, trigger order sync
- Uses Lead model to store access tokens and shop domains

### Email System (Resend)
All risk assessment emails are sent via `generateEmailContent()` in `server.js`:
- Templates for CRITICAL_RISK, MODERATE_RISK, LOW_RISK
- Personalized dashboard URLs with leadId
- BCC removed to fix delivery issues

### Order Synchronization
Service: `server/services/syncService.js`
- Fetches Shopify orders via REST API
- Transforms to internal schema with IOSS compliance flags
- Bulk operations for performance

## Critical Conventions

### API Response Format
```javascript
// Consistent structure across all endpoints
{
  success: true,
  data: { orders: [], pagination: {}, shop: {} },
  message: "Optional message"
}
```

### React Component Patterns
- Use React Hook Form + Zod for validation
- Centralized API calls via `client/src/lib/api.js`
- Toast notifications with Sonner
- shadcn/ui components with Tailwind CSS

### Database Indexing Strategy
Both models use compound indexes for leadId-based queries:
```javascript
leadSchema.index({ shopifyShopDomain: 1 });
orderSchema.index({ shopId: 1, shopifyCreatedAt: -1 });
```

### Error Handling Pattern
Always include leadId context in logs:
```javascript
console.log(`🔄 Manual sync triggered for ${lead.shopifyShopDomain} (Full: ${fullSync})`);
```

## Version Evolution & Breaking Changes

### v0.9.0 (Current) - Beta Dashboard Era
- **Major Addition**: Complete React Dashboard component with IOSS analysis
- **Breaking Change**: Email workflow now requires `leadId` parameter in all dashboard links
- **New Route**: `/dashboard?leadId={id}` - requires React Router integration
- **Email Templates**: All risk levels now include beta activation buttons

### v0.8.0 - Order Sync System
- **Critical**: All API endpoints now require `leadId` parameter (breaking change from earlier versions)
- **Performance**: Bulk operations for order sync (up to 250 orders per sync)
- **IOSS Logic**: €22-€150 EU order eligibility rules hardcoded in virtual fields
- **Indexing Strategy**: Compound indexes on `shopId` + `shopifyCreatedAt` for efficient queries

### v0.7.0 - Shopify Integration
- **Security**: HMAC validation required for all Shopify callbacks
- **OAuth State**: Base64 encoded state with leadId tracking and expiry
- **Scopes Required**: `read_orders` and `read_assigned_fulfillment_orders` only

## Platform Migration History
- **December 2025**: Migrated from Railway to Render.com due to env var injection issues
- **Critical Lesson**: Always test environment variable availability on deployment platforms
- **CORS Configuration**: Must be set per platform (Netlify frontend URLs)

## Production Environment Specifics

### Database Strategy
- **Shared Database**: Development and production both use MongoDB Atlas `vatpilot` database
- **Safe for Testing**: Production database is designed to handle development traffic
- **Collection Isolation**: Each lead gets isolated data via `leadId` scoping

### Email System (Resend)
- **Development**: Real emails sent via same API key as production
- **Domain**: Uses `onboarding@resend.dev` for both environments
- **Rate Limiting**: Development shares production rate limits
- **Error Handling**: BCC removed to fix delivery issues to non-Gmail addresses

### Shopify Integration Constraints
- **OAuth Callback URLs**: Must be configured per environment in Shopify Partner Dashboard
- **Development**: `http://localhost:5000/api/shopify/callback`
- **Production**: `https://vatpilot.onrender.com/api/shopify/callback`
- **Rate Limits**: Shopify REST Admin API has bucket-based rate limiting

## Performance Optimization Patterns

### Order Sync Strategy
```javascript
// Incremental sync uses last sync timestamp
const lastSync = lead.lastOrderSync;
const syncOptions = lastSync ? { created_at_min: lastSync } : { limit: 100 };
```

### Database Bulk Operations
```javascript
// Always use bulk operations for order updates
const bulkOps = orders.map(order => ({
  updateOne: { filter: { shopifyOrderId: order.id }, upsert: true }
}));
await Order.bulkWrite(bulkOps);
```

### API Response Caching
- **No Caching**: Real-time data required for compliance analysis
- **Pagination**: Default 50 orders per page, max 100
- **Filtering**: Client-side filtering for better UX on small datasets

## Deployment Notes
- Frontend: Netlify (auto-deploy from GitHub main)
- Backend: Render.com (environment variables via platform)
- Uses `netlify.toml` for SPA routing redirects
- Environment detection handles CORS origins automatically
- **Health Checks**: `/api/health` and `/api/health/detailed` for monitoring