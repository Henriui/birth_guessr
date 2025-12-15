import { Container, Paper, Typography, Box } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function TermsOfService() {
  const { t } = useTranslation();

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="primary">
          {t('terms.title')}
        </Typography>
        
        <Box mb={3}>
          <Typography variant="body1" paragraph>
            {t('terms.intro')}
          </Typography>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t('terms.usage')}
          </Typography>
          <Typography variant="body1">
            {t('terms.usage_text')}
          </Typography>
        </Box>

        <Box mb={3}>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t('terms.content')}
          </Typography>
          <Typography variant="body1">
            {t('terms.content_text')}
          </Typography>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom fontWeight="bold">
            {t('terms.termination')}
          </Typography>
          <Typography variant="body1">
            {t('terms.termination_text')}
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
