
import { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Chip,
  Collapse,
  InputAdornment
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import { listEmployeeProfiles, updateEmployeeProfile, updateEmployeeAdminFields } from '../../lib/api.js';

export default function EmployeeDetailsPage() {
  const [rows, setRows] = useState([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editForm, setEditForm] = useState({ role: '', department: '', workingMode: '', workingHours: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({}); // { [profileId]: boolean }

  const loadProfiles = async () => {
    try {
      const list = await listEmployeeProfiles();
      setRows(list);
    } catch (e) {
      console.error('Failed to load employees', e);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const openEdit = (profile) => {
    setEditingProfile(profile);
    setEditForm({
      role: profile.user?.role || '',
      department: profile.user?.department || '',
      workingMode: profile.workingMode || '',
      workingHours: profile.workingHours || ''
    });
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingProfile(null);
  };

  const handleSave = async () => {
    if (!editingProfile) return;
    setSaving(true);
    try {
      // Update role and department
      await updateEmployeeProfile(editingProfile._id, {
        role: editForm.role,
        department: editForm.department
      });
      // Update admin fields
      await updateEmployeeAdminFields(editingProfile._id, {
        workingMode: editForm.workingMode,
        workingHours: editForm.workingHours
      });
      await loadProfiles();
      closeEdit();
    } catch (err) {
      console.error('Failed to update profile', err);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };


  // Flat filter/search logic
  const filteredRows = rows.filter((profile) => {
    const name = profile.name || '';
    const role = profile.user?.role || '';
    const dept = profile.user?.department || '';
    const q = search.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      role.toLowerCase().includes(q) ||
      dept.toLowerCase().includes(q)
    );
  });

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>Employee Details</Typography>
        <TextField
          placeholder="Search by name, role, department"
          value={search}
          onChange={e => setSearch(e.target.value)}
          fullWidth
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
        <Grid container spacing={2}>
          {filteredRows.map((r) => {
            const isExpanded = !!expanded[r._id];
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={r._id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Stack spacing={1} direction="row" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="h6" noWrap>{r.user?.username || 'Unknown'}</Typography>
                        <Chip label={r.user?.role || 'N/A'} size="small" color="primary" sx={{ width: 'fit-content', mt: 0.5 }} />
                        <Typography variant="body2" color="text.secondary">{r.user?.department || '-'}</Typography>
                      </Box>
                      <IconButton size="small" onClick={() => setExpanded(e => ({ ...e, [r._id]: !e[r._id] }))}>
                        <ExpandMoreIcon sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.2s' }} />
                      </IconButton>
                    </Stack>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Stack spacing={1} sx={{ mt: 2 }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Name:</Typography>
                          <Typography variant="body2">{r.name || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Email:</Typography>
                          <Typography variant="body2" noWrap>{r.user?.email || r.email || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Phone:</Typography>
                          <Typography variant="body2">{r.phoneNumber || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Gender:</Typography>
                          <Typography variant="body2">{r.gender || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Address:</Typography>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{r.address || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Date of Birth:</Typography>
                          <Typography variant="body2">{r.dateOfBirth ? new Date(r.dateOfBirth).toLocaleDateString() : '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Date of Joining:</Typography>
                          <Typography variant="body2">{r.dateOfJoining ? new Date(r.dateOfJoining).toLocaleDateString() : '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Bank Name:</Typography>
                          <Typography variant="body2">{r.bankName || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Bank Account Number:</Typography>
                          <Typography variant="body2">{r.bankAccountNumber || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Bank IFSC:</Typography>
                          <Typography variant="body2">{r.bankIFSC || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Aadhar Number:</Typography>
                          <Typography variant="body2">{r.aadharNumber || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">PAN Number:</Typography>
                          <Typography variant="body2">{r.panNumber || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Working Mode:</Typography>
                          <Typography variant="body2">{r.workingMode || '-'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Working Hours:</Typography>
                          <Typography variant="body2">{r.workingHours || '-'}</Typography>
                        </Box>
                      </Stack>
                    </Collapse>
                  </CardContent>
                  <CardActions>
                    <IconButton size="small" onClick={() => openEdit(r)} color="primary">
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
          {filteredRows.length === 0 && (
            <Grid item xs={12}><Typography color="text.secondary">No employees found.</Typography></Grid>
          )}
        </Grid>
      </Paper>

      <Dialog open={editOpen} onClose={closeEdit} maxWidth="md" fullWidth>
        <DialogTitle>Edit Employee - {editingProfile?.user?.username}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Role"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                fullWidth
              >
                <MenuItem value="productadmin">Product Research Admin</MenuItem>
                <MenuItem value="listingadmin">Listing Admin</MenuItem>
                <MenuItem value="compatibilityadmin">Compatibility Admin</MenuItem>
                <MenuItem value="compatibilityeditor">Compatibility Editor</MenuItem>
                <MenuItem value="fulfillmentadmin">Fulfillment Admin</MenuItem>
                <MenuItem value="hradmin">HR Admin</MenuItem>
                <MenuItem value="hr">HR</MenuItem>
                <MenuItem value="operationhead">Operation Head</MenuItem>
                <MenuItem value="lister">Lister</MenuItem>
                <MenuItem value="advancelister">Advance Lister</MenuItem>
                <MenuItem value="trainee">Trainee</MenuItem>
                <MenuItem value="seller">Seller</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Department"
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                fullWidth
              >
                <MenuItem value="">Select Department</MenuItem>
                <MenuItem value="Product Research">Product Research Department</MenuItem>
                <MenuItem value="Listing">Listing Department</MenuItem>
                <MenuItem value="Compatibility">Compatibility Department</MenuItem>
                <MenuItem value="HR">HR Department</MenuItem>
                <MenuItem value="Operations">Operations Department</MenuItem>
                <MenuItem value="Executives">Executives Department</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Working Mode"
                value={editForm.workingMode}
                onChange={(e) => setEditForm({ ...editForm, workingMode: e.target.value })}
                fullWidth
              >
                <MenuItem value="">Select</MenuItem>
                <MenuItem value="remote">Remote</MenuItem>
                <MenuItem value="office">Office</MenuItem>
                <MenuItem value="hybrid">Hybrid</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Working Hours"
                value={editForm.workingHours}
                onChange={(e) => setEditForm({ ...editForm, workingHours: e.target.value })}
                fullWidth
                placeholder="e.g., 9 AM - 6 PM"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                Additional employee details (name, DOB, bank details, etc.) can be edited by the employee in their About Me page.
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEdit}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
