import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import { Resend } from 'resend'
import Lead from './models/Lead.js'

// Load environment variables
dotenv.config()

// Initialize Express app
const app = express()
const PORT = parseInt(process.env.PORT) || 5000

// Log environment status for debugging
console.log('🌍 Environment:', process.env.NODE_ENV || 'development')
console.log('🚀 Starting server on port:', PORT)
console.log('🔧 CORS Origin:', process.env.CORS_ORIGIN || 'http://localhost:5173')
console.log('📧 From Email:', process.env.FROM_EMAIL || 'not set')
console.log('🗄️ MongoDB URI:', process.env.MONGO_URI ? 'configured' : 'missing')

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY)

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// MongoDB Connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI)
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message)
    process.exit(1)
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

    const newLead = new Lead(leadData)
    const savedLead = await newLead.save()

    // Prepare email content based on risk level
    const emailContent = generateEmailContent(riskLevel, email)

    // Send email via Resend
    try {
      const emailResponse = await resend.emails.send({
        from: process.env.FROM_EMAIL || 'VATpilot Support <onboarding@resend.dev>',
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

  } catch (error) {
    console.error('❌ Lead creation error:', error)

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