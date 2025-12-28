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
    Chip,
    IconButton,
    Tooltip,
    Grid,
    Card,
    CardContent,
    Stack,
    ToggleButton,
    ToggleButtonGroup
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import api from '../../lib/api';

const TransactionPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);
    const [balanceSummary, setBalanceSummary] = useState([]); // Balance state
    const [openDialog, setOpenDialog] = useState(false);
    const [loading, setLoading] = useState(false);

    // Editing state
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        bankAccount: '', // Changed
        transactionType: 'Debit', // Default for manual
        amount: '',
        remark: ''
    });

    useEffect(() => {
        fetchTransactions();
        fetchBankAccounts();
        fetchBalanceSummary();
    }, []);

    const fetchTransactions = async () => {
        try {
            const { data } = await api.get('/transactions');
            setTransactions(data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
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

    const fetchBalanceSummary = async () => {
        try {
            const { data } = await api.get('/transactions/balance-summary');
            setBalanceSummary(data);
        } catch (error) {
            console.error('Error fetching balance summary:', error);
        }
    };



    const handleSubmit = async () => {
        try {
            setLoading(true);
            if (editingId) {
                await api.put(`/transactions/${editingId}`, formData);
            } else {
                await api.post('/transactions', formData);
            }
            handleClose();
            fetchTransactions();
            fetchBalanceSummary();
        } catch (error) {
            alert('Failed to save: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this transaction?')) return;
        try {
            await api.delete(`/transactions/${id}`);
            fetchTransactions();
            fetchBalanceSummary();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to delete');
        }
    };

    const startEdit = (txn) => {
        setEditingId(txn._id);
        setFormData({
            date: txn.date ? txn.date.split('T')[0] : '',
            bankAccount: txn.bankAccount?._id,
            transactionType: txn.transactionType,
            amount: txn.amount,
            remark: txn.remark
        });
        setOpenDialog(true);
    };

    const handleClose = () => {
        setOpenDialog(false);
        setEditingId(null);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            bankAccount: '',
            transactionType: 'Debit',
            amount: '',
            remark: ''
        });
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5">Transactions</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                >
                    Add Transaction
                </Button>
            </Box>

            {/* Balance Summary Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {balanceSummary.map((item) => (
                    <Grid item xs={12} sm={6} md={3} key={item._id}>
                        <Card>
                            <CardContent>
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography color="text.secondary" variant="body2">
                                            {item.bankName}
                                        </Typography>
                                        <Typography variant="h5" sx={{ mt: 1, color: item.balance >= 0 ? 'success.main' : 'error.main' }}>
                                            ₹{item.balance.toFixed(2)}
                                        </Typography>
                                    </Box>
                                    <AccountBalanceIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3 }} />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                            <TableCell>Date</TableCell>
                            <TableCell>Bank Account</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Remark</TableCell>
                            <TableCell>Source</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transactions.map((txn) => (
                            <TableRow key={txn._id}>
                                <TableCell>{new Date(txn.date).toLocaleDateString()}</TableCell>
                                <TableCell>{txn.bankAccount?.name}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={txn.transactionType}
                                        color={txn.transactionType === 'Credit' ? 'success' : 'error'}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                                <TableCell>{txn.remark}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={txn.source}
                                        size="small"
                                        color={txn.source === 'PAYONEER' ? 'primary' : 'default'}
                                        variant={txn.source === 'PAYONEER' ? 'filled' : 'outlined'}
                                    />
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                    {txn.amount?.toFixed(2)}
                                </TableCell>
                                <TableCell align="right">
                                    {txn.source === 'MANUAL' && (
                                        <>
                                            <IconButton size="small" onClick={() => startEdit(txn)} color="primary">
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => handleDelete(txn._id)} color="error">
                                                <DeleteIcon />
                                            </IconButton>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {transactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center">No transactions found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleClose}>
                <DialogTitle>{editingId ? 'Edit Transaction' : 'Add Manual Transaction'}</DialogTitle>
                <DialogContent sx={{ minWidth: 300 }}>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Date"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />

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

                        <Box>
                            <Typography variant="caption" color="text.secondary" mb={1} display="block">
                                Transaction Type
                            </Typography>
                            <ToggleButtonGroup
                                color="primary"
                                value={formData.transactionType}
                                exclusive
                                onChange={(e, newType) => {
                                    if (newType !== null) {
                                        setFormData({ ...formData, transactionType: newType });
                                    }
                                }}
                                fullWidth
                            >
                                <ToggleButton value="Credit" color="success">Credit</ToggleButton>
                                <ToggleButton value="Debit" color="error">Debit</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        <TextField
                            label="Amount"
                            type="number"
                            fullWidth
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />

                        <TextField
                            label="Remark"
                            fullWidth
                            multiline
                            rows={2}
                            value={formData.remark}
                            onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" disabled={loading}>
                        {loading ? 'Saving...' : 'Save'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default TransactionPage;
