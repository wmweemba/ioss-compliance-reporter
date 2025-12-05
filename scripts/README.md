# VATpilot Scripts

This directory contains utility scripts for the VATpilot project.

## Available Scripts

### 🧪 Data Generation

#### `generate-dummy-data.js`
Generates 1,000 synthetic e-commerce orders for testing IOSS compliance logic.

**Usage:**
```bash
npm run generate-data
# or
node scripts/generate-dummy-data.js
```

**Features:**
- Realistic Shopify-style order data
- Proper distribution of EU/Non-EU customers (70%/30%)
- Origin countries with dropshipping focus (80% China)
- Strategic value distribution for edge cases:
  - 15% High value (>€150) - Duty risk
  - 75% IOSS eligible (€22-€150)  
  - 10% Low value (<€22) - No VAT
- Realistic product catalogs across categories
- Proper IOSS compliance flags

**Output:** `server/data/dummy_orders.json`

#### `validate-data.js`
Validates the generated synthetic data and provides analysis.

**Usage:**
```bash
npm run validate-data
# or
node scripts/validate-data.js
```

**Features:**
- Data structure validation
- Required field checking
- Edge case distribution analysis
- Sample order display
- Performance statistics

## Generated Data Structure

### Order Object
```json
{
  "order_id": "ORD-000001-TOHA",
  "customer_country": "RO",
  "origin_country": "CN", 
  "order_value_eur": 47.95,
  "items": ["Pro Foam Roller"],
  "order_date": "2025-08-05",
  "customer_email": "customer@example.com",
  "shipping_method": "Express",
  "currency_original": "EUR",
  "vat_included": false,
  "duty_paid": false,
  "fulfillment_status": "pending",
  "financial_status": "paid",
  "is_high_risk_country": true,
  "requires_ioss": true,
  "requires_duty": false,
  "compliance_status": "pending"
}
```

### Compliance Fields
- `requires_ioss`: EU order with value €22-€150
- `requires_duty`: EU order with value >€150  
- `is_high_risk_country`: Origins from CN, MY, TW
- `compliance_status`: Always "pending" for testing

## IOSS Edge Cases Covered

| Case | Value Range | EU Destination | Expected Behavior |
|------|-------------|----------------|-------------------|
| **High Value** | >€150 | Yes | Duty required, no IOSS |
| **IOSS Eligible** | €22-€150 | Yes | IOSS registration required |
| **Low Value** | <€22 | Yes | No VAT, no IOSS |
| **Non-EU** | Any | No | Ignore for IOSS purposes |

## Country Distributions

### EU Countries (27)
DE, FR, IT, ES, NL, BE, AT, SE, DK, FI, IE, PT, GR, CZ, HU, PL, SK, SI, HR, BG, RO, LT, LV, EE, CY, MT, LU

### Origin Countries  
- **CN** (80%) - Primary dropshipping origin
- **US, UK, TW, IN, MY** (20%) - Other common origins

### Product Categories
- Electronics (earbuds, cases, cables, etc.)
- Clothing (shirts, jeans, sneakers, etc.)  
- Home goods (mugs, pillows, candles, etc.)
- Beauty products (masks, lipstick, perfume, etc.)
- Sports equipment (yoga mats, bottles, etc.)
- Books and media

## Integration with IOSS Logic

Use this data to test:

1. **Risk Classification Rules**
   - High/Medium/Low risk determination
   - Country-based risk factors
   - Value-based compliance requirements

2. **IOSS Registration Logic** 
   - Automatic eligibility detection
   - Value threshold enforcement
   - EU destination validation

3. **Compliance Reporting**
   - Monthly VAT calculations
   - Duty requirement detection
   - Cross-border transaction tracking

4. **Edge Case Handling**
   - Mixed cart scenarios
   - Currency conversion accuracy
   - Multi-country shipments

## File Locations

- **Scripts:** `scripts/`
- **Generated Data:** `server/data/dummy_orders.json`  
- **Validation:** Run validate script after generation

---

*Part of VATpilot - EU VAT IOSS Compliance Automation*