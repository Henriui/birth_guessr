import { Chip, Container, Grid, IconButton, Paper, Typography } from '@mui/material';
import type { EventData } from './types';
import { useTranslation } from 'react-i18next';
import EditIcon from '@mui/icons-material/Edit';

interface EventHeaderProps {
  event: EventData;
  isAdmin?: boolean;
  onEditDescription?: () => void;
}

export function EventHeader({ event, isAdmin, onEditDescription }: EventHeaderProps) {
  const { t } = useTranslation();

  const shareUrl = `${window.location.origin}/share/${encodeURIComponent(event.event_key)}`;

  return (
    <Paper sx={{ p: 3, mb: 4, borderRadius: 0 }}>
      <Container maxWidth="lg">
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {event.title}
            </Typography>
            <Grid container spacing={1} alignItems="center" wrap="nowrap">
              <Grid item xs>
                <Typography color="text.secondary">{event.description ?? ''}</Typography>
              </Grid>
              {isAdmin && onEditDescription && (
                <Grid item>
                  <IconButton
                    size="small"
                    aria-label={t('admin.edit_description')}
                    onClick={onEditDescription}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Grid>
              )}
            </Grid>
          </Grid>
          <Grid item>
            <Typography
              variant="overline"
              color="text.secondary"
              display="block"
            >
              {t('event_header.invite_key')}
            </Typography>
            <Chip
              label={event.event_key}
              variant="outlined"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
            />
          </Grid>
        </Grid>
      </Container>
    </Paper>
  );
}
