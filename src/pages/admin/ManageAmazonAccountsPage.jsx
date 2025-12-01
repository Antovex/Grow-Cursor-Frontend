// pages/admin/ManageAmazonAccountsPage.jsx
import { useEffect, useState } from 'react';
import {
  Box, Button, Paper, Stack, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TextField, Typography, 
  IconButton, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../lib/api.js';

export default function ManageAmazonAccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const fetchAccounts = () => {
    api.get('/amazon-accounts').then(({ data }) => setAccounts(data)).catch(console.error);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const addAccount = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/amazon-accounts', { name });
      setName('');
      fetchAccounts();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add account');
    }
  };

  const deleteAccount = async (id) => {
    if(!window.confirm("Are you sure?")) return;
    try {
        await api.delete(`/amazon-accounts/${id}`);
        fetchAccounts();
    } catch (err) {
        alert("Failed to delete");
    }
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Manage Amazon Accounts</Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack direction="row" spacing={2} component="form" onSubmit={addAccount}>
          <TextField 
            label="Amazon Account Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            sx={{ minWidth: 300 }}
          />
          <Button type="submit" variant="contained">Add Account</Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ maxWidth: 600 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'primary.main' }}>
              <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Account Name</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 50 }}>Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.map((acc) => (
              <TableRow key={acc._id} hover>
                <TableCell>{acc.name}</TableCell>
                <TableCell>
                    <IconButton size="small" color="error" onClick={() => deleteAccount(acc._id)}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {accounts.length === 0 && (
                <TableRow>
                    <TableCell colSpan={2} align="center">No accounts found</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}