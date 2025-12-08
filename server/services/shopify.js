import { shopifyApi, ApiVersion } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import crypto from 'crypto';

// Shopify instance - will be initialized when needed
let shopify = null;

/**
 * Initialize Shopify API configuration
 * This is called lazily to ensure environment variables are loaded
 */
const initializeShopify = () => {
  if (!shopify) {
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      throw new Error('Missing Shopify credentials. Please set SHOPIFY_API_KEY and SHOPIFY_API_SECRET environment variables.');
    }
    
    shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET,
      scopes: ['read_orders', 'read_assigned_fulfillment_orders'],
      hostName: process.env.HOST_NAME || 'localhost:5000',
      hostScheme: process.env.NODE_ENV === 'production' ? 'https' : 'http',
      apiVersion: ApiVersion.October24,
      isEmbeddedApp: false,
    });
    
    console.log('✅ Shopify API initialized successfully');
  }
  return shopify;
};

/**
 * Generate OAuth authorization URL for Shopify
 * @param {string} shop - The shop domain (e.g., 'myshop.myshopify.com')
 * @param {string} state - Random state parameter for security
 * @returns {string} OAuth authorization URL
 */
export const getOAuthUrl = (shop, state) => {
  try {
    const shopifyApi = initializeShopify();
    
    // Sanitize shop domain
    const sanitizedShop = shopifyApi.utils.sanitizeShop(shop, true);
    
    // Build OAuth URL manually
    const scopes = ['read_orders', 'read_assigned_fulfillment_orders'].join(',');
    const redirectUri = `${process.env.NODE_ENV === 'production' ? 'https' : 'http'}://${process.env.HOST_NAME}/api/shopify/callback`;
    
    const authUrl = `https://${sanitizedShop}/admin/oauth/authorize` +
      `?client_id=${process.env.SHOPIFY_API_KEY}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&response_type=code`;

    return authUrl;
  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    throw new Error('Failed to generate OAuth URL');
  }
};

/**
 * Validate OAuth callback and exchange code for access token
 * @param {Object} query - Query parameters from callback
 * @returns {Object} Session data with access token
 */
export const handleOAuthCallback = async (query) => {
  try {
    // Validate required parameters
    if (!query.code || !query.shop || !query.state) {
      throw new Error('Missing required OAuth parameters');
    }

    // Validate HMAC signature
    const hmac = query.hmac;
    delete query.hmac;

    const queryString = Object.keys(query)
      .sort()
      .map(key => `${key}=${query[key]}`)
      .join('&');

    const calculatedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
      .update(queryString)
      .digest('hex');

    if (calculatedHmac !== hmac) {
      throw new Error('HMAC validation failed');
    }

    // Exchange authorization code for access token
    const shopifyApi = initializeShopify();
    const callbackResponse = await shopifyApi.auth.callback({
      rawRequest: { query: { ...query, hmac } }
    });

    return {
      shop: query.shop,
      accessToken: callbackResponse.session.accessToken,
      scope: callbackResponse.session.scope
    };
  } catch (error) {
    console.error('OAuth callback error:', error);
    throw new Error(`OAuth callback failed: ${error.message}`);
  }
};

/**
 * Fetch orders from Shopify store
 * @param {string} shop - Shop domain
 * @param {string} accessToken - Access token
 * @param {Object} options - Query options (limit, created_at_min, etc.)
 * @returns {Array} Orders data
 */
export const fetchOrders = async (shop, accessToken, options = {}) => {
  try {
    const shopifyApi = initializeShopify();
    const client = new shopifyApi.clients.Rest({ 
      session: { 
        shop, 
        accessToken,
        isOnline: false 
      } 
    });

    const response = await client.get({
      path: 'orders',
      query: {
        status: 'any',
        limit: options.limit || 50,
        ...options
      }
    });

    return response.body.orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw new Error('Failed to fetch orders from Shopify');
  }
};

/**
 * Generate secure random state parameter
 * @returns {string} Random state string
 */
export const generateState = () => {
  return crypto.randomBytes(32).toString('hex');
};

export { initializeShopify };
export default initializeShopify;