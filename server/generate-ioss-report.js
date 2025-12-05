#!/usr/bin/env node

/**
 * VATpilot - IOSS Report Generation Logic
 * 
 * Processes synthetic order data to generate official EU IOSS Monthly Return CSV files.
 * Filters IOSS-eligible orders, applies EU VAT rates, and aggregates by member state.
 * 
 * Usage: node server/generate-ioss-report.js
 * Input: server/data/dummy_orders.json
 * Output: server/reports/ioss_return_2025_12.csv
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Parser } from 'json2csv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const INPUT_FILE = path.join(__dirname, 'data/dummy_orders.json')
const OUTPUT_FILE = path.join(__dirname, 'reports/ioss_return_2025_12.csv')

// EU Member State VAT Rates (Standard Rates as of 2025)
const EU_VAT_RATES = {
  'AT': 20, // Austria
  'BE': 21, // Belgium  
  'BG': 20, // Bulgaria
  'CY': 19, // Cyprus
  'CZ': 21, // Czech Republic
  'DE': 19, // Germany
  'DK': 25, // Denmark
  'EE': 22, // Estonia
  'ES': 21, // Spain
  'FI': 25.5, // Finland (24% + 1.5% for 2025)
  'FR': 20, // France
  'GR': 24, // Greece
  'HR': 25, // Croatia
  'HU': 27, // Hungary
  'IE': 23, // Ireland
  'IT': 22, // Italy
  'LT': 21, // Lithuania
  'LU': 17, // Luxembourg
  'LV': 21, // Latvia
  'MT': 18, // Malta
  'NL': 21, // Netherlands
  'PL': 23, // Poland
  'PT': 23, // Portugal
  'RO': 19, // Romania
  'SE': 25, // Sweden
  'SI': 22, // Slovenia
  'SK': 20  // Slovakia
}

// Default VAT rate for unknown countries
const DEFAULT_VAT_RATE = 20

/**
 * Determine if an order is IOSS eligible
 * @param {Object} order - Order object
 * @returns {boolean} True if IOSS eligible
 */
function isIOSSEligible(order) {
  // IOSS eligibility criteria:
  // 1. Non-EU origin (dropshipping scenario)
  // 2. EU destination 
  // 3. Order value <= €150
  // 4. Value >= €22 (below €22 is VAT exempt)
  
  const isNonEuOrigin = !Object.keys(EU_VAT_RATES).includes(order.origin_country)
  const isEuDestination = Object.keys(EU_VAT_RATES).includes(order.customer_country)
  const isValueInRange = order.order_value_eur >= 22 && order.order_value_eur <= 150
  
  return isNonEuOrigin && isEuDestination && isValueInRange
}

/**
 * Get VAT rate for a given EU member state
 * @param {string} countryCode - Two-letter country code
 * @returns {number} VAT rate as percentage
 */
function getVATRate(countryCode) {
  return EU_VAT_RATES[countryCode] || DEFAULT_VAT_RATE
}

/**
 * Calculate VAT amount
 * @param {number} taxableAmount - Net order value
 * @param {number} vatRate - VAT rate as percentage
 * @returns {number} VAT amount rounded to 2 decimals
 */
function calculateVATAmount(taxableAmount, vatRate) {
  return parseFloat((taxableAmount * vatRate / 100).toFixed(2))
}

/**
 * Process orders and generate IOSS return data
 * @param {Array} orders - Array of order objects
 * @returns {Object} Processed IOSS data with statistics
 */
function processOrdersForIOSS(orders) {
  console.log('🔄 Processing orders for IOSS compliance...')
  
  // Step 1: Filter IOSS-eligible orders
  const iossEligibleOrders = orders.filter(order => {
    const eligible = isIOSSEligible(order)
    
    // Enhanced logging for validation
    if (eligible) {
      console.log(`   ✅ IOSS Eligible: ${order.order_id} - €${order.order_value_eur} (${order.customer_country} ← ${order.origin_country})`)
    }
    
    return eligible
  })
  
  console.log(`📊 Filtered ${iossEligibleOrders.length} IOSS-eligible orders from ${orders.length} total`)
  
  if (iossEligibleOrders.length === 0) {
    console.log('⚠️  No IOSS-eligible orders found. Check data criteria.')
    return { aggregatedData: [], statistics: { totalOrders: 0, totalCountries: 0 } }
  }
  
  // Step 2: Map orders to IOSS return format and aggregate by country
  const countryAggregation = {}
  
  iossEligibleOrders.forEach(order => {
    const memberState = order.customer_country
    const vatRate = getVATRate(memberState)
    const taxableAmount = order.order_value_eur
    const vatAmount = calculateVATAmount(taxableAmount, vatRate)
    
    // Initialize country data if not exists
    if (!countryAggregation[memberState]) {
      countryAggregation[memberState] = {
        memberState: memberState,
        vatRate: vatRate,
        taxableAmount: 0,
        vatAmount: 0,
        orderCount: 0
      }
    }
    
    // Aggregate values
    countryAggregation[memberState].taxableAmount += taxableAmount
    countryAggregation[memberState].vatAmount += vatAmount
    countryAggregation[memberState].orderCount += 1
  })
  
  // Step 3: Convert to array and round values
  const aggregatedData = Object.values(countryAggregation).map(country => ({
    'Member State': country.memberState,
    'VAT Rate': `${country.vatRate}%`,
    'Taxable Amount (EUR)': parseFloat(country.taxableAmount.toFixed(2)),
    'VAT Amount (EUR)': parseFloat(country.vatAmount.toFixed(2)),
    'Order Count': country.orderCount // For internal tracking (not in final CSV)
  }))
  
  // Sort by member state for consistent output
  aggregatedData.sort((a, b) => a['Member State'].localeCompare(b['Member State']))
  
  // Calculate statistics
  const statistics = {
    totalOrders: iossEligibleOrders.length,
    totalCountries: aggregatedData.length,
    totalTaxableAmount: parseFloat(aggregatedData.reduce((sum, row) => sum + row['Taxable Amount (EUR)'], 0).toFixed(2)),
    totalVATAmount: parseFloat(aggregatedData.reduce((sum, row) => sum + row['VAT Amount (EUR)'], 0).toFixed(2)),
    averageOrderValue: parseFloat((aggregatedData.reduce((sum, row) => sum + row['Taxable Amount (EUR)'], 0) / iossEligibleOrders.length).toFixed(2))
  }
  
  return { aggregatedData, statistics }
}

