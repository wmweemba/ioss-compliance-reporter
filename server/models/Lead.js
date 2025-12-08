import mongoose from 'mongoose'

/**
 * Lead Schema for IOSS Risk Quiz email capture
 * Stores leads generated from risk assessment results
 */
const leadSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  riskLevel: {
    type: String,
    required: [true, 'Risk level is required'],
    enum: ['CRITICAL_RISK', 'MODERATE_RISK', 'LOW_RISK'],
    default: 'CRITICAL_RISK'
  },
  source: {
    type: String,
    default: 'risk_quiz',
    enum: ['risk_quiz', 'landing_page', 'referral', 'other']
  },
  metadata: {
    userAnswers: {
      origin: String,
      destination: String,
      aov: String,
      ioss_status: String
    },
    ipAddress: String,
    userAgent: String
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  // Shopify Integration Fields
  shopifyShopDomain: {
    type: String,
    trim: true,
    lowercase: true,
    match: [
      /^[\w-]+\.myshopify\.com$/,
      'Please enter a valid Shopify domain'
    ]
  },
  shopifyAccessToken: {
    type: String,
    select: false // Don't include in queries by default for security
  },
  shopifyScope: {
    type: String
  },
  shopifyConnectedAt: {
    type: Date
  },
  // Store last sync information
  lastOrderSync: {
    type: Date
  },
  totalOrdersSynced: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for better query performance (email index handled by unique: true)
leadSchema.index({ createdAt: -1 })
leadSchema.index({ riskLevel: 1, createdAt: -1 })
leadSchema.index({ shopifyShopDomain: 1 })
leadSchema.index({ shopifyConnectedAt: -1 })

// Pre-save middleware to update timestamps
leadSchema.pre('save', function() {
  this.updatedAt = Date.now()
})

// Virtual for formatted creation date
leadSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString()
})

export default mongoose.model('Lead', leadSchema)