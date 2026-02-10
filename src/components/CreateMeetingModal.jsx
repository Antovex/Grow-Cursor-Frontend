import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Chip,
    Box,
    Typography,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    CircularProgress,
    IconButton,
    Tooltip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function CreateMeetingModal({ open, onClose, onSuccess, currentUserId }) {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);

    const [date, setDate] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState([]);
    const [slotLoading, setSlotLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        meetingLink: '',
        startTime: '',
        endTime: '',
    });

    // Load All Users for Attendee Selection
    useEffect(() => {
        if (open) {
            axios.get(`${API_URL}/users`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` } })
                .then(res => setUsers(res.data.filter(u => u._id !== currentUserId))) // Exclude self
                .catch(console.error);
        }
    }, [open, currentUserId]);

    // Check Availability when Date or SelectedUsers change
    useEffect(() => {
        if (date && selectedUsers.length > 0) {
            checkAvailability();
        } else {
            setAvailableSlots([]);
        }
    }, [date, selectedUsers]);

    // Auto-refresh availability every 10 seconds when modal is open with date and users selected
    useEffect(() => {
        if (!open || !date || selectedUsers.length === 0) return;

        const interval = setInterval(() => {
            checkAvailability();
        }, 10000); // Refresh every 10 seconds

        return () => clearInterval(interval);
    }, [open, date, selectedUsers]);

    const checkAvailability = async () => {
        try {
            setSlotLoading(true);
            const dateStr = format(date, 'yyyy-MM-dd');
            // Filter out any empty/undefined user IDs
            const validUserIds = [currentUserId, ...selectedUsers].filter(id => id);

            const res = await axios.get(`${API_URL}/meetings/availability`, {
                params: {
                    date: dateStr,
                    users: validUserIds.join(',')
                },
                headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` }
            });
            setAvailableSlots(res.data.slots);
        } catch (error) {
            console.error("Availability Check Failed", error);
        } finally {
            setSlotLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!formData.title || !formData.startTime || selectedUsers.length === 0) {
            alert("Please fill all required fields");
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...formData,
                date: date,
                attendees: selectedUsers
            };

            await axios.post(`${API_URL}/meetings/create`, payload, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` }
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error("Create Meeting Failed", error);
            alert("Failed to create meeting");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogContent dividers>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <Grid container spacing={3}>
                        {/* 1. Title & Desc */}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Meeting Title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                required
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Description (Optional)"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>

                        {/* 2. Select Date */}
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Meeting Date"
                                value={date}
                                onChange={(newValue) => setDate(newValue)}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                                disablePast
                            />
                        </Grid>

                        {/* 3. Select Attendees */}
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Attendees</InputLabel>
                                <Select
                                    multiple
                                    value={selectedUsers}
                                    onChange={(e) => setSelectedUsers(e.target.value)}
                                    label="Attendees"
                                    renderValue={(selected) => (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                            {selected.map((value) => {
                                                const u = users.find(user => user._id === value);
                                                return <Chip key={value} label={u?.username} size="small" />;
                                            })}
                                        </Box>
                                    )}
                                >
                                    {users.map((user) => (
                                        <MenuItem key={user._id} value={user._id}>
                                            {user.username} ({user.role})
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* 4. Availability Slots */}
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="subtitle2">
                                    Available Time Slots (1 Hour)
                                    {slotLoading && <CircularProgress size={12} sx={{ ml: 1 }} />}
                                </Typography>
                                {date && selectedUsers.length > 0 && (
                                    <Tooltip title="Refresh availability">
                                        <IconButton
                                            size="small"
                                            onClick={checkAvailability}
                                            disabled={slotLoading}
                                        >
                                            <RefreshIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>

                            {availableSlots.length === 0 ? (
                                <Typography variant="caption" color="error">
                                    {selectedUsers.length === 0 ? "Select attendees first." : "No slots available."}
                                </Typography>
                            ) : (
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                    {availableSlots.map((slot) => {
                                        const hour = slot.hour;
                                        const isBusy = slot.status === 'busy';
                                        const isSelected = formData.startTime === `${hour.toString().padStart(2, '0')}:00`;

                                        return (
                                            <Tooltip title={isBusy ? slot.reason : ''} key={hour}>
                                                <span>
                                                    <Chip
                                                        label={`${hour.toString().padStart(2, '0')}:00`}
                                                        clickable={!isBusy}
                                                        color={isSelected ? "primary" : "default"}
                                                        onClick={() => !isBusy && setFormData({ ...formData, startTime: `${hour.toString().padStart(2, '0')}:00` })}
                                                        disabled={isBusy}
                                                        variant={isSelected ? "filled" : "outlined"}
                                                        sx={{
                                                            opacity: isBusy ? 0.6 : 1,
                                                            bgcolor: isBusy ? '#f5f5f5' : undefined
                                                        }}
                                                    />
                                                </span>
                                            </Tooltip>
                                        );
                                    })}
                                </Box>
                            )}
                        </Grid>

                    </Grid>
                </LocalizationProvider>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleCreate} variant="contained" disabled={loading || !formData.startTime}>
                    Create Meeting
                </Button>
            </DialogActions>
        </Dialog>
    );
}
