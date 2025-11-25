import React, { useEffect, useState, useRef } from 'react';
import {
  Box, Paper, Typography, List, ListItem, ListItemText, ListItemAvatar,
  Avatar, TextField, Button, Divider, Badge, Stack, CircularProgress, 
  IconButton, Chip, Alert, FormControl, Select, MenuItem, InputLabel
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import CloseIcon from '@mui/icons-material/Close'; // <--- IMPORT ADDED
import api from '../../lib/api';

export default function BuyerChatPage() {
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [syncingInbox, setSyncingInbox] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [sellers, setSellers] = useState([]); 
  const [selectedSeller, setSelectedSeller] = useState('');
  
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  async function fetchSellers() {
    try {
      const { data } = await api.get('/sellers/all');
      setSellers(data || []);
    } catch (e) {
      console.error('Failed to load sellers');
    }
  }

  // 1. Initial Load
  useEffect(() => {
    fetchSellers(); // Fetch sellers on mount
    loadThreads();
  }, []);

  // Reload threads when filter changes
  useEffect(() => {
    loadThreads();
  }, [selectedSeller]);

  // 2. Scroll Effect
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 3. ACTIVE POLLING
  useEffect(() => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);

    if (selectedThread && !selectedThread.isNew) {
      pollingIntervalRef.current = setInterval(() => {
        pollActiveThread();
      }, 4000);
    }

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, [selectedThread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // API CALLS
  async function handleManualSync() {
    setSyncingInbox(true);
    try {
      const res = await api.post('/ebay/sync-inbox');
      if (res.data.success) {
        loadThreads(); 
      }
    } catch (e) {
      console.error("Inbox Sync failed", e);
    } finally {
      setSyncingInbox(false);
    }
  }

 async function pollActiveThread() {
    // SAFETY CHECK: Don't poll if we don't have the required IDs
    if (!selectedThread || !selectedThread.sellerId || !selectedThread.buyerUsername) {
        return; 
    }

    try {
      const res = await api.post('/ebay/sync-thread', {
        sellerId: selectedThread.sellerId,
        buyerUsername: selectedThread.buyerUsername,
        itemId: selectedThread.itemId
      });

      if (res.data.newMessagesFound) {
        loadMessages(selectedThread, false);
      }
    } catch (e) {
      // Use silent error logging to avoid spamming console if it's just a timeout
      if (e.response && e.response.status !== 400) {
          console.error("Thread Poll failed", e);
      }
    }
  }

  async function loadThreads() {
    try {
      const params = {};
      if (selectedSeller) params.sellerId = selectedSeller; // <--- Pass Filter
      
      const res = await api.get('/ebay/chat/threads', { params });
      setThreads(res.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleThreadSelect(thread) {
    setSelectedThread(thread);
    setSearchError('');
    if (!thread.isNew) {
      loadMessages(thread, true);
    } else {
      setMessages([]); 
    }
  }

  async function loadMessages(thread, showLoading = true) {
    if (showLoading) setLoadingMessages(true);
    try {
      const params = {};
      if (thread.orderId) params.orderId = thread.orderId;
      else {
        params.buyerUsername = thread.buyerUsername;
        params.itemId = thread.itemId;
      }

      const res = await api.get('/ebay/chat/messages', { params });
      setMessages(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const res = await api.post('/ebay/send-message', {
        orderId: selectedThread.orderId,
        itemId: selectedThread.itemId,
        buyerUsername: selectedThread.buyerUsername,
        body: newMessage
      });
      
      setMessages([...messages, res.data.message]);
      setNewMessage('');
      
      if (selectedThread.isNew) {
        loadThreads();
        const newThread = { ...selectedThread, isNew: false };
        setSelectedThread(newThread);
      }
    } catch (e) {
      alert('Failed to send: ' + (e.response?.data?.error || e.message));
    } finally {
      setSending(false);
    }
  }

  async function handleSearchOrder() {
    const trimmedQuery = searchQuery.trim(); // Get cleaned query
    if (!trimmedQuery) return;
    setSearchError('');

    // --- NEW CODE: Check existing threads first ---
    // Try to find a thread that matches the entered Order ID
    const existingThread = threads.find(
      (thread) => thread.orderId && thread.orderId.toString() === trimmedQuery
    );

    if (existingThread) {
      // If found locally, just select it and stop here.
      handleThreadSelect(existingThread);
      setSearchQuery(''); // Optional: clear search box
      return;
    }
    // ----------------------------------------------

    try {
      const res = await api.get('/ebay/chat/search-order', {
        params: { orderId: trimmedQuery } // Use the variable
      });
      handleThreadSelect(res.data); 
    } catch (e) {
      setSearchError('Order not found locally. Ensure order is synced.');
    }
  }

 return (
    <Box sx={{ display: 'flex', height: '85vh', gap: 2 }}>
      
      {/* LEFT: SIDEBAR */}
      <Paper sx={{ width: 340, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderBottom: 1, borderColor: 'divider' }}>
            
            {/* NEW: SELLER FILTER DROPDOWN */}
            <FormControl fullWidth size="small" sx={{ mb: 2, bgcolor: 'white' }}>
              <InputLabel>Filter by Seller</InputLabel>
              <Select
                value={selectedSeller}
                label="Filter by Seller"
                onChange={(e) => setSelectedSeller(e.target.value)}
              >
                <MenuItem value="">
                  <em>All Sellers</em>
                </MenuItem>
                {sellers.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.user?.username || s.user?.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Inbox</Typography>
                <Button 
                    size="small" 
                    startIcon={syncingInbox ? <CircularProgress size={16}/> : <RefreshIcon/>} 
                    onClick={handleManualSync}
                    disabled={syncingInbox}
                    variant="outlined"
                >
                    {syncingInbox ? 'Syncing...' : 'Check New'}
                </Button>
            </Stack>
            
            <Stack direction="row" spacing={1}>
                <TextField 
                    size="small" 
                    fullWidth 
                    placeholder="Order ID..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    error={!!searchError}
                />
                <Button variant="contained" size="small" onClick={handleSearchOrder}><SearchIcon/></Button>
            </Stack>
            {searchError && <Typography variant="caption" color="error">{searchError}</Typography>}
        </Box>

        {/* ... (Keep the List component exactly the same) ... */}
        <List sx={{ overflow: 'auto', flex: 1 }}>
           {/* ... existing list mapping code ... */}
           {threads.map((thread, index) => (
            <React.Fragment key={index}>
              <ListItem 
                button 
                selected={selectedThread && 
                  ((selectedThread.orderId && selectedThread.orderId === thread.orderId) || 
                   (!selectedThread.orderId && selectedThread.buyerUsername === thread.buyerUsername))}
                onClick={() => handleThreadSelect(thread)}
                alignItems="flex-start"
              >
                <ListItemAvatar>
                  <Badge color="error" badgeContent={thread.unreadCount}>
                    <Avatar sx={{ bgcolor: thread.messageType === 'ORDER' ? 'primary.main' : 'secondary.main' }}>
                       {thread.messageType === 'ORDER' ? <ShoppingBagIcon fontSize="small"/> : <QuestionAnswerIcon fontSize="small"/>}
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack direction="row" justifyContent="space-between">
                       <Typography variant="subtitle2" noWrap sx={{ maxWidth: 140, fontWeight: 'bold' }}>
                          {thread.buyerName || thread.buyerUsername || 'Unknown Buyer'}
                       </Typography>
                       <Typography variant="caption" color="text.secondary">
                          {new Date(thread.lastDate).toLocaleDateString()}
                       </Typography>
                    </Stack>
                  }
                  secondary={
                    <>
                       <Typography variant="caption" display="block" color="text.secondary" noWrap>
                         {thread.orderId ? `#${thread.orderId}` : 'Inquiry'} • {thread.itemTitle || thread.itemId}
                       </Typography>
                       <Typography variant="body2" noWrap sx={{ fontWeight: thread.unreadCount > 0 ? 'bold' : 'normal', color: 'text.primary' }}>
                         {thread.sender === 'SELLER' ? 'You: ' : ''}{thread.lastMessage}
                       </Typography>
                    </>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
      </Paper>

      {/* RIGHT: CHAT AREA (Keep exactly the same) */}
      <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* ... existing chat area code ... */}
        {selectedThread ? (
          <>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: '#fff' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                    <Typography variant="h6">
                        {selectedThread.buyerName || selectedThread.buyerUsername || 'Unknown Buyer'}
                        {selectedThread.isNew && <Chip label="New Conversation" size="small" color="success" sx={{ ml: 1 }} />}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {selectedThread.orderId && `Order #${selectedThread.orderId} | `}
                        Username: {selectedThread.buyerUsername}
                    </Typography>
                </Box>
                <IconButton onClick={() => setSelectedThread(null)}>
                   <CloseIcon />
                </IconButton>
              </Stack>
            </Box>

            <Box sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: '#f0f2f5' }}>
              {loadingMessages ? (
                  <Box display="flex" justifyContent="center" mt={4}><CircularProgress /></Box>
              ) : (
                <Stack spacing={2}>
                  {messages.length === 0 && selectedThread.isNew && (
                      <Alert severity="info">Start the conversation by typing a welcome message below!</Alert>
                  )}
                  
                  {messages.map((msg) => (
                    <Box 
                      key={msg._id} 
                      sx={{ 
                        alignSelf: msg.sender === 'SELLER' ? 'flex-end' : 'flex-start',
                        maxWidth: '70%'
                      }}
                    >
                      <Paper 
                        elevation={1}
                        sx={{ 
                          p: 1.5, 
                          bgcolor: msg.sender === 'SELLER' ? '#1976d2' : '#ffffff',
                          color: msg.sender === 'SELLER' ? '#fff' : 'text.primary',
                          borderRadius: 2,
                          position: 'relative'
                        }}
                      >
                         {/* TEXT */}
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{msg.body}</Typography>
                        
                         {/* IMAGES */}
                         {msg.mediaUrls && msg.mediaUrls.length > 0 && (
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              {msg.mediaUrls.map((url, idx) => (
                                <Box 
                                    key={idx}
                                    component="img"
                                    src={url}
                                    alt="Attachment"
                                    sx={{ 
                                        width: 100, 
                                        height: 100, 
                                        objectFit: 'cover', 
                                        borderRadius: 1,
                                        cursor: 'pointer',
                                        border: '1px solid #ccc'
                                    }}
                                    onClick={() => window.open(url, '_blank')}
                                />
                              ))}
                            </Box>
                          )}
                      </Paper>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: msg.sender === 'SELLER' ? 'right' : 'left' }}>
                        {new Date(msg.messageDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {msg.sender === 'SELLER' && (msg.read ? ' • Read' : ' • Sent')}
                      </Typography>
                    </Box>
                  ))}
                  <div ref={messagesEndRef} />
                </Stack>
              )}
            </Box>

            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', bgcolor: '#fff', display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                    if(e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                    }
                }}
                disabled={sending}
              />
              <Button 
                variant="contained" 
                sx={{ px: 3 }}
                endIcon={sending ? <CircularProgress size={20} color="inherit"/> : <SendIcon />}
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
              >
                Send
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: '#fafafa' }}>
            <Stack alignItems="center" spacing={1}>
                <QuestionAnswerIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.2 }} />
                <Typography color="text.secondary">Select a conversation or search an Order ID</Typography>
            </Stack>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
