import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    IconButton,
    Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import api from '../../lib/api';

const PayoneerSheetPage = () => {
    const [records, setRecords] = useState([]);
    const [sellers, setSellers] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]); // Changed from paymentAccounts
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form State for "Add New"
    const [formData, setFormData] = useState({
        bankAccount: '', // ObjectId of BankAccount
        paymentDate: new Date().toISOString().split('T')[0],
        amount: '',
        exchangeRate: '',
        store: ''
    });

    // Calculated Preview for "Add New"
    const [preview, setPreview] = useState({
        actualExchangeRate: 0,
        bankDeposit: 0
    });

    // Editing State
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});

    useEffect(() => {
        fetchRecords();
        fetchSellers();
        fetchBankAccounts();
    }, []);

    // Update calculations when Amount or Rate changes (for Add Dialog)
    useEffect(() => {
        const amount = parseFloat(formData.amount) || 0;
        const rate = parseFloat(formData.exchangeRate) || 0;
        const actualRate = rate + (rate * 0.02);
        const deposit = amount * rate;

        setPreview({
            actualExchangeRate: actualRate,
            bankDeposit: deposit
        });
    }, [formData.amount, formData.exchangeRate]);

    const fetchRecords = async () => {
        try {
            const { data } = await api.get('/payoneer');
            setRecords(data);
        } catch (error) {
            console.error('Error fetching records:', error);
        }
    };

    const fetchSellers = async () => {
        try {
            const { data } = await api.get('/sellers/all');
            setSellers(data);
        } catch (error) {
            console.error('Error fetching sellers:', error);
        }
    };

    const fetchBankAccounts = async () => {
        try {
            const { data } = await api.get('/bank-accounts');
            setBankAccounts(data);
        } catch (error) {
            console.error('Error fetching bank accounts:', error);
        }
    };

    const handleCreate = async () => {
        try {
            setLoading(true);
            await api.post('/payoneer', formData);
            setOpenDialog(false);
            fetchRecords();
            // Reset form
            setFormData({
                bankAccount: '',
                paymentDate: new Date().toISOString().split('T')[0],
                amount: '',
                exchangeRate: '',
                store: ''
            });
        } catch (error) {
            alert('Failed to create: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            await api.delete(`/payoneer/${id}`);
            setRecords(prev => prev.filter(r => r._id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    // --- EDITING LOGIC ---

    const startEditing = (record) => {
        setEditingId(record._id);
        setEditFormData({
            bankAccount: record.bankAccount?._id,
            paymentDate: record.paymentDate ? record.paymentDate.split('T')[0] : '',
            amount: record.amount,
            exchangeRate: record.exchangeRate,
            store: record.store?._id // Store ID
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
        setEditFormData({});
    };

    const handleEditChange = (field, value) => {
        setEditFormData(prev => ({ ...prev, [field]: value }));
    };

    const saveEdit = async () => {
        try {
            await api.put(`/payoneer/${editingId}`, editFormData);
            setEditingId(null);
            fetchRecords();
        } catch (error) {
            alert('Failed to update: ' + (error.response?.data?.error || error.message));
        }
    };

    // Render a cell that is text normally, but an input when editing
    const renderCell = (record, field, type = 'text') => {
        const isEditing = editingId === record._id;
        let value = isEditing ? editFormData[field] : (field === 'store' ? (record.store?.user?.username || 'Unknown') : record[field]);

        if (!isEditing && field === 'bankAccount') {
            value = record.bankAccount?.name || 'Unknown';
        }

        if (!isEditing) {
            if (field === 'amount' || field === 'bankDeposit') return value?.toFixed(2);
            if (field === 'actualExchangeRate') return value?.toFixed(4);
            if (field === 'paymentDate') return new Date(value).toLocaleDateString();
            return value;
        }

        if (field === 'bankAccount') {
            return (
                <TextField
                    select
                    size="small"
                    value={editFormData.bankAccount || ''}
                    onChange={(e) => handleEditChange('bankAccount', e.target.value)}
                    sx={{ minWidth: 150 }}
                >
                    {bankAccounts.map((acc) => (
                        <MenuItem key={acc._id} value={acc._id}>
                            {acc.name}
                        </MenuItem>
                    ))}
                </TextField>
            );
        }

        if (field === 'store') {
            return (
                <TextField
                    select
                    size="small"
                    value={editFormData.store || ''}
                    onChange={(e) => handleEditChange('store', e.target.value)}
                    sx={{ minWidth: 120 }}
                >
                    {sellers.map((seller) => (
                        <MenuItem key={seller._id} value={seller._id}>
                            {seller.user?.username || seller.user?.email}
                        </MenuItem>
                    ))}
                </TextField>
            );
        }

        return (
            <TextField
                type={type}
                size="small"
                value={value}
                onChange={(e) => handleEditChange(field, e.target.value)}
                sx={{ maxWidth: 100 }}
            />
        );
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5">Payoneer Sheet</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    Add Record
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Bank Account</TableCell>
                            <TableCell>Payment Date</TableCell>
                            <TableCell>Store Name</TableCell>
                            <TableCell>Amount ($)</TableCell>
                            <TableCell>Exchange Rate (₹)</TableCell>
                            <TableCell>Actual Rate (+2%)</TableCell>
                            <TableCell>Bank Deposit (₹)</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {records.map((record) => {
                            const isEditing = editingId === record._id;
                            return (
                                <TableRow key={record._id}>
                                    <TableCell>{renderCell(record, 'bankAccount')}</TableCell>
                                    <TableCell>{renderCell(record, 'paymentDate', 'date')}</TableCell>
                                    <TableCell>{renderCell(record, 'store')}</TableCell>
                                    <TableCell>{renderCell(record, 'amount', 'number')}</TableCell>
                                    <TableCell>{renderCell(record, 'exchangeRate', 'number')}</TableCell>

                                    {/* Calculated fields are READ-ONLY even in edit mode (server calculates them) */}
                                    <TableCell sx={{ bgcolor: isEditing ? '#f8f9fa' : 'inherit', color: 'text.secondary' }}>
                                        {isEditing ? 'Auto-calc' : record.actualExchangeRate?.toFixed(4)}
                                    </TableCell>
                                    <TableCell sx={{ bgcolor: isEditing ? '#f8f9fa' : 'inherit', color: 'text.secondary', fontWeight: 'bold' }}>
                                        {isEditing ? 'Auto-calc' : record.bankDeposit?.toFixed(2)}
                                    </TableCell>

                                    <TableCell align="right">
                                        {isEditing ? (
                                            <>
                                                <Tooltip title="Save">
                                                    <IconButton color="primary" onClick={saveEdit}>
                                                        <SaveIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Cancel">
                                                    <IconButton color="error" onClick={cancelEditing}>
                                                        <CancelIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        ) : (
                                            <>
                                                <Tooltip title="Edit">
                                                    <IconButton color="primary" size="small" onClick={() => startEditing(record)}>
                                                        <EditIcon />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton color="error" size="small" onClick={() => handleDelete(record._id)}>
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {records.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    No records found. Click "Add Record" to create one.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* CREATE DIALOG */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Payoneer Record</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            select
                            label="Bank Account"
                            fullWidth
                            value={formData.bankAccount}
                            onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                        >
                            {bankAccounts.map((acc) => (
                                <MenuItem key={acc._id} value={acc._id}>
                                    {acc.name}
                                </MenuItem>
                            ))}
                        </TextField>

                        {/* Store Name Selection */}
                        <TextField
                            select
                            label="Store Name"
                            fullWidth
                            value={formData.store}
                            onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                        >
                            {sellers.map((seller) => (
                                <MenuItem key={seller._id} value={seller._id}>
                                    {seller.user?.username || seller.user?.email}
                                </MenuItem>
                            ))}
                        </TextField>

                        <TextField
                            label="Payment Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.paymentDate}
                            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                        />

                        <Box display="flex" gap={2}>
                            <TextField
                                label="Amount ($)"
                                type="number"
                                fullWidth
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            />
                            <TextField
                                label="Exchange Rate (₹)"
                                type="number"
                                fullWidth
                                value={formData.exchangeRate}
                                onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                            />
                        </Box>

                        {/* PREVIEW OF CALCULATIONS */}
                        <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                            <Typography variant="subtitle2" gutterBottom>Calculated Preview:</Typography>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="body2">Actual Rate (+2%): <b>{preview.actualExchangeRate?.toFixed(4)}</b></Typography>
                                <Typography variant="body2">Bank Deposit: <b>{preview.bankDeposit?.toFixed(2)}</b></Typography>
                            </Box>
                        </Paper>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreate} variant="contained" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Record'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PayoneerSheetPage;
