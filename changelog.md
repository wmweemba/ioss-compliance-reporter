# Changelog

All notable changes to VATpilot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- User authentication and dashboard
- Multi-tenant SaaS architecture
- Subscription billing system
- Advanced analytics and insights
- API documentation and developer portal

---

## [0.8.0] - 2025-12-10

### Added
- **Order Synchronization System**: Complete Shopify order sync with local MongoDB storage
  - `models/Order.js` - Comprehensive order schema with IOSS compliance fields
  - `services/syncService.js` - Automated order fetching and transformation service
  - `routes/api.js` - Dashboard API endpoints for order management
  - Automatic initial sync on OAuth completion (100 orders)
  - Incremental sync capability for ongoing order updates
  - Bulk write operations for efficient database updates

- **IOSS Compliance Analysis**: Automated compliance calculation and reporting
  - Real-time IOSS eligibility determination (€22-€150 EU orders)
  - EU country detection with comprehensive 27-member coverage
  - VAT requirement analysis for all EU destinations
  - Order categorization by compliance status and risk level
  - Advanced filtering by country, value range, and compliance status

- **Dashboard API Endpoints**: Complete REST API for order data access
  - `GET /api/orders` - Paginated order listing with advanced filtering
  - `GET /api/orders/summary` - IOSS compliance summary and statistics
  - `POST /api/orders/sync` - Manual sync trigger (incremental/full)
  - `GET /api/orders/countries` - Available countries for filtering
  - `GET /api/orders/:id` - Detailed individual order information

- **Advanced Order Schema**: Comprehensive data model for compliance analysis
  - Shopify order metadata (ID, number, status, timestamps)
  - Customer information (email, country, shipping address)
  - Line item details (products, quantities, pricing, vendors)
  - IOSS compliance flags (eligible, EU destination, VAT required)
  - Sync tracking (last sync, analysis timestamps)

### Enhanced
- **OAuth Flow Integration**: Seamless order sync on store connection
  - Automatic order sync triggered after successful OAuth
  - Enhanced Lead model with sync statistics tracking
  - Error handling for sync failures during OAuth process
  - Comprehensive logging for sync operations and results

### Technical Improvements
- **Database Performance**: Strategic indexing for efficient order queries
  - Compound indexes for shop-based queries and date ranges
  - Optimized aggregation pipelines for compliance summaries
  - Efficient bulk operations for large order datasets
- **Data Modeling**: Comprehensive order transformation from Shopify format
  - Automatic IOSS eligibility calculation on save
  - Virtual fields for formatted values and compliance checks
  - Static methods for aggregated compliance reporting
- **API Architecture**: RESTful design with comprehensive filtering and pagination
  - Advanced query parameters for flexible data access
  - Structured response format with metadata and pagination info
  - Error handling with detailed logging and user feedback

---

## [0.7.0] - 2025-12-08

### Added
- **Shopify OAuth 2.0 Integration**: Complete OAuth flow for Shopify store connections
  - `services/shopify.js` - Shopify API configuration with secure OAuth handling
  - `routes/shopify.js` - RESTful API endpoints for OAuth flow and order management
  - `GET /api/shopify/auth` - Initiate OAuth authorization with state parameter security
  - `GET /api/shopify/callback` - Handle OAuth callback with HMAC validation
  - `GET /api/shopify/orders/:leadId` - Fetch and process orders for IOSS analysis
  - `DELETE /api/shopify/disconnect/:leadId` - Secure disconnection of Shopify stores

- **Enhanced Lead Model**: Extended MongoDB schema for Shopify integration
  - Added `shopifyShopDomain` field with domain validation
  - Added `shopifyAccessToken` field (encrypted, not returned in queries)
  - Added `shopifyScope` and `shopifyConnectedAt` tracking fields
  - Added `lastOrderSync` and `totalOrdersSynced` for sync monitoring
  - Added database indexes for optimal query performance

- **IOSS Compliance Logic**: Smart order processing for EU VAT requirements
  - Automatic IOSS eligibility calculation (€22-€150 value range to EU destinations)
  - EU country detection with complete 27-member-state coverage
  - Order transformation for compliance analysis
  - Real-time risk assessment integration

