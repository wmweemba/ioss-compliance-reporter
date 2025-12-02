# Changelog

All notable changes to VATpilot will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- User authentication and dashboard
- Automated IOSS report generation
- Multi-tenant SaaS architecture
- Subscription billing system
- Advanced analytics and insights
- API documentation and developer portal

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