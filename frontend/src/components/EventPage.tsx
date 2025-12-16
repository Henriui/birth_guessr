import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Container, Grid, Paper, Stack, Typography, Button, Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, FormControlLabel, Switch } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { EventHeader } from './EventHeader';
import { GuessesChart } from './GuessesChart';
import { GuessForm } from './GuessForm';
import { GuessList } from './GuessList';
import type { ChartPoint, EventData, Guess } from './types';
import { useTranslation } from 'react-i18next';
import dayjs, { Dayjs } from 'dayjs';

export default function EventPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const eventKey = searchParams.get('key');
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteKey, setDeleteKey] = useState('');

  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [claimKey, setClaimKey] = useState('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editDate, setEditDate] = useState<Dayjs | null>(null);
  const [editColor, setEditColor] = useState('#000000');
  const [editError, setEditError] = useState<string | null>(null);

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
            const idx = prev.findIndex((g) => g.invitee_id === newGuess.invitee_id);
            if (idx === -1) return [...prev, newGuess];
            const next = [...prev];
            next[idx] = newGuess;
            return next;
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

  const myInviteeId = event?.id ? localStorage.getItem(`guess_token_${event.id}`) : null;
  const myAdminKey = event?.id ? localStorage.getItem(`event_admin_key_${event.id}`) : null;
  const isClaimedAdmin = Boolean(myAdminKey);
  const allowGuessEdits = Boolean(event?.allow_guess_edits);

  const uniqueGuesses = useMemo(() => {
    const seen = new Set<string>();
    return guesses.filter((g) => {
      if (seen.has(g.invitee_id)) return false;
      seen.add(g.invitee_id);
      return true;
    });
  }, [guesses]);

  const handleEditGuess = (g: Guess) => {
    if (!allowGuessEdits) return;
    setEditError(null);
    setEditName(g.display_name);
    setEditWeight(String(g.guessed_weight_kg));
    setEditDate(dayjs(g.guessed_date));
    setEditColor(g.color_hex);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!event) return;
    if (!myInviteeId) return;
    if (!allowGuessEdits) return;
    if (!editDate) {
      setEditError(t('guess_edit.error_missing_date'));
      return;
    }

    const minWeightKg = typeof event.min_weight_kg === 'number' ? event.min_weight_kg : 1.8;
    const maxWeightKg = typeof event.max_weight_kg === 'number' ? event.max_weight_kg : 5.2;

    const w = parseFloat(editWeight);
    if (isNaN(w) || w < minWeightKg || w > maxWeightKg) {
      setEditError(t('guess_form.alert_weight_range'));
      return;
    }

    if (editDate.isBefore(dayjs(), 'day')) {
      setEditError(t('guess_form.alert_past_date'));
      return;
    }

    if (event.due_date) {
      const maxDate = dayjs(event.due_date).add(1, 'month');
      if (editDate.isAfter(maxDate)) {
        setEditError(t('guess_form.alert_date_limit'));
        return;
      }
    }

    try {
      const formattedDate = editDate.format('YYYY-MM-DD') + 'T12:00:00';
      const res = await fetch(`/api/events/${event.id}/guesses/${myInviteeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: editName,
          guessed_date: formattedDate,
          guessed_weight_kg: w,
          color_hex: editColor,
        }),
      });

      if (!res.ok) {
        setEditError(t('guess_edit.error_save_failed'));
        return;
      }

      const updated: Guess = await res.json();
      setGuesses((prev) => {
        const idx = prev.findIndex((gg) => gg.invitee_id === updated.invitee_id);
        if (idx === -1) return [...prev, updated];
        const next = [...prev];
        next[idx] = updated;
        return next;
      });

      setEditDialogOpen(false);
    } catch (err) {
      console.error(err);
      setEditError(t('guess_edit.error_save_failed'));
    }
  };

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
      if (!myAdminKey) return;
      setDeleteKey(myAdminKey);
      setDeleteDialogOpen(true);
  };

  const handleClaimOpen = () => {
    if (!event) return;
    setClaimKey('');
    setClaimDialogOpen(true);
  };

  const handleClaimConfirm = () => {
    if (!event) return;
    localStorage.setItem(`event_admin_key_${event.id}`, claimKey);
    setClaimDialogOpen(false);
  };

  const handleToggleGuessEdits = async (enabled: boolean) => {
    if (!event) return;
    if (!myAdminKey) return;
    try {
      const res = await fetch(`/api/events/${event.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret_key: myAdminKey, allow_guess_edits: enabled }),
      });
      if (!res.ok) return;
      const updated: EventData = await res.json();
      setEvent(updated);
    } catch (err) {
      console.error(err);
    }
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
              <GuessList guesses={uniqueGuesses} myInviteeId={myInviteeId} allowGuessEdits={allowGuessEdits} onEditGuess={handleEditGuess} />
            </Stack>
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="center" mt={6}>
          <Stack spacing={2} alignItems="center">
            {!isClaimedAdmin ? (
              <Button variant="outlined" onClick={handleClaimOpen}>
                {t('admin.claim_event')}
              </Button>
            ) : (
              <>
                <FormControlLabel
                  control={
                    <Switch
                      checked={allowGuessEdits}
                      onChange={(e) => handleToggleGuessEdits(e.target.checked)}
                    />
                  }
                  label={t('admin.allow_guess_edits')}
                />
                <Button color="error" variant="outlined" onClick={handleDeleteClick}>
                  {t('admin.delete_event')}
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </Container>

      <Dialog open={claimDialogOpen} onClose={() => setClaimDialogOpen(false)}>
        <DialogTitle>{t('admin.claim_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText mb={2}>{t('admin.claim_desc')}</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label={t('admin.field_secret_key')}
            fullWidth
            variant="outlined"
            value={claimKey}
            onChange={(e) => setClaimKey(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClaimDialogOpen(false)} color="inherit">
            {t('admin.cancel')}
          </Button>
          <Button onClick={handleClaimConfirm} variant="contained">
            {t('admin.claim_confirm')}
          </Button>
        </DialogActions>
      </Dialog>

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

      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>{t('guess_edit.title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label={t('guess_form.field_name')}
              value={editName}
              onChange={(e) => {
                setEditName(e.target.value);
                if (editError) setEditError(null);
              }}
              error={Boolean(editError)}
              size="small"
            />
            <TextField
              label={t('guess_form.field_weight')}
              type="number"
              value={editWeight}
              onChange={(e) => {
                setEditWeight(e.target.value);
                if (editError) setEditError(null);
              }}
              error={Boolean(editError)}
              size="small"
              inputProps={{ step: 0.01 }}
            />
            <DatePicker
              label={t('guess_form.field_date')}
              value={editDate}
              onChange={(newValue) => {
                setEditDate(newValue);
                if (editError) setEditError(null);
              }}
              slotProps={{
                textField: { size: 'small', error: Boolean(editError) },
              }}
              minDate={dayjs()}
              maxDate={event?.due_date ? dayjs(event.due_date).add(1, 'month') : undefined}
            />
            <Box>
              <Typography variant="caption">{t('guess_form.field_color')}</Typography>
              <input
                type="color"
                value={editColor}
                onChange={(e) => {
                  setEditColor(e.target.value);
                  if (editError) setEditError(null);
                }}
                style={{ width: '100%', height: 40, cursor: 'pointer', border: 'none' }}
              />
            </Box>
            {editError && (
              <Typography variant="body2" color="error">
                {editError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} color="inherit">
            {t('guess_edit.cancel')}
          </Button>
          <Button onClick={handleEditSave} variant="contained">
            {t('guess_edit.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
