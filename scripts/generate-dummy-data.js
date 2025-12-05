#!/usr/bin/env node

/**
 * VATpilot - Synthetic Order Data Generator
 * 
 * Generates realistic e-commerce order data for testing IOSS compliance logic.
 * Uses Faker.js to create 1,000 synthetic Shopify-style orders with proper
 * edge cases for EU VAT compliance testing.
 * 
 * Usage: node scripts/generate-dummy-data.js
 * Output: server/data/dummy_orders.json
 */

import { faker } from '@faker-js/faker'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const TOTAL_ORDERS = 1000
const OUTPUT_PATH = path.join(__dirname, '../server/data/dummy_orders.json')

// Country mappings for realistic distribution
const EU_COUNTRIES = [
  'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 'FI', 
  'IE', 'PT', 'GR', 'CZ', 'HU', 'PL', 'SK', 'SI', 'HR', 'BG',
  'RO', 'LT', 'LV', 'EE', 'CY', 'MT', 'LU'
]

const NON_EU_COUNTRIES = ['GB', 'US', 'CA', 'AU', 'NO', 'CH', 'JP', 'SG', 'NZ', 'BR']
const ORIGIN_COUNTRIES = ['CN', 'US', 'UK', 'TW', 'IN', 'MY']

// Product categories for realistic items
const PRODUCT_CATEGORIES = {
  electronics: ['Wireless Earbuds', 'Phone Case', 'USB Cable', 'Power Bank', 'Smart Watch', 'Bluetooth Speaker'],
  clothing: ['T-Shirt', 'Hoodie', 'Jeans', 'Dress', 'Sneakers', 'Jacket', 'Sweater'],
  home: ['Coffee Mug', 'Pillow', 'Candle', 'Wall Art', 'Kitchen Utensil', 'Storage Box'],
  beauty: ['Face Mask', 'Lipstick', 'Moisturizer', 'Perfume', 'Nail Polish', 'Hair Serum'],
  sports: ['Yoga Mat', 'Water Bottle', 'Resistance Band', 'Jump Rope', 'Foam Roller'],
  books: ['Fiction Novel', 'Cookbook', 'Self-Help Book', 'Art Book', 'Technical Manual']
}

/**
 * Generate a single synthetic order with realistic data
 * @param {number} index - Order index for unique IDs
 * @returns {Object} Order object
 */
function generateOrder(index) {
  // Determine if this is an EU order (70% EU, 30% non-EU for realistic distribution)
  const isEuOrder = faker.datatype.boolean({ probability: 0.7 })
  const customerCountry = isEuOrder 
    ? faker.helpers.arrayElement(EU_COUNTRIES)
    : faker.helpers.arrayElement(NON_EU_COUNTRIES)

  // Origin country distribution (80% China, 20% others for dropshipping reality)
  const originCountry = faker.datatype.boolean({ probability: 0.8 }) 
    ? 'CN' 
    : faker.helpers.arrayElement(ORIGIN_COUNTRIES)

  // Generate order value with specific distributions for edge cases
  let orderValueEur
  const valueType = faker.number.int({ min: 1, max: 100 })
  
  if (valueType <= 15) {
    // 15% - High value orders (>€150) - Duty risk
    orderValueEur = faker.number.float({ min: 150.01, max: 500, fractionDigits: 2 })
  } else if (valueType <= 25) {
    // 10% - Very low value orders (<€22) - No VAT
    orderValueEur = faker.number.float({ min: 5, max: 21.99, fractionDigits: 2 })
  } else {
    // 75% - Standard IOSS range (€22-€150)
    orderValueEur = faker.number.float({ min: 22, max: 150, fractionDigits: 2 })
  }

  // Generate realistic number of items based on order value
  const itemCount = orderValueEur < 50 ? 
    faker.number.int({ min: 1, max: 3 }) : 
    faker.number.int({ min: 2, max: 8 })

  // Generate items from different categories
  const items = []
  const usedCategories = new Set()
  
  for (let i = 0; i < itemCount; i++) {
    // Ensure variety in product categories
    const availableCategories = Object.keys(PRODUCT_CATEGORIES).filter(cat => 
      !usedCategories.has(cat) || usedCategories.size >= Object.keys(PRODUCT_CATEGORIES).length
    )
    
    const category = faker.helpers.arrayElement(availableCategories)
    const product = faker.helpers.arrayElement(PRODUCT_CATEGORIES[category])
    
    // Add variation to product names
    const variations = ['Premium', 'Deluxe', 'Pro', 'Mini', 'XL', 'Classic', '']
    const variation = faker.helpers.arrayElement(variations)
    const fullProductName = variation ? `${variation} ${product}` : product
    
    items.push(fullProductName.trim())
    usedCategories.add(category)
  }

  // Generate order date within last 6 months
  const orderDate = faker.date.between({ 
    from: new Date(2025, 6, 1), // July 1, 2025
    to: new Date() 
  })

  return {
    order_id: `ORD-${String(index + 1).padStart(6, '0')}-${faker.string.alphanumeric(4).toUpperCase()}`,
    customer_country: customerCountry,
    origin_country: originCountry,
    order_value_eur: orderValueEur,
    items: items,
    order_date: orderDate.toISOString().split('T')[0], // YYYY-MM-DD format
    
    // Additional realistic fields for comprehensive testing
    customer_email: faker.internet.email(),
    shipping_method: faker.helpers.arrayElement(['Standard', 'Express', 'Economy', 'Premium']),
    currency_original: isEuOrder ? 'EUR' : faker.helpers.arrayElement(['USD', 'GBP', 'CAD', 'AUD']),
    
    // IOSS-relevant metadata
    vat_included: faker.datatype.boolean({ probability: 0.3 }),
    duty_paid: orderValueEur > 150 ? faker.datatype.boolean({ probability: 0.6 }) : false,
    
    // Shopify-style metadata
    fulfillment_status: faker.helpers.arrayElement(['fulfilled', 'pending', 'shipped', 'delivered']),
    financial_status: faker.helpers.arrayElement(['paid', 'pending', 'authorized']),
    
    // Risk factors for compliance testing
    is_high_risk_country: ['CN', 'MY', 'TW'].includes(originCountry),
    requires_ioss: isEuOrder && orderValueEur >= 22 && orderValueEur <= 150,
    requires_duty: isEuOrder && orderValueEur > 150,
    compliance_status: 'pending' // To be determined by compliance logic
  }
}

