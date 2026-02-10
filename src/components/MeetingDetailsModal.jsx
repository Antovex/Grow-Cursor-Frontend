import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Grid,
    Chip,
    Box,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Checkbox,
    Stack,
    Divider
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parse } from 'date-fns';
import axios from 'axios';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GroupsIcon from '@mui/icons-material/Groups';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import LinkIcon from '@mui/icons-material/Link';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function MeetingDetailsModal({ open, onClose, meeting, refreshMeetings, currentUserId }) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        agenda: '',
        details: '',
        conclusion: ''
    });

    // Edit Mode State
    const [isEditMode, setIsEditMode] = useState(false);
    const [editFormData, setEditFormData] = useState({
        title: '',
        description: '',
        meetingLink: '',
        date: new Date(),
        startTime: '10:00'
    });

    const [canJoin, setCanJoin] = useState(false);

    // For Creator Attendance
    const [attendance, setAttendance] = useState([]); // Array of { user: id, present: bool }

    useEffect(() => {
        if (meeting) {
            setFormData({
                agenda: meeting.agenda || '',
                details: meeting.details || '',
                conclusion: meeting.conclusion || ''
            });

            // Initialize edit form data
            setEditFormData({
                title: meeting.title || '',
                description: meeting.description || '',
                meetingLink: meeting.meetingLink || '',
                date: new Date(meeting.date),
                startTime: meeting.startTime || '10:00'
            });

            // Initialize attendance
            // If already marked, load it. If not, default to all false
            if (meeting.attendance && meeting.attendance.length > 0) {
                setAttendance(meeting.attendance);
            } else {
                // Init from attendees + creator
                const allParticipants = [...meeting.attendees.map(a => a.user), meeting.creator];
                // Ensure unique
                const uniqueParticipants = Array.from(new Set(allParticipants.map(u => u._id)))
                    .map(id => {
                        const existing = meeting.attendees.find(a => a.user._id === id);
                        if (existing) return existing.user;
                        return meeting.creator;
                    });

                setAttendance(uniqueParticipants.map(u => ({
                    user: u._id,
                    username: u.username,
                    present: false
                })));
            }
        }
    }, [meeting]);

    // Check if within join window (10 mins before start until end)
    useEffect(() => {
        if (!meeting) return;

        const checkJoinable = () => {
            const now = new Date();
            const [sh, sm] = meeting.startTime.split(':').map(Number);
            const [eh, em] = meeting.endTime.split(':').map(Number);

            const startDate = new Date(meeting.date);
            startDate.setHours(sh, sm, 0, 0);

            const endDate = new Date(meeting.date);
            endDate.setHours(eh, em, 0, 0);

            // Allow joining 10 mins before start
            const joinWindowStart = new Date(startDate.getTime() - 10 * 60000);

            if (now >= joinWindowStart && now <= endDate) {
                setCanJoin(true);
            } else {
                setCanJoin(false);
            }
        };

        checkJoinable();
        const interval = setInterval(checkJoinable, 10000); // Check every 10s
        return () => clearInterval(interval);
    }, [meeting]);

    const handleSaveDetails = async () => {
        try {
            setLoading(true);
            await axios.put(`${API_URL}/meetings/${meeting._id}`, formData, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` }
            });
            refreshMeetings();
            onClose(); // Optional: keep open?
        } catch (error) {
            console.error("Failed to update meeting details", error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAttendance = async () => {
        try {
            setLoading(true);
            // Map back to schema format { user, present }
            const payload = attendance.map(a => ({
                user: a.user,
                present: a.present
            }));

            await axios.put(`${API_URL}/meetings/${meeting._id}/attendance`, { attendance: payload }, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` }
            });
            refreshMeetings();
            onClose();
        } catch (error) {
            console.error("Failed to mark attendance", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = (userId) => {
        setAttendance(prev => prev.map(a =>
            a.user === userId ? { ...a, present: !a.present } : a
        ));
    };

    // RSVP Logic (For Invitees)
    const [rejectionReason, setRejectionReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);

    // Robust ID matching
    const getCurrentUserId = () => {
        if (!currentUserId) return null;
        if (typeof currentUserId === 'string') return currentUserId;
        return currentUserId._id || currentUserId.id || currentUserId.userId;
    };

    const myAttendeeRecord = meeting?.attendees.find(a => {
        const attendeeId = a.user._id || a.user.id || a.user; // Handle populated object or direct ID
        const myId = getCurrentUserId();

        return attendeeId?.toString() === myId?.toString();
    });

    const myStatus = myAttendeeRecord?.status || 'pending'; // pending, accepted, rejected

    const handleRespond = async (status) => {
        try {
            setLoading(true);
            const payload = { status };
            if (status === 'rejected') {
                payload.rejectionReason = rejectionReason;
            }

            await axios.put(`${API_URL}/meetings/${meeting._id}/respond`, payload, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` }
            });
            refreshMeetings();
            // alert("Status updated successfully!");
        } catch (error) {
            console.error("Failed to respond to meeting", error);
            alert("Failed to update status");
        } finally {
            setLoading(false);
        }
    };


    const markAllAttendance = (status) => {
        setAttendance(prev => prev.map(a => ({ ...a, present: status })));
    };

    // Handle Cancel Meeting
    const handleCancelMeeting = async () => {
        if (!window.confirm('Are you sure you want to cancel this meeting? This will free up all attendees\' time slots.')) {
            return;
        }

        try {
            setLoading(true);
            await axios.delete(`${API_URL}/meetings/${meeting._id}`, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` }
            });

            refreshMeetings();
            onClose();
        } catch (error) {
            console.error("Failed to cancel meeting", error);
            alert("Failed to cancel meeting: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    // Handle Edit Meeting
    const handleEditMeeting = async () => {
        try {
            setLoading(true);
            const payload = {
                title: editFormData.title,
                description: editFormData.description,
                date: format(editFormData.date, 'yyyy-MM-dd'),
                startTime: editFormData.startTime
            };

            await axios.put(`${API_URL}/meetings/${meeting._id}/edit`, payload, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` }
            });

            setIsEditMode(false);
            refreshMeetings();
        } catch (error) {
            console.error("Failed to edit meeting", error);
            alert("Failed to update meeting: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    if (!meeting) return null;

    const isCreator = meeting?.creator._id === currentUserId || meeting?.creator.id === currentUserId;
    const isPast = meeting && new Date(meeting.date) < new Date();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                    {isEditMode ? (
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <Stack spacing={2}>
                                <TextField
                                    label="Meeting Title"
                                    value={editFormData.title}
                                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                    fullWidth
                                    size="small"
                                />
                                <Stack direction="row" spacing={2}>
                                    <DatePicker
                                        label="Date"
                                        value={editFormData.date}
                                        onChange={(newValue) => setEditFormData({ ...editFormData, date: newValue })}
                                        slotProps={{ textField: { size: 'small' } }}
                                    />
                                    <TimePicker
                                        label="Start Time"
                                        value={parse(editFormData.startTime, 'HH:mm', new Date())}
                                        onChange={(newValue) => {
                                            if (newValue) {
                                                setEditFormData({ ...editFormData, startTime: format(newValue, 'HH:mm') });
                                            }
                                        }}
                                        ampm={false}
                                        minutesStep={30}
                                        slotProps={{ textField: { size: 'small' } }}
                                    />
                                </Stack>
                                <TextField
                                    label="Meeting Link (Optional)"
                                    value={editFormData.meetingLink}
                                    onChange={(e) => setEditFormData({ ...editFormData, meetingLink: e.target.value })}
                                    fullWidth
                                    size="small"
                                    placeholder="https://meet.google.com/..."
                                    InputProps={{
                                        startAdornment: <LinkIcon color="action" sx={{ mr: 1 }} />
                                    }}
                                />
                            </Stack>
                        </LocalizationProvider>
                    ) : (
                        <>
                            <Typography variant="h6">{meeting.title}</Typography>
                            <Typography variant="caption" color="text.secondary">
                                {format(new Date(meeting.date), 'MMMM d, yyyy')} • {meeting.startTime} - {meeting.endTime}
                            </Typography>
                            {meeting.meetingLink && (
                                <Box sx={{ mt: 1 }}>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        startIcon={<VideoCallIcon />}
                                        onClick={() => window.open(meeting.meetingLink, '_blank')}
                                        disabled={!canJoin}
                                        title={!canJoin ? "Join button activates 10 mins before start" : "Join Meeting"}
                                    >
                                        Join Now
                                    </Button>
                                    {!canJoin && (
                                        <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                                            Activates 10 mins before start
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </>
                    )}
                </Box>
                {isCreator && !isPast && !isEditMode && (
                    <Button startIcon={<EditIcon />} onClick={() => setIsEditMode(true)} size="small">
                        Edit Meeting
                    </Button>
                )}
                {isEditMode && (
                    <Stack direction="row" spacing={1}>
                        <Button onClick={() => setIsEditMode(false)} size="small">Cancel</Button>
                        <Button variant="contained" onClick={handleEditMeeting} disabled={loading} size="small">
                            Save
                        </Button>
                    </Stack>
                )}
                <Chip
                    label={meeting.status.toUpperCase()}
                    color={meeting.status === 'confirmed' ? 'success' : meeting.status === 'unconfirmed' ? 'warning' : 'default'}
                    size="small"
                />
            </DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={3}>
                    {/* LEFT COLUMN: Info */}
                    <Grid item xs={12} md={7}>
                        <Typography variant="subtitle2" gutterBottom>Description</Typography>
                        {isEditMode ? (
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                value={editFormData.description}
                                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                placeholder="Meeting description..."
                                variant="outlined"
                                size="small"
                            />
                        ) : (
                            <Typography variant="body2" paragraph>{meeting.description || 'No description provided.'}</Typography>
                        )}

                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Agenda</Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            value={formData.agenda}
                            onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
                            placeholder="Meeting agenda items..."
                            variant="outlined"
                            size="small"
                            // Anybody can edit agenda? Requirement: "everybody who was part of it can edit"
                            disabled={false}
                        />

                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Details / Minutes</Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            value={formData.details}
                            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                            placeholder="Meeting minutes and notes..."
                            variant="outlined"
                            size="small"
                        />

                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>Conclusion / Action Items</Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            value={formData.conclusion}
                            onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
                            placeholder="Outcomes..."
                            variant="outlined"
                            size="small"
                        />

                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button variant="contained" onClick={handleSaveDetails} disabled={loading} size="small">
                                Save Notes
                            </Button>
                        </Box>
                    </Grid>

                    {/* RIGHT COLUMN: Attendees & Attendance */}
                    <Grid item xs={12} md={5}>
                        <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center">
                            <GroupsIcon fontSize="small" sx={{ mr: 1 }} /> Attendees
                        </Typography>
                        <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
                            {/* Creator */}
                            <ListItem>
                                <ListItemText
                                    primary={meeting.creator.username}
                                    secondary="Organizer"
                                    primaryTypographyProps={{ fontWeight: 'bold' }}
                                />
                                <Chip label="Creator" size="small" color="primary" variant="outlined" />
                            </ListItem>
                            <Divider />
                            {/* Invitees */}
                            {meeting.attendees.map((att, index) => (
                                <ListItem key={index}>
                                    <ListItemText
                                        primary={att.user.username}
                                        secondary={att.status === 'rejected' ? `Rejected: ${att.rejectionReason}` : ''}
                                    />
                                    {att.status === 'accepted' && <CheckCircleIcon color="success" fontSize="small" />}
                                    {att.status === 'rejected' && <CancelIcon color="error" fontSize="small" />}
                                    {att.status === 'pending' && <AccessTimeIcon color="action" fontSize="small" />}
                                </ListItem>
                            ))}
                        </List>

                        {/* Attendance Marking Section - Only Creator */}
                        {isCreator && (
                            <Box sx={{ mt: 3, p: 2, border: '1px dashed grey', borderRadius: 1 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography variant="subtitle2">Mark Attendance</Typography>
                                    <Button size="small" onClick={() => markAllAttendance(true)}>Mark All</Button>
                                </Box>
                                {attendance.map((att) => {
                                    // Find the username from the meeting object if not embedded
                                    const uName = att.username ||
                                        (att.user === meeting.creator._id ? meeting.creator.username :
                                            meeting.attendees.find(a => a.user._id === att.user)?.user.username);

                                    return (
                                        <Box key={att.user} display="flex" alignItems="center" justifyContent="space-between" sx={{ py: 0.5 }}>
                                            <Typography variant="body2">{uName}</Typography>
                                            <Checkbox
                                                checked={att.present}
                                                onChange={() => toggleAttendance(att.user)}
                                                size="small"
                                            />
                                        </Box>
                                    )
                                })}
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    color="success"
                                    size="small"
                                    sx={{ mt: 1 }}
                                    onClick={handleMarkAttendance}
                                    disabled={loading}
                                >
                                    Save Attendance
                                </Button>
                            </Box>
                        )}
                    </Grid>

                    {/* RSVP Section - Only for Attendee (Non-Creator) */}
                    {!isCreator && !isPast && (
                        <Grid item xs={12}>
                            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1, border: '1px solid #eee' }}>
                                <Typography variant="subtitle2" gutterBottom>Your Response</Typography>
                                <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                                    current status: <b>{myStatus.toUpperCase()}</b>
                                </Typography>

                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Button
                                        variant={myStatus === 'accepted' ? "contained" : "outlined"}
                                        color="success"
                                        size="small"
                                        onClick={() => handleRespond('accepted')}
                                        startIcon={<CheckCircleIcon />}
                                        disabled={loading}
                                    >
                                        Accept
                                    </Button>

                                    <Button
                                        variant={myStatus === 'rejected' ? "contained" : "outlined"}
                                        color="error"
                                        size="small"
                                        onClick={() => setShowRejectInput(true)}
                                        startIcon={<CancelIcon />}
                                        disabled={loading}
                                    >
                                        Reject
                                    </Button>
                                </Stack>

                                {showRejectInput && (
                                    <Box mt={2}>
                                        <TextField
                                            label="Reason for rejection (Optional)"
                                            fullWidth
                                            size="small"
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            sx={{ mb: 1 }}
                                        />
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            <Button size="small" onClick={() => setShowRejectInput(false)}>Cancel</Button>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                size="small"
                                                onClick={() => handleRespond('rejected')}
                                                disabled={loading}
                                            >
                                                Confirm Reject
                                            </Button>
                                        </Stack>
                                    </Box>
                                )}
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                {isCreator && meeting.status !== 'cancelled' && (
                    <Button
                        onClick={handleCancelMeeting}
                        color="error"
                        startIcon={<DeleteIcon />}
                        disabled={loading}
                    >
                        Cancel Meeting
                    </Button>
                )}
                <Box sx={{ flex: 1 }} />
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}
