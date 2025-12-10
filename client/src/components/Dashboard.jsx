import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { AlertTriangle, Download, ExternalLink, TrendingUp, Package, Shield, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient, API_BASE_URL } from '@/lib/api'

/**
 * Badge component for status indicators
 */
const StatusBadge = ({ status, value, threshold = 150 }) => {
  const getRiskStatus = () => {
    if (!value) return { label: 'Unknown', color: 'bg-gray-100 text-gray-600', icon: '⚪' }
    
    if (value > threshold) {
      return { 
        label: 'Duty Risk', 
        color: 'bg-red-100 text-red-700 border-red-200', 
        icon: '🔴' 
      }
    } else if (value >= 22) {
      return { 
        label: 'IOSS Eligible', 
        color: 'bg-green-100 text-green-700 border-green-200', 
        icon: '🟢' 
      }
    } else {
      return { 
        label: 'Low Value', 
        color: 'bg-gray-100 text-gray-600 border-gray-200', 
        icon: '⚪' 
      }
    }
  }

  const { label, color, icon } = getRiskStatus()

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
      <span>{icon}</span>
      {label}
    </span>
  )
}

/**
 * Skeleton loader for table rows
 */
const TableSkeleton = () => (
  <div className="animate-pulse">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="border-b border-gray-100 p-4">
        <div className="grid grid-cols-5 gap-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-6 bg-gray-200 rounded-full"></div>
        </div>
      </div>
    ))}
  </div>
)

/**
 * Main Dashboard Component
 * Displays Shopify orders and IOSS compliance analysis for beta testers
 */
