// src/pages/admin/AddListerPage.jsx
import { useMemo, useState } from 'react';
import {
  Box, Button, Paper, Stack, TextField, Typography,
  FormControl, InputLabel, Select, MenuItem, Snackbar, Alert
} from '@mui/material';
import api from '../../lib/api.js';

export default function AddListerPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('lister');

  const [errors, setErrors] = useState({ email: '', username: '' });
  const [msg, setMsg] = useState('');
  const [showCreds, setShowCreds] = useState(false);
  const [creds, setCreds] = useState({ email: '', username: '', password: '', role: 'lister' });
  const [submitting, setSubmitting] = useState(false);

  const currentUser = useMemo(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }, []);
  const isSuper = currentUser?.role === 'superadmin';
  const isListingAdmin = currentUser?.role === 'listingadmin';

  const clearFieldError = (field) =>
    setErrors(prev => ({ ...prev, [field]: '' }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setMsg('');
    setErrors({ email: '', username: '' });
    setSubmitting(true);

    try {
      const newRole = isSuper ? role : 'lister';
      const res = await api.post('/users', {
        email, username, password, newUserRole: newRole
      });

      const roleNames = { productadmin: 'Product Admin', listingadmin: 'Listing Admin', lister: 'Lister' };
      setMsg(`${roleNames[newRole]} created`);

      // store credentials for superadmin convenience
      if (res.data.credentials) {
        const saved = localStorage.getItem('userCredentials');
        const list = saved ? JSON.parse(saved) : [];
        list.push(res.data.credentials);
        localStorage.setItem('userCredentials', JSON.stringify(list));
      }

      setCreds({ email, username, password, role: newRole });
      setShowCreds(true);

      // reset form
      setEmail('');
      setUsername('');
      setPassword('');
      setRole('lister');
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.response?.data?.error || 'Failed to create user';

      if (status === 409) {
        // Backend sends "Email already in use" or "Username already in use"
        if (/email/i.test(message)) {
          setErrors(prev => ({ ...prev, email: message }));
        } else if (/username/i.test(message)) {
          setErrors(prev => ({ ...prev, username: message }));
        } else {
          setMsg(message);
        }
      } else {
        setMsg(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 520 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Add User</Typography>
      <Stack spacing={2} component="form" onSubmit={handleCreate}>
        <TextField
          label="Email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
          required
          error={!!errors.email}
          helperText={errors.email || ' '}
          disabled={submitting}
        />
        <TextField
          label="Username"
          value={username}
          onChange={(e) => { setUsername(e.target.value); clearFieldError('username'); }}
          required
          error={!!errors.username}
          helperText={errors.username || ' '}
          disabled={submitting}
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={submitting}
        />
        {isSuper ? (
          <FormControl disabled={submitting}>
            <InputLabel>Role</InputLabel>
            <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
              <MenuItem value="productadmin">Product Research Admin</MenuItem>
              <MenuItem value="listingadmin">Listing Admin</MenuItem>
              <MenuItem value="lister">Lister</MenuItem>
            </Select>
          </FormControl>
        ) : isListingAdmin ? (
          <Typography variant="body2" color="text.secondary">Creating Lister</Typography>
        ) : null}
        <Box>
          <Button type="submit" variant="contained" disabled={submitting}>Create</Button>
        </Box>
        {msg ? <Typography color={/created/i.test(msg) ? 'success.main' : 'error'}>{msg}</Typography> : null}
      </Stack>

      <Snackbar
        open={showCreds}
        autoHideDuration={10000}
        onClose={() => setShowCreds(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowCreds(false)} severity="info" sx={{ width: '100%' }}>
          Share these credentials securely:
          <br />Email: {creds.email}
          <br />Username: {creds.username}
          <br />Password: {creds.password}
          <br />Role: {creds.role}
        </Alert>
      </Snackbar>
    </Paper>
  );
}
