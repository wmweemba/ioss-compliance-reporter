import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
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

// Environment variable configuration with fallbacks
const corsOrigin = process.env.CORS_ORIGIN || 
                   process.env.VATPILOT_CORS_ORIGIN ||
                   defaultCorsOrigin

// MongoDB URI with fallback patterns
const mongoUri = process.env.MONGO_URI || 
                 process.env.VATPILOT_MONGO_URI ||
                 process.env.DATABASE_URL

// Resend API key with fallback patterns  
const resendApiKey = process.env.RESEND_API_KEY || 
                     process.env.VATPILOT_RESEND_API_KEY

// Try to access other environment variables with prefixes
const fromEmail = process.env.FROM_EMAIL || 
                  process.env.VATPILOT_FROM_EMAIL ||
                  '"VATpilot Support <vatpilot@mynexusgroup.com>"'

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
    const conn = await mongoose.connect(mongoUri, {
      dbName: 'vatpilot' // Explicitly set database name
    })
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    console.log(`📊 Database: ${conn.connection.name}`)
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

// Sample CSV download route
app.get('/api/reports/sample', (req, res) => {
  try {
    // Use proper path resolution - check both possible locations
    let reportPath = path.join(process.cwd(), 'server', 'reports', 'ioss_return_2025_12.csv')
    
    // If server is run from server directory, adjust path
    if (!fs.existsSync(reportPath)) {
      reportPath = path.join(process.cwd(), 'reports', 'ioss_return_2025_12.csv')
    }
    
    console.log('📊 Checking for sample report at:', reportPath)
    console.log('📂 File exists:', fs.existsSync(reportPath))
    
    // Check if report exists
    if (fs.existsSync(reportPath)) {
      // File exists, send it directly
      console.log('📤 Sending existing sample report')
      res.download(reportPath, 'VATpilot_Sample_Report.csv', (err) => {
        if (err) {
          console.error('❌ Download error:', err)
          res.status(500).json({ error: 'Download failed: ' + err.message })
        } else {
          console.log('📤 Sample report downloaded successfully')
        }
      })
    } else {
      console.log('❌ Sample report file not found')
      res.status(404).json({ 
        error: 'Sample report not available',
        message: 'Please generate the sample data first by running: npm run generate-ioss-report'
      })
    }
  } catch (error) {
    console.error('❌ Sample report endpoint error:', error)
    res.status(500).json({ error: 'Internal server error: ' + error.message })
  }
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
          from: fromEmail || 'VATpilot Support <vatpilot@mynexusgroup.com>',
          to: [email],
          bcc: ['wmweemba@gmail.com'],
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
 * Generate professional 'System Report' style email template
 */
function generateEmailContent(riskLevel, email) {
  const getEmailTemplate = (riskLevel) => {
    const siteUrl = 'https://vatpilot.netlify.app'
    
    if (riskLevel === 'CRITICAL_RISK') {
      return {
        subject: 'URGENT: IOSS System Report - Critical Risk Detected',
        html: `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>VATpilot System Report</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4;">
            <tr>
              <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; margin: 20px auto;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #1a365d; padding: 30px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">VATpilot</h1>
                      <p style="margin: 5px 0 0; color: #a0aec0; font-size: 14px;">IOSS Compliance Engine</p>
                    </td>
                  </tr>
                  
                  <!-- Hero Section - Critical Risk -->
                  <tr>
                    <td style="background-color: #dc2626; padding: 20px 40px; text-align: center;">
                      <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">🚨 CRITICAL RISK DETECTED</h2>
                      <p style="margin: 8px 0 0; color: #fecaca; font-size: 14px;">System Analysis Complete - Immediate Action Required</p>
                    </td>
                  </tr>
                  
                  <!-- Body Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h3 style="margin: 0 0 20px; color: #1a365d; font-size: 18px;">System Analysis Results</h3>
                      
                      <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                        We analyzed your shipping profile. While you have an IOSS number, you are missing the monthly filing bridge.
                      </p>
                      
                      <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6; background-color: #e6fffa; padding: 15px; border-radius: 6px; border-left: 4px solid #38b2ac;">
                        <strong>✅ You have been added to our Beta waitlist.</strong> Our team will be in touch soon with onboarding instructions.
                      </p>
                      
                      <!-- Risk Points -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="padding: 8px 0; color: #4a5568; font-size: 15px;">
                            🔴 <strong>Risk:</strong> Audit & Fines
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4a5568; font-size: 15px;">
                            ✅ <strong>Fix:</strong> Automated Monthly CSV Reports
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="background-color: #dc2626; border-radius: 6px;">
                                  <a href="${siteUrl}" style="display: block; padding: 15px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
                                    Activate Compliance Automation
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f7fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 5px; color: #1a365d; font-size: 16px; font-weight: bold;">VATpilot</p>
                      <p style="margin: 0; color: #718096; font-size: 14px;">The IOSS Engine for Dropshippers</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `
      }
    } else if (riskLevel === 'MODERATE_RISK') {
      return {
        subject: 'IOSS System Report - Audit Risk Detected',
        html: `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>VATpilot System Report</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4;">
            <tr>
              <td align="center">
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; margin: 20px auto;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background-color: #1a365d; padding: 30px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">VATpilot</h1>
                      <p style="margin: 5px 0 0; color: #a0aec0; font-size: 14px;">IOSS Compliance Engine</p>
                    </td>
                  </tr>
                  
                  <!-- Hero Section - Moderate Risk -->
                  <tr>
                    <td style="background-color: #d97706; padding: 20px 40px; text-align: center;">
                      <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">⚠️ AUDIT RISK DETECTED</h2>
                      <p style="margin: 8px 0 0; color: #fed7aa; font-size: 14px;">System Analysis Complete - Filing Gap Identified</p>
                    </td>
                  </tr>
                  
                  <!-- Body Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h3 style="margin: 0 0 20px; color: #1a365d; font-size: 18px;">System Analysis Results</h3>
                      
                      <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                        We analyzed your shipping profile. While you have an IOSS number, you are missing the monthly filing bridge.
                      </p>
                      
                      <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6; background-color: #fffbeb; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
                        <strong>✅ You have been added to our Beta waitlist.</strong> Our team will be in touch soon with onboarding instructions.
                      </p>
                      
                      <!-- Risk Points -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;">
                        <tr>
                          <td style="padding: 8px 0; color: #4a5568; font-size: 15px;">
                            🔴 <strong>Risk:</strong> Audit & Fines
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 8px 0; color: #4a5568; font-size: 15px;">
                            ✅ <strong>Fix:</strong> Automated Monthly CSV Reports
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <table cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td style="background-color: #d97706; border-radius: 6px;">
                                  <a href="${siteUrl}" style="display: block; padding: 15px 30px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold;">
                                    Activate Compliance Automation
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                      
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f7fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0 0 5px; color: #1a365d; font-size: 16px; font-weight: bold;">VATpilot</p>
                      <p style="margin: 0; color: #718096; font-size: 14px;">The IOSS Engine for Dropshippers</p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
        `
      }
    }

    // Default/Low Risk template
    return {
      subject: '✅ IOSS System Report - Status: Compliant',
      html: `
      <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>VATpilot System Report</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4;">
          <tr>
            <td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; margin: 20px auto;">
                
                <!-- Header -->
                <tr>
                  <td style="background-color: #1a365d; padding: 30px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">VATpilot</h1>
                    <p style="margin: 5px 0 0; color: #a0aec0; font-size: 14px;">IOSS Compliance Engine</p>
                  </td>
                </tr>
                
                <!-- Hero Section - Low Risk -->
                <tr>
                  <td style="background-color: #059669; padding: 20px 40px; text-align: center;">
                    <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold;">✅ STATUS: COMPLIANT</h2>
                    <p style="margin: 8px 0 0; color: #a7f3d0; font-size: 14px;">System Analysis Complete - No Action Required</p>
                  </td>
                </tr>
                
                <!-- Body Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h3 style="margin: 0 0 20px; color: #1a365d; font-size: 18px;">System Analysis Results</h3>
                    
                    <p style="margin: 0 0 20px; color: #4a5568; font-size: 16px; line-height: 1.6;">
                      Your shipping profile appears to be compliant. We'll monitor regulation changes and notify you of any updates.
                    </p>
                    
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f7fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 5px; color: #1a365d; font-size: 16px; font-weight: bold;">VATpilot</p>
                    <p style="margin: 0; color: #718096; font-size: 14px;">The IOSS Engine for Dropshippers</p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
      `
    }
  }

  return getEmailTemplate(riskLevel)
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