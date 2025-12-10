import Order from '../models/Order.js';
import { fetchOrders } from './shopify.js';

/**
 * Service for synchronizing Shopify orders with local MongoDB database
 */

/**
 * Sync orders from Shopify store to local database
 * @param {string} shopId - MongoDB Lead document ID
 * @param {string} accessToken - Shopify access token
 * @param {string} domain - Shopify store domain
 * @param {Object} options - Sync options
 * @returns {Object} Sync results summary
 */
export const syncOrders = async (shopId, accessToken, domain, options = {}) => {
  try {
    console.log(`🔄 Starting order sync for shop: ${domain}`);
    
    const {
      limit = 50,
      createdAtMin = null,
      status = 'any'
    } = options;

    // Fetch orders from Shopify
    const fetchOptions = {
      limit,
      status,
      ...(createdAtMin && { created_at_min: createdAtMin })
    };

    const shopifyOrders = await fetchOrders(domain, accessToken, fetchOptions);
    
    if (!shopifyOrders || shopifyOrders.length === 0) {
      console.log(`📭 No orders found for shop: ${domain}`);
      return {
        success: true,
        message: 'No orders to sync',
        processed: 0,
        created: 0,
        updated: 0
      };
    }

    console.log(`📦 Fetched ${shopifyOrders.length} orders from Shopify`);

    // Transform Shopify orders to our schema format
    const transformedOrders = shopifyOrders.map(shopifyOrder => ({
      updateOne: {
        filter: { shopifyOrderId: shopifyOrder.id.toString() },
        update: {
          $set: {
            shopId: shopId,
            shopifyOrderId: shopifyOrder.id.toString(),
            orderNumber: shopifyOrder.name || shopifyOrder.order_number?.toString(),
            totalPrice: parseFloat(shopifyOrder.total_price) || 0,
            currency: shopifyOrder.currency || 'USD',
            customerCountry: shopifyOrder.shipping_address?.country_code || 
                           shopifyOrder.billing_address?.country_code || null,
            customerEmail: shopifyOrder.email || shopifyOrder.contact_email,
            fulfillmentStatus: shopifyOrder.fulfillment_status || 'null',
            financialStatus: shopifyOrder.financial_status || 'pending',
            
            // Line items with detailed product information
            lineItems: shopifyOrder.line_items?.map(item => ({
              productId: item.product_id?.toString(),
              variantId: item.variant_id?.toString(),
              title: item.title,
              quantity: parseInt(item.quantity) || 0,
              price: parseFloat(item.price) || 0,
              vendor: item.vendor,
              countryOfOrigin: item.origin_location?.country_code
            })) || [],
            
            // Shipping address for compliance analysis
            shippingAddress: shopifyOrder.shipping_address ? {
              country: shopifyOrder.shipping_address.country,
              countryCode: shopifyOrder.shipping_address.country_code,
              province: shopifyOrder.shipping_address.province,
              city: shopifyOrder.shipping_address.city,
              zip: shopifyOrder.shipping_address.zip
            } : null,
            
            // Shopify timestamps
            shopifyCreatedAt: new Date(shopifyOrder.created_at),
            shopifyUpdatedAt: new Date(shopifyOrder.updated_at),
            
            // Update sync timestamp
            syncedAt: new Date()
          }
        },
        upsert: true
      }
    }));

    // Bulk write to MongoDB for efficiency
    const bulkWriteResult = await Order.bulkWrite(transformedOrders, {
      ordered: false // Continue processing even if some operations fail
    });

    // Calculate sync statistics
    const created = bulkWriteResult.upsertedCount || 0;
    const updated = bulkWriteResult.modifiedCount || 0;
    const processed = transformedOrders.length;

    console.log(`✅ Order sync completed for ${domain}:`);
    console.log(`   📈 Processed: ${processed} orders`);
    console.log(`   🆕 Created: ${created} new orders`);
    console.log(`   📝 Updated: ${updated} existing orders`);

    // Update Lead document with sync statistics
    try {
      const Lead = (await import('../models/Lead.js')).default;
      await Lead.findByIdAndUpdate(shopId, {
        lastOrderSync: new Date(),
        totalOrdersSynced: await Order.countDocuments({ shopId })
      });
    } catch (error) {
      console.warn('⚠️ Failed to update Lead sync statistics:', error.message);
    }

    return {
      success: true,
      message: `Successfully synced ${processed} orders`,
      processed,
      created,
      updated,
      shopDomain: domain
    };

  } catch (error) {
    console.error('❌ Order sync failed:', error);
    
    return {
      success: false,
      error: error.message,
      processed: 0,
      created: 0,
      updated: 0
    };
  }
};

/**
 * Get the latest order date for incremental sync
 * @param {string} shopId - MongoDB Lead document ID
 * @returns {Date|null} Latest order date or null
 */
export const getLastSyncDate = async (shopId) => {
  try {
    const latestOrder = await Order.findOne(
      { shopId },
      { shopifyCreatedAt: 1 }
    ).sort({ shopifyCreatedAt: -1 });

    return latestOrder?.shopifyCreatedAt || null;
  } catch (error) {
    console.error('Error getting last sync date:', error);
    return null;
  }
};

/**
 * Sync only new/updated orders since last sync
 * @param {string} shopId - MongoDB Lead document ID
 * @param {string} accessToken - Shopify access token
 * @param {string} domain - Shopify store domain
 * @returns {Object} Sync results
 */
export const incrementalSync = async (shopId, accessToken, domain) => {
  try {
    const lastSyncDate = await getLastSyncDate(shopId);
    
    const options = {
      limit: 100, // Higher limit for incremental sync
      ...(lastSyncDate && { 
        createdAtMin: lastSyncDate.toISOString() 
      })
    };

    console.log(`🔄 Starting incremental sync for ${domain}`);
    if (lastSyncDate) {
      console.log(`   📅 Syncing orders since: ${lastSyncDate.toISOString()}`);
    }

    return await syncOrders(shopId, accessToken, domain, options);
  } catch (error) {
    console.error('❌ Incremental sync failed:', error);
    throw error;
  }
};

/**
 * Get IOSS compliance summary for a shop
 * @param {string} shopId - MongoDB Lead document ID
 * @param {Object} dateRange - Optional date range filter
 * @returns {Object} IOSS compliance summary
 */
export const getIOSSComplianceSummary = async (shopId, dateRange = {}) => {
  try {
    const summary = await Order.getIOSSSummary(shopId, dateRange);
    
    if (!summary || summary.length === 0) {
      return {
        totalOrders: 0,
        iossEligibleOrders: 0,
        euOrders: 0,
        totalValue: 0,
        iossValue: 0,
        averageOrderValue: 0,
        complianceRate: 0
      };
    }

    const result = summary[0];
    
    return {
      ...result,
      complianceRate: result.euOrders > 0 
        ? ((result.iossEligibleOrders / result.euOrders) * 100).toFixed(2)
        : 0
    };
  } catch (error) {
    console.error('Error getting IOSS summary:', error);
    throw error;
  }
};

export default {
  syncOrders,
  getLastSyncDate,
  incrementalSync,
  getIOSSComplianceSummary
};