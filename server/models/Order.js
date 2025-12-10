import mongoose from 'mongoose';

/**
 * Order Schema for storing Shopify orders locally
 * Stores order data synchronized from connected Shopify stores
 */
const orderSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: [true, 'Shop ID is required'],
    index: true
  },
  shopifyOrderId: {
    type: String,
    required: [true, 'Shopify Order ID is required'],
    unique: true,
    index: true
  },
  orderNumber: {
    type: String,
    required: [true, 'Order number is required'],
    index: true
  },
  totalPrice: {
    type: Number,
    required: [true, 'Total price is required'],
    min: [0, 'Total price cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    uppercase: true,
    maxlength: [3, 'Currency code must be 3 characters']
  },
  customerCountry: {
    type: String,
    uppercase: true,
    maxlength: [2, 'Country code must be 2 characters'],
    index: true
  },
  // Shopify order metadata
  customerEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  fulfillmentStatus: {
    type: String,
    enum: ['fulfilled', 'null', 'partial', 'restocked'],
    default: 'null'
  },
  financialStatus: {
    type: String,
    enum: ['pending', 'authorized', 'partially_paid', 'paid', 'partially_refunded', 'refunded', 'voided'],
    default: 'pending'
  },
  // IOSS compliance fields
  iossEligible: {
    type: Boolean,
    default: false,
    index: true
  },
  vatRequired: {
    type: Boolean,
    default: false
  },
  euDestination: {
    type: Boolean,
    default: false,
    index: true
  },
  // Order line items for detailed analysis
  lineItems: [{
    productId: String,
    variantId: String,
    title: String,
    quantity: {
      type: Number,
      min: 0
    },
    price: {
      type: Number,
      min: 0
    },
    vendor: String,
    countryOfOrigin: String
  }],
  // Shipping address for compliance analysis
  shippingAddress: {
    country: String,
    countryCode: String,
    province: String,
    city: String,
    zip: String
  },
  // Shopify timestamps
  shopifyCreatedAt: {
    type: Date,
    required: [true, 'Shopify created date is required'],
    index: true
  },
  shopifyUpdatedAt: {
    type: Date,
    required: [true, 'Shopify updated date is required']
  },
  // Local sync tracking
  syncedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastAnalyzedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
orderSchema.index({ shopId: 1, shopifyCreatedAt: -1 });
orderSchema.index({ shopId: 1, iossEligible: 1 });
orderSchema.index({ shopId: 1, euDestination: 1, totalPrice: 1 });

// Virtual for IOSS value range check
orderSchema.virtual('isInIOSSRange').get(function() {
  return this.totalPrice >= 22 && this.totalPrice <= 150;
});

// Virtual for formatted total price
orderSchema.virtual('formattedTotal').get(function() {
  return `${this.currency} ${this.totalPrice.toFixed(2)}`;
});

// Pre-save middleware to calculate IOSS eligibility
orderSchema.pre('save', function() {
  // EU country codes
  const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ];

  // Determine if shipping to EU
  this.euDestination = euCountries.includes(this.customerCountry || this.shippingAddress?.countryCode);
  
  // Calculate IOSS eligibility (€22-€150 to EU destinations)
  this.iossEligible = this.euDestination && this.totalPrice >= 22 && this.totalPrice <= 150;
  
  // VAT required for EU destinations above €0
  this.vatRequired = this.euDestination && this.totalPrice > 0;
});

// Static method to get IOSS summary for a shop
orderSchema.statics.getIOSSSummary = async function(shopId, dateRange = {}) {
  const match = { shopId };
  
  if (dateRange.startDate || dateRange.endDate) {
    match.shopifyCreatedAt = {};
    if (dateRange.startDate) match.shopifyCreatedAt.$gte = new Date(dateRange.startDate);
    if (dateRange.endDate) match.shopifyCreatedAt.$lte = new Date(dateRange.endDate);
  }

  return await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        iossEligibleOrders: {
          $sum: { $cond: ['$iossEligible', 1, 0] }
        },
        euOrders: {
          $sum: { $cond: ['$euDestination', 1, 0] }
        },
        totalValue: { $sum: '$totalPrice' },
        iossValue: {
          $sum: { $cond: ['$iossEligible', '$totalPrice', 0] }
        },
        averageOrderValue: { $avg: '$totalPrice' }
      }
    }
  ]);
};

export default mongoose.model('Order', orderSchema);