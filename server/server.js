import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import { Resend } from 'resend'
import Lead from './models/Lead.js'

// Load environment variables only in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config()
  console.log('🔧 Loading .env file in development')
} else {
  console.log('🚀 Production mode - using platform environment variables')
}

// Environment variable validation
console.log('🔧 Environment Check:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('PORT:', process.env.PORT)
console.log('MONGO_URI present:', !!process.env.MONGO_URI)
console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)
console.log('FROM_EMAIL present:', !!process.env.FROM_EMAIL)
console.log('CORS_ORIGIN present:', !!process.env.CORS_ORIGIN)

// Initialize Express app
const app = express()
const PORT = parseInt(process.env.PORT) || 5000

// Platform detection
const platform = process.env.RENDER ? 'Render' : 
                 process.env.RAILWAY_ENVIRONMENT ? 'Railway' : 
                 process.env.VERCEL ? 'Vercel' : 'Local'
console.log(`🌐 Platform detected: ${platform}`)
if (process.env.PORT) {
  console.log('Platform PORT:', process.env.PORT)
}

// Determine CORS origin based on environment
const isProduction = process.env.NODE_ENV === 'production'
const defaultCorsOrigin = isProduction ? 'https://vatpilot.netlify.app' : 'http://localhost:5173'

// Railway environment variable fallback - try different variable name patterns
const corsOrigin = process.env.CORS_ORIGIN || 
                   process.env.VATPILOT_CORS_ORIGIN ||
                   process.env.RAILWAY_CORS_ORIGIN || 
                   defaultCorsOrigin

// Try to access MongoDB URI with different patterns
const mongoUri = process.env.MONGO_URI || 
                 process.env.VATPILOT_MONGO_URI ||
                 process.env.RAILWAY_MONGO_URI || 
                 process.env.DATABASE_URL

// Try to access Resend API key with different patterns  
const resendApiKey = process.env.RESEND_API_KEY || 
                     process.env.VATPILOT_RESEND_API_KEY ||
                     process.env.RAILWAY_RESEND_API_KEY

// Try to access other environment variables with prefixes
const fromEmail = process.env.FROM_EMAIL || 
                  process.env.VATPILOT_FROM_EMAIL ||
                  '"VATpilot Support <onboarding@resend.dev>"'

const jwtSecret = process.env.JWT_SECRET || 
                  process.env.VATPILOT_JWT_SECRET ||
                  'fallback-secret'

console.log('🔍 Fallback check - MONGO_URI:', !!mongoUri)
console.log('🔍 Fallback check - RESEND_API_KEY:', !!resendApiKey)
console.log('🔍 Fallback check - FROM_EMAIL:', !!fromEmail)
console.log('🔍 Fallback check - CORS_ORIGIN:', corsOrigin)
console.log('🔍 Checking VATPILOT_ prefixed vars:', Object.keys(process.env).filter(key => key.startsWith('VATPILOT_')))

// Log environment status for debugging
console.log('🌍 Environment:', process.env.NODE_ENV || 'development')
console.log('🚀 Starting server on port:', PORT)
console.log('🔧 CORS Origin:', corsOrigin)
console.log('📧 From Email:', fromEmail || 'not set')
console.log('🗄️ MongoDB URI:', process.env.MONGO_URI ? 'configured' : 'missing')
console.log('📧 Resend API Key:', process.env.RESEND_API_KEY ? 'configured' : 'missing')

// Initialize Resend (only if API key is available)
let resend = null
if (resendApiKey) {
  resend = new Resend(resendApiKey)
  console.log('✅ Resend email service initialized')
} else {
  console.log('⚠️ Resend API key not found - email functionality will be disabled')
}

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// MongoDB Connection
const connectDB = async () => {
  if (!mongoUri) {
    console.log('⚠️ MongoDB URI not found - database functionality will be limited')
    return
  }

  try {
    console.log('🔗 Attempting MongoDB connection with URI pattern:', mongoUri.substring(0, 20) + '...')
    const conn = await mongoose.connect(mongoUri)
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message)
    console.log('⚠️ Server will continue without database connection')
  }
}

// Connect to database
connectDB()

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'VATpilot API is running',
    timestamp: new Date().toISOString()
  })
})