- **Security Features**: Enterprise-grade OAuth security implementation
  - HMAC signature validation for all Shopify webhooks
  - Secure state parameter generation with timestamp expiry
  - Base64 encoded state data with lead tracking
  - Database-only token storage (no session dependencies)
  - Automatic redirect to frontend dashboard with status parameters

### Changed
- **Environment Configuration**: Added Shopify OAuth environment variables
  - `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` for app credentials
  - `HOST_NAME` for OAuth callback configuration
  - `FRONTEND_URL` for secure redirect handling
  - Updated `.env.example` with comprehensive Shopify setup guide

### Fixed
- **OAuth URL Generation**: Resolved Shopify API adapter issues with manual URL construction
- **Node.js Compatibility**: Added proper Node.js adapter import for Shopify API library
- **Environment Loading**: Implemented lazy initialization to prevent environment variable conflicts
- **OAuth Token Exchange**: Replaced Shopify API callback method with manual token exchange to avoid cookie dependencies
- **Lead Model Validation**: Added 'unknown' as valid riskLevel enum value for Shopify-connected users
- **OAuth Flow UX**: Updated auth endpoint to redirect directly to Shopify instead of returning JSON response

### Technical Improvements
- **Architecture**: Modular service-based OAuth implementation with lazy initialization
- **Error Handling**: Comprehensive error management with detailed logging
- **Documentation**: Enhanced `SETUP.md` with complete Shopify Partner setup guide
- **Dependencies**: Added `@shopify/shopify-api` v12.1.2 with Node.js adapter support
- **Database Performance**: Strategic indexing for Shopify-related queries
- **OAuth Security**: Manual URL construction for reliable cross-platform compatibility

---

## [0.6.1] - 2025-12-07

### Enhanced
- **Email Templates**: Added direct CSV download links to both critical and moderate risk emails
  - \"📄 See What VATpilot Generates\" section with download button
  - Direct link to `/api/reports/sample` endpoint in emails
  - Environment-aware URL construction (dev/production)
  - Professional email styling with sample data preview (516 orders, 27 countries)

### Fixed  
- **Production Deployment**: Triggered rebuild to ensure CSV download button appears in production
- **Documentation**: Added direct sample CSV link to README live demo section

---

## [0.6.0] - 2025-12-05

### Added
- **Synthetic Data Generation System**: Complete Faker.js-powered data generation for IOSS compliance testing
  - `scripts/generate-dummy-data.js` - Generates 1,000 realistic e-commerce orders
  - `scripts/validate-data.js` - Validates and analyzes generated data
  - `scripts/README.md` - Comprehensive documentation for data generation tools
  - Strategic edge case coverage: High value (>€150), IOSS eligible (€22-€150), Low value (<€22)
  - Realistic country distribution: 70% EU customers, 80% China origin (dropshipping focus)
  - Complete order metadata including IOSS compliance flags

- **IOSS Report Generation Logic**: Complete EU VAT compliance implementation
  - `server/generate-ioss-report.js` - Core IOSS processing engine for synthetic data
  - Official EU IOSS Monthly Return CSV format generation
  - Comprehensive EU VAT rate compliance (27 member states)
  - Smart filtering for IOSS-eligible transactions (€22-€150 from non-EU origins)
  - Aggregation by member state with proper VAT calculations
  - Production-ready CSV output matching official EU requirements

- **Sample CSV Download Feature**: Frontend integration for IOSS report demonstration
  - `GET /api/reports/sample` - Backend endpoint serving downloadable IOSS CSV reports
  - Download button in quiz success state - "📄 Download Sample CSV"
  - Automatic file download as `VATpilot_Sample_Report.csv` (945 bytes, 28 rows)
  - Complete user flow: Quiz → Email → Beta confirmation → Sample download
  - Smart path resolution supporting both development and production environments

- **NPM Scripts**: Added convenient commands for data management
  - `npm run generate-dummy-data` - Creates synthetic order dataset
  - `npm run validate-data` - Analyzes generated data for compliance edge cases  
  - `npm run generate-ioss-report` - Processes synthetic data into official IOSS return
  - `npm run generate-data` - Generate synthetic order data
  - `npm run validate-data` - Validate and analyze existing data
  - Automatic package.json script registration

