import { Chip, Container, Grid, Paper, Typography } from '@mui/material';
import type { EventData } from './types';

interface EventHeaderProps {
  event: EventData;
}

export function EventHeader({ event }: EventHeaderProps) {
  return (
    <Paper sx={{ p: 3, mb: 4, borderRadius: 0 }}>
      <Container maxWidth="lg">
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {event.title}
            </Typography>
            <Typography color="text.secondary">{event.description}</Typography>
          </Grid>
          <Grid item>
            <Typography
              variant="overline"
              color="text.secondary"
              display="block"
            >
              Invite Key
            </Typography>
            <Chip
              label={event.event_key}
              variant="outlined"
              onClick={() => navigator.clipboard.writeText(event.event_key)}
            />
          </Grid>
        </Grid>
      </Container>
    </Paper>
  );
}
