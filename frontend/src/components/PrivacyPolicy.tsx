import { Container, Paper, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="primary">
          {t('privacy.title')}
        </Typography>
        
        <Box mb={3}>
          <Typography variant="body1" paragraph>
            {t('privacy.intro')}
          </Typography>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t('privacy.data_collection')}
          </Typography>
          <Typography variant="body1">
            {t('privacy.data_collection_text')}
          </Typography>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t('privacy.cookies')}
          </Typography>
          <Typography variant="body1">
            {t('privacy.cookies_text')}
          </Typography>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t('privacy.contact')}
          </Typography>
          <Typography variant="body1">
            {t('privacy.contact_text')}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