### Changed
- **Messaging Strategy**: Updated from expert contact approach to beta program waitlist
  - **Email Templates**: Added beta waitlist confirmation blocks to CRITICAL_RISK and MODERATE_RISK templates
  - **Success Messages**: Replaced "expert contact within 24 hours" with beta program messaging
  - **UI Copy**: Updated quiz success states to focus on email instructions and beta program
  - **Spam Folder Guidance**: Added reminders to check junk/spam folders for better deliverability

### Fixed
- **Database Connection**: Resolved MongoDB database targeting issue
  - Added explicit `dbName: 'vatpilot'` to mongoose connection options
  - Prevents fallback to default 'test' database
  - All new leads now correctly save to `vatpilot.leads` collection
  - Enhanced connection logging shows active database name

### Technical Improvements
- **Data Infrastructure**: Built foundation for compliance logic development with realistic test data
- **Developer Experience**: Comprehensive tooling for synthetic data generation and validation
- **Email Deliverability**: Improved user guidance for email management and spam prevention
- **Database Reliability**: Explicit database targeting prevents data misrouting

---

## [0.5.1] - 2025-12-04

### Changed
- **Email Domain Migration**: Migrated from Resend dev domain to custom MyNexus Group domain
  - **New Sender Address**: `vatpilot@mynexusgroup.com` with "VATpilot Support" display name
  - Improved email deliverability and professional branding
  - Updated all documentation and environment templates
  - DNS verification completed (DKIM, SPF, DMARC records verified)

### Updated
- **Configuration Files**: Updated email configuration across all environments
  - Updated server fallback email addresses to use custom domain
  - Updated `.env.example` template with new sender address
  - Updated `SETUP.md` and `DEPLOYMENT.md` documentation
  - Updated `render-env-vars.txt` template for production deployment

### Technical Improvements
- **Brand Consistency**: All emails now sent from verified MyNexus Group domain
- **Enhanced Deliverability**: Custom domain improves email reputation and delivery rates
- **Security**: Maintained secure credential management (no API keys in committed files)

---

## [0.5.0] - 2025-12-04

### Added
- **Admin Email Notifications**: Automatic BCC notifications to admin (wmweemba@gmail.com) for all new lead captures
  - Admin receives copy of every welcome email sent to users
  - Immediate notification system for lead acquisition tracking
  - No separate notification emails needed

- **Professional Email Templates**: Complete redesign of email system with branded 'System Report' templates
  - Table-based HTML layout for maximum email client compatibility
  - Inline CSS styling for reliable cross-client rendering
  - Color-coded risk level banners (Red for Critical, Yellow for Moderate, Green for Low)
  - Professional VATpilot branding with "IOSS Engine for Dropshippers" tagline
  - Responsive design with proper viewport configuration

### Fixed
- **Quiz Navigation Bug**: Resolved issue where Next button was unresponsive after using Back button
  - Added missing `goNext()` function for manual navigation
  - Added `onClick` handler to Next button component
  - Users can now navigate freely between questions using Back/Next buttons
  - Auto-advance functionality preserved when selecting answers

### Changed
- **UI Copy Refinements**: Updated messaging to focus on automation software rather than manual services
  - CRITICAL_RISK: "Get Immediate IOSS Help" → "Get the Automated Fix"
  - CRITICAL_RISK button: "Get Immediate Help" → "Fix My Risk Now"  
  - MODERATE_RISK: "COMPLIANCE GAP" → "AUDIT RISK DETECTED"
  - MODERATE_RISK button: "Join Beta Program" → "Join Automation Beta"
  - Updated subheading: "Our experts will contact you..." → "Join the Private Beta to auto-generate your reports. Spots are limited."

### Technical Improvements
- **Email Architecture**: Implemented professional table-based email templates using XHTML 1.0 Transitional DOCTYPE
- **Navigation Logic**: Enhanced quiz navigation with proper state management for bidirectional movement
- **User Experience**: Improved messaging clarity and expectation setting for lead collection phase
- **Brand Consistency**: Unified automation-focused messaging across all user touchpoints

---

## [0.4.0] - 2025-12-03

