import express from 'express';
import Order from '../models/Order.js';
import Lead from '../models/Lead.js';
import { incrementalSync, getIOSSComplianceSummary } from '../services/syncService.js';

const router = express.Router();

/**
 * GET /api/orders
 * Get synced orders for a specific shop/lead
 */
router.get('/orders', async (req, res) => {
  try {
    const { 
      leadId,
      limit = 50, 
      page = 1,
      status,
      country,
      iossEligible,
      dateFrom,
      dateTo,
      sortBy = 'shopifyCreatedAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate required leadId
    if (!leadId) {
      return res.status(400).json({
        error: 'leadId parameter is required'
      });
    }

    // Verify lead exists and has Shopify connection
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    if (!lead.shopifyShopDomain) {
      return res.status(400).json({
        error: 'No Shopify store connected to this lead'
      });
    }

    // Build query filters
    const query = { shopId: leadId };

    // Filter by fulfillment status
    if (status) {
      query.fulfillmentStatus = status;
    }

    // Filter by customer country
    if (country) {
      query.customerCountry = country.toUpperCase();
    }

    // Filter by IOSS eligibility
    if (iossEligible !== undefined) {
      query.iossEligible = iossEligible === 'true';
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.shopifyCreatedAt = {};
      if (dateFrom) {
        query.shopifyCreatedAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.shopifyCreatedAt.$lte = new Date(dateTo);
      }
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [orders, totalCount] = await Promise.all([
      Order.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Order.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          hasNextPage,
          hasPrevPage,
          limit: limitNum
        },
        shop: {
          domain: lead.shopifyShopDomain,
          lastSync: lead.lastOrderSync,
          totalSynced: lead.totalOrdersSynced
        }
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

/**
 * GET /api/orders/summary
 * Get IOSS compliance summary for a shop
 */
router.get('/orders/summary', async (req, res) => {
  try {
    const { leadId, dateFrom, dateTo } = req.query;

    if (!leadId) {
      return res.status(400).json({
        error: 'leadId parameter is required'
      });
    }

    // Verify lead exists
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    // Build date range filter
    const dateRange = {};
    if (dateFrom) dateRange.startDate = dateFrom;
    if (dateTo) dateRange.endDate = dateTo;

    // Get IOSS compliance summary
    const summary = await getIOSSComplianceSummary(leadId, dateRange);

    // Get additional shop statistics
    const shopStats = await Order.aggregate([
      { $match: { shopId: leadId } },
      {
        $group: {
          _id: '$customerCountry',
          orderCount: { $sum: 1 },
          totalValue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        ...summary,
        topCountries: shopStats,
        shop: {
          domain: lead.shopifyShopDomain,
          lastSync: lead.lastOrderSync,
          totalSynced: lead.totalOrdersSynced
        }
      }
    });

  } catch (error) {
    console.error('Error getting order summary:', error);
    res.status(500).json({
      error: 'Failed to get order summary',
      message: error.message
    });
  }
});

/**
 * POST /api/orders/sync
 * Trigger manual order sync for a shop
 */
router.post('/orders/sync', async (req, res) => {
  try {
    const { leadId, fullSync = false } = req.body;

    if (!leadId) {
      return res.status(400).json({
        error: 'leadId is required'
      });
    }

    // Get lead with Shopify credentials
    const lead = await Lead.findById(leadId).select('+shopifyAccessToken');
    if (!lead) {
      return res.status(404).json({
        error: 'Lead not found'
      });
    }

    if (!lead.shopifyAccessToken || !lead.shopifyShopDomain) {
      return res.status(400).json({
        error: 'No Shopify store connected'
      });
    }

    console.log(`🔄 Manual sync triggered for ${lead.shopifyShopDomain} (Full: ${fullSync})`);

    // Perform sync (incremental or full)
    const syncResult = fullSync 
      ? await syncOrders(leadId, lead.shopifyAccessToken, lead.shopifyShopDomain, { limit: 250 })
      : await incrementalSync(leadId, lead.shopifyAccessToken, lead.shopifyShopDomain);

    res.json({
      success: true,
      message: 'Sync completed successfully',
      data: syncResult
    });

  } catch (error) {
    console.error('Manual sync error:', error);
    res.status(500).json({
      error: 'Sync failed',
      message: error.message
    });
  }
});

/**
 * GET /api/orders/countries
 * Get unique customer countries for filtering
 */
router.get('/orders/countries', async (req, res) => {
  try {
    const { leadId } = req.query;

    if (!leadId) {
      return res.status(400).json({
        error: 'leadId parameter is required'
      });
    }

    const countries = await Order.distinct('customerCountry', { 
      shopId: leadId,
      customerCountry: { $ne: null }
    });

    res.json({
      success: true,
      data: countries.sort()
    });

  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({
      error: 'Failed to fetch countries',
      message: error.message
    });
  }
});

/**
 * GET /api/orders/:orderId
 * Get detailed information for a specific order
 */
router.get('/orders/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { leadId } = req.query;

    if (!leadId) {
      return res.status(400).json({
        error: 'leadId parameter is required'
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      shopId: leadId
    }).lean();

    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({
      error: 'Failed to fetch order details',
      message: error.message
    });
  }
});

export default router;