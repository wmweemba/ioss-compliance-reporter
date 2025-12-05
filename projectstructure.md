# Project Structure

This document outlines the complete folder and file organization for VATpilot - the EU VAT compliance automation SaaS.

## 📁 Root Directory Structure

```
ioss-compliance-reporter/
├── 📁 client/                    # Frontend React application
├── 📁 server/                    # Backend Express.js API
├── 📁 scripts/                   # Utility scripts for data generation and development
├── 📄 .gitignore                # Git ignore rules
├── 📄 README.md                 # Main project documentation
├── 📄 changelog.md              # Version history and changes
├── 📄 projectstructure.md       # This file - project organization
├── 📄 package.json              # Root workspace configuration
├── 📄 pnpm-lock.yaml            # pnpm lock file for dependencies
└── 📄 LICENSE                   # Project license (to be added)
```

---

## 🎨 Frontend (Client) Structure

```
client/
├── 📁 public/                   # Static assets served by Vite
│   └── 📄 vite.svg             # Vite logo
├── 📁 src/                      # Source code
│   ├── 📁 assets/              # Application assets
│   │   └── 📄 react.svg        # React logo
│   ├── 📁 components/          # React components
│   │   ├── 📄 RiskQuiz.jsx     # EU VAT Risk Assessment component
│   │   └── 📁 ui/              # shadcn/ui components
│   │       ├── 📄 avatar.jsx   # Avatar component
│   │       ├── 📄 button.jsx   # Button component with variants
│   │       ├── 📄 card.jsx     # Card layout component
│   │       ├── 📄 dialog.jsx   # Modal dialog component
│   │       ├── 📄 dropdown-menu.jsx # Dropdown menu component
│   │       ├── 📄 form.jsx     # Form wrapper component
│   │       ├── 📄 input.jsx    # Input field component
│   │       ├── 📄 label.jsx    # Form label component
│   │       └── 📄 sonner.jsx   # Toast notification component
│   ├── 📁 lib/                 # Utility libraries
│   │   └── 📄 utils.js         # Helper functions (cn, clsx, etc.)
│   ├── 📁 pages/               # Route pages (future)
│   ├── 📁 hooks/               # Custom React hooks (future)
│   ├── 📁 contexts/            # React contexts (future)
│   ├── 📄 App.jsx              # Main app component
│   ├── 📄 App.css              # App-specific styles
│   ├── 📄 main.jsx             # React root entry point
│   └── 📄 index.css            # Global styles with Tailwind
├── 📄 components.json          # shadcn/ui configuration
├── 📄 eslint.config.js         # ESLint configuration
├── 📄 index.html               # HTML entry point
├── 📄 jsconfig.json            # JavaScript configuration
├── 📄 package.json             # Dependencies and scripts
├── 📄 pnpm-lock.yaml           # pnpm lock file
├── 📄 README.md                # Client-specific documentation
└── 📄 vite.config.js           # Vite build configuration
```

---

## 🚀 Backend (Server) Structure

```
server/
├── 📁 data/                    # Generated and test data
│   └── 📄 dummy_orders.json    # Synthetic order data (701KB, 1000 records)
├── 📁 models/                  # MongoDB/Mongoose models
│   └── 📄 Lead.js              # Lead capture model
├── 📁 src/ (future)            # Source code organization
│   ├── 📁 controllers/         # Route controllers
│   ├── 📁 middleware/          # Express middleware
│   ├── 📁 routes/              # API route definitions
│   ├── 📁 services/            # Business logic services
│   └── 📁 utils/               # Utility functions
├── 📁 config/                  # Configuration files
│   └── 📄 database.js          # Database connection
├── 📁 tests/                   # Test files
├── 📄 .env                     # Environment variables (not in repo)
├── 📄 .env.example             # Environment template
├── 📄 package.json             # Dependencies and scripts
├── 📄 pnpm-lock.yaml           # pnpm lock file
└── 📄 server.js                # Entry point
```

---

## 🧪 Scripts Directory Structure

```
scripts/
├── 📄 env.js                   # Environment configuration utility
├── 📄 generate-dummy-data.js   # Synthetic data generator using Faker.js
├── 📄 validate-data.js         # Data validation and analysis tool
└── 📄 README.md                # Scripts documentation and usage guide
```

---

## 🎯 Component Architecture

### Core Components

#### 🧩 RiskQuiz.jsx
**Purpose**: Multi-step EU VAT risk assessment
**Location**: `/client/src/components/RiskQuiz.jsx`

**Internal Structure**:
```javascript
RiskQuiz/
├── State Management
│   ├── currentStep          # Current quiz step (0-3)
│   ├── answers             # User's quiz responses
│   ├── showResults         # Results screen visibility
│   └── emailSubmitted      # Email capture status
├── Components
│   ├── Question Display    # Current question rendering
│   ├── Answer Options      # Selectable responses
│   ├── Progress Bar        # Step completion indicator
│   ├── Risk Assessment     # Results calculation
│   ├── Email Capture       # React Hook Form integration
│   └── Navigation          # Back/Next buttons
└── Logic
    ├── Risk Calculation    # CRITICAL/MODERATE/LOW logic
    ├── Form Validation     # Zod schema validation
    └── State Transitions   # Step navigation flow
```

### UI Component Library (shadcn/ui)

#### 📦 Button (`/client/src/components/ui/button.jsx`)
- **Variants**: default, destructive, outline, secondary, ghost, link
- **Sizes**: default, sm, lg, icon
- **Features**: Loading states, disabled states, full accessibility