// Detailed system health check route
app.get('/api/health/detailed', async (req, res) => {
  const healthStatus = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || PORT,
    services: {
      database: 'unknown',
      email: 'unknown'
    },
    configuration: {
      mongoUri: process.env.MONGO_URI ? 'configured' : 'missing',
      resendApiKey: process.env.RESEND_API_KEY ? 'configured' : 'missing',
      fromEmail: process.env.FROM_EMAIL ? 'configured' : 'missing',
      corsOrigin: process.env.CORS_ORIGIN ? 'configured' : 'missing',
      jwtSecret: process.env.JWT_SECRET ? 'configured' : 'missing'
    },
    versions: {
      node: process.version,
      platform: process.platform
    }
  }

  // Test database connection
  try {
    if (mongoose.connection.readyState === 1) {
      healthStatus.services.database = 'connected'
      // Test a simple database operation
      const testQuery = await mongoose.connection.db.admin().ping()
      if (testQuery.ok === 1) {
        healthStatus.services.database = 'healthy'
      }
    } else if (mongoose.connection.readyState === 2) {
      healthStatus.services.database = 'connecting'
    } else {
      healthStatus.services.database = 'disconnected'
    }
  } catch (error) {
    healthStatus.services.database = `error: ${error.message}`
  }

  // Test email service
  if (resend) {
    healthStatus.services.email = 'configured'
  } else {
    healthStatus.services.email = 'not configured'
  }

  // Determine overall status
  const hasErrors = Object.values(healthStatus.configuration).includes('missing') || 
                   healthStatus.services.database.startsWith('error') ||
                   healthStatus.services.database === 'disconnected'

  if (hasErrors) {
    healthStatus.status = 'DEGRADED'
  }

  res.json(healthStatus)
})

