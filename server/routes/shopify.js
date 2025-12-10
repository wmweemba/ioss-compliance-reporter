import express from 'express';
import { 
  getOAuthUrl, 
  handleOAuthCallback, 
  generateState,
  fetchOrders 
} from '../services/shopify.js';
import { syncOrders } from '../services/syncService.js';
import Lead from '../models/Lead.js';

const router = express.Router();

/**
 * GET /api/shopify/auth
 * Initiate Shopify OAuth flow
 */
router.get('/auth', async (req, res) => {
  try {
    const { shop, leadId } = req.query;

    // Validate required parameters
    if (!shop) {
      return res.status(400).json({ 
        error: 'Shop parameter is required' 
      });
    }

    // Sanitize shop domain
    const sanitizedShop = shop.includes('.myshopify.com') 
      ? shop 
      : `${shop}.myshopify.com`;

    // Generate secure state parameter including leadId for later reference
    const state = generateState();
    const stateData = {
      nonce: state,
      leadId: leadId || null,
      timestamp: Date.now()
    };

    // Store state temporarily (in production, use Redis or secure session store)
    // For now, we'll encode it in the state parameter itself
    const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64');

    // Generate OAuth URL
    const authUrl = getOAuthUrl(sanitizedShop, encodedState);

    // Redirect directly to Shopify OAuth page
    res.redirect(authUrl);

  } catch (error) {
    console.error('Shopify auth error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate Shopify authentication',
      message: error.message 
    });
  }
});

/**
 * GET /api/shopify/callback
 * Handle Shopify OAuth callback
 */
router.get('/callback', async (req, res) => {
  try {
    const query = req.query;

    // Validate callback has required parameters
    if (!query.code || !query.shop || !query.state) {
      return res.status(400).json({
        error: 'Missing required OAuth parameters'
      });
    }

    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(query.state, 'base64').toString());
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid state parameter'
      });
    }

    // Check state timestamp (expire after 10 minutes)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 10 * 60 * 1000) {
      return res.status(400).json({
        error: 'OAuth state expired'
      });
    }

    // Handle OAuth callback and get access token
    const authResult = await handleOAuthCallback(query);

    // Find or create lead/user record
    let lead;
    if (stateData.leadId) {
      lead = await Lead.findById(stateData.leadId);
    }

    if (!lead) {
      // Create new lead record
      lead = new Lead({
        email: `shopify-user-${Date.now()}@temp.com`, // Placeholder email
        riskLevel: 'unknown',
        shopifyShopDomain: authResult.shop,
        shopifyAccessToken: authResult.accessToken,
        shopifyScope: authResult.scope,
        shopifyConnectedAt: new Date()
      });
    } else {
      // Update existing lead with Shopify data
      lead.shopifyShopDomain = authResult.shop;
      lead.shopifyAccessToken = authResult.accessToken;
      lead.shopifyScope = authResult.scope;
      lead.shopifyConnectedAt = new Date();
    }

    await lead.save();

    console.log(`Shopify store connected: ${authResult.shop} for lead: ${lead._id}`);

    // Trigger initial order sync after successful OAuth
    try {
      console.log(`🚀 Starting initial order sync for ${authResult.shop}`);
      const syncResult = await syncOrders(
        lead._id, 
        authResult.accessToken, 
        authResult.shop,
        { limit: 100 } // Fetch more orders on initial sync
      );
      
      console.log(`✅ Initial sync completed:`, syncResult);
    } catch (syncError) {
      console.error(`❌ Initial order sync failed for ${authResult.shop}:`, syncError.message);
      // Don't fail the OAuth flow if sync fails, just log the error
    }

    // Redirect to frontend dashboard with success status
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'https://vatpilot.netlify.app'
      : 'http://localhost:5173';

    res.redirect(`${frontendUrl}/dashboard?status=connected&shop=${authResult.shop}&leadId=${lead._id}`);

  } catch (error) {
    console.error('Shopify callback error:', error);
    
    // Redirect to frontend with error status
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'https://vatpilot.netlify.app'
      : 'http://localhost:5173';

    res.redirect(`${frontendUrl}/dashboard?status=error&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * GET /api/shopify/orders/:leadId
 * Fetch orders for connected Shopify store
 */
router.get('/orders/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { limit = 50, created_at_min } = req.query;

    // Find lead with Shopify credentials
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    if (!lead.shopifyAccessToken || !lead.shopifyShopDomain) {
      return res.status(400).json({
        error: 'Shopify store not connected'
      });
    }

    // Fetch orders from Shopify
    const options = {
      limit: parseInt(limit),
      ...(created_at_min && { created_at_min })
    };

    const orders = await fetchOrders(
      lead.shopifyShopDomain,
      lead.shopifyAccessToken,
      options
    );

    // Filter and transform orders for IOSS analysis
    const processedOrders = orders.map(order => ({
      id: order.id,
      name: order.name,
      email: order.email,
      created_at: order.created_at,
      total_price: parseFloat(order.total_price),
      currency: order.currency,
      shipping_address: order.shipping_address,
      line_items: order.line_items.map(item => ({
        title: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
        total_discount: parseFloat(item.total_discount || 0),
        vendor: item.vendor
      })),
      // Calculate if order requires IOSS
      requiresIOSS: calculateIOSSRequirement(order)
    }));

    res.json({
      success: true,
      orders: processedOrders,
      count: processedOrders.length,
      shop: lead.shopifyShopDomain
    });

  } catch (error) {
    console.error('Error fetching Shopify orders:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

/**
 * DELETE /api/shopify/disconnect/:leadId
 * Disconnect Shopify store
 */
router.delete('/disconnect/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    // Remove Shopify credentials
    lead.shopifyShopDomain = undefined;
    lead.shopifyAccessToken = undefined;
    lead.shopifyScope = undefined;
    lead.shopifyConnectedAt = undefined;

    await lead.save();

    res.json({
      success: true,
      message: 'Shopify store disconnected successfully'
    });

  } catch (error) {
    console.error('Error disconnecting Shopify:', error);
    res.status(500).json({
      error: 'Failed to disconnect Shopify store',
      message: error.message
    });
  }
});

/**
 * Helper function to determine if order requires IOSS
 * @param {Object} order - Shopify order object
 * @returns {boolean} Whether order requires IOSS compliance
 */
function calculateIOSSRequirement(order) {
  // Basic IOSS logic: orders between €22-€150 to EU from non-EU origin
  const totalValue = parseFloat(order.total_price);
  const shippingCountry = order.shipping_address?.country_code;
  
  const euCountries = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ];

  // Check if shipping to EU
  const isEUDestination = euCountries.includes(shippingCountry);
  
  // Check value range (€22-€150 typically requires IOSS)
  const isIOSSValueRange = totalValue >= 22 && totalValue <= 150;
  
  return isEUDestination && isIOSSValueRange;
}

export default router;