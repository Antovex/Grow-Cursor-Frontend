import React, { useEffect, useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Typography, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, TextField, Grid, Chip, Divider, FormControl, 
  InputLabel, Select, MenuItem, Snackbar, Alert, Pagination, OutlinedInput, Checkbox, ListItemText
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import api from '../../lib/api';

const groupFitmentData = (compatibilityList) => {
  if (!compatibilityList || compatibilityList.length === 0) return [];
  const groups = {};
  compatibilityList.forEach(item => {
    const year = item.nameValueList.find(x => x.name === 'Year')?.value;
    const make = item.nameValueList.find(x => x.name === 'Make')?.value;
    const model = item.nameValueList.find(x => x.name === 'Model')?.value;
    if (year && make && model) {
      const key = `${make} ${model}`;
      if (!groups[key]) groups[key] = new Set();
      groups[key].add(year);
    }
  });
  return Object.entries(groups).map(([key, yearSet]) => {
    const sortedYears = Array.from(yearSet).sort();
    return { title: key, years: sortedYears.join(', ') };
  });
};

const getVehicleString = (nameValueList) => {
  const year = nameValueList.find(x => x.name === 'Year')?.value || '';
  const make = nameValueList.find(x => x.name === 'Make')?.value || '';
  const model = nameValueList.find(x => x.name === 'Model')?.value || '';
  return `${year} ${make} ${model}`.trim();
};

const YEAR_OPTIONS = Array.from({ length: 47 }, (_, i) => (2026 - i).toString());

export default function CompatibilityDashboard() {
  const [sellers, setSellers] = useState([]);
  const [currentSellerId, setCurrentSellerId] = useState('');
  
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [openModal, setOpenModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editCompatList, setEditCompatList] = useState([]);
  
  // New Entry Inputs
  const [selectedYears, setSelectedYears] = useState([]); 
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const { data } = await api.get('/sellers/all');
        setSellers(data);
        if (data.length > 0) setCurrentSellerId(data[0]._id);
      } catch (adminError) {
        try {
            const { data } = await api.get('/sellers/me');
            setSellers([data]);
            setCurrentSellerId(data._id);
        } catch (e) { console.error(e); }
      }
    };
    initDashboard();
  }, []);

  useEffect(() => {
    if (currentSellerId) loadListings();
  }, [currentSellerId, page]);

  const loadListings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/ebay/listings', { 
        params: { sellerId: currentSellerId, page: page, limit: 100 } 
      }); 
      setListings(data.listings);
      setTotalPages(data.pagination.pages);
      setTotalItems(data.pagination.total);
    } catch (e) {
      showSnackbar('Failed to load listings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!currentSellerId) return;
    setSyncing(true);
    try {
      const { data } = await api.post('/ebay/sync-listings', { sellerId: currentSellerId });
      showSnackbar(data.message, 'success');
      setPage(1); 
      await loadListings();
    } catch (e) {
      showSnackbar('Sync Failed: ' + (e.response?.data?.error || e.message), 'error');
    } finally {
      setSyncing(false);
    }
  };

  // --- INSTANT OPEN HANDLER ---
  const handleEditClick = (item) => {
    // 1. Set the item directly from the table row (DB Data)
    setSelectedItem(item);
    
    // 2. Clone the compatibility list from the DB data
    // Use || [] to handle cases where it might be undefined
    setEditCompatList(JSON.parse(JSON.stringify(item.compatibility || [])));
    
    // 3. Open immediately
    setOpenModal(true);
  };

  const handleAddVehicle = () => {
    if(selectedYears.length === 0 || !newMake || !newModel) return;

    const newEntries = selectedYears.map(year => ({
      notes: newNotes,
      nameValueList: [
        { name: 'Year', value: year },
        { name: 'Make', value: newMake },
        { name: 'Model', value: newModel }
      ]
    }));
    
    setEditCompatList([...newEntries, ...editCompatList]);
    setSelectedYears([]); setNewMake(''); setNewModel(''); setNewNotes('');
  };

  const handleRemoveVehicle = (index) => {
    const updated = [...editCompatList];
    updated.splice(index, 1);
    setEditCompatList(updated);
  };

  const handleSaveCompatibility = async () => {
    if (!selectedItem || !currentSellerId) return;
    try {
      await api.post('/ebay/update-compatibility', {
        sellerId: currentSellerId,
        itemId: selectedItem.itemId,
        compatibilityList: editCompatList
      });
      
      setOpenModal(false);
      showSnackbar('Changes saved to eBay successfully!', 'success');
      
      // Reload local listings to fetch the update we just made to DB
      loadListings(); 
      
    } catch (e) {
      showSnackbar('Update failed: ' + (e.response?.data?.error || e.message), 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
            <Typography variant="h5">Compatibility Dashboard</Typography>
            <Typography variant="caption" color="textSecondary">
                Showing {listings.length} of {totalItems} Active Listings
            </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select Seller</InputLabel>
                <Select value={currentSellerId} label="Select Seller" onChange={(e) => setCurrentSellerId(e.target.value)}>
                    {sellers.map((s) => (
                        <MenuItem key={s._id} value={s._id}>{s.user?.username || s.user?.email || 'Unknown'}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Button variant="contained" startIcon={syncing ? <CircularProgress size={20} color="inherit"/> : <RefreshIcon />} onClick={handleSync} disabled={syncing || !currentSellerId}>
                {syncing ? 'Syncing...' : 'Poll eBay'}
            </Button>
        </Box>
      </Box>

      {loading ? <Box display="flex" justifyContent="center" mt={5}><CircularProgress /></Box> : (
        <>
        <TableContainer component={Paper}>
            <Table>
            <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                <TableCell width="80">Image</TableCell>
                <TableCell width="25%">Title & SKU</TableCell>
                <TableCell>Price</TableCell>
                <TableCell width="40%">Fitment Summary</TableCell>
                <TableCell>Action</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {listings.map((item) => {
                    const fitmentSummary = groupFitmentData(item.compatibility);
                    return (
                        <TableRow key={item.itemId}>
                            <TableCell>{item.mainImageUrl && <img src={item.mainImageUrl} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} />}</TableCell>
                            <TableCell>
                                <Typography variant="subtitle2" sx={{lineHeight: 1.2, mb: 0.5}}>{item.title}</Typography>
                                <Chip label={item.sku || 'No SKU'} size="small" variant="outlined" sx={{fontSize: '0.7rem'}}/>
                                <Typography variant="caption" display="block" color="textSecondary" mt={0.5}>ID: {item.itemId}</Typography>
                            </TableCell>
                            <TableCell>{item.currency} {item.currentPrice}</TableCell>
                            <TableCell>
                                {fitmentSummary.length > 0 ? (
                                    <Box sx={{ maxHeight: 100, overflowY: 'auto', border: '1px solid #eee', borderRadius: 1, p: 1, bgcolor: '#fafafa' }}>
                                        {fitmentSummary.map((grp, i) => (
                                            <Typography key={i} variant="caption" display="block" sx={{mb: 0.5}}>
                                                <b>{grp.title}</b>: {grp.years}
                                            </Typography>
                                        ))}
                                    </Box>
                                ) : (
                                    <Typography variant="caption" color="textSecondary">No compatibility data</Typography>
                                )}
                            </TableCell>
                            <TableCell>
                                <Button 
                                    variant="outlined" 
                                    size="small" 
                                    startIcon={<EditIcon />} 
                                    onClick={() => handleEditClick(item)} 
                                >
                                    Edit Compat
                                </Button>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
            </Table>
        </TableContainer>
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
            <Pagination count={totalPages} page={page} onChange={(e, v) => setPage(v)} color="primary" showFirstButton showLastButton />
        </Box>
        </>
      )}

      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="xl" fullWidth>
        <DialogTitle sx={{ borderBottom: '1px solid #eee' }}>Edit Compatibility: {selectedItem?.itemId}</DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', height: '75vh' }}>
          <Box sx={{ flex: 1, borderRight: '1px solid #eee', p: 2, overflowY: 'auto', bgcolor: '#fafafa' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Item Description Preview</Typography>
            {selectedItem?.descriptionPreview ? (
                <div style={{ padding: 15, backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: 4 }} dangerouslySetInnerHTML={{ __html: selectedItem.descriptionPreview }} />
            ) : <Typography variant="body2" color="textSecondary">No preview available.</Typography>}
          </Box>
          <Box sx={{ flex: 1, p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Add Compatible Vehicles</Typography>
            <Grid container spacing={1} alignItems="flex-start" sx={{ mb: 2 }}>
              <Grid item xs={3}><TextField label="Make" size="small" value={newMake} onChange={e => setNewMake(e.target.value)} fullWidth placeholder="e.g. Ford"/></Grid>
              <Grid item xs={3}><TextField label="Model" size="small" value={newModel} onChange={e => setNewModel(e.target.value)} fullWidth placeholder="e.g. F-150"/></Grid>
              <Grid item xs={3}>
                <FormControl size="small" fullWidth>
                    <InputLabel>Years</InputLabel>
                    <Select multiple value={selectedYears} onChange={(e) => setSelectedYears(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)} input={<OutlinedInput label="Years" />} renderValue={(selected) => selected.join(', ')} MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}>
                        {YEAR_OPTIONS.map((year) => (<MenuItem key={year} value={year}><Checkbox checked={selectedYears.indexOf(year) > -1} size="small" /><ListItemText primary={year} /></MenuItem>))}
                    </Select>
                </FormControl>
              </Grid>
              <Grid item xs={2}><TextField label="Notes" size="small" value={newNotes} onChange={e => setNewNotes(e.target.value)} fullWidth/></Grid>
              <Grid item xs={1}><Button variant="contained" onClick={handleAddVehicle} sx={{height: 40}}><AddIcon /></Button></Grid>
            </Grid>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow><TableCell>Vehicle</TableCell><TableCell>Notes</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
                <TableBody>
                  {editCompatList.map((compat, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell>{getVehicleString(compat.nameValueList)}</TableCell>
                      <TableCell>{compat.notes}</TableCell>
                      <TableCell><IconButton size="small" color="error" onClick={() => handleRemoveVehicle(idx)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                    </TableRow>
                  ))}
                  {editCompatList.length === 0 && <TableRow><TableCell colSpan={3} align="center">No vehicles added yet.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Cancel</Button>
          <Button onClick={handleSaveCompatibility} variant="contained" color="primary">Save Changes to eBay</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}