// Test endpoint for leads creation (dry-run)
app.post('/api/test/leads', async (req, res) => {
  try {
    console.log('🧪 TEST: Received lead test request:', req.body)
    
    const { email, riskLevel, userAnswers, source = 'test' } = req.body

    // Test validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
        test: 'validation_failed'
      })
    }

    const validRiskLevels = ['CRITICAL_RISK', 'MODERATE_RISK', 'LOW_RISK']
    if (!validRiskLevels.includes(riskLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid risk level',
        test: 'validation_failed'
      })
    }

    console.log('🧪 TEST: Validation passed')

    // Test database connection
    let dbTest = 'unknown'
    try {
      if (mongoose.connection.readyState === 1) {
        console.log('🧪 TEST: Database connection active')
        dbTest = 'connected'
        
        // Test Lead model without saving
        const testLead = new Lead({
          email: email.toLowerCase().trim(),
          riskLevel,
          source,
          metadata: {
            userAnswers,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          }
        })
        
        // Validate without saving
        await testLead.validate()
        console.log('🧪 TEST: Lead model validation passed')
        dbTest = 'model_valid'
        
      } else {
        console.log('🧪 TEST: Database not connected')
        dbTest = 'disconnected'
      }
    } catch (error) {
      console.error('🧪 TEST: Database error:', error)
      dbTest = `error: ${error.message}`
    }

    // Test email content generation
    let emailTest = 'unknown'
    try {
      console.log('🧪 TEST: Generating email content')
      const emailContent = generateEmailContent(riskLevel, email)
      console.log('🧪 TEST: Email content generated successfully')
      emailTest = 'content_generated'
      
      if (resend) {
        console.log('🧪 TEST: Resend service available')
        emailTest = 'service_available'
      } else {
        console.log('🧪 TEST: Resend service not configured')
        emailTest = 'service_missing'
      }
    } catch (error) {
      console.error('🧪 TEST: Email content error:', error)
      emailTest = `error: ${error.message}`
    }

    res.json({
      success: true,
      message: 'Test completed successfully',
      test: 'dry_run',
      results: {
        database: dbTest,
        email: emailTest,
        validation: 'passed',
        mongoose_state: mongoose.connection.readyState,
        environment: process.env.NODE_ENV || 'development'
      },
      receivedData: {
        email,
        riskLevel,
        userAnswers,
        source
      }
    })

  } catch (error) {
    console.error('🧪 TEST: Unexpected error:', error)
    res.status(500).json({
      success: false,
      message: 'Test failed with error',
      test: 'error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

/**
 * POST /api/leads - Create new lead from risk quiz
 * Captures email, saves to MongoDB, and sends welcome email
 */
app.post('/api/leads', async (req, res) => {
  try {
    const { 
      email, 
      riskLevel, 
      userAnswers,
      source = 'risk_quiz' 
    } = req.body

    // Validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      })
    }

    if (!riskLevel) {
      return res.status(400).json({
        success: false,
        message: 'Risk level is required'
      })
    }

    // Validate risk level
    const validRiskLevels = ['CRITICAL_RISK', 'MODERATE_RISK', 'LOW_RISK']
    if (!validRiskLevels.includes(riskLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid risk level'
      })
    }

    // Check if lead already exists
    const existingLead = await Lead.findOne({ email: email.toLowerCase().trim() })
    if (existingLead) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
        leadId: existingLead._id
      })
    }

    // Create new lead
    const leadData = {
      email: email.toLowerCase().trim(),
      riskLevel,
      source,
      metadata: {
        userAnswers,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      }
    }

    console.log('💾 Creating new lead with data:', leadData)
    const newLead = new Lead(leadData)
    console.log('💾 Saving lead to database...')
    const savedLead = await newLead.save()

    console.log('📝 Lead saved successfully:', savedLead._id)

    // Prepare email content based on risk level
    console.log('📧 Generating email content for risk level:', riskLevel)
    const emailContent = generateEmailContent(riskLevel, email)
    console.log('📧 Email content generated successfully')

    // Send email via Resend (if available)
    if (resend) {
      console.log('📧 Resend service available, attempting to send email')
      try {
        const emailResponse = await resend.emails.send({
          from: fromEmail || 'VATpilot Support <onboarding@resend.dev>',
          to: [email],
          subject: emailContent.subject,
          html: emailContent.html,
          headers: {
            'X-Entity-Ref-ID': savedLead._id.toString(),
            'List-Unsubscribe': '<mailto:unsubscribe@resend.dev>',
          },
          tags: [
            {
              name: 'category',
              value: 'risk-assessment'
            },
            {
              name: 'risk-level',
              value: riskLevel.toLowerCase()
            }
          ]
        })

        // Update lead with email sent status
        savedLead.emailSent = true
        savedLead.emailSentAt = new Date()
        await savedLead.save()

        console.log(`✅ Email sent successfully to ${email}:`, emailResponse.id)

        // Return success response
        res.status(201).json({
          success: true,
          message: 'Lead created and email sent successfully',
          leadId: savedLead._id,
          emailId: emailResponse.id,
          riskLevel: savedLead.riskLevel
        })

      } catch (emailError) {
        console.error('❌ Email sending failed:', emailError)
        
        // Still return success for lead creation, but note email failure
        res.status(201).json({
          success: true,
          message: 'Lead created successfully, but email sending failed',
          leadId: savedLead._id,
          emailError: 'Failed to send welcome email',
          riskLevel: savedLead.riskLevel
        })
      }
    } else {
      // Email service not available
      console.log('⚠️ Email service not configured - skipping email send')
      
      res.status(201).json({
        success: true,
        message: 'Lead created successfully (email service unavailable)',
        leadId: savedLead._id,
        emailError: 'Email service not configured',
        riskLevel: savedLead.riskLevel
      })
    }

  } catch (error) {
    console.error('❌ Lead creation error:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    })

    // Handle MongoDB duplicate key error (11000)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email address is already registered'
      })
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message)
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      })
    }

    // Enhanced error logging for production debugging
    console.error('Full error object:', JSON.stringify(error, null, 2))
    
    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    })
  }
})

/**
 * GET /api/leads - Get all leads (for admin/analytics)
 */
app.get('/api/leads', async (req, res) => {
  try {
    const { page = 1, limit = 10, riskLevel } = req.query
    
    const query = {}
    if (riskLevel) {
      query.riskLevel = riskLevel
    }

    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-metadata.ipAddress -metadata.userAgent') // Hide sensitive data

    const total = await Lead.countDocuments(query)

    res.json({
      success: true,
      leads,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: leads.length,
        totalLeads: total
      }
    })
  } catch (error) {
    console.error('❌ Error fetching leads:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads'
    })
  }
})

/**
 * Generate email content based on risk level
 */
