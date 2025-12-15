import { Box, Typography, Container, Link } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';

export function Footer() {
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        mt: 'auto',
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          {t('footer.copyright')}
        </Typography>
        <Link component={RouterLink} to="/privacy" color="text.secondary" variant="caption">
          {t('footer.privacy_policy')}
        </Link>
        <Link component={RouterLink} to="/terms" color="text.secondary" variant="caption">
          {t('footer.terms_of_service')}
        </Link>
      </Container>
    </Box>
  );
}