/**
 * Generate summary statistics for the generated dataset
 * @param {Array} orders - Array of generated orders
 * @returns {Object} Statistics summary
 */
function generateStatistics(orders) {
  const stats = {
    total_orders: orders.length,
    eu_orders: orders.filter(o => EU_COUNTRIES.includes(o.customer_country)).length,
    non_eu_orders: orders.filter(o => NON_EU_COUNTRIES.includes(o.customer_country)).length,
    
    // Value distribution
    high_value_orders: orders.filter(o => o.order_value_eur > 150).length,
    ioss_eligible_orders: orders.filter(o => o.order_value_eur >= 22 && o.order_value_eur <= 150).length,
    low_value_orders: orders.filter(o => o.order_value_eur < 22).length,
    
    // Origin distribution
    china_origin: orders.filter(o => o.origin_country === 'CN').length,
    other_origin: orders.filter(o => o.origin_country !== 'CN').length,
    
    // Compliance categories
    requires_ioss: orders.filter(o => o.requires_ioss).length,
    requires_duty: orders.filter(o => o.requires_duty).length,
    
    // Average values
    avg_order_value: parseFloat((orders.reduce((sum, o) => sum + o.order_value_eur, 0) / orders.length).toFixed(2)),
    avg_items_per_order: parseFloat((orders.reduce((sum, o) => sum + o.items.length, 0) / orders.length).toFixed(2))
  }
  
  return stats
}

/**
 * Main function to generate and save synthetic data
 */
async function main() {
  console.log('🚀 VATpilot Synthetic Data Generator')
  console.log('=====================================')
  console.log(`📊 Generating ${TOTAL_ORDERS} synthetic orders...`)
  
  const startTime = Date.now()
  
  // Generate orders
  const orders = []
  for (let i = 0; i < TOTAL_ORDERS; i++) {
    orders.push(generateOrder(i))
    
    // Progress indicator
    if ((i + 1) % 100 === 0) {
      console.log(`   Generated ${i + 1}/${TOTAL_ORDERS} orders...`)
    }
  }
  
  // Generate statistics
  const statistics = generateStatistics(orders)
  
  // Prepare output data
  const outputData = {
    metadata: {
      generated_at: new Date().toISOString(),
      generator_version: '1.0.0',
      total_records: orders.length,
      description: 'Synthetic e-commerce order data for IOSS compliance testing'
    },
    statistics,
    orders
  }
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_PATH)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Write to file
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2), 'utf8')
  
  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000).toFixed(2)
  
  console.log('\n✅ Generation Complete!')
  console.log('========================')
  console.log(`📁 Output: ${OUTPUT_PATH}`)
  console.log(`⏱️  Duration: ${duration}s`)
  console.log(`📦 Total Orders: ${statistics.total_orders}`)
  console.log(`🇪🇺 EU Orders: ${statistics.eu_orders} (${Math.round(statistics.eu_orders/statistics.total_orders*100)}%)`)
  console.log(`🌍 Non-EU Orders: ${statistics.non_eu_orders} (${Math.round(statistics.non_eu_orders/statistics.total_orders*100)}%)`)
  console.log(`💰 Avg Order Value: €${statistics.avg_order_value}`)
  console.log('\n📊 IOSS Edge Cases:')
  console.log(`   🔴 High Value (>€150): ${statistics.high_value_orders} orders`)
  console.log(`   🟡 IOSS Eligible (€22-€150): ${statistics.ioss_eligible_orders} orders`)
  console.log(`   🟢 Low Value (<€22): ${statistics.low_value_orders} orders`)
  console.log(`   📋 Requires IOSS: ${statistics.requires_ioss} orders`)
  console.log(`   📋 Requires Duty: ${statistics.requires_duty} orders`)
  
  console.log('\n🔧 Ready for compliance testing!')
}

// Run the generator
try {
  await main()
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}

export { generateOrder, generateStatistics }