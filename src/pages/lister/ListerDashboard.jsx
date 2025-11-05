// src/pages/lister/ListerDashboard.jsx
import { useEffect, useState } from 'react';
import {
  AppBar, Box, Button, Card, CardActions, CardContent, Grid,
  Toolbar, Typography, Divider, TextField
} from '@mui/material';
import api from '../../lib/api.js';

export default function ListerDashboard({ user, onLogout }) {
  const [today, setToday] = useState([]);
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);

  // Per-assignment local draft values (string) and saving flags
  const [drafts, setDrafts] = useState({});   // { [assignmentId]: '12' }
  const [saving, setSaving] = useState({});   // { [assignmentId]: true/false }

  const initDraftsFrom = (arrays) => {
    const map = {};
    arrays.flat().forEach(a => {
      map[a._id] = String(a.completedQuantity ?? 0);
    });
    setDrafts(map);
  };

  const load = async () => {
    const { data } = await api.get('/assignments/mine/with-status');
    const t = data?.todaysTasks ?? [];
    const p = data?.pendingTasks ?? [];
    const c = data?.completedTasks ?? [];
    setToday(t);
    setPending(p);
    setCompleted(c);
    initDraftsFrom([t, p, c]);
  };

  useEffect(() => { load(); }, []);

  const commitQuantity = async (assignmentId, qty) => {
    setSaving(s => ({ ...s, [assignmentId]: true }));
    try {
      await api.post(`/assignments/${assignmentId}/complete`, { completedQuantity: qty });
      await load(); // refresh buckets and reset drafts to canonical values
    } finally {
      setSaving(s => ({ ...s, [assignmentId]: false }));
    }
  };

  const markFullyCompleted = (a) => commitQuantity(a._id, a.quantity);

  const onInputChange = (assignmentId, next) => {
    // store as raw string to preserve partial typing; no API call here
    setDrafts(d => ({ ...d, [assignmentId]: next }));
  };

  const onRevertDraft = (a) => {
    setDrafts(d => ({ ...d, [a._id]: String(a.completedQuantity ?? 0) }));
  };

  const renderCard = (a) => {
    const t = a.task || {};
    const draft = drafts[a._id] ?? String(a.completedQuantity ?? 0);

    const parsed = Number(draft);
    const isNumber = Number.isFinite(parsed);
    const clampedParsed = isNumber ? Math.max(0, Math.min(parsed, a.quantity)) : null;

    const savedVal = a.completedQuantity ?? 0;
    const isChanged = isNumber ? (parsed !== savedVal) : true; // non-number counts as changed
    const withinRange = isNumber && parsed >= 0 && parsed <= a.quantity;

    const isSaving = !!saving[a._id];
    const canSave = !isSaving && withinRange && isChanged;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && canSave) {
        e.preventDefault();
        commitQuantity(a._id, clampedParsed);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onRevertDraft(a);
      }
    };

    return (
      <Card key={a._id}>
        <CardContent>
          <Typography variant="subtitle1">{t.productTitle}</Typography>
          <Typography variant="body2" color="text.secondary">
            {new Date(a.createdAt).toLocaleDateString()}
          </Typography>
          <Typography variant="body2">Range: {t.range} | Category: {t.category}</Typography>
          <Typography variant="body2">Qty: {a.quantity} | Saved: {savedVal}</Typography>
          <Typography variant="body2">Listing: {a.listingPlatform?.name} / {a.store?.name}</Typography>
          {t.supplierLink ? (
            <Typography variant="body2">
              <a href={t.supplierLink} target="_blank" rel="noreferrer">Supplier Link</a>
            </Typography>
          ) : null}
        </CardContent>

        <CardActions>
          <TextField
            size="small"
            type="number"
            label="Completed Qty"
            inputProps={{ min: 0, max: a.quantity }}
            value={draft}
            onChange={(e) => onInputChange(a._id, e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            sx={{ width: 160, mr: 1 }}
            helperText={
              !withinRange ? `Enter 0 to ${a.quantity}` :
              isChanged ? 'Press Enter or Save' :
              'Up to date'
            }
          />
          <Button
            size="small"
            variant="contained"
            disabled={!canSave}
            onClick={() => commitQuantity(a._id, clampedParsed)}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
          <Button
            size="small"
            disabled={isSaving || (!isChanged && withinRange)}
            onClick={() => onRevertDraft(a)}
          >
            Revert
          </Button>
          <Button
            size="small"
            onClick={() => markFullyCompleted(a)}
            disabled={isSaving || savedVal === a.quantity}
          >
            Mark Fully Completed
          </Button>
        </CardActions>
      </Card>
    );
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>My Assignments</Typography>
          {user ? <Typography variant="body2" sx={{ mr: 2 }}>{user.username} (lister)</Typography> : null}
          <Button color="inherit" onClick={onLogout}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Today's Tasks</Typography>
        <Grid container spacing={2}>
          {today.map(a => (
            <Grid item xs={12} md={6} lg={4} key={a._id}>{renderCard(a)}</Grid>
          ))}
          {today.length === 0 && (
            <Grid item xs={12}><Typography variant="body2" color="text.secondary">No tasks assigned today.</Typography></Grid>
          )}
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Pending</Typography>
        <Grid container spacing={2}>
          {pending.map(a => (
            <Grid item xs={12} md={6} lg={4} key={a._id}>{renderCard(a)}</Grid>
          ))}
          {pending.length === 0 && (
            <Grid item xs={12}><Typography variant="body2" color="text.secondary">No pending assignments.</Typography></Grid>
          )}
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Box>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>Completed</Typography>
        <Grid container spacing={2}>
          {completed.map(a => (
            <Grid item xs={12} md={6} lg={4} key={a._id}>{renderCard(a)}</Grid>
          ))}
          {completed.length === 0 && (
            <Grid item xs={12}><Typography variant="body2" color="text.secondary">No completed assignments yet.</Typography></Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
}
