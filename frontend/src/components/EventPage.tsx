import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Container, Grid, Paper, Stack, Typography, Button, Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions } from '@mui/material';
import { EventHeader } from './EventHeader';
import { GuessesChart } from './GuessesChart';
import { GuessForm } from './GuessForm';
import { GuessList } from './GuessList';
import type { ChartPoint, EventData, Guess } from './types';
import { useTranslation } from 'react-i18next';

export default function EventPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const eventKey = searchParams.get('key');
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteKey, setDeleteKey] = useState('');

  useEffect(() => {
    if (!eventKey) {
      navigate('/');
      return;
    }

    let sse: EventSource | null = null;
    let cancelled = false;

    const fetchData = async () => {
      try {
        // 1. Get Event
        const evtRes = await fetch(`/api/events/by-key/${eventKey}`);
        if (!evtRes.ok) {
          // If the event was deleted (or never existed), send the user back home.
          navigate('/');
          return;
        }
        const evtData = await evtRes.json();
        if (cancelled) return;
        setEvent(evtData);

        // 2. Get Guesses
        const guessRes = await fetch(`/api/events/${evtData.id}/guesses`);
        if (guessRes.ok) {
          const guessData = await guessRes.json();
          if (!cancelled) {
            setGuesses(guessData);
          }
        }

        if (cancelled) return;

        // 3. SSE
        sse = new EventSource(`/api/events/${evtData.id}/live`);
        sse.onmessage = (msg) => {
          const newGuess: Guess = JSON.parse(msg.data);
          setGuesses((prev) => {
            const exists = prev.some(
              (g) =>
                g.display_name === newGuess.display_name &&
                g.color_hex === newGuess.color_hex &&
                g.guessed_date === newGuess.guessed_date &&
                g.guessed_weight_kg === newGuess.guessed_weight_kg,
            );
            if (exists) return prev;
            return [...prev, newGuess];
          });
        };

        sse.onerror = (err) => {
          console.error('SSE error', err);
          // If the event was deleted while viewing it, the live stream will fail.
          // Send the user back to the front page.
          if (!cancelled) navigate('/');
        };
      } catch (err) {
        console.error(err);
        if (!cancelled) navigate('/');
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      if (sse) {
        sse.close();
      }
    };
  }, [eventKey, navigate, t]);

  const uniqueGuesses = useMemo(() => {
    const seen = new Set<string>();
    return guesses.filter((g) => {
      const key = `${g.display_name}|${g.color_hex}|${g.guessed_date}|${g.guessed_weight_kg}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [guesses]);

  // Chart Data Preparation
  const chartData: ChartPoint[] = useMemo(() => {
    const hashStringToU32 = (s: string) => {
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };

    const dayMs = 24 * 60 * 60 * 1000;

    return uniqueGuesses.map((g) => {
      const d = new Date(g.guessed_date);
      d.setHours(0, 0, 0, 0);
      const dayStart = d.getTime();

      const seed = `${g.display_name}|${g.color_hex}|${g.guessed_date}|${g.guessed_weight_kg}`;
      const r = hashStringToU32(seed) / 0xffffffff;

      const minOffset = 0.15 * dayMs;
      const maxOffset = 0.85 * dayMs;
      const x = dayStart + (minOffset + r * (maxOffset - minOffset));

      return {
        x,
        y: g.guessed_weight_kg,
        z: g.guessed_weight_kg,
        name: g.display_name,
        color: g.color_hex,
      };
    });
  }, [uniqueGuesses]);

  const handleDeleteClick = () => {
      if (!event) return;
      const storedKey = localStorage.getItem(`event_admin_key_${event.id}`);
      if (storedKey) setDeleteKey(storedKey);
      setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
      if (!event) return;
      try {
          const res = await fetch(`/api/events/${event.id}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ secret_key: deleteKey })
          });
          
          if (res.ok) {
              alert(t('admin.delete_success'));
              navigate('/');
          } else {
              alert(t('admin.delete_fail'));
          }
      } catch (err) {
          console.error(err);
          alert(t('admin.delete_fail'));
      }
  };

  if (!event) return <Typography p={4}>{t('event_page.loading')}</Typography>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 8 }}>
      <EventHeader event={event} />

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, borderRadius: 4, height: 500 }}>
              <Typography variant="h6" gutterBottom>{t('event_page.chart_title')}</Typography>
              <GuessesChart data={chartData} minY={event.min_weight_kg} maxY={event.max_weight_kg} />
            </Paper>
          </Grid>


          <Grid item xs={12} lg={4}>
            <Stack spacing={3}>
              <GuessForm event={event} />
              <GuessList guesses={uniqueGuesses} />
            </Stack>
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="center" mt={8}>
            <Button color="error" variant="outlined" onClick={handleDeleteClick}>
                {t('admin.delete_event')}
            </Button>
        </Box>
      </Container>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('admin.delete_confirm_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText mb={2}>
            {t('admin.delete_confirm_desc')}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label={t('admin.field_secret_key')}
            fullWidth
            variant="outlined"
            value={deleteKey}
            onChange={(e) => setDeleteKey(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} color="inherit">{t('admin.cancel')}</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            {t('admin.delete_event')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
