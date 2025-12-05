# VATpilot

> A modern MERN stack SaaS application for EU VAT IOSS compliance assessment and automated reporting, specifically designed for dropshippers shipping from outside the EU to EU customers.

[![React](https://img.shields.io/badge/React-19.2.0-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-7.2.4-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1.17-38B2AC.svg)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0.0-green.svg)](https://mongodb.com/)
[![Express.js](https://img.shields.io/badge/Express.js-5.1.0-000000.svg)](https://expressjs.com/)

## 🎯 Project Overview

**Target Audience:** Dropshippers and e-commerce businesses shipping from outside the EU to EU customers

**Primary Goal:** Automate IOSS compliance through intelligent risk assessment and automated reporting solutions

**Key Features:**
- Multi-step EU VAT risk assessment quiz
- Real-time IOSS compliance evaluation
- Automated email capture for high-risk cases
- **📄 Sample CSV Download** - Download real IOSS compliance reports
- Professional compliance reporting dashboard
- Intelligent risk categorization (Critical/Moderate/Low)
- Automated IOSS report generation with synthetic data
- Complete EU IOSS Monthly Return CSV format (516 orders, 27 countries)

## 🌐 Live Demo

- **Frontend**: [https://vatpilot.netlify.app](https://vatpilot.netlify.app) 
- **Backend API**: [https://vatpilot.onrender.com](https://vatpilot.onrender.com)
- **Health Check**: [https://vatpilot.onrender.com/api/health](https://vatpilot.onrender.com/api/health)

## 🚀 Tech Stack

### Frontend (Client)
- **Framework:** React 19.2.0 with Vite 7.2.4
- **Styling:** Tailwind CSS 4.1.17 (CSS variables approach)
- **UI Components:** shadcn/ui (New York style) with Radix UI primitives
- **Icons:** Lucide React 0.555.0 + Heroicons 2.2.0
- **Forms:** React Hook Form 7.67.0 + Zod 4.1.13 validation
- **Routing:** React Router DOM 7.9.6
- **HTTP Client:** Axios 1.13.2
- **Notifications:** Sonner 2.0.7
- **Theme:** next-themes 0.4.6 (dark mode support)
- **Utilities:** clsx + tailwind-merge (cn helper)

### Backend (Server)
- **Framework:** Express.js 5.1.0
- **Database:** MongoDB with Mongoose 9.0.0
- **Authentication:** JWT (jsonwebtoken 9.0.2) + bcryptjs 3.0.3
- **Security:** CORS 2.8.5
- **Environment:** dotenv 17.2.3
- **Development:** Nodemon 3.1.11

### Development Tools
- **Package Manager:** pnpm 10.20.0
- **Linting:** ESLint 9 (flat config)
- **Build Tool:** Vite with React + Tailwind plugins
- **Version Control:** Git with GitHub integration

## 📋 Prerequisites

Before running this project, ensure you have:

- **Node.js** (v18.0.0 or higher)
- **pnpm** (v8.0.0 or higher) - `npm install -g pnpm`
- **MongoDB** (local installation or Atlas connection)
- **Git** for version control

## ⚡ Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/wmweemba/ioss-compliance-reporter.git
cd ioss-compliance-reporter
```

### 2. Install Dependencies
```bash
# Install client dependencies
cd client
pnpm install

# Install server dependencies
cd ../server
pnpm install

# Return to root
cd ..
```

### 3. Environment Setup
```bash
# Create environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Configure your environment variables
# Edit server/.env and client/.env with your settings
```

### 4. Start Development Servers

**Terminal 1 - Client (Frontend):**
```bash
cd client
pnpm run dev
# Runs on http://localhost:5173
```

**Terminal 2 - Server (Backend):**
```bash
cd server
pnpm run dev
# Runs on http://localhost:5000
```

## 🏗️ Project Structure

See [projectstructure.md](./projectstructure.md) for detailed folder and file organization.

## 📚 Key Components

### EU VAT Risk Quiz (`/client/src/components/RiskQuiz.jsx`)
- **Purpose:** Multi-step assessment of IOSS compliance risk
- **Features:** 
  - 4-question risk evaluation
  - Dynamic risk calculation
  - Email capture for high-risk cases
  - **📄 Sample CSV Download** - Real IOSS report demonstration
  - Progress tracking and smooth transitions
  - Toast notifications and form validation

### Sample CSV Download Feature (`GET /api/reports/sample`)
- **Purpose:** Demonstrate VATpilot's IOSS reporting capabilities
- **Features:**
  - Downloads real IOSS compliance CSV with 516 orders across 27 EU countries
  - Official EU IOSS Monthly Return format (945 bytes, 28 rows)
  - Smart path resolution for development and production
  - Automatic filename: `VATpilot_Sample_Report.csv`
  - Integrated into quiz success flow with one-click access

### Risk Assessment Logic
```javascript
// Critical Risk: Non-EU origin + EU customers + No IOSS
if (origin === 'non_eu' && destination === 'eu' && ioss_status !== 'yes') {
  return 'CRITICAL_RISK'
}

// Moderate Risk: Has IOSS but potential compliance gaps
if (origin === 'non_eu' && destination === 'eu' && ioss_status === 'yes') {
  return 'MODERATE_RISK'
}

// Low Risk: All other scenarios
return 'LOW_RISK'
```

## 🎨 Design System

### Color Scheme
Utilizes Tailwind CSS v4 CSS variables for consistent theming:
- `--color-background` - Main background
- `--color-foreground` - Primary text
- `--color-primary` - Brand/accent color
- `--color-card` - Card backgrounds
- `--color-destructive` - Error/critical states

### Typography
- **Headings:** Font weights 600-700, responsive sizing
- **Body:** Default system font stack
- **Code:** Monospace for technical elements

### Components
All UI components follow shadcn/ui patterns:
- Consistent spacing (4px grid)
- Accessible design (ARIA support)
- Dark mode compatibility
- Mobile-first responsive design

## 🔧 Development Scripts

### Main Scripts
```bash
pnpm run dev        # Start both client and server in development
pnpm run build      # Build for production
pnpm run start      # Start production server
```

### Client Scripts
```bash
pnpm run client:dev # Start development server
pnpm run build      # Build for production
pnpm run preview    # Preview production build
pnpm run lint       # Run ESLint
```

### Server Scripts
```bash
pnpm run server:dev # Start with nodemon
pnpm run start      # Start production server
pnpm run lint       # Run ESLint
```

### 🧪 Data Generation Scripts
```bash
pnpm run generate-data  # Generate 1,000 synthetic orders for testing
pnpm run validate-data  # Validate and analyze generated data
```

**Synthetic Data Features:**
- 1,000 realistic e-commerce orders with proper IOSS edge cases
- 70% EU customers, 30% non-EU (realistic distribution)
- Strategic value ranges: High (>€150), IOSS eligible (€22-€150), Low (<€22)
- Complete compliance metadata for testing classification rules
- Output: `server/data/dummy_orders.json`

## 🚀 Deployment

### Frontend (Recommended: Vercel/Netlify)
```bash
cd client
pnpm run build
# Deploy dist/ folder
```

### Backend (Recommended: Render.com)
```bash
cd server
# Set NODE_ENV=production  
# Configure MongoDB connection and environment variables
pnpm run start
```

**Production Deployment**: Currently hosted on [Render.com](https://render.com) for reliable environment variable handling and excellent uptime.

### Environment Variables

**Server (.env):**
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/vatpilot
RESEND_API_KEY=re_your_resend_api_key_here
FROM_EMAIL="VATpilot Support <vatpilot@mynexusgroup.com>"
JWT_SECRET=your-super-secret-jwt-key-here
CORS_ORIGIN=http://localhost:5173
```

**Client (.env):**
```env
VITE_API_URL=http://localhost:5000/api
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Quiz flow completion (all 4 steps)
- [ ] Risk assessment accuracy
- [ ] Email validation and submission
- [ ] Responsive design (mobile/desktop)
- [ ] Dark mode functionality
- [ ] Toast notifications
- [ ] Form error handling

## 📝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Coding Standards
- Use **ESLint** configuration
- Follow **React 19** best practices
- Implement **responsive design** first
- Add **TypeScript JSDoc** comments
- Use **semantic commit messages**

## 📊 Performance Considerations

- **React 19:** Concurrent features for better UX
- **Vite:** Fast HMR and optimized builds
- **Code Splitting:** Route-based lazy loading
- **Image Optimization:** WebP/AVIF support
- **Bundle Analysis:** Regular bundle size monitoring

## 🔒 Security

- **JWT Authentication:** Secure token-based auth
- **Input Validation:** Zod schema validation
- **CORS Configuration:** Restricted origins
- **Environment Variables:** Sensitive data protection
- **Password Hashing:** bcrypt implementation

## 📞 Support & Contact

- **GitHub Issues:** [Create an issue](https://github.com/wmweemba/ioss-compliance-reporter/issues)
- **Documentation:** See project markdown files
- **Updates:** Check [changelog.md](./changelog.md)
- **Website:** VATpilot.com (coming soon)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **shadcn/ui** for the excellent component library
- **Tailwind CSS** for the utility-first styling approach
- **React Team** for React 19 and concurrent features
- **Vite Team** for the amazing build tool experience
- **Resend** for reliable email delivery

---

**VATpilot - Automating EU VAT compliance for e-commerce businesses** 🚀