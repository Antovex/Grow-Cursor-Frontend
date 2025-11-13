import React, { useEffect, useState } from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  TextField,
  Tooltip,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api from '../../lib/api';

export default function FulfillmentDashboard() {
  const [sellers, setSellers] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingAdFee, setEditingAdFee] = useState({});
  const [pollResults, setPollResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Search filters
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchBuyerName, setSearchBuyerName] = useState('');
  const [searchSoldDate, setSearchSoldDate] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Expanded shipping addresses
  const [expandedShipping, setExpandedShipping] = useState({});

  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  useEffect(() => {
    fetchSellers();
    loadStoredOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadStoredOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSeller]);

  useEffect(() => {
    // Apply filters whenever orders or search criteria change
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, searchOrderId, searchBuyerName, searchSoldDate]);

  function applyFilters() {
    let filtered = [...orders];

    // Filter by Order ID
    if (searchOrderId.trim()) {
      filtered = filtered.filter(order =>
        (order.orderId || '').toLowerCase().includes(searchOrderId.toLowerCase()) ||
        (order.legacyOrderId || '').toLowerCase().includes(searchOrderId.toLowerCase())
      );
    }

    // Filter by Buyer Name
    if (searchBuyerName.trim()) {
      filtered = filtered.filter(order =>
        (order.buyer?.buyerRegistrationAddress?.fullName || '').toLowerCase().includes(searchBuyerName.toLowerCase())
      );
    }

    // Filter by Sold Date
    if (searchSoldDate.trim()) {
      filtered = filtered.filter(order => {
        if (!order.dateSold) return false;
        const orderDate = formatDate(order.dateSold);
        return orderDate.includes(searchSoldDate);
      });
    }

    setFilteredOrders(filtered);
  }

  async function fetchSellers() {
    setError('');
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      setError('Failed to load sellers');
    }
  }

  async function loadStoredOrders() {
    setLoading(true);
    setError('');
    setPollResults(null);
    try {
      const params = selectedSeller ? { sellerId: selectedSeller } : {};
      const { data } = await api.get('/ebay/stored-orders', { params });
      setOrders(data?.orders || []);
    } catch (e) {
      setOrders([]);
      setError(e?.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrders() {
    setLoading(true);
    setError('');
    setPollResults(null);
    try {
      const { data } = await api.post('/ebay/poll-all-sellers');
      setPollResults(data || null);
      await loadStoredOrders();

      // Show snackbar if there are new or updated orders
      if (data && (data.totalNewOrders > 0 || data.totalUpdatedOrders > 0)) {
        setSnackbarMsg(
          `Polling Complete! New Orders: ${data.totalNewOrders}, Updated Orders: ${data.totalUpdatedOrders}`
        );
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else if (data) {
        setSnackbarMsg('Polling Complete! No new or updated orders.');
        setSnackbarSeverity('info');
        setSnackbarOpen(true);
      }
    } catch (e) {
      setError(e?.response?.data?.error || 'Failed to poll orders');
    } finally {
      setLoading(false);
    }
  }

  // Update ad fee general in database
  const updateAdFeeGeneral = async (orderId, value) => {
    try {
      await api.patch(`/ebay/orders/${orderId}/ad-fee-general`, { adFeeGeneral: value });
      setOrders(prev =>
        prev.map(order => (order._id === orderId ? { ...order, adFeeGeneral: value } : order)),
      );
    } catch (err) {
      // keep previous value in UI; just notify
      // eslint-disable-next-line no-alert
      alert('Failed to update ad fee general');
    }
  };

  const handleAdFeeChange = (orderId, value) => {
    setEditingAdFee(prev => ({ ...prev, [orderId]: value }));
  };

  const handleAdFeeBlur = (orderId) => {
    const value = editingAdFee[orderId];
    if (value !== undefined && value !== '') {
      const numValue = parseFloat(value);
      if (!Number.isNaN(numValue)) {
        updateAdFeeGeneral(orderId, numValue);
      }
    }
    setEditingAdFee(prev => {
      const n = { ...prev };
      delete n[orderId];
      return n;
    });
  };

  const handleCopy = (text) => {
    const val = text || '-';
    if (val === '-') return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(val);
      setCopiedText(val);
      setTimeout(() => setCopiedText(''), 1200);
    }
  };

  const toggleShippingExpanded = (orderId) => {
    setExpandedShipping(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'America/Los_Angeles',
      });
    } catch {
      return '-';
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    const num = Number(value);
    if (Number.isNaN(num)) return '-';
    return `$${num.toFixed(2)}`;
  };

  return (
    <Box>
      {/* HEADER SECTION */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LocalShippingIcon color="primary" />
            <Typography variant="h5" fontWeight="bold">Fulfillment Dashboard</Typography>
          </Stack>
          {orders.length > 0 && (
            <Chip
              icon={<ShoppingCartIcon />}
              label={`${orders.length} orders`}
              color="primary"
              variant="outlined"
            />
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* CONTROLS */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel id="seller-select-label">Select Seller</InputLabel>
            <Select
              labelId="seller-select-label"
              value={selectedSeller}
              label="Select Seller"
              onChange={(e) => setSelectedSeller(e.target.value)}
            >
              <MenuItem value="">
                <em>-- Select Seller --</em>
              </MenuItem>
              {sellers.map((s) => (
                <MenuItem key={s._id} value={s._id}>
                  {s.user?.username || s.user?.email || s._id}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
            onClick={fetchOrders}
            disabled={loading}
            sx={{ minWidth: 160 }}
          >
            {loading ? 'Polling...' : 'Poll New Orders'}
          </Button>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {/* SEARCH FILTERS */}
        {orders.length > 0 && (
          <Box sx={{ mt: 2, p: 2, backgroundColor: 'action.hover', borderRadius: 1 }}>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                Search Filters
              </Typography>
              <IconButton size="small">
                {filtersExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Box>
            {filtersExpanded && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1.5 }}>
                <TextField
                  size="small"
                  label="Order ID"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  placeholder="Search by order ID..."
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Buyer Name"
                  value={searchBuyerName}
                  onChange={(e) => setSearchBuyerName(e.target.value)}
                  placeholder="Search by buyer name..."
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Sold Date"
                  value={searchSoldDate}
                  onChange={(e) => setSearchSoldDate(e.target.value)}
                  placeholder="MM/DD/YYYY"
                  sx={{ flex: 1 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setSearchOrderId('');
                    setSearchBuyerName('');
                    setSearchSoldDate('');
                  }}
                  sx={{ minWidth: 100 }}
                >
                  Clear
                </Button>
              </Stack>
            )}
          </Box>
        )}

        {pollResults && (
          <Alert
            severity={
              (pollResults.totalNewOrders > 0 || pollResults.totalUpdatedOrders > 0) ? 'success' : 'info'
            }
            sx={{ mt: 2 }}
            onClose={() => setPollResults(null)}
          >
            {copiedText && (
              <Typography variant="caption" color="success.main" sx={{ mb: 1, display: 'block' }}>
                Copied!
              </Typography>
            )}
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
              Polling Complete: {pollResults.totalPolled} seller account(s) polled
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • New Orders: <strong>{pollResults.totalNewOrders}</strong>
              <br />
              • Updated Orders: <strong>{pollResults.totalUpdatedOrders}</strong>
            </Typography>
            {pollResults.pollResults && pollResults.pollResults.length > 0 && (
              <Box sx={{ mt: 2 }}>
                {pollResults.pollResults.map((result, idx) => (
                  <Box
                    key={idx}
                    sx={{ mb: 1, p: 1, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}
                  >
                    <Typography variant="body2" fontWeight="medium">
                      {result.sellerName}:
                    </Typography>
                    {result.success ? (
                      <Typography variant="caption" component="div">
                        {result.newOrders?.length > 0 && (
                          <div>✓ New: {result.newOrders.join(', ')}</div>
                        )}
                        {result.updatedOrders?.length > 0 && (
                          <div>↻ Updated: {result.updatedOrders.join(', ')}</div>
                        )}
                        {(!result.newOrders?.length && !result.updatedOrders?.length) && (
                          <div>No new or updated orders</div>
                        )}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="error">
                        ✗ Error: {result.error}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Alert>
        )}
      </Paper>

      {/* TABLE SECTION */}
      {loading && !filteredOrders.length ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>Loading orders...</Typography>
        </Paper>
      ) : filteredOrders.length === 0 && orders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No orders found. Click "Poll New Orders" to fetch orders from all sellers.
          </Typography>
        </Paper>
      ) : filteredOrders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No orders match your search criteria.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small" sx={{ '& td, & th': { whiteSpace: 'nowrap' } }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.main' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>SL No</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Seller</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Order ID</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Date Sold</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Ship By</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Product Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Buyer Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Shipping Address</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Subtotal</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Shipping</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Sales Tax</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Discount</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Transaction Fees</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Ad Fee General</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cancel Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Refunds</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tracking Number</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.map((order, idx) => {
                const currentAdFeeValue =
                  editingAdFee[order._id] !== undefined
                    ? editingAdFee[order._id]
                    : (order.adFeeGeneral ?? '');

                return (
                  <TableRow
                    key={order._id || idx}
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: 'action.hover' },
                      '&:hover': { backgroundColor: 'action.selected' },
                    }}
                  >
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {order.seller?.user?.username ||
                          order.seller?.user?.email ||
                          order.sellerId ||
                          '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" sx={{ color: 'primary.main' }}>
                        {order.orderId || order.legacyOrderId || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(order.dateSold)}</TableCell>
                    <TableCell>{formatDate(order.shipByDate)}</TableCell>
                    <TableCell sx={{ maxWidth: 250, pr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                        <Tooltip title={order.productName || order.lineItems?.[0]?.title || '-'} arrow>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.productName || order.lineItems?.[0]?.title || '-'}
                          </Typography>
                        </Tooltip>
                        <IconButton size="small" onClick={() => handleCopy(order.productName || order.lineItems?.[0]?.title || '-') } aria-label="copy product name">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150, pr: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                        <Tooltip title={order.buyer?.buyerRegistrationAddress?.fullName || '-'} arrow>
                          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {order.buyer?.buyerRegistrationAddress?.fullName || '-'}
                          </Typography>
                        </Tooltip>
                        <IconButton size="small" onClick={() => handleCopy(order.buyer?.buyerRegistrationAddress?.fullName || '-') } aria-label="copy buyer name">
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300 }}>
                      {expandedShipping[order._id] ? (
                        <Stack spacing={0.5}>
                          {/* Full Name */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingFullName || '-'} arrow>
                              <Typography variant="body2" fontWeight="medium" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingFullName || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingFullName)} aria-label="copy name">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Address Line 1 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingAddressLine1 || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingAddressLine1 || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingAddressLine1)} aria-label="copy address">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Address Line 2 */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingAddressLine2 || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingAddressLine2 || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingAddressLine2)} aria-label="copy address line 2">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* City */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingCity || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingCity || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingCity)} aria-label="copy city">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* State */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingState || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingState || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingState)} aria-label="copy state">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Postal Code */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingPostalCode || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingPostalCode || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingPostalCode)} aria-label="copy postal code">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Country */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingCountry || '-'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                {order.shippingCountry || '-'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingCountry)} aria-label="copy country">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Phone */}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Tooltip title={order.shippingPhone || '0000000000'} arrow>
                              <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                📞 {order.shippingPhone || '0000000000'}
                              </Typography>
                            </Tooltip>
                            <IconButton size="small" onClick={() => handleCopy(order.shippingPhone || '0000000000')} aria-label="copy phone">
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Box>
                          {/* Collapse Button */}
                          <Button 
                            size="small" 
                            onClick={() => toggleShippingExpanded(order._id)}
                            startIcon={<ExpandLessIcon />}
                            sx={{ mt: 0.5 }}
                          >
                            Collapse
                          </Button>
                        </Stack>
                      ) : (
                        <Button 
                          size="small" 
                          onClick={() => toggleShippingExpanded(order._id)}
                          endIcon={<ExpandMoreIcon />}
                          sx={{ textTransform: 'none' }}
                        >
                          {order.shippingFullName || 'View Address'}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="medium">
                        {formatCurrency(order.subtotal)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(order.shipping)}</TableCell>
                    <TableCell align="right">{formatCurrency(order.salesTax)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ color: Number(order.discount) < 0 ? 'success.main' : 'text.primary' }}
                      >
                        {formatCurrency(order.discount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatCurrency(order.transactionFees)}</TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={currentAdFeeValue}
                        onChange={(e) => handleAdFeeChange(order._id, e.target.value)}
                        onBlur={() => handleAdFeeBlur(order._id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        inputProps={{
                          step: '0.01',
                          min: '0',
                          style: { textAlign: 'right' },
                        }}
                        sx={{ width: 100 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.cancelState || 'NONE_REQUESTED'}
                        size="small"
                        color={
                          order.cancelState === 'CANCELED' ? 'error' :
                          order.cancelState === 'CANCEL_REQUESTED' ? 'warning' :
                          'success'
                        }
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </TableCell>
                    <TableCell>
                      {order.refunds && order.refunds.length > 0 ? (
                        <Tooltip
                          title={
                            <Box>
                              {order.refunds.map((refund, idx) => (
                                <Typography key={idx} variant="caption" display="block">
                                  {formatCurrency(refund.refundAmount?.value)} - {refund.refundStatus}
                                </Typography>
                              ))}
                            </Box>
                          }
                          arrow
                        >
                          <Chip
                            label={`${order.refunds.length} refund(s)`}
                            size="small"
                            color="warning"
                            sx={{ fontSize: '0.7rem', cursor: 'pointer' }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150, pr: 1 }}>
                      {order.trackingNumber ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                          <Tooltip title={order.trackingNumber} arrow>
                            <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {order.trackingNumber}
                            </Typography>
                          </Tooltip>
                          <IconButton size="small" onClick={() => handleCopy(order.trackingNumber)} aria-label="copy tracking number">
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">-</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Snackbar for polling results */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{
            width: '100%',
            fontSize: '1.25rem',
            py: 2,
            px: 4,
            minWidth: 400,
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
          }}
          elevation={6}
          variant="filled"
        >
          {snackbarMsg}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}