### Changed
- **Platform Migration**: Successfully migrated backend from Railway to Render.com
  - **New Production URL**: https://vatpilot.onrender.com
  - Resolved persistent Railway environment variable injection issues
  - Improved deployment reliability and performance
  - Better free tier limits for startup development

### Fixed
- **Environment Variable Issues**: Completely resolved production deployment problems
  - ✅ MongoDB connection now working reliably (was failing on Railway)
  - ✅ Resend email service properly configured (was missing API keys on Railway) 
  - ✅ All environment variables now inject correctly into Node.js process
  - ✅ No more "Operation `leads.findOne()` buffering timed out" errors
  
- **Production Configuration**: Cleaned up platform-specific code
  - Removed Railway-specific fallback environment variable patterns
  - Updated client API configuration to use Render endpoint
  - Streamlined server startup without Railway debugging overhead
  - Enhanced platform detection for better multi-cloud support

### Removed
- **Railway Dependencies**: Clean removal of Railway-specific files and configurations
  - Deleted `railway-start.js`, `railway.json`, and `.env.railway` files
  - Removed Railway-specific environment variable fallbacks
  - Updated nixpacks.toml to use standard Node.js startup commands

### Technical Improvements
- **Deployment Reliability**: Render provides more consistent environment variable injection
- **Better Monitoring**: Health check endpoints now show "healthy" database and email services
- **Simplified Architecture**: Removed complex Railway workarounds and debugging code
- **Platform Agnostic**: Server now supports multiple deployment platforms (Render, Vercel, Railway)

---

## [0.3.1] - 2025-12-03

### Fixed
- **API Environment Configuration**: Implemented comprehensive environment-aware API system
  - Fixed hardcoded production API URLs in RiskQuiz component
  - Created centralized API utility with automatic dev/prod switching
  - Added environment validation and helpful development logging
  - Resolved CORS issues in development environment
  
- **Railway Deployment Configuration**: Enhanced production environment variable handling
  - Added Railway environment variable fallback patterns
  - Implemented multiple naming convention detection (RAILWAY_ prefix, DATABASE_URL)
  - Added comprehensive debugging for deployment troubleshooting
  - Enhanced error logging with detailed stack traces and environment context

- **Development Workflow**: Improved environment file management
  - Removed redundant .env files (server/.env.development, client/.env.development)
  - Streamlined environment configuration with clear template references
  - Maintained deployment reference files (.env.railway, .env.netlify)

### Added
- **Health Check Endpoints**: Comprehensive system diagnostics for production debugging
  - `/api/health/detailed` - Full system status including database and email service
  - `/api/test/leads` - Dry-run testing endpoint for lead creation validation
  - Environment variable detection and validation logging
  - MongoDB connection status and Resend service availability checks

### Technical Improvements
- Enhanced API URL construction with automatic /api path validation
- Railway-specific environment variable detection and logging
- Improved error handling with production-safe error messages
- Better development vs production environment detection

---

## [0.3.0] - 2025-12-02

### Fixed
- **Database Configuration**: Updated MongoDB connection to use production `vatpilot` database instead of default `test` database
- **Email Deliverability**: Improved email delivery to Outlook/Hotmail accounts by:
  - Updated sender name to "VATpilot Support" for better reputation
  - Added proper email headers including List-Unsubscribe
  - Implemented email tagging for better categorization
  - Modified subject lines to be less aggressive for spam filters
- **Mongoose Compatibility**: Fixed pre-save middleware to work with Mongoose 9.x (removed deprecated `next()` callback pattern)

### Changed
- **Production Database**: All new leads now save to `vatpilot` database for immediate production data collection
- **Email Templates**: Enhanced email content structure for better spam filter compatibility

---

## [0.2.0] - 2025-11-30

### Added
- **EU VAT Risk Quiz Component** - Complete multi-step assessment tool
  - 4-question risk evaluation workflow
  - Dynamic risk calculation engine with 3 risk levels (Critical/Moderate/Low)
  - Real-time progress tracking with visual progress bar
  - Smooth transitions between quiz steps
  
- **Email Capture System**
  - React Hook Form integration for form handling
  - Zod schema validation for email input
  - Email capture shown only for Critical and Moderate risk cases
  - Form submission with loading states and error handling
  
