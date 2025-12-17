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
import { EU_DATE_FORMAT, formatEuDate } from '../utils/date';

interface EventEndedAnnouncement {
  event_id: string;
  birth_date: string;
  birth_weight_kg: number;
  ended_at: string;
  closest_date_top: Guess[];
  closest_weight_top: Guess[];
}

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
  const [claimError, setClaimError] = useState<string | null>(null);

  const [descriptionDialogOpen, setDescriptionDialogOpen] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editDate, setEditDate] = useState<Dayjs | null>(null);
  const [editColor, setEditColor] = useState('#000000');
  const [editError, setEditError] = useState<string | null>(null);

  const [answerDialogOpen, setAnswerDialogOpen] = useState(false);
  const [answerBirthDate, setAnswerBirthDate] = useState<Dayjs | null>(null);
  const [answerBirthWeight, setAnswerBirthWeight] = useState('');
  const [answerError, setAnswerError] = useState<string | null>(null);
  const [endedAnnouncement, setEndedAnnouncement] = useState<EventEndedAnnouncement | null>(null);

  useEffect(() => {
    if (!eventKey) {
      navigate('/');
      return;
    }

    let sse: EventSource | null = null;
    let sseErrorHandled = false;
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
        sse = new EventSource(`/api/events/live?event_key=${encodeURIComponent(eventKey)}`);
        sse.onmessage = (msg) => {
          const parsed = JSON.parse(msg.data);
          if (parsed?.type === 'guess' && parsed?.data?.guess) {
            const newGuess: Guess = parsed.data.guess;
            setGuesses((prev) => {
              const idx = prev.findIndex((g) => g.invitee_id === newGuess.invitee_id);
              if (idx === -1) return [...prev, newGuess];
              const next = [...prev];
              next[idx] = newGuess;
              return next;
            });
            return;
          }

          if (parsed?.type === 'guess_deleted' && parsed?.data?.invitee_id) {
            const inviteeId: string = parsed.data.invitee_id;
            setGuesses((prev) => prev.filter((g) => g.invitee_id !== inviteeId));
            return;
          }

          if (parsed?.type === 'event_settings' && parsed?.data) {
            setEvent((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                allow_guess_edits: Boolean(parsed.data.allow_guess_edits),
              };
            });
          }

          if (parsed?.type === 'event_description' && parsed?.data) {
            setEvent((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                description: parsed.data.description ?? null,
              };
            });
          }

          if (parsed?.type === 'event_ended' && parsed?.data) {
            setEndedAnnouncement(parsed.data as EventEndedAnnouncement);
            setEvent((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                birth_date: parsed.data.birth_date,
                birth_weight_kg: parsed.data.birth_weight_kg,
                ended_at: parsed.data.ended_at,
                allow_guess_edits: false,
              };
            });
          }
        };

        sse.onerror = async () => {
          if (cancelled) return;
          if (sseErrorHandled) return;
          sseErrorHandled = true;

          // If the live stream fails, only redirect the user if the event is actually gone.
          // In practice, SSE can fail for transient reasons (or be mocked/closed in tests).
          try {
            sse?.close();
            const res = await fetch(`/api/events/by-key/${eventKey}`);
            if (!res.ok && !cancelled) {
              navigate('/');
            }
          } catch {
            // Ignore transient network issues.
          }
        };
      } catch {
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
  const hasEnded = Boolean(event?.ended_at);

  const guessingClosed = useMemo(() => {
    if (!event) return true;
    if (hasEnded) return true;
    const close = event.guess_close_date
      ? dayjs(event.guess_close_date)
      : event.due_date
        ? dayjs(event.due_date).endOf('day')
        : null;
    if (!close) return false;
    return dayjs().isAfter(close);
  }, [event, hasEnded]);

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
    } catch {
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
    setClaimError(null);
    setClaimDialogOpen(true);
  };

  const handleEditDescriptionOpen = () => {
    if (!event) return;
    if (!myAdminKey) return;
    if (hasEnded) return;
    setDescriptionError(null);
    setDescriptionDraft(event.description ?? '');
    setDescriptionDialogOpen(true);
  };

  const handleEditDescriptionSave = async () => {
    if (!event) return;
    if (!myAdminKey) return;
    if (hasEnded) return;

    setDescriptionError(null);

    const normalized = descriptionDraft.trim();
    const nextDescription = normalized.length ? normalized : null;

    try {
      const res = await fetch(`/api/events/${event.id}/description`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${myAdminKey}` },
        body: JSON.stringify({ description: nextDescription }),
      });

      if (!res.ok) {
        setDescriptionError(t('admin.edit_description_failed'));
        return;
      }

      const updated: EventData = await res.json();
      setEvent(updated);
      setDescriptionDialogOpen(false);
    } catch {
      setDescriptionError(t('admin.edit_description_failed'));
    }
  };

  const handleClaimConfirm = async () => {
    if (!event) return;
    setClaimError(null);
    try {
      const res = await fetch(`/api/events/${event.id}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${claimKey}` },
      });
      if (!res.ok) {
        setClaimError(t('admin.claim_failed'));
        return;
      }
      const updated: EventData = await res.json();
      localStorage.setItem(`event_admin_key_${event.id}`, claimKey);
      setEvent(updated);
      setClaimDialogOpen(false);
    } catch {
      setClaimError(t('admin.claim_failed'));
    }
  };

  const handleToggleGuessEdits = async (enabled: boolean) => {
    if (!event) return;
    if (!myAdminKey) return;
    if (hasEnded) return;
    try {
      const res = await fetch(`/api/events/${event.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${myAdminKey}` },
        body: JSON.stringify({ allow_guess_edits: enabled }),
      });
      if (!res.ok) return;
      const updated: EventData = await res.json();
      setEvent(updated);
    } catch {
      return;
    }
  };

  const handleDeleteConfirm = async () => {
      if (!event) return;
      try {
          const res = await fetch(`/api/events/${event.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${deleteKey}` },
          });
          
          if (res.ok) {
              alert(t('admin.delete_success'));
              navigate('/');
          } else {
              alert(t('admin.delete_fail'));
          }
      } catch {
          alert(t('admin.delete_fail'));
      }
  };

  const handleAdminDeleteGuess = async (g: Guess) => {
    if (!event) return;
    if (!myAdminKey) return;
    if (hasEnded) return;

    const ok = window.confirm(t('guess_list.delete_confirm'));
    if (!ok) return;

    try {
      const res = await fetch(`/api/events/${event.id}/guesses/${g.invitee_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${myAdminKey}` },
      });

      if (!res.ok) {
        alert(t('guess_list.delete_failed'));
        return;
      }

      setGuesses((prev) => prev.filter((x) => x.invitee_id !== g.invitee_id));
    } catch {
      alert(t('guess_list.delete_failed'));
    }
  };

  const handleAnswerOpen = () => {
    setAnswerError(null);
    setAnswerBirthDate(null);
    setAnswerBirthWeight('');
    setAnswerDialogOpen(true);
  };

  const handleAnswerConfirm = async () => {
    if (!event) return;
    if (!myAdminKey) return;
    if (hasEnded) return;

    if (!answerBirthDate) {
      setAnswerError(t('admin.set_answer_failed'));
      return;
    }

    const w = parseFloat(answerBirthWeight);
    if (Number.isNaN(w) || !Number.isFinite(w)) {
      setAnswerError(t('admin.set_answer_failed'));
      return;
    }

    try {
      const formattedDate = answerBirthDate.format('YYYY-MM-DD') + 'T12:00:00';
      const res = await fetch(`/api/events/${event.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${myAdminKey}` },
        body: JSON.stringify({
          birth_date: formattedDate,
          birth_weight_kg: w,
        }),
      });

      if (!res.ok) {
        setAnswerError(t('admin.set_answer_failed'));
        return;
      }

      const data = (await res.json()) as EventEndedAnnouncement;
      setEndedAnnouncement(data);
      setEvent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          birth_date: data.birth_date,
          birth_weight_kg: data.birth_weight_kg,
          ended_at: data.ended_at,
          allow_guess_edits: false,
        };
      });
      setAnswerDialogOpen(false);
    } catch {
      setAnswerError(t('admin.set_answer_failed'));
    }
  };

  if (!event) return <Typography className="paper-reveal paper-reveal-1" p={4}>{t('event_page.loading')}</Typography>;

  const computedClosestDateTop = (() => {
    if (!event.birth_date) return [] as Guess[];
    const birth = dayjs(event.birth_date);

    return [...uniqueGuesses]
      .map((g) => ({
        g,
        days: Math.abs(dayjs(g.guessed_date).diff(birth, 'day')),
      }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 5)
      .map((x) => x.g);
  })();

  const computedClosestWeightTop = (() => {
    if (typeof event.birth_weight_kg !== 'number') return [] as Guess[];
    const target = event.birth_weight_kg;
    return [...uniqueGuesses]
      .map((g) => ({ g, diff: Math.abs(g.guessed_weight_kg - target) }))
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 5)
      .map((x) => x.g);
  })();

  const closestDateTop = endedAnnouncement?.closest_date_top ?? [];
  const closestWeightTop = endedAnnouncement?.closest_weight_top ?? [];

  const formatGuessSummary = (g: Guess) => {
    const date = formatEuDate(g.guessed_date);
    const weight = Number(g.guessed_weight_kg).toFixed(2);
    return `${date} — ${weight} kg`;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 8 }}>
      <EventHeader
        event={event}
        isAdmin={isClaimedAdmin && !hasEnded}
        onEditDescription={handleEditDescriptionOpen}
      />

      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} lg={8}>
            <Paper className="paper-reveal paper-reveal-2" sx={{ p: 3, borderRadius: 4, height: 500 }}>
              <Typography variant="h6" gutterBottom sx={{ pt: 0.25 }}>
                {t('event_page.chart_title')}
              </Typography>
              <GuessesChart data={chartData} minY={event.min_weight_kg} maxY={event.max_weight_kg} />
            </Paper>
          </Grid>


          <Grid item xs={12} lg={4}>
            <Stack className="paper-reveal paper-reveal-3" spacing={3}>
              {guessingClosed ? (
                <Paper sx={{ p: 2.5, borderRadius: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    {t('guess_form.guesses_closed_title')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('guess_form.guesses_closed_desc')}
                  </Typography>
                </Paper>
              ) : (
                <GuessForm event={event} />
              )}
              <GuessList
                guesses={uniqueGuesses}
                myInviteeId={myInviteeId}
                allowGuessEdits={allowGuessEdits}
                onEditGuess={handleEditGuess}
                isAdmin={isClaimedAdmin && !hasEnded}
                onDeleteGuess={handleAdminDeleteGuess}
              />
              {hasEnded && (
                <Paper sx={{ p: 2, borderRadius: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    {t('event_page.game_ended_title')}
                  </Typography>

                  <Typography variant="body2" gutterBottom>
                    {t('event_page.correct_answer', {
                      date: event.birth_date ? formatEuDate(event.birth_date) : '-',
                      weight: typeof event.birth_weight_kg === 'number' ? event.birth_weight_kg.toFixed(2) : '-',
                    })}
                  </Typography>

                  <Typography variant="subtitle1" gutterBottom>
                    {t('event_page.winner_correct_date')}
                  </Typography>
                  {(closestDateTop.length ? closestDateTop : computedClosestDateTop).length ? (
                    (closestDateTop.length ? closestDateTop : computedClosestDateTop).map((w: Guess, idx: number) => (
                      <Typography key={w.invitee_id} variant="body2">
                        {idx + 1}. {w.display_name} — {formatGuessSummary(w)}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2">-</Typography>
                  )}

                  <Typography variant="subtitle1" gutterBottom mt={2}>
                    {t('event_page.winner_closest_weight')}
                  </Typography>
                  {(closestWeightTop.length ? closestWeightTop : computedClosestWeightTop).length ? (
                    (closestWeightTop.length ? closestWeightTop : computedClosestWeightTop).map((g: Guess, idx: number) => (
                      <Typography key={g.invitee_id} variant="body2">
                        {idx + 1}. {g.display_name} — {formatGuessSummary(g)}
                      </Typography>
                    ))
                  ) : (
                    <Typography variant="body2">-</Typography>
                  )}
                </Paper>
              )}
            </Stack>
          </Grid>
        </Grid>

        <Box className="paper-reveal paper-reveal-4" display="flex" justifyContent="center" mt={6}>
          <Stack spacing={2} alignItems="center">
            {!isClaimedAdmin ? (
              <Button variant="outlined" onClick={handleClaimOpen}>
                {t('admin.claim_event')}
              </Button>
            ) : (
              <>
                {!guessingClosed && (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={allowGuessEdits}
                        onChange={(e) => handleToggleGuessEdits(e.target.checked)}
                      />
                    }
                    label={t('admin.allow_guess_edits')}
                  />
                )}
                {!hasEnded && (
                  <Button variant="outlined" onClick={handleAnswerOpen}>
                    {t('admin.set_answer')}
                  </Button>
                )}
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
          {claimError && (
            <Typography variant="body2" color="error" mt={1}>
              {claimError}
            </Typography>
          )}
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

      <Dialog open={descriptionDialogOpen} onClose={() => setDescriptionDialogOpen(false)}>
        <DialogTitle>{t('admin.edit_description_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText mb={2}>{t('admin.edit_description_desc')}</DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label={t('admin.field_description')}
            fullWidth
            variant="outlined"
            multiline
            minRows={3}
            value={descriptionDraft}
            onChange={(e) => {
              setDescriptionDraft(e.target.value);
              if (descriptionError) setDescriptionError(null);
            }}
          />
          {descriptionError && (
            <Typography variant="body2" color="error" mt={1}>
              {descriptionError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDescriptionDialogOpen(false)} color="inherit">
            {t('admin.cancel')}
          </Button>
          <Button onClick={handleEditDescriptionSave} variant="contained">
            {t('guess_edit.save')}
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
              format={EU_DATE_FORMAT}
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

      <Dialog open={answerDialogOpen} onClose={() => setAnswerDialogOpen(false)}>
        <DialogTitle>{t('admin.set_answer_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText mb={2}>{t('admin.set_answer_desc')}</DialogContentText>
          <Stack spacing={2} mt={1}>
            <DatePicker
              label={t('admin.field_birth_date')}
              value={answerBirthDate}
              onChange={(newValue) => {
                setAnswerBirthDate(newValue);
                if (answerError) setAnswerError(null);
              }}
              format={EU_DATE_FORMAT}
              slotProps={{
                textField: { size: 'small', error: Boolean(answerError) },
              }}
            />
            <TextField
              label={t('admin.field_birth_weight')}
              type="number"
              value={answerBirthWeight}
              onChange={(e) => {
                setAnswerBirthWeight(e.target.value);
                if (answerError) setAnswerError(null);
              }}
              size="small"
              inputProps={{ step: 0.01 }}
              error={Boolean(answerError)}
            />
            {answerError && (
              <Typography variant="body2" color="error">
                {answerError}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnswerDialogOpen(false)} color="inherit">
            {t('admin.cancel')}
          </Button>
          <Button onClick={handleAnswerConfirm} variant="contained">
            {t('admin.set_answer_confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
