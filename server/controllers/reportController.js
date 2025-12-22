import Order from '../models/Order.js';
import Lead from '../models/Lead.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Parser } from 'json2csv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  'FI': 25.5, // Finland
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
};

// EU member state codes for filtering
const EU_COUNTRIES = Object.keys(EU_VAT_RATES);

/**
 * Generate IOSS compliance report for a specific user
 * Uses real MongoDB data if available, falls back to sample data
 */
export const generateUserReport = async (req, res) => {
  try {
    const { leadId, shopId } = req.query;
    let userShopId = leadId || shopId;

    if (!userShopId) {
      return res.status(400).json({
        error: 'leadId or shopId parameter is required'
      });
    }

    console.log(`📊 Generating report for user: ${userShopId}`);

    // Verify lead exists
    const lead = await Lead.findById(userShopId);
    if (!lead) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Query user's REAL orders from MongoDB
    const userOrders = await Order.find({ 
      shopId: userShopId,
      // Only IOSS-eligible orders (EU destination, €22-€150 range)
      customerCountry: { $in: EU_COUNTRIES },
      totalPrice: { $gte: 22, $lte: 150 }
    }).sort({ shopifyCreatedAt: -1 });

    console.log(`🔍 Found ${userOrders.length} IOSS-eligible orders for user`);

    let reportData;
    let filename;
    let reportType;

    if (userOrders.length > 0) {
      // User has REAL orders - generate from their data
      console.log('✅ Using REAL user order data');
      reportData = processIOSSOrders(userOrders);
      
      const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '_');
      filename = `IOSS_Report_${currentDate}.csv`;
      reportType = 'REAL';
    } else {
      // User has no orders - use sample data but label clearly
      console.log('📝 Using SAMPLE data (no real orders found)');
      reportData = await getSampleIOSSData();
      filename = 'SAMPLE_Report.csv';
      reportType = 'SAMPLE';
    }

    // Generate CSV
    const csvContent = generateCSVContent(reportData);
    
    // Create reports directory if it doesn't exist
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const reportPath = path.join(reportsDir, filename);
    fs.writeFileSync(reportPath, csvContent);

    console.log(`📤 Report generated: ${filename} (Type: ${reportType})`);

    // Send file to user
    res.download(reportPath, filename, (err) => {
      if (err) {
        console.error('❌ Download error:', err);
        res.status(500).json({ error: 'Download failed: ' + err.message });
      } else {
        console.log(`📥 Report downloaded successfully: ${filename}`);
        
        // Clean up temporary file after download
        setTimeout(() => {
          try {
            if (fs.existsSync(reportPath)) {
              fs.unlinkSync(reportPath);
              console.log(`🗑️ Cleaned up temporary report file: ${filename}`);
            }
          } catch (cleanupErr) {
            console.warn('⚠️ Could not cleanup temporary file:', cleanupErr.message);
          }
        }, 5000); // 5 second delay to ensure download completes
      }
    });

  } catch (error) {
    console.error('❌ Report generation error:', error);
    res.status(500).json({
      error: 'Report generation failed',
      message: error.message
    });
  }
};

/**
 * Process real user orders into IOSS compliance data
 */
function processIOSSOrders(orders) {
  console.log('🔄 Processing real orders for IOSS compliance...');
  
  // Group orders by destination country
  const countryData = {};
  
  orders.forEach(order => {
    const country = order.customerCountry;
    const totalValue = order.totalPrice;
    
    if (!countryData[country]) {
      countryData[country] = {
        country,
        totalValue: 0,
        orderCount: 0
      };
    }
    
    countryData[country].totalValue += totalValue;
    countryData[country].orderCount += 1;
  });

  // Convert to IOSS report format
  const reportData = Object.values(countryData).map(data => {
    const vatRate = EU_VAT_RATES[data.country] || 20;
    const netValue = data.totalValue / (1 + vatRate / 100);
    const vatAmount = data.totalValue - netValue;

    return {
      'Member State of Destination': data.country,
      'Total Net Value (EUR)': parseFloat(netValue.toFixed(2)),
      'Total VAT Amount (EUR)': parseFloat(vatAmount.toFixed(2)),
      'Number of Supplies': data.orderCount,
      'VAT Rate (%)': vatRate,
      'Order Count': data.orderCount // Internal field for debugging
    };
  });

  console.log(`✅ Processed ${reportData.length} countries from real order data`);
  return reportData;
}

/**
 * Get sample IOSS data for demo purposes
 */