function generateEmailContent(riskLevel, email) {
  const baseStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .risk-critical { border-left: 4px solid #dc2626; background: #fef2f2; padding: 15px; margin: 20px 0; border-radius: 4px; }
      .risk-moderate { border-left: 4px solid #d97706; background: #fffbeb; padding: 15px; margin: 20px 0; border-radius: 4px; }
      .cta-button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
    </style>
  `

  if (riskLevel === 'CRITICAL_RISK') {
    return {
      subject: 'Important: EU VAT Compliance Assessment Results',
      html: `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Critical IOSS Risk Detected</h1>
              <p>VATpilot has identified compliance issues with your EU shipments</p>
            </div>
            <div class="content">
              <h2>Hello!</h2>
              
              <div class="risk-critical">
                <strong>CRITICAL RISK ASSESSMENT:</strong><br>
                Without proper IOSS registration, your EU customers are facing:
                <ul>
                  <li>🚫 Packages stopped at customs</li>
                  <li>💰 Surprise VAT fees and handling charges</li>
                  <li>📉 High rejection rates and customer disputes</li>
                  <li>⚖️ Potential legal compliance issues</li>
                </ul>
              </div>

              <h3>What happens next?</h3>
              <p>Our compliance experts will contact you within 24 hours with:</p>
              <ul>
                <li>✅ Free IOSS registration guidance</li>
                <li>📊 Automated monthly reporting setup</li>
                <li>🛡️ Complete EU compliance solution</li>
              </ul>

              <a href="#" class="cta-button">Schedule Free Consultation →</a>

              <p>Time is critical - every day of non-compliance increases your risk exposure.</p>

              <div class="footer">
                <p>VATpilot | Automating EU VAT compliance for e-commerce</p>
                <p><small>You received this because you completed our risk assessment at ${new Date().toLocaleDateString()}</small></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    }
  } else if (riskLevel === 'MODERATE_RISK') {
    return {
      subject: 'Your IOSS Compliance Assessment Results',
      html: `
        <!DOCTYPE html>
        <html>
        <head>${baseStyles}</head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Compliance Gap Detected</h1>
              <p>VATpilot has identified optimization opportunities in your IOSS setup</p>
            </div>
            <div class="content">
              <h2>Hello!</h2>
              
              <div class="risk-moderate">
                <strong>MODERATE RISK ASSESSMENT:</strong><br>
                You have an IOSS number, but potential compliance gaps include:
                <ul>
                  <li>📋 Missing monthly report submissions</li>
                  <li>💼 Incorrect VAT calculations</li>
                  <li>📊 Incomplete transaction records</li>
                  <li>⚖️ Audit risk from incomplete filings</li>
                </ul>
              </div>

              <h3>How we can help:</h3>
              <p>Our IOSS automation platform will:</p>
              <ul>
                <li>🤖 Automatically generate monthly reports</li>
                <li>📈 Track all your EU transactions</li>
                <li>✅ Ensure 100% compliance</li>
                <li>🛡️ Protect against audits and fines</li>
              </ul>

              <a href="#" class="cta-button">Join Beta Program →</a>

              <p>Don't let compliance gaps put your business at risk.</p>

              <div class="footer">
                <p>VATpilot | Your EU compliance automation partner</p>
                <p><small>You received this because you completed our risk assessment at ${new Date().toLocaleDateString()}</small></p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    }
  }

  // Default/fallback email
  return {
    subject: '✅ Your IOSS Risk Assessment Results',
    html: `
      <!DOCTYPE html>
      <html>
      <head>${baseStyles}</head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Assessment Complete</h1>
            <p>Your VATpilot compliance results</p>
          </div>
          <div class="content">
            <h2>Thank you for using VATpilot's IOSS Risk Assessment!</h2>
            <p>Based on your responses, your current shipping profile appears to be compliant.</p>
            
            <p>We'll keep you updated on any changes to EU VAT regulations that might affect your business.</p>

            <div class="footer">
              <p>VATpilot | Your EU compliance partner</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  }
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  })
})

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error)
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  })
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...')
  await mongoose.connection.close()
  console.log('✅ Database connection closed')
  process.exit(0)
})

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 API endpoints available at /api/`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`)
  
  if (process.env.NODE_ENV === 'production') {
    console.log(`🌐 Production server ready`)
  } else {
    console.log(`🔧 Development server at http://localhost:${PORT}`)
  }
})

// Handle server shutdown gracefully
server.keepAliveTimeout = 120 * 1000
server.headersTimeout = 120 * 1000