#### 🃏 Card (`/client/src/components/ui/card.jsx`)
- **Sub-components**: Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription
- **Usage**: Layout containers, content organization

#### 📝 Input (`/client/src/components/ui/input.jsx`)
- **Features**: Focus states, error states, disabled states
- **Integration**: Works with React Hook Form and validation

#### 🏷️ Label (`/client/src/components/ui/label.jsx`)
- **Features**: Accessibility compliance, form association
- **Integration**: Radix UI Label primitive

---

## 🎨 Styling Architecture

### Tailwind CSS v4 Structure

```
Styling System/
├── CSS Variables              # Design tokens
│   ├── Colors                # --color-primary, --color-background, etc.
│   ├── Spacing               # --space-*, consistent spacing scale
│   ├── Typography            # Font families, sizes, weights
│   └── Borders               # Border radius, widths
├── Component Classes          # shadcn/ui component styling
├── Utility Classes           # Tailwind utility classes
└── Custom Styles             # Project-specific overrides
```

### CSS Variables (Design Tokens)

**Location**: `/client/src/index.css`

```css
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --secondary: oklch(0.97 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  /* ... additional design tokens */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... dark mode overrides */
}
```

---

## 🛠️ Configuration Files

### 📋 Package Management

#### Client package.json
```json
{
  "name": "client",
  "type": "module",
  "dependencies": {
    "react": "^19.2.0",
    "vite": "^7.2.4",
    "tailwindcss": "^4.1.17"
    // ... full dependency list
  }
}
```

#### Server package.json
```json
{
  "name": "server",
  "type": "module",
  "dependencies": {
    "express": "^5.1.0",
    "mongoose": "^9.0.0",
    "jsonwebtoken": "^9.0.2"
    // ... backend dependencies
  }
}
```

### ⚙️ Build Configuration

#### Vite Config (`/client/vite.config.js`)
```javascript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

#### shadcn/ui Config (`/client/components.json`)
```json
{
  "style": "new-york",
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral"
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

---

## 📂 Future Directory Additions

### Planned Client Structure
```
client/src/
├── 📁 pages/                   # Route components
│   ├── 📄 HomePage.jsx         # Landing page
│   ├── 📄 DashboardPage.jsx    # User dashboard
│   └── 📄 ReportsPage.jsx      # IOSS reports
├── 📁 hooks/                   # Custom React hooks
│   ├── 📄 useAuth.js           # Authentication hook
│   └── 📄 useApi.js            # API interaction hook
├── 📁 contexts/                # React contexts
│   ├── 📄 AuthContext.jsx      # User authentication
│   └── 📄 ThemeContext.jsx     # Theme management
├── 📁 services/                # API services
│   ├── 📄 api.js               # Axios configuration
│   └── 📄 auth.js              # Authentication API calls
└── 📁 types/                   # TypeScript definitions (if added)
```

### Planned Server Structure
```
server/src/
├── 📁 controllers/             # Request handlers
│   ├── 📄 authController.js    # Authentication logic
│   ├── 📄 quizController.js    # Quiz submission handling
│   └── 📄 reportController.js  # IOSS report generation
├── 📁 models/                  # Database models
│   ├── 📄 User.js              # User schema
│   ├── 📄 QuizSubmission.js    # Quiz results schema
│   └── 📄 IOSSReport.js        # Report schema
├── 📁 routes/                  # API endpoints
│   ├── 📄 auth.js              # /api/auth routes
│   ├── 📄 quiz.js              # /api/quiz routes
│   └── 📄 reports.js           # /api/reports routes
├── 📁 middleware/              # Express middleware
│   ├── 📄 auth.js              # JWT verification
│   └── 📄 validation.js        # Request validation
└── 📁 services/                # Business logic
    ├── 📄 emailService.js      # Email notifications
    └── 📄 reportService.js     # Report generation
```

---

## 🔄 Data Flow Architecture

### Component Interaction Flow
```
App.jsx
├── RiskQuiz.jsx
│   ├── Quiz Questions (useState)
│   ├── Risk Assessment (logic functions)
│   ├── Email Capture (React Hook Form)
│   └── Results Display (conditional rendering)
└── Toaster (Sonner notifications)
```

### Planned API Integration
```
Frontend (React)
    ↓ (Axios requests)
Backend API (Express)
    ↓ (Mongoose ODM)
Database (MongoDB)
    ↓ (Data persistence)
User Data & Reports
```

---

## 📋 File Naming Conventions

### React Components
- **PascalCase**: `RiskQuiz.jsx`, `EmailCapture.jsx`
- **UI Components**: `button.jsx`, `card.jsx` (shadcn/ui convention)

### Utilities & Services
- **camelCase**: `utils.js`, `apiService.js`
- **kebab-case**: `email-service.js` (for multi-word files)

### Configuration
- **lowercase**: `package.json`, `vite.config.js`
- **UPPERCASE**: `.env`, `README.md`

---

## 🚀 Development Workflow

### Adding New Components
1. Create in `/client/src/components/`
2. Follow shadcn/ui patterns for UI components
3. Use TypeScript JSDoc comments
4. Export from component file
5. Update documentation

### Adding New API Routes
1. Create controller in `/server/src/controllers/`
2. Define route in `/server/src/routes/`
3. Add middleware if needed
4. Update API documentation

### Adding Dependencies
```bash
# Frontend dependencies
cd client && pnpm add [package-name]

# Backend dependencies  
cd server && pnpm add [package-name]
```

---

This project structure is designed to be scalable, maintainable, and follows modern MERN stack best practices. The organization supports both the current quiz functionality and future expansion into a full IOSS compliance platform.