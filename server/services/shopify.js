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
    // Log detailed environment check
    console.log('🔧 Shopify Environment Check:');
    console.log('SHOPIFY_API_KEY present:', !!process.env.SHOPIFY_API_KEY);
    console.log('SHOPIFY_API_SECRET present:', !!process.env.SHOPIFY_API_SECRET);
    console.log('HOST_NAME:', process.env.HOST_NAME);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      const error = new Error('Missing Shopify credentials. Please set SHOPIFY_API_KEY and SHOPIFY_API_SECRET environment variables.');
      console.error('❌ Shopify initialization failed:', error.message);
      throw error;
    }
    
    const hostName = process.env.HOST_NAME || (process.env.NODE_ENV === 'production' ? 'vatpilot.onrender.com' : 'localhost:5000');
    
    shopify = shopifyApi({
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecretKey: process.env.SHOPIFY_API_SECRET,
      scopes: ['read_orders', 'read_assigned_fulfillment_orders'],
      hostName: hostName,
      hostScheme: process.env.NODE_ENV === 'production' ? 'https' : 'http',
      apiVersion: ApiVersion.October24,
      isEmbeddedApp: false,
    });
    
    console.log('✅ Shopify API initialized successfully with host:', hostName);
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
    console.log('🔄 Generating OAuth URL for shop:', shop);
    const shopifyApi = initializeShopify();
    
    // Sanitize shop domain
    const sanitizedShop = shopifyApi.utils.sanitizeShop(shop, true);
    console.log('✅ Shop sanitized:', sanitizedShop);
    
    // Build OAuth URL manually
    const scopes = ['read_orders', 'read_assigned_fulfillment_orders'].join(',');
    const hostName = process.env.HOST_NAME || (process.env.NODE_ENV === 'production' ? 'vatpilot.onrender.com' : 'localhost:5000');
    const hostScheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const redirectUri = `${hostScheme}://${hostName}/api/shopify/callback`;
    
    console.log('🔧 OAuth URL components:');
    console.log('  - Host:', `${hostScheme}://${hostName}`);
    console.log('  - Redirect URI:', redirectUri);
    console.log('  - Scopes:', scopes);
    
    const authUrl = `https://${sanitizedShop}/admin/oauth/authorize` +
      `?client_id=${process.env.SHOPIFY_API_KEY}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}` +
      `&response_type=code`;

    console.log('✅ OAuth URL generated successfully');
    return authUrl;
  } catch (error) {
    console.error('❌ Error generating OAuth URL:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      shop,
      state,
      env: {
        SHOPIFY_API_KEY: !!process.env.SHOPIFY_API_KEY,
        SHOPIFY_API_SECRET: !!process.env.SHOPIFY_API_SECRET,
        HOST_NAME: process.env.HOST_NAME,
        NODE_ENV: process.env.NODE_ENV
      }
    });
    throw new Error(`Failed to generate OAuth URL: ${error.message}`);
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
    const queryParams = { ...query };
    delete queryParams.hmac;

    const queryString = Object.keys(queryParams)
      .sort()
      .map(key => `${key}=${queryParams[key]}`)
      .join('&');

    const calculatedHmac = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
      .update(queryString)
      .digest('hex');

    if (calculatedHmac !== hmac) {
      throw new Error('HMAC validation failed');
    }

    // Exchange authorization code for access token manually
    const tokenUrl = `https://${query.shop}/admin/oauth/access_token`;
    const tokenPayload = {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code: query.code
    };

    console.log(`🔄 Exchanging OAuth code for access token: ${query.shop}`);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tokenPayload)
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const tokenData = await response.json();

    if (!tokenData.access_token) {
      throw new Error('No access token received from Shopify');
    }

    console.log(`✅ OAuth token exchange successful: ${query.shop}`);

    return {
      shop: query.shop,
      accessToken: tokenData.access_token,
      scope: tokenData.scope
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