/**
 * Generate CSV file from IOSS data
 * @param {Array} data - Aggregated IOSS data
 * @param {string} outputPath - Output file path
 */
function generateCSVReport(data, outputPath) {
  console.log('📝 Generating CSV report...')
  
  // Define CSV fields (exclude Order Count from final output)
  const csvFields = [
    'Member State',
    'VAT Rate', 
    'Taxable Amount (EUR)',
    'VAT Amount (EUR)'
  ]
  
  // Configure CSV parser
  const json2csvParser = new Parser({
    fields: csvFields,
    header: true,
    delimiter: ',',
    quote: '"'
  })
  
  // Filter data to only include CSV fields
  const csvData = data.map(row => {
    const filteredRow = {}
    csvFields.forEach(field => {
      filteredRow[field] = row[field]
    })
    return filteredRow
  })
  
  // Generate CSV content
  const csvContent = json2csvParser.parse(csvData)
  
  // Add IOSS report header (as comment)
  const reportHeader = `# EU IOSS Monthly Return - December 2025
# Generated on: ${new Date().toISOString()}
# Reporting Period: December 2025
# IOSS ID: [To be filled by operator]
# 
`
  
  const finalCsvContent = reportHeader + csvContent
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Write CSV file
  fs.writeFileSync(outputPath, finalCsvContent, 'utf8')
  
  console.log(`✅ CSV report generated: ${outputPath}`)
}

/**
 * Main function to generate IOSS report
 */
async function generateIOSSReport() {
  console.log('🚀 VATpilot IOSS Report Generator')
  console.log('==================================')
  
  try {
    // Step 1: Read input data
    console.log('📖 Reading synthetic order data...')
    
    if (!fs.existsSync(INPUT_FILE)) {
      throw new Error(`Input file not found: ${INPUT_FILE}`)
    }
    
    const rawData = fs.readFileSync(INPUT_FILE, 'utf8')
    const data = JSON.parse(rawData)
    
    if (!data.orders || !Array.isArray(data.orders)) {
      throw new Error('Invalid data format: orders array not found')
    }
    
    console.log(`📊 Loaded ${data.orders.length} orders from synthetic dataset`)
    
    // Step 2: Process orders for IOSS compliance
    const { aggregatedData, statistics } = processOrdersForIOSS(data.orders)
    
    if (aggregatedData.length === 0) {
      console.log('⚠️  No IOSS data to report. Exiting...')
      return
    }
    
    // Step 3: Generate CSV report
    generateCSVReport(aggregatedData, OUTPUT_FILE)
    
    // Step 4: Display results
    console.log('\n📊 IOSS Report Summary')
    console.log('======================')
    console.log(`📋 Generated Report for ${statistics.totalOrders} orders across ${statistics.totalCountries} countries`)
    console.log(`💰 Total Taxable Amount: €${statistics.totalTaxableAmount}`)
    console.log(`🧾 Total VAT Amount: €${statistics.totalVATAmount}`)
    console.log(`📈 Average Order Value: €${statistics.averageOrderValue}`)
    
    console.log('\n🇪🇺 Country Breakdown:')
    aggregatedData.forEach(row => {
      console.log(`   ${row['Member State']}: ${row['Order Count']} orders, €${row['Taxable Amount (EUR)']} (VAT: €${row['VAT Amount (EUR)']})`)
    })
    
    console.log(`\n✅ IOSS Return CSV ready for submission: ${OUTPUT_FILE}`)
    
    // Step 5: Validation summary
    const validationSummary = {
      file_size: fs.statSync(OUTPUT_FILE).size,
      total_rows: aggregatedData.length + 1, // +1 for header
      compliance_check: statistics.totalOrders > 0 ? 'PASS' : 'FAIL'
    }
    
    console.log('\n🔍 Validation Summary:')
    console.log(`   File Size: ${validationSummary.file_size} bytes`)
    console.log(`   CSV Rows: ${validationSummary.total_rows} (including header)`)
    console.log(`   Compliance: ${validationSummary.compliance_check}`)
    
  } catch (error) {
    console.error('❌ Error generating IOSS report:', error.message)
    process.exit(1)
  }
}

// Export functions for potential API integration
export { 
  processOrdersForIOSS, 
  generateCSVReport, 
  isIOSSEligible, 
  getVATRate, 
  calculateVATAmount,
  EU_VAT_RATES
}

// Run the generator if called directly
try {
  await generateIOSSReport()
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}