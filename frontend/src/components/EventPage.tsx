import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Container, Grid, Paper, Stack, Typography } from '@mui/material';
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
        if (!evtRes.ok) throw new Error('Event not found');
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
      } catch (err) {
        console.error(err);
        alert(t('event_page.alert_load_fail'));
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
    const groups = new Map<
      string,
      { x: number; y: number; subPoints: { name: string; color: string }[] }
    >();

    uniqueGuesses.forEach((g) => {
      const x = new Date(g.guessed_date).getTime();
      const y = g.guessed_weight_kg;
      const key = `${x}-${y}`;

      if (!groups.has(key)) {
        groups.set(key, { x, y, subPoints: [] });
      }
      groups.get(key)!.subPoints.push({
        name: g.display_name,
        color: g.color_hex,
      });
    });

    return Array.from(groups.values()).map((grp) => ({
      x: grp.x,
      y: grp.y,
      z: grp.y, // for bubble size
      name: grp.subPoints.map((s) => s.name).join(', '),
      color: grp.subPoints[0].color,
      subPoints: grp.subPoints,
    }));
  }, [uniqueGuesses]);

  if (!event) return <Typography p={4}>{t('event_page.loading')}</Typography>;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 8 }}>
      <EventHeader event={event} />

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 3, borderRadius: 4, height: 500 }}>
              <Typography variant="h6" gutterBottom>{t('event_page.chart_title')}</Typography>
              <GuessesChart data={chartData} />
            </Paper>
          </Grid>


          <Grid item xs={12} lg={4}>
            <Stack spacing={3}>
              <GuessForm event={event} />
              <GuessList guesses={uniqueGuesses} />
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
