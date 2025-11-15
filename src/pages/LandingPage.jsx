
import { Box, Button, Container, Stack, Typography, Paper, useTheme, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';


export default function LandingPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.15)}, ${alpha(theme.palette.secondary.light, 0.10)})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stack spacing={3} alignItems="center">
        <Box
          component="img"
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHxnpv1rkxP1_Ywhgxr3zJZblPMBy_0EQMUg&s"
          alt="Grow Mentality Logo"
          sx={{ width: 300, height: 180, objectFit: 'cover', borderRadius: 2, mb: 1, boxShadow: 2 }}
        />
        <Typography variant="h2" fontWeight="bold" gutterBottom>
          <Box component="span" sx={{ color: '#2c2b28ff' }}>Grow </Box>
          <Box component="span" sx={{ color: '#efd95eff' }}>Mentality</Box>
        </Typography>
        <Typography variant="h5" fontWeight="medium" color="text.secondary" gutterBottom>
          Employee Management System
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate('/login')}
          sx={{ px: 6, py: 1.5, fontSize: '1.15rem', borderRadius: 3, boxShadow: 2 }}
        >
          Login
        </Button>
      </Stack>
    </Box>
  );
}


