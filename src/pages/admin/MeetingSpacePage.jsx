import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Typography,
    Tabs,
    Tab,
    Button,
    Grid,
    Card,
    CardContent,
    CardActions,
    Chip,
    IconButton,
    Tooltip,
    List,
    ListItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { format, isPast, isToday } from 'date-fns';
import axios from 'axios';

import CreateMeetingModal from '../../components/CreateMeetingModal';
import MeetingDetailsModal from '../../components/MeetingDetailsModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function MeetingSpacePage() {
    const [tabValue, setTabValue] = useState(0);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModalOpen, setCreateModalOpen] = useState(false);

    // Selected Meeting for Details
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);

    // Current User
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        // Get current user from storage or context (Assuming App passes it, but for now fetch or parse token)
        // Actually best relies on /auth/me or just parse the stored user object
        const u = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(u);
        fetchMeetings();
    }, []);

    // Keep selectedMeeting in sync with meetings list
    useEffect(() => {
        if (selectedMeeting) {
            const updated = meetings.find(m => m._id === selectedMeeting._id);
            if (updated) {
                setSelectedMeeting(updated);
            }
        }
    }, [meetings]);

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/meetings/my-meetings`, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` }
            });
            setMeetings(res.data);
        } catch (error) {
            console.error("Failed to fetch meetings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleOpenCreate = () => setCreateModalOpen(true);
    const handleCloseCreate = () => setCreateModalOpen(false);

    const handleOpenDetails = (meeting) => {
        setSelectedMeeting(meeting);
        setDetailsModalOpen(true);
    };
    const handleCloseDetails = () => {
        setDetailsModalOpen(false);
        setSelectedMeeting(null);
    };

    // Filter Logic
    // Tab 0: Upcoming Confirmed
    // Tab 1: Pending (Requests for Me OR Requests I sent that are unconfirmed)
    // Tab 2: Past

    const now = new Date();

    const upcomingMeetings = meetings.filter(m => {
        const mDate = new Date(m.date);
        // Future meetings that are CONFIRMED
        return mDate >= now && m.status === 'confirmed';
    });

    const pendingMeetings = meetings.filter(m => {
        const mDate = new Date(m.date);
        // Future meetings that are UNCONFIRMED
        // Either I need to respond, or I am waiting for others
        return mDate >= now && m.status === 'unconfirmed';
    });

    const pastMeetings = meetings.filter(m => {
        const mDate = new Date(m.date);
        return mDate < now || m.status === 'completed';
    });

    const handleRespond = async (meetingId, status, reason) => {
        try {
            await axios.put(`${API_URL}/meetings/${meetingId}/respond`,
                { status, rejectionReason: reason },
                { headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token')}` } }
            );
            fetchMeetings();
        } catch (err) {
            console.error(err);
            alert("Failed to respond");
        }
    };

    // Render Component for Meeting Card
    const MeetingCard = ({ meeting }) => {
        const isCreator = meeting.creator._id === currentUser?._id;
        const myResponse = meeting.attendees.find(a => a.user._id === currentUser?._id);
        const isPendingMe = !isCreator && myResponse?.status === 'pending';

        return (
            <Card sx={{ mb: 2, borderLeft: `4px solid ${meeting.status === 'confirmed' ? 'green' : 'orange'}` }}>
                <CardContent>
                    <Box display="flex" justifyContent="space-between">
                        <Typography variant="h6">{meeting.title}</Typography>
                        <Chip
                            label={meeting.status}
                            color={meeting.status === 'confirmed' ? "success" : "warning"}
                            size="small"
                            variant="outlined"
                        />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        {format(new Date(meeting.date), 'EEEE, MMMM d')} • {meeting.startTime} - {meeting.endTime}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                        Creator: <b>{isCreator ? "You" : meeting.creator.username}</b>
                    </Typography>

                    {/* Pending Actions */}
                    {isPendingMe && (
                        <Box sx={{ mt: 2, p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                            <Typography variant="caption" display="block" color="error">Action Required:</Typography>
                            <Button
                                size="small"
                                startIcon={<CheckCircleIcon />}
                                color="success"
                                onClick={(e) => { e.stopPropagation(); handleRespond(meeting._id, 'accepted'); }}
                            >
                                Accept
                            </Button>
                            <Button
                                size="small"
                                startIcon={<CancelIcon />}
                                color="error"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const reason = prompt("Enter rejection reason:");
                                    if (reason) handleRespond(meeting._id, 'rejected', reason);
                                }}
                            >
                                Reject
                            </Button>
                        </Box>
                    )}
                </CardContent>
                <CardActions>
                    <Button size="small" onClick={() => handleOpenDetails(meeting)}>View Details / Agenda</Button>
                </CardActions>
            </Card>
        );
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Meeting Space
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpenCreate}
                >
                    Schedule Meeting
                </Button>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange}>
                    <Tab label={`Upcoming (${upcomingMeetings.length})`} />
                    <Tab label={`Pending / Requests (${pendingMeetings.length})`} />
                    <Tab label="Past Meetings" />
                </Tabs>
            </Box>

            <Box sx={{ mt: 3 }}>
                {loading ? (
                    <Typography>Loading meetings...</Typography>
                ) : (
                    <>
                        {tabValue === 0 && (
                            upcomingMeetings.length === 0 ? <Typography color="text.secondary">No upcoming confirmed meetings.</Typography> :
                                upcomingMeetings.map(m => <MeetingCard key={m._id} meeting={m} />)
                        )}
                        {tabValue === 1 && (
                            pendingMeetings.length === 0 ? <Typography color="text.secondary">No pending requests.</Typography> :
                                pendingMeetings.map(m => <MeetingCard key={m._id} meeting={m} />)
                        )}
                        {tabValue === 2 && (
                            pastMeetings.length === 0 ? <Typography color="text.secondary">No past meetings.</Typography> :
                                pastMeetings.map(m => <MeetingCard key={m._id} meeting={m} />)
                        )}
                    </>
                )}
            </Box>

            <CreateMeetingModal
                open={createModalOpen}
                onClose={handleCloseCreate}
                onSuccess={fetchMeetings}
                currentUserId={currentUser?.id}
            />

            {selectedMeeting && (
                <MeetingDetailsModal
                    open={detailsModalOpen}
                    onClose={handleCloseDetails}
                    meeting={selectedMeeting}
                    refreshMeetings={fetchMeetings}
                    currentUserId={currentUser?.id}
                />
            )}

        </Container>
    );
}
