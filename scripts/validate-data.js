#!/usr/bin/env node

/**
 * VATpilot - Data Validator
 * 
 * Validates and analyzes the generated synthetic order data
 * to ensure all requirements are met for IOSS compliance testing.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_PATH = path.join(__dirname, '../server/data/dummy_orders.json')

/**
 * Validate the generated data structure and content
 */
function validateData() {
  console.log('🔍 VATpilot Data Validator')
  console.log('==========================')
  
  // Check if file exists
  if (!fs.existsSync(DATA_PATH)) {
    console.error('❌ Data file not found:', DATA_PATH)
    return false
  }
  
  // Load and parse data
  let data
  try {
    const fileContent = fs.readFileSync(DATA_PATH, 'utf8')
    data = JSON.parse(fileContent)
  } catch (error) {
    console.error('❌ Failed to parse JSON:', error.message)
    return false
  }
  
  console.log('✅ File loaded successfully')
  console.log(`📊 Total records: ${data.orders?.length || 0}`)
  
  // Validate structure
  if (!data.metadata || !data.statistics || !data.orders) {
    console.error('❌ Invalid data structure')
    return false
  }
  
  // Validate orders
  const orders = data.orders
  let validOrders = 0
  let errors = []
  
  const requiredFields = [
    'order_id', 'customer_country', 'origin_country', 
    'order_value_eur', 'items', 'order_date'
  ]
  
  orders.forEach((order, index) => {
    const missing = requiredFields.filter(field => !(field in order))
    if (missing.length > 0) {
      errors.push(`Order ${index + 1}: Missing fields: ${missing.join(', ')}`)
    } else {
      validOrders++
    }
    
    // Validate data types and ranges
    if (typeof order.order_value_eur !== 'number' || order.order_value_eur <= 0) {
      errors.push(`Order ${index + 1}: Invalid order_value_eur`)
    }
    
    if (!Array.isArray(order.items) || order.items.length === 0) {
      errors.push(`Order ${index + 1}: Invalid items array`)
    }
  })
  
  console.log(`✅ Valid orders: ${validOrders}/${orders.length}`)
  
  if (errors.length > 0) {
    console.log(`⚠️  Validation errors: ${errors.length}`)
    errors.slice(0, 5).forEach(error => console.log(`   ${error}`))
    if (errors.length > 5) {
      console.log(`   ... and ${errors.length - 5} more`)
    }
  }
  
  // Analyze edge cases
  console.log('\n📊 Edge Case Analysis:')
  const highValue = orders.filter(o => o.order_value_eur > 150)
  const iossEligible = orders.filter(o => o.order_value_eur >= 22 && o.order_value_eur <= 150)
  const lowValue = orders.filter(o => o.order_value_eur < 22)
  const euOrders = orders.filter(o => ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'SE', 'DK', 'FI', 'IE', 'PT', 'GR', 'CZ', 'HU', 'PL', 'SK', 'SI', 'HR', 'BG', 'RO', 'LT', 'LV', 'EE', 'CY', 'MT', 'LU'].includes(o.customer_country))
  
  console.log(`   🔴 High Value (>€150): ${highValue.length} (${Math.round(highValue.length/orders.length*100)}%)`)
  console.log(`   🟡 IOSS Eligible (€22-€150): ${iossEligible.length} (${Math.round(iossEligible.length/orders.length*100)}%)`)
  console.log(`   🟢 Low Value (<€22): ${lowValue.length} (${Math.round(lowValue.length/orders.length*100)}%)`)
  console.log(`   🇪🇺 EU Destinations: ${euOrders.length} (${Math.round(euOrders.length/orders.length*100)}%)`)
  
  // Show sample of each edge case
  console.log('\n🔬 Sample Orders:')
  
  if (highValue.length > 0) {
    const sample = highValue[0]
    console.log(`   High Value: ${sample.order_id} - €${sample.order_value_eur} (${sample.customer_country} ← ${sample.origin_country})`)
  }
  
  if (iossEligible.length > 0) {
    const sample = iossEligible[0]
    console.log(`   IOSS Eligible: ${sample.order_id} - €${sample.order_value_eur} (${sample.customer_country} ← ${sample.origin_country})`)
  }
  
  if (lowValue.length > 0) {
    const sample = lowValue[0]
    console.log(`   Low Value: ${sample.order_id} - €${sample.order_value_eur} (${sample.customer_country} ← ${sample.origin_country})`)
  }
  
  console.log('\n✅ Data validation complete!')
  return errors.length === 0
}

// Add to package.json scripts
function addNpmScript() {
  const packageJsonPath = path.join(__dirname, '../package.json')
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    
    if (!packageJson.scripts['generate-data']) {
      packageJson.scripts['generate-data'] = 'node scripts/generate-dummy-data.js'
      packageJson.scripts['validate-data'] = 'node scripts/validate-data.js'
      
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
      console.log('\n📝 Added npm scripts:')
      console.log('   npm run generate-data  # Generate synthetic data')
      console.log('   npm run validate-data  # Validate generated data')
    }
  } catch (error) {
    console.log('\n⚠️  Could not update package.json scripts')
  }
}

// Run validation
const isValid = validateData()
addNpmScript()

if (!isValid) {
  process.exit(1)
}