- **Professional UI/UX**
  - shadcn/ui components integration (Card, Button, Input, Label)
  - Responsive design for mobile and desktop
  - Dark mode support via next-themes
  - Toast notifications using Sonner
  - Consistent design system with CSS variables
  
- **Risk Assessment Logic**
  - **Critical Risk**: Non-EU origin + EU customers + No IOSS registration
  - **Moderate Risk**: Has IOSS but potential compliance gaps
  - **Low Risk**: Compliant shipping profile
  
- **Interactive Features**
  - Navigation between quiz steps (Back/Next buttons)
  - Answer selection with visual feedback
  - Quiz reset functionality
  - Email submission success states

### Technical Implementation
- Modern React 19 with concurrent features
- Tailwind CSS v4 with CSS variables approach
- Lucide React icons for visual elements
- Component composition following shadcn/ui patterns
- TypeScript JSDoc comments for better IDE support

### Files Added
- `client/src/components/RiskQuiz.jsx` - Main quiz component
- Updated `client/src/App.jsx` - Integration with main app

---

## [0.1.0] - 2025-11-30

### Added
- **Initial Project Setup** - Complete MERN stack foundation
  - React 19.2.0 with Vite 7.2.4 for frontend
  - Express.js 5.1.0 setup for backend API
  - MongoDB integration with Mongoose 9.0.0
  
- **Modern Frontend Stack**
  - Tailwind CSS v4.1.17 with new CSS variables approach
  - shadcn/ui component library (New York style)
  - Radix UI primitives for accessibility
  - Lucide React icons and Heroicons
  - React Hook Form + Zod for form handling
  - React Router DOM v7 for navigation
  - Axios for HTTP requests
  - Sonner for toast notifications
  - next-themes for dark mode support
  
- **Backend Dependencies**
  - JWT authentication setup (jsonwebtoken)
  - Password hashing with bcryptjs
  - CORS configuration
  - Environment variable management with dotenv
  - Development server with nodemon
  
- **Development Tools & Configuration**
  - pnpm package management
  - ESLint 9 with flat configuration
  - Vite plugins for React and Tailwind CSS
  - Path aliases configuration (@/ for src/)
  - Git repository initialization
  
- **Project Structure**
  - Monorepo setup with separate client/server folders
  - Comprehensive .gitignore for Node.js projects
  - Package.json configuration for both client and server
  - Component organization following best practices

### Technical Stack Details
- **Frontend**: React 19, Vite 7, Tailwind CSS v4, TypeScript support
- **Backend**: Express 5, MongoDB, JWT auth, bcrypt security
- **UI/UX**: shadcn/ui, Radix UI, responsive design, dark mode
- **Development**: ESLint, pnpm, nodemon, HMR support

### Repository Setup
- GitHub repository: `wmweemba/ioss-compliance-reporter`
- Initial commit with complete project structure
- README.md with comprehensive documentation
- Professional .gitignore excluding node_modules and build files

### Files Structure
```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/ui/  # shadcn/ui components
│   │   ├── lib/           # Utility functions
│   │   └── assets/        # Static assets
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite configuration
├── server/                 # Express backend API
│   └── package.json       # Backend dependencies
├── .gitignore             # Git ignore rules
└── README.md              # Project documentation
```

---

## Version History Summary

- **v0.2.0**: EU VAT Risk Quiz implementation with email capture
- **v0.1.0**: Initial MERN stack setup with modern tooling

---

## Development Notes

### Breaking Changes
- None yet (project is in initial development)

### Migration Guide
- No migrations required for current versions

### Known Issues
- Backend API not yet implemented (planned for v0.3.0)
- Email submissions currently simulated (will connect to real API)

### Performance Improvements
- React 19 concurrent features enabled
- Vite HMR for fast development
- Optimized bundle size with code splitting (planned)

### Security Updates
- JWT authentication foundation established
- Input validation with Zod schemas
- CORS configuration prepared

---

**Note**: This project follows semantic versioning. Major version bumps indicate breaking changes, minor versions add functionality, and patch versions contain bug fixes and minor improvements.