async function getSampleIOSSData() {
  console.log('📋 Loading sample IOSS data...');
  
  try {
    // Try to load from existing sample data file
    const sampleDataPath = path.join(__dirname, '..', 'data', 'dummy_orders.json');
    
    if (fs.existsSync(sampleDataPath)) {
      const sampleOrders = JSON.parse(fs.readFileSync(sampleDataPath, 'utf8'));
      
      // Filter for IOSS-eligible orders only
      const iossOrders = sampleOrders.filter(order => {
        const country = order.shipping_address?.country_code?.toUpperCase();
        return country && EU_COUNTRIES.includes(country) && 
               order.total_price >= 22 && order.total_price <= 150;
      });
      
      console.log(`📊 Found ${iossOrders.length} IOSS-eligible orders in sample data`);
      
      // Convert sample data to same format as real orders
      return processIOSSOrdersSample(iossOrders);
    }
  } catch (error) {
    console.warn('⚠️ Could not load sample data:', error.message);
  }

  // Fallback: Generate minimal sample data
  console.log('📝 Generating fallback sample data');
  return [
    {
      'Member State of Destination': 'DE',
      'Total Net Value (EUR)': 840.34,
      'Total VAT Amount (EUR)': 159.66,
      'Number of Supplies': 15,
      'VAT Rate (%)': 19
    },
    {
      'Member State of Destination': 'FR',
      'Total Net Value (EUR)': 625.00,
      'Total VAT Amount (EUR)': 125.00,
      'Number of Supplies': 8,
      'VAT Rate (%)': 20
    },
    {
      'Member State of Destination': 'ES',
      'Total Net Value (EUR)': 520.66,
      'Total VAT Amount (EUR)': 109.34,
      'Number of Supplies': 6,
      'VAT Rate (%)': 21
    }
  ];
}

/**
 * Process sample orders into IOSS format
 */
function processIOSSOrdersSample(sampleOrders) {
  const countryData = {};
  
  sampleOrders.forEach(order => {
    const country = order.shipping_address?.country_code?.toUpperCase();
    const totalValue = parseFloat(order.total_price);
    
    if (country && EU_COUNTRIES.includes(country)) {
      if (!countryData[country]) {
        countryData[country] = {
          country,
          totalValue: 0,
          orderCount: 0
        };
      }
      
      countryData[country].totalValue += totalValue;
      countryData[country].orderCount += 1;
    }
  });

  return Object.values(countryData).map(data => {
    const vatRate = EU_VAT_RATES[data.country] || 20;
    const netValue = data.totalValue / (1 + vatRate / 100);
    const vatAmount = data.totalValue - netValue;

    return {
      'Member State of Destination': data.country,
      'Total Net Value (EUR)': parseFloat(netValue.toFixed(2)),
      'Total VAT Amount (EUR)': parseFloat(vatAmount.toFixed(2)),
      'Number of Supplies': data.orderCount,
      'VAT Rate (%)': vatRate
    };
  });
}

/**
 * Generate CSV content from IOSS data
 */
function generateCSVContent(data) {
  console.log('📝 Generating CSV content...');
  
  const csvFields = [
    'Member State of Destination',
    'Total Net Value (EUR)',
    'Total VAT Amount (EUR)', 
    'Number of Supplies',
    'VAT Rate (%)'
  ];

  const json2csvParser = new Parser({
    fields: csvFields,
    header: true,
    delimiter: ',',
    quote: '"'
  });

  // Filter data to only include CSV fields (remove internal tracking fields)
  const csvData = data.map(row => {
    const csvRow = {};
    csvFields.forEach(field => {
      csvRow[field] = row[field];
    });
    return csvRow;
  });

  const csvContent = json2csvParser.parse(csvData);
  console.log(`✅ Generated CSV with ${data.length} rows`);
  
  return csvContent;
}

/**
 * Get static sample report (legacy endpoint support)
 */
export const getStaticSampleReport = async (req, res) => {
  try {
    const reportPath = path.join(__dirname, '..', 'reports', 'ioss_return_2025_12.csv');
    
    console.log('📊 Checking for static sample report at:', reportPath);

    if (fs.existsSync(reportPath)) {
      console.log('📤 Sending existing static sample report');
      res.download(reportPath, 'VATpilot_Sample_Report.csv', (err) => {
        if (err) {
          console.error('❌ Download error:', err);
          res.status(500).json({ error: 'Download failed: ' + err.message });
        } else {
          console.log('📤 Static sample report downloaded successfully');
        }
      });
    } else {
      console.log('❌ Static sample report file not found');
      res.status(404).json({
        error: 'Sample report not available',
        message: 'Please generate the sample data first by running: npm run generate-ioss-report'
      });
    }
  } catch (error) {
    console.error('❌ Static sample report endpoint error:', error);
    res.status(500).json({
      error: 'Failed to retrieve sample report',
      message: error.message
    });
  }
};