import { useEffect, useState } from 'react';
import { AppBar, Toolbar, IconButton, Box, Paper, Typography, Grid, TextField, MenuItem, Button, Stack, Snackbar, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useLocation, useNavigate } from 'react-router-dom';
import { getMyProfile, updateMyProfile } from '../lib/api.js';

export default function AboutMePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phoneNumber: '',
    dateOfBirth: '',
    dateOfJoining: '',
    gender: '',
    address: '',
    email: '',
    bankAccountNumber: '',
    bankIFSC: '',
    bankName: '',
    aadharNumber: '',
    panNumber: ''
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyProfile();
        setForm({
          name: p?.name || '',
          phoneNumber: p?.phoneNumber || '',
          dateOfBirth: p?.dateOfBirth ? p.dateOfBirth.substring(0, 10) : '',
          dateOfJoining: p?.dateOfJoining ? p.dateOfJoining.substring(0, 10) : '',
          gender: p?.gender || '',
          address: p?.address || '',
          email: p?.email || '',
          bankAccountNumber: p?.bankAccountNumber || '',
          bankIFSC: p?.bankIFSC || '',
          bankName: p?.bankName || '',
          aadharNumber: p?.aadharNumber || '',
          panNumber: p?.panNumber || ''
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMyProfile({
        ...form,
        dateOfBirth: form.dateOfBirth || null,
        dateOfJoining: form.dateOfJoining || null
      });
      setSnackbar({ open: true, message: 'Profile saved successfully!', severity: 'success' });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Failed to save profile', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const isInAdminLayout = location.pathname.startsWith('/admin/');

  return (
    <Box maxWidth="900px" mx="auto">
      {!isInAdminLayout && (
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <IconButton edge="start" onClick={() => navigate(-1)} aria-label="back">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>About Me</Typography>
          </Toolbar>
        </AppBar>
      )}
      <Paper sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6">About Me</Typography>
          <Button onClick={onSubmit} variant="contained" disabled={saving}>Save</Button>
        </Stack>
        <Box component="form" onSubmit={onSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField label="Name" name="name" value={form.name} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Email" name="email" value={form.email} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Phone Number" name="phoneNumber" value={form.phoneNumber} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Date of Birth" name="dateOfBirth" type="date" value={form.dateOfBirth} onChange={onChange} fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Date of Joining" name="dateOfJoining" type="date" value={form.dateOfJoining} onChange={onChange} fullWidth InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Gender" name="gender" value={form.gender} onChange={onChange} fullWidth>
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
                <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField label="Address" name="address" value={form.address} onChange={onChange} fullWidth multiline minRows={2} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Bank Account Number" name="bankAccountNumber" value={form.bankAccountNumber} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Bank IFSC Code" name="bankIFSC" value={form.bankIFSC} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Bank Name" name="bankName" value={form.bankName} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="Aadhar Number" name="aadharNumber" value={form.aadharNumber} onChange={onChange} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label="PAN Number" name="panNumber" value={form.panNumber} onChange={onChange} fullWidth />
            </Grid>
          </Grid>
        </Box>
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(s => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
