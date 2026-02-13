import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Alert,
    CircularProgress,
    Stack,
    FormHelperText
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import api from '../../lib/api';

// Common Feed Types
const FEED_TYPES = [
    { value: 'FX_LISTING', label: 'File Exchange Listing (CSV)' }
];

const FeedUploadPage = () => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [feedType, setFeedType] = useState('FX_LISTING');
    const [schemaVersion, setSchemaVersion] = useState('1.0');
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [sellers, setSellers] = useState([]);
    const [selectedSeller, setSelectedSeller] = useState('');

    // Fetch Sellers on mount
    useEffect(() => {
        const fetchSellers = async () => {
            try {
                // Assuming there is an endpoint to get sellers, or we can use the existing layout context if available.
                // For now, I'll try to fetch from /api/sellers if it exists, otherwise I might need to rely on the user to select.
                // Let's assume a standard endpoint exists or we can mock it/ask user.
                // Inspecting other pages might help, but I'll try a common pattern.
                const res = await api.get('/sellers/all');
                setSellers(res.data);
                if (res.data.length > 0) {
                    setSelectedSeller(res.data[0]._id);
                }
            } catch (err) {
                console.error('Failed to fetch sellers', err);
                setError('Failed to load sellers. Please refresh.');
            }
        };
        fetchSellers();
    }, []);

    const handleFileChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            setError(null);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !selectedSeller) {
            setError('Please select a file and a seller.');
            return;
        }

        setUploading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('sellerId', selectedSeller);
        formData.append('feedType', feedType);
        formData.append('schemaVersion', schemaVersion);

        try {
            const response = await api.post('/ebay/feed/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setResult(response.data);
        } catch (err) {
            console.error('Upload failed', err);
            setError(err.response?.data?.error || err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                eBay Feed Upload
            </Typography>
            <Typography variant="body1" color="textSecondary" paragraph>
                Upload bulk listing files (XML/CSV) to eBay via the Feed API.
            </Typography>

            <Paper sx={{ p: 3, maxWidth: 600 }}>
                <Stack spacing={3}>

                    {/* Seller Selection */}
                    <FormControl fullWidth>
                        <InputLabel>Select Seller Account</InputLabel>
                        <Select
                            value={selectedSeller}
                            label="Select Seller Account"
                            onChange={(e) => setSelectedSeller(e.target.value)}
                        >
                            {sellers.map((seller) => (
                                <MenuItem key={seller._id} value={seller._id}>
                                    {seller.storeName || seller.user?.username || seller._id}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Feed Type Selection - Fixed to CSV */}
                    <FormControl fullWidth>
                        <InputLabel>Feed Type</InputLabel>
                        <Select
                            value={feedType}
                            label="Feed Type"
                            disabled
                        >
                            <MenuItem value="FX_LISTING">File Exchange Listing (CSV)</MenuItem>
                        </Select>
                        <FormHelperText>Currently only CSV uploads (FX_LISTING) are supported.</FormHelperText>
                    </FormControl>

                    {/* Schema Version */}
                    <TextField
                        label="Schema Version"
                        value={schemaVersion}
                        disabled
                        helperText="Fixed to 1.0 for CSV uploads"
                    />

                    {/* File Input */}
                    <Box
                        sx={{
                            border: '2px dashed #ccc',
                            borderRadius: 2,
                            p: 3,
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: '#fafafa',
                            '&:hover': { backgroundColor: '#f0f0f0' }
                        }}
                        component="label"
                    >
                        <input
                            type="file"
                            hidden
                            onChange={handleFileChange}
                            accept=".csv"
                        />
                        <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                        <Typography variant="h6">
                            {selectedFile ? selectedFile.name : 'Click to Select CSV File'}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            Supported format: CSV (File Exchange)
                        </Typography>
                    </Box>

                    {/* Upload Button */}
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={handleUpload}
                        disabled={uploading || !selectedFile || !selectedSeller}
                        startIcon={uploading && <CircularProgress size={20} color="inherit" />}
                    >
                        {uploading ? 'Uploading...' : 'Upload Feed'}
                    </Button>

                    {/* Messages */}
                    {error && (
                        <Alert severity="error">
                            {error}
                        </Alert>
                    )}

                    {result && (
                        <Alert severity="success">
                            <Typography variant="subtitle1">Upload Successful!</Typography>
                            <Typography variant="body2">Task ID: {result.taskId}</Typography>
                            <Typography variant="caption">
                                The file is being processed by eBay. Check the status later using the Task ID.
                            </Typography>
                        </Alert>
                    )}

                </Stack>
            </Paper>
        </Box>
    );
};

export default FeedUploadPage;
