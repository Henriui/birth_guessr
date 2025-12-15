import { useState, useEffect } from 'react';
import { Box, Button, Paper, Typography, Container } from '@mui/material';
import { useTranslation } from 'react-i18next';

export function CookieBanner() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('cookie_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <Paper 
      elevation={6}
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 9999,
        borderRadius: 0,
        p: 2,
        bgcolor: 'background.paper',
        borderTop: '1px solid #e0e0e0'
      }}
    >
      <Container maxWidth="lg">
        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Typography variant="body2" color="text.secondary">
            {t('cookie_banner.message')}
          </Typography>
          <Button 
            variant="contained" 
            size="small" 
            onClick={handleDismiss}
          >
            {t('cookie_banner.button_ok')}
          </Button>
        </Box>
      </Container>
    </Paper>
  );
}