const Dashboard = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    highRisk: 0,
    iossEligible: 0,
    lowValue: 0
  })

  // Get leadId from URL parameters
  const leadId = searchParams.get('leadId')
  
  // Debug logging
  console.log('🎯 Dashboard loaded with leadId:', leadId)
  console.log('🎯 Current URL:', window.location.href)
  console.log('🎯 Search params:', Object.fromEntries(searchParams.entries()))

  // Redirect to home if no leadId provided
  useEffect(() => {
    if (!leadId) {
      toast.error('No store ID provided. Please use a valid dashboard link.')
      navigate('/')
      return
    }
  }, [leadId, navigate])

  /**
   * Fetch orders from the API
   */
  const fetchOrders = async (showToast = false) => {
    if (!leadId) return
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get(`/orders?leadId=${leadId}`)
      const ordersData = response.data.data?.orders || response.data.orders || response.data || []
      
      setOrders(ordersData)
      
      // Calculate stats
      const total = ordersData.length
      const highRisk = ordersData.filter(order => order.totalPrice > 150).length
      const iossEligible = ordersData.filter(order => order.totalPrice >= 22 && order.totalPrice <= 150 && order.euDestination).length
      const lowValue = ordersData.filter(order => order.totalPrice < 22).length
      
      setStats({ total, highRisk, iossEligible, lowValue })
      
      if (showToast) {
        toast.success(`Refreshed ${total} orders successfully`)
      }
      
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err)
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError({ type: 'auth', message: 'Please connect your Shopify store to view orders' })
      } else {
        setError({ 
          type: 'api', 
          message: err.response?.data?.message || 'Failed to load orders. Please try again.' 
        })
      }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Trigger manual order sync
   */
  const syncOrders = async () => {
    if (!leadId) return
    
    try {
      setSyncing(true)
      const response = await apiClient.post('/orders/sync', { leadId })
      
      toast.success(`Sync completed: ${response.data.data?.processed || 0} orders processed`)
      
      // Refresh orders after sync
      await fetchOrders()
      
    } catch (err) {
      console.error('Error syncing orders:', err)
      toast.error(err.response?.data?.message || 'Failed to sync orders')
    } finally {
      setSyncing(false)
    }
  }

  /**
   * Download IOSS report
   */
  const downloadReport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/sample`)
      
      if (!response.ok) {
        throw new Error('Failed to download report')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ioss-report-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('IOSS report downloaded successfully')
      
    } catch (err) {
      console.error('Error downloading report:', err)
      toast.error('Failed to download report')
    }
  }

  /**
   * Connect to Shopify
   */
  const connectShopify = () => {
    if (!leadId) {
      toast.error('No store ID available for connection')
      return
    }
    window.location.href = `${API_BASE_URL}/shopify/auth?leadId=${leadId}`
  }

  /**
   * Format currency value
   */
  const formatCurrency = (amount, currency = 'EUR') => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-EU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Load orders on component mount
  useEffect(() => {
    fetchOrders()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">VATpilot Beta Dashboard 🚀</h1>
            <p className="text-gray-600 mt-1">Monitor your IOSS compliance status {leadId && `• Lead ID: ${leadId}`}</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => fetchOrders(true)}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              onClick={syncOrders}
              disabled={syncing}
            >
              <TrendingUp className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Orders'}
            </Button>
            
            <Button onClick={downloadReport}>
              <Download className="w-4 h-4 mr-2" />
              Download IOSS Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Risk</p>
                  <p className="text-2xl font-bold text-red-600">{stats.highRisk}</p>
                  <p className="text-xs text-gray-500">&gt;€150 value</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">IOSS Eligible</p>
                  <p className="text-2xl font-bold text-green-600">{stats.iossEligible}</p>
                  <p className="text-xs text-gray-500">€22-€150 to EU</p>
                </div>
                <Shield className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Low Value</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.lowValue}</p>
                  <p className="text-xs text-gray-500">&lt;€22 value</p>
                </div>
                <TrendingUp className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            
            {/* Error States */}
            {error?.type === 'auth' && (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6">
                    <ExternalLink className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Welcome to VATpilot Beta! 🚀</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    You're one step away from automated IOSS compliance. Connect your Shopify store to:
                  </p>
                  
                  <div className="space-y-3 mb-8 text-left">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                      <span className="text-gray-700">Sync your orders automatically</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                      <span className="text-gray-700">Analyze IOSS compliance risk</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm">✓</span>
                      </div>
                      <span className="text-gray-700">Download monthly IOSS reports</span>
                    </div>
                  </div>
                  
                  <Button onClick={connectShopify} size="lg" className="w-full">
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Connect Shopify Store
                  </Button>
                  
                  <p className="text-xs text-gray-500 mt-4">
                    Secure OAuth connection • We only read order data • No access to customer info
                  </p>
                </div>
              </div>
            )}

            {error?.type === 'api' && (
              <div className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Orders</h3>
                <p className="text-gray-600 mb-6">{error.message}</p>
                <Button onClick={() => fetchOrders()} variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            )}

            {/* Loading State */}
            {loading && !error && <TableSkeleton />}

            {/* Orders Table */}
            {!loading && !error && orders.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-4 font-semibold text-gray-900">Order #</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Date</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Destination</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Value</th>
                      <th className="text-left p-4 font-semibold text-gray-900">Risk Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order._id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="font-medium text-gray-900">#{order.orderNumber}</div>
                          <div className="text-sm text-gray-600">{order.shopifyOrderId}</div>
                        </td>
                        <td className="p-4 text-gray-900">
                          {order.shopifyCreatedAt ? formatDate(order.shopifyCreatedAt) : 'N/A'}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">
                            {order.customerCountry || order.shippingAddress?.countryCode || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {order.euDestination ? 'EU Destination' : 'Non-EU'}
                          </div>
                        </td>
                        <td className="p-4 font-medium text-gray-900">
                          {formatCurrency(order.totalPrice, order.currency)}
                        </td>
                        <td className="p-4">
                          <StatusBadge value={order.totalPrice} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && orders.length === 0 && (
              <div className="text-center py-12">
                <div className="max-w-sm mx-auto">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                    <Package className="w-10 h-10 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Start! 📦</h3>
                  <p className="text-gray-600 mb-6">
                    Your Shopify store is connected. Sync your orders to begin IOSS compliance analysis.
                  </p>
                  <div className="space-y-3">
                    <Button onClick={syncOrders} size="lg" className="w-full">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Sync Orders Now
                    </Button>
                    <Button onClick={connectShopify} variant="outline" className="w-full">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Change Store Connection
                    </Button>
                  </div>
                  
                  <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>💡 First time?</strong> The sync will import your recent orders and analyze them for IOSS compliance automatically.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  )
}

export default Dashboard